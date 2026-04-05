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

### Преимущества подхода

- **Детерминированность** — нет зависимости от бэкенда, тесты стабильны
- **Скорость** — не нужна БД и сервер, запуск быстрый
- **Edge cases** — легко эмулировать ошибки, пустые данные, таймауты
- **CI-friendly** — работает в любом окружении без Docker

### Правила доступа к элементам

1. **Тесты никогда не обращаются к HTML-элементам напрямую** — никаких CSS-селекторов, тегов, классов или `locator()` в `.spec.ts` файлах. Вся работа с DOM — только через Page Objects.
2. **Page Objects используют исключительно `data-testid`** — `page.getByTestId('...')`. Никаких `locator('button.submit')`, `locator('mat-snack-bar-container')`, `getByRole()`, `getByText()` для поиска элементов.
3. **`data-testid` добавляется в шаблоны компонентов** — если у элемента нет `data-testid`, он добавляется при написании Page Object. Атрибут добавляется только когда реально нужен для теста (не заранее на все элементы).
4. **Один источник правды** — если селектор меняется (например, компонент переделали), исправляется только Page Object, все тесты продолжают работать.

```typescript
// ПРАВИЛЬНО — тест работает через Page Object
test('should show article title', async ({ page }) => {
  const articlePage = new ArticlePage(page);
  await articlePage.goto(1);
  await expect(articlePage.title).toHaveText('Тестовая статья');
});

// НЕПРАВИЛЬНО — тест обращается к DOM напрямую
test('should show article title', async ({ page }) => {
  await page.goto('/articles/1');
  await expect(page.locator('h1.article-title')).toHaveText('Тестовая статья');
});
```

---

## Слой 1: Инфраструктура

### 1.1 Структура директорий

```
testing/
  playwright/
    PLAN.md                          # Этот файл
    playwright.config.ts             # Конфигурация Playwright
    tsconfig.json                    # TypeScript config
    fixtures/                        # Базовые fixtures
      index.ts                       # Главный экспорт (test, expect)
      auth.fixture.ts                # Аутентификация (перенос из client-e2e)
      mock-api.fixture.ts            # Fixture-функции для мокирования API по группам
    mocks/                           # Фабрики мок-данных
      index.ts                       # Реэкспорт всех фабрик
      users.ts                       # Мок-пользователи
      articles.ts                    # Мок-статьи и версии
      pictures.ts                    # Мок-картинки
      history.ts                     # Мок-история
      common.ts                      # Общие хелперы (пагинация, ошибки)
    pages/                           # Page Object Models
      login.page.ts
      main.page.ts
      article.page.ts
      article-edit.page.ts
      picture-gallery.page.ts
      picture-detail.page.ts
      history.page.ts
      diff.page.ts
      layout.page.ts                 # Header, sidebar, theme toggle
    helpers/                         # Утилиты
      image-mock.ts                  # Мокирование картинок с заданным размером
      notification.ts                # Хелпер для работы с snackbar-нотификациями
    tests/                           # Тесты (по фичам)
      auth/
        login.spec.ts
        logout.spec.ts
        auth-guard.spec.ts
      main/
        main-page.spec.ts
      article/
        article-view.spec.ts
        article-edit.spec.ts
        article-tabs.spec.ts
        article-history.spec.ts
        article-moderation.spec.ts
      picture/
        picture-gallery.spec.ts
        picture-detail.spec.ts
        picture-moderation.spec.ts
      history/
        history-page.spec.ts
        diff-page.spec.ts
      layout/
        header.spec.ts
        sidebar.spec.ts
        theme.spec.ts
        font-scale.spec.ts
      editor/
        editor.spec.ts
      search/
        search.spec.ts
      # visual/ и screenshots/ — добавить когда появятся реальные данные вместо placeholder-контента
```

### 1.2 Конфигурация Playwright

```typescript
// testing/playwright/playwright.config.ts
import { workspaceRoot } from '@nx/devkit';
import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? '50%' : undefined,   // CI: половина ядер, локально: все
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    // Coverage reporter (см. слой 5)
  ],

  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    // --no-hmr: предотвращает случайную перезагрузку при изменении файлов во время прогона
    command: process.env.COVERAGE
      ? 'yarn nx run client:serve --configuration=coverage --no-hmr'
      : 'yarn nx run client:serve --no-hmr',
    url: 'http://localhost:4200',
    reuseExistingServer: !isCI,
    cwd: workspaceRoot,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox, WebKit, мобильные — добавить в Phase 6 (кроссбраузерность)
  ],
});
```

### 1.3 Build-конфигурация для coverage

Для coverage нужны source maps, но они не должны попадать в production. Добавить конфигурацию `coverage` в `apps/client/project.json`:

```jsonc
// apps/client/project.json → targets.build.configurations
"coverage": {
  "sourceMap": true,
  "optimization": false,
  "namedChunks": true
}
```

В `playwright.config.ts` `webServer.command` уже учитывает env `COVERAGE` (см. конфиг выше).

### 1.4 Команды

```jsonc
// В package.json:
{
  "test:playwright": "playwright test --config=testing/playwright/playwright.config.ts",
  "test:playwright:ui": "playwright test --config=testing/playwright/playwright.config.ts --ui",
  "test:playwright:headed": "playwright test --config=testing/playwright/playwright.config.ts --headed",
  "test:playwright:coverage": "COVERAGE=true playwright test --config=testing/playwright/playwright.config.ts"
}
```

### 1.5 CI Pipeline

Добавить job в `.github/workflows/ci.yml`:

```yaml
integration-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'yarn'
    - run: yarn install --frozen-lockfile
    - run: npx playwright install --with-deps chromium
    - run: yarn test:playwright
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: testing/playwright/playwright-report/
```

Полная кроссбраузерная проверка — по расписанию или вручную (отдельный workflow), не на каждый PR.

---

## Слой 2: Мокирование API

### 2.1 Архитектура моков

**Три уровня:**

```
┌──────────────────────────────────────────┐
│  Тест                                    │
│  test('should show article', ...)        │
│    → использует fixture + мок-данные     │
├──────────────────────────────────────────┤
│  Fixtures (fixtures/)                    │
│  authenticatedPage, mockApi              │
│    → настраивают page.route()            │
├──────────────────────────────────────────┤
│  Mock Data Factories (mocks/)            │
│  createArticle(), createPicture()        │
│    → генерируют типизированные данные    │
├──────────────────────────────────────────┤
│  API Interceptor (helpers/)              │
│  MockApiHandler                          │
│    → роутинг запросов к нужным хэндлерам │
└──────────────────────────────────────────┘
```

### 2.2 Паттерн Mock Data Factory

```typescript
// mocks/articles.ts
import { ArticleVersionDto } from '@drevo-web/shared';

export function createArticleDto(overrides: Partial<ArticleVersionDto> & { id: number }): ArticleVersionDto {
  return {
    articleId: overrides.id,
    title: `Тестовая статья ${overrides.id}`,
    content: `<p>Содержимое статьи ${overrides.id}</p>`,
    rawContent: `Содержимое статьи ${overrides.id}`,
    author: 'testuser',
    createdAt: '2024-01-15T10:00:00Z',
    approved: 1,
    ...overrides,
  };
}

export function createArticleListResponse(count: number, page = 1, size = 25) {
  const items = Array.from({ length: count }, (_, i) => createArticleDto({ id: (page - 1) * size + i + 1 }));
  return {
    success: true,
    data: { items, total: count, page, size },
  };
}
```

### 2.3 Паттерн: fixture-функции для мокирования API

Вместо builder-класса — набор fixture-функций, каждая отвечает за свою группу endpoints. Это идиоматичный Playwright-подход: проще, без лишнего слоя абстракции.

```typescript
// fixtures/mock-api.fixture.ts
import { Page } from '@playwright/test';

/** Мокировать auth endpoints (authenticated user) */
export async function mockAuthApi(page: Page, user?: Partial<UserDto>): Promise<void> {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ json: { success: true, data: { username: 'testuser', ...user } } })
  );
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { success: true, data: { token: 'test-csrf-token' } } })
  );
}

/** Мокировать articles endpoints */
export async function mockArticlesApi(page: Page, articles: ArticleVersionDto[]): Promise<void> {
  await page.route('**/api/articles/show/*', (route) => {
    const id = Number(route.request().url().split('/').pop());
    const article = articles.find(a => a.id === id);
    if (article) {
      route.fulfill({ json: { success: true, data: article } });
    } else {
      route.fulfill({ status: 404, json: { success: false, error: 'Not found' } });
    }
  });
}

/** Мокировать серверную ошибку для конкретного endpoint */
export async function mockApiError(page: Page, pattern: string, status: number, message: string): Promise<void> {
  await page.route(pattern, (route) =>
    route.fulfill({ status, json: { success: false, error: message } })
  );
}
```

Fixture-функции компонуются в тесте или в Playwright fixtures:

### 2.4 Мокирование картинок

```typescript
// helpers/image-mock.ts

/**
 * Генерирует SVG-placeholder с заданным размером.
 * Позволяет тестировать масштабирование/layout с реальными пропорциями.
 */
export function createImagePlaceholder(width: number, height: number, label?: string): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#e0e0e0"/>
    <text x="50%" y="50%" text-anchor="middle" dy=".3em"
          font-family="sans-serif" font-size="14" fill="#666">
      ${label || `${width}×${height}`}
    </text>
  </svg>`;
  return Buffer.from(svg);
}

/**
 * Перехватывает запросы к картинкам и возвращает SVG-placeholder.
 */
export async function mockImages(page: Page, config?: ImageMockConfig): Promise<void> {
  await page.route('**/pictures/thumbs/**', async (route) => {
    const size = config?.thumbnailSize ?? { width: 200, height: 150 };
    await route.fulfill({
      contentType: 'image/svg+xml',
      body: createImagePlaceholder(size.width, size.height, 'thumb'),
    });
  });

  await page.route('**/images/**', async (route) => {
    const size = config?.fullSize ?? { width: 800, height: 600 };
    await route.fulfill({
      contentType: 'image/svg+xml',
      body: createImagePlaceholder(size.width, size.height, 'full'),
    });
  });
}
```

### 2.5 Полный список endpoints для мокирования

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
| | `/api/pictures/:id` | PATCH | P3 |
| | `/api/pictures/:id` | PUT | P3 |
| | `/api/pictures/:id` | DELETE | P3 |
| | `/api/pictures/pending` | GET | P3 |
| | `/api/pictures/pending/:id/approve` | POST | P3 |
| | `/api/pictures/pending/:id/reject` | POST | P3 |
| | `/api/pictures/pending/:id/cancel` | POST | P3 |
| | `/api/pictures/:id/articles` | GET | P3 |
| **Inwork** | `/api/inwork/check` | GET | P2 |
| | `/api/inwork/list` | GET | P3 |
| | `/api/inwork/mark` | POST | P2 |
| | `/api/inwork/clear` | POST | P2 |
| **Links** | `/api/wiki-links/check` | POST | P3 |
| **Static** | `/pictures/thumbs/**` | GET | P1 |
| | `/images/**` | GET | P2 |

---

## Слой 3: Page Object Model

### 3.1 Базовый Page Object

```typescript
// pages/base.page.ts
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Дождаться завершения загрузки (спиннер исчез) */
  async waitForLoaded(): Promise<void> {
    await this.page.getByTestId('spinner').waitFor({ state: 'hidden', timeout: 5000 })
      .catch(() => { /* spinner may not appear for fast loads */ });
  }
}
```

Нотификации (snackbar) — глобальный элемент, не принадлежит конкретной странице. Доступ через отдельный хелпер:

```typescript
// helpers/notification.ts
export function getNotification(page: Page) {
  return page.getByTestId('notification');
}
```

> При реализации — добавить `data-testid="spinner"` в `ui-spinner` и `data-testid="notification"` в snackbar-компонент.

### 3.2 Page Objects по фичам

Каждый PO инкапсулирует:
- Селекторы элементов (через `data-testid`)
- Действия пользователя (click, fill, navigate)
- Assertions (проверки состояния)

```typescript
// pages/article.page.ts
export class ArticlePage extends BasePage {
  // Selectors
  readonly title = this.page.getByTestId('article-title');
  readonly content = this.page.getByTestId('article-content');
  readonly sidebar = this.page.getByTestId('article-sidebar');
  readonly tabs = this.page.getByTestId('article-tabs');

  // Actions
  async goto(articleId: number): Promise<void> {
    await this.page.goto(`/articles/${articleId}`);
    await this.waitForLoaded();
  }

  async switchTab(testId: string): Promise<void> {
    await this.page.getByTestId(testId).click();
    await this.waitForLoaded();
  }

  // Tab-specific selectors
  get historyTab() { return this.page.getByTestId('article-tab-history'); }
  get forumTab() { return this.page.getByTestId('article-tab-forum'); }
}
```

---

## Слой 4: Тест-кейсы по фичам

### 4.1 Auth (Приоритет: P0)

#### login.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Отображение формы логина | Happy path |
| 2 | Кнопка "Войти" disabled при пустых полях | Validation |
| 3 | Кнопка "Войти" enabled при заполненных полях | Validation |
| 4 | Успешный логин → редирект на главную | Happy path |
| 5 | Успешный логин → редирект на returnUrl | Happy path |
| 6 | Неуспешный логин → сообщение об ошибке | Error state |
| 7 | Серверная ошибка (500) → уведомление | Error state |
| 8 | Таймаут запроса → уведомление | Edge case |

#### logout.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Клик "Выйти" → редирект на логин | Happy path |
| 2 | Ошибка при logout → уведомление | Error state |

#### auth-guard.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Неавторизованный → редирект на /login | Happy path |
| 2 | Авторизованный → доступ к защищенной странице | Happy path |
| 3 | Сохранение returnUrl при редиректе | Happy path |
| 4 | Прямой доступ к /login авторизованным → остаётся на /login | Edge case |

### 4.2 Main Page (Приоритет: P1)

#### main-page.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Отображение главной страницы | Happy path |
| 2 | Список статей загружается | Happy path |
| 3 | Пустой список статей → placeholder | Edge case |
| 4 | Ошибка загрузки → сообщение | Error state |
| 5 | Клик по статье → переход на страницу статьи | Navigation |

### 4.3 Article — Просмотр (Приоритет: P1)

#### article-view.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Отображение заголовка и содержимого статьи | Happy path |
| 2 | Sidebar с метаданными статьи | Happy path |
| 3 | Статья не найдена (404) → страница ошибки | Error state |
| 4 | Серверная ошибка → уведомление | Error state |
| 5 | Конкретная версия (version/:versionId) | Happy path |
| 6 | Навигация между версиями | Navigation |

#### article-tabs.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Переключение между табами (контент, новости, форум, история, ссылки) | Happy path |
| 2 | Таб "История" — список версий | Happy path |
| 3 | Таб "История" — пустой список | Edge case |
| 4 | Таб "Ссылки сюда" — список | Happy path |
| 5 | Таб "Ссылки сюда" — пустой | Edge case |
| 6 | URL обновляется при смене таба | Navigation |

### 4.4 Article — Редактирование (Приоритет: P2)

#### article-edit.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Загрузка редактора с содержимым статьи | Happy path |
| 2 | Сохранение изменений → уведомление + обновление | Happy path |
| 3 | Сохранение с ошибкой → уведомление | Error state |
| 4 | Preview содержимого | Happy path |
| 5 | Другой пользователь редактирует (inwork) → предупреждение | Edge case |
| 6 | Draft auto-save (debounce 3s) | Edge case |
| 7 | CSRF-ошибка → повторный запрос токена → retry | Edge case |

#### article-moderation.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Модератор видит кнопки "Одобрить"/"Отклонить" | Happy path |
| 2 | Обычный пользователь не видит кнопки модерации | Authorization |
| 3 | Одобрение версии → обновление статуса | Happy path |
| 4 | Отклонение версии → обновление статуса | Happy path |

#### article-history.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Список версий с пагинацией | Happy path |
| 2 | Фильтрация: все / непроверенные / мои | Happy path |
| 3 | Infinite scroll — подгрузка следующей страницы | Edge case |
| 4 | Пустой список | Edge case |

### 4.5 Pictures (Приоритет: P2)

#### picture-gallery.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Галерея картинок с masonry-layout | Happy path |
| 2 | Поиск картинок (с debounce) | Happy path |
| 3 | Пагинация | Happy path |
| 4 | Пустой результат поиска | Edge case |
| 5 | Масштабирование placeholder-картинок разных размеров | Visual |
| 6 | Ошибка загрузки списка | Error state |

#### picture-detail.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Просмотр картинки с метаданными | Happy path |
| 2 | Список статей, использующих картинку | Happy path |
| 3 | Редактирование заголовка | Happy path |
| 4 | Картинка не найдена | Error state |

#### picture-moderation.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Список ожидающих изменений | Happy path |
| 2 | Одобрение / отклонение / отмена | Happy path |
| 3 | Пустой список ожидающих | Edge case |

### 4.6 History (Приоритет: P2)

#### history-page.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Табы: статьи, новости, форум, картинки | Happy path |
| 2 | Переключение между табами | Navigation |
| 3 | Список изменений с пагинацией | Happy path |
| 4 | Пустой список | Edge case |

#### diff-page.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Сравнение одной версии (с текущей) | Happy path |
| 2 | Сравнение двух конкретных версий | Happy path |
| 3 | Версия не найдена | Error state |
| 4 | Отображение diff-разметки | Happy path |

### 4.7 Layout (Приоритет: P2)

#### header.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Отображение имени пользователя | Happy path |
| 2 | Account dropdown: навигация, выход | Happy path |
| 3 | Поиск из header | Happy path |

#### sidebar.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Навигация по разделам | Happy path |
| 2 | Collapsed/expanded состояние | Happy path |
| 3 | Сохранение состояния (localStorage) | Edge case |

#### theme.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Переключение светлой/тёмной темы | Happy path |
| 2 | Сохранение темы в localStorage | Edge case |
| 3 | CSS-переменные применяются корректно | Visual |

#### font-scale.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Изменение масштаба шрифта | Happy path |
| 2 | Границы масштаба (0.8–1.5) | Edge case |
| 3 | Сохранение в localStorage | Edge case |

### 4.8 Editor (Приоритет: P3)

#### editor.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Загрузка iframe с редактором | Happy path |
| 2 | Редактор доступен авторизованному пользователю | Happy path |

### 4.9 Search (Приоритет: P3)

#### search.spec.ts
| # | Тест-кейс | Тип |
|---|-----------|-----|
| 1 | Поиск с результатами | Happy path |
| 2 | Пустой результат | Edge case |
| 3 | Debounce поиска | Edge case |
| 4 | Переход к статье из результатов | Navigation |

### 4.10 Visual Regression — Future Consideration

> С мокированным API скриншоты показывают placeholder-контент (SVG-заглушки вместо картинок, шаблонные тексты). Ценность визуальной регрессии в таких условиях низкая. Добавить когда будут реалистичные mock-данные или подключение к staging-среде.

---

## Слой 5: Code Coverage

### 5.1 Инструмент: monocart-reporter

[monocart-reporter](https://github.com/nicedayfor/monocart-reporter) — reporter для Playwright с встроенной поддержкой V8 coverage и source maps.

**Как работает:**
1. Playwright запускает тесты в Chromium
2. V8 coverage API собирает данные о выполненных строках/функциях/ветвях
3. monocart-reporter маппит на исходники через source maps Angular-билда
4. Генерирует отчёты в форматах: HTML, json-summary (Istanbul-совместимый), lcov

### 5.2 Настройка

```typescript
// В playwright.config.ts, секция reporter:
reporter: [
  ['list'],
  ['monocart-reporter', {
    name: 'Playwright Integration Coverage',
    outputFile: './coverage/report.html',
    coverage: {
      reports: [
        ['v8'],                            // HTML v8 report
        ['json-summary', {                 // Для badge и CI
          outputFile: '../../coverage/playwright/coverage-summary.json'
        }],
        ['lcov', {                         // Для IDE-интеграции
          outputFile: '../../coverage/playwright/lcov.info'
        }],
      ],
      entryFilter: (entry) => {
        // Только наш исходный код, не node_modules
        return entry.url.includes('/apps/client/') || entry.url.includes('/libs/');
      },
      sourceFilter: (source) => {
        return !source.includes('node_modules') && !source.includes('polyfills');
      },
    },
  }],
],
```

### 5.3 Интеграция с GitHub Pages badge

Coverage для unit и integration тестов считается **раздельно** — два независимых бейджа.

Обновить `.github/workflows/coverage.yml`, добавив **отдельный шаг** для Playwright (после существующего unit-coverage):

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run integration tests with coverage
  run: yarn test:playwright:coverage

- name: Generate integration coverage badge
  run: |
    if [ -f "coverage/playwright/coverage-summary.json" ]; then
      PW_LINES=$(jq '.total.lines.total' "coverage/playwright/coverage-summary.json")
      PW_COVERED=$(jq '.total.lines.covered' "coverage/playwright/coverage-summary.json")

      if [ $PW_LINES -gt 0 ]; then
        PW_PERCENTAGE=$(echo "scale=2; $PW_COVERED * 100 / $PW_LINES" | bc)
      else
        PW_PERCENTAGE=0
      fi

      if (( $(echo "$PW_PERCENTAGE >= 80" | bc -l) )); then
        PW_COLOR="brightgreen"
      elif (( $(echo "$PW_PERCENTAGE >= 60" | bc -l) )); then
        PW_COLOR="yellow"
      else
        PW_COLOR="red"
      fi

      cat > coverage/merged/pw-badge.json << EOF
      {
        "schemaVersion": 1,
        "label": "integration coverage",
        "message": "${PW_PERCENTAGE}%",
        "color": "$PW_COLOR"
      }
      EOF

      # Copy Playwright HTML report
      cp -r coverage/playwright coverage/merged/playwright 2>/dev/null || true
    fi
```

Обновить `coverage/merged/index.html` — добавить ссылку на Playwright-отчёт.

Два бейджа в README (независимые):
```markdown
[![Unit Coverage](https://img.shields.io/endpoint?url=https://pravbeseda.github.io/drevo-web/badge.json)](https://pravbeseda.github.io/drevo-web/)
[![Integration Coverage](https://img.shields.io/endpoint?url=https://pravbeseda.github.io/drevo-web/pw-badge.json)](https://pravbeseda.github.io/drevo-web/playwright/)
```

### 5.4 Локальная команда

```bash
yarn test:playwright:coverage
# → Открывает HTML-отчёт с покрытием
```

---

## Deliverable 1: Инфраструктура + smoke-тест

**Цель:** Рабочая инфраструктура integration-тестов с одним простым тестом, проверенная во всех режимах запуска (локально headless/headed/UI, coverage, CI).

### Acceptance Criteria

- [ ] `yarn test:playwright` — запускает тест headless в Chromium, тест проходит
- [ ] `yarn test:playwright:headed` — открывает браузер, тест проходит визуально
- [ ] `yarn test:playwright:ui` — открывает Playwright UI Mode, тест виден и запускается
- [ ] Тест использует Page Object + `data-testid` (ни одного прямого селектора в `.spec.ts`)
- [ ] Тест использует fixture-функции с замоканным API (auth)

### Smoke-тест: "Авторизованный пользователь видит главную страницу"

Минимальный тест, который проходит через весь стек:
1. Auth fixture мокирует `/api/auth/me` → authenticated
2. Auth fixture мокирует `/api/auth/csrf` → token
3. `page.goto('/')` → auth guard пропускает → отображается layout
4. Проверка: заголовок в header виден, имя пользователя отображается

Этот тест затрагивает: routing, auth guard, auth interceptor, layout, header — достаточно для валидации инфраструктуры.

### Этапы

#### Этап 1: Конфигурация проекта

Создать файлы:
- `testing/playwright/playwright.config.ts` — конфигурация (по описанию из слоя 1.2)
- `testing/playwright/tsconfig.json` — TypeScript config с path aliases на `@drevo-web/*`
- `testing/playwright/.gitignore` — игнорировать `playwright-report/`, `test-results/`, `coverage/`

Добавить в root:
- `package.json` — 3 скрипта (`test:playwright`, `test:playwright:ui`, `test:playwright:headed`)

> **Примечание:** `@playwright/test` и `@nx/playwright` уже установлены в проекте. Отдельный `package.json` для `testing/playwright/` не нужен — моки импортируют `@drevo-web/shared` через path aliases из root `tsconfig.base.json`, отдельный `node_modules` создаст проблемы с резолвом. Достаточно `tsconfig.json` в `testing/playwright/` для настройки компиляции.

**AC этапа:** `yarn test:playwright --help` работает без ошибок.

#### Этап 2: Auth fixtures + mock data

Создать файлы:
- `testing/playwright/mocks/users.ts` — mock users (перенос из `client-e2e`, адаптация)
- `testing/playwright/mocks/common.ts` — helper для формирования API response `{ success, data }`
- `testing/playwright/mocks/index.ts` — реэкспорт
- `testing/playwright/fixtures/auth.fixture.ts` — `authenticatedPage` fixture (перенос + адаптация)
- `testing/playwright/fixtures/index.ts` — главный экспорт `test`, `expect`

**AC этапа:** fixtures импортируются без ошибок TypeScript.

#### Этап 3: Page Object + data-testid

Создать файлы:
- `testing/playwright/pages/base.page.ts` — `BasePage` с `waitForLoaded()`, `getNotification()`
- `testing/playwright/pages/layout.page.ts` — `LayoutPage` с `header`, `userName`, `sidebar`

Добавить `data-testid` в Angular-шаблоны:
- `ui-spinner` → `data-testid="spinner"`
- Header component → `data-testid="header"`, `data-testid="user-name"`
- Snackbar (если кастомный) → `data-testid="notification"`

**AC этапа:** Page Objects компилируются, `data-testid` добавлены в шаблоны.

#### Этап 4: Smoke-тест

Создать файл:
- `testing/playwright/tests/smoke.spec.ts`

```typescript
import { test, expect } from '../fixtures';
import { LayoutPage } from '../pages/layout.page';

test.describe('Smoke test', () => {
  test('authenticated user sees main page with header', async ({ authenticatedPage }) => {
    const layout = new LayoutPage(authenticatedPage);
    await authenticatedPage.goto('/');
    await layout.waitForLoaded();

    await expect(layout.header).toBeVisible();
    await expect(layout.userName).toHaveText('Test User');
  });
});
```

**AC этапа:** `yarn test:playwright` — тест проходит.

---

## Deliverable 1.5: Coverage + CI

**Цель:** Coverage-отчёты, CI pipeline и badge. Отделён от Deliverable 1, чтобы не затягивать первую рабочую итерацию.

### Acceptance Criteria

- [ ] `yarn test:playwright:coverage` — тест проходит, генерируется HTML-отчёт coverage с source maps (видны `.ts`-файлы, а не бандлы)
- [ ] CI job `integration-tests` — проходит в GitHub Actions, артефакт с отчётом загружается при падении
- [ ] Coverage badge `integration coverage` — отображается в README со значением > 0%
- [ ] Coverage HTML-отчёт — доступен на GitHub Pages по ссылке из badge

### Этапы

#### Этап 1: Coverage

Установить:
- `monocart-reporter` (devDependency)

Настроить:
- `monocart-reporter` в `playwright.config.ts` (активируется при `COVERAGE=true`)
- Build-конфигурация `coverage` в `apps/client/project.json` с source maps
- Скрипт `test:playwright:coverage` в `package.json`

Проверить:
- `yarn test:playwright:coverage` генерирует `coverage/playwright/coverage-summary.json`
- HTML-отчёт показывает `.ts`-файлы с подсвеченными строками

**AC этапа:** coverage-отчёт генерируется, показывает source-mapped TypeScript-файлы.

#### Этап 2: CI + badge

Обновить:
- `.github/workflows/ci.yml` — добавить job `integration-tests`
- `.github/workflows/coverage.yml` — добавить шаги для Playwright coverage + badge
- `coverage.yml` → обновить `index.html` — ссылка на Playwright-отчёт
- `README.md` — добавить badge `integration coverage`

Проверить:
- Push в `standalone` → CI job проходит
- Badge отображается в README

**AC этапа:** CI зелёный, badge виден на GitHub.

---

## Слой 6: Roadmap реализации (после Deliverable 1 + 1.5)

### Phase 1: Auth + Layout
- [ ] Page objects: `LoginPage` (расширение `LayoutPage` из Deliverable 1)
- [ ] Тесты: login (8 кейсов), logout (2 кейса), auth-guard (4 кейса)
- [ ] Тесты: header, sidebar, theme, font-scale
- [ ] Image mock helper
- [ ] `data-testid` для всех затронутых компонентов

### Phase 2: Main + Article (просмотр)
- [ ] Mock factories: articles
- [ ] Page objects: `MainPage`, `ArticlePage`
- [ ] Тесты: main-page, article-view, article-tabs

### Phase 3: Article (редактирование) + History
- [ ] Mock factories: history
- [ ] Page objects: `ArticleEditPage`, `DiffPage`, `HistoryPage`
- [ ] Тесты: article-edit, article-moderation, article-history
- [ ] Тесты: history-page, diff-page

### Phase 4: Pictures
- [ ] Mock factories: pictures
- [ ] Page objects: `PictureGalleryPage`, `PictureDetailPage`
- [ ] Тесты: picture-gallery, picture-detail, picture-moderation

### Phase 5: Editor + Search
- [ ] Тесты: editor, search

### Phase 6: Кроссбраузерность + полировка
- [ ] Добавить projects в `playwright.config.ts`: Firefox, WebKit
- [ ] Добавить мобильные projects: Mobile Chrome (Pixel 5), Mobile Safari (iPhone 13)
- [ ] Отдельный CI workflow для кроссбраузерных прогонов (по расписанию/вручную, не на каждый PR)
- [ ] Оптимизация параллелизации в CI
- [ ] Документация для разработчиков: как писать новые тесты

### Миграция из client-e2e
По мере реализации фаз — тесты с замоканным API переносятся из `apps/client-e2e/` в `testing/playwright/` и удаляются из `client-e2e`. В `client-e2e` остаются только E2E-тесты, требующие реального бэкенда. После полного переноса — удалить дублирующиеся fixtures/mocks из `client-e2e`.

---

## Принятые решения

1. **Coverage раздельный** — два отдельных бейджа в README: `coverage` (unit, Jest) и `integration coverage` (Playwright). Не мержим, т.к. один тест unit и integration могут покрывать одни и те же строки — объединённое число будет завышено. Разные типы покрытия дают разную информацию.

2. **Source maps изолированы от прода** — отдельная build-конфигурация (`build:coverage`) с source maps, которая используется только для coverage-прогонов. В production-сборку source maps не попадают. Реализация:
   - Добавить конфигурацию `coverage` в `project.json` клиента с `"sourceMap": true`
   - Команда `test:playwright:coverage` собирает через эту конфигурацию
   - `webServer.command` в playwright.config динамически выбирает build в зависимости от env `COVERAGE`

3. **V8 coverage только в Chromium** — Firefox/WebKit прогоны проверяют кроссбраузерную функциональность, но coverage считается только по Chromium (ограничение V8 API).

4. **E2E с реальным бэкендом остаются в `apps/client-e2e/`** — не переносим, не трогаем. Команда `yarn e2e` по-прежнему запускает их. Новые integration-тесты — отдельная команда `yarn test:playwright`.

5. **CI без Docker** — GitHub Actions runner + `actions/setup-node` + `npx playwright install --with-deps`. Бэкенд не нужен (всё замокировано), Docker избыточен.

6. **Приоритет покрытия фич**: auth → main → article (просмотр) → article (редактирование) → picture → history → editor → search.

7. **Полнота тестов** — полный набор: happy path + error states + edge cases для каждой фичи.

8. **Visual regression отложен** — с мокированными данными (SVG-placeholder, шаблонные тексты) ценность скриншот-тестов низкая. Добавить когда появятся реалистичные mock-данные.

9. **Fixture-функции вместо builder-класса** — мокирование API через набор fixture-функций (`mockAuthApi`, `mockArticlesApi`), а не через builder-класс `MockApi`. Идиоматичный Playwright-подход, проще и без лишнего слоя абстракции.

10. **Нотификации — отдельный хелпер** — snackbar не принадлежит конкретной странице, поэтому вынесен из `BasePage` в `helpers/notification.ts`.
