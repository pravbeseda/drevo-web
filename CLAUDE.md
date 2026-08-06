# CLAUDE.md - Drevo-Web Project Instructions

## Quick Overview

**Drevo-Web** — Nx monorepo with Angular 21 application. Migration from legacy Yii1 app to modern stack.

## Branches

- `main` — active development, default branch. Push triggers beta deploy (drevo-beta, port 4010). Tag `X.Y.Z` triggers release deploy (drevo-release, port 4011).
- `iframe` — frozen legacy (old Yii-era wrapper). CI runs automatically on PR; CD is manual-only via workflow_dispatch. Hotfix tags: `iframe-X.Y.Z`.

Cutting a release, bump types, the manual tag fallback, `iframe` hotfixes: [`docs/release-workflow.md`](docs/release-workflow.md).

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Angular 21, RxJS 7.8, Angular Material 21 (M3) |
| State | Angular Signals (not NgRx!) |
| Editor | CodeMirror 6 |
| SSR | Express + Angular SSR |
| Unit Tests | Jest + Spectator (only!) |
| E2E Tests | Playwright |
| Styles | SCSS + Angular Material Theming |
| Monitoring | Sentry |
| Package Manager | Yarn |

## Commands

```bash
yarn serve                         # Dev server at localhost:4200
yarn build                         # Production build
yarn build:dev                     # Development build
yarn nx test client                # Unit tests for one project
yarn test:playwright               # Integration tests, Chromium (other browsers: test:playwright:* in package.json)
yarn nx e2e client-e2e             # E2E tests
yarn format:fix                    # Apply Prettier
```

### Quality gates

Green on all five is what "done" means (Quality rule 9), in this order — the earlier ones are the cheaper to fix:

```bash
yarn nx affected -t lint                        # ESLint; the pre-commit hook runs it on staged apps/ and libs/ files
yarn nx affected -t test --configuration=ci     # unit tests + per-project coverage thresholds
yarn format:check                               # Prettier
yarn lint:styles                                # Stylelint — when SCSS was touched
yarn knip                                       # dead code and unused deps — after refactors and deletions
```

## Project Structure

```
apps/
  client/
    src/app/
      guards/                # Route guards (app-level)
      interceptors/          # HTTP interceptors (app-level)
      services/              # Global services: domain (ArticleService), infra (PageTitleStrategy)
      layout/                # Layout shell (header, sidebar, version-display)
      features/              # Feature modules (see "Feature Architecture")
      shared/                # Code shared across multiple features
    src/environments/        # Environment configs
  client-e2e/                # E2E tests (Playwright)

libs/
  core/                      # HTTP utilities, logging, notifications, DI tokens
  shared/                    # Shared models, types, helpers (cross-app)
  editor/                    # CodeMirror editor component
  ui/                        # UI component library (see "Available UI Components")
```

### Feature Architecture

Each feature is a self-contained domain folder under `apps/client/src/app/features/`:

```
app/features/
  article/
    pages/                   # Routed (lazy-loaded) components
    components/              # Non-routed components used within this feature
    services/                # Feature-scoped services (not providedIn: 'root')
    resolvers/               # Route resolvers
    models/                  # Feature-local types and interfaces
    constants/               # Feature-local constants
    article.routes.ts        # Feature routes
  history/
    pages/
    components/
    services/
    history.routes.ts
  auth/
    pages/
    services/
    auth.routes.ts
  ...
```

#### Feature rules

1. **Self-contained** — what a feature may import is listed under "Import direction rules" below, and a sibling feature is not on that list
2. **`pages/`** — only routed (lazy-loaded) components. One subfolder per route entry point
3. **`components/`** — non-routed components used within this feature only
4. **`services/`** — only feature-scoped services (provided in component or route `providers`, not `providedIn: 'root'`). Global domain services live in `app/services/`
5. **`resolvers/`** — route resolvers belonging to this feature
6. **`models/`** — feature-local types and interfaces. Created only when needed
7. **`constants/`** — feature-local constants shared across multiple components within the feature. Created only when needed
8. **Feature routes file** — each feature has its own `*.routes.ts`, imported lazily from `app.routes.ts`
9. **Small features** — if a feature is a single component (no subcomponents, services, or resolvers), files live directly in `features/X/` without `pages/` subfolder. Add `pages/`, `components/`, `services/` as the feature grows

#### Where types and models live

| Scope | Location | Example |
|-------|----------|---------|
| Cross-app (shared between libs/apps) | `@drevo-web/shared` | `Article`, `User`, `ApiResponse` |
| Cross-feature (shared between 2+ features) | `app/shared/models/` | `FilterEntry`, `FilterGroup` |
| Feature-local types | `features/X/models/` | `ArticleApi` |
| Feature-local constants | `features/X/constants/` | `TITLE_MIN_LENGTH` |

#### `shared/` rules

- **Two consumers make something shared** — code moves here when the second feature needs it, and moves back into a feature when it is down to one consumer again
- Contains `components/` and `models/` subdirectories

#### Layout structure

`layout/` has its own `services/` for layout-specific services (ThemeService, FontScaleService, VersionService):

```
app/layout/
  header/
    account-dropdown/
    font-scale-control/
    theme-toggle/
    header.component.*
  sidebar-nav/
  version-display/
  services/                  # ThemeService, FontScaleService, VersionService
  layout.component.*
```

#### Import direction rules

Each line is the complete set of what its folder may import — an arrow that is not here is an import that does not happen. A feature reaching for another feature, for `layout/`, `guards/` or `interceptors/` is the case this table exists to catch: extract the shared part to `app/shared/` (components, models) or `app/services/` (services) and both sides import that.

```
features/X/      →  app/services/, app/shared/, @drevo-web/*
app/shared/      →  app/services/, @drevo-web/*
layout/          →  layout/services/, app/services/, app/shared/, @drevo-web/*
app/services/    →  @drevo-web/*
guards/          →  app/services/, @drevo-web/*
interceptors/    →  app/services/, @drevo-web/*
```

#### App-level folders (outside features)

- **`layout/`** — layout shell and its subcomponents (header, sidebar, etc.). Not a feature — it wraps all features
- **`guards/`** — route guards (auth guard, etc.)
- **`interceptors/`** — HTTP interceptors
- **`services/`** — all `providedIn: 'root'` services: domain services (ArticleService, AuthService, LinksService), infrastructure services (PageTitleStrategy). Grouped by domain in subdirectories (e.g. `services/articles/`, `services/auth/`)

### Key Entry Points

- **Routing**: `apps/client/src/app/app.routes.ts`
- **App config**: `apps/client/src/app/app.config.ts`
- **Proxy**: `apps/client/proxy.conf.json` (proxies `/api` and `/pictures` → `http://drevo-local.ru`)
- **Path aliases**: `tsconfig.base.json`

### Import Aliases

```typescript
import { ... } from '@drevo-web/core';
import { ... } from '@drevo-web/core/testing';  // test mocks
import { ... } from '@drevo-web/shared';
import { ... } from '@drevo-web/ui';
import { ... } from '@drevo-web/editor';
```

### Barrel files (`index.ts`)

- **Library boundaries carry the only barrels** — `libs/*/src/index.ts`, the public API of `@drevo-web/*`, enforced by `@nx/enforce-module-boundaries`
- **Inside `apps/client/` imports name the concrete module** — `services/X/x.service`, not a folder `index.ts`. An intra-app barrel grows the module graph (slower Jest/esbuild), invites circular dependencies and can pull side-effect modules into lazy chunks, in exchange for a shorter path
- **Existing app barrels are removed opportunistically** — when you touch a folder that still has an `index.ts` barrel, delete it and switch its consumers to direct imports

### Member types and knip

Knip reports a type that is exported but only reachable through another exported type ("only reachable through an exported member"). The fix depends on whether anything can name it:

- **Keep the export, add `/** @public ... */`** when the type is on a package boundary (`libs/*/src/index.ts`, e.g. `ModalPosition` in `ModalConfig.position`), or when it is an arm of an exported union that consumers narrow (e.g. `FilterOption` in `FilterEntry`, narrowed by the exported `isFilterGroup`). In both cases there is no other way to name it
- **Drop the `export`** otherwise — an element type of an array member, a shape used only inside its own module or app. It comes back, with `@public`, when a consumer actually needs the name
- **Never suppress knip for the whole file** — the tag is per-type and states who needs the name

### Selector Prefixes

- `app-` — application components (`apps/client/`)
- `ui-` — UI library components (`libs/ui/`)

## Legacy Backend (Yii1)

Adding an API endpoint, reading the real shape of the data, running the PHP tests — the Yii1 app under `legacy-drevo-yii/`: [`docs/legacy-yii.md`](docs/legacy-yii.md).

## Design Principles

- **Decompose complex logic** — small, focused, single-responsibility units, but avoid over-engineering
- **No anti-patterns** — no god components, tight coupling, shared mutable state, deep inheritance hierarchies
- **No logic duplication** — reuse existing services, utilities, and patterns; extract shared logic instead of copy-pasting
- **Pre-implementation review** — before implementing any task, analyze the proposed solution for over-engineering, non-Angular-way patterns, anti-patterns, and scalability/extensibility issues. Report findings and propose alternatives **before** writing code
- **Declarative over imperative** — prefer declarative patterns: Angular template syntax over manual DOM manipulation, reactive streams over manual subscriptions, `computed()`/`toSignal()` over manual state sync, `@if`/`@for` over hidden-flag toggling. Where a declarative expression covers the case, it replaces the imperative loop

## Code Conventions

### TypeScript

1. **Strict TypeScript** — no implicit any, strict null checks
2. **Describe the shape** — a real type where one exists, `unknown` where the shape is genuinely open and the code narrows it
3. **`undefined` is absence** — throughout the codebase, enforced by `no-null/no-null`
4. **Readonly interface properties** — all interface properties must be `readonly` by default
5. **Named constants over literals** — a number in the logic gets a name. Exception: CSS margin/padding/sizes of atomic UI components
6. **Narrow instead of asserting** — `if`, `@if (value(); as v)`, optional chaining. Enforced by `@typescript-eslint/no-non-null-assertion` for `.ts` files, convention in templates
7. **Explicit types on the public API** — annotate return types of public service and component methods, and the types behind `input()`/`output()`/`model()`. Inference stays for locals, private helpers and template-only expressions. A wrong inferred return type is a silent API change; an annotated one fails at the source

### Angular

1. **Standalone components** — always, but omit `standalone: true` (it's the default in Angular 21)
2. **Signals** for reactive state with private writable + public readonly pattern (see Key Patterns). Public writable signals are forbidden — always expose via `asReadonly()`
3. **Naming: `Subject` postfix, `$` only for Observable** — `_eventSubject` for Subject, `event$` for its public Observable
4. **`providedIn: 'root'` only for global services** — page/feature-scoped services provide in component or route `providers` instead
5. **`takeUntilDestroyed()`** for subscription cleanup
6. **Lazy loading** for all pages
7. **Angular Material stays inside `libs/ui`** — the rest of the workspace consumes it through `@drevo-web/ui` components and `--themed-*` tokens
8. **Auth guard on all routes** — login is the one page reachable without it
9. **Browser APIs arrive by injection** — `WINDOW` from `@drevo-web/core`, `DOCUMENT` from `@angular/common`, `StorageService` from `@drevo-web/core` for local and session storage. The server render has no globals, so injection is what keeps SSR working
10. **Zoneless** — `provideZonelessChangeDetection()`, no `zone.js`
11. **Styles and templates in their own files** — `styleUrl` to a `.scss`, `templateUrl` to an `.html`
12. **Flatten instead of nesting subscriptions** — `switchMap`, `concatMap`, `mergeMap`, `exhaustMap` compose the chain; a `subscribe` inside a `subscribe` leaks the outer one

### Quality

1. **Russian language** in UI, **English** in code and comments
2. **Comments** — English only, only where code doesn't explain itself
3. **TDD is mandatory — always, no exceptions.** Write the test first and *watch it fail* before writing any implementation. Red → green → refactor. A change small enough to "obviously not need a test" is small enough to write the test for. A test that passes before the implementation exists proves nothing — if it doesn't go red first, it isn't testing the change
    - **Unit tests cover the implementation** — Jest + Spectator. Test public API only (methods, properties, inputs/outputs), not internal implementation
    - **Playwright coverage must be explicitly considered for every change** — decide whether the behavior also needs an integration test in `testing/playwright/`, and state the decision either way. Unit tests do not cover routing, real navigation, cross-component flows, SSR/hydration, or anything that depends on a real browser
    - **Bug fixes** — when a bug is real but existing tests pass, the missing failing test comes first (unit or Playwright, whichever fits); only then fix until it passes. Every bug fix ends up with a regression test
    - **Non-functional changes need tests too** — performance fixes get an assertion that fails on the slow implementation; refactors that must preserve behavior get characterization tests against the old behavior before the swap
    - If existing tests break — analyze the root cause before fixing
4. **`data-testid` attributes for test selectors** — in tests, query elements only via `[data-testid="name"]` attributes. Add `data-testid` attributes to component templates only when actually needed by a test
5. **No unused CSS classes in templates** — every class in HTML templates must have corresponding styles in SCSS; remove classes that aren't used for styling
6. **Log everything via `LoggerService`** — all user actions, navigation, and errors. No silent failures
7. **No `title` attribute** — use `matTooltip` for visual hints or `aria-label` for accessible name without visual hint
8. **Failing tests are a red flag, not an obstacle** — if code changes cause an existing test to fail, do NOT simply fix the test to make it pass. First investigate whether the new code broke expected behavior. Only modify the test if the behavioral change is intentional and justified (e.g. a deliberate API change, not a side effect). When in doubt, fix the code, not the test
9. **Run the quality gates before reporting done** — the block under Commands, in that order; a task is complete when they are green, not when the code looks right. If a step fails, say so with its output rather than reporting success. `nx test` is transpile-only, so type errors surface in `nx build` rather than in the tests — build the affected project when the change touches types
10. **Coverage thresholds only ratchet up** — `coverageThreshold` lives per project in its `jest.config.ts` (`libs/core/jest.config.cts`). When a change drops coverage below the threshold, write the missing tests. Never lower a threshold to make the run pass without explicit approval from the user, and never widen the `collectCoverageFrom` excludes in `jest.preset.js` to hide code from the denominator
11. **No `TODO`/`FIXME` comments** — `sonarjs/todo-tag` and `sonarjs/fixme-tag` are errors, so such a comment fails lint and blocks the commit. Either finish the work now or open a GitHub issue for it; when the code needs the context, write a plain comment stating the constraint and referencing the issue number
12. **Delete the code a change orphans** — when a refactor or a deletion leaves an export, file or dependency with no consumer, remove it in the same change. `yarn knip` finds them; it runs blocking in CI, so leaving them behind fails the PR anyway

## Key Patterns

### Signals — Private Writable + Public Readonly

```typescript
// Signal
private readonly _isLoading = signal(false);
readonly isLoading = this._isLoading.asReadonly();

// Computed
readonly hasData = computed(() => !!this.data());

// Observable → Signal
readonly user = toSignal(this.authService.user$);

// Subject (when Observable is needed)
private readonly _eventSubject = new Subject<Event>();
readonly event$ = this._eventSubject.asObservable();
```

### HTTP Services — Two-Layer Pattern

API service (low-level HTTP) + Domain service (business logic, mapping). Both live in `app/services/` with `providedIn: 'root'`:

```typescript
// app/services/articles/article-api.service.ts — HTTP layer
@Injectable({ providedIn: 'root' })
export class ArticleApiService {
    private readonly apiUrl = environment.apiUrl;
    private readonly http = inject(HttpClient);

    getArticle(id: number): Observable<ArticleVersionDto> {
        return this.http
            .get<ApiResponse<ArticleVersionDto>>(
                `${this.apiUrl}/api/articles/show/${id}`,
                { withCredentials: true }
            )
            .pipe(map(response => {
                assertIsDefined(response.data, 'Response data is undefined');
                return response.data;
            }));
    }
}

// app/services/articles/article.service.ts — Domain layer (used by features)
@Injectable({ providedIn: 'root' })
export class ArticleService {
    private readonly articleApiService = inject(ArticleApiService);

    getArticle(id: number): Observable<ArticleVersion> {
        return this.articleApiService.getArticle(id).pipe(
            map(dto => this.mapArticleVersion(dto))
        );
    }
}
```

### Authentication & HTTP

- **AuthInterceptor** — CSRF tokens (auto-added to POST/PUT/DELETE/PATCH), 401/403 handling
- **Credentials** — `withCredentials: true` for all API requests

## Styles

- Themes: `html` (light), `html.dark-theme` (dark)

### Color Tokens

Every colour comes from a `--themed-*` variable in `libs/ui/src/lib/styles/_theme-colors.scss`:

```scss
background: var(--themed-primary-bg);
color: var(--themed-text-secondary);
```

Stylelint enforces most of it in `yarn lint:styles`: hex values, named colours and `rgb()`/`hsl()`-family functions fail anywhere, and properties ending in `color` plus `fill`/`stroke` accept nothing but a `--themed-*` variable. Shorthands like `background` fall outside that property list, so a `--mat-sys-*` token there is caught by review rather than by the linter. A colour with no token yet gets one added to `_theme-colors.scss` in the same change. The palette sources and the image overlays are the exceptions, listed as overrides in `.stylelintrc.json`.

### Size Tokens

All size tokens defined in `libs/ui/src/lib/styles/_tokens.scss`. Key values:

- **Breakpoints**: `$breakpoint-tablet: 768px`, `$breakpoint-desktop: 1024px` (also in `@drevo-web/ui` → `breakpoints`)
- **Layout**: `$header-height: 50px`, `$sidebar-width: 260px`, `$sidebar-collapsed-width: 50px`

Never define local CSS custom properties for sizes in component styles — add new tokens to `_tokens.scss`.

## Available UI Components

Everything is exported from `@drevo-web/ui`, and `libs/ui/src/index.ts` is the live list — read it before building a component by hand. The library covers more than the obvious set: a tooltip, a line clamp, a side panel and a navigation progress bar are already there.

What the export names alone do not tell you:

| Component | Notes |
|-----------|-------|
| `ui-badge` | Input: `value: number \| string` |
| `ui-banner` | Content projection wrapper (flex column, border, background) |
| `ui-status-icon` | Input: `ApprovalStatus` (`-1`/`0`/`1`) |
| `ui-tabs-group` | Ships the `TabGroup` and `TabGroupItem` interfaces |
| `ui-dropdown-menu` | Ships `uiDropdownMenuTrigger` and `ui-dropdown-menu-item` |
| `ui-virtual-scroller` | Ships the `uiVirtualScrollerItem` directive |
| Modal | No selector — opened through `ModalService` |
| `formatDate` pipe | Date and time: "15 января 2025, 14:30" |

## Unit Testing

```typescript
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';

describe('MyComponent', () => {
  let spectator: Spectator<MyComponent>;
  const createComponent = createComponentFactory({
    component: MyComponent,
    // mocks, providers, imports...
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });
});
```

## Integration Testing (Playwright)

Standalone Playwright test suite in `testing/playwright/` — **separate from** `apps/client-e2e/`. Tests run against the dev server with **mocked API** (no real backend required).

### Structure

`fixtures/` (auth, mock-api, coverage), `pages/` (Page Objects), `mocks/` (data factories), `helpers/`, `tests/` (specs, one subdirectory per feature). `playwright.config.ts` defines 5 browser projects: chromium, firefox, webkit, mobile-chrome, mobile-safari.

### Conventions

1. **Always import `test` and `expect` from `fixtures/`** — not from `@playwright/test` directly. The custom `test` provides `authenticatedPage` / `unauthenticatedPage` fixtures with pre-configured API mocks
2. **Page Object Model** — all page interactions go through PO classes extending `BasePage`. Each PO implements `waitForReady()` for page readiness
3. **Mock data via factories** — use `createPictureDto()`, `createPictureDtoList()` etc. from `mocks/` to generate test data. `mocks/index.ts` and `fixtures/index.ts` re-export what specs actually import, not the full surface of their folder — a factory reachable only from its concrete module is not a mistake. Importing from the concrete module always works; add the re-export to the barrel when a spec needs it there, and knip prunes it again once nothing does
4. **API mocking via `page.route()`** — mock helpers in `fixtures/mock-api.fixture.ts` intercept API requests at the network level
5. **Element selectors via `data-testid`** — same convention as unit tests
6. **Tests organized by feature** — mirror the app's feature structure in `tests/` subdirectories

## Logging

```typescript
import { LoggerService } from '@drevo-web/core';

private readonly logger = inject(LoggerService).withContext('MyService');

this.logger.info('message', { data });
this.logger.error('error', error);
```
