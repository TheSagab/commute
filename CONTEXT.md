# Commute

A web app that shows a Jakarta public-transport user the next arrivals at
the stops closest to a chosen location. The five modes in scope (for now)
are Jakarta MRT, KRL Commuter Line, Transjakarta, LRT Jabodebek, and LRT
Jakarta. The app supports English and Bahasa Indonesia.

## Language

**Mode**:
One of the five public-transport systems in scope (Jakarta MRT, KRL Commuter
Line, Transjakarta, LRT Jabodebek, LRT Jakarta). Each mode is operated by a
different agency and has its own schedule publication and stop naming.
_Avoid_: operator, system, line

**Route**:
A named line or corridor within a mode, with a fixed ordered sequence of
stops. Examples: MRT North-South line, Transjakarta Corridor 1, LRT
Jabodebek Cibubur–Jabodebek line.
_Avoid_: line (overloaded — also used informally for routes in some modes),
corridor (only applies to Transjakarta)

**Stop**:
A place where a vehicle picks up or drops off passengers. Each stop belongs
to one mode and has a name, an operator-issued code, and geographic
coordinates used to compute proximity. Transjakarta stops are called
*shelters* (halte); for this app they are still stops.
_Avoid_: station (only applies to rail modes), shelter, halte

**Arrival**:
An event in a timetable — a vehicle of a route reaching a stop at a
specific clock time. The app's headline figure per stop is the time until
the next future arrival.
_Avoid_: departure (different modes use different conventions; the user
cares about when a vehicle gets to them, not when it leaves the terminal)

**Provider**:
A data source for stops, routes, and arrivals. A mode may have several
configured providers; when more than one is available for a given query,
a live provider (GTFS, third-party API) takes precedence over the static
JSON provider. The chain is pluggable so new providers can be added per
mode without code changes elsewhere.
_Avoid_: source, feed, API

**Static JSON provider**:
The default provider. A normalized JSON bundle under `src/data/` that
contains stops, routes, and an arrival timetable per (mode, route, stop)
combination. Refreshed manually or on a CI schedule.
_Avoid_: bundled data, schedule file

**Live provider**:
Any provider that supplies arrivals in (near-)real time, e.g. a GTFS-RT
feed or a third-party API. A live provider is *active* for a mode if the
mode has one configured and it is currently reachable.
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
The daily time window during which a mode operates vehicles. Outside
service hours, a stop's card shows "Starts at HH:MM" (before first
service) or "Service ended" (after last service). Service hours are
tracked at the **mode** level — every route in a mode shares the same
window, with a per-route exception carved out for late trains that don't
stop at every station.
_Avoid_: operating hours, schedule window

**Card**:
A row in the main view's list. One card per nearby stop. The card shows
the stop name, the next arrival countdown, the route name, and the
direction. Tapping the card expands to show all upcoming arrivals at
that stop, grouped by route.
_Avoid_: row, tile, list item

**Trip**:
Out of scope for "for now." The app is arrivals-at-a-location, not
A-to-B routing.
_Avoid_: journey, route plan
