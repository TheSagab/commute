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

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {operatorName}
            {subServiceLabels.length > 0 && (
              <>
                {" · "}
                <span className="text-neutral-400 normal-case">
                  {subServiceLabels.join(" · ")}
                </span>
              </>
            )}
          </p>
          <h2 className="mt-0.5 truncate text-lg font-semibold text-neutral-900">
            {stop.stopName[locale]}
          </h2>
        </div>
        {stop.walkSeconds !== null && (
          <p className="shrink-0 text-xs text-neutral-500">
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
              <p className={`text-2xl font-semibold ${urgent ? "text-emerald-700" : "text-neutral-900"}`}>
                {label}
                <span className="ml-2 text-sm font-normal text-neutral-500">
                  {stop.next.clockTime}
                </span>
              </p>
            )
          })()
        ) : stop.serviceStatus.kind === "beforeHours" ? (
          <p className="text-lg text-neutral-700">
            {t("card.starts_at", { time: stop.serviceStatus.firstTime })}
          </p>
        ) : (
          <p className="text-lg text-neutral-500">{t("card.service_ended")}</p>
        )}
      </div>

      {stop.upcoming.length > 1 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-sm text-neutral-600 underline-offset-2 hover:underline"
          >
            {expanded ? t("card.collapse") : t("card.expand")}
          </button>
          {expanded && (
            <ul className="mt-2 divide-y divide-neutral-100 text-sm">
              {stop.upcoming.slice(0, 8).map((u, i) => (
                <li key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-neutral-600">{u.routeId}</span>
                  <span className="font-medium text-neutral-900">{u.clockTime}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  )
}
