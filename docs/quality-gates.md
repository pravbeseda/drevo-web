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
