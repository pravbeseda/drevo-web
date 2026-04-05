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
    playwright.config.ts             # Конфигурация Playwright
    tsconfig.json                    # TypeScript config
    fixtures/                        # Базовые fixtures
      index.ts                       # Главный экспорт (test, expect)
      auth.fixture.ts                # Аутентификация
      mock-api.fixture.ts            # Fixture-функции для мокирования API по группам
    mocks/                           # Фабрики мок-данных
      index.ts                       # Реэкспорт всех фабрик
      users.ts                       # Мок-пользователи
      common.ts                      # Общие хелперы (apiSuccess, apiError)
    pages/                           # Page Object Models
      base.page.ts                   # Абстрактный BasePage с waitForReady()
      layout.page.ts                 # Header, sidebar, account dropdown
    helpers/                         # Утилиты
      notification.ts                # Хелпер для работы с snackbar-нотификациями
    tests/                           # Тесты (по фичам)
      smoke.spec.ts                  # Smoke-тест
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

## Coverage (Deliverable 1.5)

- **Инструмент**: monocart-reporter — V8 coverage + source maps
- **Build**: отдельная конфигурация `coverage` в `project.json` с `sourceMap: true`
- **Команда**: `yarn test:playwright:coverage`
- **CI**: отдельный шаг в `coverage.yml`, badge `integration coverage` на GitHub Pages
- **V8 coverage только в Chromium** — ограничение API

---

## Roadmap

### Phase 1: Auth + Layout
- [ ] Page objects: `LoginPage`
- [ ] Тесты: login, logout, auth-guard, header, sidebar, theme, font-scale
- [ ] Image mock helper
- [ ] `data-testid` для всех затронутых компонентов

### Phase 2: Main + Article (просмотр)
- [ ] Mock factories: articles
- [ ] Page objects: `MainPage`, `ArticlePage`
- [ ] Тесты: main-page, article-view, article-tabs

### Phase 3: Article (редактирование) + History
- [ ] Mock factories: history
- [ ] Page objects: `ArticleEditPage`, `DiffPage`, `HistoryPage`
- [ ] Тесты: article-edit, article-moderation, article-history, history-page, diff-page

### Phase 4: Pictures
- [ ] Mock factories: pictures
- [ ] Page objects: `PictureGalleryPage`, `PictureDetailPage`
- [ ] Тесты: picture-gallery, picture-detail, picture-moderation

### Phase 5: Editor + Search
- [ ] Тесты: editor, search

### Phase 6: Кроссбраузерность + полировка
- [ ] Firefox, WebKit, мобильные projects
- [ ] Отдельный CI workflow (по расписанию, не на каждый PR)
- [ ] Документация для разработчиков

### Миграция из client-e2e
По мере реализации фаз — тесты с замоканным API переносятся из `apps/client-e2e/` в `testing/playwright/`. В `client-e2e` остаются только E2E-тесты с реальным бэкендом.

---

## Принятые решения

1. **Coverage раздельный** — два бейджа: `coverage` (unit) и `integration coverage` (Playwright). Объединение завышает числа.
2. **Source maps изолированы от прода** — отдельная build-конфигурация `coverage` с source maps.
3. **V8 coverage только в Chromium** — Firefox/WebKit только для кроссбраузерной проверки.
4. **E2E остаются в `apps/client-e2e/`** — integration-тесты отдельно (`yarn test:playwright`).
5. **CI без Docker** — бэкенд замокирован, Docker избыточен.
6. **Приоритет фич**: auth → main → article → picture → history → editor → search.
7. **Полнота тестов** — happy path + error states + edge cases для каждой фичи.
8. **Visual regression отложен** — с placeholder-данными ценность скриншот-тестов низкая.
9. **Fixture-функции вместо builder-класса** — идиоматичный Playwright-подход.
10. **Нотификации — отдельный хелпер** — snackbar глобален, не принадлежит конкретному PO.
