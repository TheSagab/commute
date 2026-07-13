import { useEffect, useState } from "react"
import { useLocale, useTranslate } from "../i18n"
import type { NearbyStop } from "../server/get-nearby-stops"

type Props = {
  stop: NearbyStop
  nowMs: number
}

function formatCountdown(secondsUntil: number, t: (k: string, p?: Record<string, string | number>) => string): {
  label: string
  urgent: boolean
} {
  if (secondsUntil <= 0) return { label: t("card.next_arriving"), urgent: true }
  if (secondsUntil < 60) {
    return { label: t("card.next_seconds", { n: Math.ceil(secondsUntil) }), urgent: true }
  }
  const minutes = Math.round(secondsUntil / 60)
  return { label: t("card.next_minutes_other", { n: minutes }), urgent: false }
}

function formatWalk(seconds: number, t: (k: string, p?: Record<string, string | number>) => string): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  return t("card.walk_minutes_other", { n: minutes })
}

export function StopCard({ stop, nowMs }: Props) {
  const t = useTranslate()
  const [locale] = useLocale()
  const [expanded, setExpanded] = useState(false)

  // Recompute countdown label once per second. The card list receives
  // `nowMs` (the page's "now"), so the secondsUntil delta is
  // (initialSecondsUntil - elapsed). This avoids re-rendering every
  // child on every tick; the card just subtracts an offset.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  // We don't have the original `secondsUntil` once `nowMs` has moved;
  // recompute against the latest `nowMs` (parent passes the live one).
  const elapsed = (Date.now() - nowMs) / 1000

  const operatorName = stop.operatorName[locale]
  const subServiceLabels = stop.subServices.map((s) => s.label[locale])
  // The "color" of the stop is the color of the next-arrival's route
  // (the one the user is most likely to act on). When the stop is
  // beforeHours/afterHours, fall back to the first sub-service's
  // color, then the design token for "no brand color" (subtle grey).
  const stripColor =
    stop.next?.color ??
    stop.subServices.find((s) => s.color)?.color ??
    "var(--color-strip-fallback)"

  // The route+headsign line is the stop's identity. Show it whenever
  // we have something to show — not only when there's an imminent
  // arrival. Fall back to the first sub-service's route (which is
  // the best we can do for a beforeHours/afterHours stop with no
  // imminent next arrival).
  const routeLine =
    stop.next
      ? {
          name: stop.next.routeName[locale],
          headsign: stop.next.headsign[locale],
        }
      : stop.subServices[0]
        ? {
            name: stop.subServices[0].label[locale],
            headsign: stop.subServices[0].label[locale],
          }
        : null

  return (
    <article
      className="flex overflow-hidden rounded-2xl border border-card-border bg-card"
      data-testid="stop-card"
    >
      <div
        className="color-strip shrink-0"
        style={{ backgroundColor: stripColor }}
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
              {operatorName}
              {subServiceLabels.length > 0 && (
                <>
                  {" · "}
                  <span className="text-fg-subtle normal-case">
                    {subServiceLabels.join(" · ")}
                  </span>
                </>
              )}
            </p>
            <h2 className="mt-0.5 truncate text-lg font-semibold text-fg">
              {stop.stopName[locale]}
            </h2>
            {routeLine && (
              <p className="mt-1 truncate text-sm text-fg-muted">
                {routeLine.name}{" "}
                <span className="text-fg-subtle">
                  {t("card.headsign_to", { headsign: routeLine.headsign })}
                </span>
              </p>
            )}
          </div>
          {stop.walkSeconds !== null && (
            <p className="shrink-0 text-xs text-fg-muted">
              {formatWalk(stop.walkSeconds, t)}
            </p>
          )}
        </div>

        <div className="mt-3">
          {stop.serviceStatus.kind === "running" && stop.next ? (
            (() => {
              const seconds = Math.max(0, stop.next.secondsUntil - elapsed)
              const { label, urgent } = formatCountdown(seconds, t)
              return (
                <p className={`text-2xl font-semibold ${urgent ? "text-status-arriving" : "text-fg"}`}>
                  {label}
                  <span className="ml-2 text-sm font-normal text-fg-muted">
                    {stop.next.clockTime}
                  </span>
                </p>
              )
            })()
          ) : stop.serviceStatus.kind === "beforeHours" ? (
            <p className="text-lg text-fg-muted">
              {t("card.starts_at", { time: stop.serviceStatus.firstTime })}
            </p>
          ) : (
            <p className="text-lg text-fg-subtle">{t("card.service_ended")}</p>
          )}
        </div>

        {stop.upcoming.length > 1 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-sm text-fg-muted underline-offset-2 hover:underline"
            >
              {expanded ? t("card.collapse") : t("card.expand")}
            </button>
            {expanded && (
              <ul className="mt-2 divide-y divide-border-soft text-sm">
                {stop.upcoming.slice(0, 8).map((u, i) => (
                  <li key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-fg-muted">{u.routeId}</span>
                    <span className="font-medium text-fg">{u.clockTime}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
