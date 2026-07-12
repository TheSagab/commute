/**
 * Server-side label maps for the operator / sub-service names that
 * the i18n module exposes to the client. The server can't `useTranslate`
 * (no React context), so it ships both `en` and `id` strings and lets
 * the client pick the one matching the active locale.
 *
 * Keep in sync with `src/i18n/{en,id}.json` keys:
 *   `operator.<id>`       — operator.<id>
 *   `sub-service.<id>`    — sub-service.<id>
 */

import type { Localized } from "../data/types"

export const OPERATOR_LABELS: Record<string, Localized> = {
  "mrt-jakarta": { en: "MRT Jakarta", id: "MRT Jakarta" },
  "krl-commuter": { en: "KRL Commuter Line", id: "KRL Commuter Line" },
  "transjakarta": { en: "Transjakarta", id: "Transjakarta" },
  "lrt-jabodebek": { en: "LRT Jabodebek", id: "LRT Jabodebek" },
  "lrt-jakarta": { en: "LRT Jakarta", id: "LRT Jakarta" },
}

export const SUB_SERVICE_LABELS: Record<string, Localized> = {
  "transjakarta-brt": { en: "BRT", id: "BRT" },
  "transjakarta-non-brt": { en: "Non-BRT", id: "Non-BRT" },
  "transjakarta-mikrotrans": { en: "Mikrotrans", id: "Mikrotrans" },
}
