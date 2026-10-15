# Forum reply drafts

## Problem

`ForumComposerComponent` keeps the reply text in `_draft`, a signal that is not tied to any topic. Moving from `topic/1` to `topic/2` reuses `TopicPageComponent` and its composer, so the text you were writing shows up in the other topic.

## Goal

- Each topic keeps its own reply draft. When you leave a topic with a non-empty composer, the draft is saved; when you open the topic again, it is restored.
- When you leave with an empty composer, any stored draft for that topic is deleted. Sending a message also deletes the draft.
- In the topic list (the forum page and the article discussion tab), a topic that has a draft shows:
  - a pencil badge on the avatar, bottom-right, in a circle of `--themed-link-color` set in a cut-out of the avatar (mockup variant 2);
  - the subtitle `Черновик: <draft excerpt>` in place of the last-post excerpt (mockup variant 9).

## Design

1. **Storage.** Reuse `DraftStorageService` (IndexedDB, keyed per user) with the route key `/forum/topic/{id}`. The article editor already writes there; nothing lists drafts yet.
2. **`ForumDraftService`** (`app/services/forum/`, `providedIn: 'root'`):
   - `drafts: Signal<ReadonlyMap<number, string>>` maps topic id to draft text, reloaded from `getAll()` (filtered by the route prefix) whenever the logged-in user changes; after logout no write reaches the storage;
   - `get(topicId)` reads one draft, `edit(topicId, text)` saves after a 3 s pause, `save(topicId, text)` saves at once (a blank text deletes);
   - writes are queued so that they land in order, and the signal changes only after the storage write succeeds.
3. **Composer.**
   - When `topicId` changes, it saves the previous topic's draft and resets `_draft`, `_replyTarget`, `_error` and `_expanded`.
   - It then loads the new topic's draft.
   - It saves on destroy as well.
   - It calls `save(topicId, '')` on `posted`. A message that posts after the reader has moved to another topic clears neither that topic's field nor its feed. A refusal that arrives after the move shows a toast instead of an error in the other topic's composer; the text stays as the draft of its own topic, and the toast says so only when that draft was actually stored.
4. **Topic list.**
   - It reads `ForumDraftService.drafts()`.
   - It wraps the avatar with the badge (`ui-icon name="edit" size="xsmall"`, a new icon size) and adds a `topic-draft` subtitle branch.
   - The badge sits in a see-through cut-out of the avatar (`mask`), so the gap shows the row's background in every state and theme; the hover and selected row colours are translucent in the dark theme, so a ring painted in them would vanish. The badge size, gap and offset are tokens in `_tokens.scss`.
5. **Excerpt.** The first non-empty line of the draft that is not a `>` quote line, cut by CSS ellipsis.

## Tests

- **Unit, `ForumDraftService`:** load, save, empty-save deletes, discard, and the signal updates.
- **Unit, composer:** switching `topicId` saves the old draft, restores the new one and clears the reply target; posting discards; destroy saves.
- **Unit, topic list:** the badge and the `Черновик:` subtitle appear only for topics that have a draft.
- **Playwright, `forum-posting.spec.ts`:** type in topic A, open topic B, and check the composer is empty and A shows the badge; return to A and check the text is restored.

## Open questions

1. Save trigger: only on leaving the topic, or debounced while typing as well (which survives a reload or a closed tab)?
   **Decision:** Debounced while typing (3 s, like the article editor), plus an immediate save when the topic changes and when the composer is destroyed. The draft is restored silently, with no restore dialog unlike articles.
2. Should the draft keep the reply target (`replyTo`), or only the text?
   **Decision:** Text only. The reply target is reset when the topic changes; a quote stays in the text, and the user can click "Ответить" again.
3. Draft excerpt: skip the quote lines, or show the text as is?
   **Decision:** Skip the `>` quote lines and join the remaining non-empty lines. A draft that holds only a quote shows `Черновик: цитата`. The helper sits next to `forum-quote.ts`.
