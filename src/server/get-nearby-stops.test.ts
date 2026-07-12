import { describe, expect, it } from "vitest"
import { _combineStatuses } from "./get-nearby-stops"

describe("combineStatuses (most-permissive rule across sub-services)", () => {
  it("returns running when any sub-service is running", () => {
    const out = _combineStatuses([
      { kind: "running" },
      { kind: "afterHours", lastTime: "22:00", firstTimeTomorrow: "05:00" },
    ])
    expect(out.kind).toBe("running")
  })

  it("returns beforeHours with the earliest start time when all are beforeHours", () => {
    const out = _combineStatuses([
      { kind: "beforeHours", firstTime: "05:00" },
      { kind: "beforeHours", firstTime: "05:30" },
    ])
    expect(out.kind).toBe("beforeHours")
    if (out.kind === "beforeHours") {
      expect(out.firstTime).toBe("05:00")
    }
  })

  it("returns afterHours with the latest end time when all are afterHours", () => {
    const out = _combineStatuses([
      { kind: "afterHours", lastTime: "21:00", firstTimeTomorrow: "05:30" },
      { kind: "afterHours", lastTime: "22:00", firstTimeTomorrow: "05:00" },
    ])
    expect(out.kind).toBe("afterHours")
    if (out.kind === "afterHours") {
      expect(out.lastTime).toBe("22:00")
      expect(out.firstTimeTomorrow).toBe("05:00")
    }
  })

  it("falls back to afterHours when input is empty", () => {
    const out = _combineStatuses([])
    expect(out.kind).toBe("afterHours")
  })

  it("uses the latest end time when a mix of afterHours sub-services is present", () => {
    // BRT afterHours at 22:00, Mikrotrans afterHours at 21:00
    const out = _combineStatuses([
      { kind: "afterHours", lastTime: "22:00", firstTimeTomorrow: "05:00" },
      { kind: "afterHours", lastTime: "21:00", firstTimeTomorrow: "05:30" },
    ])
    expect(out.kind).toBe("afterHours")
    if (out.kind === "afterHours") {
      expect(out.lastTime).toBe("22:00")
    }
  })
})
