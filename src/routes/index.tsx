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
        setStops([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [place])

  // Tick the "now" every 30 s. Per-card tickers handle the sub-minute
  // countdown, but the parent's `nowMs` is the anchor used to compute
  // the elapsed offset inside each card.
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="min-h-dvh">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-baseline justify-between px-4 py-3">
          <div>
            <h1 className="text-base font-semibold text-neutral-900">{t("app.title")}</h1>
            <p className="text-xs text-neutral-500">{t("app.tagline")}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {!place ? (
          <LocationGate onResolved={setPlace} />
        ) : loading ? (
          <p className="text-sm text-neutral-500">{t("stops.loading")}</p>
        ) : stops ? (
          <StopList stops={stops} osrmFallback={osrmFallback} nowMs={nowMs} />
        ) : null}
      </main>

      {dataLastUpdated && <Footer dataLastUpdatedIso={dataLastUpdated} />}
    </div>
  )
}
