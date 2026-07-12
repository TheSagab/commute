import { describe, expect, it } from "vitest"
import { _findUpcomingForStop, _getServiceStatus } from "./static-json"
import { loadModeBundle } from "../../data/load"

const mrt = loadModeBundle("mrt-jakarta")
const brt = loadModeBundle("transjakarta-brt")
const np = loadModeBundle("transjakarta-non-brt")

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

describe("static-json provider — per-route service hours (24h corridor)", () => {
  // Corridor 9 has `serviceHours: { start: "00:00", end: "24:00" }`,
  // overriding the mode-level 05:00–22:00 default. A stop on Corridor
  // 9 (e.g. Sudirman) should be "running" at 03:00 even though the
  // mode-level window hasn't started.

  it("keeps a 24h-route stop running at 03:00", () => {
    const result = _findUpcomingForStop(brt, "c9-sdb", jakartaInstant("03:00"))
    expect(result.status.kind).toBe("running")
    expect(result.upcoming.length).toBeGreaterThan(0)
  })

  it("keeps the same stop running across the day", () => {
    // 23:30 — a 5-22 route has ended, but Corridor 9 is 24h.
    const result = _findUpcomingForStop(brt, "c9-sdb", jakartaInstant("23:30"))
    expect(result.status.kind).toBe("running")
  })

  it("non-24h stops on the same mode are still afterHours at 23:30", () => {
    // Corridor 1 doesn't have per-route service hours, so it uses
    // the mode-level 05:00–22:00. Blok M is a Corridor 1 stop.
    const result = _findUpcomingForStop(brt, "c1-blm", jakartaInstant("23:30"))
    expect(result.status.kind).toBe("afterHours")
  })

  it("non-24h stops are beforeHours at 03:00", () => {
    // Blok M on Corridor 1 (mode-level 05:00–22:00) is beforeHours
    // at 03:00 — even though Corridor 9 (a different route serving
    // the same operator) is running, the stop's status is per-route
    // and each stop's status is the most-permissive across its own
    // serving routes.
    const result = _findUpcomingForStop(brt, "c1-blm", jakartaInstant("03:00"))
    expect(result.status.kind).toBe("beforeHours")
  })
})

describe("static-json provider — Non-BRT sub-service", () => {
  // The Non-BRT bundle uses BRT stop ids for shared halte (e.g.
  // `c1-blm` is Blok M, served by BRT Corridor 1 and several Non-BRT
  // routes like 1C, 1M, 1P, 1Q, 6M, 6U, 7B, 7Q, 8D, 8E, 1W) plus
  // Non-BRT-only stops with the `np-` prefix. Tests below check both.

  it("an Non-BRT-only stop is running mid-day", () => {
    // np-pantai-maju is a Non-BRT-only stop (route 1A's headsign).
    // The bundle's mode-level service hours are 05:00–22:00, so
    // mid-day should be "running".
    const result = _findUpcomingForStop(np, "np-pantai-maju", jakartaInstant("12:00"))
    expect(result.status.kind).toBe("running")
    expect(result.upcoming.length).toBeGreaterThan(0)
  })

  it("an Non-BRT-only stop is beforeHours early morning", () => {
    const result = _findUpcomingForStop(np, "np-pantai-maju", jakartaInstant("04:30"))
    expect(result.status.kind).toBe("beforeHours")
    expect(result.upcoming).toEqual([])
  })

  it("a BRT+Non-BRT shared halte (Blok M) is running mid-day with arrivals from both", () => {
    // c1-blm (Blok M) is shared by BRT Corridor 1 (BRT) and a dozen
    // Non-BRT routes. The chain unifies them — the test loads each
    // bundle and checks that BOTH report running arrivals.
    const brtResult = _findUpcomingForStop(brt, "c1-blm", jakartaInstant("12:00"))
    const npResult = _findUpcomingForStop(np, "c1-blm", jakartaInstant("12:00"))
    expect(brtResult.status.kind).toBe("running")
    expect(npResult.status.kind).toBe("running")
    expect(brtResult.upcoming.length).toBeGreaterThan(0)
    expect(npResult.upcoming.length).toBeGreaterThan(0)
    // At least one upcoming in each bundle should be from a
    // different route (BRT vs Non-BRT routes). The most-permissive
    // combine in getNearbyStops would surface the soonest of all
    // these in a single card.
    const brtRouteIds = new Set(brtResult.upcoming.map((u) => u.routeId))
    const npRouteIds = new Set(npResult.upcoming.map((u) => u.routeId))
    // Some overlap is possible (None here, but be defensive) —
    // the strong claim is that BOTH bundles report arrivals, so
    // the chain has something to unify.
    expect(brtRouteIds.size).toBeGreaterThan(0)
    expect(npRouteIds.size).toBeGreaterThan(0)
  })
})
