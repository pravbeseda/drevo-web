# CLAUDE.md - Drevo-Web Project Instructions

## Quick Overview

**Drevo-Web** — Nx monorepo with Angular 21 application. Migration from legacy Yii1 app to modern stack.

## Branches

- `main` — active development, default branch. Push triggers beta deploy (drevo-beta, port 4010). Tag `X.Y.Z` triggers release deploy (drevo-release, port 4011).
- `iframe` — frozen legacy (old Yii-era wrapper). CI runs automatically on PR; CD is manual-only via workflow_dispatch. Hotfix tags: `iframe-X.Y.Z`.

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
yarn nx test client                # Unit tests
yarn nx e2e client-e2e             # E2E tests
yarn lint                          # ESLint
yarn format:check                  # Prettier check
yarn format:fix                    # Prettier fix
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

1. **No cross-feature imports** — `features/X/` must NEVER import from `features/Y/`. Extract shared components/models to `app/shared/`, shared services to `app/services/`
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

- **Only code used by 2+ features** — do not preemptively move code to shared
- Contains `components/` and `models/` subdirectories
- If a shared item starts being used by only one feature, move it into that feature

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

```
features/X/      →  app/services/, app/shared/, @drevo-web/*
app/shared/      →  app/services/, @drevo-web/*
layout/          →  layout/services/, app/services/, app/shared/, @drevo-web/*
app/services/    →  @drevo-web/*
guards/          →  app/services/, @drevo-web/*
interceptors/    →  app/services/, @drevo-web/*
```

- Features, shared, layout, guards, and interceptors may import from `app/services/` and libs
- Features and layout may import from `app/shared/`
- Features must NEVER import from other features, `layout/`, `guards/`, or `interceptors/`
- `app/shared/` must NEVER import from features or layout

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

### Selector Prefixes

- `app-` — application components (`apps/client/`)
- `ui-` — UI library components (`libs/ui/`)

## Legacy Backend (Yii1)

```
legacy-drevo-yii/            # Symlink → ~/WebProjects/drevo/drevo-yii
  protected/
    controllers/api/         # API controllers (only this folder is modified)
    models/                  # Data models (reference for data structures)
```

- **Policy**: Do not modify existing code, only add new API endpoints
- **Use as reference**: Data structures and business logic

## Design Principles

- **Decompose complex logic** — small, focused, single-responsibility units, but avoid over-engineering
- **No anti-patterns** — no god components, tight coupling, shared mutable state, deep inheritance hierarchies
- **No logic duplication** — reuse existing services, utilities, and patterns; extract shared logic instead of copy-pasting
- **Pre-implementation review** — before implementing any task, analyze the proposed solution for over-engineering, non-Angular-way patterns, anti-patterns, and scalability/extensibility issues. Report findings and propose alternatives **before** writing code
- **Declarative over imperative** — prefer declarative patterns: Angular template syntax over manual DOM manipulation, reactive streams over manual subscriptions, `computed()`/`toSignal()` over manual state sync, `*ngIf`/`@if` over hidden-flag toggling. Avoid imperative loops and side-effectful logic where a declarative expression suffices

## Code Conventions

### TypeScript

1. **Strict TypeScript** — no implicit any, strict null checks
2. **No `any`** — use `unknown` if type is truly unknown, otherwise define proper types
3. **No `null`** — use `undefined` instead of `null` everywhere
4. **Readonly interface properties** — all interface properties must be `readonly` by default
5. **No magic numbers** — extract into named constants. Exception: CSS margin/padding/sizes of atomic UI components
6. **No non-null assertion (`!`)** — do not use `!` operator in TypeScript or templates. Use type narrowing (`if`, `@if ... as`, optional chaining) instead. Enforced by `@typescript-eslint/no-non-null-assertion` for `.ts` files; in templates — convention (use `@if (value(); as v)` pattern instead of `value()!`)

### Angular

1. **Standalone components** — always, but omit `standalone: true` (it's the default in Angular 21)
2. **Signals** for reactive state with private writable + public readonly pattern (see Key Patterns). Public writable signals are forbidden — always expose via `asReadonly()`
3. **Naming: `Subject` postfix, `$` only for Observable** — `_eventSubject` for Subject, `event$` for its public Observable
4. **`providedIn: 'root'` only for global services** — page/feature-scoped services provide in component or route `providers` instead
5. **`takeUntilDestroyed()`** for subscription cleanup
6. **Lazy loading** for all pages
7. **Angular Material via `@drevo-web/ui` only** — never use `mat-*` components or `--mat-*` CSS tokens directly outside `libs/ui`
8. **Auth guard on all routes** — no public pages except login
9. **No direct `window` access** — use `WINDOW` token from `@drevo-web/core` for SSR compatibility
10. **No direct `document` access** — use `DOCUMENT` token from `@angular/common` for SSR compatibility
11. **`StorageService` for storage** — use `StorageService` from `@drevo-web/core` instead of direct `localStorage`/`sessionStorage`
12. **Zoneless** — `provideZonelessChangeDetection()`, no `zone.js`
13. **Styles in separate SCSS files** — no inline `styles` in component metadata, always use `styleUrl` pointing to a `.scss` file
14. **Templates in separate HTML files** — use `templateUrl` for templates.
15. **No inner subscribe** — never subscribe inside a `subscribe` callback. Use RxJS flattening operators (`switchMap`, `concatMap`, `mergeMap`, `exhaustMap`) to compose Observable chains instead

### Quality

1. **Russian language** in UI, **English** in code and comments
2. **Comments** — English only, only where code doesn't explain itself
3. **Tests are mandatory** for new features and bug fixes. Use Jest + Spectator. Test public API only (methods, properties, inputs/outputs), not internal implementation. If existing tests break — analyze the root cause before fixing
4. **`data-testid` attributes for test selectors** — in tests, query elements only via `[data-testid="name"]` attributes. Add `data-testid` attributes to component templates only when actually needed by a test
5. **No unused CSS classes in templates** — every class in HTML templates must have corresponding styles in SCSS; remove classes that aren't used for styling
6. **Log everything via `LoggerService`** — all user actions, navigation, and errors. No silent failures
7. **No `title` attribute** — use `matTooltip` for visual hints or `aria-label` for accessible name without visual hint
8. **Test-first bug fixing** — when a bug is reported and existing tests pass, first write a failing test (unit or Playwright, whichever fits) that asserts the correct behavior. Only then fix the bug until the test passes. This ensures every bug fix is covered by a regression test
9. **Failing tests are a red flag, not an obstacle** — if code changes cause an existing test to fail, do NOT simply fix the test to make it pass. First investigate whether the new code broke expected behavior. Only modify the test if the behavioral change is intentional and justified (e.g. a deliberate API change, not a side effect). When in doubt, fix the code, not the test

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

Use only `--themed-*` CSS variables from `libs/ui/src/lib/styles/_theme-colors.scss`:

```scss
// Good
background: var(--themed-primary-bg);
color: var(--themed-text-secondary);

// Bad — hardcoded colors
background: #ffffff;
// Bad — direct Material tokens
background: var(--mat-sys-surface);
```

### Size Tokens

All size tokens defined in `libs/ui/src/lib/styles/_tokens.scss`. Key values:

- **Breakpoints**: `$breakpoint-tablet: 768px`, `$breakpoint-desktop: 1024px` (also in `@drevo-web/ui` → `breakpoints`)
- **Layout**: `$header-height: 50px`, `$sidebar-width: 260px`, `$sidebar-collapsed-width: 50px`

Never define local CSS custom properties for sizes in component styles — add new tokens to `_tokens.scss`.

## Available UI Components

All accessed via `@drevo-web/ui`.

| Component | Selector | Notes |
|-----------|----------|-------|
| Badge | `ui-badge` | Input: `value: number \| string` |
| Button | `ui-button` | |
| IconButton | `ui-icon-button` | |
| ActionButton | `ui-action-button` | |
| TextInput | `ui-text-input` | |
| Checkbox | `ui-checkbox` | |
| Icon | `ui-icon` | |
| Spinner | `ui-spinner` | |
| StatusIcon | `ui-status-icon` | Input: `ApprovalStatus` (`-1`/`0`/`1`) |
| Tabs | `ui-tabs` | |
| TabsGroup | `ui-tabs-group` | + `TabGroup`, `TabGroupItem` interfaces |
| DropdownMenu | `ui-dropdown-menu` | + `uiDropdownMenuTrigger`, `ui-dropdown-menu-item` |
| VirtualScroller | `ui-virtual-scroller` | + `uiVirtualScrollerItem` directive |
| Modal | via `ModalService` | `@drevo-web/ui` → `ModalService` |
| HighlightPipe | `highlight` | Pipe for text highlighting |
| FormatTimePipe | `formatTime` | Pipe for time formatting |

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

```
testing/playwright/
  playwright.config.ts         # Config: 5 projects (chromium, firefox, webkit, mobile-chrome, mobile-safari)
  fixtures/                    # Playwright fixtures (auth, mock-api, coverage)
    auth.fixture.ts            # authenticatedPage / unauthenticatedPage fixtures
    mock-api.fixture.ts        # API mock helpers (mockAuthApi, mockPicturesApi, etc.)
    coverage.fixture.ts        # Code coverage collection
    index.ts                   # Re-exports all fixtures
  pages/                       # Page Object Model
    base.page.ts               # Abstract BasePage with waitForReady()
    login.page.ts
    layout.page.ts
    picture-gallery.page.ts
    picture-detail.page.ts
  mocks/                       # Mock data factories
    common.ts                  # apiSuccess(), apiError() wrappers
    users.ts                   # mockUsers
    pictures.ts                # createPictureDto(), createPictureDtoList(), etc.
    index.ts                   # Re-exports
  helpers/                     # Shared test helpers
    notification.ts            # getNotification() helper
  tests/                       # Test specs organized by feature
    smoke.spec.ts
    auth/
    pictures/
```

### Commands

```bash
yarn test:playwright               # Run in Chromium only
yarn test:playwright:all           # All 5 browser projects
yarn test:playwright:firefox       # Firefox only
yarn test:playwright:webkit        # WebKit only
yarn test:playwright:mobile        # Mobile Chrome + Mobile Safari
yarn test:playwright:ui            # Playwright UI mode
yarn test:playwright:headed        # Headed mode (visible browser)
yarn test:playwright:coverage      # With code coverage (monocart-reporter)
```

### Conventions

1. **Always import `test` and `expect` from `fixtures/`** — not from `@playwright/test` directly. The custom `test` provides `authenticatedPage` / `unauthenticatedPage` fixtures with pre-configured API mocks
2. **Page Object Model** — all page interactions go through PO classes extending `BasePage`. Each PO implements `waitForReady()` for page readiness
3. **Mock data via factories** — use `createPictureDto()`, `createPictureDtoList()` etc. from `mocks/` to generate test data
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
