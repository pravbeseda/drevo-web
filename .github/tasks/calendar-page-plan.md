# Orthodox calendar page

Add `/calendar` and `/calendar/:year` to the Angular front, replacing the
server-rendered legacy page. The data comes from the existing calendar API,
which is changed to return the year as data rather than rendered HTML.

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Grid as HTML or as data | Data. The grid is not wiki content — it has no wiki source and passes through no formatter — so a PHP view that flattens `CalendarDay` into a table only stands between the front and facts it already has |
| 2 | The legend | Stays an HTML string, rendered through `app-wiki-content`, the same path as an article body. It is genuine wiki prose and moves to the block model together with articles, in drevo-yii#236 |
| 3 | `/calendar` without a year | Renders the current year directly, no redirect. One resolver reads `:year` or falls back to the current year |
| 4 | Page composition | Same as the legacy page: heading, three year tabs, the twelve-month grid, the legend beside it, the disclaimer below |
| 5 | Navigation | A third item in the sidebar, «Календарь». Without it the page is reachable only by direct link, since the home page calendar block does not exist yet |

## Step 1 — backend: the year as data

**Landed** in [drevo-yii#238](https://github.com/pravbeseda/drevo-yii/pull/238),
closing [#237](https://github.com/pravbeseda/drevo-yii/issues/237).
The issue carries the acceptance criteria. Summary of the contract this page codes
against:

```
GET /api/calendar/year/<year>
  → {year, prev, next, months, legend, disclaimer}

months[]  = {number, name, weeks}
weeks[][] = seven slots, Monday first, null in the padding slots
day       = {dayOfMonth, articleTitle, articleId, fast, feast}
feast     = null | "pascha" | "twelve" | "great"
```

`prev` / `next` are `null` at the ends of `MIN_YEAR..MAX_YEAR` (1920..2037).
Nothing in the response depends on the current date — marking *today* is the
client's job. The payload is cached server-side under `calendar_year_<year>`
for 30 days, so a repeat request resolves no article titles.

Files: `protected/controllers/api/CalendarApiController.php`, a serializer for
the calendar value objects, and the controller tests.

## Step 2 — front: the page

### Files

```
libs/shared/src/lib/models/calendar.ts              # DTOs + domain model
apps/client/src/app/services/calendar/
    calendar-api.service.ts                         # HTTP layer, returns DTOs
    calendar.service.ts                             # maps DTO -> domain model
apps/client/src/app/features/calendar/
    calendar.routes.ts
    resolvers/calendar-year.resolver.ts
    pages/calendar-page/calendar-page.component.*
    components/month-table/month-table.component.*  # one month
    components/year-tabs/year-tabs.component.*
```

Route registration in `app.routes.ts` under the existing `authGuard` child
array; the sidebar item in `layout/sidebar-nav/sidebar-nav.component.ts`.

### Behaviour

- The resolver returns the year, `'not-found'` for a year outside
  `MIN_YEAR..MAX_YEAR` (the API answers 400) and `'load-error'` when the request
  fails, matching `features/picture/resolvers/picture.resolver.ts`. The page
  renders `ErrorComponent` for both.
- The loading indicator needs no work: `ui-navigation-progress` in
  `layout.component.html` already reacts to `NavigationStart`, so a resolver
  that takes time shows the bar.
- *Today* is computed on the client and marks one cell, only in the current
  year.
- A day cell links to `/articles/<id>`, or to `/articles/find/<title>` styled as
  a red link when `articleId` is `null`. `articleTitle` becomes the accessible
  name — no `title` attribute.
- Colours come from `--themed-*` tokens. The legacy stylesheet hardcodes them
  (`#ff0000` for a feast, `#e0f0e0` for a fast day, `#4444ff` for today), so
  each gains a token in `libs/ui/src/lib/styles/_theme-colors.scss` with a light
  and a dark value.

### Order of work (red → green → refactor)

1. DTOs and the domain model in `libs/shared`.
2. `CalendarApiService` — spec first, `HttpTestingController` asserts the URL,
   the method and `withCredentials`.
3. `CalendarService` — spec first for the DTO → model mapping.
4. `calendarYearResolver` — spec first for: year from the param, current year
   without one, `'not-found'` on 400, `'load-error'` on a failed request.
5. `MonthTableComponent` — spec first for the seven-column layout, the padding
   slots, the cell classes for fast / feast / weekend / today, and the two link
   forms.
6. `YearTabsComponent` — spec first for a missing neighbour at either end of the
   range.
7. `CalendarPageComponent` — spec first for composition and the error branch.
8. Route, sidebar item, theme tokens.
9. Playwright: one spec that opens `/calendar`, asserts twelve months are
   rendered, follows a day link to an article, and switches the year through a
   tab.

## Verification

Each step ends green on the gates in `AGENTS.md`, in that order. The page is
done when `yarn nx affected -t lint,test`, `yarn lint:styles`,
`yarn test:playwright` and `yarn build` pass.

## Out of scope

- The home page month block, which consumes
  `GET /api/calendar/month/<year>/<month>` — a separate task, though step 1
  converts that endpoint to data as well.
- Retiring the server-rendered `/calendar` page in the legacy app.
- The legend's markup, which changes in drevo-yii#236.
