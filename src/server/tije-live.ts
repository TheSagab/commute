/**
 * Tije live-vehicle client — PROTOTYPE.
 *
 * Talks to Transjakarta's private app backend (the one the official
 * Tije app uses) to get real-time bus positions. This is NOT an
 * official/public API: the endpoints and the required "Android app"
 * headers are reverse-engineered, there is no documented ToS covering
 * third-party use, and it can change without notice. Off by default —
 * set `TIJE_LIVE=1` to enable. See `docs/adr/0006-tije-live-prototype.md`.
 *
 * Reference: github.com/mugnimaestra/tj-live (a community project that
 * documents the same protocol).
 *
 * The pure functions (`normalizeVehicle`, `estimateEtaSeconds`) are
 * exported for tests; the network calls are separate so tests never
 * touch the network or impersonate the app.
 */

import type { LatLon } from "../lib/geo"

/** One upcoming stop on a live vehicle, with the API's own ETA. */
export type LiveUpcomingStop = {
  stopId: string
  parentStopId?: string
  name?: string
  /** Seconds until the vehicle reaches this stop, per the API. May be
   *  a placeholder (0/1) when the vehicle is parked. */
  etaSeconds: number
}

export type LiveVehicle = {
  busBodyNo: string
  routeCode: string
  routeColor?: string
  tripId?: string
  vehicleType?: string
  lat: number
  lon: number
  /** Reported speed, in whatever unit the API uses (unconfirmed). */
  speed: number
  bearing?: number
  timestampMs?: number
  /** Stops the vehicle is about to serve, nearest first. */
  upcomingStops: LiveUpcomingStop[]
  /** API's estimate of seconds to the immediate next stop. */
  estimatedSecondsToNextStop?: number
}

const DEFAULT_API_BASE = "https://tijeapi.transjakarta.co.id"
const DEVICE_ID = "commute-web-prototype"
const REQUEST_TIMEOUT_MS = 8_000

/** Feature flag: the live provider only runs when this is set. */
export function isTijeLiveEnabled(): boolean {
  return process.env.TIJE_LIVE === "1" || process.env.TIJE_LIVE === "true"
}

function apiBase(): string {
  return process.env.TIJE_API_BASE ?? DEFAULT_API_BASE
}

const BASE_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Accept: "application/json",
  // The backend expects the official Android client. These values are
  // the reverse-engineered ones (see tj-live). Spoofing them is the
  // part that makes this unofficial — see the ADR.
  "User-Agent": "okhttp/4.12.0",
  "X-App-OS": "android",
  "X-App-Version": "2.10.2",
  "X-Device-ID": DEVICE_ID,
}

// --- pure helpers (tested) ------------------------------------------------

/** Normalize one raw API bus record, or `null` if unusable. */
export function normalizeVehicle(raw: unknown): LiveVehicle | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const busBodyNo = r.bus_body_no
  const lat = r.latitude
  const lon = r.longitude
  if (typeof busBodyNo !== "string" || typeof lat !== "number" || typeof lon !== "number") return null

  const rawStops = Array.isArray(r.stops) ? r.stops : []
  const upcomingStops: LiveUpcomingStop[] = rawStops
    .map((s): LiveUpcomingStop | null => {
      if (!s || typeof s !== "object") return null
      const o = s as Record<string, unknown>
      if (typeof o.stop_id !== "string") return null
      return {
        stopId: o.stop_id,
        parentStopId: typeof o.parent_stop_id === "string" ? o.parent_stop_id : undefined,
        name: typeof o.name === "string" ? o.name : undefined,
        etaSeconds: typeof o.eta === "number" ? o.eta : 0,
      }
    })
    .filter((s): s is LiveUpcomingStop => s !== null)

  return {
    busBodyNo,
    routeCode: typeof r.route_code === "string" ? r.route_code : "",
    routeColor: typeof r.route_color === "string" ? `#${r.route_color}` : undefined,
    tripId: typeof r.trip_id === "string" ? r.trip_id : undefined,
    vehicleType: typeof r.type === "string" ? r.type : undefined,
    lat,
    lon,
    speed: typeof r.speed === "number" ? r.speed : 0,
    bearing: typeof r.bearing === "number" ? r.bearing : undefined,
    timestampMs: typeof r.timestamp === "string" ? Number(r.timestamp) : undefined,
    upcomingStops,
    estimatedSecondsToNextStop:
      typeof r.estimated_time_next_stops === "number" ? r.estimated_time_next_stops : undefined,
  }
}

/**
 * Estimate seconds until a vehicle reaches `stopId`.
 *
 * Prefers the API's per-stop ETA. When that's missing or a placeholder
 * (0/1 for a parked vehicle), falls back to `estimated_time_next_stops`
 * plus a rough per-stop dwell — good enough for a prototype, not a real
 * ETA model. Returns `null` when the vehicle isn't heading to the stop.
 */
export function estimateEtaSeconds(
  vehicle: LiveVehicle,
  stopId: string,
  perStopSeconds = 60,
): number | null {
  const idx = vehicle.upcomingStops.findIndex(
    (s) => s.stopId === stopId || s.parentStopId === stopId,
  )
  if (idx === -1) return null

  const direct = vehicle.upcomingStops[idx].etaSeconds
  if (direct > 1) return direct

  const base = vehicle.estimatedSecondsToNextStop ?? 0
  return Math.max(0, base + idx * perStopSeconds)
}

// --- network (not unit-tested) --------------------------------------------

let cachedToken: { token: string; expiresAtMs: number } | null = null

async function fetchGuestToken(): Promise<string> {
  const res = await fetch(`${apiBase()}/v1/auth/login/guest`, {
    method: "POST",
    headers: BASE_HEADERS,
    body: JSON.stringify({ device_id: DEVICE_ID }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Tije guest login failed: ${res.status}`)
  const json = (await res.json()) as Record<string, unknown>
  const token =
    (json.token as string | undefined) ??
    ((json.data as { token?: string } | undefined)?.token as string | undefined)
  if (!token) throw new Error("Tije guest login returned no token")
  // Guest tokens are short-lived; refresh well before expiry.
  cachedToken = { token, expiresAtMs: Date.now() + 5 * 60 * 1000 }
  return token
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAtMs) return cachedToken.token
  return fetchGuestToken()
}

async function authedGet(path: string): Promise<Response> {
  const token = await getToken()
  const fetchWith = (t: string) =>
    fetch(`${apiBase()}${path}`, {
      headers: { ...BASE_HEADERS, Authorization: `Bearer ${t}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  let res = await fetchWith(token)
  if (res.status === 401) {
    cachedToken = null
    res = await fetchWith(await fetchGuestToken())
  }
  return res
}

/** Live buses near a point. Throws on network/API error. */
export async function fetchLiveVehicles(
  center: LatLon,
  radiusM = 3000,
): Promise<LiveVehicle[]> {
  const params = new URLSearchParams({
    latitude: String(center.lat),
    longitude: String(center.lon),
    radius: String(radiusM),
  })
  const res = await authedGet(`/v1/bus?${params.toString()}`)
  if (!res.ok) throw new Error(`Tije /v1/bus failed: ${res.status}`)
  const json = (await res.json()) as Record<string, unknown>
  // Response shape varies: `data` is sometimes the array directly,
  // sometimes `{ buses: [...] }`.
  const data = json.data
  const list: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { buses?: unknown[] } | undefined)?.buses)
      ? (data as { buses: unknown[] }).buses
      : []
  return list.map(normalizeVehicle).filter((v): v is LiveVehicle => v !== null)
}
