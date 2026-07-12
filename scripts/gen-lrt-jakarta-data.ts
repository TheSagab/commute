/**
 * Hand-curated LRT Jakarta data spec.
 *
 * Pegangsaan Dua ↔ Velodrome, 6 stations, 1 line, 2 directions.
 * Service hours 05:30 → 23:00 (no wrap). Headway 12 min.
 *
 * Run with `pnpm tsx scripts/gen-lrt-jakarta-data.ts`.
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
  { id: "lrtj-psd", nameEn: "Pegangsaan Dua",  nameId: "Pegangsaan Dua",  code: "PSD", lat: -6.1465, lon: 106.8868 },
  { id: "lrtj-blu", nameEn: "Boulevard Utara",  nameId: "Boulevard Utara",  code: "BLU", lat: -6.1530, lon: 106.8845 },
  { id: "lrtj-bls", nameEn: "Boulevard Selatan", nameId: "Boulevard Selatan", code: "BLS", lat: -6.1600, lon: 106.8820 },
  { id: "lrtj-plm", nameEn: "Pulomas",          nameId: "Pulomas",         code: "PLM", lat: -6.1680, lon: 106.8795 },
  { id: "lrtj-eqs", nameEn: "Equestrian",       nameId: "Equestrian",      code: "EQS", lat: -6.1755, lon: 106.8770 },
  { id: "lrtj-vld", nameEn: "Velodrome",        nameId: "Velodrome",       code: "VLD", lat: -6.1830, lon: 106.8745 },
]

const START = "05:30"
const END = "23:00" // no wrap
const HEADWAY_MIN = 12
const TRIP_TRAVEL_MIN = 2.5
const TRIP_DWELL_MIN = 0.5

function parseClock(clock: string): number {
  const [h, m] = clock.split(":").map(Number)
  return h * 60 + m
}
function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function generateTimetable(direction: "eastbound" | "westbound"): Map<string, string[]> {
  const startStationIdx = direction === "eastbound" ? 0 : STATIONS.length - 1
  const step = direction === "eastbound" ? 1 : -1

  const firstDepartures: number[] = []
  for (let t = parseClock(START); t < parseClock(END); t += HEADWAY_MIN) {
    firstDepartures.push(t)
  }

  const timetable = new Map<string, string[]>()
  for (const s of STATIONS) timetable.set(s.id, [])

  for (const first of firstDepartures) {
    for (let i = 0; i < STATIONS.length; i++) {
      const stationIdx = startStationIdx + step * i
      const arrival = first + i * (TRIP_TRAVEL_MIN + TRIP_DWELL_MIN)
      timetable.get(STATIONS[stationIdx].id)!.push(formatClock(arrival))
    }
  }

  return timetable
}

function main() {
  const eb = generateTimetable("eastbound")
  const wb = generateTimetable("westbound")

  const timetables: Record<string, Record<string, string[]>> = {
    "main.eastbound": {},
    "main.westbound": {},
  }
  for (const [k, v] of eb) timetables["main.eastbound"][k] = v
  for (const [k, v] of wb) timetables["main.westbound"][k] = v

  const bundle = {
    mode: "lrt-jakarta",
    name: { en: "LRT Jakarta", id: "LRT Jakarta" },
    serviceHours: { start: START, end: END },
    stops: STATIONS.map((s) => ({
      id: s.id,
      name: { en: s.nameEn, id: s.nameId },
      code: s.code,
      lat: s.lat,
      lon: s.lon,
    })),
    routes: [
      {
        id: "main.eastbound",
        name: { en: "LRT Jakarta (Eastbound)", id: "LRT Jakarta (Menuju Velodrome)" },
        headsign: { en: "Velodrome", id: "Velodrome" },
        color: "#1B5E9E",
      },
      {
        id: "main.westbound",
        name: { en: "LRT Jakarta (Westbound)", id: "LRT Jakarta (Menuju Pegangsaan Dua)" },
        headsign: { en: "Pegangsaan Dua", id: "Pegangsaan Dua" },
        color: "#1B5E9E",
      },
    ],
    timetables,
  }

  const outPath = resolve(__dirname, "../src/data/lrt-jakarta.json")
  writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n", "utf8")
  console.log(`Wrote ${outPath}`)
  console.log(`  ${STATIONS.length} stations`)
  console.log(`  ${timetables["main.eastbound"][STATIONS[0].id].length} eastbound departures from ${STATIONS[0].nameEn}`)
}

main()
