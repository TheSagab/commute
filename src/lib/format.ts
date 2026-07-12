/**
 * Format a date in the user's locale, suitable for the "data last
 * updated" footer.
 */

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "numeric",
})

export function formatDate(iso: string): string {
  return DATE_FORMATTER.format(new Date(iso))
}
