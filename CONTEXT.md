# Commute

A web app that shows a Jakarta public-transport user the next arrivals at
the stops closest to a chosen location. The five modes in scope (for now)
are Jakarta MRT, KRL Commuter Line, Transjakarta (BRT + Mikrotrans),
LRT Jabodebek, and LRT Jakarta. The app supports English and Bahasa
Indonesia.

## Language

**Operator**:
The agency that runs the public-transport service. An operator may
operate one or more sub-services — e.g. Transjakarta runs both BRT
corridors and Mikrotrans feeders. The UI groups cards by operator
(the group header); the sub-service is shown as a small badge on
each card. Examples: PT MRT Jakarta, PT KAI Commuter, PT Transportasi
Jakarta.
_Avoid_: agency, system

**Sub-service**:
A distinct product line within an operator. Sub-services are
modeled as separate `ModeBundle`s in the data layer (one per
sub-service) and share an `operator` field. Examples: Transjakarta
BRT, Transjakarta Mikrotrans. For operators that are a single
sub-service (MRT, KRL, LRT) the sub-service is the operator.
_Avoid_: mode (used at the data layer for the unique sub-service id),
line (overloaded)

**Mode**:
The unique identifier of a sub-service in the data layer. One
`ModeBundle` per mode. Equals the sub-service name for single-
sub-service operators; for Transjakarta the modes are
`transjakarta-brt` and `transjakarta-mikrotrans`.
_Avoid_: operator (the operator is the parent concept)

**Route**:
A named line or corridor within a sub-service, with a fixed ordered
sequence of stops. Examples: MRT North-South line, Transjakarta
Corridor 1, Mikrotrans M1, LRT Jabodebek Cibubur–Jabodebek line.
_Avoid_: line (overloaded — also used informally for routes in some
modes), corridor (only applies to Transjakarta BRT)

**Stop**:
A place where a vehicle picks up or drops off passengers. Each stop
has a name, an operator-issued code, and geographic coordinates used
to compute proximity. Transjakarta stops are called *shelters*
(halte); for this app they are still stops. A physical stop may
appear in multiple `ModeBundle`s of the same operator (e.g. a BRT
shelter that doubles as a Mikrotrans stop) — the chain unifies them
at query time.
_Avoid_: station (only applies to rail modes), shelter, halte

**Arrival**:
An event in a timetable — a vehicle of a route reaching a stop at a
specific clock time. The app's headline figure per stop is the time until
the next future arrival.
_Avoid_: departure (different modes use different conventions; the user
cares about when a vehicle gets to them, not when it leaves the terminal)

**Provider**:
A data source for stops, routes, and arrivals. A sub-service may
have several configured providers; when more than one is available
for a given query, a live provider (GTFS, third-party API) takes
precedence over the static JSON provider. The chain is pluggable so
new providers can be added per sub-service without code changes
elsewhere.
_Avoid_: source, feed, API

**Static JSON provider**:
The default provider. A normalized JSON bundle under `src/data/` that
contains stops, routes, and an arrival timetable per (mode, route, stop)
combination. Refreshed manually or on a CI schedule.
_Avoid_: bundled data, schedule file

**Live provider**:
Any provider that supplies arrivals in (near-)real time, e.g. a GTFS-RT
feed or a third-party API. A live provider is *active* for a sub-service
if the sub-service has one configured and it is currently reachable.
_Avoid_: realtime, API provider

**Timetable**:
For a (mode, route, stop) triple, the list of clock times at which
vehicles on that route are scheduled to arrive at that stop. The static
provider's primary data.
_Avoid_: schedule (broader; e.g. the operator's full daily plan includes
non-stopping services)

**User location**:
The point the user is currently interested in, used to rank stops by
distance. Supplied by the browser's geolocation API (GPS) or by manual
input (text search or map click).
_Avoid_: current location, my location, position

**Nearby**:
A stop is nearby if its walking time from the user location is within
the walking-time threshold (default 10 minutes). Walking time comes from
a self-hosted OSRM instance using the foot profile; see ADR-0002.
_Avoid_: close, in range

**Service hours**:
The daily time window during which a sub-service operates vehicles.
Outside service hours, a stop's card shows "Starts at HH:MM" (before
first service) or "Service ended" (after last service). Default is
the sub-service-level service hours; a `Route` may set its own
`serviceHours` to override (e.g. a 24h BRT corridor in a mode whose
default hours are 05:00–22:00). For a stop served by multiple routes,
the headline status is the most-permissive combination across the
serving routes.
_Avoid_: operating hours, schedule window

**Card**:
A row in the main view's list. One card per nearby physical stop. The
card shows the stop name, the next arrival countdown, the route name,
the sub-service badge, and the direction. Tapping the card expands to
show all upcoming arrivals at that stop, grouped by route.
_Avoid_: row, tile, list item

**Trip**:
Out of scope for "for now." The app is arrivals-at-a-location, not
A-to-B routing.
_Avoid_: journey, route plan
