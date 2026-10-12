/**
 * CI scraper entry point.
 *
 * Runs the data generators and bumps `_meta.json`'s `dataLastUpdated`.
 * The CI workflow (`.github/workflows/scrape-data.yml`) calls this on a
 * weekly schedule.
 *
 * Two kinds of generator:
 *   - `scripts/import-gtfs-transjakarta.ts` — downloads the official
 *     Transjakarta GTFS feed and converts it to the static-JSON
 *     bundles. Requires network access.
 *   - `scripts/gen-*-data.ts` — hand-curated rail data (MRT / KRL /
 *     LRT), expanded from a compact spec. No network.
 *
 * The committed JSON under `src/data/` is what the app reads at
 * runtime; the app never downloads GTFS itself.
 */

import { spawnSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")

function run(script: string) {
  console.log(`\n>>> ${script}`)
  const result = spawnSync("pnpm", ["tsx", script], { cwd: repoRoot, stdio: "inherit" })
  if (result.status !== 0) {
    console.error(`Failed: ${script}`)
    process.exit(1)
  }
}

// 1. Transjakarta — from the official GTFS feed.
run("scripts/import-gtfs-transjakarta.ts")

// 2. Rail modes — hand-curated (no GTFS available).
run("scripts/gen-all.ts")

// 3. Bump the bundle timestamp the footer shows.
const metaPath = resolve(repoRoot, "src/data/_meta.json")
const meta = JSON.parse(readFileSync(metaPath, "utf8"))
meta.dataLastUpdated = new Date().toISOString()
writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf8")
console.log(`\nUpdated dataLastUpdated: ${meta.dataLastUpdated}`)
