/**
 * Format a date in the user's locale, suitable for the "data last
 * updated" footer.
 *
 * Returns a localised loading placeholder when the input is empty
 * or unparseable, so a not-yet-loaded timestamp (or a bad one) doesn't
 * throw at render time.
 */

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "numeric",
})

export function formatDate(iso: string, loadingLabel = "—"): string {
  if (!iso) return loadingLabel
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return loadingLabel
  return DATE_FORMATTER.format(d)
}
