# Matrix params override positional route params (#335)

## Goal
Angular merges a URL segment's matrix params over the positional ones
(`node_modules/@angular/router/fesm2022/_router-chunk.mjs:2845-2848`), so `/pictures/1;id=42` opens
picture 42 under a path segment that reads `1`. Read every route param through one helper that a
matrix value cannot shadow, so a segment carrying matrix params stops addressing anything.

## Decisions
- Rule: a route param read answers "absent" when **any** segment of that route carries matrix params,
  whatever the parameter is named → chosen by the user over rejecting only the name collision, and over
  a custom `UrlSerializer` that strips them. It is the rule that removes the alias family #335 names —
  the collision rule leaves `/pictures/1;foo=bar`, the serializer leaves all of them serving content —
  and it needs no revision when a route gains a parameter. Cost: an inbound `/articles/1;utm=x` stops
  resolving; nothing in the app generates matrix params (verified by grep), and trackers write to the
  query string.
- Scope: every read that addresses an entity — the four sites in #335 plus `version-redirect.component`,
  `article-version-tab.component`, `calendar-year.resolver`, `missing-article.resolver` and
  `new-article.resolver`, ten reads across nine files → chosen by the user, on the same reasoning as
  #329's scope decision: fixing one reader and leaving its neighbours is what produced the follow-up.
  The `runGuardsAndResolvers` predicates in `article.routes.ts:21,41` stay out — they compare two
  snapshots and address nothing.
- `calendar-year.resolver` decides *whether* the route names a year with `paramMap.has('year')` and only
  then reads the value through the helper. `/calendar` names no year and means the current one, so handing
  the helper's `undefined` straight to that branch would make `/calendar/2020;year=1990` show today's year —
  the page answering a question the URL did not ask, which is the failure #335 calls worse than an alias.
  Decided here rather than escalated: it is what the rule above already says, applied to the one site where
  absence carries its own meaning.
- `new-article.resolver`'s parent-title fallback is removed → chosen by the user over guarding it or parking
  it. `readRouteParam` scans `pathFromRoot`, which for the parent stops short of the child's own segment, so
  the fallback let `/articles/find/X/edit;a=1` resolve after the child had rejected it — verified with a probe
  run before the change. Under the router's `always` inheritance the child already carries the parent's
  `title`, so that leak was the fallback's only remaining reachable effect. Cost if wrong: were Angular to
  return to `emptyOnly`, the create route would resolve an empty title; the comment on the line says so.
- Playwright: one case. The unit suite builds its own snapshots (`{ paramMap: convertToParamMap(...) }`),
  so it asserts the helper against our model of a snapshot, not against the router's. TestBed is barred
  by the project rules, so the real router is only reachable through Playwright. One case is enough:
  the claim under test — the router surfaces a matrix param the way the helper expects — is the same
  for all four addresses in the issue.
- `diff-page-data.service.ts:63` moves from `if (id2Param)` to an explicit `!== undefined` test in the
  same change. Under the rule above the empty `;id2=` is already rejected one layer earlier, so this is
  belt-and-braces rather than the fix; it costs one token and removes a truthiness read of a string.

## Steps
- [x] 1. Add `readRouteParam(route, name)` + spec — files: `apps/client/src/app/shared/helpers/route-params.ts`, `route-params.spec.ts` — lenses: security — done when: the spec covers a clean segment, a matrix param on the last segment, a matrix param on an earlier segment, an empty matrix value, a matrix param whose name differs from the one read, and an absent param, and goes green.
- [x] 2. Move the four sites #335 names onto it — files: `features/picture/resolvers/picture.resolver.ts`, `features/article/resolvers/article.resolver.ts`, `features/article/resolvers/article-version.resolver.ts`, `features/history/services/diff-page-data.service.ts` (both the `paramsKey` read at `:37` and the id reads at `:47,48`, plus the `id2Param !== undefined` test) — lenses: security — done when: each spec asserts the site's existing invalid-param answer for a snapshot whose segment carries matrix params, without the service being called, and the suite is green.
- [x] 3. Move the five remaining reads onto it — files: `features/article/pages/version-redirect/version-redirect.component.ts`, `features/article/pages/article-page/tabs/article-version-tab/article-version-tab.component.ts` (reads `paramMap` as an observable, so it needs the snapshot at emission time), `features/calendar/resolvers/calendar-year.resolver.ts`, `features/article/resolvers/missing-article.resolver.ts`, `features/article/resolvers/new-article.resolver.ts` (reads the **parent** snapshot's `title`) — lenses: security — done when: each spec asserts the same rejection, and `rg 'paramMap\.get' apps/client/src --glob '!*.spec.ts'` reports only `route-params.ts` and the two `article.routes.ts` predicates.
- [x] 4. Add the Playwright case — files: `testing/playwright/tests/pictures/` — lenses: none — done when: a case navigating to `/pictures/1;id=42` sees the detail page's not-found state and no request for picture 42, and the file passes under `yarn test:playwright`.

## Rulings
- Step 1, quality reviewer and security lens, both `blocking`, `route-params.ts:39` — "the scan covers only
  `route.url`, this snapshot's own segments, but a snapshot inherits every ancestor's params, so an ancestor's
  matrix param reaches this `paramMap` without appearing in this `url`". Fixed with a `pathFromRoot` scan.
  The claim holds and I verified the router source myself rather than the reviewers' summary of it:
  `node_modules/@angular/router/fesm2022/_router-chunk.mjs:1501` sets the default
  `paramsInheritanceStrategy` to `'always'` (not the `'emptyOnly'` of older versions), and `getInherited`
  at `:1507` merges `{...parent.params, ...route.params}` for **every** child, not only path-less ones.
  `/articles/find/Ivan;title=Peter/edit` — a call site this plan wires in step 3 — would have passed the
  original guard. Two spec rows cover it and fail against the `route.url` version. Cost if wrong: none
  found — the wider scan can only reject more addresses, and every address it adds carries a `;`.

- Step 2, spec reviewer and quality reviewer, both `blocking`, `diff-page-data.service.ts:40` — "the
  `paramsKey` move onto the `readRouteParam` values is covered by no test: revert the line and the suite
  stays green". Fixed with a test, not with code — the line itself is right. Verified the reproduction
  myself: `load()` for `/articles/diff/10` caches the pairs under the raw key `10_`, and the old key gives
  `/articles/diff/1;id1=10` the same `10_`, so the early return at `:42` serves the rejected address the
  accepted one's pairs. The new two-load test fails against the reverted line and nothing else.
- Step 2, spec reviewer `blocking` and quality reviewer `suggestion`, `diff-page-data.service.spec.ts:215` —
  "the empty-matrix-`id2` test passes with `id2Param !== undefined` reverted: its snapshot carries matrix
  params, so the run ends at the `version1` check and the `id2` branch never executes". Fixed. The `;id2=`
  test stays, renamed to what it actually proves — it is #335's own reproduction URL — and a second test
  reaches the branch with a clean snapshot. `load()` takes any snapshot, so an empty `id2` is inside its
  contract even though the router cannot produce one from a path segment; the test fails under `if (id2Param)`.
- Step 2, quality reviewer `suggestion`, the four spec factories — "the rest parameter `...urls: UrlSegment[][]`
  models multiple ancestors, but every caller passes at most one array". Fixed: a single defaulted
  `segments: UrlSegment[]` parameter. The multi-ancestor walk is the helper's own concern and is covered in
  the helper's spec.
- Step 2, security lens, no blocking finding. Its one observation — that two *rejected* addresses can share
  the new `undefined_` key — was checked and dropped on its own reasoning: both cache the identical error
  state, so the only loss is a duplicate log line, and separating them would add code.

- Step 3, gate run by me after all three reviewers died on a session limit. Seven mutations, one per site
  (both calendar decisions separately): each reds exactly one test, so every line the step moved is pinned.
  Two things the reviewers were asked about and that I checked in the router source instead:
  `advanceActivatedRoute` (`_router-chunk.mjs:1621-1633`) assigns `route.snapshot` **before**
  `paramsSubject.next`, so the version tab's `map(() => readRouteParam(this.route.snapshot, …))` reads a
  current snapshot; and `missing-article`'s `?? ''` cannot serve another article, because the backend answers
  an empty title with `found: false` — the resolver's own comment records that contract.
- Step 3, found by me, `new-article.resolver.ts:48` — the parent fallback resolved an address the child had
  already rejected. Escalated as a user decision rather than ruled on, since the fix deletes an assertion this
  run had just added; see the fifth entry under Decisions.

- Step 4, gate run by me. The case lives in `picture-detail.spec.ts`'s existing "Error states" describe rather
  than in a file of its own, next to the `/pictures/999` and `/pictures/abc` cases it belongs with. It failed
  against a reverted `picture.resolver` — the detail page rendered picture 42 — which is the one thing the unit
  suite cannot show, since it builds its own snapshots.

## Parked
