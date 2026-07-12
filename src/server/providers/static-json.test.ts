import { describe, expect, it } from "vitest"
import { _findUpcomingForStop, _getServiceStatus } from "./static-json"
import { loadModeBundle } from "../../data/load"

const mrt = loadModeBundle("mrt-jakarta")

function jakartaInstant(clock: string): Date {
  // Build a Date for the given Jakarta wall-clock time on 2026-07-12.
  const [h, m] = clock.split(":").map(Number)
  const utc = new Date(Date.UTC(2026, 6, 12, h - 7, m, 0))
  return utc
}

describe("static-json provider — service status", () => {
  it("is running mid-day", () => {
    const status = _getServiceStatus(mrt.serviceHours, 12 * 60)
    expect(status.kind).toBe("running")
  })

  it("is beforeHours early morning", () => {
    const status = _getServiceStatus(mrt.serviceHours, 3 * 60)
    expect(status.kind).toBe("beforeHours")
    if (status.kind === "beforeHours") {
      expect(status.firstTime).toBe("05:00")
    }
  })

  it("is beforeHours right after midnight (wrapping window)", () => {
    // MRT service wraps: 05:00 → 00:30 next day. 00:35 is in the gap.
    // For wrapping ends the gap is shown as "beforeHours" — the next
    // service is at 05:00 today.
    const status = _getServiceStatus(mrt.serviceHours, 35)
    expect(status.kind).toBe("beforeHours")
  })

  it("is afterHours for a non-wrapping mode that has ended", () => {
    // LRT Jakarta runs 05:30 → 23:00 (no wrap). 23:30 is past end.
    const status = _getServiceStatus(
      { start: "05:30", end: "23:00" },
      23 * 60 + 30,
    )
    expect(status.kind).toBe("afterHours")
    if (status.kind === "afterHours") {
      expect(status.firstTimeTomorrow).toBe("05:30")
    }
  })
})

describe("static-json provider — next arrival at Lebak Bulus", () => {
  it("returns no upcoming and beforeHours before service starts", () => {
    const result = _findUpcomingForStop(mrt, "mrt-ldb", jakartaInstant("04:59"))
    expect(result.upcoming).toEqual([])
    expect(result.status.kind).toBe("beforeHours")
  })

  it("returns the next southbound during the morning peak", () => {
    const result = _findUpcomingForStop(mrt, "mrt-ldb", jakartaInstant("07:30"))
    expect(result.upcoming.length).toBeGreaterThan(0)
    const first = result.upcoming[0]
    // Southbound (Bundaran HI → Lebak Bulus) leaves Lebak Bulus
    // last; arrivals at LDB on the southbound are trains
    // originating from the opposite end. At 07:30 the first one
    // already passed — the next southbound ARRIVAL at LDB is the
    // one that started northbound at 07:00 and arrived at LDB
    // ~30 min later.
    expect(first.routeId).toMatch(/ns\./)
  })

  it("returns the next northbound at 18:15", () => {
    // Northbound leaves Lebak Bulus heading to Bundaran HI. 5-min
    // peak headway, so at 18:15 the next northbound is the 18:15
    // departure (or 18:20 if 18:15 just left).
    const result = _findUpcomingForStop(mrt, "mrt-ldb", jakartaInstant("18:15"))
    expect(result.upcoming.length).toBeGreaterThan(0)
    const first = result.upcoming[0]
    expect(first.routeId).toBe("ns.northbound")
    // The exact time depends on the generated schedule; just
    // assert it's in a sensible window.
    expect(first.clockTime >= "18:15").toBe(true)
    expect(first.clockTime <= "18:20").toBe(true)
  })

  it("returns no upcoming after the service window closes", () => {
    // 00:35 is past the 00:30 end of the wrapped window.
    const result = _findUpcomingForStop(mrt, "mrt-ldb", jakartaInstant("00:35"))
    expect(result.upcoming).toEqual([])
    expect(result.status.kind).toBe("beforeHours")
  })
})
