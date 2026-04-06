# Playwright Integration Testing Plan

## Концепция

**Интеграционное тестирование Angular-приложения с полным мокированием API бэкенда.**

Тесты проверяют работу фронтенда целиком — роутинг, компоненты, сервисы, interceptors, guards — но без реального бэкенда. Все HTTP-запросы перехватываются через `page.route()` и возвращают детерминированные ответы.

### Чем это отличается от E2E и Unit

| Аспект | Unit (Jest) | Integration (Playwright) | E2E (apps/client-e2e) |
|--------|-------------|--------------------------|----------------------|
| Бэкенд | Нет | Мокированный | Реальный |
| Браузер | jsdom | Настоящий | Настоящий |
| Scope | Компонент/сервис | Страница/flow | Вся система |
| Скорость | Быстро | Средне | Медленно |
| Что ловит | Логику компонента | UI-интеграцию, роутинг, interceptors | Баги на стыке фронт/бэк |

### Правила доступа к элементам

1. **Тесты никогда не обращаются к HTML-элементам напрямую** — никаких CSS-селекторов, тегов, классов или `locator()` в `.spec.ts` файлах. Вся работа с DOM — только через Page Objects.
2. **Page Objects используют исключительно `data-testid`** — `page.getByTestId('...')`. Никаких `locator('button.submit')`, `getByRole()`, `getByText()` для поиска элементов.
3. **`data-testid` добавляется в шаблоны компонентов** только когда реально нужен для теста (не заранее на все элементы).
4. **Один источник правды** — если селектор меняется, исправляется только Page Object, все тесты продолжают работать.

---

## Структура директорий

```
testing/
  playwright/
    PLAN.md                          # Этот файл
    playwright.config.ts             # Конфигурация Playwright (5 проектов, coverage)
    tsconfig.json                    # TypeScript config
    fixtures/                        # Базовые fixtures
      index.ts                       # Главный экспорт (test, expect)
      auth.fixture.ts                # Аутентификация (наследует coverage fixture)
      coverage.fixture.ts            # Автоматический сбор V8 coverage (при COVERAGE=true)
      mock-api.fixture.ts            # Fixture-функции для мокирования API по группам
    mocks/                           # Фабрики мок-данных
      index.ts                       # Реэкспорт всех фабрик
      users.ts                       # Мок-пользователи
      common.ts                      # Общие хелперы (apiSuccess, apiError)
      pictures.ts                    # Фабрики для иллюстраций (createPictureDto, etc.)
    pages/                           # Page Object Models
      base.page.ts                   # Абстрактный BasePage с waitForReady()
      layout.page.ts                 # Header, sidebar, account dropdown
      picture-gallery.page.ts        # Галерея иллюстраций
      picture-detail.page.ts         # Детальная страница иллюстрации
    helpers/                         # Утилиты
      notification.ts                # Хелпер для работы с snackbar-нотификациями
    tests/                           # Тесты (по фичам)
      smoke.spec.ts                  # Smoke-тест
      pictures/
        picture-gallery.spec.ts      # Галерея: отображение, поиск, пагинация, ошибки
        picture-detail.spec.ts       # Деталь: метаданные, статьи, редактирование, 404
```

---

## Endpoints для мокирования

| Группа | Endpoint | Метод | Приоритет |
|--------|----------|-------|-----------|
| **Auth** | `/api/auth/me` | GET | P0 |
| | `/api/auth/csrf` | GET | P0 |
| | `/api/auth/login` | POST | P0 |
| | `/api/auth/logout` | POST | P0 |
| **Articles** | `/api/articles/show/:id` | GET | P1 |
| | `/api/articles/version-show/:versionId` | GET | P1 |
| | `/api/articles/version/:versionId` | GET | P2 |
| | `/api/articles/search` | GET | P1 |
| | `/api/articles/save` | POST | P2 |
| | `/api/articles/history` | GET | P2 |
| | `/api/articles/moderate` | POST | P2 |
| | `/api/articles/preview` | POST | P2 |
| | `/api/articles/:id/topics` | POST | P3 |
| | `/api/articles/versionpairs` | GET | P2 |
| **Pictures** | `/api/pictures` | GET | P2 |
| | `/api/pictures/:id` | GET | P2 |
| | `/api/pictures/batch` | GET | P3 |
| | `/api/pictures/:id` | PATCH/PUT/DELETE | P3 |
| | `/api/pictures/pending` | GET | P3 |
| | `/api/pictures/pending/:id/approve\|reject\|cancel` | POST | P3 |
| | `/api/pictures/:id/articles` | GET | P3 |
| **Inwork** | `/api/inwork/check` | GET | P2 |
| | `/api/inwork/list` | GET | P3 |
| | `/api/inwork/mark\|clear` | POST | P2 |
| **Links** | `/api/wiki-links/check` | POST | P3 |
| **Static** | `/pictures/thumbs/**` | GET | P1 |
| | `/images/**` | GET | P2 |

---

## Тест-кейсы по фичам

### Auth (P0)

**login.spec.ts**: форма логина, валидация полей, успешный логин → редирект (главная / returnUrl), ошибки (неверные данные, 500, таймаут)

**logout.spec.ts**: клик "Выйти" → редирект, ошибка logout

**auth-guard.spec.ts**: редирект неавторизованного на /login, сохранение returnUrl, доступ авторизованного

### Main Page (P1)

**main-page.spec.ts**: отображение, список статей, пустой список, ошибка загрузки, навигация к статье

### Article — Просмотр (P1)

**article-view.spec.ts**: заголовок + содержимое, sidebar, 404, ошибка, конкретная версия, навигация между версиями

**article-tabs.spec.ts**: переключение табов, история версий, ссылки сюда, пустые списки, обновление URL

### Article — Редактирование (P2)

**article-edit.spec.ts**: загрузка редактора, сохранение, ошибки, preview, inwork-предупреждение, auto-save, CSRF retry

**article-moderation.spec.ts**: кнопки модерации (модератор vs обычный), одобрение/отклонение

**article-history.spec.ts**: список версий с пагинацией, фильтрация, infinite scroll, пустой список

### Pictures (P2)

**picture-gallery.spec.ts**: masonry-layout, поиск с debounce, пагинация, пустой результат, ошибка

**picture-detail.spec.ts**: просмотр с метаданными, связанные статьи, редактирование заголовка, 404

**picture-moderation.spec.ts**: список ожидающих, одобрение/отклонение/отмена, пустой список

### History (P2)

**history-page.spec.ts**: табы (статьи, новости, форум, картинки), пагинация, пустой список

**diff-page.spec.ts**: сравнение одной/двух версий, 404, diff-разметка

### Layout (P2)

**header.spec.ts**: имя пользователя, account dropdown, поиск

**sidebar.spec.ts**: навигация, collapsed/expanded, сохранение в localStorage

**theme.spec.ts**: переключение темы, сохранение, CSS-переменные

**font-scale.spec.ts**: изменение масштаба, границы (0.8–1.5), сохранение

### Editor (P3)

**editor.spec.ts**: загрузка iframe, доступ авторизованному

### Search (P3)

**search.spec.ts**: поиск с результатами, пустой результат, debounce, навигация к статье

---

## Выполнено

### Deliverable 1.5: Инфраструктура + Coverage + CI + кроссбраузерность ✅

Создана полная инфраструктура: конфигурация Playwright (5 проектов), fixture-система (auth, coverage, mock-api), Page Objects (BasePage, LayoutPage), моки (users, common), smoke-тест. Coverage через monocart-reporter + V8 API. CI: `playwright.yml` (Chromium на PR) + `playwright-cross-browser.yml` (все браузеры, workflow_dispatch). Скрипты в package.json для всех режимов запуска.

---

## Deliverables

### D2: Login page — тесты авторизации ✅

`LoginPage` PO, `mockLoginSuccess`/`mockLoginError` fixtures, `data-testid` в login template. 15 тестов: форма/валидация, happy path с редиректом, returnUrl (включая open redirect protection), ошибки (INVALID_CREDENTIALS, ACCOUNT_NOT_ACTIVE, 500), loading state.

### D3: Logout + Auth guard ✅

`LayoutPage` дополнен `logoutButton` + `clickLogout()`. `mockLogoutError` fixture. `data-testid="logout-button"` в account-dropdown шаблоне. 2 теста logout (успех + ошибка сервера), 3 теста auth-guard (redirect неавторизованного, returnUrl, доступ авторизованного).

### D4: Pictures ✅

Mock factories (`mocks/pictures.ts`): `createPictureDto`, `createPictureDtoList`, `createPicturesListResponse`, `createPictureArticleDto`, `mockPictureData`. Fixture functions: `mockPicturesApi`, `mockPicturesEmpty`, `mockPicturesError`, `mockPicturesSearch`, `mockPictureDetail`, `mockPictureNotFound`, `mockPictureDetailError`, `mockPictureArticles`, `mockPictureUpdateTitle`, `mockPictureUpdateTitlePending`, `mockPictureThumbs`. Page Objects: `PictureGalleryPage`, `PictureDetailPage`. `data-testid` добавлены в `picture-page` (page, loading, gallery, empty) и `picture-search-bar`.

- [x] Mock factories: pictures list, picture detail, articles
- [x] `PictureGalleryPage`, `PictureDetailPage` page objects
- [x] Image mock helper (placeholder для `/pictures/thumbs/**` и `/pictures/full/**`)
- [x] `data-testid` в gallery компоненты (`pictures-page`, `pictures-loading`, `pictures-gallery`, `pictures-empty`, `pictures-search-bar`)
- [x] `tests/pictures/picture-gallery.spec.ts` — 8 тестов: отображение, поиск (с результатами + пустой), пустое состояние, ошибка сервера, пагинация
- [x] `tests/pictures/picture-detail.spec.ts` — 13 тестов: изображение/заголовок/автор/размеры, связанные статьи (есть/пусто/ошибка), редактирование заголовка (модератор/pending), 404/ошибка/невалидный ID, скрытие размеров
- [ ] `tests/pictures/picture-moderation.spec.ts` — отложено (компонент модерации ещё не реализован)

### D5: Layout — header, sidebar
- [ ] `data-testid` в header, sidebar, theme-toggle, font-scale-control
- [ ] `tests/layout/header.spec.ts` — имя пользователя, account dropdown
- [ ] `tests/layout/sidebar.spec.ts` — навигация, collapsed/expanded, сохранение состояния
- [ ] `tests/layout/theme.spec.ts` — переключение темы, сохранение
- [ ] `tests/layout/font-scale.spec.ts` — изменение масштаба, границы, сохранение

### D6: Main page
- [ ] Mock factories: articles list (`mocks/articles.ts`)
- [ ] `MainPage` page object
- [ ] `data-testid` в main page компоненты
- [ ] `tests/main-page.spec.ts` — отображение, список статей, пустой список, ошибка, навигация к статье

### D7: Article — просмотр
- [ ] Mock factories: article detail, article version
- [ ] `ArticlePage` page object
- [ ] `data-testid` в article-view, article-tabs
- [ ] `tests/article/article-view.spec.ts` — заголовок, содержимое, 404, ошибка, версия
- [ ] `tests/article/article-tabs.spec.ts` — переключение табов, история, ссылки сюда

### D8: Article — редактирование
- [ ] `ArticleEditPage` page object
- [ ] Mock: save, preview, inwork, moderate endpoints
- [ ] `data-testid` в article-edit, moderation компоненты
- [ ] `tests/article/article-edit.spec.ts` — редактор, сохранение, ошибки, preview, auto-save
- [ ] `tests/article/article-moderation.spec.ts` — кнопки модерации, одобрение/отклонение

### D9: History + Diff
- [ ] Mock factories: history list, version pairs
- [ ] `HistoryPage`, `DiffPage` page objects
- [ ] `data-testid` в history, diff компоненты
- [ ] `tests/history/history-page.spec.ts` — табы, пагинация, пустой список
- [ ] `tests/history/diff-page.spec.ts` — сравнение версий, diff-разметка

### D10: Editor + Search
- [ ] `tests/editor/editor.spec.ts` — загрузка iframe, доступ
- [ ] `SearchPage` page object
- [ ] `tests/search/search.spec.ts` — результаты, пустой, debounce, навигация

### D11: Полировка
- [ ] Порог coverage (monocart `watermarks`)
- [ ] Badge `integration coverage` на GitHub Pages
- [ ] CSS coverage в coverage fixture
- [ ] Документация для разработчиков

---

## Миграция из client-e2e

По мере реализации deliverables — тесты с замоканным API переносятся из `apps/client-e2e/` в `testing/playwright/`. В `client-e2e` остаются только E2E-тесты с реальным бэкендом.

---

## Принятые решения

1. **Coverage раздельный** — два бейджа: `coverage` (unit) и `integration coverage` (Playwright). Объединение завышает числа.
2. **Source maps изолированы от прода** — отдельная build-конфигурация `coverage` с source maps.
3. **V8 coverage только в Chromium** — Firefox/WebKit только для кроссбраузерной проверки.
4. **E2E остаются в `apps/client-e2e/`** — integration-тесты отдельно (`yarn test:playwright`).
5. **CI без Docker** — бэкенд замокирован, Docker избыточен.
6. **Приоритет фич**: auth → pictures → layout → main → article → history → editor → search.
7. **Полнота тестов** — happy path + error states + edge cases для каждой фичи.
8. **Visual regression отложен** — с placeholder-данными ценность скриншот-тестов низкая.
9. **Fixture-функции вместо builder-класса** — идиоматичный Playwright-подход.
10. **Нотификации — отдельный хелпер** — snackbar глобален, не принадлежит конкретному PO.
11. **CI при PR — только Chromium** — быстрая обратная связь, coverage собирается в том же прогоне.
12. **Кроссбраузерность — workflow_dispatch** — полный набор (Firefox, WebKit, мобильные) запускается вручную, не блокирует PR.
13. **Порог coverage отложен** — сначала наберём тесты, потом зафиксируем минимум.
14. **Coverage через auto-fixture** — `coverage.fixture.ts` с `addCoverageReport()` из monocart-reporter, автоматически собирает V8 данные для каждого теста.
15. **Static build для coverage** — `outputMode: "static"` без SSR, `index.csr.html` → `index.html` копирование для SPA-routing.
16. **`serve` в devDependencies** — для стабильного serving static-билда в CI без зависимости от npx cache.
