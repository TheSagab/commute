/**
 * Server function: resolve the nearby stops for a user location.
 *
 * Takes a user lat/lon, calls OSRM for walking durations to every
 * stop in the data layer, then asks the provider chain for the next
 * arrival at each stop within the walking-time threshold. Returns
 * the merged result, sorted by walking time.
 *
 * See:
 *  - docs/adr/0001-pluggable-provider-chain.md
 *  - docs/adr/0002-walking-time-via-self-hosted-osrm.md
 */

import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { setResponseHeader } from "@tanstack/react-start/server"

import { defaultChain } from "./providers/chain"
import { getWalkingDurations } from "./osrm"
import type { LatLon } from "../lib/geo"

const WALKING_THRESHOLD_S = 10 * 60 // 10 min per ADR-0002

const inputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  nowIso: z.string().optional(),
})

export type NearbyStop = {
  mode: string
  stopId: string
  stopName: { en: string; id: string }
  walkSeconds: number | null
  serviceStatus:
    | { kind: "running" }
    | { kind: "beforeHours"; firstTime: string }
    | { kind: "afterHours"; lastTime: string; firstTimeTomorrow: string }
  next: {
    routeId: string
    routeName: { en: string; id: string }
    headsign: { en: string; id: string }
    color?: string
    secondsUntil: number
    clockTime: string
  } | null
  upcoming: {
    routeId: string
    clockTime: string
    secondsUntil: number
  }[]
}

export const getNearbyStops = createServerFn({ method: "GET" })
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<{ source: LatLon; stops: NearbyStop[]; osrmFallback: boolean }> => {
    const source: LatLon = { lat: data.lat, lon: data.lon }
    const now = data.nowIso ? new Date(data.nowIso) : new Date()

    // The card list is dynamic and depends on the user's live location.
    // Keep it fresh; the response is small (a few KB at most).
    setResponseHeader("Cache-Control", "no-store")

    const allStops = await defaultChain.listStops()
    if (allStops.length === 0) {
      return { source, stops: [], osrmFallback: false }
    }

    const destinations = allStops.map((s) => ({ lat: s.stop.lat, lon: s.stop.lon }))
    const durations = await getWalkingDurations(source, destinations)

    const within: NearbyStop[] = []
    for (let i = 0; i < allStops.length; i++) {
      const { stop, mode } = allStops[i]
      const walkSeconds = durations.seconds[i] ?? null
      if (walkSeconds === null || walkSeconds > WALKING_THRESHOLD_S) continue

      const arrival = await defaultChain.getUpcoming(mode, stop.id, now)
      within.push({
        mode,
        stopId: stop.id,
        stopName: stop.name,
        walkSeconds,
        serviceStatus: arrival.serviceStatus,
        next: arrival.next
          ? {
              routeId: arrival.next.routeId,
              routeName: arrival.next.route.name,
              headsign: arrival.next.route.headsign,
              color: arrival.next.route.color,
              secondsUntil: arrival.next.secondsUntil,
              clockTime: arrival.next.clockTime,
            }
          : null,
        upcoming: arrival.upcoming.map((u) => ({
          routeId: u.routeId,
          clockTime: u.clockTime,
          secondsUntil: u.secondsUntil,
        })),
      })
    }

    within.sort((a, b) => (a.walkSeconds ?? 0) - (b.walkSeconds ?? 0))
    return { source, stops: within, osrmFallback: durations.fromFallback }
  })
