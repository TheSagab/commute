/**
 * Hand-curated KRL Commuter Line data — sample.
 *
 * This is a *sample* dataset with 5 key Jakarta stations and a single
 * representative line direction. The real network has ~80 stations
 * across 6+ lines. The full dataset is built by the CI scraper —
 * see `docs/data-format.md`.
 *
 * Run with `pnpm tsx scripts/gen-krl-sample-data.ts`.
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

const STATIONS: StationSpec[] = [
  { id: "krl-gmb", nameEn: "Gambir",      nameId: "Gambir",      code: "GMR", lat: -6.1765, lon: 106.8308 },
  { id: "krl-jkt", nameEn: "Jakarta Kota", nameId: "Jakarta Kota", code: "KOT", lat: -6.1372, lon: 106.8147 },
  { id: "krl-mgr", nameEn: "Manggarai",   nameId: "Manggarai",   code: "MGR", lat: -6.2097, lon: 106.8501 },
  { id: "krl-tnh", nameEn: "Tanah Abang", nameId: "Tanah Abang", code: "THB", lat: -6.1865, lon: 106.8115 },
  { id: "krl-sud", nameEn: "Sudirman",    nameId: "Sudirman",    code: "SDM", lat: -6.2088, lon: 106.8226 },
]

// Sample line: Tanah Abang ↔ Manggarai loop direction, 8-min headway
const LINE_ID = "tanah-abang-manggarai"
const START = "04:00"
const END = "24:00"
const HEADWAY_MIN = 8

function parseClock(c: string): number { return parseInt(c.slice(0, 2)) * 60 + parseInt(c.slice(3, 5)) }
function formatClock(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

function main() {
  const timetables: Record<string, Record<string, string[]>> = {
    [`${LINE_ID}.southbound`]: {},
    [`${LINE_ID}.northbound`]: {},
  }
  for (const s of STATIONS) {
    timetables[`${LINE_ID}.southbound`][s.id] = []
    timetables[`${LINE_ID}.northbound`][s.id] = []
  }

  for (let t = parseClock(START); t < parseClock(END); t += HEADWAY_MIN) {
    for (let i = 0; i < STATIONS.length; i++) {
      const south = formatClock(t + i * 2)
      const north = formatClock(t + i * 2)
      timetables[`${LINE_ID}.southbound`][STATIONS[i].id].push(south)
      timetables[`${LINE_ID}.northbound`][STATIONS[STATIONS.length - 1 - i].id].push(north)
    }
  }

  const bundle = {
    mode: "krl-commuter",
    name: { en: "KRL Commuter Line", id: "KRL Commuter Line" },
    serviceHours: { start: START, end: END },
    stops: STATIONS.map((s) => ({
      id: s.id, name: { en: s.nameEn, id: s.nameId }, code: s.code,
      lat: s.lat, lon: s.lon,
    })),
    routes: [
      {
        id: `${LINE_ID}.southbound`,
        name: { en: "Tanah Abang — Manggarai (Southbound)", id: "Tanah Abang — Manggarai (Menuju Tanah Abang)" },
        headsign: { en: "Tanah Abang", id: "Tanah Abang" },
        color: "#E91E63",
      },
      {
        id: `${LINE_ID}.northbound`,
        name: { en: "Tanah Abang — Manggarai (Northbound)", id: "Tanah Abang — Manggarai (Menuju Manggarai)" },
        headsign: { en: "Manggarai", id: "Manggarai" },
        color: "#E91E63",
      },
    ],
    timetables,
  }

  const outPath = resolve(__dirname, "../src/data/krl-commuter.json")
  writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n", "utf8")
  console.log(`Wrote ${outPath} (sample data — full network is built by CI scraper)`)
  console.log(`  ${STATIONS.length} stations, 1 line, 2 directions`)
}

main()
