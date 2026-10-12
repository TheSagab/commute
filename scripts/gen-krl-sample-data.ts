/**
 * Hand-curated KRL Commuter Line data — sample.
 *
 * Five key Jakarta stations, one representative line, both directions.
 * Headway 8 min, 04:00 → 24:00. Run with
 * `pnpm tsx scripts/gen-krl-sample-data.ts`.
 */

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { buildRailBundle, type StationSpec } from "./lib/rail-bundle"

const __dirname = dirname(fileURLToPath(import.meta.url))

const STATIONS: StationSpec[] = [
  { id: "krl-gmb", nameEn: "Gambir",       nameId: "Gambir",       code: "GMR", lat: -6.1765, lon: 106.8308 },
  { id: "krl-jkt", nameEn: "Jakarta Kota", nameId: "Jakarta Kota", code: "KOT", lat: -6.1372, lon: 106.8147 },
  { id: "krl-mgr", nameEn: "Manggarai",    nameId: "Manggarai",    code: "MGR", lat: -6.2097, lon: 106.8501 },
  { id: "krl-tnh", nameEn: "Tanah Abang",  nameId: "Tanah Abang",  code: "THB", lat: -6.1865, lon: 106.8115 },
  { id: "krl-sud", nameEn: "Sudirman",     nameId: "Sudirman",     code: "SDM", lat: -6.2088, lon: 106.8226 },
]

const bundle = buildRailBundle({
  mode: "krl-commuter",
  nameEn: "KRL Commuter Line",
  nameId: "KRL Commuter Line",
  stations: STATIONS,
  windows: [{ start: "04:00", end: "24:00", headwaySeconds: 8 * 60 }],
  travelSeconds: 120,
  dwellSeconds: 30,
  directions: [
    {
      id: "tanah-abang-manggarai.southbound",
      shortName: "KRL",
      nameEn: "Tanah Abang — Manggarai (Southbound)",
      nameId: "Tanah Abang — Manggarai (Menuju Tanah Abang)",
      headsignEn: "Tanah Abang",
      headsignId: "Tanah Abang",
      color: "#E91E63",
      order: STATIONS,
    },
    {
      id: "tanah-abang-manggarai.northbound",
      shortName: "KRL",
      nameEn: "Tanah Abang — Manggarai (Northbound)",
      nameId: "Tanah Abang — Manggarai (Menuju Manggarai)",
      headsignEn: "Manggarai",
      headsignId: "Manggarai",
      color: "#E91E63",
      order: [...STATIONS].reverse(),
    },
  ],
})

const outPath = resolve(__dirname, "../src/data/krl-commuter.json")
writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n", "utf8")
console.log(`Wrote ${outPath} (sample data) — ${STATIONS.length} stations, ${bundle.routes.length} directions`)
