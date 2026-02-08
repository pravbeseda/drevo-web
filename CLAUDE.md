# CLAUDE.md - Drevo-Web Project Instructions

## Quick Overview

**Drevo-Web** — Nx monorepo with Angular 21 application. Migration from legacy Yii1 app to modern stack.

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
yarn dev                           # Dev server at localhost:4200
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
  client/                    # Main Angular application
    src/app/
      pages/                 # Pages (lazy-loaded via app.routes.ts)
      services/              # Domain services (grouped by feature in subdirectories)
      components/            # Shared app-level components
      interceptors/          # HTTP interceptors
      guards/                # Route guards
      layout/                # Layout components (header, sidebar)
      models/                # Types and API DTOs
    src/environments/        # Environment configs
  client-e2e/                # E2E tests (Playwright)

libs/
  core/                      # HTTP utilities, logging, notifications, DI tokens
  shared/                    # Shared models, types, helpers
  editor/                    # CodeMirror editor component
  ui/                        # UI component library (see "Available UI Components")
```

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

## Code Conventions

### TypeScript

1. **Strict TypeScript** — no implicit any, strict null checks
2. **No `any`** — use `unknown` if type is truly unknown, otherwise define proper types
3. **No `null`** — use `undefined` instead of `null` everywhere
4. **Readonly interface properties** — all interface properties must be `readonly` by default
5. **No magic numbers** — extract into named constants. Exception: CSS margin/padding/sizes of atomic UI components

### Angular

1. **Standalone components** — always, but omit `standalone: true` (it's the default in Angular 21)
2. **Signals** for reactive state with private writable + public readonly pattern (see Key Patterns)
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
14. **Templates in separate HTML files** — use `templateUrl` for multi-element templates. Inline `template` is allowed only for single-element or single-line templates

### Quality

1. **Russian language** in UI, **English** in code and comments
2. **Comments** — English only, only where code doesn't explain itself
3. **Tests are mandatory** for new features and bug fixes. Use Jest + Spectator. Test public API only (methods, properties, inputs/outputs), not internal implementation. If existing tests break — analyze the root cause before fixing
4. **`data-testid` attributes for test selectors** — in tests, query elements only via `[data-testid="name"]` attributes. Add `data-testid` attributes to component templates only when actually needed by a test
5. **No unused CSS classes in templates** — every class in HTML templates must have corresponding styles in SCSS; remove classes that aren't used for styling
6. **Log everything via `LoggerService`** — all user actions, navigation, and errors. No silent failures

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

API service (low-level HTTP) + Domain service (business logic, mapping):

```typescript
// article-api.service.ts — HTTP layer (internal, not used by components)
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

// article.service.ts — Domain layer (used by components)
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
| Button | `ui-button` | |
| IconButton | `ui-icon-button` | |
| ActionButton | `ui-action-button` | |
| TextInput | `ui-text-input` | |
| Checkbox | `ui-checkbox` | |
| Icon | `ui-icon` | |
| Spinner | `ui-spinner` | |
| Tabs | `ui-tabs` | |
| TabsGroup | `ui-tabs-group` | + `TabGroup`, `TabGroupItem` interfaces |
| DropdownMenu | `ui-dropdown-menu` | + `uiDropdownMenuTrigger`, `ui-dropdown-menu-item` |
| VirtualScroller | `ui-virtual-scroller` | + `uiVirtualScrollerItem` directive |
| RightSidebar | `ui-right-sidebar` | |
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

## Logging

```typescript
import { LoggerService } from '@drevo-web/core';

private readonly logger = inject(LoggerService).withContext('MyService');

this.logger.info('message', { data });
this.logger.error('error', error);
```
