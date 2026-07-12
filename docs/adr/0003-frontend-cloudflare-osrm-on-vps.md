# Frontend on Cloudflare, OSRM on a self-hosted VPS

The TanStack Start app is deployed to **Cloudflare Pages**. The OSRM
container is deployed to a **small VPS** (~$5–10/month) reachable
from Cloudflare over HTTPS. The two are decoupled — the frontend's
server functions call OSRM over HTTP via the `OSRM_BASE_URL` env
var, the same way the local dev setup does (see ADR-0002).

## Why not everything on Cloudflare

Cloudflare Workers, Pages Functions, and Durable Objects are V8
isolates — 128 MB memory cap, 30s CPU per request, no TCP listeners,
no Docker. OSRM is a stateful C++ server that holds the preprocessed
road graph in RAM (the Java extract preprocesses to several GB)
and listens on TCP. It cannot run in a Worker. Cloudflare
Containers (beta) is technically possible but is priced per
request, suffers from cold starts (which would force a 10–15 min
re-extract on every cold start unless we persist the preprocessed
graph to R2), and has a less mature ecosystem for this workload
than a plain VPS.

A small VPS is the right tool for the job: predictable resources,
cheap, Docker-native, and the same `docker compose up` that works
locally runs unchanged on the server.

## Why Cloudflare for the frontend

Cloudflare Pages is free for hobby projects, gives us a global CDN,
DDoS protection, and HTTPS termination. The TanStack Start build
emits both client and SSR bundles (`vite build` → `dist/client/`,
`dist/server/`); Cloudflare Pages runs the SSR bundle as a Worker.
The work to wire that up is documented in `@tanstack/start-client-core#start-core/deployment`.

## Trade-offs we're accepting

- **Two providers to manage** instead of one. Mitigated by keeping
  each component small: Cloudflare handles the frontend, the VPS
  handles the OSRM container. No shared infrastructure.
- **OSRM is a single point of failure.** If the VPS goes down, the
  app's "nearby" computation falls back to straight-line distance
  (haversine), which the existing `src/server/osrm.ts` already
  handles. The UI shows an amber notice.
- **A VPS means a public IPv4 we have to keep secure.** See
  `docs/deploy-vps.md` for the firewall / SSH / update checklist.

## Picking a VPS provider

Any provider with Docker, a public IPv4, and a Singapore or Jakarta
region is fine. The Java OSM extract is downloaded fresh on first
start, so region doesn't matter for the data; the only network
sensitive piece is serving `/table` requests, which benefits from
low latency to the user. Singapore is the closest common region
for Jakarta users; Tokyo is fine too.

Provider-agnostic checklist:

- **RAM:** 4 GB minimum (the Java preprocess peaks around 2.5 GB).
  2 GB works but is tight.
- **Storage:** 10 GB minimum (the preprocessed graph is ~3 GB).
- **Region:** SG / JKT / Tokyo (closer = lower latency for
  Jakarta-based users).
- **OS:** Ubuntu 24.04 LTS (or 22.04). Anything with a recent
  Docker engine.
- **Backups:** Optional. The preprocessed graph is reproducible
  from the .osm.pbf; we can re-extract on a fresh VPS in ~15 min.
