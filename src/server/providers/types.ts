/**
 * Provider chain types — the contract every data source must satisfy.
 *
 * See `docs/adr/0001-pluggable-provider-chain.md` for the design.
 */

import type { ModeId, Route, Stop } from "../../data/types"

/** A "service status" for a mode at a given instant. The card UI maps
 *  these onto the three states from `CONTEXT.md` ("countdown" /
 *  "Starts at HH:MM" / "Service ended"). */
export type ServiceStatus =
  | { kind: "running" }
  | { kind: "beforeHours"; firstTime: string }
  | { kind: "afterHours"; lastTime: string; firstTimeTomorrow: string }

/** A single (route, direction) arrival at a stop, in the future. */
export type UpcomingArrival = {
  routeId: string
  route: Route
  /** "HH:MM" wall-clock time in Jakarta time. */
  clockTime: string
  /** Seconds from `now` until the arrival. */
  secondsUntil: number
}

export type StopWithArrivals = {
  stop: Stop
  mode: ModeId
  /** Per-stop service status. Always set so the card can show the
   *  three-state UI. */
  serviceStatus: ServiceStatus
  /** Soonest upcoming arrival across all routes serving the stop.
   *  `null` if service is in `afterHours` or there are no more arrivals
   *  in the current window. */
  next: UpcomingArrival | null
  /** All upcoming arrivals in the next ~2 hours, ordered ascending.
   *  Used for the tap-to-expand per-route breakdown. */
  upcoming: UpcomingArrival[]
}

export type Provider = {
  /** Stable id, e.g. "static-json" / "gtfs-jakarta" / "krl-access". */
  id: string
  /** Modes this provider can serve. A mode can have more than one
   *  provider configured; the chain resolves precedence. */
  modes: ModeId[]
  /** True if the provider is reachable and serving data right now. The
   *  chain calls this lazily and may cache the result. */
  isActive: () => Promise<boolean>
  /** All stops served by this provider across its modes. Used to build
   *  the OSRM query for "nearby." */
  listStops: () => Promise<{ stop: Stop; mode: ModeId }[]>
  /** Future arrivals for a single stop. `now` is a UTC instant. */
  getUpcoming: (
    mode: ModeId,
    stopId: string,
    now: Date,
  ) => Promise<StopWithArrivals>
}
