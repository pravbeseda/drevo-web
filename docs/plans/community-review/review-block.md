# План: ревью-блок на страницах просмотра версии и сравнения версий (diff)

## Context

В legacy (Yii1) есть «народное ревью» (премодерация) неподтверждённых редакций:
сервис `ReviewService`, REST API `ReviewsApiController` (`list`/`set`/`delete`/`summary`),
вёрстка-эталон `protected/views/_blocks/review_block.php` — список отзывов + форма
голосования (4 статуса, комментарий, save/clear) + удаление.

На фронте уже сделано (PR #222, мерж): доменные модели (`Review`, `ReviewStatus`,
`ReviewSummary`), DTO, сервисы `ReviewApiService`/`ReviewService` (полное покрытие API:
`getReviews`/`setReview`/`deleteReview`/`getSummary`) и бейдж в истории
(`app-review-badge`). **Чего нет:** UI самого ревью-блока (список + голосование +
удаление) и его вывода на страницах **просмотра версии** и **сравнения версий (diff)**.

Цель — портировать `review_block.php` как переиспользуемый Angular-компонент и вывести
его на обе страницы. Объём — **полный интерактив** (показ списка + публикация голоса +
удаление).

### Ключевое архитектурное решение: права считаем на фронте

Текущий `GET /api/reviews/list/<type>/<versionId>` отдаёт **чистый массив отзывов** без
контекста прав. Вместо того чтобы навешивать per-version права на бэк, **вся логика
видимости/прав composed на фронте** (Angular way), а бэк остаётся авторитетным
валидатором на `set`/`delete`.

Вычислимо на фронте из имеющихся данных:
- `isOwnVersion` = `version.author === user.name` (бэк использует тот же `usr_name`).
- `myReview` / мой голос = поиск в `reviews` по `reviewer === user.name`.
- `isModerator` = `user.permissions.canModerate` (уже есть).
- `canDelete(review)` = `isModerator || (review.reviewer === user.name && versionPending)`.
- `canReview` = `user.isReviewer && version.approved === Pending`.

Не вычислимо на фронте — только **право рецензировать** (`isEligibleReviewer`: роль
`user` + не в бане `usr_review_ban` + `usr_alla+usr_alln ≥ 50` + фиче-флаг). Дублировать
порог/бан на клиенте нельзя. Поэтому **единственное изменение бэка** — отдать один
булев флаг `isReviewer` в `/api/auth/me` (server-computed, рядом с `permissions`).
Эндпоинт `list` **не трогаем** — он остаётся чистым массивом.

## Принятые решения

- **Бэк-минимум** — добавить `isReviewer` в `formatUserData()` (`AuthApiController`).
  `list` без изменений. `set`/`delete` уже валидируют права (`REVIEW_NOT_ALLOWED`,
  `OWN_VERSION_APPROVE`, `INVALID_REVIEW`) — оставляем как enforcement.
- **Один переиспользуемый компонент** `app-review-block` в `app/shared/components/`
  (используется двумя фичами: `features/article` и `features/history`). Сам грузит
  отзывы через `ReviewService`, сам управляет состоянием, голосованием и удалением.
- **Видимость (как legacy)** — блок рендерится, если `reviews.length > 0` **или**
  `canReview`. Список read-only виден на любой версии где есть отзывы (вкл. approved);
  форма — только на pending при `canReview`. На approved без отзывов блока нет.
- **Diff (как legacy)** — один блок, привязан к новой/правой редакции
  (`pairs.current`).
- **Лейблы статусов и цвета — на фронте** через существующие `--themed-*` токены
  (success/warning/error). Иконки ревью — СВОИ (см. Q3), `ui-icon`.
- **Доставка** — 2 PR: PR1 (бэк-флаг + фабрика моков + компонент + страница просмотра
  версии), PR2 (тот же компонент на diff). Функционально полностью в PR1.

### Решения по ревью плана (Q1–Q5)

- **Q1 — graceful-ошибки `getReviews`.** В `ReviewApiService.getReviews` добавить
  `context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true)` (симметрично
  `getSummary`); в компоненте при подписке — `catchError(() => of([]))`. Токен на
  HTTP-слое — единственный способ подавить тост интерцептора при фиче-off (404).
  `ReviewService` (domain) НЕ трогаем — его делит бейдж истории.
- **Q2 — `isReviewer` в `User`: required + тест-фабрика.** Поле **required** (инвариант
  «User всегда полный»). Общей фабрики моков нет → вводим
  `@drevo-web/shared/testing` с `createMockUser(overrides?: Partial<User>): User`
  (дефолт `isReviewer: false`). Мигрируем ручные `const mockUser: User = {...}` на неё.
- **Q3 — иконки/цвета 4 статусов ревью.** Карты `REVIEW_STATUS_ICONS`,
  `REVIEW_STATUS_CLASS`, `REVIEW_STATUS_LABELS` в `review.ts` (по образцу `APPROVAL_*`).
  Иконки подбираем СВОИ под смысл голосов — НЕ переиспользуем `APPROVAL_ICONS` (шкалы
  разные: ReviewStatus 0–3 vs ApprovalStatus -1/0/1). `ui-status-icon` не трогаем.
- **Q4 — вызов `isEligibleReviewer` из `formatUserData`: fail-safe guard.** Метод считает
  по текущей сессии, а не по аргументу → guard «флаг только про себя» предотвращает
  тихую неверность при форматировании чужого профиля.
- **Q5 — удаление: всегда слать `reviewer`.** Единая ветка
  `deleteReview({type, versionId, reviewer: review.reviewer})` для self и moder —
  `canDeleteReview` бэка пускает self при `actor === targetReviewer && pending`.

## Recommended Approach

### Бэкенд (legacy Yii) — единственное изменение
`protected/controllers/api/AuthApiController.php`, метод `formatUserData()` — добавить
поле `isReviewer` с fail-safe guard (Q4):

```php
$isSelf = $user->usr_name === Yii::app()->user->name;
$isReviewer = $isSelf
    ? Yii::app()->reviewService->isEligibleReviewer($user->usr_name)
    : false;
// ... 'isReviewer' => $isReviewer,
```

`isEligibleReviewer()` уже инкапсулирует роль + бан + `MIN_EDITS` + фиче-флаг, но считает
по **текущей сессии** (`currentUserModel()`), игнорируя аргумент. Guard `$isSelf`
гарантирует корректность, если `formatUserData` когда-нибудь позовут для чужого юзера.

- тест: `AuthApiControllerTest` — `isReviewer` true/false по eligibility (флаг off, бан,
  edits<50, роль) для сессионного юзера; `false` для не-self (если есть такой путь).

### Фронт — модель пользователя
- `libs/shared/src/lib/models/user.ts`: добавить `readonly isReviewer: boolean` в `User`
  (**required**).
- `apps/client/src/app/services/auth/auth.service.ts`: маппинг уже берёт
  `response.data.user` целиком (типизирован `User`) — поле прокинется автоматически из
  `/me` и `/login`. Обновить спеку auth.service.

### Фронт — тест-фабрика `@drevo-web/shared/testing` (Q2)
Сейчас общей фабрики User нет (каждый спек строит `const mockUser: User = {...}`
руками; локальный `createMockUser` в `header.component.spec` не переиспользуем). Вводим
новый secondary entrypoint по образцу `@drevo-web/core/testing`:
- `libs/shared/src/testing.ts` (баррель), `libs/shared/src/lib/testing/user.mock.ts`:
  `createMockUser(overrides?: Partial<User>): User` с дефолтом `isReviewer: false`.
- alias в `tsconfig.base.json`: `@drevo-web/shared/testing` → `libs/shared/src/testing.ts`
  (+ jest path-mapping, как у `core/testing`). НЕ кладём в `core/testing` — это добавило
  бы запрещённую зависимость core→shared.
- мигрировать ручные User-моки: `auth.service.spec`, `inwork.service.spec`,
  `article-history.service.spec`, `account-dropdown.spec`, `picture-detail.spec`,
  `history.component.spec`, `topics-sidebar-action.spec`, `moderation-sidebar-action.spec`,
  `article-sidebar-actions.spec`, `pending-banner.spec`, `header.component.spec`
  (заменить локальный helper). В `testing/playwright/mocks/users.ts` и
  `client-e2e/api-test-helpers.ts` — дописать `isReviewer` напрямую (фабрика из
  `shared/testing` может быть недоступна их tsconfig — проверить).

### Фронт — карты статусов ревью (Q3)
`libs/shared/src/lib/models/review.ts` (по образцу `APPROVAL_CLASS`/`APPROVAL_ICONS`/
`APPROVAL_TITLES` в `article.ts`):
- `REVIEW_STATUS_CLASS: Record<ReviewStatus, 'success'|'warning'|'error'|'neutral'>`
- `REVIEW_STATUS_ICONS: Record<ReviewStatus, string>` — СВОИ иконки под смысл голоса
- `REVIEW_STATUS_LABELS: Record<ReviewStatus, string>`

Единый источник для пилюль формы, списка отзывов и шапки-tally.

### Фронт — компонент `app-review-block` (`app/shared/components/review-block/`)
Standalone, OnPush, отдельные `.html`/`.scss`. Inputs (декаплинг от конкретной модели
версии — и `ArticleVersion`, и `VersionForDiff` имеют эти поля):
- `versionId = input.required<number>()`
- `author = input.required<string>()`
- `approved = input.required<ApprovalStatus>()`
- `type = input<ReviewTarget>('article')`

Состояние и логика:
- инжектит `ReviewService`, `AuthService`, `LoggerService`.
- `reviews` грузятся реактивно по `versionId` (toSignal от стрима на switchMap, или
  effect → getReviews). Graceful (Q1): 404/403 → `catchError(() => of([]))` → пустой
  список, блок не показываем; тост подавлен `SKIP_ERROR_NOTIFICATION` на api-слое.
- `currentUser` = `toSignal(authService.user$)`; computed: `isModerator`, `isOwnVersion`,
  `versionPending` (`approved === ApprovalStatus.Pending`), `canReview`
  (`user.isReviewer && versionPending`), `myReview`, `comments` (reviews с непустым
  `comment`), `tally` (группировка по статусу для шапки «Отзывы»).
- `showBlock` = `comments/votes есть || canReview`.

Форма голосования (реактивная, реплика UX legacy):
- статусы-пилюли (radio) 4 шт.; «Одобряю» скрыт при `isOwnVersion`.
- textarea `comment`; обязателен для Suggest/Disagree (валидатор),
  опционален для Undecided/Approve.
- save задизейблен пока не dirty И не валидно; Clear очищает комментарий.
- submit → `reviewService.setReview({type, versionId, status, comment})` → обновить
  `reviews` из ответа; лог через `LoggerService`. Undecided+пустой коммент → бэк снимает
  голос (возвращает обновлённый список).
- удаление (Q5): кнопка у комментария при `canDelete(review)` → подтверждение через
  `ModalService` (существующий confirm-паттерн) → всегда
  `deleteReview({type, versionId, reviewer: review.reviewer})` (единая ветка для self и
  moder) → обновить `reviews`.
- линковка URL в тексте комментария — небольшой pipe/утилита в `shared` (реплика
  `renderComment`), экранирование безопасно через Angular-биндинг.

Стили: контейнер/комментарии/пилюли по образцу `review_block.php`, но цвета только через
`--themed-*` (success/warning/error), размеры — токены `_tokens.scss`. Хардкод-hex
legacy не переносим.

Тест `review-block.component.spec`: рендер списка, шапки-tally, скрытие блока без
отзывов и прав, показ/скрытие формы по `canReview`, скрытие «Одобряю» при own-version,
валидация обязательного комментария, вызов `setReview`/`deleteReview`, видимость кнопки
удаления по `canDelete`. Spectator + `mockLoggerProvider()` + `createMockUser()`.

### Внедрение — страница просмотра версии (PR1)
`features/article/pages/article-page/tabs/article-version-tab/article-version-tab.component`:
- в шаблоне под `<ui-banner>` (после контента/метаданных) добавить
  `@if (version(); as v) { <app-review-block [versionId]="v.versionId"
  [author]="v.author" [approved]="v.approved" /> }`.
- добавить `ReviewBlockComponent` в imports. Обновить спеку (рендер блока).

### Внедрение — diff (PR2)
`features/history/pages/diff-page/diff-page.component`:
- у блока `diff-page-meta` для `pairs.current` добавить
  `<app-review-block [versionId]="pairs.current.versionId"
  [author]="pairs.current.author" [approved]="pairs.current.approved" />`.
- добавить в imports. Обновить спеку.

### Критические файлы
- **Бэк:** `legacy-drevo-yii/protected/controllers/api/AuthApiController.php`
  (+ `protected/tests/.../AuthApiControllerTest.php`). Эталон UX/логики:
  `protected/views/_blocks/review_block.php`, `protected/services/ReviewService.php`.
- **Фронт (новое/изменяемое):**
  - `libs/shared/src/lib/models/user.ts` (+ `isReviewer`)
  - `libs/shared/src/lib/models/review.ts` (+ `REVIEW_STATUS_*` карты)
  - `libs/shared/src/testing.ts` (новый баррель) + `libs/shared/src/lib/testing/user.mock.ts`
    (новый) + alias в `tsconfig.base.json`
  - `apps/client/src/app/services/reviews/review-api.service.ts` (+ `SKIP_ERROR_NOTIFICATION`
    на `getReviews`)
  - `apps/client/src/app/services/auth/auth.service.ts` (+ spec)
  - `app/shared/components/review-block/*` (новый)
  - `features/article/pages/article-page/tabs/article-version-tab/article-version-tab.component.{ts,html}` (+ spec)
  - `features/history/pages/diff-page/diff-page.component.{ts,html}` (+ spec)
  - миграция User-моков на `createMockUser` (список в разделе фабрики)
- **Переиспользуем:** `ReviewService` (`app/services/reviews/`), `AuthService`,
  `ModalService`, `ui-button`/`ui-icon`, `FormatDatePipe`, `ApprovalStatus`,
  токены `--themed-*`.

## Verification

- **Фронт-юнит:** `yarn nx test client` (review-block, auth.service, version-tab, diff-page).
- **Shared-юнит:** `yarn nx test shared` (фабрика `createMockUser`, карты `REVIEW_STATUS_*`).
- **Легаси-юнит:** phpunit `AuthApiControllerTest` (`isReviewer` по eligibility + не-self).
- **Lint/format:** `yarn lint`, `yarn format:check`.
- **Ручная (`yarn serve`):**
  - открыть pending-версию статьи (роль с ≥50 правок): виден блок со списком и формой;
    проголосовать (approve/suggest/disagree), проверить обязательность комментария,
    save/clear, удаление своего отзыва, скрытие «Одобряю» на своей редакции.
  - открыть approved-версию: форма скрыта, список read-only (если отзывы есть), иначе
    блока нет.
  - открыть diff: блок привязан к новой/правой версии; то же поведение.
  - юзер без права рецензировать / фича off: формы нет, при отсутствии отзывов блока нет,
    тост ошибки НЕ появляется (Q1).
  - светлая/тёмная темы — цвета статусов через `--themed-*`.
- **(Опц.) Playwright:** `testing/playwright/` с замоканными `auth/me` (`isReviewer`) и
  `reviews/list` — блок и форма видны/скрыты по правам.
