/**
 * Shared assembly for the hand-curated rail data generators (MRT / KRL /
 * LRT). Each generator declares its stations, directions, and windows;
 * this turns them into a `ModeBundle` in the headway-based shape (see
 * `docs/data-format.md`).
 */

export type StationSpec = {
  id: string
  nameEn: string
  nameId: string
  code: string
  lat: number
  lon: number
}

export type Window = { start: string; end: string; headwaySeconds: number }

export type DirectionSpec = {
  id: string
  shortName: string
  nameEn: string
  nameId: string
  headsignEn: string
  headsignId: string
  color?: string
  /** Stations in travel order for this direction. */
  order: StationSpec[]
}

export type RailBundleSpec = {
  mode: string
  nameEn: string
  nameId: string
  stations: StationSpec[]
  windows: Window[]
  travelSeconds: number
  dwellSeconds: number
  directions: DirectionSpec[]
}

function offsetsFor(order: StationSpec[], stepSeconds: number): Record<string, number> {
  const offsets: Record<string, number> = {}
  order.forEach((s, i) => {
    offsets[s.id] = i * stepSeconds
  })
  return offsets
}

export function buildRailBundle(spec: RailBundleSpec) {
  const step = spec.travelSeconds + spec.dwellSeconds
  const schedules: Record<string, { windows: Window[]; stopOffsets: Record<string, number> }> = {}
  const routes = spec.directions.map((d) => {
    schedules[d.id] = { windows: spec.windows, stopOffsets: offsetsFor(d.order, step) }
    return {
      id: d.id,
      shortName: d.shortName,
      name: { en: d.nameEn, id: d.nameId },
      headsign: { en: d.headsignEn, id: d.headsignId },
      color: d.color,
      serviceDays: [0, 1, 2, 3, 4, 5, 6],
    }
  })

  return {
    mode: spec.mode,
    name: { en: spec.nameEn, id: spec.nameId },
    stops: spec.stations.map((s) => ({
      id: s.id,
      name: { en: s.nameEn, id: s.nameId },
      code: s.code,
      lat: s.lat,
      lon: s.lon,
    })),
    routes,
    schedules,
  }
}
