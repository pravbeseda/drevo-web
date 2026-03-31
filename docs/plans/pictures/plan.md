# Pictures — План реализации

## Контекст

Создаем галерею иллюстраций: 20000+ картинок, нужна виртуализация DOM. Выбран **Вариант B: VirtualScroller + Justified Layout** (как Google Photos).

**Функциональность:**
- Просмотр превью с поиском и бесконечной подгрузкой (VirtualScroller)
- Justified layout (строки с одинаковой высотой, изображения сохраняют пропорции)
- Hover overlay с анимированным выезжающим блоком информации
- Три контекста: вкладка History (`/history/pictures`), standalone страница (`/pictures`), модалка (пикер)
- Два режима: browse (клик → lightbox → детальная страница) и select (клик → возврат `@{id}@`)
- Lightbox — глобальный overlay для просмотра иллюстрации (с поддержкой кнопки Back)
- Детальная страница `/pictures/:id` с метаданными, редактированием, удалением
- Версионирование изменений картинок с модерацией (как у статей)
- История изменений `/history/pictures` с фильтрами и контролами модератора

## Данные backend

**Таблица `pictures`:**
| Колонка | Тип | Описание |
|---------|-----|----------|
| `pic_id` | int PK | Auto-increment |
| `pic_folder` | varchar(3) | Партиция (e.g. '001') |
| `pic_title` | varchar | Подпись |
| `pic_letter` | varchar(1) | Первая буква заголовка |
| `pic_user` | varchar(32) | Имя пользователя |
| `pic_date` | datetime | Дата |

**Нужно добавить**: `pic_width` int, `pic_height` int — для justified layout нужны размеры ДО рендеринга. Без них невозможно рассчитать строки. Бэкфилл через `getimagesize()`.

**Fallback**: Картинки без `pic_width`/`pic_height` (до завершения бэкфилла) используют дефолтный aspect ratio 3:4 (портретный).

**URL:**
- Полное: `/images/{folder}/{pic_id_padded_6}.jpg`
- Миниатюра: `/pictures/thumbs/{folder}/{pic_id_padded_6}.jpg` (max 400×400)
- Код вставки: `@{pic_id}@`

---

## Архитектура компонентов

### Где живут компоненты

Picture-related компоненты живут в **отдельном feature `features/picture/`**:
1. Pictures — самостоятельная доменная область, не подраздел истории
2. `/history/pictures` — страница истории изменений картинок в features/history
3. Standalone route `/pictures` в `app.routes.ts` lazy-load'ит из pictures feature

### Файловая структура

```
features/picture/
  pages/
    picture-page/                        # Галерея (browse + select mode)
      picture-page.component.ts/html/scss/spec
    picture-detail/                      # Страница /pictures/:id
      picture-detail.component.ts/html/scss/spec
  components/
    picture-card/                        # Карточка миниатюры + hover overlay
      picture-card.component.ts/html/scss/spec
    picture-row/                         # Justified строка из N картинок
      picture-row.component.ts/html/scss/spec
    picture-search-bar/                  # Поисковая строка
      picture-search-bar.component.ts/html/scss/spec
  resolvers/
    picture.resolver.ts                  # ResolveFn: загрузка Picture по :id
    picture.resolver.spec.ts
  services/
    picture-row-builder.ts               # Чистая функция: items[] → PictureRow[]
    picture-row-builder.spec.ts
    picture-state.service.ts             # Feature-scoped: пагинация, строки, resize
    picture-state.service.spec.ts
  picture.routes.ts                      # Feature routes

features/history/
  pages/
    pictures-history/                    # История изменений картинок (D5)
      pictures-history.component.ts/html/scss/spec

app/layout/
  picture-lightbox/                      # Глобальный lightbox overlay (D1)
    picture-lightbox.component.ts/html/scss/spec

app/services/pictures/
  picture-api.service.ts                 # HTTP layer (providedIn: root)
  picture-api.service.spec.ts
  picture.service.ts                     # Domain layer (providedIn: root)
  picture.service.spec.ts
  picture-lightbox.service.ts            # Lightbox state + history (providedIn: root) (D1)
  picture-lightbox.service.spec.ts
  picture.constants.ts                   # Константы
  index.ts                               # Barrel export

libs/shared/src/lib/models/
  dto/picture.dto.ts                     # PictureDto, PicturesListResponseDto
  picture.ts                             # Picture domain model

legacy-drevo-yii/protected/controllers/api/
  PicturesApiController.php              # API контроллер
```

### Маршрутизация

```typescript
// app.routes.ts:
{
    path: 'pictures',
    title: 'Иллюстрации',
    loadChildren: () => import('./features/picture/picture.routes')
        .then(m => m.PICTURES_ROUTES),
},

// picture.routes.ts:
{ path: '', loadComponent: () => import('./pages/picture-page/picture-page.component')
    .then(m => m.PicturePageComponent) },
{ path: ':id', loadComponent: () => import('./pages/picture-detail/picture-detail.component')
    .then(m => m.PictureDetailComponent) },

// history.routes.ts — вкладка истории:
{
    path: 'pictures',
    title: 'История изображений',
    loadComponent: () => import('./pages/pictures-history/pictures-history.component')
        .then(m => m.PicturesHistoryComponent),
},
```

### Dual-mode (browse vs select)

Паттерн SearchComponent — через optional `MODAL_DATA`:
```typescript
private readonly modalData = inject<ModalData<PicturePickerData, string>>(MODAL_DATA, { optional: true });
readonly isSelectMode = computed(() => !!this.modalData);

// Browse: клик → openLightbox(picture)
// Select: клик → modalData.close(`@${picture.id}@`)
```

### Justified Layout

Алгоритм `buildRows()`:
1. Получает массив картинок с `width`/`height` и ширину контейнера
2. Определяет целевую высоту строки (≈200px)
3. Добавляет картинки в строку, пока суммарная ширина (при целевой высоте) ≤ ширины контейнера
4. Масштабирует строку: увеличивает высоту, чтобы строка точно заполнила ширину
5. Результат: `PictureRow[]`, каждая строка с вычисленной высотой и размерами элементов

VirtualScroller виртуализирует строки (не отдельные картинки):
```html
<ui-virtual-scroller [items]="rows()" [totalItems]="totalRows()" ...>
  <ng-template uiVirtualScrollerItem let-row>
    <app-picture-row [row]="row" [mode]="mode()" (pictureClick)="onPictureClick($event)" />
  </ng-template>
</ui-virtual-scroller>
```

При resize контейнера → `ResizeObserver` → пересчет строк (debounced).

### PictureCard — изображение

- `loading="lazy"` на `<img>` — обязательно при 20000+ картинок, даже с виртуализацией (одновременно видимых может быть 50+)
- `alt` атрибут из `picture.title` для accessibility

### Hover Overlay (PictureCard)

```scss
.picture-card {
  position: relative;
  overflow: hidden;

  .overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    transform: translateY(100%);
    transition: transform 0.3s ease;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px;
  }

  &:hover .overlay {
    transform: translateY(0);
  }
}
```

---

## Governance: модерация изменений картинок

### Модель

Модерируемая очередь без истории версий:
- Обычный пользователь: изменения (title, файл, удаление) → pending запись в `picture_pending` → модератор approve/reject
- Модератор: правки напрямую в `pictures`, без pending
- Создание новой картинки (`create`) — без модерации, сразу в `pictures`
- Удаление невозможно, если картинка используется в статьях
- Diff для модератора: текущее состояние из `pictures` vs предложенное из `picture_pending`
- Обработанные pending записи удаляются — история изменений не хранится (сознательное решение, может быть добавлена позже)
- `pictures.pic_date` обновляется при каждом изменении

### Concurrent pending

- **Один пользователь**: новый pending заменяет предыдущий того же пользователя для той же картинки (удаляет старый + cleanup файлов из `pending/`)
- **Разные пользователи**: конкурирующие pending допускаются, блокировки нет
- **Cancel**: пользователь может отменить свой pending. Cleanup файлов из `pending/`
- **Approve**: при approve — применить изменения к `pictures`, удалить обработанный pending. Все остальные pending для того же `pp_pic_id` автоматически удаляются (+ cleanup файлов)
- **Race condition protection**: перед approve/cancel проверка что запись всё ещё существует в `picture_pending`. Если нет → ошибка "Запись уже обработана"
- **Файлы только для `edit_file` / `edit_both`**: `edit_title` и `delete` не создают файлов в `pending/`

### Таблица `picture_pending` (новая)

```sql
CREATE TABLE `picture_pending` (
  `pp_id` int NOT NULL AUTO_INCREMENT,
  `pp_pic_id` int NOT NULL,
  `pp_type` enum('edit_title','edit_file','edit_both','delete') NOT NULL,
  `pp_title` varchar(255) DEFAULT NULL COMMENT 'Предложенный title (для edit_title/edit_both)',
  `pp_width` int DEFAULT NULL COMMENT 'Размеры нового файла (для edit_file/edit_both)',
  `pp_height` int DEFAULT NULL,
  `pp_user` varchar(32) NOT NULL,
  `pp_date` datetime NOT NULL,
  PRIMARY KEY (`pp_id`),
  KEY `idx_pp_pic_id` (`pp_pic_id`),
  KEY `idx_pp_user` (`pp_user`),
  KEY `idx_pp_date` (`pp_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Нет колонок `status`, `moderator`, `moderate_date`, `comment` — записи удаляются после обработки.

### Хранение файлов pending

```
/images/{folder}/{id}.jpg                  ← текущий файл (стабильный URL)
/images/pending/{pp_pic_id}_pp{pp_id}.jpg  ← файлы pending изменений (плоская папка, без подпапок)
/pictures/thumbs/{folder}/{id}.jpg         ← текущий thumbnail
```

Pending файлы хранятся в одной плоской папке `images/pending/` — картинок мало, подпапки не нужны. Thumbnails для pending не создаются — frontend использует полный файл или resize на клиенте.

Нет `archive/` — старые файлы не сохраняются (на совести модератора).

Workflow:
- Submit edit_file/edit_both: файл → `images/pending/{pp_pic_id}_pp{pp_id}.jpg`
- Approve edit_file/edit_both: pending файл → основной путь (заменяет текущий). Удалить текущий thumbnail (пересоздастся). Обновить `pictures.pic_width`, `pic_height`, `pic_date`
- Approve edit_title: вызвать `PictureService::updateTitle()` (обновит `pic_title`, `pic_letter`, `pic_date`)
- Approve edit_both: оба действия выше
- Approve delete: проверить использование в статьях. Удалить файл + thumbnail с диска, удалить запись из `pictures`, удалить все pending для этого pic_id
- Reject / Cancel: удалить файл из `pending/`, удалить запись из `picture_pending`

Обратная совместимость: все существующие `@{id}@` продолжают работать без изменений.

### Страница "Изменения / Иллюстрации"

1. **Сверху**: pending items из `picture_pending`, сгруппированные по картинке. Модератор видит diff с текущим состоянием из `pictures` (title diff, thumbnail сравнение). Кнопки approve/reject для каждого pending
2. **Ниже**: записи из `pictures` отсортированные по `pic_date DESC` — недавно изменённые/созданные картинки

---

## Этапы разработки

### Этап 1a: Backend API ✅

**Backend (PHP):**
- `PicturesApiController` наследует `BaseApiController`
- `GET /api/pictures/list?page=&size=&q=` — пагинированный список с поиском по `pic_title`
- `GET /api/pictures/{id}` — детальная информация
- ~~`POST /api/pictures/{id}/update-title`~~ — удалён в Этапе 7, заменён на `PATCH /api/pictures/{id}` (с модерацией для пользователей)
- ~~`POST /api/pictures/{id}/upload`~~ — удалён в Этапе 7, заменён на `PUT /api/pictures/{id}` (с модерацией для пользователей)
- Добавить `pic_width`, `pic_height` в таблицу + бэкфилл скрипт
- Ответ list обёрнут в `ApiResponse<T>`: `{success: true, data: {items: [...], total, page, pageSize, totalPages}}`
- Каждый item: `{pic_id, pic_folder, pic_title, pic_user, pic_date, pic_width, pic_height}` (snake_case с префиксом, как в БД)

### Этап 1b: Frontend Models + Services ✅

**Frontend models (TypeScript):**
- ✅ `PictureDto` и `PicturesListResponseDto` в `libs/shared/src/lib/models/dto/picture.dto.ts`
- ✅ `Picture`, `PictureListResponse`, `PictureListParams` в `libs/shared/src/lib/models/picture.ts`

**Frontend services:**
- ✅ `PictureApiService` — HTTP layer (`app/services/pictures/picture-api.service.ts`): getPictures, getPicture, updateTitle
- ✅ `PictureService` — Domain layer (`app/services/pictures/picture.service.ts`): маппинг DTO → Picture (snake_case `pic_*` → camelCase), URL generation (zero-padded pic_id), null → undefined для width/height
- ✅ `DEFAULT_PICTURES_PAGE_SIZE = 25` в `picture.constants.ts`

**Тесты:** ✅ Unit-тесты для `PictureApiService` (13 тестов), `PictureService` (14 тестов)

### Этап 2: Pictures UI Components ✅

- ✅ `PictureCard` — миниатюра + hover overlay (анимация translateY) + click emit + keyboard accessibility
- ✅ `picture-row-builder.ts` — justified layout: `buildRows(pictures, containerWidth, targetRowHeight)` → `PictureRow[]`. Default aspect ratio 3:4 для картинок без размеров. Последняя строка не растягивается.
- ✅ `PictureRow` — flex-строка с gap:4px, высота из row builder
- ✅ `PictureSearchBar` — `ui-text-input` с placeholder "Поиск по подписи..."

**Тесты:** ✅ `buildRows()` (9 тестов), `PictureCard` (7), `PictureRow` (4), `PictureSearchBar` (2)

### Этап 3: Pictures Page + Integration ✅

- ✅ `PictureStateService` — feature-scoped (`providers` в компоненте): signals для состояния, debounce 500ms + switchMap для поиска, loadMore для пагинации, computed `rows` через `buildRows()`, `onContainerResize(width)` для пересчёта
- ✅ `PicturePageComponent` — контейнер: search bar + VirtualScroller с PictureRow. ResizeObserver (debounce 150ms) для отслеживания ширины контейнера. Cleanup через `destroyRef.onDestroy()`
- ✅ Browse mode: клик → `/pictures/:id` (router.navigate)
- ✅ Select mode: `MODAL_DATA` injection (optional) → клик → `modalData.close('@{id}@')`
- ✅ Маршрутизация: `/pictures` добавлен в `app.routes.ts`, заглушка в `history.routes.ts` заменена

**Тесты:** ✅ `PictureStateService` (9 тестов), `PicturePageComponent` (7 тестов)

### Этап 4 (D1): Lightbox — просмотр иллюстрации ✅

**Scope**: Глобальный overlay для просмотра картинки из любого контекста (галерея, контент статьи).

**Компоненты и сервисы:**

1. **`PictureLightboxService`** (`app/services/pictures/picture-lightbox.service.ts`, `providedIn: 'root'`)
   - `open(pictureId: number)` — загружает картинку, показывает overlay, push в browser history
   - `close()` — закрывает overlay
   - Signals: `isOpen`, `currentPicture` (загруженная `Picture`), `isLoading`, `isZoomed` (fit ↔ 100%)
   - `toggleZoom()` — переключает fit ↔ 100%
   - Browser history integration: `Location.go()` для push `#picture={id}`, подписка на `popstate` → close
   - При close — не делает `Location.back()` если закрытие вызвано кнопкой/Esc (а не Back), вместо этого `Location.replaceState()` убирает hash

2. **`PictureLightboxComponent`** (`app/layout/picture-lightbox/`)
   - Рендерится в `layout.component.html` (всегда в DOM, показывается по `isOpen()`)
   - Full-screen overlay: `position: fixed; inset: 0; z-index: 1000`
   - Тёмный фон (`background: rgba(0, 0, 0, 0.9)`) — hardcoded, не themed (overlay на изображении)
   - Крестик (close button) в правом верхнем углу
   - Изображение:
     - **Fit mode** (default): `object-fit: contain; max-width: 100%; max-height: 100%` — вписано в экран
     - **Zoom mode** (клик по картинке): `width/height: auto` (натуральный размер), `overflow: auto` на контейнере для прокрутки
   - Подпись картинки (title) под изображением
   - Ссылка "Открыть страницу иллюстрации" → `router.navigate(['/pictures', id])`
   - Keyboard: `Escape` → close
   - Клик по backdrop (вне картинки) → close
   - `@if (lightboxService.isOpen())` — conditional rendering

3. **Интеграция в article-content** (`article-content.component.ts`)
   - Паттерн: event delegation, аналогично map/link handling
   - В `clickHandler`: проверка `target.closest('.pic img')` — клик по картинке в контенте
   - Извлечение `pictureId` из `src` URL: `/images/{folder}/{padded_id}.jpg` → parse id
   - Вызов `PictureLightboxService.open(pictureId)`
   - `preventDefault()` чтобы не переходить по ссылке (если `<img>` обёрнут в `<a>`)

4. **Интеграция в gallery** (`picture-page.component.ts`)
   - Browse mode: изменить клик с `router.navigate` на `lightboxService.open(picture.id)`
   - Select mode: без изменений (по-прежнему `modalData.close()`)

**Тесты:**
- `PictureLightboxService`: open/close, history push/pop, zoom toggle
- `PictureLightboxComponent`: render when open, close on Esc, close on backdrop click, fit/zoom toggle
- `article-content`: клик по `.pic img` → lightbox.open()

### Этап 5: Editor Picture Preview — подсветка и превью `@NNN@` в редакторе ✅

**Scope**: Коды картинок `@NNN@` в CodeMirror-редакторе автоматически подсвечиваются и предзагружаются при открытии. Найденные коды помечаются цветом (pending → resolved / error). При наведении на resolved-код — моментальный tooltip с превью миниатюры и подписью. Клик по превью открывает lightbox (этап 4). Несуществующие коды помечаются ошибочным стилем (красный + wavy underline).

**Подход**: Самодостаточный CM6 extension (`ViewPlugin` + `StateField` + `hoverTooltip`) + batch API. Декорации и fetch-логика инкапсулированы в extension, WikiHighlighterService и EditorComponent не затрагиваются (кроме generic `customExtensions` input).

**Реализация:**

1. **Batch API endpoint** (`legacy-drevo-yii/protected/controllers/api/PicturesApiController.php`)
   - `GET /api/pictures/batch?ids=1,2,3` — возвращает `{ items: PictureDto[], notFound: number[] }`
   - Макс 50 ID за запрос, дедупликация, валидация
   - Route: `api/pictures/batch` → `actionBatch`, exempt от CSRF/Origin (read-only)

2. **Frontend batch сервисы** (`app/services/pictures/`)
   - `PicturesBatchResponseDto` в `libs/shared/src/lib/models/dto/picture.dto.ts`
   - `PictureBatchResponse` в `libs/shared/src/lib/models/picture.ts` — `{ items: Picture[], notFoundIds: number[] }`
   - `PictureApiService.getPicturesBatch(ids)` — HTTP GET `/api/pictures/batch?ids=...`
   - `PictureService.getPicturesBatch(ids)` — domain layer, маппинг DTO → model

3. **`createPicturePreviewExtension()` — самодостаточный extension** (`app/shared/helpers/picture-tooltip.ts`)
   - Живёт в **`app/shared/`** — зависит от `Picture` модели и picture URL generation, поэтому не в `libs/editor/`
   - Сигнатура: `createPicturePreviewExtension(options: PictureTooltipOptions): Extension`
   - `PictureTooltipOptions`: `{ getPicturesBatch: (ids: number[]) => Observable<PictureBatchResponse>, onPictureClick: (id: number) => void }`
   - Возвращает массив из трёх CM6 extensions: `[decorationField, fetchPlugin, tooltip]`
   - **`StateField` (decorationField)** — управляет декорациями на основе кэша:
     - `cm-picture-pending` — код найден, данные ещё не загружены
     - `cm-picture-resolved` — картинка загружена и закэширована
     - `cm-picture-error` — картинка не найдена (404) или ошибка загрузки
     - Пересчитывает декорации при `docChanged` или при эффекте `picturesUpdated`
   - **`ViewPlugin` (fetchPlugin)** — управляет предзагрузкой:
     - При создании и при `docChanged` извлекает все `@NNN@` коды из документа
     - Фильтрует: не запрашивает уже закэшированные, pending или error
     - Вызывает `getPicturesBatch()` чанками по 50 ID
     - Результаты: resolved → `cache`, notFound → `errorIds`
     - После загрузки dispatches `picturesUpdated` effect → StateField пересчитывает декорации
     - **Retry при редактировании**: при `docChanged` анализирует изменённые ranges; если в них есть `@NNN@` с ID из `errorIds` — удаляет из `errorIds` (будет перезапрошен)
   - **`hoverTooltip`** — мгновенный tooltip из кэша:
     - `hoverTime: 100ms` (моментально, т.к. данные уже загружены)
     - Показывает tooltip только для resolved (есть в `cache`)
     - `findPictureCodeAtPosition()` — чистая функция поиска `@NNN@` в строке
     - `create()` возвращает императивный DOM: `<div class="cm-picture-tooltip"><img><span>title</span></div>`
     - Клик по tooltip → `onPictureClick(id)` → lightbox
   - **Кэш, errorIds, pendingIds** — живут в замыкании `createPicturePreviewExtension()` (= пока жив компонент редактирования)
   - Чистые хелперы (exported): `findPictureCodeAtPosition()`, `extractPictureIds()`

4. **Generic `customExtensions` input в EditorComponent** (`libs/editor/src/lib/components/editor/`)
   - Новый input: `customExtensions = input<Extension[]>([])` — generic, без привязки к picture-домену
   - Передаёт в `EditorFactoryService.createState(doc, customExtensions)`
   - Editor lib остаётся доменно-агностичным

5. **`EditorFactoryService.createState()` — принимает доп. extensions** (`libs/editor/src/lib/services/editor-factory/`)
   - Сигнатура: `createState(doc: string, customExtensions: Extension[] = []): EditorState`
   - `...customExtensions` добавляется в конец массива extensions

6. **Интеграция в ArticleEditComponent** (`features/article/pages/article-edit/`)
   - Инжектит `PictureService` и `PictureLightboxService`
   - Создаёт extension: `createPicturePreviewExtension({ getPicturesBatch: ..., onPictureClick: ... })`
   - Передаёт через `[customExtensions]="editorExtensions"` в `<lib-editor>`

7. **Цветовые токены** (`libs/ui/src/lib/styles/_theme-colors.scss`)
   - `editor-picture-pending` / `editor-picture-pending-bg` — серый (нейтральный)
   - `editor-picture-resolved` / `editor-picture-resolved-bg` — бирюзовый (teal)
   - `editor-picture-error` / `editor-picture-error-bg` — красный

8. **Стили** (`codemirror-custom.scss`)
   - `.cm-picture-pending` — серый фон
   - `.cm-picture-resolved` — бирюзовый фон, cursor default
   - `.cm-picture-error` — красный фон + `text-decoration: wavy underline`
   - `.cm-tooltip-hover:has(.cm-picture-tooltip)` — контейнер tooltip (border-radius, тень, padding)
   - `.cm-picture-tooltip` — flex column, img max-height 150px, подпись, cursor pointer

**Тесты (unit):**
- `findPictureCodeAtPosition()`: позиция внутри/снаружи `@123@`, несколько кодов в строке, невалидный формат (`@abc@`, `@@`), пустая строка
- `extractPictureIds()`: уникальные ID, пустой текст, невалидные форматы, многострочный текст
- `createPicturePreviewExtension()`: создаёт валидный CM6 extension; pending → resolved после batch fetch; pending → error для notFound; кэширование (повторный docChanged не вызывает `getPicturesBatch`)
- EditorComponent: `customExtensions` input передаётся в `createState()`

### Этап 6 (D2): Detail Page — просмотр метаданных

**Scope**: Страница `/pictures/:id` — только просмотр, без редактирования.

**Решения (все вопросы закрыты):**
- [x] **Q1: UI layout** — изображение слева, панель информации (460px) справа. На мобильных (`≤1024px`, совпадает с FAB-брейкпоинтом) — колонки стакаются (изображение сверху, max 50vh; информация под ним). Без кнопки «Назад», без аватара пользователя. Скролл один — на весь компонент, без вложенных скроллов
- [x] **Q2: Zoom стратегия** — клик по изображению → `lightboxService.open(picture.id)` (переиспользуем готовый lightbox)
- [x] **Q3: Error handling** — невалидный id (не число) → redirect на `/pictures`. 404 от API → показать ошибку на месте ("Иллюстрация не найдена") со ссылкой на `/pictures`, URL сохраняется
- [x] **Q4: Loading state** — resolver загружает данные до рендера компонента (как в article). Пустой экран во время загрузки (Angular router ждёт resolve)
- [x] **Q5: Кнопка "Назад"** — Не нужна. Навигация через стандартные средства браузера/приложения
- [x] **Q6: Page title** — через resolver + `PageTitleStrategy`: route `data: { titleSource: 'picture', titlePrefix: '🖼️' }` → strategy берёт `picture.title` → `"🖼️ {title} — Древо"`. Обрезка до 50 символов с `…` — в `PageTitleStrategy` (универсально для всех routes). Если picture не загружен — fallback на дефолтный `"Древо"`
- [x] **Q7: Код вставки** — через `app-sidebar-action` (копирование кода) и `app-sidebar-action` (редактирование). Клик → копировать `@{id}@` в буфер (Clipboard API) + toast `NotificationService` ("Код скопирован")

**Компоненты:**

1. **`pictureResolver`** (`features/picture/resolvers/picture.resolver.ts`)
   - `ResolveFn<Picture | undefined>`
   - Валидация route param `id` (число, >0). Невалидный → `router.navigate(['/pictures'])`, return `EMPTY`
   - `PictureService.getPicture(id).pipe(catchError(() => of(undefined)))`
   - Паттерн: аналогично `articleResolver`

2. **`PictureDetailComponent`** (`features/picture/pages/picture-detail/`)
   - Route: `/pictures/:id`
   - Данные из resolver: `picture = toSignal(route.data.pipe(map(data => data['picture'] as Picture | undefined)))` — без собственной загрузки
   - Если `picture()` === `undefined` → показать "Иллюстрация не найдена" + ссылка на `/pictures`
   - Dependencies: `PictureLightboxService`, `NotificationService`, `ActivatedRoute`, `LoggerService`, `PLATFORM_ID`

3. **Template** (`picture-detail.component.html`):
   - Действия вынесены в `app-sidebar-action` (копирование кода, редактирование) — на десктопе отображаются в правом сайдбаре, на мобильных — как FAB-кнопки
   - Info-секция — унифицированные блоки `detail__section` с `detail__label` (серый uppercase заголовок) + `detail__value` (основной текст): «Описание», «Кто разместил», «Время размещения», «Размер», «Используется в статьях»
   - Ошибка — через переиспользуемый `app-error` компонент

4. **Стили** (`picture-detail.component.scss`):
   - `.detail__card` — `display: grid; grid-template-columns: 1fr 460px` (без border-radius, box-shadow, overflow: hidden)
   - `.detail__image` — `display: flex; align-items: flex-start; justify-content: center; cursor: zoom-in; padding: 20px`
   - `.detail__image img` — `max-width: 100%; max-height: calc(98vh - header - padding); object-fit: contain` — картинка всегда умещается в видимой области
   - `.detail__info` — `padding: 24px; display: flex; flex-direction: column; gap: 20px`
   - `.detail__label` — `font-size: $font-size-sm; color: --themed-text-muted; text-transform: uppercase`
   - `.detail__value` — `font-size: 1rem; color: --themed-text-primary`
   - Один responsive брейкпоинт `@media (max-width: $breakpoint-desktop)`: `grid-template-columns: 1fr`, image `max-height: 50vh`, padding уменьшен
   - Все цвета через `var(--themed-*)` токены, без кастомных токенов

5. **Методы компонента**:
   - `onImageClick()` → `this.lightboxService.open(picture.id)` + log
   - `copyInsertCode()` → `navigator.clipboard.writeText('@' + id + '@')` (через `WINDOW` → `isPlatformBrowser` guard) + `notificationService.success('Код скопирован')` + log

6. **Route** в `picture.routes.ts`:
   ```typescript
   {
       path: ':id',
       loadComponent: () => import('./pages/picture-detail/picture-detail.component')
           .then(m => m.PictureDetailComponent),
       resolve: { picture: pictureResolver },
       data: { titleSource: 'picture', titlePrefix: '🖼️' },
   }
   ```
   `PageTitleStrategy` читает `titleSource: 'picture'` → берёт `route.data['picture'].title`, `titlePrefix: '🖼️'` → устанавливает `"🖼️ {title} — Древо"`. Обрезка до 50 символов с `…` — в `PageTitleStrategy` универсально. Если picture не загружен — fallback на дефолтный `"Древо"`.

7. **Lightbox detail link** — уже реализована: `[routerLink]="['/pictures', picture.id]"` в lightbox footer. При переходе lightbox закрывается.

**Файловая структура (новые файлы):**
```
features/picture/
  resolvers/
    picture.resolver.ts
    picture.resolver.spec.ts
  pages/
    picture-detail/
      picture-detail.component.ts
      picture-detail.component.html
      picture-detail.component.scss
      picture-detail.component.spec.ts
```

**Тесты:**

`picture.resolver.spec.ts`:
- Валидный id → возвращает `Picture`
- Невалидный id (не число, ≤0) → redirect на `/pictures`, return `EMPTY`
- 404 от API → возвращает `undefined`

`picture-detail.component.spec.ts`:
- Отображение изображения (`data-testid="detail-image"`), title, автора, даты из resolved data
- `picture === undefined` → показ ошибки "Иллюстрация не найдена" + ссылка на `/pictures`
- Клик по изображению → `lightboxService.open(picture.id)`
- Клик по кнопке копирования → `clipboard.writeText('@{id}@')` + notification

### Этап 7 (D3): Backend — модерация изменений картинок ✅

**Scope**: Только backend (PHP). Таблица `picture_pending`, доработка существующих PATCH/PUT/DELETE endpoints (добавление модерации), новые endpoints для approve/reject/cancel, эндпоинт статей по картинке. Блокирует этапы 8 и 9.

**Решения:**
- [x] Модерируемая очередь без истории версий — `picture_pending` хранит только ожидающие модерации записи
- [x] Обработанные pending удаляются из таблицы
- [x] Модератор правит `pictures` напрямую, без pending
- [x] Создание картинки — без модерации, сразу в `pictures`
- [x] Hard delete при удалении, старые файлы не сохраняются
- [x] SQL без миграционного фреймворка
- [x] Thumbnail для pending не создаётся — frontend использует полный файл
- [x] Валидация: JPEG only, max 500KB (ограничение размера не проверяется для модераторов), `getimagesize()` для dimensions
- [x] Валидация title через `PictureService::validateTitle()` (сделать public) — и для submit, и для direct edit
- [x] Переиспользовать существующую логику легаси (модели, `PictureService.php`) — не дублировать
- [x] `pictures.pic_date` обновляется при каждом изменении
- [x] Доработка существующих PATCH/PUT/DELETE endpoints вместо создания новых POST /edit, /delete
- [x] Проверка использования в статьях — и в submitDelete, и в approve(delete)
- [x] DB-операции в approve/directDelete обёрнуты в транзакцию, файловые операции — после commit
- [x] `canOwnerEdit()` не используется — все пользователи (включая владельца) идут через pending
- [x] Pending файлы в плоской папке `images/pending/` без подпапок
- [x] Метод `getArticlesByPicture()` в `PictureService` (переиспользуется в delete и в endpoint articles)
- [x] approve(edit_title) вызывает `PictureService::updateTitle()` (обновляет pic_title, pic_letter, pic_date)
- [x] Frontend строит URL pending файла сам по конвенции `{pp_pic_id}_pp{pp_id}.jpg`

**Легаси vs API: общая логика и расхождения**

Легаси-сайт и API **не дублируют** бизнес-логику — оба используют общий `PictureService`:

| Операция | Общий метод в `PictureService` |
|----------|-------------------------------|
| Валидация title | `validateTitle()` |
| Валидация файла | `validateImageFile()` |
| Обновление title (title + letter + date) | `updateTitle()` |
| Проверка использования в статьях | `getArticlesByPicture()` |
| Файловые операции (сохранение, удаление, thumbnail cleanup) | существующие методы |

Расхождения:

| Поведение | Легаси-сайт | API |
|-----------|-------------|-----|
| Редактирование владельцем в течение 24 часов | Разрешено без модерации (`canOwnerEdit()`) | Не используется — все через pending |
| Pending-очередь | Нет — легаси не знает про `picture_pending` | Да — пользователи идут через модерацию |
| Модератор | Правит напрямую | Правит напрямую (через `directEdit`/`directDelete`) |

`PictureModerationService` — **новый** сервис только для API. Он оркестрирует pending-логику, но для валидации и применения изменений вызывает методы `PictureService`.

**7.1. SQL: создать таблицу `picture_pending`**

См. секцию "Governance" выше.

**7.2. Создать директорию**

```
images/pending/
```

Плоская папка, без подпапок — pending картинок мало.

**7.3. PHP: модель `PicturePending`**

- AR-модель для таблицы `picture_pending`
- Relations: `belongsTo` → `Pictures` (по `pp_pic_id`)
- Scopes: `byPicture($picId)`, `byUser($user)`

**7.4a. PHP: сделать `PictureService::validateTitle()` public**

Сейчас `protected` — нужен `public` для вызова из `PictureModerationService`.

**7.4b. PHP: метод `PictureService::getArticlesByPicture($picId)`**

Возвращает массив `[{id, title}]` статей, использующих картинку. Логика: JOIN через `pictures_links` → `articles_pictures`. Переиспользуется в `submitDelete`, `approve(delete)`, `directDelete` и в endpoint `GET /api/pictures/{id}/articles`.

**7.4c. PHP: сервис `PictureModerationService`**

Бизнес-логика модерации. Переиспользует существующий `PictureService` для валидации и файловых операций.

Методы:
- **`submitEdit($picId, $user, $title?, $file?)`** — отправить изменение на модерацию
  - Найти существующий pending этого пользователя для этой картинки (`pp_pic_id=:id AND pp_user=:user`). Если есть → удалить + cleanup файлов из `pending/`
  - Если title: `PictureService::validateTitle($title)`
  - Определяет `pp_type` по наличию title/file: `edit_title`, `edit_file`, `edit_both`
  - Если file: `PictureService::validateImageFile()` (JPEG, ≤500KB, `getimagesize()`), сохранение в `images/pending/{pp_pic_id}_pp{pp_id}.jpg`
  - Return: `PicturePending` модель

- **`submitDelete($picId, $user)`** — отправить запрос на удаление
  - Найти существующий pending этого пользователя → удалить + cleanup
  - Проверка: `PictureService::getArticlesByPicture($picId)` — если используется → исключение с информацией
  - Return: `PicturePending` модель

- **`cancel($ppId, $user)`** — отменить свой pending
  - Проверка: `pp_user=:user`. Если не свой → ошибка
  - Cleanup файлов из `pending/` если `edit_file` / `edit_both`
  - Удалить запись из `picture_pending`

- **`approve($ppId, $moderator)`** — одобрить pending
  - Проверка: запись существует. Если нет → ошибка "Запись уже обработана"
  - **Транзакция** (DB-операции внутри, файловые — после commit):
  - Для edit_title: `PictureService::updateTitle()` (обновляет `pic_title`, `pic_letter`, `pic_date`)
  - Для edit_file: обновить `pictures.pic_width`, `pic_height`, `pic_date`. Удалить текущий thumbnail (пересоздастся)
  - Для edit_both: оба действия выше
  - Для delete: проверить `PictureService::getArticlesByPicture()` — если используется → ошибка. Удалить запись из `pictures`
  - Удалить обработанный pending
  - **Удалить все остальные pending** для этого `pp_pic_id`
  - **После commit**: файловые операции (move pending → основной путь, cleanup pending файлов, удаление файлов при delete)

- **`reject($ppId, $moderator)`** — отклонить pending
  - Проверка: запись существует
  - Cleanup файлов из `pending/` если `edit_file` / `edit_both`
  - Удалить запись из `picture_pending`

- **`directEdit($picId, $moderator, $title?, $file?)`** — прямое редактирование модератором
  - Минуя pending — сразу обновляет `pictures`
  - Если title: `PictureService::updateTitle()` (обновляет `pic_title`, `pic_letter`, `pic_date`)
  - Если file: `PictureService::validateImageFile()`, замена файла в основном пути, обновить dimensions, удалить thumbnail

- **`directDelete($picId, $moderator)`** — прямое удаление модератором
  - Проверка: `PictureService::getArticlesByPicture()` — если используется → ошибка
  - **Транзакция**: удалить запись из `pictures`, удалить все pending для этого pic_id
  - **После commit**: удалить файл + thumbnail, cleanup pending файлов

**7.5. Endpoints (PicturesApiController)**

Доработка существующих endpoints + новые для модерации:

1. **`PATCH /api/pictures/{id}`** _(доработка существующего)_ — изменить title
   - Body: JSON — `pic_title` (string)
   - Авторизация: залогиненный пользователь
   - Модератор → `directEdit()`, response: `{success: true, data: PictureDto}`
   - Пользователь → `submitEdit()`, response: `{success: true, data: PicturePendingDto, pending: true}`

2. **`PUT /api/pictures/{id}`** _(доработка существующего)_ — заменить файл + title
   - Body: multipart — `pic_title` (string), `file` (uploaded file). Оба обязательны
   - Авторизация: залогиненный пользователь
   - Модератор → `directEdit()`, response: `{success: true, data: PictureDto}`
   - Пользователь → `submitEdit()`, response: `{success: true, data: PicturePendingDto, pending: true}`

3. **`DELETE /api/pictures/{id}`** _(доработка существующего)_ — удалить картинку
   - Авторизация: залогиненный пользователь
   - Модератор → `directDelete()`, response: `{success: true}`
   - Пользователь → `submitDelete()`, response: `{success: true, data: PicturePendingDto, pending: true}`
   - Если используется в статьях: `{success: false, error: "Иллюстрация используется в статьях", data: {articles: [{id, title}]}}`

4. **`POST /api/pictures/pending/{id}/approve`** _(новый)_ — одобрить pending
   - Авторизация: только модератор
   - Response: `{success: true}`

5. **`POST /api/pictures/pending/{id}/reject`** _(новый)_ — отклонить pending
   - Авторизация: только модератор
   - Response: `{success: true}`

6. **`POST /api/pictures/pending/{id}/cancel`** _(новый)_ — отменить свой pending
   - Авторизация: залогиненный пользователь, только свои
   - Response: `{success: true}`

7. **`GET /api/pictures/{id}/articles`** _(новый)_ — статьи, использующие картинку
   - Вызывает `PictureService::getArticlesByPicture($picId)`
   - Response: `{success: true, data: {items: [{id: int, title: string}]}}`

8. **`GET /api/pictures/pending?page=&size=`** _(новый)_ — список pending (для страницы "Изменения")
   - Авторизация: залогиненный → все pending, незалогиненный → пустой массив без ошибок
   - Пагинация: `page`, `size` (default 25)
   - Response: `{success: true, data: {items: PicturePendingDto[], total, page, pageSize, totalPages}}`
   - Сортировка: `pp_date DESC`
   - Каждый item включает данные картинки (JOIN с `pictures`) для отображения diff

**7.6. `PicturePendingDto` (формат ответа)**

```
{
  pp_id: int,
  pp_pic_id: int,
  pp_type: "edit_title" | "edit_file" | "edit_both" | "delete",
  pp_title: string | null,        // предложенный title
  pp_width: int | null,            // предложенные размеры (для edit_file/edit_both)
  pp_height: int | null,
  pp_user: string,
  pp_date: string (ISO datetime),
  // JOIN с pictures — текущее состояние для diff:
  pic_title: string,
  pic_folder: string,
  pic_width: int | null,           // текущие размеры (для сравнения)
  pic_height: int | null
}
```

Frontend строит URL pending файла по конвенции: `/images/pending/{pp_pic_id}_pp{pp_id}.jpg`

**7.7. Файловые операции**

| Действие | Файл | Thumbnail |
|----------|------|-----------|
| Submit edit_file | → `images/pending/{pp_pic_id}_pp{pp_id}.jpg` | Не создаётся |
| Approve edit_file | Pending → `images/{folder}/{id}.jpg` (замена) | Удалить текущий thumbnail (пересоздастся) |
| Reject / Cancel edit_file | Удалить `images/pending/{pp_pic_id}_pp{pp_id}.jpg` | — |
| Approve delete | Удалить `images/{folder}/{id}.jpg` и `pictures/thumbs/{folder}/{id}.jpg` | — |
| Direct edit (moderator) | Новый файл → `images/{folder}/{id}.jpg` (замена) | Удалить текущий thumbnail (пересоздастся) |
| Direct delete (moderator) | Удалить файл + thumbnail | — |

### Этап 8 (D4): Detail Page — редактирование + frontend models/services

**Scope**: Frontend models и services для модерации (перенесены из Этапа 7) + расширение detail page с редактированием.

**8.1. Frontend models (новые):**
- `PicturePendingDto` в `libs/shared/src/lib/models/dto/picture.dto.ts`
- `PicturePending` в `libs/shared/src/lib/models/picture.ts`
- `PictureArticleDto` — `{id: number, title: string}` (для эндпоинта статей по картинке)

**8.2. Frontend services (расширение):**
- `PictureApiService`: добавить `editPicture()`, `deletePicture()`, `approvePending()`, `rejectPending()`, `cancelPending()`, `getPending()`, `getPictureArticles()`
- `PictureService`: маппинг новых DTO

**8.3. Функциональность UI:**

1. **Редактирование описания**
   - Inline-edit: клик по title → text input → сохранение
   - Или отдельная форма (решить при реализации)
   - Вызов `PictureService.editPicture(id, { title: newTitle })`
   - Пользователь: уведомление "Изменение отправлено на модерацию"
   - Модератор: изменения применяются сразу

2. **Перезаливка файла**
   - Кнопка "Заменить файл" → file input
   - Preview загруженного файла перед отправкой
   - Валидация на клиенте: формат (JPEG), размер (≤500KB)
   - Вызов `PictureService.editPicture(id, { file })` (multipart)

3. **Удаление**
   - Кнопка "Удалить" → confirmation dialog
   - Если используется в статьях → показать предупреждение, заблокировать (данные из `getPictureArticles()`)
   - Вызов `PictureService.deletePicture(id)`

4. **Pending на detail page**
   - Если у текущего пользователя есть pending для этой картинки — показать статус + кнопка "Отменить"
   - Для модератора: показать все pending для этой картинки, сгруппированные. Diff с текущим состоянием. Кнопки approve/reject

5. **Секция "Используется в статьях"**
   - Данные из `GET /api/pictures/{id}/articles`
   - Список ссылок `[{id, title}]` → клик → переход на статью

**Тесты:**
- Edit title flow, file upload flow, delete flow
- Pending display + cancel
- Moderator approve/reject controls
- Articles list display

### Этап 9 (D5): Страница "Изменения / Иллюстрации" — `/history/pictures`

**Scope**: Страница модерации + обзор недавних изменений (замена заглушки).

**Компоненты:**

1. **`PicturesHistoryComponent`** (`features/history/pages/pictures-history/`)
   - **Секция "Ожидают проверки"** (только для модератора):
     - Pending items из `GET /api/pictures/pending`, сгруппированные по картинке
     - Для каждого pending: diff с текущим состоянием из `pictures` (title diff, thumbnail сравнение для file changes)
     - Кнопки approve/reject для каждого pending
     - Если несколько pending на одну картинку — группировка, модератор решает по каждому отдельно
   - **Секция "Недавние иллюстрации"**:
     - Записи из `GET /api/pictures/list` отсортированные по `pic_date DESC`
     - Thumbnail, title, автор, дата
     - Клик → detail page

**Тесты:**
- Pending list rendering, grouping by picture
- Moderator approve/reject controls
- Pictures chronological list
- Empty states (нет pending, нет картинок)

### Этап 10 (D6): Editor Picker Integration

**Scope**: Кнопка вставки иллюстрации в редакторе CodeMirror.

- Кнопка в тулбаре CodeMirror → открытие галереи как modal (select mode)
- Dual-mode уже реализован: `MODAL_DATA` injection → `isSelectMode`
- Клик по картинке → `modalData.close('@{id}@')` → вставка в позицию курсора
- Модальное окно галереи: поиск + бесконечная подгрузка + клик = выбор

**Тесты:**
- Toolbar button renders and opens modal
- Picture selection returns correct code
- Insertion at cursor position

---

## Зависимости между этапами

```
Этап 4 (D1: Lightbox)        ─┐
                               ├── Этап 5 (Editor Preview) — зависит от Lightbox (клик → open)
Этап 6 (D2: Detail View)     ─┤── можно параллельно
Этап 7 (D3: Backend Version) ─┤
Этап 10 (D6: Editor Picker)  ─┘

Этап 7 завершён ──→ Этап 8 (D4: Frontend + Detail Edit) ──→ Этап 9 (D5: Изменения/Иллюстрации)
```

---

## Ключевые файлы для модификации

| Файл | Действие | Этап |
|------|----------|------|
| `app/layout/layout.component.html` | Добавить `<app-picture-lightbox>` | 4 |
| `app/services/pictures/picture-lightbox.service.ts` | Новый сервис | 4 |
| `app/layout/picture-lightbox/` | Новый компонент | 4 |
| `features/article/components/article-content/article-content.component.ts` | Добавить picture click handler | 4 |
| `features/picture/pages/picture-page/picture-page.component.ts` | Browse → lightbox | 4 |
| `legacy-drevo-yii/.../PicturesApiController.php` | Batch endpoint `GET /api/pictures/batch?ids=` | 5 |
| `app/shared/helpers/picture-tooltip.ts` | Новый файл — `createPicturePreviewExtension()` (ViewPlugin + StateField + hoverTooltip) | 5 |
| `libs/shared/.../dto/picture.dto.ts` | `PicturesBatchResponseDto` | 5 |
| `libs/shared/.../models/picture.ts` | `PictureBatchResponse` | 5 |
| `app/services/pictures/picture-api.service.ts` | `getPicturesBatch()` | 5 |
| `app/services/pictures/picture.service.ts` | `getPicturesBatch()` | 5 |
| `libs/editor/.../services/editor-factory/editor-factory.service.ts` | `createState()` принимает `customExtensions` | 5 |
| `libs/editor/.../components/editor/editor.component.ts` | Новый generic input `customExtensions` | 5 |
| `libs/editor/.../components/editor/codemirror-custom.scss` | Стили `.cm-picture-{pending,resolved,error}`, `.cm-picture-tooltip` | 5 |
| `libs/ui/.../styles/_theme-colors.scss` | Токены `--themed-editor-picture-{pending,resolved,error}-*` | 5 |
| `features/article/pages/article-edit/article-edit.component.ts` | Создать и передать extension в editor | 5 |
| `features/picture/picture.routes.ts` | Добавить `:id` route | 6 |
| `features/picture/pages/picture-detail/` | Новый компонент | 6, 8 |
| `legacy-drevo-yii/.../controllers/api/PicturesApiController.php` | Новые endpoints (edit, delete, pending/approve/reject/cancel, articles) | 7 |
| `legacy-drevo-yii/.../models/PicturePending.php` | Новая AR-модель | 7 |
| `legacy-drevo-yii/.../components/PictureModerationService.php` | Новый сервис модерации | 7 |
| `libs/shared/src/lib/models/dto/picture.dto.ts` | PicturePendingDto, PictureArticleDto | 8 |
| `libs/shared/src/lib/models/picture.ts` | PicturePending model | 8 |
| `app/services/pictures/picture-api.service.ts` | Новые методы (edit, delete, approve, reject, cancel, pending, articles) | 8 |
| `app/services/pictures/picture.service.ts` | Маппинг новых DTO | 8 |
| `features/picture/pages/picture-detail/` | Расширение: редактирование, удаление, модерация | 8 |
| `features/history/pages/pictures-history/` | Pending list + pictures by date | 9 |

## Переиспользуемые паттерны

| Паттерн | Источник | Для этапа |
|---------|----------|-----------|
| Event delegation (click handler) | `article-content.component.ts:91-138` | 4 |
| Fullscreen modal (panelClass) | `styles.scss` (diff-modal-panel) | 4 |
| Wiki decoration (Decoration.mark) | `wiki-highlighter.service.ts` | 5 |
| CM6 hoverTooltip | `@codemirror/view` | 5 |
| Two-layer services | `article-api.service.ts` + `article.service.ts` | 7 |
| History page layout | `articles-history/` — секция pending + хронологический список | 9 |
| Dual-mode (MODAL_DATA) | `features/search/search.component.ts` | 10 |
| VirtualScroller API | `libs/ui/virtual-scroller/` | 9 |

## Верификация

1. `yarn lint` — без ошибок
2. `yarn build` — успешная сборка
3. `yarn nx test client` — тесты проходят
4. Dev server (`yarn serve`):
   - `/pictures` — галерея, browse mode → lightbox
   - `/pictures/:id` — detail page с метаданными
   - Lightbox из контента статьи (клик по картинке)
   - Lightbox: fit ↔ zoom, Esc, Back button, крестик
   - Редактор: `@NNN@` подсвечен, hover → превью, клик → lightbox
   - `/pictures/:id` — редактирование title, upload, delete (пользователь → pending, модератор → прямое)
   - `/history/pictures` — pending list для модератора + pictures by date

## Рассмотренные альтернативы

### Editor Picture Preview: Декорации через WikiHighlighterService (отклонен)
- **Идея**: Добавить `/@(\d+)@/g` в WikiHighlighterService, статусы по аналогии с links (через input/output цепочку EditorComponent → ArticleEditComponent)
- **Плюсы**: Консистентно с паттерном links
- **Причина отклонения**: Раздувает WikiHighlighterService и EditorComponent (ещё один input `picturesStatus`, output `updatePicturesEvent`). Самодостаточный extension чище и инкапсулирует всю логику

### Editor Picture Preview: Загрузка по ховеру (отклонен)
- **Идея**: Загружать данные картинки только при наведении курсора на `@NNN@` (hoverTooltip + async fetch)
- **Плюсы**: Никаких лишних запросов при открытии редактора
- **Причина отклонения**: Задержка при первом наведении; невозможно подсветить ошибочные коды заранее. Batch-предзагрузка решает обе проблемы и использует один запрос вместо N

### Editor Picture Preview: hoverTooltip + Angular component (отложен)
- **Идея**: Вместо императивного DOM в `create()` использовать `ViewContainerRef.createComponent()` для рендеринга Angular-компонента внутри CM6 tooltip
- **Плюсы**: Полноценный Angular DI, signals, change detection; переиспользование Angular-компонентов
- **Минусы**: Overhead для простого tooltip (img + title + click); нужен `EnvironmentInjector`, ручной `destroy()`
- **Решение**: Императивный DOM. Переход к Angular-компоненту возможен без переписывания — меняется только `createTooltipDom()`

### Editor Picture Preview: CDK Overlay (отклонен)
- **Идея**: Mark decoration + Angular CDK `Overlay` с `ConnectedPositionStrategy`, без CM6 tooltip
- **Причина отклонения**: Больше boilerplate, нужно самим синхронизировать позиционирование с CM6 DOM

### Editor Picture Preview: Widget Decoration (отклонен)
- **Идея**: `Decoration.replace` с `WidgetType` — показать inline-превью вместо `@NNN@` текста
- **Причина отклонения**: Скрывает оригинальный текст, усложняет редактирование, overkill для задачи

### Вариант A: CSS Grid + IntersectionObserver (отклонен)
- **Идея**: Отказ от VirtualScroller, CSS Grid с `auto-fill`, IntersectionObserver для infinite scroll
- **Плюсы**: Простота, нативная адаптивность, aspect ratio из коробки
- **Минусы**: Нет виртуализации DOM — при 20000+ картинок будут проблемы производительности
- **Причина отклонения**: Объем данных (20000+) требует виртуализации

### Вариант C: VirtualScroller + фиксированные чанки (отклонен)
- **Идея**: Группировка по N штук, фиксированная высота строк
- **Плюсы**: Виртуализация + простая группировка
- **Минусы**: `object-fit: contain` оставляет пустоты, `object-fit: cover` обрезает
- **Причина отклонения**: Противоречит требованию "картинки не должны обрезаться"

### Governance: Полное версионирование (отклонен)
- **Идея**: Таблица `picture_versions` хранит все изменения (pending + approved + rejected). Три файловые зоны (pending/archive/main). `pv_old_title`, `pv_folder`, archive naming с семантикой, FK без constraint. Рассмотрены варианты: Revision-Based (MediaWiki), Delta-based, Separate Concerns (3 таблицы)
- **Плюсы**: Полная история изменений, точные diffs
- **Причина отклонения**: Нарастающая сложность — concurrent versions, base version tracking, archive file semantics, soft-delete vs hard-delete. Версионирования картинок нет и сейчас; модерируемая очередь без истории покрывает текущие потребности. Полное версионирование может быть добавлено позже

### Soft-delete с `pic_deleted` колонкой (отклонен)
- **Идея**: Добавить `pic_deleted tinyint` в `pictures`, при удалении ставить `pic_deleted=1`
- **Причина отклонения**: Усложняет все запросы к `pictures` (`WHERE pic_deleted=0`). Hard delete проще и соответствует текущему поведению

### Хранение файлов: Symlinks (отклонен)
- **Идея**: Все файлы по version_id + symlink для текущего
- **Причина отклонения**: Усложняет деплой, не все хостинги поддерживают

### Хранение файлов: PHP-контроллер (отклонен)
- **Идея**: Все файлы по version_id, PHP отдаёт по DB lookup
- **Причина отклонения**: Каждый запрос через PHP, убивает кэширование
