/**
 * Server-only data loaders for the bundled timetable.
 *
 * The JSON files under `src/data/` are imported eagerly — they're small
 * (~tens of KB per mode) and bundling them into the server bundle keeps
 * the data layer's hot path synchronous. We do NOT import these on the
 * client; the route loader streams them via a server function.
 *
 * Add a new mode by dropping a `<mode>.json` next to the existing ones
 * and adding the id to `MODE_IDS` in `./types.ts`.
 */

import { MODE_IDS, type ModeId, type ModeBundle } from "./types"

import mrtJakarta from "./mrt-jakarta.json"
import krlCommuter from "./krl-commuter.json"
import transjakarta from "./transjakarta.json"
import lrtJabodebek from "./lrt-jabodebek.json"
import lrtJakarta from "./lrt-jakarta.json"

import meta from "./_meta.json"
import type { BundleMeta } from "./types"

const BUNDLES: Record<ModeId, ModeBundle> = {
  "mrt-jakarta": mrtJakarta as ModeBundle,
  "krl-commuter": krlCommuter as ModeBundle,
  "transjakarta": transjakarta as ModeBundle,
  "lrt-jabodebek": lrtJabodebek as ModeBundle,
  "lrt-jakarta": lrtJakarta as ModeBundle,
}

export function loadMeta(): BundleMeta {
  return meta as BundleMeta
}

export function loadModeBundle(mode: ModeId): ModeBundle {
  const bundle = BUNDLES[mode]
  if (!bundle) {
    throw new Error(`No static-JSON bundle for mode: ${mode}`)
  }
  return bundle
}

export function loadAllBundles(): ModeBundle[] {
  return MODE_IDS.map(loadModeBundle)
}
