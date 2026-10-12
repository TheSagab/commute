/**
 * Tije live provider — PROTOTYPE.
 *
 * Wraps a fallback (usually the static-JSON provider) and overlays
 * real-time arrivals when the Tije backend is reachable and enabled.
 * For a stop, it finds live vehicles heading to it and estimates their
 * ETA from the vehicle's own next-stop estimate. When there's no live
 * data for a stop — or the API errors — it delegates to the fallback,
 * so the app never regresses to "nothing".
 *
 * Off by default (`TIJE_LIVE=1`). Unofficial API — see
 * `docs/adr/0006-tije-live-prototype.md`.
 */

import { loadModeBundle } from "../../data/load"
import type { ModeId } from "../../data/types"
import { estimateEtaSeconds, fetchLiveVehicles, isTijeLiveEnabled, type LiveVehicle } from "../tije-live"
import type { Provider, StopWithArrivals, UpcomingArrival } from "./types"

const CACHE_TTL_MS = 20_000
const FETCH_RADIUS_M = 3_000
const REUSE_RADIUS_M = 5_000
const HORIZON_SECONDS = 2 * 60 * 60

const TIJE_MODES: ModeId[] = [
  "transjakarta-brt",
  "transjakarta-angkutan-umum-integrasi",
  "transjakarta-mikrotrans",
  "transjakarta-transjabodetabek",
  "transjakarta-rusun",
  "transjakarta-royaltrans",
  "transjakarta-bus-wisata",
]

type CachedSnapshot = {
  center: { lat: number; lon: number }
  fetchedAtMs: number
  vehicles: LiveVehicle[]
}

// Single-slot cache. `getUpcoming` is called once per nearby stop within
// one request, so the first call fetches and the rest reuse — as long as
// they're close to the fetched centre.
let cache: CachedSnapshot | null = null

function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6_371_000
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

async function vehiclesNear(center: { lat: number; lon: number }): Promise<LiveVehicle[]> {
  const fresh = cache !== null && Date.now() - cache.fetchedAtMs < CACHE_TTL_MS
  if (fresh && haversineMeters(cache!.center, center) < REUSE_RADIUS_M) {
    return cache!.vehicles
  }
  const vehicles = await fetchLiveVehicles(center, FETCH_RADIUS_M)
  cache = { center, fetchedAtMs: Date.now(), vehicles }
  return vehicles
}

/** Jakarta wall-clock "HH:MM" for `now + seconds`. */
function clockTimeFromNow(now: Date, seconds: number): string {
  const d = new Date(now.getTime() + 7 * 3600 * 1000 + seconds * 1000)
  const h = d.getUTCHours()
  const m = d.getUTCMinutes()
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function createTijeLiveProvider(fallback: Provider): Provider {
  return {
    id: "tije-live",
    modes: TIJE_MODES,

    async isActive() {
      return isTijeLiveEnabled()
    },

    async listStops() {
      // The live provider doesn't own a stop catalog — the static
      // provider supplies it. Returning [] keeps the chain's stop
      // union correct.
      return []
    },

    async getUpcoming(mode, stopId, now): Promise<StopWithArrivals> {
      if (!isTijeLiveEnabled()) return fallback.getUpcoming(mode, stopId, now)

      try {
        const bundle = loadModeBundle(mode)
        const stop = bundle.stops.find((s) => s.id === stopId)
        if (!stop) return fallback.getUpcoming(mode, stopId, now)

        const vehicles = await vehiclesNear({ lat: stop.lat, lon: stop.lon })
        const routeById = new Map(bundle.routes.map((r) => [r.id, r]))

        // One arrival per route — the soonest vehicle on it. Multiple
        // buses on the same route collapse to a single countdown, which
        // is what the static provider reports and what a rider expects.
        const soonestByRoute = new Map<string, UpcomingArrival>()
        for (const v of vehicles) {
          if (!v.tripId) continue
          const route = routeById.get(v.tripId)
          if (!route) continue
          const eta = estimateEtaSeconds(v, stopId)
          if (eta === null) continue
          const existing = soonestByRoute.get(route.id)
          if (existing && existing.secondsUntil <= eta) continue
          soonestByRoute.set(route.id, {
            routeId: route.id,
            route,
            clockTime: clockTimeFromNow(now, eta),
            secondsUntil: eta,
            source: "live",
          })
        }

        const arrivals = [...soonestByRoute.values()]
        if (arrivals.length === 0) return fallback.getUpcoming(mode, stopId, now)

        arrivals.sort((a, b) => a.secondsUntil - b.secondsUntil)
        const upcoming = arrivals.filter((a) => a.secondsUntil <= HORIZON_SECONDS)
        return {
          stop,
          mode,
          serviceStatus: { kind: "running" },
          next: upcoming[0] ?? null,
          upcoming,
        }
      } catch (err) {
        console.warn(`[tije-live] ${(err as Error).message}; using static schedule`)
        return fallback.getUpcoming(mode, stopId, now)
      }
    },
  }
}
