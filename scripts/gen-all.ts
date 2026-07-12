/**
 * Run every per-mode data generator. Convenience entry point for
 * `pnpm gen-data`. Re-runs all `gen-*-data.ts` scripts in this
 * directory and writes the JSON bundles to `src/data/`.
 */

import { spawnSync } from "node:child_process"
import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

const scripts = readdirSync(__dirname)
  .filter((f) => /^gen-.*-data\.ts$/.test(f) && f !== "gen-all.ts")

for (const script of scripts.sort()) {
  console.log(`\n=== ${script} ===`)
  const result = spawnSync("pnpm", ["tsx", script], {
    cwd: __dirname,
    stdio: "inherit",
  })
  if (result.status !== 0) {
    console.error(`Failed: ${script}`)
    process.exit(1)
  }
}

console.log("\nAll data bundles regenerated.")
