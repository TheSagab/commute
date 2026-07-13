import { describe, expect, it } from "vitest"
import { formatDate } from "./format"

describe("formatDate", () => {
  it("returns the formatted date for a valid ISO string", () => {
    const out = formatDate("2026-07-12T00:00:00Z", "—")
    expect(out).toBe("12 Jul 2026")
  })

  it("returns the loading placeholder for an empty string", () => {
    expect(formatDate("", "—")).toBe("—")
  })

  it("returns the loading placeholder for an unparseable string", () => {
    expect(formatDate("not a date", "—")).toBe("—")
  })
})
