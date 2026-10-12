/**
 * Import the official Transjakarta GTFS feed and write the static-JSON
 * bundles the app reads at runtime.
 *
 * Source: https://gtfs.transjakarta.co.id/files/file_gtfs.zip
 *
 * The feed has 240 `routes`, 700 `trips` (service patterns), 7,819
 * per-platform stops, `stop_times`, `frequencies`, and a day-of-week
 * `calendar`. We map:
 *
 *   - one GTFS `route` + `trips`  → one sub-service bundle per
 *     `route_desc` (BRT, Angkutan Umum Integrasi, Mikrotrans, …)
 *   - one GTFS `trip`             → one `Route` (the user-visible
 *     "which bus is this": short name + headsign)
 *   - `frequencies.txt`           → the `windows` part of `Schedule`
 *   - `stop_times.txt`            → the `stopOffsets` part of `Schedule`
 *   - `calendar.txt`              → `Route.serviceDays`
 *   - `stops.txt`                 → clustered boarding locations
 *
 * Stops are clustered first by `parent_station`, then by base name
 * (trailing platform number stripped) within 120 m. A route's stops
 * are the cluster ids, with consecutive duplicates collapsed.
 *
 * Run with `pnpm tsx scripts/import-gtfs-transjakarta.ts`. Called by
 * `scripts/scrape-all.ts`; the converted JSON is committed (the app
 * never downloads GTFS at runtime).
 */

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join, resolve } from "node:path"
import { tmpdir } from "node:os"
import { readRecords } from "./lib/gtfs-csv"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, "../src/data")

const GTFS_URL = "https://gtfs.transjakarta.co.id/files/file_gtfs.zip"
const CACHE_DIR = join(tmpdir(), "commute-gtfs-cache")
const CLUSTER_RADIUS_M = 120

type Stop = {
  id: string
  name: string
  lat: number
  lon: number
  type: number
  parent: string
}

type Trip = {
  id: string
  routeId: string
  serviceId: string
  headsign: string
  direction: number
}

type GtfsRoute = {
  id: string
  shortName: string
  longName: string
  desc: string
  color: string
}

type StopTime = { tripId: string; seq: number; stopId: string; arrival: string }

type Frequency = { tripId: string; start: string; end: string; headwaySeconds: number }

// --- CSV ------------------------------------------------------------------

function readCsv(path: string): Record<string, string>[] {
  return readRecords(readFileSync(path, "utf8"))
}

// --- clock ----------------------------------------------------------------

function clockToSeconds(clock: string): number {
  const [h, m, s = "0"] = clock.split(":")
  return +h * 3600 + +m * 60 + +s
}

// --- geo ------------------------------------------------------------------

function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6_371_000
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// --- download + unzip -----------------------------------------------------

async function fetchFeed(): Promise<string> {
  mkdirSync(CACHE_DIR, { recursive: true })
  const zipPath = join(CACHE_DIR, "file_gtfs.zip")
  if (!existsSync(zipPath)) {
    console.log(`[gtfs] downloading ${GTFS_URL}`)
    const res = await fetch(GTFS_URL)
    if (!res.ok) throw new Error(`GTFS download failed: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    writeFileSync(zipPath, buf)
  } else {
    console.log(`[gtfs] using cached ${zipPath}`)
  }
  return zipPath
}

function unzipTo(zipPath: string): string {
  const out = join(CACHE_DIR, "extracted")
  mkdirSync(out, { recursive: true })
  execFileSync("unzip", ["-o", "-q", zipPath, "-d", out])
  return out
}

// --- clustering -----------------------------------------------------------

function baseName(name: string): string {
  return name.replace(/\s+\d+$/, "").trim()
}

class UnionFind {
  private parent = new Map<string, string>()
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x)
    let root = x
    while (this.parent.get(root) !== root) root = this.parent.get(root)!
    // path compression
    let cur = x
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!
      this.parent.set(cur, root)
      cur = next
    }
    return root
  }
  union(a: string, b: string) {
    const ra = this.find(a), rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

// --- main -----------------------------------------------------------------

const SUB_SERVICE: Record<string, { mode: string; slug: string }> = {
  BRT: { mode: "transjakarta-brt", slug: "brt" },
  "Angkutan Umum Integrasi": { mode: "transjakarta-angkutan-umum-integrasi", slug: "angkutan-umum-integrasi" },
  Mikrotrans: { mode: "transjakarta-mikrotrans", slug: "mikrotrans" },
  Transjabodetabek: { mode: "transjakarta-transjabodetabek", slug: "transjabodetabek" },
  Rusun: { mode: "transjakarta-rusun", slug: "rusun" },
  Royaltrans: { mode: "transjakarta-royaltrans", slug: "royaltrans" },
  "Bus Wisata": { mode: "transjakarta-bus-wisata", slug: "bus-wisata" },
}

const WEEKDAY_COL = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

async function main() {
  const zipPath = await fetchFeed()
  const dir = unzipTo(zipPath)

  // --- parse --------------------------------------------------------------
  const rawStops = readCsv(join(dir, "stops.txt"))
  const rawRoutes = readCsv(join(dir, "routes.txt"))
  const rawTrips = readCsv(join(dir, "trips.txt"))
  const rawStopTimes = readCsv(join(dir, "stop_times.txt"))
  const rawFreqs = readCsv(join(dir, "frequencies.txt"))
  const rawCalendar = readCsv(join(dir, "calendar.txt"))

  const allStops: Stop[] = rawStops.map((r) => ({
    id: r.stop_id,
    name: r.stop_name,
    lat: +r.stop_lat,
    lon: +r.stop_lon,
    type: +r.location_type || 0,
    parent: r.parent_station || "",
  }))
  const stopById = new Map(allStops.map((s) => [s.id, s]))
  const platforms = allStops.filter((s) => s.type === 0)

  const routes = new Map<string, GtfsRoute>(rawRoutes.map((r) => [r.route_id, {
    id: r.route_id,
    shortName: r.route_short_name,
    longName: r.route_long_name,
    desc: r.route_desc,
    color: r.route_color ? `#${r.route_color}` : "",
  }]))

  const trips: Trip[] = rawTrips.map((r) => ({
    id: r.trip_id,
    routeId: r.route_id,
    serviceId: r.service_id,
    headsign: r.trip_headsign,
    direction: +r.direction_id || 0,
  }))
  // stop_times grouped by trip, ordered by stop_sequence
  const stopTimesByTrip = new Map<string, StopTime[]>()
  for (const r of rawStopTimes) {
    const t = r.trip_id
    if (!stopTimesByTrip.has(t)) stopTimesByTrip.set(t, [])
    stopTimesByTrip.get(t)!.push({ tripId: t, seq: +r.stop_sequence, stopId: r.stop_id, arrival: r.arrival_time })
  }
  for (const list of stopTimesByTrip.values()) list.sort((a, b) => a.seq - b.seq)

  // frequencies grouped by trip
  const freqsByTrip = new Map<string, Frequency[]>()
  for (const r of rawFreqs) {
    const t = r.trip_id
    if (!freqsByTrip.has(t)) freqsByTrip.set(t, [])
    freqsByTrip.get(t)!.push({ tripId: t, start: r.start_time, end: r.end_time, headwaySeconds: +r.headway_secs })
  }

  // calendar → service days
  const daysByService = new Map<string, number[]>()
  for (const r of rawCalendar) {
    const days: number[] = []
    WEEKDAY_COL.forEach((col, i) => { if (r[col] === "1") days.push(i) })
    daysByService.set(r.service_id, days)
  }

  // --- cluster stops ------------------------------------------------------
  const uf = new UnionFind()
  for (const p of platforms) if (p.parent) uf.union(p.id, p.parent)
  const byBase = new Map<string, Stop[]>()
  for (const p of platforms) {
    const b = baseName(p.name)
    if (!byBase.has(b)) byBase.set(b, [])
    byBase.get(b)!.push(p)
  }
  for (const group of byBase.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (haversineMeters(group[i], group[j]) < CLUSTER_RADIUS_M) uf.union(group[i].id, group[j].id)
      }
    }
  }

  // cluster id -> representative stop (prefer the parent station if the
  // root resolves to one), and platform id -> cluster id
  const clusterOf = new Map<string, string>()
  for (const p of platforms) {
    clusterOf.set(p.id, uf.find(p.id))
  }
  const clusterStops = new Map<string, Stop>()
  for (const p of platforms) {
    const cid = clusterOf.get(p.id)!
    if (!clusterStops.has(cid)) {
      const rep = stopById.get(cid)
      clusterStops.set(cid, {
        id: cid,
        name: rep?.type === 1 ? rep.name : baseName(p.name),
        lat: rep?.type === 1 ? rep.lat : p.lat,
        lon: rep?.type === 1 ? rep.lon : p.lon,
        type: 0,
        parent: "",
      })
    }
  }

  // --- assemble per sub-service -------------------------------------------
  const tripsByDesc = new Map<string, Trip[]>()
  for (const t of trips) {
    const desc = routes.get(t.routeId)?.desc ?? ""
    if (!SUB_SERVICE[desc]) continue
    if (!tripsByDesc.has(desc)) tripsByDesc.set(desc, [])
    tripsByDesc.get(desc)!.push(t)
  }

  for (const [desc, descTrips] of tripsByDesc) {
    const { mode, slug } = SUB_SERVICE[desc]
    const stopIds = new Set<string>()
    const bundleRoutes: object[] = []
    const schedules: Record<string, object> = {}

    for (const trip of descTrips) {
      const route = routes.get(trip.routeId)!
      const st = stopTimesByTrip.get(trip.id)
      if (!st || st.length === 0) continue
      const freqs = freqsByTrip.get(trip.id)
      if (!freqs || freqs.length === 0) continue

      // offsets relative to the first stop's arrival
      const base = clockToSeconds(st[0].arrival)
      const offsets: Record<string, number> = {}
      for (const s of st) {
        const cid = clusterOf.get(s.stopId) ?? s.stopId
        const off = clockToSeconds(s.arrival) - base
        if (offsets[cid] === undefined) offsets[cid] = off
        stopIds.add(cid)
      }

      const windows = freqs
        .map((f) => ({ start: f.start.slice(0, 5), end: f.end.slice(0, 5), headwaySeconds: f.headwaySeconds }))
        .sort((a, b) => a.start.localeCompare(b.start))

      schedules[trip.id] = { windows, stopOffsets: offsets }
      bundleRoutes.push({
        id: trip.id,
        shortName: route.shortName,
        name: { en: route.longName, id: route.longName },
        headsign: { en: trip.headsign, id: trip.headsign },
        color: route.color || undefined,
        serviceDays: daysByService.get(trip.serviceId) ?? [0, 1, 2, 3, 4, 5, 6],
      })
    }

    const bundle = {
      mode,
      operator: "transjakarta",
      name: { en: desc, id: desc },
      stops: [...stopIds].map((id) => {
        const s = clusterStops.get(id)!
        return { id: s.id, name: { en: s.name, id: s.name }, lat: s.lat, lon: s.lon }
      }),
      routes: bundleRoutes,
      schedules,
    }

    const outPath = join(OUT_DIR, `transjakarta-${slug}.json`)
    writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n", "utf8")
    console.log(`[gtfs] wrote ${outPath} — ${bundleRoutes.length} routes, ${stopIds.size} stops`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
