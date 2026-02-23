# DraftEditorService — Сервис-компаньон для автосохранения черновиков (Вариант E)

## TL;DR

Feature-scoped сервис `DraftEditorService`, предоставляемый на уровне компонента-потребителя. Сервис инкапсулирует логику debounced auto-save, проверки наличия черновика при init, и удаления черновика. Потребитель (например `ArticleEditComponent`) оркестрирует три вызова в местах, где они семантически принадлежат: загрузка → `checkDraft()`, onChange → `onContentChanged()`, onSave → `discardDraft()`.

Для диалога восстановления черновика создаётся отдельный компонент `DraftRestoreDialogComponent`.

## Архитектура

### Принятый вариант: E — Сервис-компаньон

- `DraftEditorService` — feature-scoped (не `providedIn: 'root'`), provided в `providers` компонента-потребителя
- Зависимости: `DraftStorageService` (из `@drevo-web/core`), `ModalService` (из `@drevo-web/ui`), `LoggerService` (из `@drevo-web/core`)
- Потребитель явно управляет lifecycle тремя вызовами
- `lib-editor` не затрагивается — остаётся «глупым» компонентом

### Почему E, а не обёртка или connect()

- **SRP**: сервис — одна ответственность (draft lifecycle), потребитель — оркестрация
- **OCP**: изменения API `lib-editor` не затрагивают draft-сервис
- **Explicit**: каждый вызов виден в коде, легко отладить
- **Angular-идиоматичность**: feature-scoped service + smart component — стандартный паттерн
- **Testability**: мокается один сервис, каждый вызов проверяется отдельно

## API сервиса

```typescript
@Injectable()
export class DraftEditorService {
    /**
     * Проверяет наличие черновика по route.
     * Если черновик найден — показывает диалог через ModalService.
     * Возвращает текст черновика (если пользователь выбрал восстановить) или undefined.
     */
    checkDraft(route: string): Promise<string | undefined>;

    /**
     * Вызывается при каждом изменении текста.
     * Внутри debounce — сохраняет черновик не чаще раза в N секунд.
     * Потребитель передаёт актуальные title и route при каждом вызове.
     */
    onContentChanged(input: DraftInput): void;

    /**
     * Удаляет черновик по route. Вызывается после успешного сохранения.
     * Также отменяет pending debounced save.
     */
    discardDraft(route: string): Promise<void>;

    /**
     * Проверяет наличие черновика. Если есть — спрашивает confirm-диалогом
     * «Удалить черновик?». При подтверждении удаляет и навигирует.
     * При отказе — остаётся на странице. Если черновика нет — навигирует сразу.
     */
    confirmDiscardAndNavigate(route: string, navigateTo: unknown[]): Promise<void>;
}
```

### DraftInput (уже существует в `@drevo-web/core`)

```typescript
interface DraftInput {
    readonly route: string;
    readonly title: string;
    readonly text: string;
}
```

### Поведение `onContentChanged`

- Вызовы аккумулируются внутри через `Subject` + `debounceTime(DRAFT_SAVE_DEBOUNCE_MS)`
- Debounce: **3 секунды** — достаточно для группировки быстрых правок, не слишком долго для потери данных
- Подписка создаётся лениво при первом вызове и уничтожается при `DestroyRef`
- Если текст совпадает с предыдущим сохранённым — пропускает сохранение

### Поведение `checkDraft`

1. Вызывает `DraftStorageService.getByRoute(route)`
2. Если нет черновика → возвращает `undefined`
3. Если черновик найден → открывает `DraftRestoreDialogComponent` через `ModalService` с `disableClose: true` (Esc и backdrop заблокированы — пользователь обязан выбрать одну из кнопок)
4. Диалог показывает время сохранения черновика
5. Пользователь выбирает «Восстановить» или «Удалить»
6. «Восстановить» → возвращает `draft.text`
7. «Удалить» → удаляет черновик через `DraftStorageService.deleteByRoute()`, возвращает `undefined`

### Поведение `discardDraft`

1. Отменяет pending debounced save (через Subject)
2. Вызывает `DraftStorageService.deleteByRoute(route)`

## Компонент диалога восстановления

### `DraftRestoreDialogComponent`

Небольшой компонент-диалог. Показывает:
- Заголовок: «Найден черновик»
- Текст: «Черновик статьи "{ title }" сохранён { time }. Восстановить?»
- Две кнопки: «Восстановить» (primary) и «Удалить черновик» (secondary)

**Data** (передаётся через `MODAL_DATA`):

```typescript
interface DraftRestoreDialogData {
    readonly title: string;
    readonly time: number; // epoch ms
}
```

**Result**: `boolean` — `true` = восстановить, `false` = удалить

**Конфигурация диалога**: `disableClose: true` — пользователь обязан выбрать одну из кнопок

## Файловая структура

### Новые файлы

```
apps/client/src/app/shared/
├── services/
│   └── draft-editor/
│       ├── draft-editor.service.ts        # DraftEditorService
│       └── draft-editor.service.spec.ts   # Тесты
├── components/
│   └── draft-restore-dialog/
│       ├── draft-restore-dialog.component.ts    # Диалог «Найден черновик»
│       ├── draft-restore-dialog.component.html
│       └── draft-restore-dialog.component.scss
│   └── draft-discard-dialog/
│       ├── draft-discard-dialog.component.ts    # Confirm «Удалить черновик?»
│       ├── draft-discard-dialog.component.html
│       └── draft-discard-dialog.component.scss
```

### Изменения в существующих файлах

| Файл | Изменение |
|------|-----------|
| `apps/client/src/app/features/article/pages/article-edit/article-edit.component.ts` | Добавить `DraftEditorService` в providers, вызвать `checkDraft()`, `onContentChanged()`, `discardDraft()` |
| `apps/client/src/app/features/article/pages/article-edit/article-edit.component.html` | Привязать `[content]` к signal `editorContent()` вместо `version.content` |

## Шаги реализации

### 1. Создать `DraftRestoreDialogComponent`

**Файл**: `apps/client/src/app/shared/components/draft-restore-dialog/draft-restore-dialog.component.ts`

- Selector: `app-draft-restore-dialog`
- `ChangeDetectionStrategy.OnPush`
- Инжектит `MODAL_DATA` для получения `DraftRestoreDialogData` и функции `close()`
- Использует `FormatTimePipe` из `@drevo-web/ui` для отображения времени
- Две кнопки: `ui-button` (primary) → `close(true)`, `ui-button` (secondary) → `close(false)`

**Файл**: `apps/client/src/app/shared/components/draft-restore-dialog/draft-restore-dialog.component.html`

```html
<div class="draft-restore-dialog">
    <h2 class="draft-restore-dialog__title">Найден черновик</h2>
    <p class="draft-restore-dialog__message">
        Черновик статьи «{{ data.title }}» сохранён {{ data.time | formatTime }}.
        Восстановить?
    </p>
    <div class="draft-restore-dialog__actions">
        <ui-button priority="secondary" (activated)="decline()">Удалить черновик</ui-button>
        <ui-button priority="primary" (activated)="restore()">Восстановить</ui-button>
    </div>
</div>
```

**Файл**: `apps/client/src/app/shared/components/draft-restore-dialog/draft-restore-dialog.component.scss`

Минимальные стили: padding, gap между кнопками, выравнивание actions по правому краю.

### 1b. Создать `DraftDiscardDialogComponent`

**Файл**: `apps/client/src/app/shared/components/draft-discard-dialog/draft-discard-dialog.component.ts`

- Selector: `app-draft-discard-dialog`
- `ChangeDetectionStrategy.OnPush`
- Инжектит `MODAL_DATA` для `close()`
- Текст: «Вы уверены, что хотите удалить черновик? Несохранённые изменения будут потеряны.»
- Две кнопки: «Удалить» (primary warn) → `close(true)`, «Остаться» (secondary) → `close(false)`

**Конфигурация диалога**: `disableClose: true`, `width: '400px'`

**Result**: `boolean` — `true` = удалить и уйти, `false` = остаться

### 2. Создать `DraftEditorService`

**Файл**: `apps/client/src/app/shared/services/draft-editor/draft-editor.service.ts`

```typescript
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DraftStorageService, LoggerService, DraftInput } from '@drevo-web/core';
import { ModalService } from '@drevo-web/ui';
import { Subject, debounceTime } from 'rxjs';

const DRAFT_SAVE_DEBOUNCE_MS = 3000;

@Injectable()
export class DraftEditorService {
    private readonly draftStorage = inject(DraftStorageService);
    private readonly modalService = inject(ModalService);
    private readonly logger = inject(LoggerService).withContext('DraftEditorService');
    private readonly destroyRef = inject(DestroyRef);

    private readonly contentSubject = new Subject<DraftInput>();
    private lastSavedText: string | undefined;
    private subscriptionInitialized = false;

    async checkDraft(route: string): Promise<string | undefined> {
        // 1. DraftStorageService.getByRoute(route)
        // 2. Если нет → return undefined
        // 3. Есть → ModalService.open(DraftRestoreDialogComponent, { data: { title, time }, disableClose: true })
        // 4. Результат true → return draft.text
        // 5. Результат false → deleteByRoute, return undefined
    }

    onContentChanged(input: DraftInput): void {
        // Ленивая инициализация подписки
        // contentSubject.next(input)
    }

    async discardDraft(route: string): Promise<void> {
        // Отменяет pendingSave (через new Subject)
        // DraftStorageService.deleteByRoute(route)
    }

    async confirmDiscardAndNavigate(route: string, navigateTo: unknown[]): Promise<void> {
        // 1. DraftStorageService.getByRoute(route)
        // 2. Если нет черновика → navigate(navigateTo)
        // 3. Есть → ModalService.open(DraftDiscardConfirmComponent, { disableClose: true })
        //    «Удалить черновик?» с кнопками «Удалить» / «Остаться»
        // 4. true → discardDraft(route) + navigate(navigateTo)
        // 5. false → ничего (остаёмся на странице)
    }

    private initSubscription(): void {
        // contentSubject.pipe(debounceTime(3000), takeUntilDestroyed)
        //   .subscribe(input => save if text changed)
    }
}
```

Ключевые детали:
- `contentSubject` с `debounceTime(DRAFT_SAVE_DEBOUNCE_MS)` + `takeUntilDestroyed(this.destroyRef)` — автоматический cleanup
- `lastSavedText` — пропускает save, если текст не изменился с прошлого сохранения
- `discardDraft()` — завершает текущий pending debounce (новый Subject + переподписка не нужны — достаточно сбросить `lastSavedText` и вызвать `deleteByRoute`)
- Все ошибки `DraftStorageService` ловятся и логируются, не пропагируются наверх (черновики — некритичная функция)
- `checkDraft` оборачивает `ModalService.open()` observable в `firstValueFrom`

### 3. Интегрировать в `ArticleEditComponent`

**Изменения в `.ts`**:

```typescript
// Новые зависимости
private readonly draftEditor = inject(DraftEditorService);

// Новый signal для контента редактора (заменяет прямое version.content)
readonly editorContent = signal<string>('');

// В loadVersion, после получения version:
next: async version => {
    this.version.set(version);
    this.isLoading.set(false);

    // Проверить черновик (route по articleId — переживает смену versionId после save)
    const route = `/articles/edit/${version.articleId}`;
    const draftText = await this.draftEditor.checkDraft(route);
    this.editorContent.set(draftText ?? version.content);
}

// В contentChanged:
contentChanged(content: string): void {
    this.currentContent = content;
    const version = this.version();
    if (version) {
        this.draftEditor.onContentChanged({
            route: `/articles/edit/${version.articleId}`,
            title: version.title,
            text: content,
        });
    }
}

// В save, после успешного сохранения:
next: result => {
    // ...существующий код...
    this.draftEditor.discardDraft(`/articles/edit/${result.articleId}`);
}

// В cancel — confirm-диалог перед удалением черновика:
cancel(): void {
    const version = this.version();
    if (!version) {
        this.router.navigate(['/']);
        return;
    }
    const route = `/articles/edit/${version.articleId}`;
    this.draftEditor.confirmDiscardAndNavigate(route, ['/articles', version.articleId]);
}
```

**Добавить в `providers`**:
```typescript
providers: [LinksService, DraftEditorService],
```

**Изменения в `.html`**:
```html
<!-- Было: -->
[content]="version.content"

<!-- Стало: -->
[content]="editorContent()"
```

### 4. Написать тесты `DraftEditorService`

**Файл**: `apps/client/src/app/shared/services/draft-editor/draft-editor.service.spec.ts`

Тест-кейсы:
- **checkDraft — нет черновика**: `DraftStorageService.getByRoute` возвращает `undefined` → `checkDraft` возвращает `undefined`, диалог не открывается
- **checkDraft — черновик найден, восстановить**: mock `ModalService.open` → `of(true)`, проверяем что возвращён `draft.text`
- **checkDraft — черновик найден, удалить**: mock `ModalService.open` → `of(false)`, проверяем что `deleteByRoute` вызван, возвращён `undefined`
- **checkDraft — disableClose**: проверяем что `ModalService.open` вызван с `disableClose: true`
- **confirmDiscardAndNavigate — черновик есть, confirm → удалить**: вызывает `deleteByRoute`, навигирует
- **confirmDiscardAndNavigate — черновик есть, confirm → отмена**: не удаляет, не навигирует
- **confirmDiscardAndNavigate — черновика нет**: навигирует сразу без диалога
- **onContentChanged — debounced save**: вызвать `onContentChanged` несколько раз, проверить через `fakeAsync` + `tick(3000)` что `save` вызван один раз с последним значением
- **onContentChanged — не сохраняет дубликат**: вызвать с тем же текстом → `save` не вызван повторно
- **discardDraft**: проверяет вызов `deleteByRoute`
- **ошибки DraftStorageService**: ошибки ловятся и логируются, не пропагируются

### 5. Lint и build проверка

```bash
yarn nx lint client
yarn nx test client --testPathPattern="draft"
yarn build
```

## Интеграция в потребителя — финальный вид

Для подключения draft-автосохранения в любую страницу с редактором:

```typescript
// 1. Добавить в providers:
providers: [DraftEditorService],

// 2. inject:
private readonly draftEditor = inject(DraftEditorService);

// 3. После загрузки данных — проверить черновик:
const route = `/articles/edit/${articleId}`;
const draftText = await this.draftEditor.checkDraft(route);
this.editorContent.set(draftText ?? originalContent);

// 4. В contentChanged — сообщить об изменении:
this.draftEditor.onContentChanged({ route, title, text: content });

// 5. После успешного сохранения — удалить черновик:
await this.draftEditor.discardDraft(route);

// 6. При отмене — confirm + навигация:
await this.draftEditor.confirmDiscardAndNavigate(route, ['/articles', articleId]);
```

## Принятые решения

| Вопрос | Решение | Обоснование |
|--------|---------|-------------|
| Scope сервиса | Feature-scoped (не `providedIn: 'root'`) | Каждый экземпляр хранит свой `lastSavedText`, `contentSubject`. Несколько редакторов одновременно — каждый со своим сервисом |
| Расположение сервиса | `app/shared/services/` | Может использоваться несколькими features (article-edit, возможные будущие страницы) |
| Debounce interval | 3 секунды | Баланс между частотой записи и риском потери данных |
| Закрытие диалога восстановления | `disableClose: true` | Пользователь обязан явно выбрать. Случайный Esc не удалит черновик |
| Ошибки DraftStorageService | catch + log, не пропагировать | Черновики — удобство, не критичная функция. Ошибка IndexedDB не должна блокировать редактирование |
| `editorContent` signal | Новый signal в потребителе | Позволяет подменить контент на восстановленный черновик, не мутируя `version` |
| Route format | `/articles/edit/${articleId}` | Привязка к статье, а не к версии. versionId меняется после каждого save — черновик бы терялся |
| Кнопка «Отмена» | confirm-диалог перед удалением | Если есть черновик — спрашиваем «Удалить черновик?». Если нет — навигируем сразу |

## Верификация

```bash
yarn nx lint client                        # Линтинг
yarn nx test client --testPathPattern="draft"  # Тесты draft-related
yarn build                                 # Полная сборка
```

Ручная проверка:
1. Открыть статью на редактирование, ввести текст, подождать 3+ секунды
2. DevTools → Application → IndexedDB → `drevo-drafts` → проверить запись
3. Закрыть вкладку / перейти назад, открыть ту же статью снова → диалог восстановления
4. Нажать «Восстановить» → текст из черновика в редакторе
5. Сохранить статью → черновик удалён из IndexedDB
