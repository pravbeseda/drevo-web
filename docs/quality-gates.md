# Quality gates

Detail behind the "Quality gates" block in [`AGENTS.md`](../AGENTS.md). The canon lists the commands and the order; this file is why three of them are shaped the way they are and what you may not do to make them pass.

## Coverage thresholds only ratchet up

`coverageThreshold` lives per project in its `jest.config.ts` (`libs/core/jest.config.cts`). When a change drops coverage below the threshold, write the missing tests.

Never lower a threshold to make the run pass without explicit approval, and never widen the `collectCoverageFrom` excludes in `jest.preset.js` to hide code from the denominator.

## Every file carries its own floor

`yarn lint:coverage` (`scripts/check-file-coverage.js`) reads the same coverage run as the aggregate and checks each file on its own, so a new component or service with no spec fails by name instead of being absorbed by an aggregate over hundreds of files. Two things to know before touching it:

- **It is a script and not a `coverageThreshold` glob for a reason.** Jest assigns every covered file to exactly one threshold group, so a glob covering a project empties `global` — and `@jest/reporters` then *skips* the global check rather than failing it ("don't error when the global threshold group doesn't match any files"). Putting a per-file floor in that object switches the project aggregate off, silently and without any output saying so
- **Exceptions are listed by path, never by pattern.** A category reads as though its members were declarations, and several here are not: `article.routes.ts` exports predicates and has a spec, `models/topic.ts` exports two functions, `providers/svg-icons.ts` loops and calls into the registry. Each exception carries the file's measured figure as its floor, so an exempt file cannot regress either, and the script prints an exception whose file has since cleared the project floor so it can be deleted

A file nothing can test gets an exception with a reason and an issue (open ones: #267). Everything else gets a spec.

## Type-coverage thresholds only ratchet up

The eight `--at-least` values in the `lint:types:*` scripts sit exactly on the measured figure, with no slack. `any` is banned outright by lint, so this gate exists for the *implicit* kind the lint cannot see — values whose type came from an untyped boundary.

Raise a threshold when a change improves the figure; never lower one to make the run pass without explicit approval. The fix is almost always an annotation at the boundary (`const error: unknown = err.error`), which restores narrowing rather than suppressing the metric.

`apps/client` is deliberately absent: type-coverage counts every value typed through a `@drevo-web/*` alias as `any` there, so its figure measures the tool rather than the code — issue #254 carries the reproduction.

## Dead code

`yarn knip` finds exports, files and dependencies a change orphaned. It runs blocking in CI, so leaving them behind fails the PR anyway — delete them in the same change. For the "only reachable through an exported member" report, see [architecture.md](architecture.md).

## Why the build is a gate

`nx test` is transpile-only, so type errors surface at build time and nowhere earlier. A green unit run is not a type check — see [testing.md](testing.md).

## What the build still cannot check

The build compiles `tsconfig.app.json`, and that project sees less than it looks: its `files` names three entry points, so the compiler walks the import graph from `main.ts`, `main.server.ts` and `server.ts` and nothing else, while its `exclude` drops `*.spec.ts`, `*.test.ts` and `*.testing.ts`. Every spec, every test helper, every e2e file and every app module no entry point reaches is transpiled and never type-checked.

`yarn lint:typecheck` runs `tsc --noEmit` over the projects that gap leaves out:

| project | what it adds |
| --- | --- |
| `libs/shared`, `libs/core`, `libs/ui`, `libs/editor` — `tsconfig.spec.json` | the library specs |
| `apps/client/tsconfig.editor.json` | all of `src/**/*.ts` bar the specs — the `*.testing.ts` helpers, and any module the entry-point graph misses |
| `apps/client-e2e/tsconfig.json` | the API contract tests and the Playwright config |
| `testing/playwright/tsconfig.json` | the integration suite |

A mock that no longer matches the type it claims is what this gate is for: it makes a test pass against a shape the production code never receives.

`apps/client/tsconfig.spec.json` is still outside the chain with 44 errors — issue #318 carries the breakdown. Append it to `lint:typecheck` in the change that clears them, and delete this paragraph.
