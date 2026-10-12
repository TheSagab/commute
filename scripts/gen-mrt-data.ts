/**
 * Hand-curated MRT Jakarta data.
 *
 * North-South line, 13 stations, 2 directions. Peak/off-peak headways
 * are expressed as frequency windows. Run with
 * `pnpm tsx scripts/gen-mrt-data.ts`.
 */

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { buildRailBundle, type StationSpec } from "./lib/rail-bundle"

const __dirname = dirname(fileURLToPath(import.meta.url))

const STATIONS: StationSpec[] = [
  { id: "mrt-ldb", nameEn: "Lebak Bulus",     nameId: "Lebak Bulus",     code: "LBB", lat: -6.2885, lon: 106.7745 },
  { id: "mrt-fkb", nameEn: "Fatmawati",       nameId: "Fatmawati",       code: "FMB", lat: -6.2925, lon: 106.7910 },
  { id: "mrt-cpr", nameEn: "Cipete Raya",     nameId: "Cipete Raya",     code: "CPR", lat: -6.2952, lon: 106.7990 },
  { id: "mrt-hjn", nameEn: "Haji Nawi",       nameId: "Haji Nawi",       code: "HJN", lat: -6.2978, lon: 106.8060 },
  { id: "mrt-blk", nameEn: "Blok A",          nameId: "Blok A",          code: "BLA", lat: -6.3005, lon: 106.8130 },
  { id: "mrt-blm", nameEn: "Blok M",          nameId: "Blok M",          code: "BLM", lat: -6.3037, lon: 106.8200 },
  { id: "mrt-asn", nameEn: "ASEAN",           nameId: "ASEAN",           code: "ASN", lat: -6.3065, lon: 106.8270 },
  { id: "mrt-sny", nameEn: "Senayan",         nameId: "Senayan",         code: "SNY", lat: -6.3095, lon: 106.8340 },
  { id: "mrt-ist", nameEn: "Istora",          nameId: "Istora",          code: "IST", lat: -6.3125, lon: 106.8410 },
  { id: "mrt-bhi", nameEn: "Bendungan Hilir", nameId: "Bendungan Hilir", code: "BHI", lat: -6.3155, lon: 106.8480 },
  { id: "mrt-stb", nameEn: "Setiabudi",       nameId: "Setiabudi",       code: "STB", lat: -6.3185, lon: 106.8550 },
  { id: "mrt-duk", nameEn: "Dukuh Atas",      nameId: "Dukuh Atas",      code: "DKA", lat: -6.3215, lon: 106.8620 },
  { id: "mrt-hi",  nameEn: "Bundaran HI",     nameId: "Bundaran HI",     code: "BHI", lat: -6.3245, lon: 106.8690 },
]

const WINDOWS = [
  { start: "05:00", end: "07:00", headwaySeconds: 5 * 60 },
  { start: "07:00", end: "17:00", headwaySeconds: 7 * 60 },
  { start: "17:00", end: "20:00", headwaySeconds: 5 * 60 },
  { start: "20:00", end: "22:00", headwaySeconds: 10 * 60 },
  { start: "22:00", end: "24:30", headwaySeconds: 15 * 60 },
]

const bundle = buildRailBundle({
  mode: "mrt-jakarta",
  nameEn: "MRT Jakarta",
  nameId: "MRT Jakarta",
  stations: STATIONS,
  windows: WINDOWS,
  travelSeconds: 150,
  dwellSeconds: 30,
  directions: [
    {
      id: "ns.northbound",
      shortName: "NS",
      nameEn: "North-South Line (Northbound)",
      nameId: "Lin Utara-Selatan (Menuju Bundaran HI)",
      headsignEn: "Bundaran HI",
      headsignId: "Bundaran HI",
      color: "#E2231A",
      order: STATIONS,
    },
    {
      id: "ns.southbound",
      shortName: "NS",
      nameEn: "North-South Line (Southbound)",
      nameId: "Lin Utara-Selatan (Menuju Lebak Bulus)",
      headsignEn: "Lebak Bulus",
      headsignId: "Lebak Bulus",
      color: "#E2231A",
      order: [...STATIONS].reverse(),
    },
  ],
})

const outPath = resolve(__dirname, "../src/data/mrt-jakarta.json")
writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n", "utf8")
console.log(`Wrote ${outPath} — ${STATIONS.length} stations, ${bundle.routes.length} directions, ${WINDOWS.length} windows`)
