/**
 * Server-side label map for the operator names. The server can't
 * `useTranslate` (no React context), so it ships both `en` and `id`
 * strings and lets the client pick the one matching the active locale.
 *
 * Sub-service labels are NOT here — they come from the bundle's `name`
 * field (the operator's own `route_desc`, e.g. "BRT", "Mikrotrans"), so
 * adding a sub-service is a data change, not a code change.
 */

import type { Localized } from "../data/types"

export const OPERATOR_LABELS: Record<string, Localized> = {
  "mrt-jakarta": { en: "MRT Jakarta", id: "MRT Jakarta" },
  "krl-commuter": { en: "KRL Commuter Line", id: "KRL Commuter Line" },
  "transjakarta": { en: "Transjakarta", id: "Transjakarta" },
  "lrt-jabodebek": { en: "LRT Jabodebek", id: "LRT Jabodebek" },
  "lrt-jakarta": { en: "LRT Jakarta", id: "LRT Jakarta" },
}
