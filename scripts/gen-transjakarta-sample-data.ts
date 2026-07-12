/**
 * Hand-curated Transjakarta data — sample.
 *
 * Sample: Corridor 1 (Blok M — Kota), 11 shelters, single direction
 * pattern in the data. The real network has 14+ corridors and ~250
 * shelters; the full dataset is built by the CI scraper — see
 * `docs/data-format.md`.
 *
 * Run with `pnpm tsx scripts/gen-transjakarta-sample-data.ts`.
 */

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

type StopSpec = {
  id: string
  nameEn: string
  nameId: string
  code: string
  lat: number
  lon: number
}

const STOPS: StopSpec[] = [
  { id: "tj-blm", nameEn: "Blok M",           nameId: "Blok M",           code: "BLM", lat: -6.3037, lon: 106.8200 },
  { id: "tj-mpr", nameEn: "Mampang Prapatan", nameId: "Mampang Prapatan", code: "MPR", lat: -6.2920, lon: 106.8260 },
  { id: "tj-krd", nameEn: "Karet",            nameId: "Karet",            code: "KRT", lat: -6.2810, lon: 106.8310 },
  { id: "tj-sdb", nameEn: "Sudirman",         nameId: "Sudirman",         code: "SDM", lat: -6.2088, lon: 106.8226 },
  { id: "tj-bnd", nameEn: "Bendungan Hilir",  nameId: "Bendungan Hilir",  code: "BNH", lat: -6.3155, lon: 106.8480 },
  { id: "tj-ist", nameEn: "Istora",           nameId: "Istora",           code: "IST", lat: -6.3125, lon: 106.8410 },
  { id: "tj-sny", nameEn: "Senayan",          nameId: "Senayan",          code: "SNY", lat: -6.3095, lon: 106.8340 },
  { id: "tj-asn", nameEn: "ASEAN",            nameId: "ASEAN",            code: "ASN", lat: -6.3065, lon: 106.8270 },
  { id: "tj-pdk", nameEn: "Polda Metro",      nameId: "Polda Metro",      code: "PDM", lat: -6.2720, lon: 106.8260 },
  { id: "tj-hrm", nameEn: "Harmoni",          nameId: "Harmoni",          code: "HRM", lat: -6.1780, lon: 106.8230 },
  { id: "tj-kta", nameEn: "Kota",             nameId: "Kota",             code: "KTA", lat: -6.1372, lon: 106.8147 },
]

const LINE_ID = "corridor-1"
const START = "05:00"
const END = "22:00"
const HEADWAY_MIN = 8

function parseClock(c: string): number { return parseInt(c.slice(0, 2)) * 60 + parseInt(c.slice(3, 5)) }
function formatClock(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

function main() {
  const timetables: Record<string, Record<string, string[]>> = {
    [`${LINE_ID}.blk-m-to-kota`]: {},
    [`${LINE_ID}.kota-to-blk-m`]: {},
  }
  for (const s of STOPS) {
    timetables[`${LINE_ID}.blk-m-to-kota`][s.id] = []
    timetables[`${LINE_ID}.kota-to-blk-m`][s.id] = []
  }

  for (let t = parseClock(START); t < parseClock(END); t += HEADWAY_MIN) {
    for (let i = 0; i < STOPS.length; i++) {
      const minutes = t + i * 3
      timetables[`${LINE_ID}.blk-m-to-kota`][STOPS[i].id].push(formatClock(minutes))
      timetables[`${LINE_ID}.kota-to-blk-m`][STOPS[STOPS.length - 1 - i].id].push(formatClock(minutes))
    }
  }

  const bundle = {
    mode: "transjakarta",
    name: { en: "Transjakarta", id: "Transjakarta" },
    serviceHours: { start: START, end: END },
    stops: STOPS.map((s) => ({
      id: s.id, name: { en: s.nameEn, id: s.nameId }, code: s.code,
      lat: s.lat, lon: s.lon,
    })),
    routes: [
      {
        id: `${LINE_ID}.blk-m-to-kota`,
        name: { en: "Corridor 1 (Blok M → Kota)", id: "Koridor 1 (Blok M → Kota)" },
        headsign: { en: "Kota", id: "Kota" },
        color: "#E53935",
      },
      {
        id: `${LINE_ID}.kota-to-blk-m`,
        name: { en: "Corridor 1 (Kota → Blok M)", id: "Koridor 1 (Kota → Blok M)" },
        headsign: { en: "Blok M", id: "Blok M" },
        color: "#E53935",
      },
    ],
    timetables,
  }

  const outPath = resolve(__dirname, "../src/data/transjakarta.json")
  writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n", "utf8")
  console.log(`Wrote ${outPath} (sample data — full network is built by CI scraper)`)
  console.log(`  ${STOPS.length} stops, 1 corridor, 2 directions`)
}

main()
