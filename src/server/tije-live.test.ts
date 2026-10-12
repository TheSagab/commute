import { describe, expect, it } from "vitest"
import { estimateEtaSeconds, normalizeVehicle, type LiveVehicle } from "./tije-live"

const sampleRaw = {
  bus_body_no: "KWK-763",
  route_code: "JAK.45",
  route_name: "Lebak Bulus",
  route_color: "00609C",
  latitude: -6.305482,
  longitude: 106.820202,
  speed: 0,
  bearing: 12,
  timestamp: "1791796901000",
  trip_id: "JAK.45-L02",
  type: "Mikrotrans",
  estimated_time_next_stops: 0,
  estimated_distance_next_stops: 24754,
  next_stops: "B01114P-Jln. H. Khair",
  stops: [
    { name: "Jln. H. Khair", stop_id: "B01114P", parent_stop_id: "B01114P", eta: 1, stop_sequence: 1 },
    { name: "Masjid Nurul Falah", stop_id: "B02365P", parent_stop_id: "B02365P", eta: 240, stop_sequence: 2 },
  ],
}

describe("normalizeVehicle", () => {
  it("maps the raw API record, parsing the per-stop eta array", () => {
    const v = normalizeVehicle(sampleRaw)
    expect(v).not.toBeNull()
    expect(v).toMatchObject({
      busBodyNo: "KWK-763",
      routeCode: "JAK.45",
      routeColor: "#00609C",
      tripId: "JAK.45-L02",
      vehicleType: "Mikrotrans",
      lat: -6.305482,
      lon: 106.820202,
      speed: 0,
      estimatedSecondsToNextStop: 0,
      upcomingStops: [
        { stopId: "B01114P", parentStopId: "B01114P", name: "Jln. H. Khair", etaSeconds: 1 },
        { stopId: "B02365P", parentStopId: "B02365P", name: "Masjid Nurul Falah", etaSeconds: 240 },
      ],
    })
  })

  it("returns null when required fields are missing", () => {
    expect(normalizeVehicle(null)).toBeNull()
    expect(normalizeVehicle({ bus_body_no: "X" })).toBeNull()
    expect(normalizeVehicle({ latitude: 1, longitude: 2 })).toBeNull()
  })

  it("tolerates a missing stops array", () => {
    const v = normalizeVehicle({ bus_body_no: "X", latitude: 1, longitude: 2 })
    expect(v?.upcomingStops).toEqual([])
  })
})

describe("estimateEtaSeconds", () => {
  const vehicle = normalizeVehicle(sampleRaw) as LiveVehicle

  it("uses the API's per-stop eta when it is a real value", () => {
    expect(estimateEtaSeconds(vehicle, "B02365P")).toBe(240)
  })

  it("falls back to the index heuristic when the per-stop eta is a placeholder", () => {
    // B01114P is the immediate next stop with eta=1 (placeholder) and
    // estimated_time_next_stops=0 → 0 + 0*60 = 0.
    expect(estimateEtaSeconds(vehicle, "B01114P")).toBe(0)
  })

  it("matches on parent_stop_id too", () => {
    const v = normalizeVehicle({
      ...sampleRaw,
      stops: [{ stop_id: "PLATFORM1", parent_stop_id: "STATION9", eta: 120 }],
    }) as LiveVehicle
    expect(estimateEtaSeconds(v, "STATION9")).toBe(120)
  })

  it("returns null for a stop the vehicle is not heading to", () => {
    expect(estimateEtaSeconds(vehicle, "NOPE")).toBeNull()
  })
})
