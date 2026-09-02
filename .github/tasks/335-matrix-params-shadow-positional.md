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
- [ ] 2. Move the four sites #335 names onto it — files: `features/picture/resolvers/picture.resolver.ts`, `features/article/resolvers/article.resolver.ts`, `features/article/resolvers/article-version.resolver.ts`, `features/history/services/diff-page-data.service.ts` (both the `paramsKey` read at `:37` and the id reads at `:47,48`, plus the `id2Param !== undefined` test) — lenses: security — done when: each spec asserts the site's existing invalid-param answer for a snapshot whose segment carries matrix params, without the service being called, and the suite is green.
- [ ] 3. Move the five remaining reads onto it — files: `features/article/pages/version-redirect/version-redirect.component.ts`, `features/article/pages/article-page/tabs/article-version-tab/article-version-tab.component.ts` (reads `paramMap` as an observable, so it needs the snapshot at emission time), `features/calendar/resolvers/calendar-year.resolver.ts`, `features/article/resolvers/missing-article.resolver.ts`, `features/article/resolvers/new-article.resolver.ts` (reads the **parent** snapshot's `title`) — lenses: security — done when: each spec asserts the same rejection, and `rg 'paramMap\.get' apps/client/src --glob '!*.spec.ts'` reports only `route-params.ts` and the two `article.routes.ts` predicates.
- [ ] 4. Add the Playwright case — files: `testing/playwright/tests/pictures/` — lenses: none — done when: a case navigating to `/pictures/1;id=42` sees the detail page's not-found state and no request for picture 42, and the file passes under `yarn test:playwright`.

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

## Parked
