# Drevo-Web

These instructions apply to the entire repository unless a deeper `AGENTS.md` overrides them.

Nx monorepo migrating a legacy Yii1 PHP app to Angular. Zoneless change detection, SSR, Angular Signals for state (not NgRx).

| Category | Technology |
|----------|------------|
| Frontend | Angular 22, RxJS 7.8, Angular Material 22 (M3) |
| State | Angular Signals |
| Editor | CodeMirror 6 |
| SSR | Express + Angular SSR |
| Unit tests | Jest + Spectator (only) |
| Integration tests | Playwright |
| Styles | SCSS + Angular Material theming |
| Monitoring | Sentry |
| Package manager | Yarn |

## Where the instructions live

This file is the canon: it carries every rule you must not miss. The detail behind a rule sits in `docs/`, and a rule here links to its file — follow the link before working in that area rather than guessing.

| File | Covers |
|------|--------|
| [`docs/architecture.md`](docs/architecture.md) | Feature layout, where a type belongs, `shared/`, `layout/`, barrels, knip member types |
| [`docs/patterns.md`](docs/patterns.md) | Signals, the two-layer HTTP services, auth and HTTP context tokens, SSR-safe browser access, logging |
| [`docs/testing.md`](docs/testing.md) | Spectator recipes, Playwright conventions, what each suite cannot catch |
| [`docs/styles.md`](docs/styles.md) | Colour and size tokens, the UI library, `libs/editor` |
| [`docs/quality-gates.md`](docs/quality-gates.md) | Coverage floors, type-coverage thresholds, knip, why the build is a gate |
| [`docs/release-workflow.md`](docs/release-workflow.md) | Cutting a release, bump types, the manual tag fallback, `iframe` hotfixes |
| [`docs/legacy-yii.md`](docs/legacy-yii.md) | Adding an API endpoint, the real shape of the data, running the PHP tests |

One more instruction file applies only within its own scope: `legacy-drevo-yii/CLAUDE.md`, for the PHP subtree. Claude Code reads this file through the `.claude/CLAUDE.md` shim, and `.github/copilot-instructions.md` is a generated copy of it — edit the canon, never those.

## Branches

- `main` — active development, default branch. Push triggers the beta deploy (drevo-beta, port 4010); tag `X.Y.Z` triggers the release deploy (drevo-release, port 4011).
- `iframe` — frozen legacy (old Yii-era wrapper). CI runs automatically on PR; CD is manual-only via `workflow_dispatch`. Hotfix tags: `iframe-X.Y.Z`.

## Commands

Prefer repo scripts over ad hoc commands. Search with `rg` / `rg --files`.

```bash
yarn serve                         # Dev server at localhost:4200 (proxies /api to the PHP backend)
yarn build                         # Production build
yarn build:dev                     # Development build
yarn nx test client                # Unit tests for one project
yarn format:fix                    # Apply Prettier
yarn nx e2e client-e2e             # API contract tests against a running drevo-local.ru backend
```

Validate narrowly first, then broaden: in Nx, run against the affected app or lib when the target is known (`yarn nx affected -t test,lint`).

Scaffolding:

```bash
nx g @nx/angular:component my-component --project=client --changeDetection=OnPush
nx g @nx/angular:service services/my-service --project=client
```

### Quality gates

Green on all of these is what "done" means (Quality rule 9), in this order — the earlier ones are the cheaper to fix. Together they are what `cd-main-beta.yml` and `playwright.yml` run on the PR:

```bash
yarn nx affected -t lint                        # ESLint; the pre-commit hook runs it on staged apps/, libs/ and testing/ files
yarn nx affected -t test --configuration=ci     # unit tests + per-project coverage thresholds
yarn lint:playwright                            # ESLint on testing/playwright — no Nx project, so `affected` misses it
yarn format:check                               # Prettier
yarn lint:styles                                # Stylelint — when SCSS was touched
yarn lint:types                                 # type-coverage on libs/* — implicit `any` the lint cannot see
yarn lint:typecheck                             # tsc --noEmit on the projects the build never compiles — specs, test helpers, e2e
yarn lint:coverage                              # per-file coverage floor — reads the coverage the test run just wrote
yarn test:scripts                               # node:test specs for the gate scripts in scripts/ — no jest project there
yarn lint:workflows                             # release job graph invariants — guards that only fail on a real tag push
yarn knip                                       # dead code and unused deps — after refactors and deletions
yarn test:playwright                            # integration tests, Chromium (other browsers: test:playwright:* in package.json)
yarn build                                      # production build — the type check the unit tests cannot do
```

Never lower a coverage or type-coverage threshold, and never widen the coverage excludes, to make a gate pass without explicit approval — see [`docs/quality-gates.md`](docs/quality-gates.md).

`nx e2e client-e2e` is not among them: its API tests are disabled when `CI` is set, and locally they need the Yii backend up, so the PR is never gated on them.

## Architecture

```
apps/
  client/
    src/app/
      guards/                # Route guards (app-level)
      interceptors/          # HTTP interceptors (app-level)
      services/              # Global providedIn:'root' services, grouped by domain
      layout/                # Layout shell (header, sidebar, version-display)
      features/              # Self-contained domain folders
      shared/                # Code shared across multiple features
    src/environments/        # Environment configs
  client-e2e/                # API contract tests (Playwright)

libs/
  core/                      # HTTP utilities, logging, notifications, DI tokens
  shared/                    # Shared models, types, helpers (cross-app)
  editor/                    # CodeMirror editor component
  ui/                        # UI component library
legacy-drevo-yii/            # PHP app being migrated (proxied via apps/client/proxy.conf.json)
```

Entry points: routing `apps/client/src/app/app.routes.ts`, app config `apps/client/src/app/app.config.ts`, proxy `apps/client/proxy.conf.json` (`/api` and `/pictures` → `http://drevo-local.ru`), path aliases `tsconfig.base.json`.

How a feature is laid out and where a given type belongs: [`docs/architecture.md`](docs/architecture.md).

### Import direction rules

Each line is the complete set of what its folder may import — an arrow that is not here is an import that does not happen. A feature reaching for another feature, for `layout/`, `guards/` or `interceptors/` is the case this table exists to catch: extract the shared part to `app/shared/` (components, models) or `app/services/` (services) and both sides import that.

```
features/X/      →  app/services/, app/shared/, @drevo-web/*
app/shared/      →  app/services/, @drevo-web/*
layout/          →  layout/services/, app/services/, app/shared/, @drevo-web/*
app/services/    →  @drevo-web/*
guards/          →  app/services/, @drevo-web/*
interceptors/    →  app/services/, @drevo-web/*
```

A dynamic `import()` through `ModalService` is exempt: it creates no compile-time dependency, so a feature may lazily open a modal owned by another feature without a wrapper service.

### Import aliases

```typescript
import { ... } from '@drevo-web/core';
import { ... } from '@drevo-web/core/testing';    // test mocks
import { ... } from '@drevo-web/shared';
import { ... } from '@drevo-web/shared/testing';  // createMockUser, expectAny, expectObjectLike
import { ... } from '@drevo-web/ui';
import { ... } from '@drevo-web/editor';
```

Never reach across projects with a relative path — always the alias. Library boundaries carry the only barrels; inside `apps/client/` an import names the concrete module.

### Selector prefixes

- `app-` — application components (`apps/client/`)
- `ui-` — UI library components (`libs/ui/`)

### Legacy backend (Yii1)

Check `apps/client/proxy.conf.json` before creating an API service — the endpoint may still be PHP, and a duplicate service is the usual result of skipping that check. Working in the Yii1 app itself: [`docs/legacy-yii.md`](docs/legacy-yii.md).

## Design principles

- **Decompose complex logic** — small, focused, single-responsibility units, but avoid over-engineering
- **No anti-patterns** — no god components, tight coupling, shared mutable state, deep inheritance hierarchies
- **No logic duplication** — reuse existing services, utilities and patterns; extract shared logic instead of copy-pasting
- **Pre-implementation review** — before implementing any task, analyze the proposed solution for over-engineering, non-Angular-way patterns, anti-patterns and scalability/extensibility issues. Report findings and propose alternatives **before** writing code
- **Declarative over imperative** — Angular template syntax over manual DOM manipulation, reactive streams over manual subscriptions, `computed()`/`toSignal()` over manual state sync, `@if`/`@for` over hidden-flag toggling

## Conventions

### TypeScript

1. **Strict TypeScript** — no implicit any, strict null checks
2. **Describe the shape** — a real type where one exists, `unknown` where the shape is genuinely open and the code narrows it. `any` is an error (`@typescript-eslint/no-explicit-any`), so it fails the commit rather than spending a warning budget
3. **Annotate the error at the boundary** — the places `any` still enters are library signatures, not the code here: `catchError(err => …)` and `subscribe({ error: err => … })` are typed `any` by RxJS, `HttpErrorResponse.error` and `NavigationError.error` by Angular. Write `(err: unknown)` on the callback, `const error: unknown = response.error` on the read. `no-restricted-syntax` in `eslint.config.mjs` enforces the two RxJS forms everywhere; the property reads rest on convention — `yarn lint:types` measures them in `libs/*` only, and `apps/client` is outside that gate until #254 is settled, so an app-side read that skips the annotation fails nothing
4. **`undefined` is absence** — throughout the codebase, enforced by `no-null/no-null`
5. **Readonly interface properties** — all interface properties are `readonly` by default
6. **Named constants over literals** — a number in the logic gets a name. Exception: CSS margin/padding/sizes of atomic UI components
7. **Narrow instead of asserting** — `if`, `@if (value(); as v)`, optional chaining. Enforced by `@typescript-eslint/no-non-null-assertion` for `.ts` files, convention in templates
8. **Import order** — one group, alphabetical by path, case-insensitive, no blank lines between imports; type imports sort alongside value imports. `import/order` enforces it and is off in `*.spec.ts`; check with `yarn nx lint <project>`
9. **Explicit types on the public API** — annotate return types of public service and component methods, and the types behind `input()`/`output()`/`model()`. Inference stays for locals, private helpers and template-only expressions. A wrong inferred return type is a silent API change; an annotated one fails at the source. The rule guards against inference that can drift with the implementation, not against signature defaults: a payload-less event is bare `output()` — its type is the fixed `void` default of Angular's signature, and `no-unnecessary-type-arguments` rejects restating it — while anything whose type would be inferred from a value (an `input()` with an initial value, a method body) still gets the annotation

### Angular

1. **Standalone components** — always, but omit `standalone: true` (it is the default)
2. **Signals** for reactive state, private writable + public readonly. Public writable signals are forbidden — always expose via `asReadonly()`
3. **`inject()` for DI**, `ChangeDetectionStrategy.OnPush` on components
4. **Naming: `Subject` postfix, `$` only for Observable** — `_eventSubject` for a Subject, `event$` for its public Observable
5. **`providedIn: 'root'` only for global services** — page/feature-scoped services are provided in the component or route `providers` instead
6. **`takeUntilDestroyed()`** for subscription cleanup
7. **Lazy loading** for all pages, via `loadComponent()` / `loadChildren()`
8. **Angular Material stays inside `libs/ui`** — the rest of the workspace consumes it through `@drevo-web/ui` components and `--themed-*` tokens
9. **Auth guard on all routes** — login is the one page reachable without it
10. **Browser APIs arrive by injection** — `WINDOW`, `DOCUMENT`, `StorageService`; the server render has no globals, so injection is what keeps SSR working
11. **Zoneless** — `provideZonelessChangeDetection()`, no `zone.js`
12. **Styles and templates in their own files** — `styleUrl` to a `.scss`, `templateUrl` to an `.html`
13. **Flatten instead of nesting subscriptions** — `switchMap`, `concatMap`, `mergeMap`, `exhaustMap` compose the chain; a `subscribe` inside a `subscribe` leaks the outer one
14. **Open redirects** — validate any return URL with `isValidReturnUrl()` from `@drevo-web/shared`

The shapes these rules describe — signals, the two HTTP layers, the context tokens, the SSR guard, the logger — are in [`docs/patterns.md`](docs/patterns.md).

### Styles

Every colour comes from a `--themed-*` variable in `libs/ui/src/lib/styles/_theme-colors.scss`, and every size from a token in `_tokens.scss`; a value with no token yet gets one added in the same change. Never define local CSS custom properties for sizes. `yarn lint:styles` enforces both. Details, the exceptions and the UI library: [`docs/styles.md`](docs/styles.md).

### Quality

1. **Russian language** in the UI, **English** in code, comments, docs, commit messages and PR text
2. **Comments** — only where the code does not explain itself
3. **TDD is mandatory — always, no exceptions.** Write the test first and *watch it fail* before writing any implementation. Red → green → refactor. A change small enough to "obviously not need a test" is small enough to write the test for. A test that passes before the implementation exists proves nothing
    - **Unit tests cover the implementation** — Jest + Spectator, never TestBed. Test the public API only
    - **Playwright coverage must be explicitly considered for every change** — decide whether the behavior also needs an integration test in `testing/playwright/`, and state the decision either way
    - **Bug fixes** — when a bug is real but existing tests pass, the missing failing test comes first (unit or Playwright, whichever fits); only then fix until it passes. Every bug fix ends up with a regression test
    - **Non-functional changes need tests too** — performance fixes get an assertion that fails on the slow implementation; refactors that must preserve behavior get characterization tests against the old behavior before the swap
    - If existing tests break — analyze the root cause before fixing

    How both suites are written: [`docs/testing.md`](docs/testing.md)
4. **`data-testid` attributes for test selectors** — in tests, query elements only via `[data-testid="name"]`. Add the attribute to a template only when a test actually needs it
5. **No unused CSS classes in templates** — every class in an HTML template has matching styles in the SCSS; remove classes that are not used for styling
6. **Log everything via `LoggerService`** — user actions, navigation and errors. No silent failures
7. **No `title` attribute** — `matTooltip` for a visual hint, `aria-label` for an accessible name without one
8. **Failing tests are a red flag, not an obstacle** — if a change makes an existing test fail, do NOT simply fix the test. First investigate whether the new code broke expected behavior. Only modify the test when the behavioral change is intentional and justified (a deliberate API change, not a side effect). When in doubt, fix the code, not the test
9. **Run the quality gates before reporting done** — the block above, in that order; a task is complete when they are green, not when the code looks right. If a step fails, say so with its output rather than reporting success
10. **No `TODO`/`FIXME` comments** — `sonarjs/todo-tag` and `sonarjs/fixme-tag` are errors, so such a comment fails lint and blocks the commit. Either finish the work now or open a GitHub issue for it; when the code needs the context, write a plain comment stating the constraint and referencing the issue number
11. **Delete the code a change orphans** — when a refactor or a deletion leaves an export, file or dependency with no consumer, remove it in the same change. `yarn knip` finds them
12. **Update the docs a change invalidates** — when behavior or a developer workflow moves, the doc describing it moves with it in the same change

## Gotchas

- **`diff-match-patch` uses `export =`.** `libs/shared` has `esModuleInterop: true`, so import it as a default: `import DiffMatchPatch from 'diff-match-patch';`. Never `require()` — esbuild emits ESM for the browser bundle and `require` is not defined there
- **New npm packages used by `libs/shared` go into `libs/shared/package.json` `dependencies` too** — the `@nx/dependency-checks` lint rule enforces it
- **Duplicate `@codemirror/*` copies break only the production build** (`TS2345: EditorView is not assignable to EditorView` — two different `dist/index` paths). Adding a scoped package as a direct dependency is what splits the tree. After touching any `@codemirror/*` version, verify and build — `nx test` passes regardless:

  ```bash
  find node_modules/@codemirror -path "*/node_modules/@codemirror/*" -name package.json   # must print nothing
  yarn nx build client --configuration=production
  ```

  Fix a split by bumping `@codemirror/view` and `@codemirror/state` to versions every dependent range accepts, then `yarn install && yarn upgrade @codemirror/...`.
- **`diff` v8+ ships its own types** — do not add `@types/diff`
- **`nx migrate` drags Angular along** — an `@nx/angular` major can carry a `packageJsonUpdates` entry that bumps `@angular/core` with `alwaysAddToPackageJson`, and `--to` does not hold it back. Before any Nx major, read the plugin's manifest rather than trusting the version number: `npm pack @nx/angular@<version>`, then read `package/migrations.json` and look at `packageJsonUpdates`. Check `nx.json` afterwards too — migrations rewrite it as plain JSON and silently drop its JSONC comments, and the gitignore migrations leave the file without a trailing newline. Prettier skips extensionless files, so no gate catches either

## Safety

- **Never commit or push to `main`** — create a working branch, push the branch, and open a pull request
- **Never add assistant attribution** — no `Co-Authored-By: Claude …` trailer in a commit message, no "Generated with …" line in a PR body, and no such credit in READMEs, docs or code comments
- Do not edit generated or dependency directories — `dist/`, `.angular/`, `node_modules/` — unless explicitly asked
