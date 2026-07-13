import { useTranslate } from "../i18n"
import { formatDate } from "../lib/format"
import { LanguageToggle } from "./LanguageToggle"
import { ThemeToggle } from "./ThemeToggle"

type Props = {
  dataLastUpdatedIso: string
}

export function Footer({ dataLastUpdatedIso }: Props) {
  const t = useTranslate()
  return (
    <footer
      className="fixed inset-x-0 bottom-0 z-40 border-t border-card-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      data-testid="app-footer"
    >
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-fg-muted">
        <span>
          {dataLastUpdatedIso
            ? t("app.data_last_updated", { date: formatDate(dataLastUpdatedIso) })
            : t("stops.loading")}
        </span>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </footer>
  )
}
