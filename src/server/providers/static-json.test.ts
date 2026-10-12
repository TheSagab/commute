import { describe, expect, it } from "vitest"
import { _findUpcomingForStop, _nextArrivalSeconds } from "./static-json"
import { loadModeBundle } from "../../data/load"
import type { Schedule } from "../../data/types"

const mrt = loadModeBundle("mrt-jakarta")
const nb = mrt.schedules["ns.northbound"]
const sb = mrt.schedules["ns.southbound"]
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

function at(clock: string): number {
  const [h, m] = clock.split(":").map(Number)
  return h * 3600 + m * 60
}

function jakartaInstant(clock: string): Date {
  const [h, m] = clock.split(":").map(Number)
  return new Date(Date.UTC(2026, 6, 12, h - 7, m, 0))
}

describe("_nextArrivalSeconds — headway windows + offsets", () => {
  it("uses the 5-minute morning-peak window at Lebak Bulus (offset 0)", () => {
    // 06:00–07:00 is a 5-min window; at 06:02 the next northbound is 06:05.
    const arrival = _nextArrivalSeconds(nb, "mrt-ldb", at("06:02"), 0, ALL_DAYS)
    expect(arrival).toBe(at("06:05"))
  })

  it("applies the per-stop offset for the far end of the line", () => {
    // Bundaran HI is 12 * 180 s = 36 min from Lebak Bulus on the
    // northbound. At 06:02 the train that departed 05:30 is already en
    // route and arrives 06:06 — sooner than the 06:05 departure's 06:41.
    const arrival = _nextArrivalSeconds(nb, "mrt-hi", at("06:02"), 0, ALL_DAYS)
    expect(arrival).toBe(at("06:06"))
  })

  it("uses the southbound offset at Lebak Bulus (the far end southbound)", () => {
    // Lebak Bulus is 36 min from the southbound start (Bundaran HI).
    // At 06:02 the train that departed 05:30 arrives 06:06.
    const arrival = _nextArrivalSeconds(sb, "mrt-ldb", at("06:02"), 0, ALL_DAYS)
    expect(arrival).toBe(at("06:06"))
  })

  it("switches to the 7-minute mid-day window", () => {
    // 07:00–17:00 is a 7-min window starting at 07:00, so departures are
    // 07:00, 07:07, …, 08:03. At 08:00 the next is 08:03.
    const arrival = _nextArrivalSeconds(nb, "mrt-ldb", at("08:00"), 0, ALL_DAYS)
    expect(arrival).toBe(at("08:03"))
  })

  it("returns null when the route does not serve the stop", () => {
    expect(_nextArrivalSeconds(nb, "does-not-exist", at("08:00"), 0, ALL_DAYS)).toBeNull()
  })
})

describe("_nextArrivalSeconds — service days", () => {
  const weekdayOnly: Schedule = {
    windows: [{ start: "05:00", end: "23:00", headwaySeconds: 10 * 60 }],
    stopOffsets: { s1: 0 },
  }

  it("produces an arrival on a day the route runs", () => {
    // Monday (dow 0) is in [0..4].
    const arrival = _nextArrivalSeconds(weekdayOnly, "s1", at("08:00"), 0, [0, 1, 2, 3, 4])
    expect(arrival).toBe(at("08:00"))
  })

  it("returns null on a day the route does not run", () => {
    // Sunday (dow 6) is not in [0..4].
    expect(_nextArrivalSeconds(weekdayOnly, "s1", at("08:00"), 6, [0, 1, 2, 3, 4])).toBeNull()
  })
})

describe("_nextArrivalSeconds — windows that wrap past midnight", () => {
  const lateNight: Schedule = {
    windows: [{ start: "22:00", end: "24:30", headwaySeconds: 15 * 60 }],
    stopOffsets: { s1: 0 },
  }

  it("returns the late-night departure before midnight", () => {
    // 23:01 → next 15-min departure is 23:15 (23:00 is already gone).
    expect(_nextArrivalSeconds(lateNight, "s1", at("23:01"), 0, ALL_DAYS)).toBe(at("23:15"))
  })

  it("still serves after midnight from the previous day's window", () => {
    // 00:10 (dow 1) → the window that started 22:00 the previous day
    // (dow 0) is still running until 00:30. The next departure is 00:15.
    const arrival = _nextArrivalSeconds(lateNight, "s1", at("00:10"), 1, ALL_DAYS)
    expect(arrival).toBe(at("00:15"))
  })
})

describe("_findUpcomingForStop — service days", () => {
  // A weekday-only route should NOT report "running" on a Sunday.
  const weekdayBundle = {
    mode: "mrt-jakarta" as const,
    name: { en: "Test", id: "Test" },
    stops: [
      { id: "s1", name: { en: "S1", id: "S1" }, lat: 0, lon: 0 },
    ],
    routes: [
      {
        id: "r1",
        shortName: "T",
        name: { en: "Test", id: "Test" },
        headsign: { en: "End", id: "End" },
        serviceDays: [0, 1, 2, 3, 4], // weekdays only
      },
    ],
    schedules: {
      r1: { windows: [{ start: "05:00", end: "22:00", headwaySeconds: 600 }], stopOffsets: { s1: 0 } },
    },
  }

  it("reports running on a weekday", () => {
    // 2026-07-13 is a Monday.
    const monday = new Date(Date.UTC(2026, 6, 13, 4, 0, 0)) // 11:00 Jakarta
    const result = _findUpcomingForStop(weekdayBundle, "s1", monday)
    expect(result.status.kind).toBe("running")
    expect(result.upcoming.length).toBeGreaterThan(0)
  })

  it("reports afterHours on a Sunday", () => {
    // 2026-07-12 is a Sunday.
    const sunday = new Date(Date.UTC(2026, 6, 12, 4, 0, 0)) // 11:00 Jakarta
    const result = _findUpcomingForStop(weekdayBundle, "s1", sunday)
    expect(result.status.kind).toBe("afterHours")
    expect(result.upcoming).toEqual([])
  })

  it("preserves the real first time in the combined status", () => {
    // Monday 03:00 Jakarta (before the 05:00 first window).
    const mondayEarly = new Date(Date.UTC(2026, 6, 12, 20, 0, 0))
    const before = _findUpcomingForStop(weekdayBundle, "s1", mondayEarly)
    expect(before.status.kind).toBe("beforeHours")
    if (before.status.kind === "beforeHours") {
      expect(before.status.firstTime).toBe("05:00")
    }
  })
})

describe("_findUpcomingForStop — MRT", () => {
  it("reports running and an upcoming list during service hours", () => {
    const result = _findUpcomingForStop(mrt, "mrt-ldb", jakartaInstant("06:02"))
    expect(result.status.kind).toBe("running")
    expect(result.upcoming.length).toBeGreaterThan(0)
    // Soonest across both directions at Lebak Bulus is the northbound
    // 06:05 (offset 0), before the southbound 06:41 (offset 36 min).
    expect(result.upcoming[0]?.routeId).toBe("ns.northbound")
  })

  it("reports beforeHours at 03:00", () => {
    const result = _findUpcomingForStop(mrt, "mrt-ldb", jakartaInstant("03:00"))
    expect(result.status.kind).toBe("beforeHours")
    expect(result.upcoming).toEqual([])
  })
})
