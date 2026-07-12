# Walking-time proximity via self-hosted OSRM

"Nearby" is computed as walking time, not straight-line distance. The
routing engine is OSRM with the foot profile, self-hosted in Docker for
development and on a small VPS (~$5–10/month) for production —
see ADR-0003 for the deployment split. The app calls OSRM's `/table`
endpoint to get durations from the user location to every stop in one
request, then filters and ranks. We deliberately avoid Google Maps /
Mapbox / HERE directions APIs even though they would be turnkey — the
cost, the rate limits, the vendor lock-in, and the privacy posture all
push toward keeping the routing pipeline under our control.

The default walking-time threshold is 10 minutes (~800 m). Stops with
walking time over the threshold are filtered out of the main list.
