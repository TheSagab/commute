/**
 * Hand-curated MRT Jakarta data spec.
 *
 * One-off script that expands a compact spec (stations + headways) into
 * the full `ModeBundle` JSON. Run it with `tsx scripts/gen-mrt-data.ts`
 * (or `node --import tsx scripts/gen-mrt-data.ts`) and write the result
 * to `src/data/mrt-jakarta.json`.
 *
 * The data here is hand-curated from publicly published MRT Jakarta
 * timetables. Coordinates are approximate (WGS84, ~10 m). Headways are
 * simplified: 5 min peak, 7 min mid-day, 10 min evening, 15 min late
 * night. The real timetable has more variation; this is enough to
 * validate the app end-to-end.
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
  { id: "mrt-ldb", nameEn: "Lebak Bulus",    nameId: "Lebak Bulus",    code: "LBB", lat: -6.2885, lon: 106.7745 },
  { id: "mrt-fkb", nameEn: "Fatmawati",      nameId: "Fatmawati",      code: "FMB", lat: -6.2925, lon: 106.7910 },
  { id: "mrt-cpr", nameEn: "Cipete Raya",    nameId: "Cipete Raya",    code: "CPR", lat: -6.2952, lon: 106.7990 },
  { id: "mrt-hjn", nameEn: "Haji Nawi",      nameId: "Haji Nawi",      code: "HJN", lat: -6.2978, lon: 106.8060 },
  { id: "mrt-blk", nameEn: "Blok A",         nameId: "Blok A",         code: "BLA", lat: -6.3005, lon: 106.8130 },
  { id: "mrt-blm", nameEn: "Blok M",         nameId: "Blok M",         code: "BLM", lat: -6.3037, lon: 106.8200 },
  { id: "mrt-asn", nameEn: "ASEAN",          nameId: "ASEAN",          code: "ASN", lat: -6.3065, lon: 106.8270 },
  { id: "mrt-sny", nameEn: "Senayan",        nameId: "Senayan",        code: "SNY", lat: -6.3095, lon: 106.8340 },
  { id: "mrt-ist", nameEn: "Istora",         nameId: "Istora",         code: "IST", lat: -6.3125, lon: 106.8410 },
  { id: "mrt-bhi", nameEn: "Bendungan Hilir", nameId: "Bendungan Hilir", code: "BHI", lat: -6.3155, lon: 106.8480 },
  { id: "mrt-stb", nameEn: "Setiabudi",      nameId: "Setiabudi",      code: "STB", lat: -6.3185, lon: 106.8550 },
  { id: "mrt-duk", nameEn: "Dukuh Atas",     nameId: "Dukuh Atas",     code: "DKA", lat: -6.3215, lon: 106.8620 },
  { id: "mrt-bhi2", nameEn: "Bundaran HI",    nameId: "Bundaran HI",    code: "BHI", lat: -6.3245, lon: 106.8690 },
]

// Headways in minutes, per (start, end) window in "HH:MM" 24h. End is
// exclusive. The windows are mode-level (whole line, both directions).
type HeadwayWindow = { start: string; end: string; headwayMin: number }

const HEADWAYS: HeadwayWindow[] = [
  { start: "05:00", end: "07:00", headwayMin: 5 },  // morning peak
  { start: "07:00", end: "17:00", headwayMin: 7 },  // mid-day
  { start: "17:00", end: "20:00", headwayMin: 5 },  // evening peak
  { start: "20:00", end: "22:00", headwayMin: 10 }, // late evening
  { start: "22:00", end: "24:30", headwayMin: 15 }, // late night (wraps past midnight)
]

function parseClock(clock: string): number {
  const [h, m] = clock.split(":").map(Number)
  return h * 60 + m
}

function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function generateTimetable(direction: "southbound" | "northbound"): Map<string, string[]> {
  // The full North-South line is 13 stations. Travel time ~30 min.
  // Southbound: stations 13 → 1 (Bundaran HI → Lebak Bulus)
  // Northbound: stations 1 → 13 (Lebak Bulus → Bundaran HI)
  const startStationIdx = direction === "southbound" ? 12 : 0
  const step = direction === "southbound" ? -1 : 1

  const firstTimes: number[] = []
  for (const w of HEADWAYS) {
    const start = parseClock(w.start)
    const end = parseClock(w.end)
    for (let t = start; t < end; t += w.headwayMin) {
      firstTimes.push(t)
    }
  }

  const timetable = new Map<string, string[]>()
  for (let i = 0; i < STATIONS.length; i++) {
    timetable.set(STATIONS[i].id, [])
  }

  // Each "trip" is a sequence of arrivals along the line.
  const TRIP_DWELL_MIN = 1
  const TRIP_TRAVEL_MIN = 2.5 // between consecutive stations

  for (const firstDeparture of firstTimes) {
    const stationOrder = (() => {
      const order: number[] = []
      for (let i = 0; i < STATIONS.length; i++) {
        order.push(startStationIdx + step * i)
      }
      return order
    })()

    for (let i = 0; i < stationOrder.length; i++) {
      const stationIdx = stationOrder[i]
      const arrival = firstDeparture + i * (TRIP_TRAVEL_MIN + TRIP_DWELL_MIN)
      timetable.get(STATIONS[stationIdx].id)!.push(formatClock(arrival))
    }
  }

  return timetable
}

function main() {
  const sbTimetable = generateTimetable("southbound")
  const nbTimetable = generateTimetable("northbound")

  const timetablesJson: Record<string, Record<string, string[]>> = {
    "ns.southbound": {},
    "ns.northbound": {},
  }
  for (const [stopId, times] of sbTimetable) {
    timetablesJson["ns.southbound"][stopId] = times
  }
  for (const [stopId, times] of nbTimetable) {
    timetablesJson["ns.northbound"][stopId] = times
  }

  const bundle = {
    mode: "mrt-jakarta",
    name: { en: "MRT Jakarta", id: "MRT Jakarta" },
    serviceHours: { start: "05:00", end: "24:30" },
    stops: STATIONS.map((s) => ({
      id: s.id,
      name: { en: s.nameEn, id: s.nameId },
      code: s.code,
      lat: s.lat,
      lon: s.lon,
    })),
    routes: [
      {
        id: "ns.southbound",
        name: {
          en: "North-South Line (Southbound)",
          id: "Lin Utara-Selatan (Menuju Lebak Bulus)",
        },
        headsign: { en: "Lebak Bulus", id: "Lebak Bulus" },
        color: "#E2231A",
      },
      {
        id: "ns.northbound",
        name: {
          en: "North-South Line (Northbound)",
          id: "Lin Utara-Selatan (Menuju Bundaran HI)",
        },
        headsign: { en: "Bundaran HI", id: "Bundaran HI" },
        color: "#E2231A",
      },
    ],
    timetables: timetablesJson,
  }

  const outPath = resolve(__dirname, "../src/data/mrt-jakarta.json")
  writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n", "utf8")
  console.log(`Wrote ${outPath}`)
  console.log(`  ${STATIONS.length} stations`)
  console.log(`  ${timetablesJson["ns.southbound"][STATIONS[0].id].length} southbound departures from ${STATIONS[0].nameEn}`)
  console.log(`  ${timetablesJson["ns.northbound"][STATIONS[0].id].length} northbound departures from ${STATIONS[0].nameEn}`)
}

main()
