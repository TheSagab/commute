/**
 * Hand-curated LRT Jakarta data.
 *
 * Pegangsaan Dua ↔ Velodrome, 6 stations, 1 line, 2 directions.
 * Headway 12 min, 05:30 → 23:00. Run with
 * `pnpm tsx scripts/gen-lrt-jakarta-data.ts`.
 */

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { buildRailBundle, type StationSpec } from "./lib/rail-bundle"

const __dirname = dirname(fileURLToPath(import.meta.url))

const STATIONS: StationSpec[] = [
  { id: "lrtj-psd", nameEn: "Pegangsaan Dua",    nameId: "Pegangsaan Dua",    code: "PSD", lat: -6.1465, lon: 106.8868 },
  { id: "lrtj-blu", nameEn: "Boulevard Utara",   nameId: "Boulevard Utara",   code: "BLU", lat: -6.1530, lon: 106.8845 },
  { id: "lrtj-bls", nameEn: "Boulevard Selatan", nameId: "Boulevard Selatan", code: "BLS", lat: -6.1600, lon: 106.8820 },
  { id: "lrtj-plm", nameEn: "Pulomas",           nameId: "Pulomas",           code: "PLM", lat: -6.1680, lon: 106.8795 },
  { id: "lrtj-eqs", nameEn: "Equestrian",        nameId: "Equestrian",        code: "EQS", lat: -6.1755, lon: 106.8770 },
  { id: "lrtj-vld", nameEn: "Velodrome",         nameId: "Velodrome",         code: "VLD", lat: -6.1830, lon: 106.8745 },
]

const bundle = buildRailBundle({
  mode: "lrt-jakarta",
  nameEn: "LRT Jakarta",
  nameId: "LRT Jakarta",
  stations: STATIONS,
  windows: [{ start: "05:30", end: "23:00", headwaySeconds: 12 * 60 }],
  travelSeconds: 150,
  dwellSeconds: 30,
  directions: [
    {
      id: "main.eastbound",
      shortName: "LRTJ",
      nameEn: "LRT Jakarta (Eastbound)",
      nameId: "LRT Jakarta (Menuju Velodrome)",
      headsignEn: "Velodrome",
      headsignId: "Velodrome",
      color: "#1B5E9E",
      order: STATIONS,
    },
    {
      id: "main.westbound",
      shortName: "LRTJ",
      nameEn: "LRT Jakarta (Westbound)",
      nameId: "LRT Jakarta (Menuju Pegangsaan Dua)",
      headsignEn: "Pegangsaan Dua",
      headsignId: "Pegangsaan Dua",
      color: "#1B5E9E",
      order: [...STATIONS].reverse(),
    },
  ],
})

const outPath = resolve(__dirname, "../src/data/lrt-jakarta.json")
writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n", "utf8")
console.log(`Wrote ${outPath} — ${STATIONS.length} stations, ${bundle.routes.length} directions`)
