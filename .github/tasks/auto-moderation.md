# Auto-moderation of article versions

## Problem

Moderating a version means reading it for the same known problems every time — broken markup, spelling slips — and then typing the remarks for the author by hand. Most of these problems can be found by a script.

## Goal

- The moderation panel gets an **Автопроверка** block, shown for a version in any status.
- Two buttons: **Весь текст** checks the whole version, **Только изменения** checks only the paragraphs this version changed against the previous one.
- A traffic-light verdict: green — no remarks, yellow — fixes needed, red — serious remarks.
- Each finding is a card in the side panel: level, category, location, the surrounding sentence with the fragment highlighted, the suggested fix when there is one. A card copies itself, adds itself to the moderation comment, and shows its place in the text (mockup: https://claude.ai/artifact/T1zyKFAj3Wj5kkRcMxTCKs, board 2).
- **Все в комментарий** assembles the selected findings into a draft in the existing comment field (`ModerationRequestDto.comment`); the moderator edits it before sending.
- Phase 1 is rule-based only. AI comes in phase 2 (out of scope here, see the end).

## Decisions

- Everything runs on the frontend; the Yii backend is untouched in phase 1.
- Rules live in `libs/editor/src/lib/validation` beside the existing four, so the editor's linter and the moderation check share one catalog.
- The finding's level comes from its **category**, fixed in code; the verdict is the worst level found, and hints alone keep the light green.
- The text view for findings is CodeMirror only (`cm-diff-view`, one or two columns), never JsDiff. Its document is the raw source of the current version, so finding offsets map onto it one-to-one.

## Rule catalog

Category → moderation level: **Разметка**, **Орфография** → serious; **Стиль** → fix; **Лексика** → hint.

Phase 1:

| ID | Category | Catches | Notes |
|---|---|---|---|
| M1 | Разметка | unpaired `(( ))`, `{{ }}`, `[[ ]]` | exists: `paired-brackets` |
| M2 | Разметка | empty `(())`, `[[]]`, `{{}}` | |
| M3 | Разметка | links, formatting, footnotes in headings | exist: `heading-no-links`, `heading-no-formatting`, `heading-no-footnotes` |
| M4 | Разметка | a comment the formatter reads differently from the author: `[*` without `*]`, `[*` that runs past the next `[*`, `[[*` (a footnote opening with bold) | `CommentRule.php` runs before footnotes, so the text up to the next `*]` disappears |
| L1 | Орфография | dictionary of unambiguous errors | `ихний`, `ложить`; `в течении` only before a time word (`года`, `дня`, `недели`, …), since `в течении реки` is correct |
| L2 | Орфография | the same word twice in a row | `и и`, `в в` |
| L3 | Орфография | Latin letters inside a Cyrillic word | reuse the confusables table of `SpamFilter/ConfusableSkeleton.php` |

Later: link `((…))` to a missing article, missing picture `@123@` and a category `{{…}}` that does not exist (need a backend endpoint; `{{…}}` takes any text as a category, so there is no unknown-tag rule); канцелярит and forbidden-word dictionaries (L4, Стиль/Лексика); empty section, skipped heading level, very long paragraph. Typography (quotes, dashes, spaces) is out for now.

Markup syntax reference: link `((…))`, footnote `[[…]]`, tag `{{…}}`, picture `@id@`, comment `[*…*]`, heading `==…==` / `===…===` — see `constants/wiki-patterns.ts` and `../drevo-yii/protected/components/WikiFormatter/`.

## Design

1. **Rule model** (`libs/editor/src/lib/validation/models`):
   - `ValidationRule` gains `category`; `RuleMatch` gains an optional `suggestion` (the replacement text).
   - A category → level map; `validateWikiContent` keeps returning editor severities, and a new `checkWikiContent` returns findings with category and level for moderation.
   - A masking step blanks out URLs (`!https://…`), tags and `nowiki` before the text rules (L1–L3) run, keeping offsets, so they never fire inside them.
2. **Rules**: one file per group under `rules/`, added to `ALL_RULES`, each with its own spec.
3. **Check report** (`app/shared/helpers/check-report.ts`, a pure function; `app/services/` may not import the shared diff config):
   - **Только изменения** keeps the findings on lines added or edited against the previous version, using `@codemirror/merge`'s `diff()` with the diff view's own config, so the lines match what CodeMirror highlights; a first version counts as all new.
   - Builds each finding's context: the sentence around the fragment within its line, cut to whole words with an ellipsis past 100 characters a side.
   - Returns the findings in reading order, the counts per level and the verdict. Rules take milliseconds, so phase 1 has no cache.
4. **Panel UI** (`app/shared/components/`):
   - `moderation-check` block inside `article-moderation-panel`: the two buttons, the traffic light with counts, the list of finding cards.
   - It loads the raw texts by `versionId` through `ArticleService.getVersionPairs`, falling back to `getArticleVersion` when the backend answers `NO_PREVIOUS_VERSION` for a first version.
   - A card, or **Все в комментарий** for the cards not added yet, appends a line `Строка N: «fragment» → «fix» — message` to the panel's existing comment field; an empty comment first gets `Прошу исправить:`. The same line is what the copy button puts on the clipboard.
5. **CodeMirror** (`cm-diff-view`):
   - A `findings` input renders them as marks and gutter markers on the current-version document (unified view, or the right column `mergeView.b`).
   - A third view mode, **Исходник**: the same read-only editor without the diff.
   - Scroll to a finding, expanding a collapsed unchanged chunk when the finding sits inside one.
   - On the article view page, **Показать в тексте** opens a modal (lazy, through `ModalService`) with a read-only CodeMirror in source mode.

## Testing

- Jest: every rule (hits, misses, the masking cases), the category → level map, the check service (both modes, the first-version case, context cutting), the panel block (verdict per level, draft assembly), `cm-diff-view` (findings marks, source mode).
- Playwright: on the diff page, open the moderation panel, run **Весь текст** on a fixture version with known problems, check the verdict and the cards, add one to the comment, open it in the text.

## Steps

1. Rule model: `category` (on the existing M1 and M3 too), the level map, `checkWikiContent`.
2. Rules M2, M4, M5, then L1–L3, with the `suggestion` field and the masking step they need.
3. Check report with both scopes and context.
4. Panel block with cards and the comment draft.
5. `cm-diff-view`: findings marks, source mode, scroll to a finding.
6. The source-mode modal on the article page.
7. Playwright scenario; docs (`docs/patterns.md` if the check service introduces a pattern).

## Editor severity

In the editor an `error` blocks saving (`article-edit.component.ts:238`) and a `warning` asks for confirmation; the moderation level comes from the category, separately from that. M4 is an `error`, since an unclosed comment hides the rest of the article; every other new rule is a `warning`, so a false positive never blocks an author.

## Phase 2: AI (out of scope)

Adapters behind one interface: manual (copy the prompt into a chat, paste the JSON answer back), Jev (TypeSafe AI — a classification model: it scores a paragraph, it does not quote or rewrite), maybe the Claude API. The user's key is kept through `StorageService`, never logged. Results are cached by `versionId`, provider and prompt version.
