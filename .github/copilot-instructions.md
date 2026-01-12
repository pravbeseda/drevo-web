# Drevo Web - AI Coding Agent Instructions

This is an Nx monorepo for the Drevo web application, migrating from a legacy Yii1 PHP application to a modern Angular + Node.js stack.

## Architecture Overview

### Workspace Structure

- **apps/client/** - Angular 20+ standalone application (zoneless, SSR-enabled)
- **apps/client-e2e/** - Playwright E2E tests with atomized CI targets
- **libs/core/** - Core services (logging, HTTP error handling, notifications)
- **libs/editor/** - CodeMirror-based editor component for wiki markup
- **libs/shared/** - Shared TypeScript utilities and types (buildable)
- **libs/ui/** - Angular Material UI components and shared styles
- **legacy-drevo-yii/** - Legacy PHP application (being migrated from)

### Key Architectural Decisions

1. **Angular Standalone Components**: All components use standalone API, no NgModules
2. **Zoneless Change Detection**: Application uses `provideZonelessChangeDetection()`
3. **SSR with Hydration**: Server-side rendering with event replay (`withEventReplay()`)
4. **Lazy Loading**: All routes use `loadComponent()` for code splitting
5. **Nx Affected**: CI/CD optimizes builds by only running tasks for affected projects

## Development Workflows

### Running Commands

```bash
# Development server (proxies API requests to legacy PHP app)
yarn nx serve client                    # or: yarn dev

# Building
yarn nx build client --configuration=production
yarn nx affected -t build               # Build only affected projects

# Testing
yarn nx test client                     # Unit tests with Jest
yarn nx e2e client-e2e                 # E2E tests with Playwright
yarn nx affected -t test,lint          # Run tests for affected projects

# Linting (uses ESLint 9+ flat config)
yarn nx lint client
yarn nx affected -t lint --parallel
```

### Proxy Configuration

Development server at `apps/client/proxy.conf.json` proxies API requests to the legacy Yii application, allowing gradual migration. Check this file to understand which endpoints are still served by PHP.

### SSR Development

The application uses Angular Universal with Express. Key files:
- `apps/client/src/server.ts` - Express server configuration
- `apps/client/src/main.server.ts` - Server-side entry point

## Project-Specific Conventions

### Testing (CRITICAL - Read testing.instructions.md)

**ALWAYS use Spectator + Jest**, never TestBed directly or Jasmine:

```typescript
// Services
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';

// Components (prefer shallow: true)
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';

// HTTP testing
import { createHttpFactory, SpectatorHttp } from '@ngneat/spectator/jest';
```

See [.github/instructions/testing.instructions.md](instructions/testing.instructions.md) for comprehensive examples.

### Angular Component Patterns

1. **Change Detection**: Use `ChangeDetectionStrategy.OnPush` by default
2. **View Encapsulation**: Use `ViewEncapsulation.None` only when styling dynamic HTML (e.g., [article-content.component.ts](../apps/client/src/app/pages/article/article-content/article-content.component.ts))
3. **Dependency Injection**: Use `inject()` function in constructors over constructor parameters
4. **Template Syntax**: Components have explicit `template` or `templateUrl`, never inline for complex templates

Example from codebase (article-content.component.ts):
```typescript
@Component({
    selector: 'app-article-content',
    template: '<div [innerHTML]="sanitizedContent"></div>',
    styleUrls: ['./article-content.component.scss'],
    encapsulation: ViewEncapsulation.None, // For dynamic HTML styling
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleContentComponent {
    private readonly elementRef = inject(ElementRef<HTMLElement>);
    private readonly router = inject(Router);
    // ...
}
```

### Core Library Services

Located in `libs/core/src/lib/`:

- **LoggerService**: Contextual logging with production mode (`logger.withContext('MyComponent')`)
- **NotificationService**: User notifications (info/success/error messages)
- **ErrorNotificationInterceptor**: Automatic HTTP error notification with context tokens
- **HTTP Context Tokens**: Control error handling per-request
  ```typescript
  import { SKIP_ERROR_NOTIFICATION } from '@drevo-web/core';
  
  this.http.get('/api/data', {
      context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true)
  });
  ```

### Migration Context (Legacy PHP Integration)

The application is gradually migrating from Yii1 PHP. When working on features:
1. Check `apps/client/proxy.conf.json` to see which routes are still proxied to PHP
2. Article content may contain legacy wiki markup with inline JavaScript handlers (see `preprocessContent()` in article-content.component.ts)
3. API responses may use legacy formats - normalize in services/interceptors

### TypeScript Configuration

- **Strict Mode**: Enabled (`strict: true`, `noImplicitReturns`, `noFallthroughCasesInSwitch`)
- **Path Aliases**: Use `@drevo-web/*` imports for libs (defined in `tsconfig.base.json`)
- **Target**: ES2022 with ESM modules

### Styling Conventions

- **Primary**: SCSS with Angular Material theming
- **Shared Styles**: `libs/ui/src/lib/styles/` (auto-included via `stylePreprocessorOptions`)
- **Global Styles**: `apps/client/src/styles.scss` with modern-normalize
- **Component Styles**: Prefer `:host` selector for component root styling

## CI/CD and Deployment

### Branches and Environments

- `main` → development
- `staging` → staging environment (deploys with `/staging` base-href)
- `production` → production environment (deploys with `/new` base-href)

### GitHub Actions

Workflow uses Nx affected to optimize:
- Parallel test execution for changed projects only
- Atomized E2E tests (each test file runs independently)
- Merge reports at the end for comprehensive results

### Security Scanning

Pre-commit hooks and GitHub Actions scan for secrets. See [docs/security-scanning.md](../docs/security-scanning.md).

## Code Generation

Use Nx generators with Angular schematics:

```bash
# Component (uses OnPush by default)
nx g @nx/angular:component my-component --project=client --changeDetection=OnPush

# Service
nx g @nx/angular:service services/my-service --project=client

# Generate with Spectator test
nx g @ngneat/spectator:spectator-component my-component --project=client
```

Nx instructions are in [.github/instructions/nx.instructions.md](instructions/nx.instructions.md) - reference these when working with Nx workspace.

## Key Files to Reference

- **Nx Workspace**: [nx.json](../nx.json) - task dependencies, caching, and targets
- **Root Package**: [package.json](../package.json) - dependencies and scripts
- **App Config**: [apps/client/src/app/app.config.ts](../apps/client/src/app/app.config.ts) - DI providers
- **Routes**: [apps/client/src/app/app.routes.ts](../apps/client/src/app/app.routes.ts) - lazy-loaded routes
- **Environments**: [apps/client/src/environments/](../apps/client/src/environments/) - configuration per environment
- **Proxy Config**: [apps/client/proxy.conf.json](../apps/client/proxy.conf.json) - API proxy for legacy backend

## Common Pitfalls

1. **Don't use TestBed directly** - Always use Spectator factories
2. **Don't bypass Nx affected** - Let CI/CD optimize builds
3. **Check proxy config first** - Before creating new API services, verify the endpoint isn't already proxied
4. **SSR compatibility** - Avoid browser-only APIs in components (use `isPlatformBrowser()` guard)
5. **Legacy HTML content** - Article content may contain non-standard markup; sanitize and process carefully
6. **Path imports** - Use `@drevo-web/core`, `@drevo-web/shared`, etc., not relative paths across projects

## Questions to Ask for Unclear Requirements

- Does this feature need SSR support, or can it be client-only?
- Should the new API endpoint be in the Angular app or still use the PHP proxy?
- What's the migration strategy for this component from the legacy app?
- Do existing E2E tests cover this workflow, or do we need new ones?
- Should this code go in a shared library or stay in the client app?
