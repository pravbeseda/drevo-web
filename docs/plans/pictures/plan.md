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

## Governance: версионирование картинок

### Модель

Упрощённое версионирование, консистентное со статьями:
- Каждое изменение (title, файл, удаление) = новая версия с `approved: 0` (Pending)
- Картинка показывает последнюю одобренную версию
- Модератор одобряет/отклоняет версии
- Для модераторов изменения auto-approve (`approved: 1`)
- Удаление невозможно, если картинка используется в статьях
- Diff для title: простое "было → стало"
- Diff для файла: два thumbnail рядом

### Таблица `picture_versions` (новая)

| Колонка | Тип | Описание |
|---------|-----|----------|
| `pv_id` | int PK | Auto-increment |
| `pv_pic_id` | int FK | → pictures.pic_id |
| `pv_type` | enum | `create`, `edit_title`, `edit_file`, `edit_both`, `delete` |
| `pv_title` | varchar | Новое значение title (full state) |
| `pv_width` | int NULL | Новые размеры (при замене файла) |
| `pv_height` | int NULL | |
| `pv_user` | varchar(32) | Автор изменения |
| `pv_date` | datetime | Дата |
| `pv_approved` | tinyint | -1 (rejected), 0 (pending), 1 (approved) |
| `pv_moderator` | varchar(32) NULL | Модератор |
| `pv_moderate_date` | datetime NULL | Дата модерации |
| `pv_comment` | text NULL | Комментарий модератора |
| `pv_old_title` | varchar NULL | Предыдущее значение title (для diff) |

### Хранение файлов

**Вариант: Stable URL + архивная директория** (рекомендован)

```
/images/{folder}/{id}.jpg                           ← текущая одобренная версия (стабильный URL)
/images/archive/{folder}/{id}_v{pv_id}.jpg          ← старые версии файлов
/images/pending/{folder}/{id}_v{pv_id}.jpg          ← файлы pending версий
/pictures/thumbs/{folder}/{id}.jpg                  ← текущий thumbnail
/pictures/thumbs/archive/{folder}/{id}_v{pv_id}.jpg ← старые thumbnails
/pictures/thumbs/pending/{folder}/{id}_v{pv_id}.jpg ← pending thumbnails
```

Workflow:
- Upload (pending): сохраняем в `pending/`, генерируем thumbnail в `thumbs/pending/`
- Approve: текущий файл → `archive/` с `_v{old_pv_id}`, pending → основной путь
- Reject: удаляем из `pending/`
- Soft-delete (approve): файл → `archive/`, удаляем из основного пути

Обратная совместимость: все существующие `@{id}@` продолжают работать без изменений.

Рассмотренные альтернативы:
- **Symlinks** — усложняют деплой, не все хостинги поддерживают
- **PHP-контроллер** — каждый запрос через PHP, убивает кэширование
- **Content-addressed (hash)** — overkill, ломает существующие URL

---

## Этапы разработки

### Этап 1a: Backend API ✅

**Backend (PHP):**
- `PicturesApiController` наследует `BaseApiController`
- `GET /api/pictures/list?page=&size=&q=` — пагинированный список с поиском по `pic_title`
- `GET /api/pictures/{id}` — детальная информация
- `POST /api/pictures/{id}/update-title` — изменение подписи
- `POST /api/pictures/{id}/upload` — загрузка/перезаливка файла
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

### Этап 5 (D2): Detail Page — просмотр метаданных

**Scope**: Страница `/pictures/:id` — только просмотр, без редактирования.

**Компоненты:**

1. **`PictureDetailComponent`** (`features/picture/pages/picture-detail/`)
   - Route: `/pictures/:id`
   - Загрузка картинки через `PictureService.getPicture(id)`
   - Отображение:
     - Полное изображение (fit + click для zoom, переиспользовать логику из lightbox или общий паттерн)
     - Title (описание)
     - Автор (`pic_user`) + дата загрузки (`pic_date`)
     - Раздел "Используется в статьях" — заглушка (backend endpoint не готов)
   - Кнопка "Назад" (или breadcrumb)
   - Ссылка из lightbox: "Открыть страницу иллюстрации" → навигация сюда

2. **Route** в `picture.routes.ts`:
   ```typescript
   { path: ':id', loadComponent: () => import('./pages/picture-detail/picture-detail.component')
       .then(m => m.PictureDetailComponent) }
   ```

**Тесты:**
- `PictureDetailComponent`: загрузка и отображение данных, обработка ошибок, навигация назад

### Этап 6 (D3): Backend — версионирование картинок

**Scope**: API и БД для governance модели. Блокирует этапы 7 и 8.

**Backend (PHP):**
- Миграция: создать таблицу `picture_versions` (см. секцию "Governance")
- Создать директории `images/archive/`, `images/pending/`, `pictures/thumbs/archive/`, `pictures/thumbs/pending/`
- Новые/изменённые endpoints:
  - `POST /api/pictures/{id}/edit` — создать версию (title и/или file). Для модератора — auto-approve. Body: `{pic_title?, file?}`. Response: `{data: PictureVersionDto}`
  - `POST /api/pictures/{id}/delete` — создать intention на удаление. Проверка: если используется в статьях → `400 Bad Request` с информацией. Для модератора — auto-approve + soft-delete
  - `POST /api/pictures/moderate` — approve/reject версию. Body: `{pv_id, approved: 1|-1, comment?}`. При approve edit: обновить `pictures`, переместить файлы. При approve delete: soft-delete
  - `GET /api/pictures/history?page=&size=&filter=` — список версий с фильтрами (`all`, `unchecked`, `my`). Response: пагинированный список `PictureVersionDto[]`
  - `GET /api/pictures/{id}/history` — версии конкретной картинки
- Валидация при upload: формат (jpg, png, webp), max размер файла, `getimagesize()` для dimensions

**Frontend models (новые):**
- `PictureVersionDto` в `libs/shared/src/lib/models/dto/picture.dto.ts`
- `PictureVersion` в `libs/shared/src/lib/models/picture.ts`

**Frontend services (расширение):**
- `PictureApiService`: добавить `editPicture()`, `deletePicture()`, `moderateVersion()`, `getPictureHistory()`, `getGlobalPictureHistory()`
- `PictureService`: маппинг новых DTO

### Этап 7 (D4): Detail Page — редактирование

**Scope**: Расширение detail page из этапа 5 + интеграция с версионированием.

**Функциональность:**

1. **Редактирование описания**
   - Inline-edit: клик по title → text input → сохранение
   - Или отдельная форма (решить при реализации)
   - Вызов `PictureService.editPicture(id, { title: newTitle })`

2. **Перезаливка файла**
   - Кнопка "Заменить файл" → file input
   - Preview загруженного файла перед отправкой
   - Валидация на клиенте: формат, размер
   - Вызов `PictureService.editPicture(id, { file })` (multipart)

3. **Удаление**
   - Кнопка "Удалить" → confirmation dialog
   - Если используется в статьях → показать предупреждение, заблокировать
   - Вызов `PictureService.deletePicture(id)`

4. **Pending версии на detail page**
   - Если есть pending версии — показать блок с ними
   - Для модератора: кнопки approve/reject + поле комментария
   - Diff для title: выделение изменений (было → стало)
   - Diff для файла: два thumbnail рядом (текущий vs предложенный)

5. **UX для пользователей vs модераторов**
   - Одинаковый UI контролов
   - Пользователь: после действия — уведомление "Изменение отправлено на модерацию"
   - Модератор: изменения применяются сразу (auto-approve)

**Тесты:**
- Edit title flow, file upload flow, delete flow
- Pending versions display
- Moderator approve/reject controls

### Этап 8 (D5): History — `/history/pictures`

**Scope**: Полноценная страница истории изменений картинок (замена заглушки).

**Компоненты:**

1. **`PicturesHistoryComponent`** (расширение `features/history/pages/pictures-history/`)
   - Переиспользование паттерна из `articles-history`:
     - Virtual scroller для списка
     - Date headers между группами по дате
     - Фильтры: все / непроверенные / мои (как у статей)
   - Каждая запись:
     - Thumbnail картинки
     - Тип изменения (создание / редактирование title / замена файла / удаление)
     - Автор и дата
     - Для title edit: diff (было → стало)
     - Для file edit: два маленьких thumbnail
     - Статус (pending / approved / rejected)
   - Для модератора: кнопки approve/reject inline
   - Клик по записи → detail page картинки

2. **`PictureHistoryService`** (`app/services/pictures/` или `features/history/services/`)
   - Загрузка и пагинация истории
   - Фильтрация
   - Маппинг в display items с date headers

**Тесты:**
- History list rendering, filtering, pagination
- Moderator controls
- Date grouping

### Этап 9 (D6): Editor Picker Integration

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
Этап 5 (D2: Detail View)     ─┤── можно параллельно
Этап 6 (D3: Backend Version) ─┤
Этап 9 (D6: Editor Picker)   ─┘

Этап 6 завершён ──→ Этап 7 (D4: Detail Edit) ──→ Этап 8 (D5: History)
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
| `features/picture/picture.routes.ts` | Добавить `:id` route | 5 |
| `features/picture/pages/picture-detail/` | Новый компонент | 5, 7 |
| `libs/shared/src/lib/models/dto/picture.dto.ts` | PictureVersionDto | 6 |
| `libs/shared/src/lib/models/picture.ts` | PictureVersion model | 6 |
| `app/services/pictures/picture-api.service.ts` | Новые методы | 6 |
| `app/services/pictures/picture.service.ts` | Новые методы | 6 |
| `features/history/pages/pictures-history/` | Полноценная реализация | 8 |
| `legacy-drevo-yii/.../controllers/api/PicturesApiController.php` | Новые endpoints | 6 |

## Переиспользуемые паттерны

| Паттерн | Источник | Для этапа |
|---------|----------|-----------|
| Event delegation (click handler) | `article-content.component.ts:91-138` | 4 |
| Fullscreen modal (panelClass) | `styles.scss` (diff-modal-panel) | 4 |
| Two-layer services | `article-api.service.ts` + `article.service.ts` | 6 |
| Versioning + approval | `article.ts`, `moderation.ts` | 6, 7 |
| History list + filters | `articles-history/` component + service | 8 |
| Dual-mode (MODAL_DATA) | `features/search/search.component.ts` | 9 |
| VirtualScroller API | `libs/ui/virtual-scroller/` | 8 |

## Верификация

1. `yarn lint` — без ошибок
2. `yarn build` — успешная сборка
3. `yarn nx test client` — тесты проходят
4. Dev server (`yarn serve`):
   - `/pictures` — галерея, browse mode → lightbox
   - `/pictures/:id` — detail page с метаданными
   - Lightbox из контента статьи (клик по картинке)
   - Lightbox: fit ↔ zoom, Esc, Back button, крестик
   - `/pictures/:id` — редактирование title, upload, delete (с модерацией)
   - `/history/pictures` — история с фильтрами и модерацией

## Рассмотренные альтернативы

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

### Governance: Очередь изменений (отклонен)
- **Идея**: Отдельная таблица `picture_edits` вместо версионирования
- **Плюсы**: Проще реализовать
- **Причина отклонения**: Не консистентно с паттерном статей, не масштабируется для полной истории

### Хранение файлов: Symlinks (отклонен)
- **Идея**: Все файлы по version_id + symlink для текущего
- **Причина отклонения**: Усложняет деплой, не все хостинги поддерживают

### Хранение файлов: PHP-контроллер (отклонен)
- **Идея**: Все файлы по version_id, PHP отдаёт по DB lookup
- **Причина отклонения**: Каждый запрос через PHP, убивает кэширование
