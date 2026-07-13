/**
 * Minimal i18n for English + Bahasa Indonesia.
 *
 * No external library. The translation table is a flat record keyed by
 * dotted names (`card.next_minutes`). The translator supports
 * `{name}` substitution and `{n}` pluralization (`one` / `other`).
 *
 * Locale is stored in `localStorage` under `commute.locale`. Defaults
 * to the browser's preferred language, falling back to English.
 *
 * Theme (light / dark / auto) is stored in `localStorage` under
 * `commute.theme` and applied via a `.dark` class on the html
 * element. `auto` follows the OS's `prefers-color-scheme`.
 */

import { useEffect, useState } from "react"
import en from "./en.json"
import id from "./id.json"

export type Locale = "en" | "id"

export const LOCALES: Locale[] = ["en", "id"]
export const DEFAULT_LOCALE: Locale = "en"

const STORAGE_KEY = "commute.locale"

const TABLES: Record<Locale, Record<string, string>> = { en, id }

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === "en" || stored === "id") return stored
  const browser = window.navigator.language.toLowerCase()
  if (browser.startsWith("id")) return "id"
  return DEFAULT_LOCALE
}

type Listener = (locale: Locale) => void
const listeners = new Set<Listener>()

let currentLocale: Locale = DEFAULT_LOCALE

export function getLocale(): Locale {
  if (typeof window !== "undefined") {
    currentLocale = detectInitialLocale()
  }
  return currentLocale
}

export function setLocale(locale: Locale) {
  currentLocale = locale
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, locale)
    for (const l of listeners) l(locale)
  }
}

export function useLocale(): [Locale, (l: Locale) => void] {
  const [locale, setLocaleState] = useState<Locale>(getLocale())
  useEffect(() => {
    const l = (next: Locale) => setLocaleState(next)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return [locale, setLocale]
}

// ---------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------

export type Theme = "auto" | "light" | "dark"
export const THEMES: Theme[] = ["auto", "light", "dark"]
export const DEFAULT_THEME: Theme = "auto"

const THEME_STORAGE_KEY = "commute.theme"
const HTML_CLASS = "dark"
const SYSTEM_PREF_QUERY = "(prefers-color-scheme: dark)"

function isTheme(value: unknown): value is Theme {
  return value === "auto" || value === "light" || value === "dark"
}

function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isTheme(stored) ? stored : null
}

function applySystemPref() {
  if (typeof window === "undefined") return
  const isDark = window.matchMedia(SYSTEM_PREF_QUERY).matches
  document.documentElement.classList.toggle(HTML_CLASS, isDark)
}

/** Apply a user-chosen theme to the DOM. Idempotent. */
export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return
  if (theme === "dark") {
    document.documentElement.classList.add(HTML_CLASS)
  } else if (theme === "light") {
    document.documentElement.classList.remove(HTML_CLASS)
  } else {
    // "auto" — drop the user override and let the system decide.
    applySystemPref()
  }
}

let currentTheme: Theme = DEFAULT_THEME

type ThemeListener = (theme: Theme) => void
const themeListeners = new Set<ThemeListener>()

export function getTheme(): Theme {
  if (typeof window !== "undefined") {
    currentTheme = readStoredTheme() ?? DEFAULT_THEME
  }
  return currentTheme
}

export function setTheme(theme: Theme) {
  currentTheme = theme
  if (typeof window !== "undefined") {
    if (theme === DEFAULT_THEME) {
      window.localStorage.removeItem(THEME_STORAGE_KEY)
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    }
    applyTheme(theme)
    for (const l of themeListeners) l(theme)
  }
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(getTheme())
  useEffect(() => {
    const l = (next: Theme) => setThemeState(next)
    themeListeners.add(l)
    return () => {
      themeListeners.delete(l)
    }
  }, [])
  return [theme, setTheme]
}

// Wire the system-pref listener once. We only care when the user is
// in "auto" mode; the listener re-applies whatever the current
// state should be whenever the OS theme changes. Defensive: skip if
// matchMedia isn't available (e.g. in some test environments).
if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  try {
    window.matchMedia(SYSTEM_PREF_QUERY).addEventListener("change", () => {
      if (getTheme() === "auto") applySystemPref()
    })
  } catch {
    // ignore — matchMedia is best-effort
  }
}

type Params = Record<string, string | number>

function substitute(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
}

export function translate(locale: Locale, key: string, params?: Params): string {
  const table = TABLES[locale] ?? TABLES[DEFAULT_LOCALE]
  const template = table[key] ?? TABLES[DEFAULT_LOCALE][key] ?? key
  return substitute(template, params)
}

export function useTranslate(): (key: string, params?: Params) => string {
  const [locale] = useLocale()
  return (key, params) => translate(locale, key, params)
}
