# Transjakarta data comes from the official GTFS feed

Transjakarta publishes an official GTFS feed at
`https://gtfs.transjakarta.co.id/files/file_gtfs.zip` (240 routes,
700 trips, 7,819 per-platform stops, schedules, headways, a day-of-week
calendar). We import it at build time —
`scripts/import-gtfs-transjakarta.ts` — and write the static JSON the
app reads at runtime. The app never downloads GTFS itself.

The importer replaces the three hand-curated Transjakarta generators
(which covered ~99 made-up routes with guessed coordinates). The rail
modes (MRT / KRL / LRT) have no GTFS feed and stay hand-curated; their
generators were rewritten to emit the same shape so the provider has a
single code path.

## Mapping

- one GTFS `route` + its `trips` → one sub-service bundle per
  `route_desc` (BRT, Angkutan Umum Integrasi, Mikrotrans,
  Transjabodetabek, Rusun, Royaltrans, Bus Wisata)
- one GTFS `trip` → one `Route` (`shortName` = `route_short_name`,
  `headsign` = `trip_headsign`); every service variant is its own route
- `frequencies.txt` → `Schedule.windows`
- `stop_times.txt` → `Schedule.stopOffsets`
- `calendar.txt` → `Route.serviceDays`
- `stops.txt` → clustered boarding locations (`parent_station` first,
  then base name within 120 m)

## Why this shape

The feed's `frequencies.txt` is headway-based, not a printed timetable.
Expanding it to the app's old explicit-clock-times format would produce
~3 million entries (~30 MB). Keeping the headway shape (`window.start +
n * headway + offset[stop]`) is ~26,000 offsets (~1 MB). It also
matches how Transjakarta actually runs the service, and it is the
native shape of GTFS `frequencies.txt`, so a future runtime GTFS
provider (ADR-0001) reads the same thing.

## Considered options

- **Runtime GTFS provider** (bundle the 2.5 MB zip, parse per request).
  Faithful to the standard and realtime-ready, but slower per request
  and a bigger runtime surface. Deferred — the build-time import keeps
  the tested static-JSON provider contract.
- **Adopt GTFS as the internal format outright.** Cleanest end state
  (any operator that publishes GTFS plugs in), but a much larger
  refactor and we'd still need a compaction pass to avoid shipping
  10 MB of `stop_times`/`shapes`.
- **Explicit-time expansion.** Dead on arrival: ~30 MB.
- **One route per GTFS `route_id`** (240 routes). Throws away the
  direction/variant detail the card needs (`9 → Pluit` vs
  `9 → Pluit via Tol Kemanggisan`).

## Consequences

- The static-JSON provider's "next arrival" is now headway math
  (`src/server/providers/static-json.ts`), not a binary search over
  explicit times. `timetables` is gone from the format.
- `Route` gains `shortName` and `serviceDays`; `ModeId` grows to eleven
  (seven Transjakarta sub-services + four rail).
- The sub-service *label* comes from the bundle's `name` (the
  operator's own `route_desc`), so renaming one is a data change.
  `SUB_SERVICE_LABELS` is deleted. Adding a *new* sub-service still
  means extending the `ModeId` union, the loader's `BUNDLES` map, the
  provider's mode list, and the importer's `SUB_SERVICE` map — the
  importer only maps `route_desc` values it knows about and skips the
  rest silently.
- The bundle is ~2 MB uncompressed / ~350 KB gzipped (server-only; the
  client bundle is unaffected).
- Weekday/weekend service is now modelled — the "no weekday/weekend
  split" gap in the old ADR-0001 notes is closed.
