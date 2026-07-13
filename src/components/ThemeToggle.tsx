import { useTranslate } from "../i18n"
import { type Theme, THEMES, useTheme } from "../i18n"

// Three distinct glyphs so the current setting is readable at a
// glance, not just from the dropdown text.
const ICON: Record<Theme, string> = {
  auto:  "\u25D0",  // ◐ half-filled circle (system)
  light: "\u2600",  // ☀ sun
  dark:  "\u25CF",  // ● filled circle (moon)
}

export function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  const t = useTranslate()
  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-fg-muted">
      <span aria-hidden="true" className="text-base leading-none">
        {ICON[theme]}
      </span>
      <select
        className="rounded-md border border-card-border bg-card px-2 py-1 text-sm text-fg"
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        aria-label={t("theme.label")}
      >
        {THEMES.map((th) => (
          <option key={th} value={th}>
            {t(`theme.${th}`)}
          </option>
        ))}
      </select>
    </label>
  )
}
