# Pluggable provider chain for stops, routes, and arrivals

The data layer for stops, routes, and arrivals is a pluggable provider
chain rather than a direct read of one source. The static JSON provider
is the default for every mode; a live provider (GTFS, third-party API)
can be configured per mode and, when active, takes precedence over the
static JSON for that mode. This keeps the "for now" build trivial while
making it cheap to add a real-time feed later for a single mode without
touching the rest of the app.
