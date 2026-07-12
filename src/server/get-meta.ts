/**
 * Server function: bundle metadata (data last updated, etc.).
 *
 * Surfaces `_meta.json` to the client so the footer can show the
 * "data last updated" timestamp.
 */

import { createServerFn } from "@tanstack/react-start"
import { loadMeta } from "../data/load"

export const getMeta = createServerFn({ method: "GET" }).handler(async () => {
  return loadMeta()
})
