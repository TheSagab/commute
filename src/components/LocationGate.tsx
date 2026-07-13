import { useEffect, useState } from "react"
import { useTranslate } from "../i18n"
import { searchPlace } from "../server/search-place"
import type { PlaceResult } from "../server/search-place"

export type LocationGateProps = {
  onResolved: (place: PlaceResult) => void
  onError?: (message: string) => void
}

type GateState =
  | { kind: "prompting" }
  | { kind: "asking" }
  | { kind: "denied" }
  | { kind: "unsupported" }
  | { kind: "searching"; query: string }
  | { kind: "search-error"; query: string }

export function LocationGate({ onResolved }: LocationGateProps) {
  const t = useTranslate()
  const [state, setState] = useState<GateState>({ kind: "prompting" })
  const [query, setQuery] = useState("")

  function requestGeolocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ kind: "unsupported" })
      return
    }
    setState({ kind: "asking" })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onResolved({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          displayName: t("location.use_current"),
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState({ kind: "denied" })
        } else {
          setState({ kind: "unsupported" })
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  // Auto-prompt on mount.
  useEffect(() => {
    requestGeolocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setState({ kind: "searching", query })
    try {
      const result = await searchPlace({ data: { query: query.trim() } })
      if (!result) {
        setState({ kind: "search-error", query })
        return
      }
      onResolved(result)
    } catch {
      setState({ kind: "search-error", query })
    }
  }

  return (
    <section
      className="rounded-2xl border border-card-border bg-card p-6"
      data-testid="location-gate"
    >
      <h1 className="text-xl font-semibold text-fg">
        {t("location.prompt_title")}
      </h1>
      <p className="mt-2 text-sm text-fg-muted">{t("location.prompt_body")}</p>

      {state.kind === "asking" || state.kind === "prompting" ? (
        <p className="mt-4 text-sm text-fg-muted">{t("location.searching")}</p>
      ) : null}

      {(state.kind === "denied" ||
        state.kind === "unsupported" ||
        state.kind === "searching" ||
        state.kind === "search-error") && (
        <form onSubmit={handleSearch} className="mt-4 flex flex-col gap-2">
          {state.kind === "denied" && (
            <div>
              <p className="text-sm font-medium text-fg">
                {t("location.permission_denied_title")}
              </p>
              <p className="text-sm text-fg-muted">
                {t("location.permission_denied_body")}
              </p>
            </div>
          )}
          {state.kind === "unsupported" && (
            <p className="text-sm text-fg-muted">
              {t("location.geolocation_unsupported")}
            </p>
          )}
          <label className="text-sm font-medium text-fg" htmlFor="place-search">
            {t("location.search_label")}
          </label>
          <div className="flex gap-2">
            <input
              id="place-search"
              type="search"
              value={state.kind === "searching" ? state.query : query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("location.search_placeholder")}
              className="flex-1 rounded-md border border-card-border bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-subtle"
              disabled={state.kind === "searching"}
            />
            <button
              type="submit"
              className="rounded-md bg-fg px-4 py-2 text-sm font-medium text-fg-inverse disabled:opacity-50"
              disabled={state.kind === "searching"}
            >
              {state.kind === "searching" ? t("location.searching") : t("location.search")}
            </button>
          </div>
          {state.kind === "denied" && (
            <button
              type="button"
              onClick={requestGeolocation}
              className="self-start text-sm text-fg-muted underline-offset-2 hover:underline"
            >
              {t("location.use_current")}
            </button>
          )}
          {state.kind === "search-error" && (
            <p className="text-sm text-status-error">{t("location.search_error")}</p>
          )}
        </form>
      )}
    </section>
  )
}
