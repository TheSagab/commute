import { LOCALES, type Locale, useLocale, useTranslate } from "../i18n"

export function LanguageToggle() {
  const [locale, setLocale] = useLocale()
  const t = useTranslate()
  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-fg-muted">
      <span className="sr-only">{t("language.label")}</span>
      <select
        className="rounded-md border border-card-border bg-card px-2 py-1 text-sm text-fg"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {t(`language.${l}`)}
          </option>
        ))}
      </select>
    </label>
  )
}
