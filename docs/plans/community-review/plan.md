# План: Народное ревью — поддержка API на фронте + бейдж в истории

## Context

В легаси (Yii1) реализована фича «народное ревью» неподтверждённых редакций статей:
сервис `ReviewService`, модели `ArticlesReviews`/`NewsReviews`, REST API
`ReviewsApiController` (`list`/`set`/`delete`, все per-version). Нужно поддержать
новое API на стороне Angular-фронта и вывести бейдж наличия ревью в истории статей,
справа от названия (внешний вид и логика — как у легаси `review_history_indicator.php`).

### Ключевые находки (исследование)

- Фронтовый список истории — `articles-history-item.component` (per-row). Название в
  `.title-row` (flex, gap), бейдж ставится после `<a class="title">`.
- Источник данных списка — `ArticleHistoryService` (`@Injectable()`, инстанс на потребителя,
  даётся через `providers`). Он владеет `_historyItems`, пагинацией (`onLoadMore` дописывает) и
  фильтрами (смена фильтра/`hideCancelled` обнуляет список). `ArticleHistoryListComponent` — тупой
  презентер: рендерит `service.displayItems()`, **входа `items` у него нет**.
- В теме уже есть семантические токены статусов: `--themed-status-approved/pending/rejected`,
  `text-success/warning/error`, `button-success/warning/danger` — мапим
  approve→зелёный / suggest→оранжевый / disagree→красный без хардкода легаси-hex.
- Значения статусов совпадают: `STATUS_UNDECIDED=0, APPROVE=1, SUGGEST=2, DISAGREE=3`.
- **Пробел в данных:** нет API, отдающего batch-сводку ревью для списка версий.
  `ReviewService::getTallies()` (батч) есть, но не выведен наружу. Reviews API —
  только per-version (`list`/`set`/`delete`); `/api/articles/history` ревью-полей не отдаёт.
- `review_history_indicator.php` в легаси-вьюхах **не используется** — это спецификация
  пилюли (цвета/логика) для SPA. Логика: `displayStatus` (своя версия → агрегат сообщества;
  чужая со своим голосом → личный голос; иначе агрегат), приоритет disagree>suggest>approve,
  `total` = сумма значимых голосов, `needsMyVote` → синяя пилюля «Нужен ваш голос».

## Принятые решения

- **Источник данных для бейджа** — новый batch-эндпоинт в легаси
  `GET /api/reviews/summary/<type>?versionIds=...`, тонкая обвязка над сервисом. Один запрос на
  страницу истории, агрегация на сервере, соответствует политике «только новые эндпоинты».
- **Объём поддержки API на фронте** — полное покрытие reviews API сервисами (`summary`+`list`+`set`+
  `delete`), чтобы зафиксировать контракт впрок под будущий UI голосования. `set`/`delete` пока без
  потребителя; их тесты проверяют сериализацию запроса/маппинг, не поведение UI.
- **Внешний вид бейджа** — отдельный компонент-пилюля, полный легаси-вид (статус по приоритету
  disagree>suggest>approve + счётчик голосов + синяя «Нужен ваш голос»), цвета через существующие
  `--themed-*` токены. Расположение `app/shared/components/review-badge/` — потребитель
  (`articles-history-item` → `article-history-list`) используется двумя фичами: `features/history`
  (общая история) и `features/article/components/article-versions` (история отдельной статьи).
- **Где живёт загрузка сводки** — в `ArticleHistoryService` (единственный владелец `_historyItems`,
  пагинации и фильтров). Реактивный fetch над `_historyItems()` грузит только новые versionId,
  аккумулирует в `Map<versionId, ReviewSummary>`, сбрасывает при смене фильтра/`hideCancelled`. Оба
  потребителя получают бейджи без дублирования; список и item — тупые презентеры.
- **`summarize()` сам грузит `Versions` по id** — `displayStatus`/`versionsNeedingVote`/`isOwnVersion`
  требуют `approved`+`author` по каждой версии, а контроллер получает с фронта только CSV id. Доступ к
  данным остаётся в сервисе (как у `getTallies`/`myVotes`).
- **`total = array_sum(tally)`** — всего проголосовавших (status>0) по версии, независимо от
  показываемого `status` (паритет с легаси-индикатором: число нейтральное, «всего проголосовало»).
- **Лейблы бейджа — на фронте** — `ReviewSummary` несёт только `status`; подпись маппится в компоненте
  (как `APPROVAL_CLASS` в `article.ts`). Сервер подписей не шлёт.

## Recommended Approach

### 1. Бэкенд (легаси Yii) — только новый эндпоинт
`protected/controllers/api/ReviewsApiController.php`:
- Новый `actionSummary($type)` → `GET /api/reviews/summary/<type>?versionIds=1,2,3`.
- Добавить `summary` в `$csrfExemptActions` и `$originExemptActions` (read-only, как `list`).
  Фиче-флаг уже проверяется в `beforeAction`. Валидация `type` — через `VALID_TYPES`.
- Парсинг `versionIds` (CSV, лимит по размеру страницы истории).
- Логика — тонкая обвязка над `ReviewService`: добавить additive-метод
  `ReviewService::summarize(array $versionIds, ?string $user, bool $isNews): array`,
  композирующий существующие `getTallies()` + `myVotes()` + `versionsNeedingVote()` +
  `displayStatus()`/`isOwnVersion()`. Метод сам грузит `Versions` по id: один `findAll` с
  `select = 'id, approved, author'` (нужны `approved`+`author` по каждой версии). Контроллер тонкий.
- Контракт ответа (`ApiResponse<...>`): массив только по версиям, где есть что показать —
  `{ versionId, status: 1|2|3|null, total: number, needsMyVote: boolean }`. Версии без значимых
  голосов и без needsMyVote опускаем (фронт трактует отсутствие как «бейджа нет»). `total` —
  полная сумма tally, независимо от `status` (в кейсе «чужая версия со своим голосом` `status = myVote`,
  но `total` = сумма всех голосов сообщества).
- Тесты: добавить кейсы в `ReviewsApiControllerTest` (валидный список, пустой, фиче-флаг off,
  права на pending-версии, `total` = полная сумма при `status = myVote`).

### 2. Фронт — модели (`libs/shared/src/lib/models/`)
- Домен `review.ts`: `ReviewStatus` (Undecided=0, Approve=1, Suggest=2, Disagree=3) как const-enum
  в стиле `ApprovalStatus`; `Review` ({reviewer, status, comment, updatedAt: Date});
  `ReviewSummary` ({versionId, status?: ReviewStatus, total, needsMyVote}); `ReviewTarget`='article'|'news'.
  Поля `statusLabel` нет — подписи маппятся на фронте из `status`.
- DTO `dto/review.dto.ts`: `ReviewDto`, `ReviewSummaryDto`, `SetReviewRequestDto`, `DeleteReviewRequestDto`.
- Экспорт в barrel-ах `models/index.ts` и `dto/index.ts`.

### 3. Фронт — сервисы (две части, `app/services/reviews/`, `providedIn:'root'`)
Полное покрытие reviews API (контракт впрок), без UI голосования в этой задаче:
- `review-api.service.ts` (@internal): `getSummary(type, versionIds)`, `getReviews(type, versionId)`,
  `setReview(req)`, `deleteReview(req)`. Паттерн как `ArticleApiService` — `ApiResponse<T>` +
  `assertIsDefined`, `withCredentials:true`. На `getSummary` повесить `SKIP_ERROR_NOTIFICATION`
  (фиче-флаг off → 404 FEATURE_DISABLED трактуем как «ревью нет»).
- `review.service.ts` (домен): маппинг DTO→домен (status→enum, строки дат→Date), методы-зеркала.
- Тесты: `review-api.service.spec` (HTTP/URL/params/unwrap), `review.service.spec` (маппинг) — Spectator.

### 4. Фронт — бейдж (`app/shared/components/review-badge/`)
Расположение в shared — потребитель используется двумя фичами.
- `ReviewBadgeComponent` (`app-review-badge`, OnPush, отдельные `.html`/`.scss`).
  Вход: `summary = input.required<ReviewSummary>()`.
  Шаблон: `needsMyVote` → синяя пилюля «Нужен ваш голос»; иначе при `status` → цветной лейбл
  (Одобрено/Нужны правки/Возражения) + счётчик `total` с иконкой. Приоритет цвета уже посчитан
  на сервере (status). Лейбл маппится в компоненте: константа
  `REVIEW_STATUS_LABEL: Record<ReviewStatus, string>` рядом с бейджем (как `APPROVAL_CLASS`).
  Цвета — через `--themed-*` (status-approved/success, warning, status-rejected/error); при нехватке —
  добавить review-токены в `_theme-colors.scss`.
- Тест `review-badge.component.spec`: рендер всех вариантов (approve/suggest/disagree/needsMyVote/нет).

### 5. Фронт — проводка данных (владелец — `ArticleHistoryService`)
- `ArticleHistoryService` — здесь живёт загрузка сводки (он уже владеет `_historyItems`, пагинацией
  и фильтрами):
  - приватный сигнал `_reviewSummaries = signal<Map<number, ReviewSummary>>(new Map())` +
    публичный `reviewSummaries = this._reviewSummaries.asReadonly()`;
  - реактивно над `_historyItems()` (effect): вычислить versionIds, отфильтровать уже загруженные,
    при наличии новых → `reviewService.getSummary('article', newIds)` (один запрос, `catchError → []`,
    `SKIP_ERROR_NOTIFICATION`), смёржить в Map. Догрузка страниц добавляет бейджи инкрементально;
  - при смене фильтра/`hideCancelled` (там, где `_historyItems.set([])`) — очистить Map
    (`_reviewSummaries.set(new Map())`), чтобы не тащить устаревшие сводки.
- `article-history-list.component` (тупой презентер): прокинуть `service.reviewSummaries()` в item,
  без собственной логики загрузки. Никакого входа `items` — компонент по-прежнему читает из `service`.
- `articles-history-item.component`: вход `reviewSummary = input<ReviewSummary>()`; в шаблоне после
  `<a class="title">` — `@if (reviewSummary(); as s) { <app-review-badge [summary]="s" /> }`;
  добавить `ReviewBadgeComponent` в imports. `.title-row` уже flex+gap — доп. CSS не нужен.
- Обновить специи `article-history.service.spec` (fetch новых id, инкремент при `onLoadMore`,
  сброс Map при смене фильтра, graceful при ошибке) и `articles-history-item.spec`
  (бейдж показывается/скрыт). `article-history-list.spec` — только проброс сигнала в item.

### Критические файлы
- Легаси: `protected/controllers/api/ReviewsApiController.php`, `protected/services/ReviewService.php`,
  `protected/tests/unit/api/ReviewsApiControllerTest.php`.
- Фронт: `libs/shared/src/lib/models/{review.ts,dto/review.dto.ts,index.ts,dto/index.ts}`,
  `app/services/reviews/{review-api.service.ts,review.service.ts}` (+ специи),
  `app/shared/components/review-badge/*`,
  `app/shared/components/articles-history-item/articles-history-item.component.{ts,html}`,
  `app/shared/components/article-history-list/article-history-list.component.{ts,html}`,
  `app/services/articles/article-history/article-history.service.ts` (владелец загрузки сводки).
- Референс вида/логики: `protected/views/_blocks/review_history_indicator.php`.

## Verification

- **Фронт-юнит:** `yarn nx test client` (сервисы, бейдж, item, list, history-service).
- **Легаси-юнит:** phpunit `ReviewsApiControllerTest` (summary: список/пустой/флаг-off/права/`total`).
- **Lint/format:** `yarn lint`, `yarn format:check`.
- **Ручная проверка:** `yarn serve` → открыть общую историю и историю отдельной статьи; убедиться,
  что бейджи совпадают с легаси-палитрой и логикой (приоритет disagree>suggest>approve, счётчик,
  «Нужен ваш голос»); проверить инкрементальную подгрузку при скролле и светлую/тёмную темы.
- **(Опц.) Playwright:** тест в `testing/playwright/` с замоканным `summary` API — бейдж виден в строке истории.
