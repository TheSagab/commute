# commute

A web app that shows a Jakarta public-transport user the next arrivals at the
stops closest to a chosen location. The five modes in scope (for now) are
Jakarta MRT, KRL Commuter Line, Transjakarta, LRT Jabodebek, and LRT Jakarta.
The app supports English and Bahasa Indonesia.

## How it works

1. The app prompts for GPS, or falls back to a text search (Nominatim).
2. The location is sent to a self-hosted [OSRM](http://project-osrm.org/)
   instance, which returns walking times to every stop in the data bundle.
3. The data layer (a pluggable provider chain — see
   `docs/adr/0001-pluggable-provider-chain.md`) returns the next arrival at
   each nearby stop. The static JSON provider is the default.
4. The app renders a list of cards, one per nearby stop, with a live
   countdown to the next arrival.
5. Each card has three states: countdown, "Starts at HH:MM" (before first
   service), and "Service ended" (after last service).

The product is defined by `CONTEXT.md` (glossary) and `docs/adr/`
(architectural decisions). Read those before changing anything.

## Local development

```sh
# One-time setup
mise install
pnpm install
docker compose up osrm          # self-hosted routing engine

# Day-to-day
pnpm dev                        # http://localhost:3000
pnpm tsc --noEmit               # type-check
pnpm test                       # vitest (no specs yet)
pnpm build                      # client + ssr bundles
```

`OSRM_BASE_URL` defaults to `http://localhost:5000`. The OSRM container
downloads the Jakarta OSM extract and runs the foot-profile partition on
first start (~5 min); subsequent starts are seconds.

## Project layout

```
src/
├── routes/                     # file-based router
├── components/                 # UI primitives
├── data/                       # bundled static JSON per mode
├── server/                     # server-only modules (OSRM, providers)
└── ...

docs/
├── adr/                        # architectural decision records
└── ...

CONTEXT.md                      # glossary (domain language)
AGENTS.md                       # durable project context for AI agents
```

## Environment variables

| Name              | Server/Client | Default                  | Purpose                          |
|-------------------|---------------|--------------------------|----------------------------------|
| `OSRM_BASE_URL`   | server        | `http://localhost:5000`  | Base URL of the OSRM HTTP API    |

See `AGENTS.md` for the full env-var table and the conventions for adding
new ones.

## Stack

React 19, TanStack Start, TanStack Router, Vite 8, Tailwind v4,
TypeScript 7, Vitest 4. See `AGENTS.md` for the full table.

## License

See `LICENSE`.
