/**
 * Minimal RFC-4180-ish CSV parser for GTFS text files.
 *
 * Handles quoted fields and escaped quotes (`""`). GTFS files use plain
 * comma-separated values; this is enough for the feed.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else if (c !== "\r") {
      field += c
    }
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Parse a CSV file into header-keyed records. */
export function readRecords(text: string): Record<string, string>[] {
  const table = parseCsv(text.trim())
  if (table.length === 0) return []
  const header = table[0]
  return table.slice(1).map((r) => {
    const o: Record<string, string> = {}
    for (let i = 0; i < header.length; i++) o[header[i]] = r[i] ?? ""
    return o
  })
}
