import { LOCALES, type Locale, useLocale, useTranslate } from "../i18n"

export function LanguageToggle() {
  const [locale, setLocale] = useLocale()
  const t = useTranslate()
  return (
    <label className="inline-flex items-center gap-2 text-sm text-neutral-600">
      <span className="sr-only">{t("language.label")}</span>
      <select
        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm"
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
