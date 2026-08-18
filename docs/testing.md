# Testing

Detail behind Quality rule 3 of [`AGENTS.md`](../AGENTS.md). TDD is mandatory and the canon states it; this file is how the two suites are written.

## Unit tests — Jest + Spectator

Never `TestBed` and never Jasmine. That includes `TestBed.flushEffects()` and `TestBed.inject()`: mixing raw TestBed into a Spectator suite breaks the convention. When a test seems to need an effect flushed, prefer a design that does not require the effect (load data in the `subscribe` handler rather than in an `effect()`), or drive change detection through Spectator.

```typescript
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { createMockUser } from '@drevo-web/shared/testing';

const createService = createServiceFactory({
    service: MyService,
    providers: [mockLoggerProvider()],
    mocks: [HttpClient],
});

const createComponent = createComponentFactory({
    component: MyComponent,
    imports: [NoopAnimationsModule],
    shallow: true,          // isolate from child components
    detectChanges: false,   // when the component calls services in ngOnInit
});

// Usage: spectator.setInput(), spectator.click(), spectator.query()
```

- Test the public API only — methods, properties, inputs and outputs — never internals
- Use `mockLoggerProvider()` from `@drevo-web/core/testing`, not `mocks: [LoggerService]`: the mock needs `withContext()` to return a logger
- Build `User` mocks with `createMockUser()` from `@drevo-web/shared/testing`, not hand-written literals. One default covers a newly required field, so adding one does not break every spec. `permissions` is shallow-merged, so `createMockUser({ permissions: { canModerate: true } })` works. Playwright uses its own `User` objects and may not resolve the alias — add new fields to those literals directly
- With `detectChanges: false`, set the mocks up before calling `spectator.detectChanges()`
- Query elements only via `[data-testid="name"]`; add the attribute to a template only when a test actually needs it
- `import/order` is off in `*.spec.ts`

### HTTP services

`createHttpFactory` gives the service a mock backend and the assertions that go with it:

```typescript
import { createHttpFactory, HttpMethod, SpectatorHttp } from '@ngneat/spectator/jest';

describe('ApiService', () => {
    let spectator: SpectatorHttp<ApiService>;
    const createHttp = createHttpFactory(ApiService);

    beforeEach(() => (spectator = createHttp()));

    it('should make a GET request', () => {
        spectator.service.getData().subscribe();
        spectator.expectOne('/api/data', HttpMethod.GET);
    });
});
```

### The Spectator API worth knowing

`spectator.query()` / `queryAll()` to find elements, `spectator.click()` and `spectator.typeInElement()` to drive them, `spectator.detectChanges()` to update the view, `spectator.inject()` to reach a provider, and `mockProvider()` for a provider mock the factory does not create for you.

## Integration tests — Playwright

Standalone suite in `testing/playwright/` — **separate from** `apps/client-e2e/`. Tests run against the dev server with a **mocked API**, so no real backend is required.

Structure: `fixtures/` (auth, mock-api, coverage), `pages/` (Page Objects), `mocks/` (data factories), `helpers/`, `tests/` (specs, one subdirectory per feature). `playwright.config.ts` defines 5 browser projects: chromium, firefox, webkit, mobile-chrome, mobile-safari.

1. **Always import `test` and `expect` from `fixtures/`** — not from `@playwright/test` directly. The custom `test` provides the `authenticatedPage` / `unauthenticatedPage` fixtures with pre-configured API mocks
2. **No selector ever appears in a spec.** `page.locator()`, `page.getByTestId()`, `page.getByRole()`, `page.getByText()` and `page.keyboard.*` all belong in a Page Object (`pages/`) or a helper (`helpers/`); a spec calls PO methods and nothing else. Before submitting, grep the specs for direct locator use
3. **Page Object Model** — PO classes extend `BasePage` and each implements `waitForReady()`
4. **Mock data via factories** — `createPictureDto()`, `createPictureDtoList()` etc. from `mocks/`. `mocks/index.ts` and `fixtures/index.ts` re-export what specs actually import, not the full surface of their folder — a factory reachable only from its concrete module is not a mistake. Importing from the concrete module always works; add the re-export to the barrel when a spec needs it there, and knip prunes it again once nothing does
5. **API mocking via `page.route()`** — the helpers in `fixtures/mock-api.fixture.ts` intercept requests at the network level
6. **Element selectors via `data-testid`** — same convention as the unit tests
7. **Tests organized by feature** — mirror the app's feature structure in `tests/`

## What each suite cannot do

- `nx test` is transpile-only (ts-jest): specs and source with real type errors pass it green. The build is the type check — `yarn nx build client --configuration=development` — and a green test run after touching a shared type or signature proves nothing. Two classes of error that slip past Jest and fail the build: a newly required interface field missing from a hand-built mock, and a wrong function signature for a framework type (an Angular validator must be `(control: AbstractControl) => ValidationErrors | null`). `yarn lint` catches neither
- Unit tests do not cover routing, real navigation, cross-component flows, SSR/hydration, or anything that needs a real browser — that is what Playwright is for
