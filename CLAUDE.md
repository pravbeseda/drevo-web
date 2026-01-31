# CLAUDE.md - Dive-in Instructions for Drevo-Web Project

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

## Project Structure

```
apps/
  client/                    # Main Angular application
    src/app/
      pages/                 # Pages (lazy-loaded)
        login/               # Authentication
        article/             # Article view
        article-edit/        # Article editing
        search/              # Search
        main/                # Home page
        shared-editor/       # Collaborative editing
      services/              # Application services
      interceptors/          # HTTP interceptors
      guards/                # Route guards
      layout/                # Layout components
      models/                # Types
    src/environments/        # Environment configs
  client-e2e/                # E2E tests (Playwright)

libs/
  core/                      # Core: HTTP, logging, notifications
    http/                    # HTTP utilities, error mapper
    logging/                 # IndexedDB + Sentry + Console logging
    services/                # NotificationService, StorageService
  shared/                    # Shared models and types
    models/                  # User, Article, AuthState, etc.
  editor/                    # CodeMirror editor component
  ui/                        # UI components (button, input, spinner, etc.)
```

## Legacy Backend (Yii1)

```
legacy-drevo-yii/            # Symlink → ~/WebProjects/drevo/drevo-yii
  protected/
    controllers/
      api/                   # API controllers (only this folder is modified)
    models/                  # Data models (reference for data structures)
```

- **Role**: Backend for the Angular app
- **Policy**: If possible, do not modify existing code, only add new API endpoints
- **Use as reference**: Data structures and business logic

## Import Aliases

```typescript
import { ... } from '@drevo-web/core';
import { ... } from '@drevo-web/shared';
import { ... } from '@drevo-web/ui';
import { ... } from '@drevo-web/editor';
```

## Key Patterns

### State Management — Signals

```typescript
readonly isLoading = signal(false);
readonly data = signal<Data | undefined>(undefined);
readonly hasData = computed(() => !!this.data());

// Convert Observable to Signal
readonly user = toSignal(this.authService.user$);
```

### HTTP & Authentication

- **AuthInterceptor** (`interceptors/auth.interceptor.ts`) — CSRF tokens, 401/403 handling
- **CSRF** — automatically added to POST/PUT/DELETE/PATCH
- **Credentials** — `withCredentials: true` for all API requests
- **API Proxy** — dev: `/api/*` → `http://drevo-local.ru`

### Components

- **Standalone components** — always `standalone: true`
- **Lazy loading** — routes use `loadComponent`
- **Zoneless** — `provideZonelessChangeDetection()`

### Styles

- SCSS with Angular Material theming
- Themes: `html` (light), `html.dark-theme` (dark)
- Shared styles: `libs/ui/src/lib/styles/`
- **Color tokens only** — use `--themed-*` CSS variables from `libs/ui/src/lib/styles/_theme-colors.scss`. Add new tokens there if needed, never use hardcoded colors or Angular Material color tokens directly.

```scss
// Good
background: var(--themed-primary-bg);
color: var(--themed-text-secondary);

// Bad
background: #ffffff;
color: grey;
background: var(--mat-sys-surface);           // No direct Material tokens!
color: var(--mat-sys-on-surface);             // No direct Material tokens!
```

## Commands

```bash
# Development
yarn dev                    # Dev server at localhost:4200

# Build
yarn build                  # Production build
yarn build:dev              # Development build

# Tests
yarn nx test client         # Unit tests
yarn nx e2e client-e2e      # E2E tests

# Code quality
yarn lint                   # ESLint
yarn format:check           # Prettier check
yarn format:fix             # Prettier fix

# Affected (for CI)
yarn nx affected -t lint,test,build
```

## Environments

| Environment | Port | Base href |
|-------------|------|-----------|
| Production | 4002 | `/` |
| Staging | 4001 | `/staging` |
| Development | 4200 | `/` |

## Key Configuration Files

- `nx.json` — Nx workspace config
- `tsconfig.base.json` — Base TS config with path aliases
- `apps/client/project.json` — Angular project config
- `proxy.conf.json` — Dev proxy config

## Code Conventions

1. **Strict TypeScript** — no implicit any, strict null checks
2. **Standalone components** — always
3. **Signals** for reactive state
4. **takeUntilDestroyed()** for subscription cleanup
5. **Russian language** in UI, English in code
6. **Lazy loading** for all pages
7. **Comments in English only** — and only where code doesn't explain itself
8. **Unit tests** — Jest + Spectator only (no other testing utilities)
9. **Color tokens only** — use `--themed-*` variables from `_theme-colors.scss`, no hardcoded colors or direct Angular Material tokens (`--mat-*`)
10. **UI components from `@drevo-web/ui` only** — never use `mat-*` components (MatButton, MatIcon, etc.) directly outside the `libs/ui` library. Always use wrapper components from `@drevo-web/ui` instead
11. **No `null`** — use `undefined` instead of `null` everywhere
12. **No `any`** — use `unknown` if type is truly unknown, otherwise define proper types
13. **No magic numbers** — extract numeric literals into named constants (e.g. `const DEBOUNCE_MS = 300`)
14. **Readonly interface properties** — all interface properties must be `readonly` by default; mutable properties only with justified necessity

## Unit Testing

Always use Jest with Spectator for unit tests:

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

Centralized logging via `LoggerService`:
- Console (dev)
- IndexedDB (browser storage)
- Sentry (production errors)

```typescript
import { LoggerService } from '@drevo-web/core';

private readonly logger = inject(LoggerService).withContext('MyService');

this.logger.info('message', { data });
this.logger.error('error', error);
```

## Deployment

- Atomic deployment via symlink switching
- PM2 for process management
- `scripts/deploy-*.sh` for deployment

## Git Workflow

- `main` — main branch for CI
- `staging` — staging deployment
- `production` — production deployment
- Feature branches → PR to main
