/**
 * Static-JSON data model for the bundled timetable.
 *
 * One file per mode lives at `src/data/<mode>.json` (e.g. `mrt-jakarta.json`).
 * A `src/data/_meta.json` holds the bundle-level metadata (last-updated
 * timestamp, version). The provider chain reads these files and produces
 * `ProviderQuery` results for the rest of the app.
 *
 * See `docs/data-format.md` for the human-readable spec and rationale.
 */

export type ModeId =
  | "mrt-jakarta"
  | "krl-commuter"
  | "transjakarta"
  | "lrt-jabodebek"
  | "lrt-jakarta"

export const MODE_IDS: readonly ModeId[] = [
  "mrt-jakarta",
  "krl-commuter",
  "transjakarta",
  "lrt-jabodebek",
  "lrt-jakarta",
] as const

export type Locale = "en" | "id"

export type Localized = Record<Locale, string>

export type ServiceHours = {
  /** "HH:MM" in 24h Jakarta time. Inclusive. */
  start: string
  /** "HH:MM" in 24h Jakarta time. May exceed 24:00 to model a window that
   *  rolls past midnight (e.g. 24:30 = 00:30 the next day). Exclusive. */
  end: string
}

export type Stop = {
  /** Unique within the mode. Stable across scrapes. */
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
  /** Unique within the mode. Stable across scrapes.
   *  Convention: `<line-id>.<direction>` (e.g. `ns.northbound`). */
  id: string
  /** Display name in both languages, e.g. "North-South Line (Northbound)". */
  name: Localized
  /** Destination shown on the front of the vehicle, in both languages.
   *  Used as the card's "what's coming" line. */
  headsign: Localized
  /** Optional UI color (line color in operator branding). */
  color?: string
}

/** Clock time as "HH:MM" in 24h Jakarta time. May exceed 24:00 to roll
 *  past midnight. Sorted ascending within a route. */
export type ClockTime = string

export type ModeBundle = {
  mode: ModeId
  /** Human-readable mode name, in both languages. */
  name: Localized
  /** Mode-level daily service window. The static data currently assumes
   *  the same window every day (no weekday/weekend split). */
  serviceHours: ServiceHours
  stops: Stop[]
  routes: Route[]
  /** Indexed for fast lookup. `timetables[routeId][stopId]` is the
   *  sorted list of arrival times for that (route, stop). */
  timetables: {
    [routeId: string]: {
      [stopId: string]: ClockTime[]
    }
  }
}

export type BundleMeta = {
  /** Schema version. Bumped when the shape changes in a non-backward-
   *  compatible way. */
  version: 1
  /** ISO 8601 timestamp of the most recent successful scrape. */
  dataLastUpdated: string
  /** Operator names + source URLs, for the "about this data" panel. */
  sources: {
    mode: ModeId
    operator: string
    sourceUrl: string
  }[]
}
