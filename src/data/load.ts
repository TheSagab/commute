/**
 * Server-only data loaders for the bundled timetable.
 *
 * The JSON files under `src/data/` are imported eagerly — they're small
 * enough to bundle into the server bundle, keeping the data layer's hot
 * path synchronous. We do NOT import these on the client; the route
 * loader streams them via a server function.
 *
 * Add a new mode by dropping a `<mode>.json` next to the existing ones
 * and adding the id to `MODE_IDS` in `./types.ts`. For sub-services
 * (e.g. Transjakarta BRT / Mikrotrans) set `operator` on the bundle so
 * callers can group them.
 */

import { MODE_IDS, type ModeBundle, type ModeId } from "./types"

import mrtJakarta from "./mrt-jakarta.json"
import krlCommuter from "./krl-commuter.json"
import transjakartaBrt from "./transjakarta-brt.json"
import transjakartaAui from "./transjakarta-angkutan-umum-integrasi.json"
import transjakartaMikrotrans from "./transjakarta-mikrotrans.json"
import transjakartaTransjabodetabek from "./transjakarta-transjabodetabek.json"
import transjakartaRusun from "./transjakarta-rusun.json"
import transjakartaRoyaltrans from "./transjakarta-royaltrans.json"
import transjakartaBusWisata from "./transjakarta-bus-wisata.json"
import lrtJabodebek from "./lrt-jabodebek.json"
import lrtJakarta from "./lrt-jakarta.json"

import meta from "./_meta.json"
import type { BundleMeta } from "./types"

const BUNDLES: Record<ModeId, ModeBundle> = {
  "mrt-jakarta": mrtJakarta as ModeBundle,
  "krl-commuter": krlCommuter as ModeBundle,
  "transjakarta-brt": transjakartaBrt as ModeBundle,
  "transjakarta-angkutan-umum-integrasi": transjakartaAui as ModeBundle,
  "transjakarta-mikrotrans": transjakartaMikrotrans as ModeBundle,
  "transjakarta-transjabodetabek": transjakartaTransjabodetabek as ModeBundle,
  "transjakarta-rusun": transjakartaRusun as ModeBundle,
  "transjakarta-royaltrans": transjakartaRoyaltrans as ModeBundle,
  "transjakarta-bus-wisata": transjakartaBusWisata as ModeBundle,
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

/** Operator of a bundle — defaults to the mode id when `operator` is unset. */
export function operatorOf(bundle: ModeBundle): string {
  return bundle.operator ?? bundle.mode
}

/** All bundles whose operator matches the given operator. */
export function loadByOperator(operator: string): ModeBundle[] {
  return loadAllBundles().filter((b) => operatorOf(b) === operator)
}
