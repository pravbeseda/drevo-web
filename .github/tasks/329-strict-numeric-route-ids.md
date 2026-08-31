# Strict numeric route ids (#329)

## Goal
Route params that name an entity id are parsed with `Number()` or `parseInt(x, 10)`, both of
which accept forms the route pattern never names — `0x2a`, `2e3`, `+42`, ` 42 `, `42abc` — so
every entity gets an unbounded family of alias URLs. Validate the string before converting it,
through one helper shared by every call site.

## Decisions
- Scope: the three resolvers named in #329, plus the two `parseInt` sites (`diff-page-data.service`,
  `version-redirect.component`), plus `calendar-year.resolver` moved onto the shared helper →
  chosen by the user, because fixing one parser and leaving its neighbours is what produced #329
  in the first place. Cost: `/articles/diff/42abc/50` stops resolving, an address nothing generates.
- Helper location: `apps/client/src/app/shared/helpers/route-params.ts`, not `libs/shared` — every
  call site is inside `apps/client`, and `features/ → app/shared/` is an allowed import direction.
- Pattern: `/^\d+$/`, matching `calendar-year.resolver.ts:17` from #328. It accepts leading zeros
  (`/pictures/042`), which stays out of scope: the issue's own suggested fix uses this pattern and
  the calendar precedent already shipped with it.
- Playwright: no integration test. The looseness lives in a pure function that the unit suite calls
  directly, the route wiring is unchanged, and a Playwright case would assert the same branch through
  three more layers.

## Steps
- [ ] 1. Add `parsePositiveIntParam` + spec — files: `apps/client/src/app/shared/helpers/route-params.ts`, `route-params.spec.ts` — lenses: security — done when: the new spec covers decimal, hex, exponential, signed, padded, fractional, trailing-garbage, zero, negative, empty and missing, and goes green.
- [ ] 2. Move the four resolvers onto it — files: `features/picture/resolvers/picture.resolver.ts`, `features/article/resolvers/article.resolver.ts`, `features/article/resolvers/article-version.resolver.ts`, `features/calendar/resolvers/calendar-year.resolver.ts` (+ specs) — lenses: security — done when: each spec asserts `not-found`/`undefined` for `0x2a`, `2e3`, `+42`, ` 42 ` without the service being called, and the suite is green.
- [ ] 3. Move the two `parseInt` sites onto it — files: `features/history/services/diff-page-data.service.ts`, `features/article/pages/version-redirect/version-redirect.component.ts` (+ specs) — lenses: security — done when: both reject `42abc` and `0x2a` with their existing invalid-id behaviour, asserted by their specs, and the suite is green.

## Rulings

## Parked
