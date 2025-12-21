# План реализации авторизации Angular + Yii1

## Обзор архитектуры

### Текущее состояние
- **Frontend**: Angular 20 с SSR (apps/client), Express сервер
- **Backend**: Yii1 (legacy-drevo-yii) с существующим модулем user
- **Существующая система**: Users модель, WebUser компонент, UserIdentity, роли (guest → user → moder → admin)

### Целевая архитектура
```
┌─────────────────────┐         ┌─────────────────────┐
│   Angular SSR       │         │     Yii1 Backend    │
│   (Express)         │◄───────►│                     │
│                     │  CORS   │  /api/auth/*        │
│  - AuthService      │  HTTP-  │  - login            │
│  - AuthInterceptor  │  only   │  - logout           │
│  - AuthGuard        │  Cookie │  - me               │
│                     │         │                     │
└─────────────────────┘         └─────────────────────┘
```

### Security Best Practices (реализуем)
1. **HTTP-only Cookies** - токен сессии недоступен из JavaScript (XSS protection)
2. **CSRF Token + Origin/Referer validation** - **основная защита** от CSRF (обязательный токен в заголовке `X-CSRF-Token` + проверка Origin/Referer для POST/PUT/DELETE)
3. **SameSite=None; Secure** (production) / **SameSite=Lax** (dev) — см. раздел "Cookie Policy" ниже
4. **Серверные сессии** - состояние хранится на сервере, не в JWT
5. **Secure flag** - куки только через HTTPS (в production)
6. **Browser-only API** - API предназначен для браузерных клиентов (завязка на Origin/Referer)

### ⚠️ Cookie Policy: Cross-Site vs Same-Site

**Критически важно:** `new.drevo-info.ru` и `drevo-info.ru` — это **cross-site**, не same-site!

```
┌─────────────────────────────────────────────────────────────────┐
│                   Site vs Origin (RFC 6265bis)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Registrable domain = eTLD+1 (effective TLD + 1 label)          │
│                                                                  │
│  new.drevo-info.ru  →  registrable domain: drevo-info.ru        │
│  drevo-info.ru      →  registrable domain: drevo-info.ru        │
│                                                                  │
│  ✅ Same registrable domain = same-site? НЕТ для cookies!       │
│                                                                  │
│  Браузеры (Chrome 80+) используют "schemeful same-site":        │
│  - same-site только если схема + registrable domain совпадают   │
│  - НО для XHR/fetch c withCredentials это cross-site request!   │
│                                                                  │
│  Результат при SameSite=Lax:                                    │
│  - Top-level navigation (клик по ссылке): cookie отправляется   │
│  - XHR/fetch (GET /api/auth/me): cookie НЕ отправляется! ❌     │
│                                                                  │
│  Это значит: авторизация "не держится" — GET /api/auth/me       │
│  в браузере не увидит сессию → всегда isAuthenticated: false    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Решение для Production:** `SameSite=None; Secure`
- Cookie отправляется на cross-site запросы
- **Обязательно** `Secure` (иначе браузер игнорирует cookie)
- CSRF + Origin/Referer validation остаются **основной защитой**

**Альтернатива (если хотим Lax):**
- Перенести фронт на `drevo-info.ru` (например, `drevo-info.ru/app/`)
- Или API на `api.new.drevo-info.ru` (тот же site что и фронт)
- Тогда same-site и Lax будет работать

### SSR Strategy (упрощённый подход)
```
┌─────────────────────────────────────────────────────────────────┐
│                    Client-Only Auth Strategy                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SSR (сервер):                                                  │
│  - Рендерит страницы как для гостя                              │
│  - НЕ проверяет авторизацию                                     │
│  - HTML кешируется (один для всех)                              │
│                                                                  │
│  Client (браузер):                                              │
│  - При hydration вызывает GET /api/auth/me                      │
│  - Обновляет UI (skeleton → реальное состояние)                 │
│  - Небольшое мелькание UI (стандартно для SPA)                  │
│                                                                  │
│  Почему так:                                                    │
│  ✅ Проще реализация                                            │
│  ✅ SSR кешируется                                              │
│  ✅ Меньше нагрузка на backend                                  │
│  ✅ Как делают GitHub, Twitter, YouTube                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### CSRF Protection Strategy
```
┌─────────────────────────────────────────────────────────────────┐
│                     CSRF Protection Flow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Angular получает CSRF токен при инициализации:              │
│     GET /api/auth/csrf → { csrfToken: "abc123..." }             │
│                                                                  │
│  2. Angular добавляет токен ко ВСЕМ state-changing запросам:    │
│     POST /api/auth/login   ← включая login!                     │
│     POST /api/auth/logout                                       │
│     Headers: { X-CSRF-Token: "abc123..." }                      │
│                                                                  │
│  3. Backend валидирует:                                         │
│     - GET запросы: CSRF не проверяется (read-only)              │
│     - POST/PUT/DELETE: X-CSRF-Token + Origin validation         │
│                                                                  │
│  4. При login: регенерация session_id + CSRF токена             │
│     (защита от Session Fixation)                                │
│                                                                  │
│  ⚠️  Production: SameSite=None; Secure (cross-site запросы)     │
│      new.drevo-info.ru → drevo-info.ru = cross-site для XHR!    │
│      CSRF-токен + Origin/Referer — основная защита.             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Окружения

| Окружение | Angular | Yii Backend | Примечание |
|-----------|---------|-------------|------------|
| Development | localhost:4200 | localhost:4200/api (proxy) | Same-origin через Angular proxy, HTTP |
| Production | new.drevo-info.ru | drevo-info.ru | Субдомены, **HTTPS** |

### Dev Environment Strategy (РЕШЕНИЕ)

**Выбран вариант B: Same-origin через reverse-proxy**

Почему не cross-origin dev:
- `SameSite=Lax` + разные домены (localhost:4200 → drevo-local.ru) = нестабильная работа cookies в разных браузерах
- `SameSite=None` без `Secure` блокируется современными браузерами
- HTTPS в dev (mkcert) добавляет сложность

Решение:
- Angular dev-server проксирует `/api/*` → `http://drevo-local.ru/api/*`
- Браузер видит один origin (localhost:4200)
- Cookies работают стабильно с `SameSite=Lax`
- Никаких CORS заголовков в dev не нужно
- Настроить в `angular.json` или `proxy.conf.json`

---

## Разбивка на задачи (Tasks)

### Phase 1: Backend API (Yii1)

#### Task 1.1: Создание базового API контроллера ✅
**Файлы:** 
- `protected/controllers/api/BaseApiController.php`

**Описание:**
- Базовый контроллер для всех API endpoints
- **CSRF защита** для state-changing операций (POST, PUT, DELETE, PATCH)
- GET запросы не требуют CSRF (должны быть idempotent)
- JSON response helper methods
- Error handling

**CSRF Implementation:**
- Токен хранится в серверной сессии `$_SESSION['_csrfToken']`
- Клиент получает токен через `GET /api/*/csrf`
- Клиент передаёт токен в заголовке `X-CSRF-Token`
- Timing-safe сравнение токенов (`hash_equals`)
- **Все state-changing запросы требуют CSRF (включая login!)**

**Origin/Referer Validation (основная защита вместе с CSRF):**
- Для всех POST/PUT/DELETE проверять `Origin` или `Referer` заголовок
- Разрешённые origins: `https://new.drevo-info.ru` (prod), через proxy в dev
- Если `Origin` отсутствует — проверять `Referer`
- Почему нужно: `SameSite=Lax` не защищает между субдоменами (same-site ≠ same-origin)

**⚠️ Browser-only API (уточнённые правила):**
API предназначен для браузерных клиентов. Origin/Referer проверка применяется **только к state-changing эндпоинтам**.

**Матрица проверок безопасности по эндпоинтам:**

| Endpoint | Method | CSRF Token | Origin/Referer | Примечание |
|----------|--------|------------|----------------|------------|
| `/api/auth/csrf` | GET | ❌ нет | ❌ нет | Публичный, нужен для получения токена |
| `/api/auth/me` | GET | ❌ нет | ❌ нет | Read-only, безопасен без проверок |
| `/api/auth/login` | POST | ✅ да | ✅ да | State-changing, полная защита |
| `/api/auth/logout` | POST | ✅ да | ✅ да | State-changing, полная защита |
| `/api/*` (GET) | GET | ❌ нет | ❌ нет | Read-only операции |
| `/api/*` (POST/PUT/DELETE/PATCH) | * | ✅ да | ✅ да | Все state-changing операции |

**Логика проверки Origin/Referer:**
1. Для state-changing запросов проверять наличие `Origin` или `Referer`
2. Если **оба отсутствуют** → 403 Forbidden с `errorCode: 'ORIGIN_REQUIRED'`
3. Если **присутствует хотя бы один** → валидировать против whitelist
4. GET `/api/auth/csrf` и GET `/api/auth/me` — **не проверять** Origin/Referer (иначе proxy/dev ломается)

**Почему GET endpoints без Origin-check:**
- Proxy серверы могут не передавать Origin для GET
- E2E тесты и dev-окружение могут иметь нестандартные Origin
- GET операции idempotent и не меняют состояние
- Сессионная cookie всё равно нужна для доступа к данным

**Session Fixation Protection:**
- При успешном login: `session_regenerate_id(true)` — **обязательно**
- Дополнительно: регенерация CSRF-токена
- При повышении привилегий: повторная регенерация session_id
- Важно: регенерация только CSRF-токена НЕ защищает от Session Fixation

**Acceptance Criteria:**
- [x] Контроллер возвращает JSON responses
- [x] Правильные HTTP status codes
- [x] Стандартный формат ответа: `{success: bool, data?: any, error?: string}`
- [x] CSRF валидация для POST/PUT/DELETE запросов
- [x] GET запросы работают без CSRF токена
- [x] Origin/Referer валидация для state-changing запросов
- [x] 403 с `ORIGIN_REQUIRED` если оба заголовка отсутствуют
- [x] 403 с `ORIGIN_NOT_ALLOWED` если origin не в whitelist
- [x] Security headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY`, `Content-Security-Policy`
- [x] Same-origin запросы разрешены (для dev-proxy)

**Дополнительно реализовано:**
- Тестовый контроллер `TestApiController` с endpoints `/api/test/ping`, `/api/test/csrf`, `/api/test/echo`, `/api/test/auth`
- Поддержка заголовка `X-XSRF-TOKEN` (альтернатива `X-CSRF-Token` для Angular)
- Обработка исключений с JSON response вместо HTML

**Тестирование:** curl запросы к endpoint

---

#### Task 1.2: Настройка CORS (только Production) ✅
**Файлы:**
- `protected/components/CorsFilter.php`
- `protected/config/main.php` (добавление allowed origins)

**Описание:**
- Создать CORS filter для всех `/api/*` endpoints
- Разрешить origin: `https://new.drevo-info.ru` (только production)
- Разрешить credentials (cookies)

**⚠️ CORS Contract (ОБЯЗАТЕЛЬНЫЕ требования):**

```
┌─────────────────────────────────────────────────────────────────┐
│                      CORS Response Headers                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Access-Control-Allow-Origin: https://new.drevo-info.ru         │
│  ├── КОНКРЕТНОЕ значение, НЕ wildcard (*)                       │
│  └── Wildcard запрещён при credentials: true                    │
│                                                                  │
│  Access-Control-Allow-Credentials: true                         │
│  └── Обязательно для передачи cookies                           │
│                                                                  │
│  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
│                                                                  │
│  Access-Control-Allow-Headers: Content-Type, X-CSRF-Token       │
│  └── X-CSRF-Token — кастомный заголовок, требует CORS allow     │
│                                                                  │
│  Access-Control-Max-Age: 86400                                  │
│  └── Кеширование preflight на 24 часа                           │
│                                                                  │
│  Vary: Origin                                                   │
│  └── ОБЯЗАТЕЛЬНО! Иначе прокси/CDN закешируют CORS для          │
│      одного origin и сломают для другого                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**OPTIONS Preflight Handling:**
- При незнакомом origin — не добавлять CORS headers (браузер заблокирует)
- При знакомом origin — добавить все CORS headers
- Для OPTIONS запросов — вернуть 204 No Content и **НЕ** продолжать к контроллеру

**Важно:**
- **Dev не требует CORS** — Angular proxy делает запросы same-origin
- CORS нужен только для production (new.drevo-info.ru → drevo-info.ru)
- `Vary: Origin` **обязателен** — без него CDN/proxy закешируют ответ с одним Origin и сломают для других
- Preflight (OPTIONS) должен возвращать 204 и **не** доходить до контроллера

**Acceptance Criteria:**
- [x] OPTIONS preflight возвращает 204 с правильными CORS headers
- [x] `Access-Control-Allow-Origin` = конкретный origin, не `*`
- [x] `Access-Control-Allow-Credentials: true` присутствует
- [x] `Vary: Origin` присутствует в КАЖДОМ ответе /api/*
- [x] `Access-Control-Allow-Headers` включает `X-CSRF-Token`
- [x] Cookies передаются cross-origin с withCredentials (см. Task 1.6)
- [x] Старый сайт не затронут (CORS только для /api/*)
- [x] Незнакомые origins не получают CORS headers

**Файлы реализации:**
- `protected/components/CorsFilter.php` — CORS фильтр
- `protected/controllers/api/BaseApiController.php` — интеграция фильтра

**E2E Тесты:** `apps/client-e2e/src/api/api-cors.spec.ts`

**Тестирование:** curl с Origin header — preflight должен вернуть 204 + все CORS headers; незнакомый origin должен быть без Access-Control-Allow-Origin

---

#### Task 1.3: API endpoint для логина ✅
**Файлы:**
- `protected/controllers/api/AuthApiController.php`

**Описание:**
- POST `/api/auth/login`
- Принимает: `{username: string, password: string, rememberMe?: boolean}`
- Использует существующий UserIdentity для аутентификации
- Устанавливает HTTP-only session cookie
- **Регенерирует CSRF токен** после успешного логина (защита от session fixation)
- Возвращает данные пользователя (без пароля) + новый CSRF токен

**Security Notes:**
- **Login требует CSRF токен** (защита от Login CSRF — атака "вход в чужой аккаунт")
- Клиент получает CSRF через `GET /api/auth/csrf` ДО вызова login
- После успешного логина:
  1. `session_regenerate_id(true)` — защита от Session Fixation
  2. `regenerateCsrfToken()` — обновление CSRF токена
- Новый CSRF токен возвращается в response
- Дополнительно: валидация Origin/Referer заголовка

**Acceptance Criteria:**
- [x] Успешный логин возвращает user data + новый csrfToken + устанавливает cookie
- [x] Неверный пароль возвращает 401
- [x] Неактивированный аккаунт возвращает специфичную ошибку (ACCOUNT_NOT_ACTIVE)
- [x] Remember Me работает (30 дней vs session cookie)
- [x] **Запрос без CSRF токена возвращает 403**
- [x] **Запрос с неверным Origin возвращает 403**

**Тестирование:** curl POST с JSON body + X-CSRF-Token header

---

#### Task 1.3.1: API endpoint для CSRF токена ✅
**Файлы:**
- `protected/controllers/api/AuthApiController.php` (метод `actionCsrf`)

**Описание:**
- GET `/api/auth/csrf`
- Возвращает CSRF токен для текущей сессии
- Не требует авторизации (токен нужен для login)
- **Не требует Origin/Referer проверки** (см. матрицу в Task 1.1)
- **Обязательные заголовки ответа** (security hardening):
  - `Cache-Control: no-store` — токен не должен кешироваться
  - `Pragma: no-cache` — для совместимости с HTTP/1.0 прокси
  - `Content-Type: application/json; charset=utf-8` — явный тип контента
  - `X-Content-Type-Options: nosniff` — запрет MIME-sniffing

**Response Format:** `{success: true, data: {csrfToken: "64-character-hex-string..."}}`

**Response Headers:** `Cache-Control: no-store`, `Pragma: no-cache`, `Content-Type: application/json`, `X-Content-Type-Options: nosniff`

**Acceptance Criteria:**
- [x] Endpoint возвращает CSRF токен
- [x] Токен консистентен для одной сессии
- [x] Токен регенерируется после login
- [x] Cache-Control: no-store в response headers
- [x] X-Content-Type-Options: nosniff в response headers (добавлено в BaseApiController)

**Тестирование:** curl GET к `/api/auth/csrf`, проверить заголовки

---

#### Task 1.3.2: Общие Security Headers для /api/* ✅
**Файлы:**
- `protected/controllers/api/BaseApiController.php` (модификация)

**Описание:**
Добавить security headers для всех API endpoints в базовом контроллере (в `beforeAction()` или `init()`):
- `X-Content-Type-Options: nosniff`
- `Content-Type: application/json; charset=utf-8`
- `Referrer-Policy: same-origin`
- `X-Frame-Options: DENY` — предотвращает clickjacking
- `Content-Security-Policy` — строгая политика для JSON API

**Заголовки по типу endpoint:**

| Header | `/api/auth/csrf` | Другие GET | POST/PUT/DELETE |
|--------|------------------|------------|------------------|
| `Content-Type: application/json` | ✅ | ✅ | ✅ |
| `X-Content-Type-Options: nosniff` | ✅ | ✅ | ✅ |
| `Referrer-Policy: same-origin` | ✅ | ✅ | ✅ |
| `X-Frame-Options: DENY` | ✅ | ✅ | ✅ |
| `Content-Security-Policy` | ✅ | ✅ | ✅ |
| `Cache-Control: no-store` | ✅ | ❌ опционально | ❌ опционально |

**Почему важно:**
- `nosniff` — предотвращает MIME-sniffing атаки
- `Referrer-Policy: same-origin` — Referer отправляется только на same-origin (меньше утечек)
- `Content-Type` — явно указываем тип, не полагаемся на автоопределение
- `X-Frame-Options: DENY` — API не должен встраиваться в iframe (защита от clickjacking)
- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'` — строгая CSP для JSON API

**Acceptance Criteria:**
- [x] Все API endpoints возвращают `X-Content-Type-Options: nosniff`
- [x] Все API endpoints возвращают `Content-Type: application/json; charset=utf-8`
- [x] Все API endpoints возвращают `Referrer-Policy: same-origin`
- [x] Все API endpoints возвращают `X-Frame-Options: DENY`
- [x] Все API endpoints возвращают `Content-Security-Policy` с строгой политикой

**Тестирование:** curl к любому API endpoint, проверить headers

---

#### Task 1.4: API endpoint для текущего пользователя ✅
**Файлы:**
- `protected/controllers/api/AuthApiController.php` (метод `actionMe`)

**Описание:**
- GET `/api/auth/me`
- Возвращает данные текущего пользователя на основе session cookie
- Если не авторизован - возвращает `{isAuthenticated: false}`

**Response Format:** `{success: true, data: {isAuthenticated: true, user: {login, name, email, role, permissions}}}`

**Acceptance Criteria:**
- [x] Авторизованный пользователь получает свои данные
- [x] Гость получает isAuthenticated: false
- [x] Пароль НЕ возвращается

**Тестирование:** curl GET с cookie к `/api/auth/me`

---

#### Task 1.5: API endpoint для выхода ✅
**Файлы:**
- `protected/controllers/api/AuthApiController.php` (метод `actionLogout`)

**Описание:**
- POST `/api/auth/logout`
- **Требует CSRF токен** в заголовке `X-CSRF-Token`
- Уничтожает серверную сессию
- Удаляет session cookie

**Acceptance Criteria:**
- [x] После logout, `/api/auth/me` возвращает isAuthenticated: false
- [x] Cookie удаляется
- [x] Запрос без CSRF токена возвращает 403

**Тестирование:** curl POST с X-CSRF-Token заголовком, затем GET /me

---

#### Task 1.6: Настройка сессий для API ✅
**Файлы:**
- `protected/components/ApiSessionConfig.php` — компонент для настройки session cookies
- `protected/config/main.php` — production конфигурация
- `protected/config/main-local.php` — development конфигурация

**Описание:**
- Настроить cookie параметры для сессий по окружениям:

**⚠️ Production (cross-site: new.drevo-info.ru → drevo-info.ru):**
- `session.cookie_httponly` = 1
- `session.cookie_secure` = 1 (HTTPS обязателен)
- `session.cookie_samesite` = 'None' (cross-site запросы!)
- domain НЕ устанавливаем (host-only cookie)

**Development (same-origin через proxy):**
- `session.cookie_httponly` = 1
- `session.cookie_secure` = 0 (HTTP ok в dev)
- `session.cookie_samesite` = 'Lax' (proxy = same-origin)

**Почему SameSite=None в Production:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Browser: https://new.drevo-info.ru                             │
│           ↓ fetch('/api/auth/me', {credentials: 'include'})     │
│  API:     https://drevo-info.ru/api/auth/me                     │
│                                                                  │
│  Это CROSS-SITE запрос (разные registrable domains для XHR)!    │
│                                                                  │
│  SameSite=Lax: cookie НЕ отправится → всегда "не авторизован"   │
│  SameSite=None; Secure: cookie отправится → авторизация работает│
│                                                                  │
│  Защита: CSRF Token + Origin/Referer (уже реализовано)          │
└─────────────────────────────────────────────────────────────────┘
```

**Почему НЕ ставить Domain:**
- Без `Domain` cookie является host-only (отправляется только на точный хост `drevo-info.ru`)
- С `Domain=.drevo-info.ru` cookie отправляется на ВСЕ субдомены (*.drevo-info.ru)
- Host-only = минимальная поверхность атаки (subdomain takeover не даст доступ к cookie)

**Реализация:**
- Создан компонент `ApiSessionConfig` — настраивает session cookies при инициализации
- Компонент добавлен в preload для обеих конфигураций (main.php, main-local.php)
- Auto-detect окружения по YII_DEBUG флагу
- E2E тесты в `apps/client-e2e/src/api/api-session.spec.ts`

**Acceptance Criteria:**
- [x] Production: Cookies имеют `Secure; HttpOnly; SameSite=None`, без Domain
- [x] Production: cookie отправляется на cross-site XHR запросы
- [x] Development: Cookies работают с `SameSite=Lax` (proxy = same-origin)
- [x] Сессии работают между Angular и Yii в обоих окружениях
- [x] `/api/auth/me` корректно возвращает авторизованного пользователя в production

**Тестирование:** Проверить cookie в DevTools → Application → Cookies (должно быть: SameSite=None, Secure=true, HttpOnly=true). Функциональный тест: залогиниться → GET /api/auth/me должен вернуть isAuthenticated: true. E2E тесты: 10 тестов в api-session.spec.ts.

---

### Phase 2: Frontend (Angular)

#### Task 2.1: Environment configuration
**Файлы:**
- `apps/client/src/environments/environment.ts`
- `apps/client/src/environments/environment.prod.ts`

**Описание:**
- Добавить `apiUrl` для backend
- Development: `http://drevo-local.ru`
- Production: `https://drevo-info.ru`

**Acceptance Criteria:**
- [ ] API URL доступен через environment
- [ ] Правильный URL в каждом окружении

**Тестирование:** Build для разных конфигураций

---

#### Task 2.2: User и Auth модели/интерфейсы
**Файлы:**
- `libs/shared/src/lib/models/user.d.ts`
- `libs/shared/src/lib/models/auth.d.ts`
- `libs/shared/src/index.ts` (export)

**Описание:**
- `User` interface: login, name, email, role, permissions
- `AuthResponse` interface
- `LoginRequest` interface

**Acceptance Criteria:**
- [ ] Типы экспортируются из @drevo-web/shared
- [ ] Типы соответствуют API response

**Тестирование:** TypeScript compilation

---

#### Task 2.3: AuthService
**Файлы:**
- `apps/client/src/app/services/auth/auth.service.ts`

**Описание:**
- `login(username, password, rememberMe): Observable<User>`
- `logout(): Observable<void>`
- `getCurrentUser(): Observable<AuthState>`
- `getCsrfToken(): Observable<string>` - получение CSRF токена
- `user$: BehaviorSubject<User | null>` - реактивное состояние
- `isAuthenticated$: Observable<boolean>`
- Использовать `withCredentials: true` для всех запросов

**⚠️ CSRF Token Contract (КРИТИЧЕСКИ ВАЖНО):**

Проблема: interceptor подписывается на `csrfToken$`, и если токен не инициализирован — запрос зависнет навечно.

```
┌─────────────────────────────────────────────────────────────────┐
│                  CSRF Token Lifecycle Contract                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. ИНИЦИАЛИЗАЦИЯ (при старте приложения в браузере):           │
│     - AuthService constructor → initCsrfToken()                 │
│     - GET /api/auth/csrf → csrfTokenReady$.next(token)          │
│     - Timeout 10 секунд → csrfTokenReady$.error(TimeoutError)   │
│                                                                  │
│  2. ГАРАНТИЯ ЭМИССИИ:                                           │
│     - csrfToken$ ВСЕГДА должен эмитить значение или ошибку      │
│     - НЕ должен зависать бесконечно                             │
│     - При ошибке сети → retry 3 раза → error                    │
│                                                                  │
│  3. ОБНОВЛЕНИЕ ПОСЛЕ LOGIN:                                     │
│     - Login response содержит новый csrfToken                   │
│     - Атомарно: csrfTokenReady$.next(newToken)                  │
│                                                                  │
│  4. ОБНОВЛЕНИЕ ПОСЛЕ LOGOUT:                                    │
│     - refreshCsrfToken() → GET /api/auth/csrf                   │
│     - csrfTokenReady$.next(newToken)                            │
│                                                                  │
│  5. RETRY НА 403 CSRF_VALIDATION_FAILED:                        │
│     - refreshCsrfToken() обновляет csrfTokenReady$              │
│     - Interceptor делает retry с новым токеном (один раз)       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation Requirements:**
- `initCsrfToken()` вызывается в constructor при `isPlatformBrowser`
- Timeout 10 секунд + retry 3 раза для HTTP запроса
- `csrfTokenReady$` — ReplaySubject(1), эмитит токен или ошибку
- `csrfToken$` getter с дополнительным timeout
- `refreshCsrfToken()` обновляет shared stream `csrfTokenReady$`
- При ошибке — эмитить ошибку в ReplaySubject (не оставлять зависшим)

**⚠️ Auth Operation Lock (защита от race conditions):**

Проблема: при login/logout происходит `session_regenerate_id()` + новый CSRF токен. 
Если параллельно выполняются другие state-changing запросы, они могут:
- Использовать старый CSRF токен → 403
- Получить гонку между старой и новой сессией

**Решение: Lock/Queue механизм**
- `authOperationInProgress$` — BehaviorSubject<boolean>(false)
- `isAuthOperationInProgress$` — публичный getter для interceptor
- В `login()` и `logout()`: устанавливать lock в начале, снимать в `finalize()`
- После login: атомарно обновлять CSRF токен из response
- После logout: вызывать `refreshCsrfToken()`

**Acceptance Criteria:**
- [ ] Методы login/logout/getCurrentUser работают
- [ ] CSRF токен получается и хранится
- [ ] State обновляется реактивно
- [ ] Credentials передаются с запросами
- [ ] **Lock устанавливается на время login/logout**
- [ ] **CSRF токен обновляется атомарно после login**

**Тестирование:** Unit tests с HttpClientTestingModule

---

#### Task 2.4: Auth HTTP Interceptor
**Файлы:**
- `apps/client/src/app/interceptors/auth.interceptor.ts`
- `apps/client/src/app/app.config.ts` (регистрация)

**Описание:**
- Автоматически добавлять `withCredentials: true` к API запросам
- **Автоматически добавлять `X-CSRF-Token` заголовок** для POST/PUT/DELETE/PATCH
- Обрабатывать 401 responses (redirect to login или refresh state)
- Обрабатывать 403 CSRF_VALIDATION_FAILED (перезапросить токен и retry)

**⚠️ Queue для state-changing запросов во время auth операций:**

Проблема: если пользователь кликает "Войти", а параллельно выполняется другой POST запрос,
этот запрос может использовать старый CSRF токен и получить 403.

**Решение: Interceptor ждёт завершения auth операции**
- Только для `/api/*` запросов
- Добавлять `withCredentials: true` ко всем API запросам
- Для state-changing (POST/PUT/DELETE/PATCH) кроме login/logout:
  - Ждать `isAuthOperationInProgress$ === false`
  - Добавлять `X-CSRF-Token` header
  - При 403 CSRF_VALIDATION_FAILED — перезапросить токен и retry один раз
- Для auth endpoints — добавлять CSRF напрямую без ожидания lock
- GET запросы — только credentials, без CSRF

**Acceptance Criteria:**
- [ ] Все запросы к API имеют credentials
- [ ] CSRF токен добавляется к state-changing запросам
- [ ] **State-changing запросы ждут завершения login/logout**
- [ ] **При 403 CSRF_VALIDATION_FAILED — retry с новым токеном (один раз)**
- [ ] 401 обрабатывается корректно

**Тестирование:** Unit tests, интеграционные тесты с race conditions

---

#### Task 2.5: AuthStatusComponent (UI)
**Файлы:**
- `apps/client/src/app/components/auth-status/auth-status.component.ts`
- `apps/client/src/app/components/auth-status/auth-status.component.html`
- `apps/client/src/app/components/auth-status/auth-status.component.scss`

**Описание:**
- Показывает "Войти" кнопку для гостей
- Показывает "Имя пользователя" + "Выйти" для авторизованных
- Использует AuthService.user$ для реактивного обновления

**Acceptance Criteria:**
- [ ] Правильное отображение для гостя
- [ ] Правильное отображение для авторизованного
- [ ] UI обновляется при login/logout без reload

**Тестирование:** Visual testing, unit tests

---

#### Task 2.6: LoginPageComponent
**Файлы:**
- `apps/client/src/app/pages/login/login.component.ts`
- `apps/client/src/app/pages/login/login.component.html`
- `apps/client/src/app/pages/login/login.component.scss`

**Описание:**
- Форма: username, password, rememberMe checkbox
- Валидация (required fields)
- Показ ошибок от сервера
- Redirect после успешного логина

**Acceptance Criteria:**
- [ ] Форма валидируется
- [ ] Ошибки отображаются
- [ ] Успешный логин редиректит на главную
- [ ] Loading state во время запроса

**Тестирование:** Unit tests, manual testing

---

#### Task 2.7: Роутинг для логина
**Файлы:**
- `apps/client/src/app/app.routes.ts`

**Описание:**
- Добавить route `/login` → LoginPageComponent
- Опционально: AuthGuard для защищённых роутов (подготовка)

**Acceptance Criteria:**
- [ ] /login route работает
- [ ] Lazy loading компонента

**Тестирование:** Navigation testing

---

#### Task 2.8: Интеграция AuthStatusComponent в layout
**Файлы:**
- `apps/client/src/app/app.component.html`
- `apps/client/src/app/app.component.ts`

**Описание:**
- Добавить AuthStatusComponent в header/layout
- Инициализировать AuthService при старте приложения

**Acceptance Criteria:**
- [ ] Компонент отображается на всех страницах
- [ ] При загрузке страницы проверяется auth state

**Тестирование:** Visual, manual testing

---

### Phase 3: SSR Compatibility (упрощённый подход)

> **Решение:** Авторизация проверяется только на клиенте. SSR рендерит страницы как для гостя.
> Это стандартный подход для большинства SPA (GitHub, Twitter, YouTube).

#### Task 3.1: Client-only Auth Check
**Файлы:**
- `apps/client/src/app/services/auth/auth.service.ts` (модификация)

**Описание:**
- Использовать `isPlatformBrowser` для проверки платформы
- **На сервере:** не делать HTTP запросы к auth API, возвращать "guest" state
- **На клиенте:** при hydration вызывать `/api/auth/me`
- Показывать skeleton/placeholder пока загружается auth state

**Почему так:**
- ✅ SSR HTML кешируется (один для всех пользователей)
- ✅ Меньше нагрузка на backend
- ✅ Нет проблем с cookie forwarding
- ✅ Проще отладка
- ⚠️ Небольшое мелькание UI (приемлемо)

**Implementation:** В `checkAuth()` использовать `isPlatformBrowser` — на сервере возвращать guest state, на клиенте делать HTTP запрос.

**Acceptance Criteria:**
- [ ] SSR не падает при рендеринге
- [ ] На клиенте auth state корректно загружается
- [ ] Нет hydration mismatch ошибок

**Тестирование:** SSR build + manual testing

---

#### Task 3.2: Loading State для AuthStatusComponent
**Файлы:**
- `apps/client/src/app/components/auth-status/auth-status.component.ts`
- `apps/client/src/app/components/auth-status/auth-status.component.html`

**Описание:**
- Добавить `isLoading` state
- Показывать placeholder/skeleton пока auth не загружен
- Избежать мелькания "Войти" → "Имя пользователя"

**Implementation:** Три состояния: isLoading → skeleton, user → имя + выход, иначе → кнопка "Войти"

**Acceptance Criteria:**
- [ ] Skeleton показывается при загрузке
- [ ] Плавный переход к финальному состоянию

**Тестирование:** Visual testing

---

### Phase 4: Testing & Polish

#### Task 4.1: E2E тесты авторизации
**Файлы:**
- `apps/client-e2e/src/auth.spec.ts`

**Описание:**
- Тест: неавторизованный пользователь видит "Войти"
- Тест: успешный логин
- Тест: неверный пароль
- Тест: logout

**Acceptance Criteria:**
- [ ] Все E2E тесты проходят

---

#### Task 4.2: Unit тесты
**Файлы:**
- `apps/client/src/app/services/auth/auth.service.spec.ts`
- `apps/client/src/app/components/auth-status/auth-status.component.spec.ts`
- `apps/client/src/app/pages/login/login.component.spec.ts`

**Acceptance Criteria:**
- [ ] Coverage > 80% для auth-related кода

---

#### Task 4.3: Документация
**Файлы:**
- `docs/auth-api.md`

**Описание:**
- API документация для auth endpoints
- Примеры запросов/ответов
- Описание cookie handling

---

## Порядок выполнения (рекомендуемый)

```
Week 1: Backend Foundation ✅ COMPLETE
├── Task 1.1: Base API Controller ✅ DONE
├── Task 1.3.2: Security Headers ✅ DONE
├── Task 1.2: CORS Setup ✅ DONE
├── Task 1.6: Session Configuration ✅ DONE
├── Task 1.3: Login Endpoint ✅ DONE
├── Task 1.3.1: CSRF Endpoint ✅ DONE
├── Task 1.4: /auth/me Endpoint ✅ DONE
└── Task 1.5: Logout Endpoint ✅ DONE

Week 2: Frontend Start
├── Task 2.1: Environment Config
├── Task 2.2: TypeScript Models
└── Task 2.3: AuthService

Week 3: Frontend Core
├── Task 2.4: Auth Interceptor
├── Task 2.5: AuthStatusComponent
└── Task 2.6: LoginPageComponent

Week 4: Integration & SSR
├── Task 2.7: Routing
├── Task 2.8: Layout Integration
├── Task 3.1: Client-only Auth Check
└── Task 3.2: Loading State для AuthStatus

Week 5: Testing
├── Task 4.1: E2E Tests (API tests done: 75 tests passing)
├── Task 4.2: Unit Tests
└── Task 4.3: Documentation
```

---

## API Reference (предварительная)

> **⚠️ Browser-only API:** API предназначен для браузерных клиентов.
> Non-browser клиенты (CLI, серверные скрипты) — ограниченная поддержка:
> - ✅ GET endpoints работают без Origin/Referer
> - ❌ POST/PUT/DELETE требуют Origin или Referer → 403 если оба отсутствуют

### Security Headers (все /api/* endpoints)
`Content-Type: application/json`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`

### GET /api/auth/csrf
**Security:** Не требует CSRF, не требует Origin/Referer (публичный)
**Response Headers:** `Cache-Control: no-store`, `Pragma: no-cache`
**Response 200:** `{success: true, data: {csrfToken: "..."}}`

### POST /api/auth/login
**Security:** Требует CSRF токен + Origin или Referer
**Request Headers:** `X-CSRF-Token`, `Origin` или `Referer`
**Request Body:** `{username, password, rememberMe?}`
**Response 200:** `{success: true, data: {user: {...}, csrfToken: "new-token"}}`
**Response 401:** `{success: false, error: "Invalid credentials", errorCode: "INVALID_CREDENTIALS"}`
**Response 403:** `{success: false, errorCode: "ORIGIN_REQUIRED"}` или `{errorCode: "CSRF_VALIDATION_FAILED"}`

### GET /api/auth/me
**Security:** Не требует CSRF, не требует Origin/Referer (read-only)
**Response 200 (authenticated):** `{success: true, data: {isAuthenticated: true, user: {...}}}`
**Response 200 (guest):** `{success: true, data: {isAuthenticated: false}}`

### POST /api/auth/logout
**Security:** Требует CSRF токен + Origin или Referer
**Request Headers:** `X-CSRF-Token`, `Origin` или `Referer`
**Response 200:** `{success: true}`
**Response 403:** `CSRF_VALIDATION_FAILED` или `ORIGIN_REQUIRED`

---

## Риски и митигация

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| CORS проблемы в dev | Высокая | Тщательная настройка, тестирование на раннем этапе |
| SSR hydration mismatch | Средняя | `isPlatformBrowser` check, SSR всегда рендерит как guest (client-only auth) |
| Cookie не передаётся | Средняя | withCredentials: true, sameSite настройки |
| Сломать старый сайт | Низкая | API endpoints в отдельном namespace /api/ |

> **Примечание по SSR:** Мы используем **client-only auth** стратегию — SSR всегда рендерит 
> страницы как для гостя, auth проверяется только на клиенте при hydration. 
> Это означает:
> - ✅ SSR HTML можно кешировать (один для всех)
> - ✅ Не нужен cookie forwarding между Angular SSR и Yii
> - ✅ Не нужен TransferState для auth state
> - ⚠️ Небольшое мелькание UI при загрузке auth (skeleton → реальное состояние)

---

## Будущие улучшения (вне скоупа)

- OAuth (Google, Yandex) - Phase 2
- Регистрация пользователей
- Password reset flow
- Two-factor authentication
- Redis session storage
- Rate limiting для login endpoint
- Refresh token rotation

---

## Решения по конфигурации

### Cookie Configuration по окружениям

| Параметр | Development | Production |
|----------|-------------|------------|
| `secure` | `false` | `true` |
| `httpOnly` | `true` | `true` |
| `sameSite` | `Lax` | **`None`** |
| `domain` | не устанавливать | **не устанавливать** (host-only) |

> **⚠️ SameSite=None в Production:** Обязательно, т.к. `new.drevo-info.ru → drevo-info.ru` — cross-site для XHR/fetch.
> С `SameSite=Lax` cookie не отправляется на fetch запросы → авторизация не работает.
>
> **Защита при SameSite=None:** CSRF Token + Origin/Referer validation (уже реализовано).
>
> **Domain не устанавливаем:** host-only cookie минимизирует поверхность атаки при subdomain takeover.

### Иерархия CSRF защиты
```
┌─────────────────────────────────────────────────────────────┐
│  1. CSRF Token (X-CSRF-Token header) — ОБЯЗАТЕЛЕН          │
│  2. Origin/Referer validation — ОБЯЗАТЕЛЬНА                │
│  ─────────────────────────────────────────────────────────  │
│  3. SameSite=None; Secure (production) — позволяет         │
│     cross-site запросы, защита через CSRF+Origin           │
│                                                             │
│  ⚠️ new.drevo-info.ru → drevo-info.ru = CROSS-SITE!        │
│     (для XHR/fetch с credentials)                          │
└─────────────────────────────────────────────────────────────┘
```

### Определение окружения в Yii
Проверять `$_SERVER['HTTP_HOST']` на наличие в списке dev-хостов (`drevo-local.ru`, `localhost`)

### CORS Origins
- Development: **не требуется** (Angular proxy = same-origin)
- Production: `https://new.drevo-info.ru`
