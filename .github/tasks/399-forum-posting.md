# #399 — Forum: start a topic and reply to a message

Front half of slice 2 of [`forum-plan.md`](forum-plan.md). The backend
(pravbeseda/drevo-yii#300) ships two endpoints, not the five that plan listed:

```
POST /api/forum/topics                  {part, partId?, title, text} → {topicId, message, approved}
POST /api/forum/topics/<id>/messages    {text, parentId?}           → {message, approved}
```

Both need the `user` role (403 otherwise). A post held for a moderator is a
success with `approved: false`. A rejected post is 400 `VALIDATION_ERROR` with
`data.errors` keyed `title` / `text` (`part` errors arrive as `INVALID_PART`).
There is no preview, quote or edit endpoint yet — out of scope here.

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Design | As agreed in the issue — a hover toolbar ↩ / ⋯ on the bubble, a composer at the bottom of the topic with a «В ответ …» chip — except «Новая тема», which is a sidebar action (Q4, Q5) |
| 2 | Who sees the write UI | Any signed-in user; a 403 from the server shows the error under the form |
| 3 | «Цитировать» | Sets the reply chip and prefills the composer with the message's text as `> ` lines (the legacy `makeQuote` format, built from the rendered HTML via `htmlToText`) |
| 4 | «Ссылка на сообщение» | Copies the absolute deep link `/forum/topic/:id/:messageId` and shows a notification |
| 5 | Touch | A tap on the bubble toggles its toolbar (`@media (hover: none)`) |
| 6 | Topic list title | Regular weight instead of 600 (done, Playwright-checked) |

## Open questions

- [x] Q1 — Composer editor: plain autosizing `<textarea>` or `lib-editor` compact (forum-plan decision 5)?
  **Decision:** `lib-editor` without a toolbar, as forum-plan decision 5 says; no preview yet — the API has no preview endpoint.
- [x] Q2 — New-topic form: a route rendered in the topic panel, or a modal?
  **Decision:** a child route `new` in the topic panel — `/forum/new`, `/forum/:part/new` (the legacy address); success navigates to `/forum/topic/:topicId`.
- [x] Q3 — After a reply: append locally and scroll, or navigate to the message's deep link?
  **Decision:** append and scroll when the feed already reaches the last page; otherwise navigate to the message's deep link, so the feed never skips unloaded pages.
- [x] Q4 — Article discussion tab: where its «Новая тема» lives, or split it out into a follow-up issue?
  **Decision:** an `app-sidebar-action` (`priority="primary"`, icon `add`) linking to `/articles/:id/forum/new` — a button in the right sidebar on desktop, the FAB on a phone.
- [x] Q5 — The forum's own «Новая тема»: the tab row, as the issue has it, or the same sidebar action?
  **Decision:** the same sidebar action (plus `app-sidebar-reserve`) — one place for the action across the app; `ui-tabs-group` gets no trailing slot.

## Work

1. **Models** — `libs/shared`: `ForumCreateTopicRequestDto`, `ForumReplyRequestDto`,
   `ForumPostedMessageDto`, `ForumCreatedTopicDto`; domain `ForumPostOutcome` whose `ForumPostErrors`
   read from the 400 payload.
2. **API** — `ForumApiService.createTopic()` / `reply()` (two-layer pattern,
   `withCredentials`, errors handled by the caller — `SKIP_ERROR_NOTIFICATION`);
   `ForumService` maps DTOs and turns a `VALIDATION_ERROR` into field errors.
3. **«Новая тема»** — `app-sidebar-action` (`primary`, `add`) + `app-sidebar-reserve`
   in `forum-page` (link `/forum/new` or `/forum/:part/new`) and in
   `article-forum-tab` (link `/articles/:id/forum/new`).
4. **`message-card`** — toolbar (↩, ⋯ → `ui-dropdown-menu`: «Цитировать»,
   «Ссылка на сообщение»); outputs `reply` / `quote`.
5. **Composer** — `app-forum-composer` in `shared/components/`: `lib-editor`
   without a toolbar,
   reply chip (styled like `message-card__quote`, ✕ cancels), send button,
   field error, «на модерации» notice. `topic-page` hosts it and wires the
   card outputs to it.
6. **New topic form** — the child route `new` beside `topic/:id` (in
   `forumTopicRoutes()`, so both the forum and the article tab mount it):
   section (preselected from `:part`, bound to the article under
   `/articles/:id`, a select in «Все темы»), title, text in `lib-editor`; on
   success navigates to the topic, or shows the moderation notice.
6a. **After a reply** — append and scroll when `!hasNext()`, otherwise navigate
   to `…/topic/:id/:messageId`.
7. **Tests** — Spectator for every new/changed unit; Playwright
   `forum-posting.spec.ts`: start a topic, reply to a message via ↩, quote,
   moderation notice, validation error (mocked API).
8. **Docs** — rewrite slice 2 «Front» and the contract in `forum-plan.md` to
   match what shipped.
