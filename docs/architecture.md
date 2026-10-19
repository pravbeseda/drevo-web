# Architecture

Detail behind the "Architecture" section of [`AGENTS.md`](../AGENTS.md). The import-direction table and the repo tree live there; this file covers how a feature is laid out, where a type goes, and when a folder earns a barrel.

## Feature architecture

Each feature is a self-contained domain folder under `apps/client/src/app/features/`:

```
app/features/
  article/
    pages/                   # Routed (lazy-loaded) components
    components/              # Non-routed components used within this feature
    services/                # Feature-scoped services (not providedIn: 'root')
    resolvers/               # Route resolvers
    guards/                  # Route guards and matchers
    models/                  # Feature-local types and interfaces
    constants/               # Feature-local constants
    article.routes.ts        # Feature routes
```

1. **Self-contained** — what a feature may import is the import-direction table in `AGENTS.md`, and a sibling feature is not on it
2. **`pages/`** — only routed (lazy-loaded) components. One subfolder per route entry point
3. **`components/`** — non-routed components used within this feature only
4. **`services/`** — only feature-scoped services (provided in the component or route `providers`, not `providedIn: 'root'`). Global domain services live in `app/services/`
5. **`resolvers/`, `guards/`** — route resolvers, guards and URL matchers belonging to this feature; app-wide guards stay in `app/guards/`
6. **`models/`, `constants/`** — feature-local types, and constants shared across components within the feature. Created only when needed
7. **Feature routes file** — each feature has its own `*.routes.ts`, imported lazily from `app.routes.ts`
8. **Small features** — a feature that is a single component (no subcomponents, services or resolvers) keeps its files directly in `features/X/`. Add `pages/`, `components/`, `services/` as it grows

## Where types and models live

| Scope | Location | Example |
|-------|----------|---------|
| Cross-app (shared between libs/apps) | `@drevo-web/shared` | `Article`, `User`, `ApiResponse` |
| Cross-feature (shared between 2+ features) | `app/shared/models/` | `FilterEntry`, `FilterGroup` |
| Feature-local types | `features/X/models/` | `ArticleApi` |
| Feature-local constants | `features/X/constants/` | `TITLE_MIN_LENGTH` |

## `shared/` rules

- **Two consumers make something shared** — code moves here when the second feature needs it, and moves back into a feature when it is down to one consumer again
- Contains `components/`, `models/`, `helpers/`, `constants/`, `services/` and `testing/` subdirectories, plus `resolvers/` and `routes/` for a screen two features mount: the forum topic is opened both by the forum's own list and by an article's discussion tab, so its resolvers and its route config live here rather than in either feature

## Layout structure

`layout/` is not a feature — it wraps all of them — and has its own `services/` (ThemeService, FontScaleService, VersionService):

```
app/layout/
  header/
    account-dropdown/
    font-scale-control/
    theme-toggle/
  sidebar-nav/
  version-display/
  services/
  layout.component.*
```

## App-level folders outside `features/`

- **`layout/`** — the shell and its subcomponents
- **`guards/`** — route guards
- **`interceptors/`** — HTTP interceptors
- **`services/`** — all `providedIn: 'root'` services, domain and infrastructure alike, grouped by domain (`services/articles/`, `services/auth/`)

## Barrel files (`index.ts`)

- **Library entry points carry the only barrels** — the `index.ts` behind each `@drevo-web/*` path in `tsconfig.base.json`, enforced by `@nx/enforce-module-boundaries`
- **`@drevo-web/ui` has one entry point per folder and no root barrel** — `@drevo-web/ui/button`, `@drevo-web/ui/modal`, `@drevo-web/ui/format-date`. esbuild assigns a file to chunks by file-level reachability, following every `export … from` of a barrel; tree shaking only decides which code survives. So an eager import of a library barrel puts every module it re-exports that a lazy route uses into a chunk `main` loads at startup, Material modules included, and `"sideEffects": false` does not prevent it. A new component folder gets its own `index.ts` and its own path. `@drevo-web/shared/diff` is split off for the same reason; the rest of `@drevo-web/shared` and `@drevo-web/core` is eager anyway. `pnpm lint:bundle` catches a regression ([`quality-gates.md`](quality-gates.md))
- **Inside `apps/client/` imports name the concrete module** — `services/X/x.service`, not a folder `index.ts`. An intra-app barrel grows the module graph (slower Jest/esbuild), invites circular dependencies and can pull side-effect modules into lazy chunks, in exchange for a shorter path
- **Existing app barrels are removed opportunistically** — when you touch a folder that still has an `index.ts` barrel, delete it and switch its consumers to direct imports

## Member types and knip

Knip reports a type that is exported but only reachable through another exported type ("only reachable through an exported member"). The fix depends on whether anything can name it:

- **Keep the export, add `/** @public ... */`** when the type is on a package boundary (a library entry point, e.g. `ModalPosition` in `ModalConfig.position`), or when it is an arm of an exported union that consumers narrow (e.g. `FilterOption` in `FilterEntry`, narrowed by the exported `isFilterGroup`). In both cases there is no other way to name it
- **Drop the `export`** otherwise — an element type of an array member, a shape used only inside its own module or app. It comes back, with `@public`, when a consumer actually needs the name
- **Never suppress knip for the whole file** — the tag is per-type and states who needs the name
