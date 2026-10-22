# Duplication — audit 2026-10-22

All findings here are suggestions: applying each removes code. Nine more sit below the cap of ten (see the README).

## DUP-1 · suggestion · The `ApiResponse` envelope unwrap is pasted into 36 methods

- **Where:** `apps/client/src/app/services/articles/article-api.service.ts:55-58` (and 13 more there), `services/pictures/picture-api.service.ts` (9), `services/forum/forum-api.service.ts:54-57` (6), `services/reviews/review-api.service.ts` (4), `services/calendar/calendar-api.service.ts`, `services/counts/counts-api.service.ts`, `services/links/links-api.service.ts` (1 each); doc example `docs/patterns.md:36-39`
- **What this is:** Each API method ends with `map(response => { assertIsDefined(response.data, 'Response data is undefined'); return response.data; })`.
- **Problem:** The same five-line operator appears 36 times with the same message.
- **Fix direction:** One `unwrapApiData<T>()` operator in `libs/shared` beside `ApiResponse` (`libs/shared/src/lib/models/dto/article-search.dto.ts:10`), used everywhere; update the doc example. `links-api.service.ts:41` does more after the assert and keeps its own `map`.
- **If we skip it:** About 150 lines of repetition; changing the envelope contract means 36 edits.
- **Effort:** S · **Touches:** the seven `*-api.service.ts`, a `libs/shared` helper, `docs/patterns.md` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## DUP-2 · suggestion · `withCredentials: true` is repeated on 47 requests the auth interceptor already credentials

- **Where:** `apps/client/src/app/interceptors/auth.interceptor.ts:53,57,136,153-157`; per-request copies in `services/articles/article-api.service.ts` (14), `services/pictures/picture-api.service.ts` (12), `services/forum/forum-api.service.ts` (6), `services/inwork/inwork-api.service.ts` (4), `services/reviews/review-api.service.ts` (4), `services/auth/auth.service.ts:109,168,218`, `services/auth/csrf.service.ts:66`, `services/calendar`, `services/counts`, `services/links` (1 each); `docs/patterns.md:34,59`
- **What this is:** `AuthInterceptor.addCredentials` sets `withCredentials: true` on every request whose URL starts with `/api/` or `environment.apiUrl`; every service also sets it itself.
- **Problem:** Every service URL is `${apiUrl}/api/...`, which the interceptor always matches, so each per-request flag and the re-set on the CSRF retry (`:136`) does nothing. About 53 spec assertions check the per-request flag.
- **Fix direction:** Keep the interceptor as the single owner; remove the per-request flags and the retry re-set; move the assertions to the interceptor spec; say in `docs/patterns.md` that the interceptor adds credentials.
- **If we skip it:** About 50 lines of noise, and a new service without the flag looks wrong when it is not.
- **Effort:** S · **Touches:** ten service/auth files and their specs, `auth.interceptor.ts`, `docs/patterns.md` · **Depends on:** ARCH-12 · **Status:** new · **Verified:** confirmed

## DUP-3 · suggestion · `ui-button` writes one element six times where `matButton` takes the variant

- **Where:** `libs/ui/src/lib/components/button/button.component.html:10-95` (`@case` branches at `:12,26,40,57,69,81`); `libs/ui/src/lib/components/action-button/action-button.component.html:22-95`
- **What this is:** `ButtonComponent` switches on `variant` to pick `mat-flat-button`, `mat-stroked-button` or `mat-button`, written out for `<a>` and for `<button>`.
- **Problem:** `ButtonVariant` is `'filled' | 'outlined' | 'text'` — exactly the appearances of Material 22's `matButton` input (22.2.2, `APPEARANCE_CLASSES`). Six branches collapse to two with `[matButton]="variant()"`; no style, spec or Playwright selector targets the old attributes. In `action-button`, the class bindings copied into four branches become one computed class.
- **Fix direction:** Bind `matButton` to the variant and drop the `@switch`; compute the action-button class list once.
- **If we skip it:** About 60 template lines where every new attribute is added six (or four) times.
- **Effort:** S · **Touches:** `button.component.html`, `action-button.component.html/.ts` · **Depends on:** LEAN-4 · **Status:** new · **Verified:** confirmed

## DUP-4 · suggestion · The paginated response shape is declared 14 times and mapped by hand 7 times

- **Where:** `libs/shared/src/lib/models/article-history.ts:25-30`, `article-linked-here.ts:7-12`, `article-search.ts`, `forum.ts:35-40,71-76`, `picture.ts:23-28,57-62`, and the 7 DTO twins in `libs/shared/src/lib/models/dto/*.dto.ts`; mappers at `apps/client/src/app/services/articles/article.service.ts:217-232,258-280`, `services/forum/forum.service.ts:162-170,186-197`, `services/pictures/picture.service.ts:93-102,143-151`
- **What this is:** Every list endpoint declares `{ items, total, page, pageSize, totalPages }` twice (DTO and model), and every domain service copies the counters across.
- **Problem:** 14 interfaces and 7 mapping blocks repeat one shape; `mapLinkedHereResponse` also inlines the item mapping `mapSearchResult` already does.
- **Fix direction:** One generic `Page<T>` in `libs/shared` and one `mapPage(dto, mapItem)` helper; the named interfaces become aliases or go.
- **If we skip it:** Every new list endpoint adds another pair of interfaces and another copied mapper.
- **Effort:** M · **Touches:** `libs/shared/src/lib/models/**`, `article.service.ts`, `forum.service.ts`, `picture.service.ts` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## DUP-5 · suggestion · Date-header grouping and paging bookkeeping copied between the two history services

- **Where:** `apps/client/src/app/features/history/services/pictures-history.service.ts:16-43,136-146,216-251`; `apps/client/src/app/services/articles/article-history/article-history.service.ts:34-60,126-135,256-298`; `features/history/pages/pictures-history/pictures-history.component.scss:36-42` and `shared/components/article-history-list/article-history-list.component.scss:31-37`
- **What this is:** Both services interleave `formatDateHeader` rows into a flat list, estimate the virtual-scroll total, and run the same loading / loading-more / roll-back-on-error logic; both templates style `.history-date-header` identically.
- **Problem:** About 20 lines of grouping, 30 of paging state and a byte-identical CSS block exist twice, differing only in item type and keys (the total estimators share only their tail).
- **Fix direction:** A generic `withDateHeaders(items, getDate, toRow, referenceDate)` helper in `app/shared/helpers` and one home for the header style; paging can follow `TopicListPagesService`.
- **If we skip it:** A fix to grouping or paging has to be made twice.
- **Effort:** M · **Touches:** both history services, their SCSS, a shared helper · **Depends on:** ARCH-3, COR-2 · **Status:** new · **Verified:** confirmed

## DUP-6 · suggestion · Beta and release workflows paste the same build and Sentry steps

- **Where:** `.github/workflows/cd-main-beta.yml:98-163`, `.github/workflows/cd-main-release.yml:191-251`
- **What this is:** Both deploy jobs inject the Sentry DSN, print the masked file, build, run `lint:ssr-hosts` and upload source maps with the same skip/fail logic.
- **Problem:** About 60 lines identical apart from the version source, an echo, three comments and one step name. `.github/actions/deploy` already shows the composite-action pattern; `check-release-workflow.js` does not inspect these steps.
- **Fix direction:** Move "inject DSN, build, upload source maps" into a composite action taking the version as input.
- **If we skip it:** A change to DSN handling or the Sentry upload has to be made in two workflows.
- **Effort:** S · **Touches:** both workflows, a new `.github/actions/*` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## DUP-7 · suggestion · `ui-checkbox` and `ui-toggle` are the same ControlValueAccessor twice

- **Where:** `libs/ui/src/lib/components/checkbox/checkbox.component.ts:19-60`, `libs/ui/src/lib/components/toggle/toggle.component.ts:19-60`
- **What this is:** Two boolean form controls wrapping `mat-checkbox` and `mat-slide-toggle`.
- **Problem:** A diff shows only the selector, imports, template paths, class name and handler name differ.
- **Fix direction:** One shared boolean-CVA base or helper in `libs/ui`; keep the templates apart.
- **If we skip it:** About 40 duplicated lines, and a CVA fix applied to only one.
- **Effort:** S · **Touches:** the checkbox and toggle components · **Depends on:** — · **Status:** new · **Verified:** confirmed

## DUP-8 · suggestion · PM2 ecosystem entries are three near-identical blocks

- **Where:** `scripts/ecosystem.config.js:3-33,34-64,65-95`
- **What this is:** The PM2 app definitions for production, beta and release.
- **Problem:** Beta and release differ only in name, cwd, port and log paths; production also in restart and memory settings. No script parses the file as text.
- **Fix direction:** A small `app(env, port, overrides)` factory in the same file.
- **If we skip it:** About 40 duplicated lines, and a restart setting changed in one app and forgotten in another.
- **Effort:** S · **Touches:** `scripts/ecosystem.config.js` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## DUP-9 · suggestion · Article routes: twin re-run predicates, copied child routes and twin resolvers

- **Where:** `apps/client/src/app/features/article/article.routes.ts:28-34` vs `:50-56`; children `:93-101` vs `:152-160` (`news`), `:111-118` vs `:180-187` (`linkedhere`); `features/article/resolvers/article.resolver.ts:13-23` vs `article-version.resolver.ts:13-23`
- **What this is:** Two re-run predicates differing only in the param name, the same `news`/`linkedhere` children declared on two routes, and two resolvers differing only in param and loader.
- **Problem:** Three pairs of copies that must change together.
- **Fix direction:** One predicate factory taking the param, shared child-route constants, one resolver helper taking the param and the loader.
- **If we skip it:** About 30 duplicated lines in the routing layer.
- **Effort:** S · **Touches:** `article.routes.ts`, both resolvers · **Depends on:** COR-3 · **Status:** new · **Verified:** confirmed

## DUP-10 · suggestion · Picture title validators and messages are duplicated, with the limits hard-coded in the text

- **Where:** `apps/client/src/app/features/picture/components/replace-file-dialog/replace-file-dialog.component.ts:29-36`, `.html:37-41`; `apps/client/src/app/features/picture/pages/picture-detail/picture-detail.component.ts:94-101,183-190,263-270`, `.html:88-92`
- **What this is:** Both forms build the same title `FormControl` from `TITLE_MIN_LENGTH`/`TITLE_MAX_LENGTH` and show «Минимум 5 символов» / «Максимум 500 символов».
- **Problem:** The validators and error blocks are copies, and the messages spell out 5 and 500 instead of reading the constants. Inside picture-detail the textarea auto-size code also appears twice.
- **Fix direction:** One factory for the control and one message source built from the constants; have the effect call `autoResizeTextarea()`.
- **If we skip it:** Four places to edit for one rule, and messages that go wrong at the next limit change.
- **Effort:** S · **Touches:** `replace-file-dialog.component.*`, `picture-detail.component.*`, `features/picture/constants/picture.constants.ts` · **Depends on:** — · **Status:** new · **Verified:** confirmed
