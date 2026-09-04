# Forum

Bring the forum to the Angular front in three vertical slices: read, write,
moderate. Each slice starts in the legacy app, where the forum logic moves out
of `PostsController` / `Forum` into services under characterization tests, then
gets a JSON API on top of those services, and ends on the front. The legacy web
forum keeps working throughout, as a thin wrapper over the same services.

Backend work lands in [drevo-yii](https://github.com/pravbeseda/drevo-yii)
(checked out at `legacy-drevo-yii/`); the plan and the front live here.

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Slicing | Vertical: read-only first, then posting, then moderation and subscriptions. Every slice is a shippable PR pair (backend, front) and closes an existing stub |
| 2 | Discussion model | Flat chronological thread with quotes, one view. The three legacy modes (`table` / `tree` / `modern`), the two sort orders and the two message formats are not carried over. `parentId` stays in the data and the DTO as an «in reply to» link, so a tree view remains possible later without a migration |
| 2a | Positioning in a long thread | Deep link `/forum/topic/:id/:messageId`: the API returns the page that contains the message. Read position is server-side, in a new `forum_reads` table, and arrives with slice 3 — no browser-storage interim |
| 3 | Guests | The API requires an authenticated user; guest posting, captcha, the external-link and per-IP rules stay in the legacy web form. Stop words and link shorteners move to a shared `SpamFilterService` used by both paths |
| 4 | Refactoring depth | Services are designed as shared, but only forum call sites migrate: `ForumService`, `SpamFilterService`, `WikiRenderService`, `SubscriptionService`, `ForumReadService`. Article and news call sites move in a follow-up issue |
| 5 | Message editor | `lib-editor` from `@drevo-web/editor` in a compact mode, with server-side preview through the same renderer. No second markup, no second editor |

## Conventions shared by all slices

- Legacy: every new file under `services/`, `controllers/api/` ships with tests;
  `composer coverage:patch` ≥ 80 %; `stan:strict` clean; input via
  `Yii::app()->request`, no raw SQL outside models; a new model query gets a
  `DbTestCase` test. Before an action of `PostsController` moves to a service,
  a characterization test pins its current behaviour through the existing
  testable subclass (`PostsController.php:397-410`).
- API: `BaseApiController`, `{success, data | error, errorCode}`, GETs listed
  in `$csrfExemptActions` / `$originExemptActions`, pagination as
  `?page&size` → `{items, total, page, pageSize, totalPages}`, routes in
  `protected/config/config.php` next to `api/reviews/...`.
- Front: DTOs in `libs/shared/src/lib/models/dto/forum.dto.ts`, domain models
  in `libs/shared/src/lib/models/forum.ts`, `ForumApiService` +
  `ForumService` in `apps/client/src/app/services/forum/`, the feature in
  `apps/client/src/app/features/forum/`. Spec first for every file; Playwright
  in `testing/playwright/tests/forum/` with page objects in
  `testing/playwright/pages/` and API mocked through factories.
- Author identity: `forum.f_author` holds a display name, not a login. The
  service resolves names to logins in one batched query per page;
  `author.login` is absent for guests (`f_email` set) and for unknown names.

## Slice 1 — read

### Backend

Services:

- `WikiRenderService` — wraps the `new FormatterAdapter()` boilerplate. Forum
  call sites (`PostsController.php:171,253,311,366`, `ForumUtil.php:68`,
  `_topic_plain.php:4`) move to it.
- `ForumService::sections()`, `topics(part, partId, page, size)`,
  `topic(id, page, size, anchor)`. Built on model methods; `listTopic()` loads
  a whole topic today, so the model gains `listTopicPage()` and
  `countBefore(topicId, messageId)` (the anchor → page arithmetic). Message
  order is `f_id ASC`, stable under the anchor. Topics are ordered by
  `f_top DESC, f_lastid DESC` (sticky first, then last activity — the legacy
  `lastmes` order).
- `PostsController::actionIndex` / `actionTopic` become wrappers over the
  service; `CountMessages` widget and `JsonController::actionGetPostsCount`
  call `ForumService::countPosts()` instead of importing the model by hand.

Contract:

```
GET /api/forum/sections
  → [{id, name, description}]                      # forum_parts

GET /api/forum/topics?part=&partId=&page=&size=
  → {items, total, page, pageSize, totalPages}
item = {id, title, author, createdAt, repliesCount, lastPostId, lastPostAt,
        pinned}

GET /api/forum/topics/<id>?page=&size=&anchor=<messageId>
  → {topic, messages: {items, total, page, pageSize, totalPages}}
topic   = {id, title, part, partId, article: {id, title} | null, author,
           createdAt, repliesCount}
message = {id, parentId, author: {name, login?}, createdAt, html}
```

`anchor` overrides `page`; the response carries the page actually served.
Unapproved messages are excluded (slice 3 adds them for moderators). 404 for
a missing or unapproved topic, 400 for an unknown `part`.

Files: `protected/services/{ForumService,WikiRenderService}.php`,
`protected/controllers/api/ForumApiController.php`, model methods in
`modules/forum/models/Forum.php`, routes, `phpstan-components.neon`, and a
test per file (`unit/services/`, `unit/api/`, `unit/modules/forum/`).

### Front

```
libs/shared/src/lib/models/forum.ts, dto/forum.dto.ts
apps/client/src/app/services/forum/forum-api.service.ts, forum.service.ts
apps/client/src/app/shared/components/topic-list/          # used by the forum and the article tab
apps/client/src/app/features/forum/
    forum.routes.ts
    resolvers/forum-sections.resolver.ts, forum-topics.resolver.ts, forum-topic.resolver.ts
    pages/sections-page/          # /forum
    pages/topics-page/            # /forum/:part, /forum/:part/:partId
    pages/topic-page/             # /forum/topic/:id, /forum/topic/:id/:messageId
    components/message-card/      # author, date, «in reply to» link, app-wiki-content
apps/client/src/app/features/article/pages/article-page/tabs/article-forum-tab/
```

Route registration in `app.routes.ts` under the `authGuard` children; the
article tab replaces the `forum` stub in `article.routes.ts` (both the
`find/:title` and the `:id` branch); a «Форум» item in `layout/sidebar-nav`.

Behaviour:

- Resolvers return `'not-found'` / `'load-error'` as
  `features/picture/resolvers/picture.resolver.ts` does; pages render
  `ErrorComponent` for both.
- Topic messages are paged with «load more» in both directions from the
  served page, the pattern of `article-linkedhere-tab`. The URL keeps
  `?page` so a reload lands on the same page.
- With `:messageId` the page passes it as `anchor`, scrolls to
  `[data-testid="message-<id>"]` in `afterNextRender` through the injected
  `DOCUMENT`, and highlights the card with a new `--themed-*` token.
- «In reply to» on a message links to `/forum/topic/:id/:parentId`.
- Topic title through a `title:` resolver, as `history.routes.ts` does.
- Every navigation and load error goes through `LoggerService`.

#### Decisions taken for this run

| # | Question | Decision |
|---|---|---|
| F1 | Addressing a section's discussion | `/forum/:part/:partId` is added beside `/forum/:part`, the legacy shape (`forum/<part>/<partid>`), so existing links to an article's or a news item's discussion keep resolving; the article tab renders the same list component under its own address |
| F2 | Legacy `/forum/<messageId>` | Not resolved on the front. `ForumService::topic()` 404s on a non-root id (`ForumService.php:164-170`), so a reply id cannot become a topic without a new endpoint, and a digits-only redirect would serve roots alone while reading as full support. `/forum/123` falls into `/forum/:part`, matches no section and renders «not found». Parked as an issue for when the front becomes the default entry; until then the legacy app still serves those links |
| F3 | Coverage floor for `forum.routes.ts` | Listed at `0` in `scripts/check-file-coverage.js`, in the block that already holds `app.routes.ts`, `history.routes.ts`, `picture.routes.ts` and `calendar.routes.ts` — declaration-only, exercised by step 7's navigation. Every other new file meets the 70 % floor with a spec of its own |
| F4 | Empty and error copy | The repository's own shapes: `ErrorComponent` with «Не удалось загрузить … Попробуйте обновить страницу» (`picture-detail.component.html:183`) for a failed load, inline «Ничего не найдено» (`picture-page.component.html:44`) for an empty list |
| F5 | Page size | The front never sends `size`; the server's `listPerPage` decides and the response's `pageSize` is what the pager reads |
| F6 | Model names | `ForumSection`, `ForumTopic`, `ForumTopicListItem`, `ForumMessage`. `libs/shared` already exports `Topic` — the article rubrics of `models/topic.ts` — and a bare `Topic` would collide in `models/index.ts` |

#### Steps (red → green → refactor)

- [x] 1. **DTOs and models.** — files: `libs/shared/src/lib/models/dto/forum.dto.ts`, `libs/shared/src/lib/models/forum.ts`, both barrels — lenses: none — done when: `yarn nx test shared --configuration=ci` and `yarn lint:types` are green and `@drevo-web/shared` exports `ForumSectionDto`/`ForumSection`, `ForumTopicListItemDto`/`ForumTopicListItem`, `ForumTopicDto`/`ForumTopic`, `ForumMessageDto`/`ForumMessage`, `ForumTopicPageDto`/`ForumTopicPage`. Types only, no behaviour: the DTO mirrors the wire (`T | null` where the contract says `null`), the model follows the repository's rules (`undefined` for absence), and the red test that covers them is step 2's spec, written before step 2's implementation.

- [ ] 2. **`ForumApiService`.** — files: `apps/client/src/app/services/forum/forum-api.service.ts` + spec, `index.ts` — lenses: none — done when: the spec, red first, pins `GET /api/forum/sections`; `/api/forum/topics` with `part`, `partId`, `page` and no empty params; `/api/forum/topics/:id` with `page` and `anchor`; `withCredentials: true` on all three and `data` unwrapped from `ApiResponse`.

- [ ] 3. **`ForumService`.** — files: `apps/client/src/app/services/forum/forum.service.ts` + spec — lenses: none — done when: the spec covers dates through `parseDate`, a missing `author.login` mapped to `undefined`, `article: null` mapped to `undefined`, the three `0` sentinels of the wire (`lastPostId`, `partId`, `parentId`) mapped to `undefined`, `pinned`, and `total`/`page`/`pageSize`/`totalPages` carried through unchanged.

- [ ] 4. **Resolvers.** — files: `apps/client/src/app/features/forum/resolvers/forum-sections.resolver.ts`, `forum-topics.resolver.ts`, `forum-topic.resolver.ts` + specs, `apps/client/src/app/shared/testing/route-testing.helper.ts` (a `queryParams` argument) — lenses: security — done when: the specs cover a non-numeric, zero, negative and matrix-param id resolving to `'not-found'` without the service being called, a 404 to `'not-found'`, any other error to `'load-error'`, `?page` read from the query, and `:messageId` passed as `anchor`.

- [ ] 5. **Components and pages.** — files: `apps/client/src/app/shared/components/topic-list/`, `apps/client/src/app/features/forum/components/message-card/`, `pages/sections-page/`, `pages/topics-page/`, `pages/topic-page/` + specs — lenses: security — done when: Spectator specs cover each page's `'not-found'` and `'load-error'` branch rendering `ErrorComponent`, «load more» in both directions from the served page, `data-testid="message-<id>"` on the card, and the «in reply to» link pointing at `/forum/topic/:id/:parentId`.

- [ ] 6. **Routes, article tab, sidebar, token.** — files: `apps/client/src/app/features/forum/forum.routes.ts`, `app.routes.ts`, `features/article/article.routes.ts` (both `forum` stubs), `features/article/pages/article-page/tabs/article-forum-tab/`, `layout/sidebar-nav/sidebar-nav.component.ts`, `libs/ui/src/lib/styles/_theme-colors.scss`, `scripts/check-file-coverage.js` (F3) — lenses: compatibility — done when: `yarn nx affected -t lint,test`, `yarn lint:styles` and `yarn lint:coverage` are green and the article's «Обсуждение» tab lists that article's topics instead of the stub.

- [ ] 7. **Playwright.** — files: `testing/playwright/tests/forum/`, `testing/playwright/pages/forum*.page.ts`, `testing/playwright/mocks/forum.ts`, `fixtures/mock-api.fixture.ts` — lenses: none — done when: `yarn test:playwright` is green and carries the plan's three scenarios — sections → section → topic; a deep link scrolls to and highlights the message; the article tab lists the article's topics.

## Slice 2 — write

### Backend

- `SpamFilterService` — stop words (list moves out of `Forum.php:436-471`)
  and shortened links; the `Forum` validators delegate to it, the API calls it
  directly. Captcha, `checkExternalLink`, `checkUnapprovedMessages` stay as
  guest-only validators in the legacy form.
- `ForumService::createTopic`, `reply`, `edit`, `quote`, `preview`.
  `makeQuote` / `replyTitle` / `DelQuote` move from `ForumUtil` into the
  service. The three duplicated blocks of `PostsController` (preview
  `:167-172` vs `:249-254`, section correction `:176-183` vs `:258-265`,
  `Events` creation `:186-201` vs `:271-286`) collapse into the service;
  `actionNew` / `actionEdit` become wrappers. Logging through `LogService`.
- Edit rule as today (`PostsController.php:237`): own message, within 24 h,
  no replies — or `moder`.

Contract:

```
POST  /api/forum/topics                   {part, partId?, title, text} → topic
POST  /api/forum/topics/<id>/messages     {parentId?, text}           → message
PATCH /api/forum/messages/<id>            {title?, text}              → message
GET   /api/forum/messages/<id>/quote      → {title, text}   # prefilled reply
POST  /api/forum/preview                  {text}            → {html}
```

All require auth; `readonly` is refused with 403 as in `accessRules()`.
Validation failures answer 400 `VALIDATION_ERROR` with the field errors in
`data`, the shape of `ArticlesApiController::actionSave`.

### Front

- Reply form at the bottom of the topic page: `lib-editor` compact (short
  toolbar, autosize), «Текст | Превью» tabs, preview through the API.
  «Ответить» on a card fetches the quote and inserts it into the form.
- `/forum/:part/new` (and from the article tab, with `partId`) for a new
  topic. Editing is inline in the card, same editor, shown only when the API
  says the message is editable (`message.editable`, added to the DTO here).
- On success: the new message is appended, the URL moves to its deep link,
  the form clears; `NotificationService` on error.
- Playwright: post a reply against the mocked API and see it appended; open
  the preview tab; create a topic from an article tab.

## Slice 3 — moderate, subscribe, read position

### Backend

- `ForumService::approve`, `delete`, `move`, `pending(page, size)`,
  `history(author, page, size)`; moderators receive unapproved messages with
  `approved: false` in every list. `actionApprove` / `actionDelete` /
  `actionModeration` / `actionHistory` become wrappers.
- `SubscriptionService` over `EventsSubscribes::isSubscribe / subscribe /
  unsubscribe` for the `forum` object type.
- `ForumReadService` with the table `forum_reads (login, topic_id,
  last_read_id, updated_at)`, shipped as `docs/sql/forum-reads.sql` the way
  `premoderation-reviews.sql` was. Topic lists gain `unreadCount` and
  `firstUnreadId` for the current user.

Contract:

```
POST   /api/forum/messages/<id>/approve            (moder)
DELETE /api/forum/messages/<id>                    (moder)
PATCH  /api/forum/topics/<id>/section  {part, partId}   (moder)
GET    /api/forum/pending?page&size                (moder) — moderation queue
GET    /api/forum/history?author&page&size         — recent messages
PUT    /api/forum/topics/<id>/subscription | DELETE …
PUT    /api/forum/topics/<id>/read     {lastReadId}
```

### Front

- Approve / delete on the card and «move topic» on the topic page, gated by
  `UserPermissions.canModerate`; a pending badge on unapproved cards.
- Subscribe toggle in the topic header.
- «N новых» badge in topic lists; an unread divider and a «к первому
  непрочитанному» button on the topic page; the page reports the last visible
  message id as the user scrolls (debounced, one request per page).
- `/history/forum` replaces its stub with the history list; the moderation
  queue is a filter on it, as in the legacy `?approved=0`.
- Playwright: approve a pending message as a moderator; open a topic with
  unread messages and jump to the first one.

## Verification

Legacy, per PR: `composer test`, `composer coverage:patch`, `composer stan`,
`composer stan:strict`, `composer cs`. Front, per PR, the gates of
`AGENTS.md` in order; the slice is done when `yarn nx affected -t lint,test`,
`yarn lint:styles`, `yarn test:playwright` and `yarn build` are green.

## Out of scope

- RSS (`posts/feed`), Elastic search over the forum, and the view / sort /
  format settings (`SetForm`, `usr_forumview` and friends).
- Guest posting through the API (Decision 3).
- Migrating article and news call sites to `WikiRenderService` and
  `SubscriptionService` — a follow-up issue in drevo-yii.
- Retiring the legacy forum views and the dead
  `protected/controllers/ForumController.php` — after the front is the
  default entry.

## Rulings

_One line per reviewer finding not fixed: what it said, what was decided, why._

- Step 1, quality: the paged envelope `{items, total, page, pageSize, totalPages}` is written out four times and a `ForumPage<T>` generic would remove two interfaces per file. Dropped: every other model in `libs/shared` repeats the envelope per domain (`picture.ts:28,62`, `article-history.ts:30`), so a generic here makes the forum the one shape read differently from the rest; a shared envelope is a repository-wide refactor, not this step's. Cost if wrong: four declarations to edit together if the backend ever changes the envelope.
- Step 1, spec: `lastPostId` carried the wire's `0` sentinel into the domain model. Fixed, and with it the two fields of the same class the finding did not name — `partId` (`0` for a topic attached to no article) and `parentId` (`0` on a root message). All three are `number | undefined` in the model and stay `number` in the DTO, which mirrors the wire; the `0 -> undefined` conversion is step 3's mapper, and step 3's done-criterion now names it.

## Parked

_Real findings outside this run's scope. Each becomes an issue at the end._
