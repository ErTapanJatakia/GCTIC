# GCTIC — Global Cyber Threat Intelligence Command Centre

<p align="justify">
A global, geospatially enriched Cyber Threat Intelligence (CTI) platform for defensive security operations, portfolio-grade engineering demonstration and research use. 
</p>

> **Current status: Phase 1.5 — Local intelligence data foundation.** This repository contains
> the application shell, design system, domain contracts, a local JSON/GeoJSON ingestion
> pipeline (validation → normalisation → deduplication → `ThreatIndicator`) and a functional IOC
> Explorer. Every record comes from a bundled **synthetic** dataset; no live feed is collected
> and no geospatial visualisation is active. Nothing in this build should inform an operational
> security decision.

- **Licence:** Apache License 2.0 (see [LICENSE](LICENSE))
- **Runtime cost:** INR 0 — no paid services, no trial dependencies, no telemetry, no API keys
- **Data mode:** `DEMO` — no live intelligence sources are connected

<img width="1685" height="948" alt="GCTI1" src="https://github.com/user-attachments/assets/ae443ccf-d076-44e5-a6f7-339ef17f7eb0" />

---

## 1. Objectives

GCTIC exists to demonstrate and support three things:

1. **Professional engineering:** a maintainable, typed, tested frontend architecture suitable
   for a real security product rather than a dashboard prototype.
2. **Research-grade CTI practice:** provenance-preserving intelligence records, explicit
   assessment grading, and honest handling of uncertainty and attribution.
3. **Operational usefulness:** a dense, legible command interface designed for analysts working
   extended shifts on high-resolution and small screens alike.

The platform is designed to consolidate open-source reporting into a single operational
picture while keeping every datum traceable to the source that supplied it.

---

## 2. Current implementation status

| Area | Status | Notes |
| --- | --- | --- |
| Application shell, routing, responsive navigation | **Implemented** | Header, sidebar, off-canvas tablet drawer, skip link |
| Design token system and component library | **Implemented** | Panels, badges, tables, metrics, loading / empty / error states |
| Intelligence domain model | **Implemented** | Provenance, assessment grades, confidence bounds, GeoJSON-ready types |
| Validation and safe-handling utilities | **Implemented** | IOC validation, URL safety, IP scope classification, text sanitiser |
| Provider adapter contract and registry | **Implemented** | One local file-backed adapter registered |
| Local ingestion pipeline | **Implemented** | JSON + GeoJSON parsing, per-source observations, deduplication |
| Observable normalisation | **Implemented** | IPv4, IPv6 (RFC 5952), domain/FQDN, URL, MD5, SHA-1, SHA-256 |
| IOC Explorer | **Implemented** | Search, type/category/grade filters, pagination, provenance detail |
| Synthetic demonstration dataset | **Implemented** | 16 observations, 12 indicators, 2 synthetic sources, 2 GeoJSON points |
| Unit tests | **Implemented** | 71 tests across validation, IP classification, normalisation, ingestion, provider and dataset |
| External threat feed connectors | **Not implemented** | Phase 2 |
| External enrichment / GeoIP | **Not implemented** | Phase 3 |
| CesiumJS 3D globe and CZML playback | **Not implemented** | Phase 3 |
| ECharts analytics and reporting | **Not implemented** | Phase 5 |
| Historical storage and authentication | **Not implemented** | Phase 4–5 |

Modules that are declared but not implemented are visible in the navigation and marked
`Planned`. Their routes render an explicit placeholder that states what does not exist; no
synthetic telemetry is rendered to simulate capability.

---

## 3. Architecture

### 3.1 Layering

```
┌──────────────────────────────────────────────────────────────┐
│ Presentation      components/layout · components/ui · features│
├──────────────────────────────────────────────────────────────┤
│ Configuration     config/app.config · config/navigation        │
│                   config/assessment-grades                    │
├──────────────────────────────────────────────────────────────┤
│ Domain            types/intelligence · types/geo               │
├──────────────────────────────────────────────────────────────┤
│ Validation        lib/validation · lib/ip                      │
├──────────────────────────────────────────────────────────────┤
│ Pipeline          services/intelligence/normalisation          │
│                   services/intelligence/ingest                 │
│                   services/intelligence/local-file-provider     │
├──────────────────────────────────────────────────────────────┤
│ Service seam      services/intelligence/provider (contract)    │
│                   services/intelligence/registry (registry)    │
└──────────────────────────────────────────────────────────────┘
```

The dependency rule is one-directional: presentation may import configuration, domain,
validation and services; services never import presentation. No component talks to a network
endpoint directly.

### 3.2 Backend independence

Intelligence access is defined by the `ThreatIntelProvider` interface in
[`src/services/intelligence/provider.ts`](src/services/intelligence/provider.ts):

```ts
interface ThreatIntelProvider {
  readonly descriptor: ProviderDescriptor;
  checkHealth(signal?: AbortSignal): Promise<ProviderHealth>;
  listIndicators(query: IndicatorQuery, signal?: AbortSignal): Promise<IndicatorPage>;
}
```

A remote API client, a local JSON/GeoJSON file adapter or a Web Worker can implement this
contract interchangeably. The UI consumes only the registry, so a local backend can replace a
remote one without a frontend rewrite. This build registers exactly one adapter
(`local-synthetic-dataset`); the System Status page reports every registered adapter and its
reported health rather than assuming a fixed list.

**Contract extension (additive, backward compatible).** `IndicatorQuery` gained optional
`search`, `categories` and `assessments` fields, and `IndicatorPage` gained an optional `total`
so the explorer can show a real match count. Existing implementations that ignore the new
fields remain valid; `registry.test.ts` and the provider tests cover the extended shape.

### 3.5 Ingestion pipeline

```
JSON dataset ─┐
              ├─► schema inspection ─► validation ─► normalisation ─► dedupe ─► ThreatIndicator[]
GeoJSON  ─────┘        (per record)                                     (by type + value)
```

[`ingest.ts`](src/services/intelligence/ingest.ts) throws only when the dataset cannot be
interpreted at all (no root object, no `observations` array, no usable source). Individual
malformed observations are rejected with a bounded `code` and message, so a partially damaged
dataset still yields every record it can justify. Every rejection reason omits the rejected
value.

Deduplication is deterministic over `iocType:normalisedValue`. Observations are retained per
source record, and `corroboration` reports observations, distinct sources,
`repeatedFromSameSource` and `multiSource`. Consequences enforced in code:

- repeated rows from one source never count as independent corroboration;
- a single source declaring `verified` is clamped to `inferred` — one source cannot corroborate
  itself;
- `verified` requires two distinct sources that each declared it;
- any synthetic observation makes the record `synthetic`, permanently;
- category resolution reports `unknown` unless every observation agrees;
- missing confidence, last-seen timestamps and locations stay absent — nothing is estimated.

### 3.6 Synthetic dataset

[`src/data/datasets/synthetic-indicators.json`](src/data/datasets/synthetic-indicators.json)
holds 16 observations from two sources declared `sourceType: "synthetic"`, merging into 12
indicators across all seven supported observable types. Every IPv4 address is inside
`192.0.2.0/24`, `198.51.100.0/24` or `203.0.113.0/24`; the IPv6 address is inside the
`2001:db8::/32` documentation prefix; every domain and URL sits under a reserved example
namespace; every hash is a repeated-character placeholder. Every observation is graded
`synthetic`, so no record can ever reach an operational grade.

[`synthetic-geo.geojson`](src/data/datasets/synthetic-geo.geojson) supplies two invented point
observations, each declared `precision: "unknown"` with a place label stating it is synthetic.
A GeoJSON point is attached only when its `indicator` validates and matches an ingested record,
so a location can never be silently attached to an unrelated indicator.

### 3.3 Module registry

Navigation, routing and readiness reporting are all generated from a single declarative
registry in [`src/config/navigation.ts`](src/config/navigation.ts). A module may only be marked
`available` when a real implementation exists; `App.tsx` falls back to the explicit placeholder
if the registry ever runs ahead of the implementation.

### 3.4 Intelligence model

`ThreatIndicator` carries `provenance` (source identity, class, retrieval timestamp, URL,
licence, notes), `assessment` (`verified` / `inferred` / `synthetic` / `unverified`),
`confidence` bounded to 0–100, and optional geospatial precision. The model encodes the rule
that **an indicator is an observation, not a verdict** — an IP address is never labelled an
attacker because it appeared in a feed.

---

## 4. Technology stack (as implemented)

| Concern | Choice | Version | Licence |
| --- | --- | --- | --- |
| UI runtime | React | 19.3 | MIT |
| Routing | React Router | 7.18 | MIT |
| Language | TypeScript (strict) | 6.0 | Apache-2.0 |
| Build / dev server | Vite | 8.3 | MIT |
| Styling | Hand-written CSS with design tokens | — | in-repo |
| Tests | Vitest | 5.0 | MIT |
| Lint | ESLint flat config + typescript-eslint | 10.14 / 8.72 | MIT |

Deliberately **not** installed yet: CesiumJS, Apache ECharts, any state-management library,
any CSS framework, any UI kit, any icon package, any analytics SDK. Icons are inline SVG;
typography uses a system font stack so the application runs entirely offline with no CDN
dependency. These are introduced only when the corresponding module is built.

---

## 5. Directory structure

```
.
├── index.html                  # SPA entry document
├── package.json                # scripts and pinned dependency ranges
├── tsconfig*.json              # root, app and tooling TypeScript projects
├── vite.config.ts              # build, dev server, path alias, Vitest config
├── eslint.config.js            # flat ESLint configuration
├── .env.example                # documented public configuration template
├── public/
│   └── favicon.svg             # application mark
└── src/
    ├── main.tsx                # entry point, style imports, root render
    ├── App.tsx                 # router, shell route and module routes
    ├── vite-env.d.ts           # environment and build-constant typings
    ├── components/
    │   ├── ErrorBoundary.tsx   # last-resort render fault boundary
    │   ├── layout/             # AppShell, AppHeader, AppSidebar, AppFooter
    │   └── ui/                 # Badge, Panel, PageHeader, StatusDot,
    │                           # LoadingState, EmptyState, ErrorState, icons
    ├── config/
    │   ├── app.config.ts       # identity, runtime config, feature flags
    │   ├── assessment-grades.ts# grade definitions and handling rules
    │   ├── threat-taxonomy.ts  # indicator type, category and reliability labels
    │   └── navigation.ts       # module registry (routes + readiness)
    ├── data/datasets/
    │   ├── synthetic-indicators.json       # labelled synthetic observations
    │   ├── synthetic-geo.geojson           # invented observation points
    │   └── synthetic-dataset.test.ts       # dataset labelling and range assertions
    ├── features/
    │   ├── overview/           # command overview landing screen
    │   ├── indicators/         # IOC Explorer page and record detail panel
    │   ├── methodology/        # assessment, provenance, handling reference
    │   ├── system-status/      # runtime diagnostics, provider health panel
    │   ├── planned/            # explicit not-implemented placeholder
    │   └── not-found/          # 404 route
    ├── hooks/
    │   ├── useIndicatorExplorer.ts # debounced search, filters, cursor pagination
    │   ├── useProviderHealth.ts# async provider health with retry
    │   └── useUtcClock.ts      # UTC operational clock
    ├── lib/
    │   ├── format.ts           # UTC / count formatting
    │   ├── ip.ts               # IPv4/IPv6 parsing and scope classification
    │   ├── cx.ts               # class-name helper
    │   └── validation.ts       # input validation and sanitisation
    ├── services/intelligence/
    │   ├── provider.ts         # provider contract and descriptor guard
    │   ├── registry.ts         # registry, health collection, adapter registration
    │   ├── normalisation.ts    # canonicalisation and correlation keys
    │   ├── ingest.ts           # dataset parsing, validation, dedupe, grading
    │   ├── local-file-provider.ts # local JSON/GeoJSON adapter, lazy and cached
    │   ├── normalisation.test.ts
    │   ├── ingest.test.ts
    │   ├── local-file-provider.test.ts
    │   └── registry.test.ts
    ├── styles/
    │   ├── tokens.css          # colour, type, spacing, elevation, motion
    │   ├── base.css            # reset, typography, utility primitives
    │   ├── layout.css          # application shell and responsive behaviour
    │   └── components.css      # component and composition styles
    └── types/
        ├── intelligence.ts     # indicators, provenance, assessment, capabilities
        ├── geo.ts              # WGS84 points, precision, guards
        └── navigation.ts       # module and icon contracts
```

Files exist only where they have a current responsibility; there are no placeholder directories.

---

## 6. Local development

### Prerequisites

- **Node.js 20.19+** (verified on Node 26.13)
- **npm 10+** (verified on npm 11.20) — the repository uses `package-lock.json`
- A modern browser with ES2022 support

No account, API key, token or paid service is required at any point.

### Install

```bash
git clone https://github.com/ErTapanJatakia/GCTIC.git
cd GCTIC
npm ci
```

### Run

```bash
npm run dev
```

Serves on <http://localhost:3000>. To expose the server on a network interface (for a container
or preview proxy) the dev server already binds `0.0.0.0`; when additional hostnames are used,
declare them through Vite's environment variable rather than editing tracked configuration:

```bash
__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=preview.example.dev npm run dev
```

### Verify

```bash
npm run typecheck   # tsc -b, strict project references
npm run lint        # ESLint flat config over .ts/.tsx
npm test            # Vitest unit suite
npm run build       # type-check + production bundle into dist/
npm run preview     # serve the production bundle on :4173
```

Routing uses the HTML5 history API, so any static host must rewrite unknown paths to
`index.html` (SPA fallback). `vite dev` and `vite preview` handle this automatically.

---

## 7. Configuration

Configuration is read at build time from Vite environment variables. Only public, non-secret
values are permitted.

Copy the template and edit locally:

```bash
cp .env.example .env.local
```

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_GCTIC_ENV_LABEL` | Label shown in the header environment badge | Derived from build mode |
| `VITE_GCTIC_API_BASE_URL` | Base URL of a future intelligence API gateway | Unset — frontend renders local foundation state |

`VITE_` variables are compiled into the browser bundle and are therefore **public**. Invalid
values are ignored and reported as configuration warnings on the System Status page rather than
failing the build.

**Credentials of any kind belong server-side.** When Phase 2 introduces feed connectors, keys
will be read from server-side environment variables by the adapter service and proxied; they
will never be prefixed `VITE_`, committed, logged or rendered.

---

## 8. Security principles

- **Validate at every boundary.** External values pass through `src/lib/validation.ts` before
  use: observable patterns for IPv4/IPv6/domain/URL/hash, bounded string lengths, control
  character stripping, confidence clamping and ISO timestamp checks.
- **URL safety.** Only absolute `http(s)` URLs are accepted. `javascript:`, `data:`, `file:`
  schemes and embedded credentials are rejected.
- **No unsafe HTML.** React text nodes only. `dangerouslySetInnerHTML` is not used anywhere and
  must not be introduced; the interface renders untrusted strings as text by construction.
- **No automatic artefact handling.** GCTIC never opens, executes, previews or downloads a URL,
  sample or file referenced by intelligence. Source references are rendered as inert text
  unless they validated as absolute `http(s)` URLs, and even then require a deliberate click
  (`rel="noopener noreferrer nofollow"`). Nothing is fetched to build a page.
- **Bounded parsing.** Ingestion never trusts dataset shape: unknown fields are ignored, text is
  length-bounded and sanitised, enums are whitelisted, timestamps must parse, coordinates must be
  valid WGS84 points, and a malformed record is rejected individually instead of aborting the
dataset. Rejection messages never echo the rejected value.
- **Provenance preserved.** Every record carries source identity, class, retrieval time and
  licensing. Attribution survives normalisation, enrichment and storage.
- **Honest assessment.** `verified` requires corroboration; `inferred` is labelled as judgement;
  `synthetic` is marked as non-operational; `unverified` is held for validation.
- **No attribution by presence.** An IP address is never described as an attacker. IP scope is
  classified (private, loopback, documentation, CGNAT, reserved) to prevent misreading of feed
  artefacts.
- **Data minimisation.** Only technical observables are collected. Personal identifiers such as
  email addresses are excluded, and no analytics, tracking or advertising scripts are loaded.
- **Secrets hygiene.** `.env*` files, keys and certificates are git-ignored. `.env.example`
  documents only public variables.
- **Least surface.** The app ships no telemetry, makes no third-party network requests at
  runtime and sets `noindex, nofollow` while the project is pre-release.

---

## 9. Zero-cost operation

The project is built to remain within an absolute INR 0 budget:

- Every runtime and development dependency is open source (MIT / Apache-2.0) and installed
  locally; nothing requires a paid subscription, seat or trial.
- No paid API is required. No AI API key is needed. No external service is called at runtime.
- The application runs fully offline after `npm ci` — fonts are system fonts, icons are inline
  SVG, and there is no CDN dependency.
- Planned capabilities use free/open-source libraries: CesiumJS (Apache-2.0) and Apache ECharts
  (Apache-2.0) will be installed as local dependencies. Any optional token-based imagery service
  will remain optional, with open or local imagery sufficient for development.
- Free-tier constraints for future backend hosting will be documented when that layer is
  introduced; the frontend will keep working against local adapters without it.

---

## 10. Design system

A single token layer ([`src/styles/tokens.css`](src/styles/tokens.css)) defines colour,
typography, spacing, radii, elevation, motion and layer order. Components consume tokens only;
no colour literals appear in component styles outside the token definitions.

- **Surfaces:** near-black void, graphite panels, hairline borders.
- **Accents:** restrained tactical green (nominal/available), cyan (informational), amber
  (planned/degraded), red (unavailable/error). Accents mark state, never decoration.
- **Typography:** system UI stack for prose, tabular monospace for identifiers, timestamps and
  metrics; uppercase micro-labels for structure.
- **Density:** compact rows and panels sized for sustained analytical use.
- **Responsive:** fixed rail above 1024px, off-canvas drawer with backdrop and Escape dismissal
  below, single-column stacking below 720px.
- **Accessibility:** skip link, keyboard-visible focus rings, `aria-current` navigation,
  labelled landmarks, status announced in live regions, and colour never used as the sole
  signal. Motion is disabled under `prefers-reduced-motion`.

---

## 11. Development roadmap

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Foundation: shell, routing, design system, domain model, validation, provider seam | **Complete** |
| 1.5 | Local intelligence foundation: ingestion, normalisation, deduplication, IOC Explorer, synthetic dataset | **Complete** |
| 2 | Intelligence sources: remote provider adapters, ingestion schedules, source status views | Planned |
| 3 | Geospatial: CesiumJS globe, CZML event playback, geolocation precision handling | Planned |
| 4 | Analysis: actor and campaign tracking, correlation, historical observation store | Planned |
| 5 | Analytics and reporting: ECharts views, report composition, export with citations | Planned |
| 6 | Operations hardening: authentication, audit logging, deployment and observability | Planned |

Each phase must leave the application building, lint-clean, type-clean and tested.

---

## 12. Contributing

1. Create a feature branch from `main`.
2. Keep the dependency rule and token system intact; do not add a dependency that duplicates an
   existing capability.
3. Run `npm run typecheck && npm run lint && npm test && npm run build` before opening a pull
   request.
4. Never commit credentials, `.env` files, feed dumps or unverified intelligence captures.

---

## 13. Licence

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for the full text.
Copyright and project identity are preserved from the original repository.

<img width="2816" height="1536" alt="1_v1G4pJc_pd3qSCrgmPvM1g" src="https://github.com/user-attachments/assets/ac416c70-c038-4eea-816f-b9e6b042ce99" />

---
