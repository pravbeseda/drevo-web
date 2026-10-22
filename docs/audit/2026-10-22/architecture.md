# Architecture — audit 2026-10-22

## ARCH-1 · blocking · The error toast sits inside the auth interceptor, so a CSRF retry that succeeds still shows «Доступ запрещен.»

- **Where:** `apps/client/src/app/app.config.ts:34-35`, `apps/client/src/app/interceptors/auth.interceptor.ts:109-147`, `libs/core/src/lib/http/error-notification.interceptor.ts:44-78`, `libs/core/src/lib/http/http-error-mapper.service.ts:59-61`, `apps/client/src/app/services/auth/auth.service.ts:73-87`, `apps/client/src/app/services/auth/csrf.service.ts:44-47`
- **What this is:** `AuthInterceptor` retries a write once with a fresh token when the backend answers 403 `CSRF_VALIDATION_FAILED`. `ErrorNotificationInterceptor` shows a toast for every failed API response not marked to skip.
- **Problem:** DI interceptors chain with `reduceRight`, so the first-provided (auth) is outermost and the error notifier, provided second, sees the raw 403 before the retry. The backend regenerates the CSRF token on login (`AuthApiController.php:197`), and the cross-tab `storage` handler only re-runs `checkAuth()`, so another tab keeps the cached old token. Log in again in one tab, then act in the other: the first write gets 403, the reader sees «Доступ запрещен.», and the retry succeeds anyway. Writes that show the toast today: the wiki-links check (`links-api.service.ts:32`), `moderateVersion` (`article-api.service.ts:285`), `setReview`/`deleteReview` (`review-api.service.ts:93,112`), picture writes without a 403 skip, and login. Each interceptor's spec tests it alone, so nothing catches the interaction.
- **Fix direction:** Make the order explicit with the error notifier outermost, so it sees only the final outcome; add a spec that runs both interceptors together. Refreshing the token in the cross-tab handler is optional on top.
- **If we skip it:** Readers keep seeing a "forbidden" error on actions that succeeded.
- **Effort:** S · **Touches:** `app.config.ts`, a combined interceptor spec · **Depends on:** — · **Status:** new · **Verified:** confirmed

## ARCH-2 · blocking · Angular Material lives in libs/core, and its toast styling is split into the app stylesheet

- **Where:** `libs/core/src/lib/services/notification.service.ts:2,19,35-41,57-63`, `apps/client/src/styles.scss:196-229`; rule at `docs/styles.md:54` and AGENTS.md Angular rule 8
- **What this is:** `NotificationService` (used app-wide and by core's own error interceptor and log export) wraps `MatSnackBar` and picks the `panelClass` names `toast-{kind}` / `toast-persistent`.
- **Problem:** "Angular Material stays inside `libs/ui`" — this is the only Material import outside libs/ui in TypeScript. The class names are chosen in core and styled in the app's global SCSS; `toast-persistent` has no style at all. Changing the toast look or kinds means editing a non-UI library and the app stylesheet together. libs/ui already depends on libs/core, so the wrapper cannot simply move; the seam has to be inverted. (AGENTS.md's directory map also lists "notifications" under core, which points the other way — fix that line with it.)
- **Fix direction:** Keep a notification interface/token in core; put the snackbar implementation and its styles in a `@drevo-web/ui` entry point, provided by the app.
- **If we skip it:** The one sanctioned Material boundary stays broken in the most-used service.
- **Effort:** M · **Touches:** `notification.service.ts`, a new `libs/ui/src/lib/notification/*`, `tsconfig.base.json`, `app.config.ts`, `styles.scss`, `AGENTS.md` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## ARCH-3 · blocking · Page-scoped ArticleHistoryService lives among the global root services

- **Where:** `apps/client/src/app/services/articles/article-history/article-history.service.ts:68`; provided at `features/article/components/article-versions/article-versions.component.ts:19` and `features/history/pages/articles-history/articles-history.component.ts:21`; rule at `docs/architecture.md:66`
- **What this is:** A bare `@Injectable()` holding list paging, filter, the hide-cancelled preference, review badges and display rows, plus exported UI helpers (`buildDisplayItems`, `trackByFn`, `HistoryDisplayItem`).
- **Problem:** `app/services/` is documented as the home of `providedIn: 'root'` services. The other two-feature page-scoped services (`DraftEditorService`, `TopicListPagesService`, `ForumTopicPageDataService`) sit in `app/shared/services/`. This one sits next to `ArticleService` and carries list-rendering helpers. Note: AGENTS.md:117 says shared services are extracted "to `app/services/`", which contradicts `docs/architecture.md`; settle the wording in the same change.
- **Fix direction:** Move it, with its display helpers, to `app/shared/services/article-history/`.
- **If we skip it:** The global-services layer keeps mixing root domain services with per-page view state.
- **Effort:** S · **Touches:** `article-history.service.ts` (+spec), its three importers, `AGENTS.md` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## ARCH-4 · blocking · Single-consumer code kept in app/shared

- **Where:** `apps/client/src/app/shared/components/cm-diff-view/` (only `features/history`), `apps/client/src/app/shared/components/topics-sidebar-action/` (only `features/article`), `apps/client/src/app/shared/helpers/picture-tooltip.ts` (only `features/article/pages/article-edit`), `apps/client/src/app/shared/services/draft-editor/` (only `features/article`); rule at `docs/architecture.md:42`
- **What this is:** Components, a helper and a page-scoped service under `app/shared/`.
- **Problem:** The rule says code "moves back into a feature when it is down to one consumer again". Grepped by class, selector and export across templates, routes and styles: each has exactly one feature consumer.
- **Fix direction:** Move each into its feature's `components/`, `helpers/` or `services/`; only import paths change.
- **If we skip it:** `shared/` stops meaning "used by two features", and readers cannot tell what is safe to change locally.
- **Effort:** S · **Touches:** the four folders, their importers, `styles/_diff-view-overrides.scss` references · **Depends on:** — · **Status:** new · **Verified:** confirmed

## ARCH-5 · blocking · ThemeService exposes a writable global signal and reads browser globals directly

- **Where:** `apps/client/src/app/layout/services/theme.service.ts:15` (signal), `:45,75,83` (`localStorage`), `:54,79` (`window.matchMedia`), `:61` (`document`); pattern to follow: `apps/client/src/app/layout/services/font-scale.service.ts:18-19`; helpers: `libs/core/src/lib/services/storage.service.ts:69-74,107-123`
- **What this is:** The root service that holds and persists the light/dark theme.
- **Problem:** `readonly theme = signal<Theme>(…)` is public and writable (Angular rule 2: "Public writable signals are forbidden"). It reads `localStorage`, `window.matchMedia` and `document` as globals (rule 10) where injection fits, as its sibling `FontScaleService` shows. The `isBrowser` guards keep SSR working, but the `setItem` inside the effect has no error handling, which `StorageService.setString` already provides.
- **Fix direction:** Private `_theme` with `asReadonly()`; inject `StorageService`, `WINDOW` and `DOCUMENT` as `FontScaleService` does.
- **If we skip it:** Global theme state stays mutable from anywhere, and the service cannot be faked through DI.
- **Effort:** S · **Touches:** `theme.service.ts` (+spec, `theme-toggle.component.spec.ts`) · **Depends on:** — · **Status:** new (#331 is a different theme bug) · **Verified:** confirmed

## ARCH-6 · blocking · Public writable signals in six components

- **Where:** `apps/client/src/app/features/search/search.component.ts:29-34`, `features/auth/login.component.ts:41-42`, `features/article/pages/version-redirect/version-redirect.component.ts:24`, `layout/layout.component.ts:68-69`, `layout/right-sidebar/right-sidebar.component.ts:17`, `shared/components/filters/filters-side-panel/filters-side-panel.component.ts:23`
- **What this is:** Component state declared `readonly x = signal(…)` without a private writable counterpart.
- **Problem:** AGENTS.md Angular rule 2 forbids public writable signals. A tree-wide search finds exactly these 13 (plus `ThemeService.theme`, ARCH-5); the rest of the code follows `_x` / `asReadonly()`.
- **Fix direction:** Make each private, or `protected` where only the template reads it; expose `asReadonly()` where a test or parent needs it.
- **If we skip it:** The documented state rule stays unenforced in six components.
- **Effort:** S · **Touches:** the six components (+specs) · **Depends on:** — · **Status:** new · **Verified:** confirmed

## ARCH-7 · blocking · AppComponent breaks the OnPush rule and carries a dead field

- **Where:** `apps/client/src/app/app.component.ts:10-17`
- **What this is:** The root component.
- **Problem:** It is the only component in `apps/` and `libs/` without `ChangeDetectionStrategy.OnPush` (Angular rule 3). Its `title = 'Древо'` is read nowhere.
- **Fix direction:** Add OnPush and delete `title`.
- **If we skip it:** The one exception to the rule sits at the root, where it is copied first.
- **Effort:** S · **Touches:** `app.component.ts` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## ARCH-8 · suggestion · Public members only their own specs call

- **Where:** `libs/core/src/lib/logging/log-dispatcher.service.ts:59-83` (`registerProvider`, `unregisterProvider`, `getProviders`); `libs/core/src/lib/draft-storage/draft-storage.service.ts:74-99` (`getCount`, `deleteAll`) with `draft-database.ts` `countDrafts`/`deleteAllDrafts` and `libs/core/src/lib/testing/draft-storage.mock.ts:8,10`; `libs/core/src/lib/services/sidebar.service.ts:51` (`clear`); `apps/client/src/app/services/app-update/app-update.service.ts:24-25,48` (`newVersionAvailable`)
- **What this is:** Public API on core and app services.
- **Problem:** Whole-tree grep (apps, libs, testing, scripts, templates): no non-spec caller. Knip misses class members behind library entry points.
- **Fix direction:** Delete them with their spec blocks and mock entries.
- **If we skip it:** Dead surface the next reader has to assume is load-bearing.
- **Effort:** S · **Touches:** the files listed and their specs · **Depends on:** SEC-1 (same draft-storage file) · **Status:** new · **Verified:** confirmed

## ARCH-9 · suggestion · Auth state is held twice

- **Where:** `apps/client/src/app/services/auth/auth.service.ts:31-33,40,43-49,76` and the paired `isAuthenticatedSubject.next(...)` at `:115,123,143,183,227,237,269`; `docs/auth-api.md:365`
- **What this is:** `isAuthenticatedSubject` is written in lockstep with `userSubject`; `authState$` and `isAuthenticated$` sit on top.
- **Problem:** `isAuthenticated` is always `!!user`, which `authState$` already computes. Nothing outside the spec, the doc snippet and a stale mock key (`article-history.service.spec.ts:141`) reads `isAuthenticated$` or `authState$`. One source of truth removes a subject, two observables and seven paired writes.
- **Fix direction:** Derive authentication from the user (`!!userSubject.value`, also at `:76`); delete the unused streams; update the doc snippet.
- **If we skip it:** Seven extra writes that must never fall out of step.
- **Effort:** S · **Touches:** `auth.service.ts` (+specs), `docs/auth-api.md` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## ARCH-10 · suggestion · HttpErrorMapperService is an override seam nobody overrides

- **Where:** `libs/core/src/lib/http/http-error-mapper.service.ts:7-18` (interface), `:45-47,97-101,126-129` ("override this" methods); only caller `libs/core/src/lib/http/error-notification.interceptor.ts:75`
- **What this is:** An injectable returning `MappedHttpError { message, status, isNetworkError, isServerError, isClientError }`.
- **Problem:** No subclass or provider override exists anywhere; the only caller reads `.message`. The flags, `status` and the exported type exist for the spec only.
- **Fix direction:** Collapse to a plain function returning the message; drop the injectable and type exports.
- **If we skip it:** A speculative extension point and four unused fields stay in core's public API.
- **Effort:** S · **Touches:** `http-error-mapper.service.ts` (+spec), `error-notification.interceptor.ts` (+spec), `libs/core/src/lib/http/index.ts` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## ARCH-11 · suggestion · Login and logout attach the CSRF header the interceptor already attaches

- **Where:** `apps/client/src/app/services/auth/auth.service.ts:165-176,212-224`; `apps/client/src/app/interceptors/auth.interceptor.ts:66-69,80-91`
- **What this is:** `login()` and `logout()` fetch the token and set `X-CSRF-Token`; the interceptor's auth-endpoint branch (`addCsrfAndSend`) does the same for these URLs and overwrites the header with the same cached value.
- **Problem:** Two places own how the auth calls get their token. The service's `switchMap` and header blocks only reproduce the interceptor; error behaviour is unchanged without them.
- **Fix direction:** Post directly and let the interceptor add the header; move the header assertions (`auth.service.spec.ts:238,422`) to the interceptor spec.
- **If we skip it:** Two copies of the CSRF attach logic.
- **Effort:** S · **Touches:** `auth.service.ts` (+spec), `auth.interceptor.spec.ts` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## ARCH-12 · suggestion · Two definitions of "this is an API request"

- **Where:** `apps/client/src/app/interceptors/auth.interceptor.ts:159-187`, `libs/core/src/lib/http/error-notification.interceptor.ts:80-86`
- **What this is:** Both interceptors decide whether a URL is a backend call before acting.
- **Problem:** Auth accepts a relative `/api/` path or anything starting with `environment.apiUrl` (the bare origin in prod); the notifier accepts any origin whose pathname starts with `/api/`. Every request today is `${apiUrl}/api/...`, which both accept, so nothing misbehaves yet; there are simply two rules and two copies of the URL parsing.
- **Fix direction:** One exported predicate in `libs/core/src/lib/http`, used by both.
- **If we skip it:** The next change to the API base has to be made in two places that already disagree on edge URLs.
- **Effort:** S · **Touches:** both interceptors, `libs/core/src/lib/http/index.ts` · **Depends on:** ARCH-1 · **Status:** new · **Verified:** confirmed (downgraded from blocking by the verifier)

## ARCH-13 · suggestion · LinksService is scoped per route although it is stateless

- **Where:** `apps/client/src/app/services/links/links.service.ts:9-28`, `features/article/article.routes.ts:90,149`, `features/editor/shared-editor.component.ts:17`
- **What this is:** A stateless chunker over `LinksApiService`, kept in `app/services/` and provided three times.
- **Problem:** It holds no state, so the scoping buys nothing; `providedIn: 'root'` removes three provider entries and matches `docs/architecture.md:66`.
- **Fix direction:** Make it root-provided and drop the three `providers` entries.
- **If we skip it:** Three provider lines guarding nothing.
- **Effort:** S · **Touches:** `links.service.ts`, `article.routes.ts`, `shared-editor.component.ts`, specs that provide it · **Depends on:** — · **Status:** new · **Verified:** confirmed

## ARCH-14 · suggestion · Root font size is declared twice; the runtime copy always wins

- **Where:** `apps/client/src/app/layout/services/font-scale.service.ts:10,29-37,63-65`, `libs/ui/src/lib/styles/_tokens.scss:1`, `apps/client/src/styles.scss:53`
- **What this is:** `$root-font-size: 14px` sets the `html` font size and is the `rem()` base; `FontScaleService` keeps its own `BASE_FONT_SIZE = 14`.
- **Problem:** The service's effect writes an inline `font-size: ${14 * scale}px` on start even at the default scale. Both values are 14 today; change the token and SSR/first paint use the new size, then the layout snaps back to 14px.
- **Fix direction:** Derive the scale from the stylesheet value (a percentage or `calc`), or clear the inline style at the default scale; drop the constant.
- **If we skip it:** The size token is a trap — editing it alone silently does nothing after boot.
- **Effort:** S · **Touches:** `font-scale.service.ts`, possibly `styles.scss` · **Depends on:** — · **Status:** new · **Verified:** confirmed (downgraded from blocking by the verifier)
