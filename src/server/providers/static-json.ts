/**
 * Static-JSON provider.
 *
 * Reads the bundled `src/data/<mode>.json` files, parses the timetable,
 * and answers `Provider` queries. The default provider for every mode;
 * a live provider (GTFS, third-party) overrides it per mode when
 * active. See `docs/adr/0001-pluggable-provider-chain.md`.
 *
 * All times in the JSON are Jakarta wall-clock ("HH:MM", may exceed
 * 24:00 to roll past midnight). The provider takes a `Date` (`now`) and
 * projects to Jakarta-local "minutes since midnight" before comparing.
 * This means the user's clock is assumed to be on Jakarta time — see
 * the `Known gotchas` section of `AGENTS.md` for the future timezone
 * story.
 */

import { loadAllBundles, loadModeBundle } from "../../data/load"
import type { ClockTime, ModeBundle, ModeId, ServiceHours, Stop } from "../../data/types"
import type {
  Provider,
  ServiceStatus,
  StopWithArrivals,
  UpcomingArrival,
} from "./types"

const JAKARTA_OFFSET_MIN = 7 * 60

/** Jakarta-local wall-clock minutes-since-midnight at the given instant.
 *  Normalized to `[0, 24*60)`. */
function jakartaMinutesAt(now: Date): number {
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes()
  let result = utcMin + JAKARTA_OFFSET_MIN
  if (result >= 24 * 60) result -= 24 * 60
  if (result < 0) result += 24 * 60
  return result
}

function parseClock(clock: ClockTime): number {
  const [h, m] = clock.split(":").map(Number)
  return h * 60 + m
}

function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function getServiceStatus(
  hours: ServiceHours,
  nowMinutes: number,
): ServiceStatus {
  const start = parseClock(hours.start)
  const end = parseClock(hours.end)
  const dayMin = 24 * 60

  // "running" if `nowMinutes` is inside the service window. The window
  // is `[start, end)`; if `end > 24*60` it wraps past midnight, and the
  // window is `[start, 24*60)` ∪ `[0, end - 24*60)`.
  const wraps = end > dayMin
  const endMod = wraps ? end - dayMin : end

  const isRunning = wraps
    ? nowMinutes >= start || nowMinutes < endMod
    : nowMinutes >= start && nowMinutes < end

  if (isRunning) return { kind: "running" }

  // Not running. The two messages:
  //   - "beforeHours": we're in the gap between midnight and `start`
  //     (e.g. 03:00 for a 05:00 start). Next service is at `start`.
  //   - "afterHours":  we're in the gap between `end` and midnight
  //     (only possible when `end <= 24*60` — a non-wrapping end).
  //     Next service is `start` tomorrow.
  // For wrapping ends, the gap `[endMod, start)` shows up as
  // "beforeHours" — the next service is at `start` (same calendar day,
  // just earlier in wall-clock terms).
  if (!wraps && nowMinutes >= end) {
    return {
      kind: "afterHours",
      lastTime: formatClock(end - 1),
      firstTimeTomorrow: hours.start,
    }
  }
  return { kind: "beforeHours", firstTime: hours.start }
}

function routeServiceHours(bundle: ModeBundle, route: ModeBundle["routes"][number]): ServiceHours {
  return route.serviceHours ?? bundle.serviceHours
}

function findUpcomingForStop(
  bundle: ModeBundle,
  stopId: string,
  now: Date,
): { status: ServiceStatus; upcoming: UpcomingArrival[] } {
  const nowMinutes = jakartaMinutesAt(now)

  // Only consider routes that actually serve this stop — every
  // route's per-route status (mode-level window or route override)
  // is rolled into the stop's headline via the most-permissive rule.
  const routesServingStop: { route: ModeBundle["routes"][number]; routeStatus: ServiceStatus }[] = []
  for (const route of bundle.routes) {
    const timetableForRoute = bundle.timetables[route.id]
    if (!timetableForRoute || !timetableForRoute[stopId]) continue
    routesServingStop.push({
      route,
      routeStatus: getServiceStatus(routeServiceHours(bundle, route), nowMinutes),
    })
  }
  const status = combineRouteStatuses(routesServingStop.map((r) => r.routeStatus))

  if (status.kind !== "running") {
    return { status, upcoming: [] }
  }

  // All times in the data are wall-clock minutes-since-midnight, sorted
  // ascending. The service window can wrap past midnight; convert both
  // `now` and each arrival to a service-relative "minutes since window
  // start" so the comparison is monotonic. Per-route windows differ;
  // we project `now` and each arrival into the *route's* own window.
  const dayMin = 24 * 60
  const horizonMin = 2 * 60 // next 2 hours

  const upcoming: UpcomingArrival[] = []
  for (const { route, routeStatus } of routesServingStop) {
    if (routeStatus.kind !== "running") continue // skip not-yet-started / ended routes

    const hours = routeServiceHours(bundle, route)
    const start = parseClock(hours.start)
    const end = parseClock(hours.end)
    const wraps = end > dayMin

    const toServiceRelative = (wc: number): number => {
      if (wraps && wc < start) return wc - start + dayMin
      return wc - start
    }
    const nowRel = toServiceRelative(nowMinutes)

    const timetableForRoute = bundle.timetables[route.id]
    if (!timetableForRoute) continue
    const timesForStop = timetableForRoute[stopId]
    if (!timesForStop) continue

    for (const t of timesForStop) {
      const tm = parseClock(t)
      const arrivalRel = toServiceRelative(tm)
      const minutesUntil = arrivalRel - nowRel
      if (minutesUntil < 0) continue
      if (minutesUntil > horizonMin) break // sorted ascending
      upcoming.push({
        routeId: route.id,
        route,
        clockTime: t,
        secondsUntil: minutesUntil * 60,
      })
    }
  }

  upcoming.sort((a, b) => a.secondsUntil - b.secondsUntil)
  return { status, upcoming }
}

/** Most-permissive combine across the routes serving a stop.
 *  Mirrors the same rule in `get-nearby-stops.ts` (`_combineStatuses`)
 *  but operates on the in-provider ServiceStatus shape (no firstTime
 *  or lastTime fields — those are derived only when the stop is the
 *  only result and the parent server function needs to render a
 *  "Starts at" / "Service ended" headline). */
function combineRouteStatuses(
  statuses: ServiceStatus[],
): ServiceStatus {
  if (statuses.length === 0) {
    return { kind: "afterHours", lastTime: "23:59", firstTimeTomorrow: "00:00" }
  }
  if (statuses.some((s) => s.kind === "running")) return { kind: "running" }
  if (statuses.every((s) => s.kind === "beforeHours")) {
    return { kind: "beforeHours", firstTime: "00:00" }
  }
  return { kind: "afterHours", lastTime: "23:59", firstTimeTomorrow: "00:00" }
}

function getUpcoming(
  bundle: ModeBundle,
  stopId: string,
  now: Date,
): StopWithArrivals {
  const stop = bundle.stops.find((s) => s.id === stopId)
  if (!stop) {
    throw new Error(`Unknown stop "${stopId}" in mode "${bundle.mode}"`)
  }
  const { status, upcoming } = findUpcomingForStop(bundle, stopId, now)
  return {
    stop,
    mode: bundle.mode,
    serviceStatus: status,
    next: upcoming[0] ?? null,
    upcoming,
  }
}

export function createStaticJsonProvider(): Provider {
  return {
    id: "static-json",
    modes: ["mrt-jakarta", "krl-commuter", "transjakarta-brt", "transjakarta-mikrotrans", "lrt-jabodebek", "lrt-jakarta"],

    async isActive() {
      // The static-JSON provider is always "active" if a bundle exists.
      try {
        loadAllBundles()
        return true
      } catch {
        return false
      }
    },

    async listStops() {
      const result: { stop: Stop; mode: ModeId }[] = []
      for (const bundle of loadAllBundles()) {
        for (const stop of bundle.stops) {
          result.push({ stop, mode: bundle.mode })
        }
      }
      return result
    },

    async getUpcoming(mode, stopId, now) {
      const bundle = loadModeBundle(mode)
      return getUpcoming(bundle, stopId, now)
    },
  }
}

export { findUpcomingForStop as _findUpcomingForStop }
export { getServiceStatus as _getServiceStatus }
