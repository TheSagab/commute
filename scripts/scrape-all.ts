/**
 * CI scraper — STUB.
 *
 * The real scraper (not yet written) will:
 *   1. Fetch each operator's published schedule (PDF, HTML, or GTFS).
 *   2. Normalize to the `ModeBundle` shape (see `docs/data-format.md`).
 *   3. Write the JSON to `src/data/<mode>.json`.
 *   4. Update `src/data/_meta.json`'s `dataLastUpdated` timestamp.
 *
 * For "for now," the per-mode `gen-*-data.ts` scripts are the
 * authoritative source. They expand a hand-curated spec (stations,
 * service hours, headways) into the full JSON. The scraper will
 * replace them once we have reliable fetchers for each operator.
 *
 * The CI workflow (`.github/workflows/scrape-data.yml`) calls this on
 * a weekly schedule. Today it just regenerates the hand-curated data
 * and bumps `_meta.json`'s `dataLastUpdated`.
 */

import { spawnSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")

console.log("Regenerating per-mode data from hand-curated specs...")
const result = spawnSync("pnpm", ["tsx", "scripts/gen-all.ts"], {
  cwd: repoRoot,
  stdio: "inherit",
})
if (result.status !== 0) {
  console.error("Data generation failed")
  process.exit(1)
}

const metaPath = resolve(repoRoot, "src/data/_meta.json")
const meta = JSON.parse(readFileSync(metaPath, "utf8"))
meta.dataLastUpdated = new Date().toISOString()
writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf8")
console.log(`Updated dataLastUpdated: ${meta.dataLastUpdated}`)
