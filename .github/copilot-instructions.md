# Drevo Web - AI Coding Agent Instructions

Nx monorepo migrating from Yii1 PHP to Angular 21 + Node.js. Uses zoneless change detection and SSR.

## Architecture

| Path | Purpose |
|------|---------|
| `apps/client/` | Angular 21 standalone app (zoneless, SSR-enabled) |
| `libs/core/` | LoggerService, NotificationService, HTTP error handling |
| `libs/shared/` | TypeScript models (User, Article, AuthResponse) and helpers |
| `libs/ui/` | Angular Material components (Button, TextInput, Modal) |
| `libs/editor/` | CodeMirror-based wiki markup editor (SSR-safe, uses `EditorFactoryService`) |
| `legacy-drevo-yii/` | PHP app being migrated (proxied via `apps/client/proxy.conf.json`) |

**Key patterns**: Standalone components only, `inject()` for DI, `ChangeDetectionStrategy.OnPush`, lazy routes via `loadComponent()`.

**Branches**: `main` (default) - active development. Push triggers beta deploy, tag `X.Y.Z` triggers release. `iframe` - frozen legacy (manual deploy only).

## Commands

```bash
yarn serve                            # Dev server (proxies /api to PHP)
yarn nx test client                   # Unit tests
yarn nx affected -t test,lint         # Run only for changed projects
yarn nx e2e client-e2e               # Playwright E2E
```

## Testing (CRITICAL)

**Always use Spectator + Jest** - never TestBed or Jasmine. See [testing.instructions.md](instructions/testing.instructions.md).

```typescript
// Service test
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';

const createService = createServiceFactory({
    service: MyService,
    providers: [mockLoggerProvider()],
    mocks: [HttpClient],
});

// Component test
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';

const createComponent = createComponentFactory({
    component: MyComponent,
    imports: [NoopAnimationsModule],
    shallow: true,  // Isolate from child components
});

// Usage: spectator.setInput(), spectator.click(), spectator.query()
```

## Library Exports & Imports

Use path aliases defined in `tsconfig.base.json`:

```typescript
import { LoggerService, SKIP_ERROR_NOTIFICATION } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';  // Test utilities
import { User, AuthResponse, isValidReturnUrl } from '@drevo-web/shared';
import { ButtonComponent, ModalService } from '@drevo-web/ui';
```

## Core Services Pattern

```typescript
// Contextual logging
private readonly logger = inject(LoggerService).withContext('MyService');
this.logger.debug('message', { data });  // Disabled in production

// HTTP error control via context tokens
this.http.get('/api/data', {
    context: new HttpContext()
        .set(SKIP_ERROR_NOTIFICATION, true)           // No toast on error
        .set(SKIP_ERROR_FOR_STATUSES, [404])          // Skip specific codes
        .set(CUSTOM_ERROR_MESSAGE, 'Custom message')
});

// User notifications
inject(NotificationService).error('Something failed');
```

## SSR Compatibility

Guard browser-only code:
```typescript
private readonly platformId = inject(PLATFORM_ID);
if (isPlatformBrowser(this.platformId)) {
    // Browser-only: DOM, window, localStorage
}
```

## Legacy Migration Context

- Check `apps/client/proxy.conf.json` before creating API services - endpoints may still be PHP
- Article content contains legacy wiki markup with `onclick="javascript:..."` handlers - see `preprocessContent()` in [article-content.component.ts](../apps/client/src/app/pages/article/article-content/article-content.component.ts)
- Use `isValidReturnUrl()` from `@drevo-web/shared` to prevent open redirects

## Editor Library (`libs/editor`)

CodeMirror 6-based editor for wiki markup with syntax highlighting:

```typescript
import { EditorComponent } from '@drevo-web/editor';

// In template:
<lib-editor 
    [content]="wikiText" 
    [linksStatus]="linksValidity" 
    (contentChanged)="onEdit($event)"
    (updateLinksEvent)="validateLinks($event)" />
```

- Uses `WikiHighlighterService` for syntax highlighting with link validation
- SSR-safe: checks `EditorFactoryService.isServer()` before creating EditorView
- Emits `updateLinksEvent` with article links for async validation

## Code Generation

Use Nx MCP tools when available (see [nx.instructions.md](instructions/nx.instructions.md)), or CLI:

```bash
nx g @nx/angular:component my-component --project=client --changeDetection=OnPush
nx g @nx/angular:service services/my-service --project=client
```

## Common Pitfalls

1. ❌ TestBed → ✅ Spectator factories
2. ❌ Relative cross-project imports → ✅ `@drevo-web/*` aliases
3. ❌ Direct browser APIs → ✅ `isPlatformBrowser()` guard
4. ❌ Skipping Nx affected → ✅ Let CI optimize builds
5. ❌ Creating duplicate API services → ✅ Check proxy config first
