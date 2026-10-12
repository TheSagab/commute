/**
 * Static-JSON data model for the bundled timetable.
 *
 * One file per mode lives at `src/data/<mode>.json` (e.g. `mrt-jakarta.json`).
 * A `src/data/_meta.json` holds the bundle-level metadata (last-updated
 * timestamp, version). The provider chain reads these files and produces
 * `ProviderQuery` results for the rest of the app.
 *
 * Schedules are headway-based rather than explicit clock times. A route's
 * schedule is a list of frequency windows (`start`, `end`, `headwaySeconds`)
 * plus a per-stop travel offset. "Next arrival at stop X" is the soonest
 * `window.start + n * headway + offset[X]` in the future. This is the shape
 * GTFS `frequencies.txt` uses, and it keeps the Transjakarta feed (which
 * would explode to ~30 MB as explicit times) at ~1 MB.
 *
 * See `docs/data-format.md` for the human-readable spec and rationale.
 */

export type ModeId =
  | "mrt-jakarta"
  | "krl-commuter"
  | "transjakarta-brt"
  | "transjakarta-angkutan-umum-integrasi"
  | "transjakarta-mikrotrans"
  | "transjakarta-transjabodetabek"
  | "transjakarta-rusun"
  | "transjakarta-royaltrans"
  | "transjakarta-bus-wisata"
  | "lrt-jabodebek"
  | "lrt-jakarta"

export const MODE_IDS: readonly ModeId[] = [
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
] as const

export type Locale = "en" | "id"

export type Localized = Record<Locale, string>

/** Clock time as "HH:MM" in 24h Jakarta time. May exceed 24:00 to roll
 *  past midnight (e.g. "24:30" = 00:30 the next day). */
export type ClockTime = string

/** Days of the week a route runs. 0 = Monday … 6 = Sunday.
 *  `[0,1,2,3,4]` is weekdays, `[5,6]` is the weekend, all seven is daily. */
export type ServiceDays = number[]

export type Stop = {
  /** Stable across scrapes. Within a single `ModeBundle` this id is
   *  unique. Stops with the same `id` MAY appear in multiple bundles
   *  of the same operator — the chain unifies them at query time. */
  id: string
  /** Official name in both languages. */
  name: Localized
  /** Operator-issued code, if any. E.g. "LBB" for Lebak Bulus MRT. */
  code?: string
  /** WGS84 latitude. */
  lat: number
  /** WGS84 longitude. */
  lon: number
}

export type Route = {
  /** Unique within the mode. Stable across scrapes. For GTFS-derived
   *  bundles this is the trip id (e.g. `1-R07`). */
  id: string
  /** Short public identifier shown on the vehicle, e.g. "9", "1A",
   *  "JAK.79". For rail modes this is the line code, e.g. "NS". */
  shortName: string
  /** Display name in both languages, e.g. "Kali Besar Barat - Blok M". */
  name: Localized
  /** Destination shown on the front of the vehicle, in both languages.
   *  Used as the card's "what's coming" line. */
  headsign: Localized
  /** Optional UI color (line color in operator branding, hex without #). */
  color?: string
  /** Days this route runs. See `ServiceDays`. */
  serviceDays: ServiceDays
}

/** A window during which vehicles depart the route's first stop every
 *  `headwaySeconds`, from `start` (inclusive) to `end` (inclusive). */
export type FrequencyWindow = {
  start: ClockTime
  end: ClockTime
  headwaySeconds: number
}

export type Schedule = {
  /** Ordered ascending by `start`. A route typically has one window;
   *  peak/off-peak routes have several. */
  windows: FrequencyWindow[]
  /** Seconds from the route's first-stop departure to the arrival at
   *  each stop. `stopOffsets[firstStopId] === 0`. Missing entries mean
   *  the route does not serve that stop. */
  stopOffsets: Record<string, number>
}

export type ModeBundle = {
  mode: ModeId
  /** The operator this sub-service belongs to. Defaults to `mode`
   *  (i.e. the operator IS the sub-service, as for MRT/LRT/KRL). For
   *  Transjakarta, several sub-services (`transjakarta-brt`,
   *  `transjakarta-mikrotrans`, …) share the operator `"transjakarta"`.
   *  Used by the UI to group sub-services under their operator. */
  operator?: string
  /** Human-readable sub-service name, in both languages. For GTFS-derived
   *  bundles this is the `route_desc` value (e.g. "BRT", "Mikrotrans"). */
  name: Localized
  stops: Stop[]
  routes: Route[]
  /** Indexed by route id. `schedules[routeId]` is the headway + per-stop
   *  offset data the provider turns into "next arrival" for a stop. */
  schedules: Record<string, Schedule>
}

export type BundleMeta = {
  /** Schema version. Bumped when the shape changes in a non-backward-
   *  compatible way. */
  version: 2
  /** ISO 8601 timestamp of the most recent successful scrape. */
  dataLastUpdated: string
  /** Source URL per mode, for the "about this data" panel. */
  sources: {
    mode: ModeId
    operator: string
    sourceUrl: string
  }[]
}
