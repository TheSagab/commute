import { describe, expect, it } from "vitest"
import { parseCsv, readRecords } from "./gtfs-csv"

describe("parseCsv", () => {
  it("splits simple comma-separated rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ])
  })

  it("handles quoted fields containing commas", () => {
    expect(parseCsv('id,name\n1,"Blok M, Jakarta"')).toEqual([
      ["id", "name"],
      ["1", "Blok M, Jakarta"],
    ])
  })

  it("handles escaped quotes inside quoted fields", () => {
    expect(parseCsv('1,"say ""hi"""')).toEqual([["1", 'say "hi"']])
  })

  it("ignores carriage returns (CRLF files)", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ])
  })
})

describe("readRecords", () => {
  it("keys rows by the header", () => {
    const rows = readRecords("route_id,route_short_name\n9,9\n1A,1A")
    expect(rows).toEqual([
      { route_id: "9", route_short_name: "9" },
      { route_id: "1A", route_short_name: "1A" },
    ])
  })
})
