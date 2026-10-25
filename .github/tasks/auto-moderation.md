# Auto-moderation of article versions

## Problem

Moderating a version means reading it for the same known problems every time — broken markup, spelling slips — and then typing the remarks for the author by hand. Most of these problems can be found by a script.

## Goal

- The moderation panel gets an **Автопроверка** block, shown for a version in any status.
- Two buttons: **Весь текст** checks the whole version, **Только изменения** checks only the paragraphs this version changed against the previous one.
- A traffic-light verdict: green — no remarks, yellow — fixes needed, red — serious remarks.
- Each finding is a card in the side panel: level, category, location, the surrounding sentence with the fragment highlighted, the suggested fix when there is one. A card copies itself, adds itself to the moderation comment, and shows its place in the text (mockup: https://claude.ai/artifact/T1zyKFAj3Wj5kkRcMxTCKs, board 2).
- **Все в комментарий** assembles the selected findings into a draft in the existing comment field (`ModerationRequestDto.comment`); the moderator edits it before sending.
- Phase 1 is rule-based only; phase 2 adds the AI check (see «Phase 2» below).

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
| M4 | Разметка | a comment the formatter reads differently from the author: `[*` without `*]`, `[*` that runs past the next `[*`, `[[*` (a footnote opening with bold) when a `*]` follows it | `CommentRule.php` runs before footnotes, so the text up to the next `*]` disappears |
| L1 | Орфография | dictionary of unambiguous errors | `ихний`, `ложить`; `в течении` only before a time word (`года`, `дня`, `недели`, …), since `в течении реки` is correct |
| L2 | Орфография | the same word twice in a row | `и и`, `в в` |
| L3 | Орфография | Latin letters inside a Cyrillic word | reuse the confusables table of `SpamFilter/ConfusableSkeleton.php` |

Later: link `((…))` to a missing article, missing picture `@123@` and a category `{{…}}` that does not exist (need a backend endpoint; `{{…}}` takes any text as a category, so there is no unknown-tag rule); канцелярит and forbidden-word dictionaries (L4, Стиль/Лексика); empty section, skipped heading level, very long paragraph. Typography (quotes, dashes, spaces) is out for now.

Markup syntax reference: link `((…))`, footnote `[[…]]`, tag `{{…}}`, picture `@id@`, comment `[*…*]`, heading `==…==` / `===…===` — see `constants/wiki-patterns.ts` and `../drevo-yii/protected/components/WikiFormatter/`.

## Design

1. **Rule model** (`libs/editor/src/lib/validation/models`):
   - `ValidationRule` gains `category`; `RuleMatch` gains an optional `suggestion` (the replacement text).
   - A category → level map; `validateWikiContent` keeps returning editor severities, and a new `checkWikiContent` returns findings with category and level for moderation.
   - A masking step blanks out inline code, `nowiki`, comments (`[*…*]`) and URLs (`!https://…`) before the text rules (L1–L3) run, keeping offsets, so they never fire inside them. Categories (`{{…}}`) stay checked: a misspelling there names a category that does not exist.
2. **Rules**: one file per group under `rules/`, added to `ALL_RULES`, each with its own spec.
3. **Check report** (`app/shared/helpers/check-report.ts`, a pure function; `app/services/` may not import the shared diff config):
   - **Только изменения** keeps the findings on lines added or edited against the previous version, using `@codemirror/merge`'s `diff()` with the diff view's own config, so the lines match what CodeMirror highlights; a first version counts as all new.
   - Builds each finding's context: the sentence around the fragment within its line, cut to whole words with an ellipsis past 100 characters a side.
   - Returns the findings in reading order, the counts per level and the verdict. Rules take milliseconds, so phase 1 has no cache.
4. **Panel UI** (`app/shared/components/`):
   - `moderation-check` block inside `article-moderation-panel`: the two buttons, the traffic light with counts, the list of finding cards.
   - It loads the raw texts by `versionId` through `ArticleService.getVersionPairs`, falling back to `getArticleVersion` when the backend answers `NO_PREVIOUS_VERSION` for a first version.
   - A card, or **Все в комментарий** for the cards not added yet, appends a line `Строка N: «fragment» → «fix» — message` to the panel's existing comment field; an empty comment first gets `Прошу исправить:`. The same line is what the copy button puts on the clipboard.
5. **CodeMirror core** (`app/shared/components/cm-diff-editor/`): extracted from `cm-diff-view`, whose controls register in the page sidebar through `SidebarService` and so cannot live inside a modal.
   - Inputs: the two texts, the mode (`unified`, `side-by-side`, `source`), the findings, the focused finding; read-only throughout.
   - Findings render as marks on the current-version document (the unified view, the right column `mergeView.b`, or the source view); focusing one scrolls to it, expanding a collapsed unchanged chunk first.
   - `cm-diff-view` becomes the core plus its sidebar actions, so the diff page keeps its behaviour.
6. **Moderation sheet** (`app/shared/components/moderation-sheet/`): moderation gets its own CodeMirror, independent of the page, since the article page has none and the diff page may be in JsDiff mode.
   - **Модерация** in `moderation-sidebar-action` opens the sheet through `ModalService` (lazy, near full screen) instead of the side panel; a decision closes it and reports the result as before.
   - The sheet loads the raw texts and passes them down; `moderation-check` takes them as an input instead of loading them, and reports its report and the card clicked through `article-moderation-panel` back up, so the sheet feeds the left editor.
   - Desktop (≥ `$breakpoint-desktop`): the editor with its mode buttons on the left, `article-moderation-panel` on the right. Narrower: tabs «Решение» / «Текст», a card's **Показать в тексте** switches to «Текст» on its line, and the two-column mode is hidden (mockup: https://claude.ai/artifact/V7PDbUF2CvU1BKgxyqv2UN).

## Testing

- Jest: every rule (hits, misses, the masking cases), the category → level map, the check service (both modes, the first-version case, context cutting), the panel block (verdict per level, draft assembly), `cm-diff-view` (findings marks, source mode).
- Playwright: on the diff page, open the moderation sheet, run **Весь текст** on a fixture version with known problems, check the verdict and the cards, add one to the comment, click a card and see its mark in the editor; on a phone viewport, the same through the tabs.

## Steps

1. Rule model: `category` (on the existing M1 and M3 too), the level map, `checkWikiContent`.
2. Rules M2, M4, M5, then L1–L3, with the `suggestion` field and the masking step they need.
3. Check report with both scopes and context.
4. Panel block with cards and the comment draft.
5. `cm-diff-editor` extracted from `cm-diff-view` behind characterization tests, then the source mode, findings marks and focusing a finding.
6. The moderation sheet: opening it from the sidebar action, the texts loaded once, the desktop split and the phone tabs.
7. Playwright scenario; docs (`docs/patterns.md` if a pattern comes out of it).

## Editor severity

In the editor an `error` blocks saving (`article-edit.component.ts:238`) and a `warning` asks for confirmation; the moderation level comes from the category, separately from that. M4 is an `error`, since an unclosed comment hides the rest of the article; every other new rule is a `warning`, so a false positive never blocks an author.

## Phase 2: AI check through Jev

### Goal

When the moderator has saved an OpenRouter API key, **Весь текст** and **Только изменения** run the rules and, alongside them, ask Jev (TypeSafe's classification model) about every paragraph in scope. Rule cards appear at once; AI cards follow as answers arrive, with an «ИИ: 12 из 40» counter. Without a key the block works exactly as in phase 1. There is no copy-paste prompt adapter.

### Decisions

- **Transport**: OpenRouter, `POST https://openrouter.ai/api/v1/systemone`, `Authorization: Bearer <key>`, model pinned to `typesafe/jev-1.14` (thresholds are calibrated against one model; the public model list shows only `typesafe/jev-router`, so the first live request confirms the slug). `api.typesafe.ai` rejects browser origins (`400 Disallowed CORS origin` on preflight); OpenRouter answers `access-control-allow-origin: *`. The request carries `SKIP_ERROR_NOTIFICATION`; `AuthInterceptor` only touches `/api/` and `apiUrl`, so no CSRF or cookies leave.
- **One request per paragraph** (one source line), with the whole questionnaire in it; at most 4 in flight. **Только изменения** sends only the changed lines, the same set `buildCheckReport` keeps. A finding covers its whole line.
- **Text sent**: the line with the markup stripped on the frontend. Comments, `<nowiki>`, inline code and URLs span lines, so they are blanked over the whole version first by the existing `maskNonProse` (`mask.ts`), which keeps the line breaks; only then is the text split into lines and each line stripped by the patterns of `constants/wiki-patterns.ts` — link, bold, italic and heading → their text; picture `@id@` and the mask filler → removed; footnote `[[…]]` → ` (…)`, and a footnote's bracket left on a line by a footnote spanning lines → removed. A line with no letters left is not sent.
- **Questionnaire**: a constant in code with a version number, three `choice` questions, one per category, each with a `none` option. Jev sees only the `instructions` and the option descriptions in `criteria`, so these are the contract; the card's message is the option description.

  | Key | Category → level | `instructions` | `criteria` |
  |---|---|---|---|
  | `spelling` | Орфография → serious | Есть ли в абзаце орфографические ошибки или опечатки? | `none`: Ошибок нет · `typo`: Опечатка — пропущена, лишняя или переставлена буква · `spelling`: Слово написано с орфографической ошибкой |
  | `grammar` | Грамматика (new) → serious | Есть ли в абзаце грамматические ошибки? | `none`: Ошибок нет · `agreement`: Нарушено согласование — род, число или падеж · `government`: Неверное управление или предлог · `punctuation`: Пунктуационная ошибка |
  | `style` | Стиль → fix | Подходит ли стиль абзаца для энциклопедии? | `none`: Стиль нейтральный, энциклопедический · `colloquial`: Разговорные обороты · `bureaucratic`: Канцелярит · `evaluative`: Оценочные или эмоциональные слова |
- **Thresholds**: `p = 1 − probabilities.none`. `p ≥ 0.7` → a finding at the category's level; `0.4 ≤ p < 0.7` → a `hint` («Возможно: …»), which keeps the light as it is; below → nothing. The message is the description of the most probable non-`none` option; the card shows `p` as a percentage.
- **Key**: kept through `StorageService` under one key, read and written by one root service; never logged, never in an error context. The field is `type="password"`. Accepted trade-off: any script on our origin can read the key. It is the moderator's own key, not a project secret, so a spend limit on it in OpenRouter bounds the damage; a backend proxy can take the key over later without changing the rest of the design.
- **Cache**: in memory, in the root service, keyed by model + questionnaire version + stripped text, so a paragraph unchanged across versions is not asked again until the tab reloads.
- **Errors**: one outcome per run, never one per paragraph; the key and headers never reach `LoggerService`, and rule cards stay in every case.
  - 401 is about the whole run: the first one cancels the requests still queued, with one «Ключ не подошёл» notification and one logged error.
  - 429 → one retry after a fixed delay, a named constant (OpenRouter's `Access-Control-Expose-Headers` leaves `Retry-After` unreadable to the page).
  - Anything else is about one paragraph: it is skipped and the run goes on. At the end, if any were skipped, one «ИИ: не удалось проверить N абзацев» notification and one logged error with the count; the counter reads «ИИ: 37 из 40, 3 с ошибкой».

### Design

1. **Model** (`libs/editor`): `CheckCategory` gains `grammar` (serious in `CHECK_LEVELS`); `CheckFinding` gains an optional `probability`, set only on AI findings. `CATEGORY_LABELS` in `moderation-check.component.ts` gets «Грамматика».
2. **Markup stripping** (`libs/editor/src/lib/validation/prose-lines.ts`, exported): `toProseLines(text): readonly string[]`, a pure function: `maskNonProse` over the whole text, then the inline patterns line by line; index `i` is source line `i + 1`.
3. **Jev questionnaire** (`app/services/ai-review/jev-questionnaire.ts`): the questions, their category, the option descriptions, the version; and `toFindings(answers, line): CheckFinding[]`, applying the thresholds.
4. **HTTP** (two layers, `app/services/ai-review/`):
   - `jev-api.service.ts` — `systemOne(key, state, questions)`, the DTOs of the request and the answer, the context token, and no `withCredentials`: `docs/patterns.md` shows it on every API call, but credentials with `access-control-allow-origin: *` fail CORS.
   - `ai-review.service.ts` — `review(lines): Observable<AiReviewProgress>` over the `toProseLines` output of the lines in scope, emitting `{ done, total, failed, findings }` as answers arrive: skips the empty ones, serves the cache, runs the rest through `mergeMap(…, 4)`, retries a 429 once, maps the answers through `toFindings`.
   - `ai-key.service.ts` — `key` (a readonly signal), `save(key)`, `remove()`.
5. **Report** (`check-report.ts`): `buildCheckReport` takes the AI findings as an extra argument and merges them into the same items, counts and verdict; the changed-line selection is exported so the component sends exactly the lines the report keeps.
6. **UI** (`moderation-check`):
   - The block's border carries a legend: «Автопроверка» on the left, «ИИ» or «Подключить ИИ» on the right (pattern: `forum-composer.component.scss:43`). The right one toggles an inline key form: the password field, «Сохранить», «Удалить ключ».
   - With a key, a run starts the AI review beside the rules and shows the «ИИ: done из total» counter; a new run cancels the previous one (`switchMap`).
   - An AI card shows «ИИ · 82 %» in its meta and the paragraph cut to whole words instead of a highlighted fragment. Its comment line is `Строка N — message`, without the paragraph.

### Testing

- Jest: `toProseLines` (every markup kind, nested link in bold, a comment and a `<nowiki>` spanning lines, a footnote spanning lines, a line that strips to nothing); `toFindings` (both thresholds, the boundaries, the winning option); `AiReviewService` (empty lines skipped, cache hit, concurrency cap, 429 retry, the first 401 cancelling the rest with one notification, failed paragraphs skipped and summed up in one notification); `AiKeyService`; `buildCheckReport` with AI findings (verdict, hints keep green); `moderation-check` (legend states, key form, counter, AI card, comment line).
- Playwright: `page.route` mocks `openrouter.ai/api/v1/systemone`; with a key saved in the form, **Весь текст** shows an AI card with its percentage and moves the light; without a key, no request is sent.

### Steps

1. Model: `grammar`, `probability`, labels.
2. `toProseLines`.
3. Questionnaire and `toFindings`.
4. `JevApiService`, `AiKeyService`, `AiReviewService`.
5. `buildCheckReport` with AI findings and the exported line selection.
6. `moderation-check`: legend, key form, AI run, AI cards.
7. Playwright scenario; docs (`docs/patterns.md` gets the external-API call without credentials if it reads as a pattern).
