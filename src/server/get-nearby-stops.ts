/**
 * Server function: resolve the nearby stops for a user location.
 *
 * Takes a user lat/lon, calls OSRM for walking durations to every
 * stop in the data layer, then asks the provider chain for the next
 * arrival at each stop within the walking-time threshold. Returns
 * the merged result, sorted by walking time.
 *
 * Stops that are physically the same shelter but served by multiple
 * sub-services of the same operator (e.g. a BRT corridor and a
 * Mikrotrans route that share a halte) are returned as one entry
 * per `(operator, stopId)`. The `subServices` list tells the UI
 * which sub-services are running there so it can render a small
 * badge per service (see ADR-0004).
 *
 * See:
 *  - docs/adr/0001-pluggable-provider-chain.md
 *  - docs/adr/0002-walking-time-via-self-hosted-osrm.md
 *  - docs/adr/0004-transjakarta-sub-services.md
 */

import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { setResponseHeader } from "@tanstack/react-start/server"

import { defaultChain } from "./providers/chain"
import { getWalkingDurations } from "./osrm"
import { loadModeBundle, operatorOf } from "../data/load"
import type { Localized, ModeId } from "../data/types"
import type { LatLon } from "../lib/geo"
import { OPERATOR_LABELS, SUB_SERVICE_LABELS } from "./labels"

const WALKING_THRESHOLD_S = 10 * 60 // 10 min per ADR-0002
const UPCOMING_HORIZON_MIN = 2 * 60 // 2 h

const inputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  nowIso: z.string().optional(),
  locale: z.enum(["en", "id"]).optional(),
})

export type NearbyStop = {
  operator: string
  operatorName: Localized
  stopId: string
  stopName: Localized
  walkSeconds: number | null
  serviceStatus:
    | { kind: "running" }
    | { kind: "beforeHours"; firstTime: string }
    | { kind: "afterHours"; lastTime: string; firstTimeTomorrow: string }
  next: {
    routeId: string
    subService: string
    routeName: Localized
    headsign: Localized
    color?: string
    secondsUntil: number
    clockTime: string
  } | null
  upcoming: {
    routeId: string
    subService: string
    clockTime: string
    secondsUntil: number
  }[]
  subServices: {
    id: string
    label: Localized
    color?: string
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

    // Step 1: filter to nearby (mode, stop) pairs, and group by the
    // (operator, physical stop) that the UI will render as one card.
    type PendingGroup = {
      operator: string
      stopId: string
      stopName: Localized
      walkSeconds: number
      modes: { mode: ModeId }[]
    }
    const groups = new Map<string, PendingGroup>()

    for (let i = 0; i < allStops.length; i++) {
      const { stop, mode } = allStops[i]
      const walkSeconds = durations.seconds[i] ?? null
      if (walkSeconds === null || walkSeconds > WALKING_THRESHOLD_S) continue

      const bundle = loadModeBundle(mode)
      const operator = operatorOf(bundle)
      const key = `${operator}::${stop.id}`

      let group = groups.get(key)
      if (!group) {
        group = {
          operator,
          stopId: stop.id,
          stopName: stop.name,
          walkSeconds,
          modes: [],
        }
        groups.set(key, group)
      }
      // Keep the smallest walkSeconds across the modes sharing this
      // physical stop — should be identical, but be defensive.
      if (walkSeconds < group.walkSeconds) group.walkSeconds = walkSeconds
      if (!group.modes.some((m) => m.mode === mode)) {
        group.modes.push({ mode })
      }
    }

    // Step 2: for each group, fetch arrivals from every sub-service
    // and merge into one NearbyStop.
    const results: NearbyStop[] = []
    for (const group of groups.values()) {
      type MergedArrival = {
        routeId: string
        subService: ModeId
        routeName: Localized
        headsign: Localized
        color?: string
        secondsUntil: number
        clockTime: string
      }
      const allUpcoming: MergedArrival[] = []

      const subServiceStatuses: { kind: "running" | "beforeHours" | "afterHours"; firstTime?: string; lastTime?: string; firstTimeTomorrow?: string }[] = []
      const subServices: { id: string; label: Localized; color?: string }[] = []

      for (const { mode } of group.modes) {
        const arrival = await defaultChain.getUpcoming(mode, group.stopId, now)
        subServiceStatuses.push(arrival.serviceStatus)
        subServices.push({
          id: mode,
          label: SUB_SERVICE_LABELS[mode] ?? { en: mode, id: mode },
          color: arrival.next?.route.color,
        })
        for (const u of arrival.upcoming) {
          allUpcoming.push({
            routeId: u.routeId,
            subService: mode,
            routeName: u.route.name,
            headsign: u.route.headsign,
            color: u.route.color,
            secondsUntil: u.secondsUntil,
            clockTime: u.clockTime,
          })
        }
      }

      allUpcoming.sort((a, b) => a.secondsUntil - b.secondsUntil)
      const horizon = UPCOMING_HORIZON_MIN * 60
      const upcoming = allUpcoming.filter((u) => u.secondsUntil <= horizon)

      const next = upcoming[0]
        ? {
            routeId: upcoming[0].routeId,
            subService: upcoming[0].subService,
            routeName: upcoming[0].routeName,
            headsign: upcoming[0].headsign,
            color: upcoming[0].color,
            secondsUntil: upcoming[0].secondsUntil,
            clockTime: upcoming[0].clockTime,
          }
        : null

      const serviceStatus = _combineStatuses(subServiceStatuses)

      results.push({
        operator: group.operator,
        operatorName: OPERATOR_LABELS[group.operator] ?? { en: group.operator, id: group.operator },
        stopId: group.stopId,
        stopName: group.stopName,
        walkSeconds: group.walkSeconds,
        serviceStatus,
        next,
        upcoming: upcoming.map((u) => ({
          routeId: u.routeId,
          subService: u.subService,
          clockTime: u.clockTime,
          secondsUntil: u.secondsUntil,
        })),
        subServices,
      })
    }

    results.sort((a, b) => (a.walkSeconds ?? 0) - (b.walkSeconds ?? 0))
    return { source, stops: results, osrmFallback: durations.fromFallback }
  })

/**
 * Most-permissive combine rule across sub-service statuses.
 *  - "running" beats "beforeHours" beats "afterHours".
 *  - All "beforeHours" → beforeHours with the earliest start time.
 *  - All "afterHours"  → afterHours with the latest end time, and the
 *    soonest tomorrow start.
 *  - Mixed            → "afterHours" (the conservative headline; the
 *    upcoming list still surfaces any soon-to-start routes).
 */
export function _combineStatuses(
  statuses: { kind: "running" | "beforeHours" | "afterHours"; firstTime?: string; firstTimeTomorrow?: string; lastTime?: string }[],
):
  | { kind: "running" }
  | { kind: "beforeHours"; firstTime: string }
  | { kind: "afterHours"; lastTime: string; firstTimeTomorrow: string } {
  if (statuses.length === 0) {
    return { kind: "afterHours", lastTime: "23:59", firstTimeTomorrow: "00:00" }
  }

  const kinds = new Set(statuses.map((s) => s.kind))
  if (kinds.has("running")) return { kind: "running" }
  if (kinds.size === 1 && kinds.has("beforeHours")) {
    const firstTime = statuses
      .map((s) => s.firstTime)
      .filter((t): t is string => Boolean(t))
      .sort()[0] ?? "00:00"
    return { kind: "beforeHours", firstTime }
  }
  // Either all afterHours, or a mix. Use the latest end time across
  // afterHours sub-services; if none, fall back to the latest among
  // all sub-services' end times (we have no per-route data here, but
  // the mode-level end time is a reasonable headline).
  const afterHours = statuses.filter((s) => s.kind === "afterHours")
  const lastTime =
    afterHours
      .map((s) => s.lastTime)
      .filter((t): t is string => Boolean(t))
      .sort()
      .pop() ??
    "23:59"
  const firstTimeTomorrow =
    statuses
      .map((s) => s.firstTimeTomorrow)
      .filter((t): t is string => Boolean(t))
      .sort()[0] ?? "00:00"
  return { kind: "afterHours", lastTime, firstTimeTomorrow }
}
