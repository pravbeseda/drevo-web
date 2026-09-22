# Forum — list and topic side by side

Rework the forum's read screen from two independent pages into one two-pane
screen: the topic list on the left, the open topic on the right. The phone
keeps today's behaviour — one pane at a time — and every address that exists
today keeps working.

This supersedes the front part of slice 1 in [`forum-plan.md`](forum-plan.md)
(section «Slice 1 — read», Front). The API contract there stands; two fields
are added to the topic list item. Backend work lands in
[drevo-yii](https://github.com/pravbeseda/drevo-yii) (`legacy-drevo-yii/`).

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Screen model | List and topic side by side on a wide container, one pane on a narrow one. The switch is a container query, not a media query: the same component renders inside `/forum` (full width) and inside an article's tab (1000 px), and must decide from its own width |
| 2 | Addressing | Child routes in both places: `/forum/topic/:id` renders the shell's list plus the topic; `/articles/:id/forum/topic/:topicId` does the same inside the article tab. No query parameter, no address without a topic id. Every link that exists today keeps resolving |
| 3 | Article tab | Same two-pane shell, on the same terms. `.article` is `rem($article-max-width)` = 1000 px, which holds a 320 px list plus a 680 px panel |
| 4 | Empty right pane | A placeholder: the section's `description` (already fetched for the tab tooltips and shown nowhere) plus «Выберите тему». No auto-opening of the first topic — it would rewrite the address on arrival and make «back» a loop |
| 5 | Scrolling | Two independent scroll containers, the page locked to the viewport height. The precedent is `article.component.scss:6-17`, which already locks height for the virtual-scroller tabs |
| 6 | List row | Title, «к статье X», «время · имя последнего». The article title is what identifies a topic in Drevo — half the live titles («МОДЕРАТОРУ: техническое») mean nothing without it |
| 7 | New API fields | `article` and `lastAuthor` on the topic list item. `part` is already in the topic response (`ForumService.php:186`), so a direct link can open the right section on the left |

## Backend (drevo-yii)

Tracked as [drevo-yii#287](https://github.com/pravbeseda/drevo-yii/issues/287) — merged.

`ForumService::topics()` gains two fields. Both must stay one query per page —
the method already batches last-post dates (`ForumService.php:271`), and that
batch is where the author comes from.

```
item = {id, title, author, createdAt, repliesCount, lastPostId, lastPostAt,
        pinned, lastAuthor, article: {id, title} | null}
```

- [x] 1. **`lastAuthor`.** — files: `protected/services/ForumService.php`, its unit test — done when: `lastPostDates()` becomes `lastPosts()` returning date and author per id, the DTO carries `lastAuthor` (absent, not null, when the topic has no reply), and the test pins that one page costs one extra query whatever the row count.
- [x] 2. **`article` per row.** — files: `ForumService.php`, `modules/forum/models/Forum.php`, tests — done when: the article titles of a page are fetched by one batched lookup over the distinct `(f_part, f_partid)` pairs — `getArticle()` per row is an N+1 and fails the step — and a topic attached to no article answers `null`.

Gates per PR: `composer test`, `composer coverage:patch`, `composer stan`,
`composer stan:strict`, `composer cs`.

## Front

```
features/forum/
    forum.routes.ts                     # the shell owns the topic as a child route
    pages/forum-page/                   # section tabs + the two-pane shell
    components/topic-panel/             # what today is pages/topic-page/
    components/topic-placeholder/       # decision 4
shared/components/topic-list/           # the narrow row, decision 6
features/article/.../article-forum-tab/ # the same shell, decision 3
```

- [x] 3. **DTO and model.** — files: `libs/shared/src/lib/models/dto/forum.dto.ts`, `models/forum.ts`, `services/forum/forum.service.ts` + specs — done when: `ForumTopicListItem` carries `article: ForumTopicArticle | undefined` and `lastAuthor: string | undefined`, the mapper turns the wire's `null` into absence as it already does for `article` on `ForumTopic`, and the spec is red before the mapper exists.
- [x] 4. **The two-pane shell.** — files: `pages/forum-page/` + spec, `libs/ui/src/lib/styles/_tokens.scss` (list column width, pane gap) — done when: the shell renders `<router-outlet>` in the right pane, the placeholder when no topic is routed, and the spec covers both; the panes carry their own scroll and the host locks height the way `article.component.scss` does; the pane split is a `@container` rule, so the spec asserts the class, not the viewport.
- [x] 5. **Routes.** — files: `forum.routes.ts`, `features/article/article.routes.ts` + specs — done when: `/forum/topic/:id` and `/forum/topic/:id/:messageId` resolve as children of the shell (the list stays mounted), `/forum/:part/:partId` and the section tabs keep their addresses, `/articles/:id/forum/topic/:topicId` opens the topic inside the tab, and no address renders the topic twice.
- [x] 6. **The topic renders inside the pane.** — files: none beyond the move in step 8 — done when: Playwright proves the deep link still scrolls to its card inside the pane. The rename this step planned was dropped and so was its premise: `scrollIntoView` scrolls every scrollable ancestor, not the document alone, so the existing call works unchanged once the pane scrolls itself; and the component is still the whole screen on a phone, so `TopicPageComponent` is not a wrong name. What did move is the file — see step 8.
- [x] 7. **The narrow row.** — files: `shared/components/topic-list/` + spec — done when: the row renders title, article line and «время · имя», the list column holds at 320 px without horizontal overflow, and the same component still reads correctly at full width for `/forum/:part/:partId`, which has no panel.
- [x] 8. **The article tab.** — files: `features/article/pages/article-page/tabs/article-forum-tab/` + spec — done when: the tab renders the same shell, its list links stay inside the article, and «Все обсуждения» still leaves for `/forum/:part/:partId`.
- [x] 9. **Playwright.** — files: `testing/playwright/tests/forum/`, `pages/forum*.page.ts`, `mocks/forum.ts` — done when: three scenarios are green — opening a topic keeps the list on screen at desktop width and replaces it at 390 px; a direct link to `/forum/topic/:id` opens with the topic's own section selected on the left; the article tab opens a topic without leaving the article.
- [x] 10. **Docs.** — files: `.github/tasks/forum-plan.md` (slice 1's Front section and decision F7), `docs/architecture.md` if the panel/placeholder split adds a shape — done when: no document still describes the topic as a standalone page.

## Decisions taken while building

| # | Question | Decision |
|---|---|---|
| 8 | Where the shared parts live | `features/article` may not import from `features/forum` (the import table in `AGENTS.md`), so the topic panel, the message card, the placeholder, the panes, the topic resolvers, the page-scoped data service and the route params moved to `app/shared/`. The forum feature keeps its shell, its list and its own resolvers |
| 9 | The pane threshold | 800 px of container width, as `$forum-panes-min-width`. Below it the panel is narrower than a message card's meta row, which then wraps to three lines. The list column is 320 px (`$forum-list-column-width`) |
| 10 | Where a row's link points | The article tab addresses its topics under the article (`relativeLinks` on the list), the forum keeps the canonical `/forum/topic/:id`. So opening a topic from `/forum/:part` moves the left list to «Все темы» — the address a reader can share is one, not one per entry point |

## Rulings

_One line per finding not fixed as first stated: what it said, what was decided, why._

- Step 5, blocking: every forum address rendered a panel-less list. Cause: `withComponentInputBinding()` writes **every** declared input on each navigation, so a route that names no `withPanel` handed the component `undefined` over its `input(true)` default. Fixed by reading the flag from `route.data` instead of taking it as an input; the trap applies to any routed component whose input has a default.
- Step 5, own finding: `/forum/:part/topic/:id` resolves too, because the section list carries the same children as the bare one. Left as is — nothing links there, and refusing it would cost a second route table.
- Step 9: the suite flakes under seven workers — a different test fails on each full run and passes alone. The same family as #343 and #347, not this branch's doing.

## Verification

The gates of `AGENTS.md`, in order. The step is done when
`yarn nx affected -t lint,test`, `yarn lint:styles`, `yarn lint:coverage`,
`yarn test:playwright` and `yarn build` are green.

## Out of scope

- Posting, moderation and read position — slices 2 and 3 of the main plan.
- Message preview in the list row (the «почтовый список» variant): it needs the
  wiki text cut after rendering and escaping, which is its own backend change.
- Unread state: it depends on `forum_reads`, which arrives with slice 3.

## Open

- What the placeholder shows on `/forum`, where no single section is selected.
  Today it is the bare «Выберите тему»; the sections and their descriptions are
  resolved and could fill it.
