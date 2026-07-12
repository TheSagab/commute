# Static-JSON data format

One file per mode, all under `src/data/`. The shape is described in
`src/data/types.ts`; this doc is the rationale and the human-readable
spec. The vocabulary (`Mode`, `Route`, `Stop`, `Arrival`, etc.) is
defined in `CONTEXT.md`.

## File layout

```
src/data/
├── _meta.json          # bundle metadata (timestamp, version, sources)
├── mrt-jakarta.json    # one file per mode
├── krl-commuter.json
├── transjakarta.json
├── lrt-jabodebek.json
└── lrt-jakarta.json
```

Each `<mode>.json` is a `ModeBundle`. `_meta.json` is a `BundleMeta`.

## Per-mode shape (`ModeBundle`)

```jsonc
{
  "mode": "mrt-jakarta",
  "name": { "en": "MRT Jakarta", "id": "MRT Jakarta" },
  "serviceHours": { "start": "05:00", "end": "24:30" },
  "stops": [
    {
      "id": "mrt-ldb",
      "name": { "en": "Lebak Bulus", "id": "Lebak Bulus" },
      "code": "LBB",
      "lat": -6.2885,
      "lon": 106.7745
    }
  ],
  "routes": [
    {
      "id": "ns.southbound",
      "name": {
        "en": "North-South Line (Southbound)",
        "id": "Lin Utara-Selatan (Menuju Lebak Bulus)"
      },
      "headsign": { "en": "Lebak Bulus", "id": "Lebak Bulus" },
      "color": "#E2231A"
    }
  ],
  "timetables": {
    "ns.southbound": {
      "mrt-ldb":  ["05:00", "05:05", "05:10"],
      "mrt-fkb":  ["05:03", "05:08", "05:13"]
    }
  }
}
```

## Conventions

- **Route id** is `<line>.<direction>` (e.g. `ns.southbound`). A
  physical "line" is split into two routes — one per direction — because
  they have different timetables at each stop.
- **Stop id** is unique within the mode. Convention: `<mode-prefix>-<slug>`
  (e.g. `mrt-ldb`).
- **Clock times** are `"HH:MM"` in 24-hour Jakarta time (WIB, UTC+7). They
  are stored in **local Jakarta time** because that is what the operators
  publish. The app converts the user's "now" to Jakarta time before
  comparing.
- **Rolling past midnight.** Service hours may end after `24:00` (e.g.
  `24:30` = `00:30` the next day). A departure at `25:10` means `01:10`
  the next day. This is the cleanest way to model the common
  late-night-into-early-morning gap.
- **Sorted ascending** within a `(route, stop)`. The static-JSON provider
  relies on this to binary-search the next arrival.
- **No weekday/weekend split** in the MVP. We model a single weekly
  schedule per (route, stop). Operators that publish different weekend
  timetables (most of them) need a future schema bump — see
  `## Open questions` below.

## `_meta.json`

```jsonc
{
  "version": 1,
  "dataLastUpdated": "2026-07-12T10:00:00Z",
  "sources": [
    {
      "mode": "mrt-jakarta",
      "operator": "PT MRT Jakarta",
      "sourceUrl": "https://www.jakartamrt.co.id/id/ jadwal-operasi"
    }
  ]
}
```

The `dataLastUpdated` is what the footer shows. The `sources` array is
shown in the "About this data" panel so the user can verify provenance.

## Provider contract

The static-JSON provider reads a `ModeBundle` and answers:

- `listStops(mode)` → all stops in the mode with lat/lon
- `getNextArrivals(mode, stopId, now)` → the soonest future arrival for
  that stop across all routes serving it, plus the per-route breakdown
- `getServiceStatus(mode, now)` → `running` / `beforeHours` / `afterHours`

A live provider (GTFS, third-party) returns the same shape but may return
later data; the chain prefers live over static. See
`docs/adr/0001-pluggable-provider-chain.md`.

## Open questions

- **Weekday vs weekend.** Most operators run different timetables on
  weekends (often with the first train later and headways wider). Not
  modeled yet. When needed, add `timetables.weekday` and
  `timetables.weekend` keys; bump `version` to 2.
- **Per-route service hours.** Some operators have routes that end
  earlier than the mode-level window (e.g. a commuter branch that
  stops running at 22:00). Not modeled; the static data assumes every
  route in a mode shares the window. When needed, add an optional
  `serviceHours` field to `Route` and have the provider prefer it
  over the mode-level one.
- **Stops the last train skips.** KRL's last few trains on a line don't
  stop at every station. Not modeled; the static data assumes the full
  timetable applies to every stop. The right fix is a per-stop flag
  on the late-night services — out of scope for the MVP.
