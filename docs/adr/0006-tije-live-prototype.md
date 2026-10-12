# Tije live provider — prototype (unofficial realtime)

Transjakarta has no public GTFS-RT feed. Its live vehicle positions —
the ones the official TJ:Transjakarta app shows — live behind a private
backend that a community project (github.com/mugnimaestra/tj-live) has
reverse-engineered:

- **REST**: `https://tijeapi.transjakarta.co.id`
  - `POST /v1/auth/login/guest` `{ device_id }` → short-lived guest JWT
  - `GET /v1/bus?latitude=&longitude=&radius=` → buses near a point,
    each with a `stops[]` array carrying per-stop `eta` (seconds)
  - requires spoofed Android-app headers (`User-Agent: okhttp/4.12.0`,
    `X-App-OS: android`, `X-App-Version`, `X-Device-ID`)
- **MQTT**: `wss://mqtt.tj.co.id:8084/mqtt` (anonymous), topics
  `/mobile_armada/XXXX-YYYY/#` — push updates. Not used yet; the
  prototype polls REST.

We added `src/server/providers/tije-live.ts`, a provider that wraps the
static-JSON provider and overlays live ETAs. **Off by default**, gated
on `TIJE_LIVE=1`. When on, for each nearby stop it fetches live vehicles,
matches the soonest vehicle per route by `trip_id` (which equals our
`Route.id` — both come from the same GTFS feed), and returns a live
arrival marked `source: "live"`. When there's no live data, or the API
errors, it delegates to the static schedule, so the app never regresses
to an empty list. The card shows a small "● Live" marker.

## Why it's a prototype and not the default

- **Unofficial.** The endpoints and the required headers are
  reverse-engineered from the app. There is no documented ToS covering
  third-party use, and the header spoofing almost certainly violates it.
- **Fragile.** The token flow, header values, and response shape can
  change without notice. The response shape already varies (`data` is
  sometimes an array, sometimes `{ buses }`), which we handle
  defensively.
- **Load.** A full-radius query returns ~3,900 buses; we proxy it. Fine
  for personal use, not for a service with real traffic.
- **No realtime model.** The API's per-stop `eta` is occasionally a
  placeholder (0/1) for a parked vehicle; we fall back to a rough
  distance/dwell estimate. Good enough to prove the concept, not a
  real ETA model.

## What "switching it on" costs

`TIJE_LIVE=1` in the environment. No other config. The provider is a
no-op (always inactive) when the flag is unset, so the default build is
unchanged.

## If Transjakarta publishes an official GTFS-RT feed

Retire this provider and add a GTFS-RT one. The chain and the
`source: "live"` plumbing stay; only the data fetch changes.
