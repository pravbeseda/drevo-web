# Correctness — audit 2026-10-22

## COR-1 · blocking · «Отмена» in the article editor discards recent edits without asking

- **Where:** `apps/client/src/app/features/article/pages/article-edit/article-edit.component.ts:354-376` (`cancel`), `:74,78` (`_editorContent`, `_originalContent`); `apps/client/src/app/shared/services/draft-editor/draft-editor.service.ts:6,57-62`
- **What this is:** `cancel()` asks «Удалить черновик? … Несохранённые изменения будут потеряны.» only when a stored draft exists; otherwise it discards the pending input and leaves.
- **Problem:** Drafts are written 3 s after the last keystroke. Edit and click Отмена within 3 s: no draft is stored yet, `discardDraft` clears the pending input, and the edits are gone without a prompt. The same edits made 4 s earlier would have prompted. There is no `canDeactivate` guard behind it.
- **Fix direction:** Decide "unsaved changes" by comparing the editor content with the session content, and only then consult the stored draft.
- **If we skip it:** Fresh edits disappear on a misclick.
- **Effort:** S · **Touches:** `article-edit.component.ts`, its spec · **Depends on:** — · **Status:** new · **Verified:** confirmed

## COR-2 · blocking · Article history: a slower response for the previous filter overwrites the current one

- **Where:** `apps/client/src/app/services/articles/article-history/article-history.service.ts:176-205`, `:256-299`
- **What this is:** `loadHistory` subscribes to a new `getArticlesHistory` call on every filter change, hide-cancelled toggle or load-more; nothing cancels the earlier call.
- **Problem:** Click «Непроверенные», then «Все», while the first request is in flight: whichever response arrives last wins, so the list can show all versions under the «Непроверенные» chip, and `_isLoading` clears while the current request still runs. A load-more in flight during a filter change appends page 2 of the old filter and resets `_totalItems`. The chips are not disabled while loading. `article-linkedhere-tab.component.ts:90` already solves this with one `switchMap` stream.
- **Fix direction:** Route every load through one subject with `switchMap`, as the linked-here tab does.
- **If we skip it:** The filter shown and the list shown can disagree — worst for moderators reviewing «Непроверенные».
- **Effort:** M · **Touches:** `article-history.service.ts`, its spec · **Depends on:** ARCH-3 · **Status:** new · **Verified:** confirmed

## COR-3 · blocking · Article resolvers turn "not found" and every failure into one unlogged `undefined`

- **Where:** `apps/client/src/app/features/article/resolvers/article.resolver.ts:22`, `article-version.resolver.ts:22`, `apps/client/src/app/features/article/pages/article-page/article.component.ts:30-32`, `article-edit.component.ts:119-123`, `apps/client/src/app/services/page-title.strategy.ts:100-102`
- **What this is:** Both resolvers use `catchError(() => of(undefined))`. The article page shows «Ошибка загрузки статьи» for `undefined`; the editor shows «Версия не найдена».
- **Problem:** `/articles/999999` gets 404 `NOT_FOUND` (`ArticlesApiController.php:634,641`) and is shown as a load error; a 500 or network failure on the editor route is shown as «Версия не найдена». The page logs nothing, and the editor logs only "Edit session not resolved from route data" without cause or status — against AGENTS.md Quality rule 6. The forum-topic and calendar resolvers already return `'not-found' | 'load-error'` and log the second (`forum-topic-page-data.service.ts:75-86`, `calendar-year.resolver.ts:49-61`).
- **Fix direction:** Return the same `'not-found' | 'load-error'` union from the article resolvers, log the load error with its cause, and branch on it in the page and the editor.
- **If we skip it:** Missing articles read as outages, and outages leave no useful log entry.
- **Effort:** M · **Touches:** both article resolvers, `article.component.ts`, `article-edit.component.ts`, `page-title.strategy.ts`, specs · **Depends on:** — · **Status:** new · **Verified:** confirmed

## COR-4 · blocking · Forum topic list duplicates or hides topics when someone posts while the reader scrolls

- **Where:** `apps/client/src/app/shared/services/topic-list-pages/topic-list-pages.service.ts:104-124`; ordering at `legacy-drevo-yii/protected/controllers/api/ForumApiController.php:77` (`ForumTopicOrder::PinnedThenLastActivity`)
- **What this is:** The topic list loads further pages by page number and appends each page to the items already shown.
- **Problem:** The server orders by last activity. A reply in any topic between two page loads shifts everything below it by one: the next page starts with a topic already shown, so it appears twice (and the virtual scroller gets duplicate track keys). A reply in a topic on a page not yet loaded moves it to page 1, which is already on screen, so it is never shown.
- **Fix direction:** At minimum, drop items whose id is already in the list when appending; cursor paging by last-activity time also fixes the skipped topics.
- **If we skip it:** Duplicate rows, and fresh topics missing from a busy forum's list.
- **Effort:** S · **Touches:** `topic-list-pages.service.ts`, its spec · **Depends on:** — · **Status:** new · **Verified:** confirmed

## COR-5 · blocking · Search: a stale "load more" lands on a newer query's results

- **Where:** `apps/client/src/app/features/search/search.component.ts:51-80`, `:88-113`
- **What this is:** `onLoadMore` fetches the next page and appends it to the results it captured at call time; the query stream resets `currentPage` to 1 on every keystroke, before the debounce.
- **Problem:** Type while page 2 is loading. If page 2 arrives during the 500 ms debounce, it sets `currentPage` to 2 after the reset, so the new query's next scroll asks for page 3 and its page 2 is never shown. If page 2 arrives after the new results, it replaces them with the old query's results plus page 2. `picture-state.service.ts:110,123` already drops a response whose query changed.
- **Fix direction:** Apply the same query-at-request guard, or merge load-more into the query stream under `switchMap` as the linked-here tab does.
- **If we skip it:** Results can belong to a query the reader no longer has typed, or skip a page.
- **Effort:** S · **Touches:** `search.component.ts`, its spec · **Depends on:** — · **Status:** new · **Verified:** confirmed

## COR-6 · blocking · Errors recovered with no log entry

- **Where:** `apps/client/src/app/features/picture/resolvers/picture.resolver.ts:28-33`, `apps/client/src/app/features/search/search.component.ts:69-71,103-105`, `apps/client/src/app/shared/components/review-block/review-block.component.ts:256,263-270`, `apps/client/src/app/services/reviews/review-api.service.ts:75`
- **What this is:** Each `catchError` turns any failure into an empty value (`'load-error'`, empty results, an empty review list) without calling the logger.
- **Problem:** A 500 on a picture or on search leaves only a toast. The review list is worst: `getReviews` sets `SKIP_ERROR_NOTIFICATION`, so a 500 produces neither a toast nor a log, and the reviewer's own vote then shows as «Undecided» because the form resets from the empty list. AGENTS.md Quality rule 6 requires errors to be logged; neighbouring resolvers do (`calendar-year.resolver.ts:59`, `forum-topic-page-data.service.ts:84`). Logged errors still do not reach Sentry as exceptions until #474 is fixed; the IndexedDB log part holds today.
- **Fix direction:** Log the error in each `catchError`; for reviews, keep the silent empty fallback only for the 404 `FEATURE_DISABLED` case.
- **If we skip it:** These failures stay invisible in the exported log and in Sentry.
- **Effort:** S · **Touches:** the three files and their specs · **Depends on:** — (same file as COR-5 for search; fix together) · **Status:** new · **Verified:** confirmed

## COR-7 · blocking · Not-found pages also show a «Не найдено.» error toast

- **Where:** `apps/client/src/app/services/forum/forum-api.service.ts:100-120` (`getTopic`), `apps/client/src/app/services/pictures/picture-api.service.ts:65-74` (`getPicture`); compare `forum-api.service.ts:126-131` (`getMessageTopic`) and `calendar-api.service.ts:30`
- **What this is:** The topic and picture resolvers treat a 404 as a stale link and render their own not-found page.
- **Problem:** These reads set no skip context, so `/forum/topic/<deleted id>` or `/pictures/<deleted id>` shows the not-found page and an error toast. `getMessageTopic` and the calendar read already skip their stale-link status for this reason. Other callers rely on the toast as their only feedback (`picture-lightbox.service.ts:79-84`, `topic-page.component.ts:191`), so the skip cannot simply go on the API method. The article reads join this once COR-3 gives the article page a not-found state.
- **Fix direction:** Skip the 404 toast per caller — a context parameter, or applied only on the resolver's path — not on the API method for everyone.
- **If we skip it:** Every stale link also produces an error toast.
- **Effort:** S · **Touches:** `forum-api.service.ts`, `picture-api.service.ts`, the two resolvers · **Depends on:** COR-3 (for the article reads) · **Status:** new · **Verified:** confirmed

## COR-8 · suggestion · The `resolveFragmentLinks` comment contradicts its only caller

- **Where:** `apps/client/src/app/shared/components/wiki-content/preprocessors/resolve-fragment-links.ts:10-14`, `apps/client/src/app/shared/components/wiki-content/wiki-content.component.ts:73,78-86`
- **What this is:** The JSDoc says to pass "the raw `location.pathname`" and that an empty `basePath` (SSR) leaves content untouched.
- **Problem:** The only caller deliberately passes a path derived from `router.url`, set during SSR too, so server and client output match for hydration. The code is right; the comment points the next editor at the hydration mismatch the caller exists to avoid.
- **Fix direction:** Rewrite the comment to describe the router-derived path and why.
- **If we skip it:** A future edit that follows the comment brings back hydration mismatches on every article with footnotes.
- **Effort:** S · **Touches:** `resolve-fragment-links.ts` · **Depends on:** — · **Status:** new · **Verified:** confirmed (downgraded from blocking by the verifier)
