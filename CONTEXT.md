# Commute

A web app that shows a Jakarta public-transport user the next arrivals at
the stops closest to a chosen location. The modes in scope are Jakarta
MRT, KRL Commuter Line, Transjakarta (BRT, Angkutan Umum Integrasi,
Mikrotrans, Transjabodetabek, Rusun, Royaltrans, Bus Wisata), LRT
Jabodebek, and LRT Jakarta. The app supports English and Bahasa
Indonesia.

## Language

**Operator**:
The agency that runs the public-transport service. An operator may
operate one or more sub-services — e.g. Transjakarta runs BRT,
Mikrotrans, and several other product lines. The UI groups cards by
operator (the group header); the sub-service is shown as a small badge
on each card. Examples: PT MRT Jakarta, PT KAI Commuter, PT Transportasi
Jakarta.
_Avoid_: agency, system

**Sub-service**:
A distinct product line within an operator. Sub-services are modeled as
separate `ModeBundle`s in the data layer (one per sub-service) and share
an `operator` field. For Transjakarta the sub-services are exactly the
operator's `route_desc` values: "BRT", "Angkutan Umum Integrasi",
"Mikrotrans", "Transjabodetabek", "Rusun", "Royaltrans", "Bus Wisata".
For operators that are a single sub-service (MRT, KRL, LRT) the
sub-service is the operator.
_Avoid_: mode (the data-layer key for a sub-service), line (overloaded)

**Mode**:
The unique identifier of a sub-service in the data layer. One
`ModeBundle` per mode. For Transjakarta the modes are
`transjakarta-brt`, `transjakarta-angkutan-umum-integrasi`,
`transjakarta-mikrotrans`, `transjakarta-transjabodetabek`,
`transjakarta-rusun`, `transjakarta-royaltrans`,
`transjakarta-bus-wisata`.
_Avoid_: operator (the parent concept)

**Route**:
A single vehicle service pattern within a sub-service: a fixed, ordered
sequence of stops, a headsign, and a set of frequency windows. A GTFS
trip is a Route. A named "line" (MRT North-South, Transjakarta Corridor
1) may be several Routes — one per direction and per variant (a loop, an
express, a via-toll run). The card identifies a Route by its `shortName`
plus headsign, e.g. `9 → Pluit`.
_Avoid_: line (a grouping of routes, not a route), corridor (Transjakarta
BRT only)

**Stop**:
A clustered boarding location where a vehicle picks up or drops off
passengers. Has a name and geographic coordinates used to compute
proximity. The Transjakarta importer clusters per-platform GTFS stops
into one Stop per physical boarding area. A physical Stop may appear in
multiple `ModeBundle`s of the same operator; the chain unifies them at
query time. Transjakarta stops are called *shelters* (halte).
_Avoid_: station (only rail modes), shelter, halte, platform (GTFS's
raw per-platform record, before clustering)

**Arrival**:
The next time a vehicle of a Route reaches a Stop. The app's headline
figure per stop is the time until the soonest future Arrival across the
routes serving it.
_Avoid_: departure (the user cares about arrival time, not terminal
departure)

**Frequency window**:
For a Route, a period (`start`, `end`) during which vehicles depart the
first stop every `headwaySeconds`. A Route has one or more (peak /
off-peak). Roughly GTFS `frequencies.txt`.
_Avoid_: schedule, timetable

**Stop offset**:
For a (Route, Stop) pair, the travel time in seconds from the Route's
first-stop departure to the arrival at that Stop. The first Stop is `0`.
With the frequency windows, it gives "next arrival = window.start +
n × headway + offset".
_Avoid_: travel time (the offset is relative to the first stop, not from
anywhere)

**Service day**:
A day of the week on which a Route runs (0 = Monday … 6 = Sunday),
from GTFS `calendar.txt`. A Route with `[0,1,2,3,4]` runs weekdays only.
_Avoid_: calendar (overloaded), operation day

**Provider**:
A data source for stops, routes, and schedules. A sub-service may have
several configured providers; when more than one is available, a live
provider (GTFS-RT, third-party API) takes precedence over the static
JSON provider. The chain is pluggable so new providers can be added per
sub-service without code changes elsewhere.
_Avoid_: source, feed, API

**Static JSON provider**:
The default provider. A normalized JSON bundle under `src/data/` that
contains stops, routes, and a headway-based schedule per route.
Refreshed by the scraper on a CI schedule.
_Avoid_: bundled data, schedule file

**Live provider**:
Any provider that supplies arrivals in (near-)real time, e.g. a GTFS-RT
feed or a third-party API. A live provider is *active* for a sub-service
if the sub-service has one configured and it is currently reachable.
_Avoid_: realtime, API provider

**User location**:
The point the user is currently interested in, used to rank stops by
distance. Supplied by the browser's geolocation API (GPS) or by manual
input (text search).
_Avoid_: current location, my location, position

**Nearby**:
A stop is nearby if its walking time from the user location is within
the walking-time threshold (default 10 minutes). Walking time comes from
a self-hosted OSRM instance using the foot profile; see ADR-0002.
_Avoid_: close, in range

**Service status**:
Whether a stop has service now: `running` (a route is mid-window),
`beforeHours` (first window starts later), or `afterHours` (all windows
ended). Derived from the frequency windows. For a stop served by several
routes, the headline is the most-permissive combination. The card shows
"Starts at HH:MM" / "Service ended" for the two non-running states.
_Avoid_: operating hours, service hours

**Card**:
A row in the main view's list. One card per nearby physical Stop. The
card shows the stop name, the next-arrival route (shortName → headsign)
on a colour strip, the countdown, and the sub-service badges. Tapping
expands all upcoming arrivals at that stop.
_Avoid_: row, tile, list item

**Trip**:
Out of scope for "for now." The app is arrivals-at-a-location, not
A-to-B routing. (Note: in the data layer "trip" also names the GTFS
concept that maps to a Route — context disambiguates.)
_Avoid_: journey, route plan
