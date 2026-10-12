# Static-JSON data format

One file per mode/sub-service, all under `src/data/`. The shape is
described in `src/data/types.ts`; this doc is the rationale and the
human-readable spec. The vocabulary (`Mode`, `Sub-service`, `Route`,
`Stop`, `Arrival`, `Frequency window`, …) is defined in `CONTEXT.md`.

## File layout

```
src/data/
├── _meta.json                                # bundle metadata
├── mrt-jakarta.json                          # rail (hand-curated)
├── krl-commuter.json
├── lrt-jabodebek.json
├── lrt-jakarta.json
├── transjakarta-brt.json                     # GTFS-derived (one per route_desc)
├── transjakarta-angkutan-umum-integrasi.json
├── transjakarta-mikrotrans.json
├── transjakarta-transjabodetabek.json
├── transjakarta-rusun.json
├── transjakarta-royaltrans.json
└── transjakarta-bus-wisata.json
```

Each `<mode>.json` is a `ModeBundle`. `_meta.json` is a `BundleMeta`.

## Schedules are headway-based, not explicit times

A route does NOT carry a list of clock times. It carries a list of
**frequency windows** and a per-stop **travel offset**:

```jsonc
"schedules": {
  "1-R07": {
    "windows": [
      { "start": "05:00", "end": "09:00", "headwaySeconds": 300 },
      { "start": "09:00", "end": "17:00", "headwaySeconds": 600 }
    ],
    "stopOffsets": { "H00173P": 0, "H00060P": 173, "B06942P": 1695 }
  }
}
```

"Next arrival at stop X" = the soonest
`window.start + n * headwaySeconds + stopOffsets[X]` in the future, on a
service day the route runs.

This is the shape GTFS `frequencies.txt` + `stop_times.txt` give us.
Converting the Transjakarta feed to explicit clock times would produce
~3 million entries (~30 MB); the headway shape is ~26,000 offsets
(~1 MB, ~350 KB gzipped). It also matches how the operator actually
runs the service (headway-based, not a printed timetable).

## Per-mode shape (`ModeBundle`)

```jsonc
{
  "mode": "transjakarta-brt",
  "operator": "transjakarta",
  "name": { "en": "BRT", "id": "BRT" },   // the operator's route_desc
  "stops": [
    { "id": "H00014P", "name": { "en": "Blok M", "id": "Blok M" },
      "lat": -6.244, "lon": 106.8 }
  ],
  "routes": [
    { "id": "1-R07", "shortName": "1",
      "name": { "en": "Blok M - Kali Besar Barat", "id": "Blok M - Kali Besar Barat" },
      "headsign": { "en": "Kali Besar Barat", "id": "Kali Besar Barat" },
      "color": "#D65E62", "serviceDays": [0,1,2,3,4,5,6] }
  ],
  "schedules": { "1-R07": { "windows": [...], "stopOffsets": {...} } }
}
```

## Conventions

- **Route id** is the GTFS trip id for Transjakarta (e.g. `1-R07`,
  `JAK.74-R01`); a rail line+direction for the hand-curated modes
  (e.g. `ns.northbound`).
- **`shortName`** is the public identifier on the vehicle: `9`, `1A`,
  `JAK.79`. The card shows `shortName → headsign`.
- **`serviceDays`** is a list of 0–6 (0 = Monday). `[0,1,2,3,4]` is
  weekdays, `[5,6]` the weekend, all seven is daily.
- **Clock times** are 24-hour Jakarta time (`Asia/Jakarta`, UTC+7).
  Values may exceed `24:00` to roll past midnight (`"24:30"` = `00:30`
  the next day). Window `start` is inclusive, `end` inclusive of the
  last departure at or before it.
- **`stopOffsets`** is seconds from the route's first-stop departure to
  the arrival at each stop. The first stop is `0`. A missing stop id
  means the route does not serve that stop.
- **`windows`** are ordered ascending by `start`. Most routes have one;
  peak/off-peak routes have several.
- **Stops** are clustered boarding locations. The Transjakarta importer
  merges GTFS platforms by `parent_station`, then by base name within
  120 m. A route's `stopOffsets` reference cluster ids, so consecutive
  duplicates (two platforms of the same cluster) are collapsed.

## `_meta.json`

```jsonc
{
  "version": 2,
  "dataLastUpdated": "2026-07-12T10:00:00Z",
  "sources": [
    { "mode": "transjakarta-brt", "operator": "transjakarta",
      "sourceUrl": "https://gtfs.transjakarta.co.id/files/file_gtfs.zip" }
  ]
}
```

`dataLastUpdated` is what the footer shows. The `sources` array is for
an "about this data" panel.

## Where the data comes from

- **Transjakarta** — `scripts/import-gtfs-transjakarta.ts` downloads the
  official GTFS feed, maps `route_desc` → sub-service, and writes the
  seven `transjakarta-*.json` bundles. See ADR-0005.
- **MRT / KRL / LRT** — hand-curated `scripts/gen-*-data.ts` scripts
  (no GTFS feed available). They emit the same shape.

`pnpm scrape-data` runs both and bumps `_meta.json`; the weekly CI
workflow calls it.

## Open questions

- **Service day across midnight.** A Friday-only trip whose window wraps
  past midnight (e.g. `22:00–24:30`) is treated as a Friday service even
  when the user looks at it at `00:30` Saturday. The provider filters by
  the *window instance's* day, so this mostly works, but the "current
  service day" is derived from the wall clock rather than GTFS's
  trip-start convention. Rare (most trips are daily).
- **Cross-mode transfer pairs.** GTFS ships `transfers.txt`; we don't
  surface it yet. A future "is this one station?" feature could use it.
- **Fares / shapes / ticketing.** In the feed, not surfaced.
- **GTFS-RT.** No public realtime feed; when one appears it becomes a
  live provider in the chain (ADR-0001).
