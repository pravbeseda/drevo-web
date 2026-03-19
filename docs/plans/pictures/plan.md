# Pictures — План реализации

## Контекст

Создаем галерею иллюстраций: 20000+ картинок, нужна виртуализация DOM. Выбран **Вариант B: VirtualScroller + Justified Layout** (как Google Photos).

**Функциональность:**
- Просмотр превью с поиском и бесконечной подгрузкой (VirtualScroller)
- Justified layout (строки с одинаковой высотой, изображения сохраняют пропорции)
- Hover overlay с анимированным выезжающим блоком информации
- Три контекста: вкладка History (`/history/pictures`), standalone страница (`/pictures`), модалка (пикер)
- Два режима: browse (клик → lightbox → детальная страница) и select (клик → возврат `@{id}@`)
- Детальная страница `/pictures/:id` с полным изображением, редактированием подписи, перезаливкой

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
- Миниатюра: `/pictures/thumbs/{folder}/{pic_id_padded_6}.jpg` (max 250×400)
- Код вставки: `@{pic_id}@`

---

## Архитектура компонентов

### Где живут компоненты

Все picture-related компоненты живут **внутри features/history/**, потому что:
1. Вкладка `/history/pictures` — child route HistoryComponent (требует быть в том же feature)
2. Правило проекта: "features/X/ NEVER import from features/Y/"
3. History уже организует секции контента (articles, news, forum, pictures)
4. Standalone route `/pictures` в `app.routes.ts` lazy-load'ит из history feature (app.routes → features — разрешено)

### Файловая структура

```
features/history/
  pages/
    pictures/                    # Галерея (browse + select mode)
      pictures.component.ts/html/scss/spec
    picture-detail/                      # Страница /pictures/:id
      picture-detail.component.ts/html/scss/spec
  components/
    picture-card/                        # Карточка миниатюры + hover overlay
      picture-card.component.ts/html/scss/spec
    picture-row/                         # Justified строка из N картинок
      picture-row.component.ts/html/scss/spec
    picture-search-bar/                  # Поисковая строка
      picture-search-bar.component.ts/html/scss/spec
    picture-lightbox/                    # Модалка быстрого просмотра
      picture-lightbox.component.ts/html/scss/spec
  services/
    picture-row-builder.ts               # Чистая функция: items[] → PictureRow[]
    picture-row-builder.spec.ts
    pictures-state.service.ts    # Feature-scoped: пагинация, строки, resize
    pictures-state.service.spec.ts

app/services/pictures/
  picture-api.service.ts                 # HTTP layer (providedIn: root)
  picture-api.service.spec.ts
  picture.service.ts                     # Domain layer (providedIn: root)
  picture.service.spec.ts
  index.ts                               # Barrel export

libs/shared/src/lib/models/
  dto/picture.dto.ts                     # PictureDto, PicturesListResponseDto
  picture.ts                             # Picture domain model

legacy-drevo-yii/protected/controllers/api/
  PicturesApiController.php              # Новый API контроллер
```

### Маршрутизация

```typescript
// app.routes.ts — добавить:
{
    path: 'pictures',
    canActivate: [authGuard],
    title: 'Иллюстрации',
    loadComponent: () => import('./features/history/pages/pictures/pictures.component')
        .then(m => m.PicturesComponent),
},
{
    path: 'pictures/:id',
    canActivate: [authGuard],
    title: 'Иллюстрация',
    loadComponent: () => import('./features/history/pages/picture-detail/picture-detail.component')
        .then(m => m.PictureDetailComponent),
},

// history.routes.ts — заменить текущую заглушку:
{
    path: 'pictures',
    title: 'Иллюстрации',
    loadComponent: () => import('./pages/pictures/pictures.component')
        .then(m => m.PicturesComponent),
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

## Этапы разработки

### Этап 1a: Backend API

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

- ✅ `PicturesStateService` — feature-scoped (`providers` в компоненте): signals для состояния, debounce 500ms + switchMap для поиска, loadMore для пагинации, computed `rows` через `buildRows()`, `onContainerResize(width)` для пересчёта
- ✅ `PicturesComponent` — контейнер: search bar + VirtualScroller с PictureRow. ResizeObserver (debounce 150ms) для отслеживания ширины контейнера. Cleanup через `destroyRef.onDestroy()`
- ✅ Browse mode: клик → `/pictures/:id` (router.navigate)
- ✅ Select mode: `MODAL_DATA` injection (optional) → клик → `modalData.close('@{id}@')`
- ✅ Маршрутизация: `/pictures` добавлен в `app.routes.ts`, заглушка в `history.routes.ts` заменена

**Тесты:** ✅ `PicturesStateService` (9 тестов), `PicturesComponent` (7 тестов)

### Этап 4: Lightbox + Detail Page + Select Mode

- `PictureLightboxComponent` — модалка: полное изображение, подпись, кнопка "Открыть страницу"
- `PictureDetailComponent` — страница `/pictures/:id`: полное изображение, форма редактирования подписи, перезаливка (file upload), список связанных статей
- Интеграция с ModalService для вызова из редактора (select mode / picker)
- Возврат `@{pic_id}@` через `modalData.close()`
- Кнопка в редакторе для открытия пикера

**Тесты:** Unit-тесты для `PictureLightboxComponent`, `PictureDetailComponent`

---

## Ключевые файлы для модификации

| Файл | Действие |
|------|----------|
| `apps/client/src/app/app.routes.ts` | Добавить `/pictures` и `/pictures/:id` |
| `features/history/history.routes.ts` | Заменить заглушку pictures |
| `features/history/pages/pictures/` | Удалить заглушку |
| `libs/shared/src/lib/models/index.ts` | Экспорт новых моделей |
| `libs/shared/package.json` | Если нужны зависимости |
| `legacy-drevo-yii/.../controllers/api/` | Новый PicturesApiController.php |

## Переиспользуемые паттерны

| Паттерн | Источник |
|---------|----------|
| Dual-mode (MODAL_DATA) | `features/search/search.component.ts` |
| VirtualScroller API | `libs/ui/src/lib/components/virtual-scroller/` |
| Two-layer services | `app/services/articles/article-api.service.ts` + `article.service.ts` |
| Search debounce+switchMap | `features/search/search.component.ts:63-92` |
| Pagination (loadMore) | `features/search/search.component.ts:100-127` |
| BaseApiController | `legacy-drevo-yii/.../controllers/api/BaseApiController.php` |
| Paginated response DTO | `libs/shared/.../dto/article-search.dto.ts` |

## Верификация

1. `yarn lint` — без ошибок
2. `yarn build` — успешная сборка
3. `yarn nx test client` — тесты проходят
4. Dev server (`yarn serve`):
   - `/history/pictures` — вкладка с галереей, скролл, поиск
   - `/pictures` — standalone страница
   - `/pictures/:id` — детальная страница
   - Hover overlay анимация
   - Resize → пересчет строк
   - Select mode через модалку

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
