# Audit 2026-10-22 — drevo-web

Audited `f02bbf11` on `main` · scope: whole repository (the untracked `legacy-drevo-yii/` symlink excluded)

## State of the project

Drevo-Web is the new front end of the Drevo encyclopedia: a server-rendered Angular application that talks to the old PHP site and is gradually replacing it, run by one maintainer and deployed automatically to beta and release servers. The code is in good health overall — strict typing, a long list of quality gates, consistent patterns and tests everywhere — and no exploitable security hole was confirmed. The real risk sits where people type: in three situations the article editor or the forum composer silently throws away text the reader has just written. A second cluster is lists and error reporting: a few lists can show results for a filter or a query the reader has already left, a successful save can show a false "access denied" message, and several failures are shown as the wrong message or never logged. Around these, a handful of the project's own architecture rules are broken in small places, and the operations documents — the deployment runbook, the secrets guide, the git-hook setup — describe a setup the scripts no longer have, so following them during an incident would fail. Most of the rest is cleanup that removes code: request boilerplate repeated in dozens of places, unused component options and dead public members. This is the first audit of the repository.

## What to do first

1. Stop losing what people type: keep the draft when a session expires, keep text typed while a reply is sending, and ask before «Отмена» discards fresh edits (SEC-1, SEC-2, COR-1) — M, `security.md`, `correctness.md`
2. Swap the order of the two HTTP interceptors so a request the CSRF retry recovers no longer shows «Доступ запрещен.» (ARCH-1) — S, `architecture.md`
3. Make the lists follow what the reader asked for: move the article history service to its documented home, then cancel stale history and search responses and de-duplicate forum topic pages (ARCH-3, COR-2, COR-5, COR-4) — M, `architecture.md`, `correctness.md`
4. Tell "not found" from "failed" and log every recovered error (COR-3, COR-6, COR-7) — M, `correctness.md`
5. Fix the instructions that give wrong commands: one git-hook system, a runbook and secrets guide that match the scripts, a working scaffold command, the right proxy path and origin, a test-first `create` skill (DOC-1 – DOC-7) — M, `docs.md`

## Findings

| ID | Lens | Label | Finding | Effort | Depends on | Status | Verified |
|----|------|-------|---------|--------|------------|--------|----------|
| SEC-1 | security | blocking | Text typed after a session expires is dropped instead of saved as a draft | M | — | new | confirmed |
| SEC-2 | security | blocking | Text typed while a forum reply is sending is erased when the send succeeds | S | — | new | confirmed |
| ARCH-1 | architecture | blocking | Error toast sits inside the auth interceptor; a recovered CSRF retry still shows «Доступ запрещен.» | S | — | new | confirmed |
| ARCH-2 | architecture | blocking | Angular Material lives in libs/core; toast styling split into the app stylesheet | M | — | new | confirmed |
| ARCH-3 | architecture | blocking | Page-scoped ArticleHistoryService lives among the global root services | S | — | new | confirmed |
| ARCH-4 | architecture | blocking | Single-consumer code kept in app/shared | S | — | new | confirmed |
| ARCH-5 | architecture | blocking | ThemeService exposes a writable global signal and reads browser globals | S | — | new | confirmed |
| ARCH-6 | architecture | blocking | Public writable signals in six components | S | — | new | confirmed |
| ARCH-7 | architecture | blocking | AppComponent breaks the OnPush rule and carries a dead field | S | — | new | confirmed |
| COR-1 | correctness | blocking | «Отмена» in the article editor discards recent edits without asking | S | — | new | confirmed |
| COR-2 | correctness | blocking | Article history: a slower response for the previous filter overwrites the current one | M | ARCH-3 | new | confirmed |
| COR-3 | correctness | blocking | Article resolvers turn "not found" and every failure into one unlogged `undefined` | M | — | new | confirmed |
| COR-4 | correctness | blocking | Forum topic list duplicates or hides topics when someone posts during scrolling | S | — | new | confirmed |
| COR-5 | correctness | blocking | Search: a stale "load more" lands on a newer query's results | S | — | new | confirmed |
| COR-6 | correctness | blocking | Errors recovered with no log entry (picture, search, reviews) | S | — | new | confirmed |
| COR-7 | correctness | blocking | Not-found pages also show a «Не найдено.» error toast | S | COR-3 | new | confirmed |
| DOC-1 | docs | blocking | Two git-hook systems override each other; commit gates or the secret scan silently off | S | — | new | confirmed |
| DOC-2 | docs | blocking | `README-deployment.md` gives rollback commands for a layout that no longer exists | M | — | new | confirmed |
| DOC-3 | docs | blocking | Secrets-migration and server-setup guides would break both deploys if followed | S | — | new | confirmed |
| DOC-4 | docs | blocking | AGENTS.md component scaffolding command fails on Nx 23 | S | — | new | confirmed |
| DOC-5 | docs | blocking | AGENTS.md says the dev proxy forwards `/pictures`; it forwards `/images` | S | — | new | confirmed |
| DOC-6 | docs | blocking | `auth-api.md` names the wrong production frontend origin | S | — | new | confirmed |
| DOC-7 | docs | blocking | The project `create` skill forbids writing tests first | S | — | new | confirmed |
| SEC-3 | security | suggestion | CSRF token received from the embedding window is never used | S | — | new | confirmed |
| ARCH-8 | architecture | suggestion | Public members only their own specs call | S | SEC-1 | new | confirmed |
| ARCH-9 | architecture | suggestion | Auth state is held twice | S | — | new | confirmed |
| ARCH-10 | architecture | suggestion | HttpErrorMapperService is an override seam nobody overrides | S | — | new | confirmed |
| ARCH-11 | architecture | suggestion | Login and logout attach the CSRF header the interceptor already attaches | S | — | new | confirmed |
| ARCH-12 | architecture | suggestion | Two definitions of "this is an API request" | S | ARCH-1 | new | confirmed |
| ARCH-13 | architecture | suggestion | LinksService is scoped per route although it is stateless | S | — | new | confirmed |
| ARCH-14 | architecture | suggestion | Root font size declared twice; the runtime copy always wins | S | — | new | confirmed |
| COR-8 | correctness | suggestion | `resolveFragmentLinks` comment contradicts its only caller | S | — | new | confirmed |
| DUP-1 | duplication | suggestion | `ApiResponse` unwrap pasted into 36 methods | S | — | new | confirmed |
| DUP-2 | duplication | suggestion | `withCredentials: true` repeated on 47 requests the interceptor already credentials | S | ARCH-12 | new | confirmed |
| DUP-3 | duplication | suggestion | `ui-button` writes one element six times where `matButton` takes the variant | S | LEAN-4 | new | confirmed |
| DUP-4 | duplication | suggestion | Paginated response shape declared 14 times, mapped by hand 7 times | M | — | new | confirmed |
| DUP-5 | duplication | suggestion | Date-header grouping and paging copied between the two history services | M | ARCH-3, COR-2 | new | confirmed |
| DUP-6 | duplication | suggestion | Beta and release workflows paste the same build and Sentry steps | S | — | new | confirmed |
| DUP-7 | duplication | suggestion | `ui-checkbox` and `ui-toggle` are the same ControlValueAccessor twice | S | — | new | confirmed |
| DUP-8 | duplication | suggestion | PM2 ecosystem entries are three near-identical blocks | S | — | new | confirmed |
| DUP-9 | duplication | suggestion | Article routes: twin predicates, copied children, twin resolvers | S | COR-3 | new | confirmed |
| DUP-10 | duplication | suggestion | Picture title validators and messages duplicated, limits hard-coded in text | S | — | new | confirmed |
| LEAN-1 | lean | suggestion | Logging: factory layer, options and exports nobody uses | M | — | new | confirmed |
| LEAN-2 | lean | suggestion | Exports and members nothing calls | S | ARCH-5 | new | confirmed |
| LEAN-3 | lean | suggestion | `ui-text-input`: seven inputs nobody sets, an unused appearance | S | — | new | confirmed |
| LEAN-4 | lean | suggestion | `ui-action-button`: the mini half of the template never renders | S | — | new | confirmed |
| LEAN-5 | lean | suggestion | Three app-internal barrels remain against the canon | S | ARCH-3 | new | confirmed |
| LEAN-6 | lean | suggestion | ModalService: `openWithRef`, `ModalRef`, `minWidth`, `maxWidth` have no caller | S | — | new | confirmed |
| LEAN-7 | lean | suggestion | `uiResizeHandle`: the vertical orientation is speculative | S | — | new | confirmed |
| LEAN-8 | lean | suggestion | Inputs and options with one value in practice | S | — | new | confirmed |
| LEAN-9 | lean | suggestion | `CUSTOM_ERROR_MESSAGE` is a context token nobody sets | S | — | new | confirmed |
| LEAN-10 | lean | suggestion | `deploy.sh` takes a derivable parameter and checks things twice | S | — | new | confirmed |
| DOC-8 | docs | suggestion | `security-audit-report.md` is a stale snapshot with false claims | S | — | new | confirmed |
| DOC-9 | docs | suggestion | Plan `initial-bundle-barrels.md` is fully done | S | — | new | confirmed |
| DOC-10 | docs | suggestion | Plan `forum-reply-drafts.md` is fully done | S | — | new | confirmed |
| DOC-11 | docs | suggestion | `SCRIPTS-GUIDE.md` repeats other files and carries a false base-href line | S | DOC-2, LEAN-10 | new | confirmed |
| DOC-12 | docs | suggestion | README project tree and tech table repeat AGENTS.md and have drifted | S | — | new | confirmed |
| DOC-13 | docs | suggestion | Copilot chat modes carry instructions for a different stack | S | — | new | confirmed |
| DOC-14 | docs | suggestion | README Node prerequisite is below what `engines` accepts | S | — | new | confirmed |
| DOC-15 | docs | suggestion | `security-scan.yml` claims to be byte-identical on `main` and `iframe` | S | — | new | confirmed |

## Fix order

- ARCH-3 before COR-2, DUP-5 and LEAN-5 — it moves the article history service those three edit.
- ARCH-4 moves the draft editor service that SEC-1 and COR-1 edit. The move is path-only: do it first if the three land together; otherwise SEC-1 and COR-1 go first and the move follows.
- ARCH-1 before ARCH-12, and ARCH-12 before DUP-2 — the interceptor order settles first, then the shared API predicate, then the per-request credentials rely on it.
- COR-3 before COR-7 (article reads) and DUP-9 (the article resolvers it rewrites).
- LEAN-4 before DUP-3 — removing the mini branch halves the action-button copies DUP-3 collapses.
- ARCH-5 before LEAN-2 — the theme service rewrite replaces the spec setup that uses `setTheme`.
- DOC-2 and LEAN-10 before DOC-11 — the runbook and the deploy signature settle what the scripts guide keeps.

## Closed since the last audit

No previous audit.

## Shortcuts

No shortcut markers.

## Not included

- 9 more suggestions in duplication below the cap of 10: local HTTP status constants instead of `HttpStatusCode` (8 removable), forum write statuses declared in two layers, the article-history filter list built in two components, the calendar ISO date built twice, date pipes re-implementing `formatTime`, the uncalled `LogDatabase.addLog`, `StorageService.set`/`setString` copied error handling, picture pending URLs without the cache-buster (plausible), the calendar year range on both sides (tracked in #330).
- 2 more suggestions in lean below the cap of 10: `DrawerService` repeating `StorageService`'s SSR guard, and an unreachable `@else` skeleton in the shared editor template.

Clean lenses: none.

## Not checked

- `legacy-drevo-yii/` — out of scope; read only to confirm API contracts.
- Not reached in depth by any lens: `libs/editor` internals, `testing/playwright/**` and `apps/client-e2e/**` beyond greps, the wiki-content DOM-patching layer (#326) and `ArticleEditComponent` (#232) beyond their draft and import use, the history diff page and `cm-diff-view`, the calendar and home pages, most `libs/ui` component internals, the docs on the `iframe` branch.
- SEC-1 depends on the production PHP session lifetime, which was not read; SEC-1, SEC-2 and ARCH-1 were confirmed by tracing the code and the Angular/Material sources, not by running the app.
- The picture pending URL finding (below the cap) is plausible only: whether a browser keeps the bare thumbnail URL across a replacement depends on the `/images` cache headers, which live outside this repository.
- DOC-13: whether the Copilot chat modes are still in use is for the owner to say. DOC-15: whether the shared Renovate preset sets `baseBranches` was not checked.
- No tests, builds or the app were run; every verdict comes from reading the code.

## Method

6 finders (security, architecture, correctness, duplication, lean, docs) and one verifier per lens with findings, each in a clean context, on Opus — the top-tier model's usage limit was reached at the start of the run. Ledger: no earlier audits; 17 open issues read. 89 findings raised, 79 confirmed, 1 plausible, 9 rejected (see rejected.md). After merging cross-lens duplicates and the cap, 60 are reported; documentation defects that several lenses raised are filed under docs, where their fix lives.
