import { useTranslate } from "../i18n"
import type { NearbyStop } from "../server/get-nearby-stops"
import { StopCard } from "./StopCard"

type Props = {
  stops: NearbyStop[]
  osrmFallback: boolean
  nowMs: number
}

export function StopList({ stops, osrmFallback, nowMs }: Props) {
  const t = useTranslate()

  if (stops.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center">
        <h2 className="text-lg font-semibold text-neutral-900">{t("stops.empty_title")}</h2>
        <p className="mt-2 text-sm text-neutral-600">{t("stops.empty_body")}</p>
      </div>
    )
  }

  return (
    <div>
      {osrmFallback && (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("stops.fallback_notice")}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {stops.map((s) => (
          <li key={`${s.mode}:${s.stopId}`}>
            <StopCard stop={s} nowMs={nowMs} />
          </li>
        ))}
      </ul>
    </div>
  )
}
