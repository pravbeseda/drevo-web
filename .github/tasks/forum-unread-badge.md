# Forum unread badge

## Problem

The topic list does not show which topics have messages the reader has not seen. The backend now tracks a per-reader, per-topic read watermark (pravbeseda/drevo-yii#346, PR #347):

- `GET /api/forum/topics` — each item has `unreadCount` and, when it is not `0`, `firstUnreadId`.
- `GET /api/forum/topics/<id>` — `topic` has `firstUnreadId` when something is unread. No side effects.
- `POST /api/forum/topics/<id>/read {lastMessageId}` — moves the watermark forward only, answers `{unreadCount, firstUnreadId?}`.

## Goal

- A topic row with unread messages shows their count in a `ui-badge`, on the right of the second line, under the time (as a chat list does), in the colours of the draft badge.
- The row links to the first unread message, so the topic opens there rather than on its last page.
- The topic page draws a «Непрочитанные сообщения» divider before the first unread message and opens on it. The message under it gets no anchored highlight.
- A message is read once it has been fully inside the feed; a message taller than the feed, once its bottom edge has been. The client reports the largest such id; the badge in the list beside the topic follows as the reader scrolls.

## Design

1. **Models (`libs/shared`).** `ForumTopicListItemDto` gains `unreadCount`, `firstUnreadId?`; `ForumTopicDto` gains `firstUnreadId?`; new `ForumReadStateDto {unreadCount, firstUnreadId?}`. Domain models get the same fields (`firstUnreadId: number | undefined`) and `ForumReadState`.
2. **HTTP.** `ForumApiService.markRead(topicId, lastMessageId)` with `SKIP_ERROR_NOTIFICATION` — a background write the reader did not ask for must not toast. `ForumService.markRead()` maps the answer; the existing mappers carry the new fields.
3. **`ForumReadService`** (`app/services/forum/`, `providedIn: 'root'`, like `ForumDraftService`):
   - `markSeen(topicId, messageId)` — per topic, keeps the largest id, waits 1 s of quiet, then posts it. Root-scoped so a pending report survives leaving the topic. Failures are logged, nothing else.
   - `states: Signal<ReadonlyMap<number, ForumReadState>>` — the latest answer per topic.
   - `forget(topicIds)` — a list page fetched from the server is fresher than an earlier answer, so `TopicListPagesService` drops the stored states of the topics it loads.
4. **Topic list.** Reads `ForumReadService.states()` over the item's own fields; shows the badge when the count is above `0`; links to `topic/:id/:firstUnreadId` when there is one.
5. **Topic page.**
   - `unreadFrom` = `topic.firstUnreadId` of the resolved page, fixed until the next resolve.
   - The divider is drawn before the card of `unreadFrom`. The feed opens on the divider when it is in the feed and the address names no other message; the card's anchored highlight is off when the anchor is `unreadFrom`.
   - Once the opening scroll is done and on every scroll of the feed, the page finds the last card that counts as read (a pure helper in `shared/helpers/forum-read.ts`) and, when its id is `>= unreadFrom`, calls `markSeen`. Browser only; nothing is tracked when `unreadFrom` is absent.

## Tests

- **Unit:** DTO mapping of the new fields and `markRead`; `ForumReadService` (largest id wins, debounce, one post per quiet period, per topic, failure logged, `forget`); `TopicListPagesService` forgets loaded topics; topic list badge, link and store override; topic page divider, opening position, no highlight, `markSeen` calls; the geometry helper.
- **Playwright:** `forum-unread.spec.ts` with the mocked API — a row shows its badge and links to the first unread message; the topic opens on the divider; scrolling the last message into view posts `read` and the badge disappears.

## Known limits

- A topic reached from outside the list (history, a pasted link) under `/forum/topic/:id` does not highlight its row while the row still links to `/forum/topic/:id/:firstUnreadId`.
- The backend's own limits: jumping forward marks the skipped messages read; a message approved after the watermark passed it never counts as unread.
