import { useLocale, useTranslate } from "../i18n"
import type { NearbyStop } from "../server/get-nearby-stops"
import { StopCard } from "./StopCard"

type Props = {
  stops: NearbyStop[]
  osrmFallback: boolean
  nowMs: number
  onTryDifferentLocation?: () => void
}

export function StopList({ stops, osrmFallback, nowMs, onTryDifferentLocation }: Props) {
  const t = useTranslate()
  const [locale] = useLocale()

  if (stops.length === 0) {
    return (
      <div
        className="rounded-2xl border border-card-border bg-card p-8 text-center"
        data-testid="empty-state"
      >
        <h2 className="text-lg font-semibold text-fg">{t("stops.empty_title")}</h2>
        <p className="mt-2 text-sm text-fg-muted">{t("stops.empty_body")}</p>
        {onTryDifferentLocation && (
          <button
            type="button"
            onClick={onTryDifferentLocation}
            className="mt-4 rounded-full border border-card-border bg-card-soft px-4 py-2 text-sm font-medium text-fg hover:bg-card"
          >
            {t("stops.empty_cta")}
          </button>
        )}
      </div>
    )
  }

  // Group cards by operator so BRT and Mikrotrans cards render under a
  // shared "Transjakarta" header. The server function already unifies
  // (operator, stopId) into one card, so a shared stop is one card;
  // grouping here is purely a visual concern.
  const groups = new Map<string, NearbyStop[]>()
  for (const stop of stops) {
    const arr = groups.get(stop.operator) ?? []
    arr.push(stop)
    groups.set(stop.operator, arr)
  }

  return (
    <div data-testid="stop-list">
      {osrmFallback && (
        <p
          className="mb-3 rounded-md bg-status-warning/10 px-3 py-2 text-sm text-status-warning"
          data-testid="fallback-notice"
        >
          {t("stops.fallback_notice")}
        </p>
      )}
      <div className="flex flex-col gap-6">
        {[...groups.entries()].map(([operator, groupStops]) => (
          <section key={operator}>
            {groups.size > 1 && (
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fg-muted">
                {groupStops[0]?.operatorName[locale] ?? operator}
              </h2>
            )}
            <ul className="flex flex-col gap-3">
              {groupStops.map((s) => (
                <li key={`${s.operator}:${s.stopId}`}>
                  <StopCard stop={s} nowMs={nowMs} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
