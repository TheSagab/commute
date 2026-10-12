/**
 * Static-JSON provider.
 *
 * Reads the bundled `src/data/<mode>.json` files and answers `Provider`
 * queries. The default provider for every mode; a live provider (GTFS-RT,
 * third-party) overrides it per mode when active. See
 * `docs/adr/0001-pluggable-provider-chain.md`.
 *
 * Schedules are headway-based: each route has a list of frequency
 * windows (`start`, `end`, `headwaySeconds`) plus a per-stop travel
 * offset (`stopOffsets[stopId]`). "Next arrival at stop X" is the
 * soonest `window.start + n * headway + offset[X]` in the future, on a
 * service day the route runs. This is the shape GTFS `frequencies.txt`
 * gives us, and it keeps the Transjakarta feed at ~1 MB rather than the
 * ~30 MB an explicit-times conversion would produce.
 *
 * Times are Jakarta wall-clock. Clock values may exceed 24:00 to roll
 * past midnight (e.g. "24:30" = 00:30 the next day). The provider
 * projects `now` to Jakarta seconds-since-midnight and day-of-week
 * before comparing. The user's clock is assumed to be on Jakarta time —
 * see the `Known gotchas` section of `AGENTS.md`.
 */

import { loadAllBundles, loadModeBundle } from "../../data/load"
import type { ModeBundle, ModeId, Route, Schedule, ServiceDays, Stop } from "../../data/types"
import type {
  Provider,
  ServiceStatus,
  StopWithArrivals,
  UpcomingArrival,
} from "./types"

const DAY_SECONDS = 24 * 60 * 60
const JAKARTA_OFFSET_SECONDS = 7 * 60 * 60

/** Jakarta-local wall-clock seconds-since-midnight and day-of-week
 *  (0 = Monday … 6 = Sunday) at the given instant. */
function jakartaPartsAt(now: Date): { sec: number; dow: number } {
  const jakartaMs = now.getTime() + JAKARTA_OFFSET_SECONDS * 1000
  const d = new Date(jakartaMs)
  const sec = d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds()
  // getUTCDay: 0 = Sunday … 6 = Saturday. Shift to 0 = Monday.
  const dow = (d.getUTCDay() + 6) % 7
  return { sec, dow }
}

function clockToSeconds(clock: string): number {
  const [h, m] = clock.split(":").map(Number)
  return h * 3600 + m * 60
}

function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** Per-route service status from its frequency windows, on a day the
 *  route runs. */
function routeStatus(
  schedule: Schedule,
  stopOffset: number,
  nowSec: number,
  serviceDays: ServiceDays,
  todayDow: number,
): ServiceStatus {
  if (schedule.windows.length === 0) {
    return { kind: "afterHours", lastTime: "23:59", firstTimeTomorrow: "00:00" }
  }
  const firstStart = Math.min(...schedule.windows.map((w) => clockToSeconds(w.start)))
  // Effective service ends after the last window's last departure plus
  // the travel time to this stop.
  const lastEnd = Math.max(...schedule.windows.map((w) => clockToSeconds(w.end))) + stopOffset

  if (!serviceDays.includes(todayDow)) {
    // Not a service day. Only relevant if yesterday's window is still
    // running past midnight (a late-night trip on the previous day).
    const runsYesterday = serviceDays.includes((todayDow + 6) % 7)
    if (runsYesterday && lastEnd > DAY_SECONDS && nowSec < lastEnd - DAY_SECONDS) {
      return { kind: "running" }
    }
    return {
      kind: "afterHours",
      lastTime: formatClock(lastEnd),
      firstTimeTomorrow: formatClock(firstStart),
    }
  }

  if (nowSec < firstStart) {
    return { kind: "beforeHours", firstTime: formatClock(firstStart) }
  }
  if (nowSec >= lastEnd) {
    return {
      kind: "afterHours",
      lastTime: formatClock(lastEnd),
      firstTimeTomorrow: formatClock(firstStart),
    }
  }
  return { kind: "running" }
}

/** Soonest future arrival (seconds since midnight, may exceed 24:00) for
 *  a route at a stop, or `null` if none today. */
function nextArrivalSeconds(
  schedule: Schedule,
  stopId: string,
  nowSec: number,
  todayDow: number,
  serviceDays: ServiceDays,
): number | null {
  const offset = schedule.stopOffsets[stopId]
  if (offset === undefined) return null

  let best = Infinity
  for (const w of schedule.windows) {
    const headway = w.headwaySeconds
    if (headway <= 0) continue
    const wStart = clockToSeconds(w.start)
    const wEnd = clockToSeconds(w.end)

    // Two instances: today's (service day = today) and yesterday's
    // (service day = yesterday — only meaningful for windows that wrap
    // past midnight, but harmless otherwise because arrivals land in
    // the past and get filtered).
    for (const [dayShift, serviceDay] of [
      [0, todayDow],
      [-DAY_SECONDS, (todayDow + 6) % 7],
    ] as const) {
      if (!serviceDays.includes(serviceDay)) continue
      const start = wStart + dayShift
      const end = wEnd + dayShift
      // First departure at or after the moment the stop needs to be
      // served: nowSec - offset.
      const n = Math.max(0, Math.ceil((nowSec - offset - start) / headway))
      const departure = start + n * headway
      if (departure > end) continue
      const arrival = departure + offset
      if (arrival >= nowSec && arrival < best) best = arrival
    }
  }
  return best === Infinity ? null : best
}

function routeServesStop(schedule: Schedule | undefined, stopId: string): schedule is Schedule {
  return Boolean(schedule && schedule.stopOffsets[stopId] !== undefined)
}

const HORIZON_SECONDS = 2 * 60 * 60 // next 2 hours

function findUpcomingForStop(
  bundle: ModeBundle,
  stopId: string,
  now: Date,
): { status: ServiceStatus; upcoming: UpcomingArrival[] } {
  const { sec: nowSec, dow: todayDow } = jakartaPartsAt(now)

  const routesServing: { route: Route; schedule: Schedule; offset: number }[] = []
  for (const route of bundle.routes) {
    const schedule = bundle.schedules[route.id]
    if (!routeServesStop(schedule, stopId)) continue
    routesServing.push({ route, schedule, offset: schedule.stopOffsets[stopId] })
  }

  const statuses = routesServing.map(({ route, schedule, offset }) =>
    routeStatus(schedule, offset, nowSec, route.serviceDays, todayDow),
  )
  const status = combineRouteStatuses(statuses)

  if (status.kind !== "running") {
    return { status, upcoming: [] }
  }

  const upcoming: UpcomingArrival[] = []
  for (const { route, schedule } of routesServing) {
    const arrival = nextArrivalSeconds(schedule, stopId, nowSec, todayDow, route.serviceDays)
    if (arrival === null) continue
    const secondsUntil = arrival - nowSec
    if (secondsUntil > HORIZON_SECONDS) continue
    upcoming.push({
      routeId: route.id,
      route,
      clockTime: formatClock(arrival),
      secondsUntil,
    })
  }

  upcoming.sort((a, b) => a.secondsUntil - b.secondsUntil)
  return { status, upcoming }
}

/** Most-permissive combine across the routes serving a stop. Mirrors the
 *  same rule in `get-nearby-stops.ts` (`_combineStatuses`), preserving
 *  the real start/end times so the card can render "Starts at 05:00" /
 *  "Service ended at 23:00" rather than a placeholder. */
function combineRouteStatuses(statuses: ServiceStatus[]): ServiceStatus {
  if (statuses.length === 0) {
    return { kind: "afterHours", lastTime: "23:59", firstTimeTomorrow: "00:00" }
  }
  if (statuses.some((s) => s.kind === "running")) return { kind: "running" }

  if (statuses.every((s) => s.kind === "beforeHours")) {
    const starts = statuses.flatMap((s) => (s.kind === "beforeHours" ? [s.firstTime] : []))
    return { kind: "beforeHours", firstTime: starts.sort()[0] ?? "00:00" }
  }

  // All (or mostly) afterHours: earliest "first service tomorrow",
  // latest "last service today".
  const lastTimes = statuses.flatMap((s) => (s.kind === "afterHours" ? [s.lastTime] : []))
  const firstTomorrow = statuses.flatMap((s) => (s.kind === "afterHours" ? [s.firstTimeTomorrow] : []))
  return {
    kind: "afterHours",
    lastTime: lastTimes.sort().at(-1) ?? "23:59",
    firstTimeTomorrow: firstTomorrow.sort()[0] ?? "00:00",
  }
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
    modes: [
      "mrt-jakarta",
      "krl-commuter",
      "transjakarta-brt",
      "transjakarta-angkutan-umum-integrasi",
      "transjakarta-mikrotrans",
      "transjakarta-transjabodetabek",
      "transjakarta-rusun",
      "transjakarta-royaltrans",
      "transjakarta-bus-wisata",
      "lrt-jabodebek",
      "lrt-jakarta",
    ],

    async isActive() {
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
export { nextArrivalSeconds as _nextArrivalSeconds }
export { jakartaPartsAt as _jakartaPartsAt }
