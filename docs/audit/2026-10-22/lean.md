# Lean — audit 2026-10-22

All findings here are suggestions: applying each removes code. Two more sit below the cap of ten (see the README).

## LEAN-1 · suggestion · Logging: an extra factory layer, options and exports nobody uses

- **Where:** `libs/core/src/lib/logging/providers/sentry-log.provider.ts:7-18,27-34,48-55,180-194`, `libs/core/src/lib/logging/providers/indexed-db-log.provider.ts:36-37,188-190`, `libs/core/src/lib/logging/index.ts:2,17-18,25,28-31`, `apps/client/src/app/app.config.ts:23-26`
- **What this is:** The logger's provider set is fixed once in app.config through two factory functions.
- **Problem:** `createSentryLogProvider` and `createIndexedDBLogProvider` only call `new`. The single Sentry call passes no `SentryLogProviderOptions` and always the literal `true` for `isBrowser`; nobody passes IndexedDB's `maxSize`. The Sentry `@example` does not match the real signature. The barrel exports `LOG_PROVIDERS`, `LOG_PRODUCTION_MODE`, `LogDispatcher`, `sanitizeLogData`, `sanitizeLogEntry`, `isStorageProvider`, `ConsoleLogProvider`, `IndexedDBLogProvider`, `SentryLogProvider` and `SentryLogProviderOptions`, none imported outside libs/core. (The dispatcher's registry methods are ARCH-8; `LogDatabase.addLog` is listed under duplication below the cap.)
- **Fix direction:** Turn the option fields into constants; keep either the factories or the exported classes, not both; trim the barrel to what the app imports. Fixing #474 edits the same Sentry file, so the two can land together.
- **If we skip it:** Configurability around a logging path with one fixed setup.
- **Effort:** M · **Touches:** `libs/core/src/lib/logging/**`, `app.config.ts` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## LEAN-2 · suggestion · Exports and members nothing calls

- **Where:** `libs/shared/src/lib/helpers/approval-status.ts` (whole file, plus its barrel line); `libs/ui/src/lib/constants/breakpoints.ts:6` (`BREAKPOINT_DESKTOP`); `libs/core/src/lib/testing/index.ts:2`, `libs/core/src/testing.ts:2` (`createMockLogger` export); `libs/core/src/lib/testing/draft-storage.mock.ts:20` (`userId` parameter); `libs/core/src/lib/services/storage.service.ts:141-158` (`has`, `clear`); `apps/client/src/app/layout/services/theme.service.ts:36-38` (`setTheme`); `apps/client/src/app/features/history/services/pictures-history.service.ts:101,103` (`isPendingLoading`, `isRecentLoading`)
- **What this is:** Public members with no production consumer; knip counts library entry points and reachable class members as used.
- **Problem:** Each is referenced only by its own spec or by nothing.
- **Fix direction:** Delete them with their spec cases; the `theme-toggle` spec uses `setTheme` for setup and needs rewriting through `toggleTheme`.
- **If we skip it:** About 60 lines of public surface nobody uses.
- **Effort:** S · **Touches:** the files listed · **Depends on:** ARCH-5 (rewrites `theme.service.ts`) · **Status:** new · **Verified:** confirmed

## LEAN-3 · suggestion · `ui-text-input`: seven inputs nobody sets and an unused appearance

- **Where:** `libs/ui/src/lib/components/text-input/text-input.component.ts:8,32,33,36-40`, `text-input.component.html` (`readonly`, `required`, `maxlength`, `minlength`, `disabled()` bindings on `input` and `textarea`, the `hint` and `mat-error` blocks)
- **What this is:** The shared text field wrapper around Material.
- **Problem:** None of the 7 usages sets `hint`, `errorMessage`, `disabled`, `readonly`, `required`, `maxLength` or `minLength`; disabling already goes through `setDisabledState`. `TextInputAppearance` allows `'fill'`, which nobody passes.
- **Fix direction:** Drop the inputs and their bindings; narrow the appearance type to `'outline' | 'underline'`.
- **If we skip it:** Each reader works through API nothing uses. (#202, clearable support, touches the same component.)
- **Effort:** S · **Touches:** text-input component (ts, html, spec) · **Depends on:** — · **Status:** new · **Verified:** confirmed

## LEAN-4 · suggestion · `ui-action-button`: the `size="mini"` half of the template never renders

- **Where:** `libs/ui/src/lib/components/action-button/action-button.component.ts:11,26`, `action-button.component.html:21-58`
- **What this is:** The right-sidebar FAB, written once for `mat-mini-fab` and once for `mat-fab`.
- **Problem:** Its only usages (4, in `layout/right-sidebar/right-sidebar.component.html`) leave `size` at its default, so the mini branch (about 38 lines) and the `MatMiniFabButton` import are dead.
- **Fix direction:** Remove `size`, `ActionButtonSize`, the mini branch and the import.
- **If we skip it:** Every change to the button is made twice.
- **Effort:** S · **Touches:** action-button component (ts, html, spec) · **Depends on:** — · **Status:** new · **Verified:** confirmed

## LEAN-5 · suggestion · Three app-internal barrels remain against the canon

- **Where:** `apps/client/src/app/services/articles/index.ts`, `apps/client/src/app/services/inwork/index.ts`, `apps/client/src/app/services/pictures/index.ts`; `AGENTS.md:142`, `docs/architecture.md:70-73`
- **What this is:** Folder re-exports inside `apps/client`.
- **Problem:** AGENTS.md says "Library entry points carry the only barrels"; `docs/architecture.md:73` admits these as removable "opportunistically". 29 files import through them (14 are specs, two are `page-title.strategy.ts` and its spec via `./articles`).
- **Fix direction:** Rewrite the imports to the concrete modules in one pass, delete the three files and the "opportunistically" bullet.
- **If we skip it:** The canon keeps a claim the code contradicts.
- **Effort:** S · **Touches:** the three barrels, 29 importers, `docs/architecture.md` · **Depends on:** ARCH-3 · **Status:** new · **Verified:** confirmed

## LEAN-6 · suggestion · ModalService: `openWithRef`, `ModalRef` and two size options have no caller

- **Where:** `libs/ui/src/lib/modal/services/modal.service.ts:34-49,71-72`, `libs/ui/src/lib/modal/models/modal.types.ts:11-12,24-26`, `libs/ui/src/lib/modal/index.ts:3`
- **What this is:** The lazy modal opener every feature uses.
- **Problem:** `openWithRef` is called only from its spec, and `ModalRef` exists only for it. No caller sets `minWidth` or `maxWidth`. (`height` is used — `article-edit.component.ts:411` — and stays.)
- **Fix direction:** Delete `openWithRef` and `ModalRef`, drop `minWidth`/`maxWidth` and their pass-through.
- **If we skip it:** A second open path and dead options stay in the public modal API.
- **Effort:** S · **Touches:** `modal.service.ts` (+spec), `modal.types.ts`, `modal/index.ts` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## LEAN-7 · suggestion · `uiResizeHandle`: the vertical orientation is speculative

- **Where:** `libs/ui/src/lib/components/resize-handle/resize-handle.directive.ts:4,35,54,100,141,146,153-157`, `libs/ui/src/lib/styles/_resize-handle.scss:29-36`
- **What this is:** The drag and keyboard pane resizer.
- **Problem:** Its only consumer (`topic-panes.component.html:35-40`) uses the default `horizontal`. The `ResizeOrientation` type, the input, the ternaries and the `[aria-orientation='horizontal']` SCSS block exist only for `vertical`.
- **Fix direction:** Hard-wire the horizontal behaviour (keeping the `aria-orientation="vertical"` host binding) and drop the input, the type and the dead SCSS block.
- **If we skip it:** Every edit keeps an unused mode working.
- **Effort:** S · **Touches:** the directive (+spec), `_resize-handle.scss` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## LEAN-8 · suggestion · Inputs and options with one value in practice

- **Where:** `libs/ui/src/lib/components/avatar/avatar.component.ts:4,16,22`, `avatar.component.scss:18-22`, `libs/ui/src/lib/styles/_tokens.scss:88,90` (`size="sm"`); `libs/ui/src/lib/components/icon/icon.component.ts:26` (`tooltipPosition`); `libs/ui/src/lib/components/virtual-scroller/virtual-scroller.component.ts:75` (`loadMoreThreshold`); `libs/ui/src/lib/components/toggle/toggle.component.ts:21` (`disabled`); `libs/ui/src/lib/components/inline-input/inline-input.component.ts:16` (`ariaLabel`); `apps/client/src/app/shared/components/review-block/review-block.component.ts:107` (`type`); `libs/core/src/lib/services/notification.service.ts:14` (`PersistentNotificationConfig.kind`); `.github/actions/deploy/action.yml:28-33,123-125` (`environment-url`, `source-path`)
- **What this is:** Knobs no caller turns.
- **Problem:** Each adds an input, a type or a branch that always resolves the same way.
- **Fix direction:** Inline the single value used and drop the knob; the avatar change also removes two tokens and a host-class rule.
- **If we skip it:** Each makes a reader think the component is used in more ways than it is.
- **Effort:** S · **Touches:** the files listed · **Depends on:** — · **Status:** new · **Verified:** confirmed

## LEAN-9 · suggestion · `CUSTOM_ERROR_MESSAGE` is a context token nobody sets

- **Where:** `libs/core/src/lib/http/http-context-tokens.ts:12-16,25-29`, `libs/core/src/lib/http/error-notification.interceptor.ts:33-37,73-75`, `libs/core/src/lib/http/index.ts:4`, `docs/patterns.md:67`
- **What this is:** A per-request override for the error toast text.
- **Problem:** No production code sets it; the interceptor branch always falls through, and `docs/patterns.md` presents it as a pattern in use.
- **Fix direction:** Delete the token, the branch, its spec block, both `@example`s and the doc line.
- **If we skip it:** An option that does nothing stays in the public HTTP API and the docs.
- **Effort:** S · **Touches:** `libs/core/src/lib/http/*`, `docs/patterns.md` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## LEAN-10 · suggestion · `deploy.sh` takes a parameter it could derive and checks things twice

- **Where:** `scripts/deploy.sh:4-6,76-104` (`<deploy_path>`), `:106-111` vs `:130-134` (empty-version check), `:233-246` vs `:434` (symlink target check); `.github/actions/deploy/action.yml:87,98`
- **What this is:** The server-side atomic deploy script.
- **Problem:** The only caller always passes `~/releases/<env>-current`, which equals `$CURRENT_LINK` computed from the environment. The 4- and 5-argument branches repeat the parsing; two checks run twice.
- **Fix direction:** Derive the path from the environment, fold the argument branches into one, drop the repeated checks; update the usage header, `docs/pm2-setup.md` and `SCRIPTS-GUIDE.md`. Keeping `--dry-run` is the owner's call.
- **If we skip it:** Callers keep two arguments in step that the script could work out.
- **Effort:** S · **Touches:** `scripts/deploy.sh`, `.github/actions/deploy/action.yml`, `SCRIPTS-GUIDE.md`, `docs/pm2-setup.md`, `README.md:170` · **Depends on:** — · **Status:** new · **Verified:** confirmed
