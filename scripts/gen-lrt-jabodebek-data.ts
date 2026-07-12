/**
 * Hand-curated LRT Jabodebek data spec.
 *
 * Two lines, each with 2 directions. Service hours 05:00 → 22:30 (no wrap).
 *
 * Run with `pnpm tsx scripts/gen-lrt-jabodebek-data.ts`.
 */

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

type StationSpec = {
  id: string
  nameEn: string
  nameId: string
  code: string
  lat: number
  lon: number
}

// Cibubur — Dukuh Atas line (the "main" one)
const LINE_CIBUBUR: StationSpec[] = [
  { id: "lrtjb-cbr", nameEn: "Cibubur",     nameId: "Cibubur",     code: "CBR", lat: -6.3635, lon: 106.8860 },
  { id: "lrtjb-hlt", nameEn: "Harjamukti",  nameId: "Harjamukti",  code: "HLT", lat: -6.3700, lon: 106.8910 },
  { id: "lrtjb-cbt", nameEn: "Ciracas",     nameId: "Ciracas",     code: "CBT", lat: -6.3230, lon: 106.8720 },
  { id: "lrtjb-kmj", nameEn: "Kampung Rambutan", nameId: "Kampung Rambutan", code: "KMJ", lat: -6.3070, lon: 106.8615 },
  { id: "lrtjb-tps", nameEn: "Tanjung Barat", nameId: "Tanjung Barat", code: "TPS", lat: -6.2990, lon: 106.8470 },
  { id: "lrtjb-ptb", nameEn: "Pasar Minggu", nameId: "Pasar Minggu", code: "PTB", lat: -6.2860, lon: 106.8430 },
  { id: "lrtjb-pti", nameEn: "Pancoran",     nameId: "Pancoran",    code: "PTI", lat: -6.2580, lon: 106.8400 },
  { id: "lrtjb-ckr", nameEn: "Cikoko",       nameId: "Cikoko",      code: "CKR", lat: -6.2440, lon: 106.8475 },
  { id: "lrtjb-pdg", nameEn: "Pedes",        nameId: "Pedes",       code: "PDG", lat: -6.2370, lon: 106.8540 },
  { id: "lrtjb-cwt", nameEn: "Cawang",       nameId: "Cawang",      code: "CWT", lat: -6.2460, lon: 106.8580 },
  { id: "lrtjb-hlw", nameEn: "Halim",        nameId: "Halim",       code: "HLW", lat: -6.2650, lon: 106.8910 },
  { id: "lrtjb-krg", nameEn: "Karees",       nameId: "Karees",      code: "KRG", lat: -6.2510, lon: 106.8820 },
  { id: "lrtjb-psg", nameEn: "Pasar Minggu Baru", nameId: "Pasar Minggu Baru", code: "PSG", lat: -6.2810, lon: 106.8550 },
  { id: "lrtjb-duc", nameEn: "Dukuh Atas",   nameId: "Dukuh Atas",  code: "DUC", lat: -6.2210, lon: 106.8620 },
]

const HEADWAY_MIN = 10
const TRIP_TRAVEL_MIN = 2
const TRIP_DWELL_MIN = 0.5
const START = "05:00"
const END = "22:30"

function parseClock(clock: string): number { return parseInt(clock.slice(0, 2)) * 60 + parseInt(clock.slice(3, 5)) }
function formatClock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

function main() {
  const timetableEast: Record<string, string[]> = {}
  const timetableWest: Record<string, string[]> = {}
  for (const s of LINE_CIBUBUR) { timetableEast[s.id] = []; timetableWest[s.id] = [] }
  for (let first = parseClock(START); first < parseClock(END); first += HEADWAY_MIN) {
    for (let i = 0; i < LINE_CIBUBUR.length; i++) {
      const arrival = first + i * (TRIP_TRAVEL_MIN + TRIP_DWELL_MIN)
      timetableEast[LINE_CIBUBUR[i].id].push(formatClock(arrival))
      timetableWest[LINE_CIBUBUR[LINE_CIBUBUR.length - 1 - i].id].push(formatClock(arrival))
    }
  }
  for (const id of Object.keys(timetableEast)) timetableEast[id].sort()
  for (const id of Object.keys(timetableWest)) timetableWest[id].sort()

  const bundle = {
    mode: "lrt-jabodebek",
    name: { en: "LRT Jabodebek", id: "LRT Jabodebek" },
    serviceHours: { start: START, end: END },
    stops: LINE_CIBUBUR.map((s) => ({
      id: s.id, name: { en: s.nameEn, id: s.nameId }, code: s.code,
      lat: s.lat, lon: s.lon,
    })),
    routes: [
      {
        id: "cibubur-dukuh-atas.eastbound",
        name: { en: "Cibubur Line (Eastbound)", id: "Lin Cibubur (Menuju Dukuh Atas)" },
        headsign: { en: "Dukuh Atas", id: "Dukuh Atas" },
        color: "#7B1FA2",
      },
      {
        id: "cibubur-dukuh-atas.westbound",
        name: { en: "Cibubur Line (Westbound)", id: "Lin Cibubur (Menuju Cibubur)" },
        headsign: { en: "Cibubur", id: "Cibubur" },
        color: "#7B1FA2",
      },
    ],
    timetables: {
      "cibubur-dukuh-atas.eastbound": timetableEast,
      "cibubur-dukuh-atas.westbound": timetableWest,
    },
  }

  const outPath = resolve(__dirname, "../src/data/lrt-jabodebek.json")
  writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n", "utf8")
  console.log(`Wrote ${outPath}`)
  console.log(`  ${LINE_CIBUBUR.length} stations`)
  console.log(`  ${timetableEast[LINE_CIBUBUR[0].id].length} eastbound departures from Cibubur`)
}

main()
