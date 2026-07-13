import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { LocationGate } from "../components/LocationGate"
import { StopList } from "../components/StopList"
import { Footer } from "../components/Footer"
import { getNearbyStops } from "../server/get-nearby-stops"
import { getMeta } from "../server/get-meta"
import type { NearbyStop } from "../server/get-nearby-stops"
import type { PlaceResult } from "../server/search-place"
import { useTranslate } from "../i18n"

export const Route = createFileRoute("/")({ component: App })

function App() {
  const t = useTranslate()
  const [place, setPlace] = useState<PlaceResult | null>(null)
  const [stops, setStops] = useState<NearbyStop[] | null>(null)
  const [osrmFallback, setOsrmFallback] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [dataLastUpdated, setDataLastUpdated] = useState<string>("")
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    getMeta().then((m) => {
      if (!cancelled) setDataLastUpdated(m.dataLastUpdated)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!place) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setStops(null)
    getNearbyStops({ data: { lat: place.lat, lon: place.lon } })
      .then((result) => {
        if (cancelled) return
        setStops(result.stops)
        setOsrmFallback(result.osrmFallback)
      })
      .catch((err) => {
        console.error(err)
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setStops([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [place, reloadKey])

  // Tick the "now" every 30 s. Per-card tickers handle the sub-minute
  // countdown, but the parent's `nowMs` is the anchor used to compute
  // the elapsed offset inside each card.
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <header className="border-b border-card-border bg-card">
        <div className="mx-auto flex max-w-2xl items-baseline justify-between px-4 py-3">
          <div>
            <h1 className="text-base font-semibold text-fg">{t("app.title")}</h1>
            <p className="text-xs text-fg-muted">{t("app.tagline")}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {!place ? (
          <LocationGate onResolved={setPlace} />
        ) : loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState onRetry={() => setReloadKey((k) => k + 1)} />
        ) : stops ? (
          <StopList
            stops={stops}
            osrmFallback={osrmFallback}
            nowMs={nowMs}
            onTryDifferentLocation={() => setPlace(null)}
          />
        ) : null}
      </main>

      <Footer dataLastUpdatedIso={dataLastUpdated} />
    </div>
  )
}

function LoadingSkeleton() {
  const t = useTranslate()
  return (
    <div data-testid="loading-state">
      <p className="text-sm text-fg-muted">{t("stops.loading")}</p>
      <ul className="mt-4 flex flex-col gap-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="flex overflow-hidden rounded-2xl border border-card-border bg-card"
          >
            <div className="color-strip shrink-0 bg-card-soft" />
            <div className="min-w-0 flex-1 space-y-3 p-5">
              <div className="h-3 w-32 animate-pulse rounded bg-card-soft" />
              <div className="h-5 w-48 animate-pulse rounded bg-card-soft" />
              <div className="h-7 w-24 animate-pulse rounded bg-card-soft" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const t = useTranslate()
  return (
    <div
      className="rounded-2xl border border-card-border bg-card p-8 text-center"
      data-testid="error-state"
    >
      <h2 className="text-lg font-semibold text-status-error">
        {t("stops.error_title")}
      </h2>
      <p className="mt-2 text-sm text-fg-muted">{t("stops.error_body")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full border border-card-border bg-card-soft px-4 py-2 text-sm font-medium text-fg hover:bg-card"
      >
        {t("stops.error_cta")}
      </button>
    </div>
  )
}
