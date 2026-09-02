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
  The `runGuardsAndResolvers` predicates in `article.routes.ts` were scoped out at planning time — they
  compare two snapshots and address nothing — and moved onto the helper after the review; see the last
  entry under Rulings for why that reasoning did not hold.
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
- Playwright: one case per router claim, two in the end. The unit suite builds its own snapshots
  (`{ paramMap: convertToParamMap(...) }`, and later its own `urlSubject`), so it asserts the code against
  our model of the router rather than against the router. TestBed is barred by the project rules, so the
  real router is only reachable through Playwright. The first case (`/pictures/1;id=42`) covers the claim
  that the router surfaces a matrix param the way the helper expects, which is the same for all four
  addresses in the issue. The review added a second claim — a custom `runGuardsAndResolvers` predicate
  fully replaces `paramsChange`, and `paramsSubject` stays silent exactly where `urlSubject` fires — which
  a fresh load cannot exercise, so it has its own case: an in-app click on an author-supplied wiki link.
- `diff-page-data.service.ts:63` moves from `if (id2Param)` to an explicit `!== undefined` test in the
  same change. Under the rule above the empty `;id2=` is already rejected one layer earlier, so this is
  belt-and-braces rather than the fix; it costs one token and removes a truthiness read of a string.

## Steps
- [x] 1. Add `readRouteParam(route, name)` + spec — files: `apps/client/src/app/shared/helpers/route-params.ts`, `route-params.spec.ts` — lenses: security — done when: the spec covers a clean segment, a matrix param on the last segment, a matrix param on an earlier segment, an empty matrix value, a matrix param whose name differs from the one read, and an absent param, and goes green.
- [x] 2. Move the four sites #335 names onto it — files: `features/picture/resolvers/picture.resolver.ts`, `features/article/resolvers/article.resolver.ts`, `features/article/resolvers/article-version.resolver.ts`, `features/history/services/diff-page-data.service.ts` (both the `paramsKey` read at `:37` and the id reads at `:47,48`, plus the `id2Param !== undefined` test) — lenses: security — done when: each spec asserts the site's existing invalid-param answer for a snapshot whose segment carries matrix params, without the service being called, and the suite is green.
- [x] 3. Move the five remaining reads onto it — files: `features/article/pages/version-redirect/version-redirect.component.ts`, `features/article/pages/article-page/tabs/article-version-tab/article-version-tab.component.ts` (reads `paramMap` as an observable, so it needs the snapshot at emission time), `features/calendar/resolvers/calendar-year.resolver.ts`, `features/article/resolvers/missing-article.resolver.ts`, `features/article/resolvers/new-article.resolver.ts` (reads the **parent** snapshot's `title`) — lenses: security — done when: each spec asserts the same rejection, and `rg 'paramMap\.get' apps/client/src --glob '!*.spec.ts'` reports only `route-params.ts` (at planning time the two `article.routes.ts` predicates were expected to remain; the review moved them too).
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

- Final gate, run by me after the three reviewers died on a session limit. All thirteen quality gates are
  green and Playwright is 259/259; the routes were walked one by one against their readers, including the
  `withComponentInputBinding()` path — no routed component takes a route param through `input()`, so
  `paramMap` really is the only channel. `calendar-page.component.ts:39` still reads `paramMap.has('year')`,
  but only to choose between two canonical tab addresses, and only once the resolver has already accepted
  the address. Nothing in the app or in `legacy-drevo-yii` emits a matrix URL, and no document describes the
  old behaviour.
- Final gate, found by me, the eight identical spec snapshot factories — the branch had copied one decision
  into eight files, which `AGENTS.md` forbids under "no logic duplication". Fixed by extracting
  `apps/client/src/app/shared/testing/route-testing.helper.ts`, following the existing
  `features/article/testing/article-testing.helper.ts` precedent; 156 lines out, 58 in.

- PR review round 1, `ali-review-pr` (Claude Opus) `blocking` x2, `article.routes.ts:21,41` and
  `article-version-tab.component.ts:73` — "the rule holds on a fresh load but not on an in-app navigation".
  Both fixed. Verified before acting rather than from the description: `equalSegments`
  (`_router-chunk.mjs:306`) compares the segments' matrix parameters, so the default `paramsChange` a custom
  predicate replaces (`:2356`) was strictly stronger than comparing the merged map; running
  `shouldRerunArticleResolver` on `/articles/5` -> `/articles/9;id=5` answered `false`; and
  `advanceActivatedRoute` (`:1632`) emits params only when the merged map differs, which a matrix value is
  exactly what leaves unchanged. The predicates now read through `readRouteParam`, and the version tab pipes
  off `route.url` (a `BehaviorSubject` at `:2077`, so the first read is unchanged). Reachable through
  `InternalLinkClickHandler`, which routes author-supplied wiki hrefs into `router.navigateByUrl`.
- PR review round 2, `ali-review-pr` (Claude Opus) `blocking`, this file — "the plan now says the opposite of
  the code it ships with, in the Decisions entry, in step 3's acceptance criterion and in the Playwright
  ruling". All three verified and fixed above; the round-1 fixes are recorded in the entry before this one.
  The Playwright decision was reopened rather than merely restated: the second router claim is the one our
  own model got wrong, and a unit test that drives `urlSubject` by hand cannot catch that, so it got its own
  case (`article-view.spec.ts`, "rejects a matrix address reached by an in-app link"), which fails against
  the `paramMap.get` predicate — the page keeps rendering article 5 under `/articles/9;id=5`.
- PR review round 2, Codex reviewer, no findings in either round.

## Parked

Filed as #343.

- `testing/playwright/tests/app-updates/chunk-reload.spec.ts:6` — "shows overlay when a lazy chunk fails to
  load and reloads on click" failed once in a full parallel `yarn test:playwright` run (timeout in
  `openSidebarOnMobile`, `chunk-reload.spec.ts:13`), then passed in isolation and in a second full run.
  Same class as the flaky test parked in #329's plan: a Playwright case that is order- or load-sensitive.
