<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

# Project Context

`commute` is a web app that shows a Jakarta public-transport user the next
arrivals at the stops closest to a chosen location. The five modes in scope
(for now) are Jakarta MRT, KRL Commuter Line, Transjakarta, LRT Jabodebek,
and LRT Jakarta. The app supports English and Bahasa Indonesia.

The product is defined by `CONTEXT.md` (the glossary) and the ADRs in
`docs/adr/`. **Read those before making changes** — they pin the domain
language and the architectural decisions.

## Status (current build)

The MVP is wired end-to-end:

- Data layer (pluggable provider chain; static-JSON provider is the only
  one wired up) — see ADR-0001.
- Self-hosted OSRM in `docker-compose.yml` for walking-time proximity —
  see ADR-0002.
- Static-JSON provider with 8 passing tests covering service-status
  classification and "next arrival" lookup.
- Per-mode data generators under `scripts/gen-*-data.ts` for all six
  sub-services (MRT, KRL, Transjakarta BRT, Transjakarta Mikrotrans,
  LRT Jabodebek, LRT Jakarta). **MRT, LRT, and Transjakarta BRT are
  full datasets** (every station / every corridor / every departure /
  every direction — BRT has all 14 corridors; Corridor 9 is 24h, the
  rest use the mode-level 05:00–22:00 default). **KRL is a sample**
  (5 stations) and **Transjakarta Mikrotrans is a curated set of 25
  representative routes** — the CI scraper will fill in the rest.
  See ADR-0004 for the Transjakarta sub-service shape.
- `index` route: GPS prompt → text-search fallback → OSRM call → card
  list with live countdowns. Footer shows the "data last updated"
  timestamp and a language toggle.
- i18n (English + Bahasa) with locale persisted to `localStorage`.
- Weekly CI workflow that re-runs the data generator and bumps
  `_meta.json`.

Next: real scrapers per operator (replace `gen-*-data.ts`), pick a
deployment target, expand the sample datasets.

## Toolchain (mise)

This repo pins `node` and `pnpm` to `latest` via [mise](https://mise.jdx.dev).
Activate mise in your shell (`mise activate bash` / `mise activate zsh`) or
use `mise exec -- <cmd>` for one-off commands. A `.tool-versions`-style lock
is not committed on purpose — `latest` rolls forward.

```toml
# mise.toml
[tools]
node = "latest"
pnpm = "latest"
```

After cloning, run `mise install` (or `mise trust && mise install`) to
fetch the toolchain. The shims live at
`~/.local/share/mise/shims/`; if `node` / `pnpm` / `npx` are not on
`PATH` after activating mise, add that directory to `PATH` directly.

## How this project was scaffolded

The directory already contained a platform template (only `.git`,
`LICENSE`, `mise.toml`). The TanStack CLI was run in a scratch directory
and the result was merged in.

```sh
npx -y @tanstack/cli@latest create my-tanstack-app \
  --agent \
  --package-manager pnpm \
  --tailwind
```

Notes from that run:

- The `--tailwind` flag is **deprecated and ignored** — Tailwind v4 is
  always enabled in TanStack Start scaffolds. Kept for now (harmless,
  self-documenting).
- The CLI's "blank" / base template does not have an opt-out for the
  example chrome (`Header`, `Footer`, `ThemeToggle`, the home island,
  the `about` route, the `THEME_INIT_SCRIPT`). These were preserved
  as-is during scaffolding and then deleted when the real app was
  built — the only survivors are the parts of `__root.tsx` that
  TanStack Start needs (the document shell).
- The CLI's first `pnpm install` failed inside the scratch directory
  because `mise` had no global `pnpm` version set. Fix was
  `mise use -g pnpm@10.34.5`. After the merge, the install was
  re-run from the project root.

The package name in `package.json` and `.cta.json` was changed from
`my-tanstack-app` to `commute`. `LICENSE` and the original git history
were preserved.

## TanStack Intent follow-ups

```sh
pnpm dlx @tanstack/intent@latest list    # discover available skills
pnpm dlx @tanstack/intent@latest load <package>#<skill>   # read one on demand
```

`npx @tanstack/intent@latest install` (run once during scaffolding)
seeds this `AGENTS.md` with the `intent-skills` block at the top. It
does not materialize a `skills/` directory — `load` prints the
`SKILL.md` to stdout on demand, and skills are also discoverable
inside `node_modules` (`@tanstack/<pkg>/skills/...`).

Skills that are relevant as the build progresses:

- `@tanstack/start-client-core#start-core` — TanStack Start
  architecture (Vite plugin, `getRouter()`, root document shell,
  entry points).
- `@tanstack/start-client-core#start-core/server-functions` —
  `createServerFn` (used for the OSRM, provider, and Nominatim
  calls).
- `@tanstack/start-client-core#start-core/execution-model` —
  `createServerFn`, `createClientOnlyFn`, environment-boundary
  helpers.
- `@tanstack/router-core#router-core` — routing fundamentals.
- `@tanstack/router-core#router-core/data-loading` — loaders for
  per-stop arrival data.
- `@tanstack/start-client-core#start-core/deployment` — load before
  picking a deployment target.

**Load these before adding server-only code, environment-boundary
helpers, or data loaders.**

## opencode skills (skills.sh)

`npx skills@latest add <owner>/<repo>` installs agent skills
(separate from TanStack Intent). Skills can live in two scopes:

- **Global** — under `~/.agents/skills/<name>/`. Available to every
  project the agent opens. Use for skills that don't depend on a
  specific repo (e.g. `grill-with-docs`, `grilling`,
  `domain-modeling`).
- **Project** — under `<project>/.agents/skills/<name>/`. Scoped
  to one repo, committed alongside the code. Use for skills that
  are only meaningful in this codebase.

The installer also writes `skills-lock.json` (project-scope only)
for reproducibility. The current repo has no project-scoped skills.

```sh
npx skills@latest list                   # project skills
npx skills@latest list -g                # global skills
npx skills@latest add <owner>/<repo> -s <name> -g -y   # install globally
npx skills@latest add <owner>/<repo> -s <name> -a opencode -g -y   # + target opencode
npx skills@latest update [<name>] -g     # refresh
npx skills@latest remove <name>         # remove from project
```

Currently installed **globally** for this user:

- `grill-with-docs` (mattpocock/skills) — user-invoked interview
  that sharpens a plan and writes ADRs / glossary entries as it
  goes.
- `grilling` (mattpocock/skills, productivity) — the reusable
  interview loop that `grill-with-docs` delegates to.
- `domain-modeling` (mattpocock/skills, engineering) — builds and
  sharpens the project's domain model (`CONTEXT.md`, glossary,
  ADRs); also delegated to by `grill-with-docs`.

## Stack

| Concern         | Choice                                              |
|-----------------|-----------------------------------------------------|
| Framework       | React 19                                            |
| Meta-framework  | TanStack Start (SSR, file-based router)             |
| Router          | TanStack Router (file-based)                        |
| Build / dev     | Vite 8                                              |
| Styling         | Tailwind CSS v4 (`@tailwindcss/vite`)               |
| Routing engine  | OSRM (self-hosted, foot profile) — see ADR-0002     |
| Data layer      | Pluggable provider chain; static JSON default — see ADR-0001 |
| i18n            | English + Bahasa Indonesia (custom minimal module)  |
| Maps            | None (list-only)                                    |
| Lint / format   | _none_ (deliberate — add when team wants one)       |
| Tests           | Vitest 4 + Testing Library (8 tests)                |
| Package manager | pnpm 10 (via mise)                                  |
| Type checker    | TypeScript 7                                        |

No partner integrations (Convex, Clerk, Supabase, Sentry, etc.) are
wired up. The product is a small self-contained app for personal
use; add integrations only when a feature requires them.

## Environment variables

| Name              | Server/Client | Required at | Purpose                          | Local dev default       |
|-------------------|---------------|-------------|----------------------------------|-------------------------|
| `OSRM_BASE_URL`   | server        | runtime     | Base URL of the OSRM HTTP API    | `http://localhost:5000` |

Only `VITE_*`-prefixed variables are exposed to the client. New
variables added later must be documented here with the same columns.

## Scripts

```sh
pnpm dev               # vite dev --port 3000
pnpm build             # vite build (client + ssr)
pnpm preview           # vite preview
pnpm generate-routes   # tsr generate — regenerate src/routeTree.gen.ts
pnpm gen-data          # re-run every scripts/gen-*-data.ts (writes src/data/*.json)
pnpm scrape-data       # the CI entry point — gen-data + bump _meta.json timestamp
pnpm test              # vitest run (8 tests, all green)
pnpm tsc --noEmit      # type-check only (no script in package.json)
```

## Project layout

```
src/
├── routes/                     # file-based router (TanStack Start)
│   ├── __root.tsx              # document shell
│   └── index.tsx               # the main "find nearby stops" route
├── components/                 # UI primitives
│   ├── LocationGate.tsx        # GPS prompt + text-search fallback
│   ├── StopCard.tsx            # one card with countdown + expand
│   ├── StopList.tsx            # list of cards
│   ├── Footer.tsx              # "data last updated" + language toggle
│   └── LanguageToggle.tsx      # <select> for the two locales
├── data/                       # bundled static JSON (server-only)
│   ├── _meta.json              # bundle metadata + dataLastUpdated
│   ├── mrt-jakarta.json        # 13 stations, 2 directions
│   ├── krl-commuter.json       # 5 stations, 1 line, 2 directions (sample)
│   ├── transjakarta.json       # 11 stops, 1 corridor, 2 directions (sample)
│   ├── lrt-jabodebek.json      # 14 stations, 1 line, 2 directions
│   ├── lrt-jakarta.json        # 6 stations, 1 line, 2 directions
│   ├── types.ts                # data model (TS types)
│   └── load.ts                 # server-only JSON loaders
├── i18n/                       # custom minimal i18n
│   ├── index.ts                # useLocale, useTranslate, getLocale, setLocale
│   ├── en.json                 # English strings
│   └── id.json                 # Bahasa Indonesia strings
├── lib/                        # shared client+server helpers
│   ├── geo.ts                  # LatLon type
│   └── format.ts               # date formatter for the footer
├── server/                     # server-only modules
│   ├── osrm.ts                 # OSRM /table client + haversine fallback
│   ├── get-nearby-stops.ts     # the main server function
│   ├── get-meta.ts             # exposes dataLastUpdated to the client
│   ├── search-place.ts         # Nominatim text-search fallback
│   └── providers/
│       ├── types.ts            # Provider interface
│       ├── chain.ts            # chain resolver + the default chain
│       └── static-json.ts      # the static-JSON provider + tests
├── router.tsx
├── routeTree.gen.ts            # generated by `pnpm generate-routes`
└── styles.css                  # tailwind v4 + base tokens

scripts/                        # Node data generators + scraper stubs
├── gen-*-data.ts               # per-mode hand-curated data expanders
├── gen-all.ts                  # runs all of the above
└── scrape-all.ts               # CI entry point

docs/
├── adr/                        # architectural decision records
│   ├── 0001-pluggable-provider-chain.md
│   └── 0002-walking-time-via-self-hosted-osrm.md
└── data-format.md              # the static-JSON shape spec

docker-compose.yml              # OSRM (self-hosted, foot profile, jakarta extract)
.github/workflows/scrape-data.yml
CONTEXT.md                      # glossary
AGENTS.md                       # this file
```

## Data layer

- `src/data/<mode>.json` — one file per sub-service, shape documented
  in `docs/data-format.md`. For Transjakarta the modes are
  `transjakarta-brt` and `transjakarta-mikrotrans`; both share
  `operator: "transjakarta"`. Stops with the same `id` MAY appear in
  both bundles (a physical shelter served by a BRT corridor and a
  Mikrotrans route) — Mikrotrans uses BRT stop ids for the shared
  locations so the chain unifies them at query time (see ADR-0004).
  Per-route `serviceHours` overrides the sub-service-level default
  (used for 24h BRT corridors, currently Corridor 9).
- `src/data/_meta.json` — bundle metadata including the
  `dataLastUpdated` timestamp the footer shows.
- `src/server/providers/static-json.ts` — the default provider;
  reads the bundles, computes "next arrival" and service status.
- `src/server/providers/chain.ts` — the provider chain resolver
  (only the static-JSON provider is wired up; future live providers
  plug in here, see ADR-0001).
- `src/server/osrm.ts` — OSRM `/table` client with a haversine
  fallback for when the routing service is offline.

## OSRM (local development)

OSRM is self-hosted per ADR-0002. For local dev:

1. `docker compose up osrm` — pulls
   `ghcr.io/project-osrm/osrm-backend:26.7.3-debian` (the official
   image lives on GHCR, not Docker Hub), downloads the Java OSM
   extract from Geofabrik (~850 MB — Geofabrik's Indonesia index has
   no `jakarta-latest.osm.pbf`; Java is the smallest sub-region that
   contains Jakarta + the KRL network's reach), runs the foot-profile
   extract / partition / customize pipeline, and starts the HTTP
   server on `localhost:5000`. The preprocessed graph is cached in
   the `commute-osrm-data` named volume so subsequent starts are
   seconds.
2. The app reads `OSRM_BASE_URL` (default `http://localhost:5000`)
   and calls the `/table` endpoint to compute walking times from
   the user location to every stop in one request. In production
   the same env var is set to the VPS public URL — see
   `docs/deploy-vps.md` §"Wire the TanStack Start app".

The container's init logic lives at `scripts/osrm-init.sh` (mounted
read-only into the container at `/usr/local/bin/osrm-init.sh`). The
script installs `wget` via `apt-get` on first run if neither `curl`
nor `wget` is in the image, validates the downloaded PBF, runs the
extract / partition / customize pipeline, and `exec`s the router
so it becomes PID 1.

The Jakarta OSM extract is ~50 MB compressed. First start takes
~5 min for the extract / partition / customize pipeline.

## Deployment

**Frontend → Cloudflare Pages. OSRM → small VPS (~$5–10/month).**
See `docs/adr/0003-frontend-cloudflare-osrm-on-vps.md` for the
reasoning (Cloudflare Workers can't run OSRM; a VPS is the
right tool for a stateful, memory-hungry container) and
`docs/deploy-vps.md` for the step-by-step VPS setup.

In production the frontend reads `OSRM_BASE_URL` from its env
vars and calls the OSRM container over HTTPS. The container runs
the same `docker compose up` as local dev — no code changes
between the two.

The two are decoupled: the OSRM container can be on a different
provider than Cloudflare without affecting the frontend, and the
frontend can be moved off Cloudflare without affecting OSRM.

Production-specific compose overrides live in
`docker-compose.override.yml` (port bind to 127.0.0.1, restart
policy). The base `docker-compose.yml` stays portable.

## Architectural decisions

- **Pluggable provider chain** for stops/routes/arrivals — see
  `docs/adr/0001-pluggable-provider-chain.md`.
- **Walking-time proximity via self-hosted OSRM** — see
  `docs/adr/0002-walking-time-via-self-hosted-osrm.md`.
- **Static JSON is the default data source**, refreshed by a CI
  workflow on a weekly cadence. The footer shows the
  "data last updated" timestamp.
- **List-only UI** — no map renderer. The location is shown as
  a text label; manual fallback is text search via Nominatim.
- **Three-state cards** — countdown / "Starts at HH:MM" / "Service
  ended" — using mode-level service hours.
- **File-based router** with `tsr generate` building
  `src/routeTree.gen.ts` on demand. Do not edit by hand;
  git-ignored.
- **SSR by default.** `vite build` emits both `dist/client/` and
  `dist/server/`.
- **Devtools are conditional in production** — `@tanstack/devtools-vite`
  strips the devtools component from `__root.tsx` during
  `vite build`.
- **TypeScript path aliases**: `#/*` and `@/*` both resolve to
  `./src/*` (see `tsconfig.json`).
- **No global state, no data library.** The provider chain is
  the only data layer.

## Known gotchas

- `pnpm` shims in this environment require either a `mise.toml`
  entry or `mise use -g pnpm@<version>` to resolve.
- `tsr.config.json` and `vite.config.ts` are the only config
  files; there is no `eslint.config.*`, `prettier.config.*`, or
  `.editorconfig`. Add them explicitly when you want them.
- The default `tsconfig.json` enables `noUnusedLocals` /
  `noUnusedParameters` and `verbatimModuleSyntax`. Unused imports
  fail the type check.
- OSRM is a separate process. The app calls it over HTTP; if
  OSRM is down, the app falls back to straight-line distance
  (haversine) so the user still sees something. The fallback is
  surfaced in the UI as an amber notice.
- The static JSON is a snapshot. Service-hours exceptions (last
  train doesn't stop at every station) are **not** yet modeled —
  the static data assumes the full timetable applies to every
  stop on a route. See `docs/data-format.md` for the open
  questions.
- KRL and Transjakarta are **samples** (a few stations / one
  corridor) — the rest of each network is built by the future
  scraper. The provider handles the empty case by returning no
  results.
- The data layer trusts the user's local clock. If a user is
  outside Jakarta (e.g. on a VPN), the wall-clock times in the
  timetable won't match their clock. A future fix is to compute
  the user's "Jakarta-local now" via `Intl.DateTimeFormat` rather
  than trusting the system clock.

## Next steps

1. **Write real scrapers** per operator. Replace the hand-curated
   `gen-*-data.ts` scripts with fetchers that read each operator's
   published schedule and normalize to `ModeBundle`. The CI
   workflow already calls the entry point.
2. **Expand the KRL and Transjakarta datasets** to the full
   network (80+ KRL stations, 250+ Transjakarta shelters).
3. **Pick a deployment target** (load
   `@tanstack/start-client-core#start-core/deployment`). The OSRM
   container needs to be hosted alongside the chosen target.
4. **Add a lint script** (Biome or ESLint + Prettier) when the
   team wants one. The MVP deliberately ships without one.
5. **Timezone correctness.** Compute "Jakarta-local now" via
   `Intl.DateTimeFormat` so the countdowns are correct regardless
   of the user's clock.
6. **Test on a real device** with real geolocation, then tune
   the haversine fallback threshold and the OSRM timeout.
