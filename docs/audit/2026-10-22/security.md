# Security — audit 2026-10-22

## SEC-1 · blocking · Text typed after a session expires is dropped instead of saved as a draft

- **Where:** `apps/client/src/app/services/auth/auth.service.ts:268-269`, `apps/client/src/app/interceptors/auth.interceptor.ts:105-106`, `apps/client/src/app/app.config.ts:40-44`, `libs/core/src/lib/draft-storage/draft-storage.service.ts:30-42`, `apps/client/src/app/shared/services/draft-editor/draft-editor.service.ts:57-62,72-79`, `apps/client/src/app/features/article/pages/article-edit/article-edit.component.ts:180-183`, `apps/client/src/app/services/forum/forum-draft.service.ts:64,104-106`
- **What this is:** Article and forum drafts are written to IndexedDB 3 s after typing stops and flushed when the editor is destroyed. Each write is keyed by whoever is signed in at the moment of the write (`DRAFT_USER_ID_PROVIDER` reads `currentUser` at write time).
- **Problem:** A user without "remember me" (the default) has a session cookie; once the PHP session expires, the next authenticated call — Save, a forum reply POST, or the cross-tab sync after another tab's 401/logout — gets a 401. `handleUnauthorized` clears the user synchronously, then navigates to `/login`. On destroy, `flush()` has already cleared `lastPendingInput`, `requireUserId` throws, the error is logged, and the text typed since the last debounced write is gone. After logging back in, the re-entry path silently restores the older draft. In the forum, `signedIn` is already false, so `write` drops the text ("Draft dropped"); a short reply typed within 3 s has no stored draft at all.
- **Fix direction:** Tie a pending write to the user who typed it (capture the user id with the pending input), or flush pending drafts before `handleUnauthorized` clears the user. Fix it once in `DraftStorageService` so both draft services get it.
- **If we skip it:** Whenever a session expires mid-edit, the latest typing is lost and an outdated draft comes back with no notice.
- **Effort:** M · **Touches:** `draft-storage.service.ts`, `draft-editor.service.ts`, `forum-draft.service.ts`, possibly `auth.service.ts` · **Depends on:** — · **Status:** new (adjacent to #472) · **Verified:** confirmed

## SEC-2 · blocking · Text typed while a forum reply is sending is erased when the send succeeds

- **Where:** `apps/client/src/app/shared/components/forum-composer/forum-composer.component.ts:163-184` (send captures the text), `:205-216` (success path), `:254-258`; `forum-composer.component.html:50-61`; `apps/client/src/app/services/forum/forum-draft.service.ts:96-98`
- **What this is:** Send posts the text the field held when it was pressed. On success it deletes the topic's draft and empties the field.
- **Problem:** The editor stays editable while the POST is in flight (only the send bar is disabled; `lib-editor` has no readonly input). Send "A", type " P.S." before the response arrives: on success `drafts.save(topicId, '')` clears the pending edit for that topic and deletes any stored draft, and `clear()` resets the field to `''`. The reply was posted as "A", and " P.S." exists nowhere.
- **Fix direction:** On success, clear the field and delete the draft only if the field still equals the sent text; otherwise keep what is there. Blocking edits while sending is the alternative.
- **If we skip it:** Anything typed during the request is silently lost.
- **Effort:** S · **Touches:** `forum-composer.component.ts` (and its template if editing is blocked) · **Depends on:** — · **Status:** new · **Verified:** confirmed

## SEC-3 · suggestion · The CSRF token received from the embedding window is stored and never used

- **Where:** `apps/client/src/app/features/editor/iframe.service.ts:4,46,52,113-115`, `apps/client/src/app/features/editor/iframe.service.spec.ts:104-115`
- **What this is:** `IframeService` reads `csrf` from the host's `loadContent` message and publishes it as `csrfToken$`.
- **Problem:** Nothing outside the spec subscribes to `csrfToken$` (no consumer on `main` or `iframe`). A security token received over postMessage is kept with no reader. Removing the subject, the observable, the `csrf` read, the spec case and the `BehaviorSubject` import removes the concept.
- **Fix direction:** Delete `csrfTokenSubject`, `csrfToken$` and the `csrf` branch in `loadContent`, with its spec case.
- **If we skip it:** A dead path for a cross-window token stays, and every reader has to work out whether it is trusted.
- **Effort:** S · **Touches:** `iframe.service.ts`, its spec · **Depends on:** — · **Status:** new · **Verified:** confirmed
