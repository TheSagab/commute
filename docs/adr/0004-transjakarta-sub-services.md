# Transjakarta as sub-services of one operator

Transjakarta is one operator (`transjakarta`) running several distinct
sub-services — BRT (the dedicated-lane corridors), Mikrotrans (the
feeder network), and (out of scope for the first cut) Royaltrans.
We model each sub-service as its own `ModeBundle` keyed by
`transjakarta-brt` / `transjakarta-mikrotrans`, sharing the
`operator: "transjakarta"` field so the UI groups them under one
header. The other modes (MRT, KRL, LRT) keep their one-mode-per-
operator shape — `operator` defaults to the mode id and the UI does
not show a sub-service badge.

A sub-service bundle is interchangeable with any other bundle from
the data layer's perspective: same types, same `getUpcoming(mode,
stopId, now)` interface. The only differences are the new `operator`
field and the way the chain resolves cross-bundle queries for
shared physical stops (see below).

## Per-route service hours

A `Route` may set its own `serviceHours`, which overrides the mode-
level `serviceHours` for that route. This exists because some BRT
corridors run 24 hours while most don't — expressing it at the mode
level would force every route in Transjakarta BRT to be 24h, which
is wrong. A 24h route is `{ start: "00:00", end: "24:00" }`; the
existing time math in `static-json.ts` handles this case as
"always running" (no gap). The provider combines per-route service
statuses for a stop using the most-permissive rule: if any route
serving the stop is running, the stop is running; a 24h route
keeps its shelter "running" all night even when neighbouring
corridors are done.

## Shared physical stops

A single physical shelter (e.g. Harmoni Central, Monas) is often
served by both a BRT corridor and a Mikrotrans route. The data
model represents this as a `Stop` record that appears in two
bundles of the same operator with the same `id` and the same
`lat`/`lon`. The chain unifies them at query time — `getNearbyStops`
returns one entry per `(operator, stopId)` whose `upcoming` list is
the union across the shared bundles, sorted ascending. The card
renders once with a small sub-service badge for each. The route
list, "next arrival" headline, and walk time all merge.

## Why this is the right shape

- **Hard to reverse** later. The data model, the chain, the UI, the
  i18n all commit to the operator / sub-service distinction. Moving
  back to a flat `transjakarta` bundle would require unwinding
  several layers.
- **Surprising without context.** A future reader looking at the
  file layout would wonder why Transjakarta has two bundles while
  everything else has one. The `operator` field makes the intent
  explicit.
- **Real trade-off.** Considered three alternatives:
  - One `transjakarta` bundle with a `serviceType: 'brt' | 'mikrotrans'`
    tag on each route. Simpler file layout, but the chain can't
    model "BRT uses static JSON, Mikrotrans gets a live feed later"
    cleanly — a partial provider override isn't a thing today.
  - One `transjakarta` bundle, duplicate stops in the UI by lat/lon
    proximity. Two cards at the same shelter. Consistent with how
    KRL vs MRT already share geographic space, but loses the
    operator grouping.
  - One bundle per sub-service, **no** shared stops. Simpler chain,
    but a physical shelter served by both BRT and Mikrotrans shows
    up as two separate `Stop` records, and the data layer can never
    unifies them because the IDs live in different files.

  Picked option 4 (this one). The cost is that the chain /
  `getNearbyStops` have to do the merge, but the merge is a small,
  testable function. The win is the data layer never has to choose
  between "shares the operator" and "shares the stop."

## Considered but rejected

- **`transjakarta` as a `ModeId` in addition to the sub-services.**
  The operator already covers this role; an extra `ModeId` with no
  bundle of its own would be a placeholder.
- **A `subServiceLabel: Localized` field on the bundle.** The label
  is fully derivable from the `mode` field via i18n keys
  (`sub-service.transjakarta-brt → "BRT"`, etc.). Adding a field
  to the bundle would duplicate the i18n lookup.

## Consequences

- `ModeId` gains `transjakarta-brt` and `transjakarta-mikrotrans`;
  the old `transjakarta` is gone.
- `loadAllBundles` returns six bundles; `loadByOperator("transjakarta")`
  returns the two sub-services.
- The chain unifies shared stops inside the server function
  (`getNearbyStops`), not inside the static-JSON provider — the
  provider stays simple and per-sub-service, and the unifier is
  testable in isolation.
- The i18n gains `operator.transjakarta`, `sub-service.transjakarta-brt`,
  `sub-service.transjakarta-mikrotrans`; `mode.transjakarta` is
  removed.
- The "Stops are unique within the mode" invariant in the data
  format doc is weakened to "Stops are unique within a bundle; a
  stop with the same `id` may also appear in another bundle of the
  same operator." The same change to the `Stop` type's docstring.
