# Forum — the topic list row

Give the topic list row a visual design (#351). The content was fixed by
decision 6 of [`forum-master-detail.md`](forum-master-detail.md); this plan
fixes how it reads. The reference is Telegram's chat list. Mockup:
<https://claude.ai/artifact/5xGty2PDN6QejXu8XA2Zsq>.

The component is `shared/components/topic-list/`, shared by `/forum`, its
section tabs, `/forum/:part/:partId` and the article's discussion tab. No
backend change beyond the section on each list item (decision 4).

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | What a row links to | The whole row is one link to the topic, nothing else inside it is a link. The article title and the last-post time become plain text; `lastPostLink()` goes. Opening a topic at its first unread message comes with `forum_reads`; a message anchor stays for links from outside the list |
| 2 | Layout | Three lines: title with the time on the right; «к статье X»; the last author. The title is semibold and ellipsised, the other lines secondary text at `$font-size-sm` |
| 3 | Reply count | Not shown. The right edge of the third line is kept for the «N новых» badge of slice 3 — a total count there would read as unread, the way Telegram's badge does |
| 4 | Topic with no article | Every row is three lines. The second line is «к статье X» or «к новости X» — the section id tells which — and the section name («Общие темы», «О статьях», «О новостях») when the topic hangs off neither. The name comes with the row: `section: {id, name}` on the list item ([drevo-yii#295](https://github.com/pravbeseda/drevo-yii/issues/295)), so the list needs no sections request of its own. Supersedes the first answer, which dropped the line and let rows vary in height |
| 5 | Time format | Telegram-style: today «14:05», yesterday «вчера», within the last week the weekday «пн», this year «12 мар», older «12.03.24». The full `formatDate` text is the `aria-label` |
| 6 | Row states | Hover is `--themed-menu-hover-background`; the open topic is `aria-current="page"` (via `routerLinkActive`) with `--themed-list-selected-background` — `menu-selected-background` is the list's own ground in the dark theme; `:focus-visible` gets an inset outline. Rows are separated by a divider inset from the left edge |

## Steps

- [x] 1. **Short date pipe.** — files: `libs/ui/src/lib/pipes/short-date/` + spec, `libs/ui/src/index.ts` — done when: the spec, red first, pins each branch of decision 5 and the boundaries between them (midnight, the seventh day back, 1 January) under Jest fake timers, and an `undefined` input returns `''` like `formatDate`.
- [x] 2. **The row as one link.** — files: `topic-list.component.{ts,html}` + spec — done when: each `<li>` holds a single `<a data-testid="topic-link">` to `topicLink(id)`; `topic-title`, `topic-last-post` and `topic-last-author` stay as test ids on plain text; `topic-replies`, `topic-author` and `lastPostLink()` are gone; the article line is absent when `article` is; the time carries the full date as `aria-label`; the spec asserts that the row contains exactly one `a`.
- [x] 3. **The open topic.** — files: `topic-list.component.html` + spec — done when: the row of the routed topic, also under a `/:messageId` deep link, has `aria-current="page"` and the others do not.
- [x] 4. **Styles.** — files: `topic-list.component.scss`, `libs/ui/src/lib/styles/_tokens.scss` if a size has no token — done when: decisions 2 and 6 hold in both themes, the 320 px column shows no horizontal overflow, and `yarn lint:styles` is green.
- [x] 5. **Playwright.** — files: `testing/playwright/` forum and article specs, page objects — done when: clicking a row's article or time line, not only its title, opens the topic, and the opened row carries `aria-current`. The page objects keep finding a topic by `topic-title`.

- [x] 6. **Section on the row.** — files: `libs/shared/src/lib/models/dto/forum.dto.ts`, `models/forum.ts`, `services/forum/forum.service.ts`, `topic-list.component.html` + specs, Playwright mocks — done when: the list item carries `section: ForumTopicSection | undefined` mapped from the wire's `null`; the second line reads «к новости X» for a `news` topic, «к статье X» otherwise, and the section name when `article` is absent; every row renders three lines.

## Verification

The gates of `AGENTS.md`, in order.

## Out of scope

- The «N новых» badge and opening at the first unread message — slice 3 of
  [`forum-plan.md`](forum-plan.md).
