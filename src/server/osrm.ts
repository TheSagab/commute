/**
 * OSRM HTTP client.
 *
 * Server-only. Calls a self-hosted OSRM instance over HTTP and returns
 * walking durations from one source point to many destinations. See
 * `docs/adr/0002-walking-time-via-self-hosted-osrm.md`.
 *
 * Falls back to a haversine distance estimate (at 5 km/h) when OSRM
 * is unreachable so the app still renders something. The fallback is
 * obviously less accurate — used only as a last-resort safety net.
 */

import type { LatLon } from "../lib/geo"

const JAKARTA_WALKING_SPEED_M_PER_S = 5_000 / 3_600 // 5 km/h

const OSRM_TIMEOUT_MS = 5_000

export type OsrmDurations = {
  /** Seconds from the source to each destination, in the same order
   *  as `destinations`. `null` entries mean OSRM couldn't route
   *  (unreachable point). */
  seconds: (number | null)[]
  /** True if the result came from the haversine fallback. */
  fromFallback: boolean
}

function osrmBaseUrl(): string {
  return process.env.OSRM_BASE_URL ?? "http://localhost:5000"
}

function coordinatesString(points: LatLon[]): string {
  return points.map((p) => `${p.lon},${p.lat}`).join(";")
}

/** Haversine distance in meters between two points. */
function haversineMeters(a: LatLon, b: LatLon): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function fallbackDurations(source: LatLon, destinations: LatLon[]): OsrmDurations {
  const seconds = destinations.map((d) => {
    const meters = haversineMeters(source, d)
    if (meters < 1) return 0
    return meters / JAKARTA_WALKING_SPEED_M_PER_S
  })
  return { seconds, fromFallback: true }
}

export async function getWalkingDurations(
  source: LatLon,
  destinations: LatLon[],
): Promise<OsrmDurations> {
  if (destinations.length === 0) {
    return { seconds: [], fromFallback: false }
  }

  const allPoints = [source, ...destinations]
  const coords = coordinatesString(allPoints)
  const url = `${osrmBaseUrl()}/table/v1/foot/${coords}?sources=0&annotations=duration`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) {
      console.warn(`OSRM responded ${res.status}; using haversine fallback`)
      return fallbackDurations(source, destinations)
    }
    const body = (await res.json()) as {
      code: string
      durations?: (number | null)[][]
    }
    if (body.code !== "Ok" || !body.durations) {
      console.warn(`OSRM code ${body.code}; using haversine fallback`)
      return fallbackDurations(source, destinations)
    }
    const row = body.durations[0] ?? []
    // Skip the first entry (source -> source). The remaining entries
    // are source -> destinations[i], in order.
    const seconds = row.slice(1)
    return { seconds, fromFallback: false }
  } catch (err) {
    clearTimeout(timer)
    console.warn(`OSRM unreachable (${(err as Error).message}); using haversine fallback`)
    return fallbackDurations(source, destinations)
  }
}
