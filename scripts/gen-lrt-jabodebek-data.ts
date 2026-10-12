/**
 * Hand-curated LRT Jabodebek data.
 *
 * Cibubur ↔ Dukuh Atas, 14 stations, 1 line, 2 directions. Headway
 * 10 min, 05:00 → 22:30. Run with
 * `pnpm tsx scripts/gen-lrt-jabodebek-data.ts`.
 */

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { buildRailBundle, type StationSpec } from "./lib/rail-bundle"

const __dirname = dirname(fileURLToPath(import.meta.url))

const STATIONS: StationSpec[] = [
  { id: "lrtjb-cbr", nameEn: "Cibubur",           nameId: "Cibubur",           code: "CBR", lat: -6.3635, lon: 106.8860 },
  { id: "lrtjb-hlt", nameEn: "Harjamukti",        nameId: "Harjamukti",        code: "HLT", lat: -6.3700, lon: 106.8910 },
  { id: "lrtjb-cbt", nameEn: "Ciracas",           nameId: "Ciracas",           code: "CBT", lat: -6.3230, lon: 106.8720 },
  { id: "lrtjb-kmj", nameEn: "Kampung Rambutan",  nameId: "Kampung Rambutan",  code: "KMJ", lat: -6.3070, lon: 106.8615 },
  { id: "lrtjb-tps", nameEn: "Tanjung Barat",     nameId: "Tanjung Barat",     code: "TPS", lat: -6.2990, lon: 106.8470 },
  { id: "lrtjb-ptb", nameEn: "Pasar Minggu",      nameId: "Pasar Minggu",      code: "PTB", lat: -6.2860, lon: 106.8430 },
  { id: "lrtjb-pti", nameEn: "Pancoran",          nameId: "Pancoran",          code: "PTI", lat: -6.2580, lon: 106.8400 },
  { id: "lrtjb-ckr", nameEn: "Cikoko",            nameId: "Cikoko",            code: "CKR", lat: -6.2440, lon: 106.8475 },
  { id: "lrtjb-pdg", nameEn: "Pedes",             nameId: "Pedes",             code: "PDG", lat: -6.2370, lon: 106.8540 },
  { id: "lrtjb-cwt", nameEn: "Cawang",            nameId: "Cawang",            code: "CWT", lat: -6.2460, lon: 106.8580 },
  { id: "lrtjb-hlw", nameEn: "Halim",             nameId: "Halim",             code: "HLW", lat: -6.2650, lon: 106.8910 },
  { id: "lrtjb-krg", nameEn: "Karees",            nameId: "Karees",            code: "KRG", lat: -6.2510, lon: 106.8820 },
  { id: "lrtjb-psg", nameEn: "Pasar Minggu Baru", nameId: "Pasar Minggu Baru", code: "PSG", lat: -6.2810, lon: 106.8550 },
  { id: "lrtjb-duc", nameEn: "Dukuh Atas",        nameId: "Dukuh Atas",        code: "DUC", lat: -6.2210, lon: 106.8620 },
]

const bundle = buildRailBundle({
  mode: "lrt-jabodebek",
  nameEn: "LRT Jabodebek",
  nameId: "LRT Jabodebek",
  stations: STATIONS,
  windows: [{ start: "05:00", end: "22:30", headwaySeconds: 10 * 60 }],
  travelSeconds: 120,
  dwellSeconds: 30,
  directions: [
    {
      id: "cibubur-dukuh-atas.eastbound",
      shortName: "LRTJB",
      nameEn: "Cibubur Line (Eastbound)",
      nameId: "Lin Cibubur (Menuju Dukuh Atas)",
      headsignEn: "Dukuh Atas",
      headsignId: "Dukuh Atas",
      color: "#7B1FA2",
      order: STATIONS,
    },
    {
      id: "cibubur-dukuh-atas.westbound",
      shortName: "LRTJB",
      nameEn: "Cibubur Line (Westbound)",
      nameId: "Lin Cibubur (Menuju Cibubur)",
      headsignEn: "Cibubur",
      headsignId: "Cibubur",
      color: "#7B1FA2",
      order: [...STATIONS].reverse(),
    },
  ],
})

const outPath = resolve(__dirname, "../src/data/lrt-jabodebek.json")
writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n", "utf8")
console.log(`Wrote ${outPath} — ${STATIONS.length} stations, ${bundle.routes.length} directions`)
