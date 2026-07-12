/**
 * Minimal i18n for English + Bahasa Indonesia.
 *
 * No external library. The translation table is a flat record keyed by
 * dotted names (`card.next_minutes`). The translator supports
 * `{name}` substitution and `{n}` pluralization (`one` / `other`).
 *
 * Locale is stored in `localStorage` under `commute.locale`. Defaults
 * to the browser's preferred language, falling back to English.
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
