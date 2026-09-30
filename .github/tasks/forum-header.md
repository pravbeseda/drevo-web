# Forum — the topic in the app header

Drop the forum's duplicated chrome. The topic title today shows twice — in the
app header and in a header above the feed that also repeats the author and
date of the first message — and the section tabs take a row nobody uses.
The title stays in the app header only, with a second line naming what the
topic hangs off; the header above the feed goes; the tabs become a filter menu.

Mockups: the layout survey <https://claude.ai/artifact/VjgFcL5KRHtwotLPDBsy33>,
the two-line header <https://claude.ai/artifact/EZLhVckeoc2FE71qXAAGZw>
(variant A without its menu, variant E deferred).

No backend change.

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Header layout | Line 1 is the topic title, one line, ellipsised, the full title in the tooltip. Line 2 is «к статье X» or «к новости X» — the section id tells which, as in the list row — where X is a plain link to `/articles/:id` (news items are articles in Yii, `News extends Articles`). A topic that hangs off nothing has no second line. Without a second line the header keeps today's clamping |
| 2 | Where line 2 shows | On the forum's own addresses only. Inside the article's discussion tab the article is already the page's title context, so the subtitle is dropped there |
| 3 | The header above the feed | Removed: title, author, date and article link. The feed starts with the day pill |
| 4 | Getting to the article's other topics | Through the article: the header link, then its «Обсуждение» tab. Nothing extra in the header |
| 5 | Section tabs | Replaced by a filter button (funnel icon) at the right end of the list toolbar, beside «Новая тема». Its menu — «Все темы» and one item per section — navigates to `/forum` and `/forum/:part`, so the addresses and the section placeholder text stay. A narrowed list shows its section's name beside the button. The article's discussion tab has no filter |
| 6 | Topic actions in the header (variant E) | Deferred. The rule is fixed now: a topic's own actions go into the app header, before the global ones, behind a divider. The mechanism lands with the first action — subscription or moderation, slice 3 of [`forum-plan.md`](forum-plan.md) |
| 7 | List row, «Новая тема» | Unchanged: the row keeps its lines from [`forum-topic-rows.md`](forum-topic-rows.md), «Новая тема» stays the toolbar button over the list |
| 8 | Way back on a phone | The tabs row used to stay above an open topic and served as the way back to the list. Below `$breakpoint-tablet` — where the sidebar is a drawer — the header swaps the menu button for an ← arrow while a topic or the new-topic form has replaced its list. The arrow leads to the list above it: `/forum`, `/forum/:part` or `/articles/:id/forum`. Wider screens keep the menu: the list stays beside the topic, or the sidebar is open |

## Steps

- [x] 1. **Subtitle in the title strategy.** — files: `services/page-title.strategy.ts` + spec, `shared/resolvers/forum-topic-subtitle.resolver.ts` + spec, `shared/routes/forum-topic.routes.ts` — done when: a topic route resolves `subtitle: { prefix, label, link }` from the shared `ForumTopicPageDataService` load (no second request); `PageTitleStrategy.pageSubtitle` exposes it read-only, `undefined` for a topic with no article, for a failed load, for any other route and whenever a title context (the article) is set.
- [x] 2. **Two-line header.** — files: `layout/header/header.component.{ts,html,scss}` + spec — done when: with a subtitle the header shows the title on one line and «к статье» plus a `routerLink` (`data-testid="page-subtitle-link"`) under it; without one the markup and clamping are as today; article title editing is untouched; styles use existing tokens or add them to `_tokens.scss`.
- [x] 3. **Drop the topic header.** — files: `shared/components/topic-page/topic-page.component.{html,scss,ts}` + spec — done when: the `<header>` and its test ids (`topic-page-title`, `-author`, `-created`, `-article`) are gone and whatever it alone used is deleted (`yarn knip`).
- [x] 4. **Filter instead of tabs.** — files: `features/forum/forum.routes.ts`, `features/forum/pages/forum-page/` (deleted: without the tabs it only wrapped the outlet, so the sections resolve on a componentless route), `features/forum/pages/topics-page/` + spec, `shared/components/topic-panes/`, a new `features/forum/components/forum-filter/` + spec — done when: the tabs are gone; the filter (`ui-dropdown-menu` from `@drevo-web/ui`) is projected into the panes toolbar on the forum page only; its items navigate to `/forum` and `/forum/:part` through the router on `clicked` (the item has no link input); the current one carries `icon="check"` and the rest `icon=""` so labels align; a narrowed list names its section beside the button; a failed sections request leaves the button out, not the list.
- [x] 5. **Playwright.** — files: `testing/playwright/tests/forum/`, `pages/forum-tabs.page.ts` → `pages/forum-filter.page.ts`, `pages/forum-topic.page.ts`, article forum-tab specs — done when: the subtitle link of an article topic opens the article; a common topic has no subtitle; a topic in the article tab has none; no header sits above the feed; the filter switches the list and `/forum/common` opened directly still works; specs that read `topic-page-title` read `page-title` instead, and wait on the feed (`topic-feed`) rather than on a title the header always has.
- [x] 6. **Docs.** — files: whatever describes the forum tabs or topic header (`rg -i "tabs|вкладк" docs .github/tasks/forum-*.md` for live docs; finished plans stay as they are) — done when: no live doc describes the removed tabs or topic header.
- [x] 7. **Back arrow on a phone.** — files: `services/page-title.strategy.ts` + spec, `shared/resolvers/forum-list-link.resolver.ts` + spec, `shared/routes/forum-topic.routes.ts`, `layout/header/` + spec, Playwright forum specs and `pages/layout.page.ts` — done when: topic and new-topic routes resolve `backLink` to the address of the list above them; `PageTitleStrategy.pageBackLink` exposes the leaf route's one, article context or not; at phone width the header shows `back-button` in place of the hidden menu button and it opens the list; at desktop width the menu stays and the arrow is hidden.

## Verification

The gates of `AGENTS.md`, in order.

## Out of scope

- Topic actions in the header (decision 6) and the «N новых» badge — slice 3.
- The last message in the list row — needs a new field in `GET /api/forum/topics`.
- A cross-topic message feed or an article info panel (variants 6 and 3 of the survey).
