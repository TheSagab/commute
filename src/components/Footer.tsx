import { useTranslate, useLocale } from "../i18n"
import { formatDate } from "../lib/format"

type Props = {
  dataLastUpdatedIso: string
}

export function Footer({ dataLastUpdatedIso }: Props) {
  const t = useTranslate()
  const [locale, setLocale] = useLocale()
  return (
    <footer className="mt-12 border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-neutral-500">
        <span>{t("app.data_last_updated", { date: formatDate(dataLastUpdatedIso) })}</span>
        <button
          type="button"
          className="text-neutral-500 underline-offset-2 hover:underline"
          onClick={() => setLocale(locale === "en" ? "id" : "en")}
        >
          {t("language.label")}
        </button>
      </div>
    </footer>
  )
}
