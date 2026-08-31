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
- Pattern: `/^[1-9]\d*$/`. Planned as `/^\d+$/` (the shipped `calendar-year.resolver.ts:17` precedent),
  reversed at step 1's review gate — see Rulings. Leading zeros are the same aliasing class the helper
  exists to close, so `/articles/042` is rejected too, and the calendar resolver inherits that in step 2.
- Playwright: no integration test. The looseness lives in a pure function that the unit suite calls
  directly, the route wiring is unchanged, and a Playwright case would assert the same branch through
  three more layers.

## Steps
- [x] 1. Add `parsePositiveIntParam` + spec — files: `apps/client/src/app/shared/helpers/route-params.ts`, `route-params.spec.ts` — lenses: security — done when: the new spec covers decimal, hex, exponential, signed, padded, fractional, trailing-garbage, zero, negative, empty and missing, and goes green.
- [x] 2. Move the four resolvers onto it — files: `features/picture/resolvers/picture.resolver.ts`, `features/article/resolvers/article.resolver.ts`, `features/article/resolvers/article-version.resolver.ts`, `features/calendar/resolvers/calendar-year.resolver.ts` (+ specs) — lenses: security — done when: each spec asserts `not-found`/`undefined` for `0x2a`, `2e3`, `+42`, ` 42 ` without the service being called, and the suite is green.
- [x] 3. Move the three `parseInt` sites onto it — files: `features/history/services/diff-page-data.service.ts`, `features/article/pages/version-redirect/version-redirect.component.ts`, and — found at this step's gate —
  `features/article/pages/article-page/tabs/article-version-tab/article-version-tab.component.ts` (+ specs) — lenses: security — done when: both reject `42abc` and `0x2a` with their existing invalid-id behaviour, asserted by their specs, and the suite is green.

## Rulings
- Step 1, quality reviewer `blocking`, `route-params.ts:7` — "`/^\d+$/` accepts leading zeros, so `042`
  stays an alias for `42`". Fixed, reversing the plan's own pattern decision: the claim holds against the
  helper's stated purpose, and `/^[1-9]\d*$/` shrinks the code by making the `parsed > 0` guard dead.
  Cost if wrong: an inbound link written as `/articles/042` now answers not-found; nothing in the app
  generates that form.
- Step 1, security lens `suggestion`, `route-params.ts:19` — "`'9'.repeat(309)` returns `Infinity`,
  `'9007199254740993'` returns a different id than the URL names". Fixed with `Number.isSafeInteger`,
  against the quality reviewer's opposite reading that guarding it only grows the code: verified both
  inputs myself, and returning `Infinity` contradicts the function's own contract at no extra line.
- Step 1, quality reviewer, `route-params.spec.ts:19` — "the `'0'` row is now unreachable and removable".
  Dropped: `'0'` is still an input with an asserted answer, and the row is what turns red if the pattern
  is ever loosened back.
- Step 2, quality reviewer `suggestion`, the five-row tables in the four resolver specs — "the helper's own
  spec already owns this contract; one representative row per resolver would prove delegation". Dropped:
  these rows are the regression tests for #329, which names the forms per resolver, and a shared parser
  loosened later SHOULD turn five files red rather than one.
- Step 2, quality reviewer `suggestion`, the two remaining `parseInt` sites — already step 3 of this plan,
  so no ruling is needed; it confirms the scope the user chose.
- Step 2, security lens `suggestion`, `picture.resolver.ts:22` and the two article resolvers — "`/pictures/1;id=42`
  loads picture 42, because Angular spreads a segment's matrix params after the positional ones". Verified in
  `node_modules/@angular/router/fesm2022/_router-chunk.mjs:2845-2848` and parked: it predates the branch, the
  value still passes the helper, and the fix belongs in the route layer rather than in a parser.
- Step 3, quality reviewer `blocking`, `article-version-tab.component.ts:72` — "a third site parses the same
  `versionId` with `parseInt`, so `/articles/1/version/42abc` still loads version 42 while the redirect route
  rejects it". Fixed. The claim holds: the site reads the param as `params.get('versionId')` inside a `map`,
  which is why the plan's survey (a grep for `paramMap.get`) missed it. Its `logger.error` payload was changed
  from the parsed value to the raw param at the same time, because after the swap the parsed value in that
  branch is always `undefined` — the two sibling sites already log the raw param.
- Step 3, quality reviewer `suggestion`, the new table comments in both specs — "the comment credits `Number()`,
  but `parseInt('0x2a', 10)` is 0 and the old `<= 0` guard already rejected it here". Fixed: the comment now
  says which two rows were actually red and why the hex row was not.
- Step 3, security lens `suggestion`, `diff-page-data.service.ts:47,63` — "`/articles/diff/10;id1=999` shows
  version 999, and `/articles/diff/7/9;id2=` silently drops the 9". Parked with the matrix-param finding from
  step 2: same root cause, and the fix belongs in how the route reads its params, not in the parser.
- Step 3, security lens `suggestion`, `version-redirect.component.ts:45` — "`articleId` from the API response
  is never validated before it lands in `router.navigate`". Dropped: the reviewer's own trace shows Angular
  encodes a hostile string into a single segment, so it cannot escape the app, and the article resolver this
  branch tightened rejects it. Exploiting it needs a compromised first-party API, at which point the redirect
  is not the weak link.
- Step 3, security lens informational, `diff-page-data.service.ts:37` — the raw `paramsKey` can collide
  (`/articles/diff/1_2/3` and `/articles/diff/1/2_3`). Dropped: a valid URL's key contains exactly one `_`,
  so only two already-rejected URLs can collide, and both cache the same error.

## Parked
- `/pictures/1;id=42`, `/articles/1;id=42` and `/articles/1/version/1;versionId=42` load entity 42 under a path
  segment that reads `1`. Angular merges a segment's matrix params over the positional ones
  (`node_modules/@angular/router/fesm2022/_router-chunk.mjs:2845-2848`), so `paramMap.get('id')` answers `'42'`.
  The same override also lets `/articles/diff/10;id1=999` show version 999, and `/articles/diff/7/9;id2=`
  silently load "7 against its predecessor" because `if (id2Param)` reads an empty matrix value as absent.
  Sites: `apps/client/src/app/features/picture/resolvers/picture.resolver.ts:22`,
  `apps/client/src/app/features/article/resolvers/article.resolver.ts:17`,
  `apps/client/src/app/features/article/resolvers/article-version.resolver.ts:17`,
  `apps/client/src/app/features/history/services/diff-page-data.service.ts:47,63`. Pre-existing; the same
  alias-URL class as #329 but one layer up, so it is a routing decision, not a parsing one.
- `content-preprocessors.spec.ts:167` asserts wall-clock time (`pathologicalMs < max(benignMs * RESCAN_RATIO,
  SCAN_FLOOR_MS)`), so the rescan guard for `stripMapElements` can go red under a loaded parallel jest run and
  green in isolation. Seen once during this run's step 3, not reproducible afterwards in four full-suite runs.
  File: `apps/client/src/app/shared/components/wiki-content/preprocessors/content-preprocessors.spec.ts:167`.
