# Валидация контента в редакторе

## Цель

Добавить систему валидации wiki-контента с тремя слоями:
1. **Чистое ядро** — функция `validateWikiContent(text): ContentError[]`, без зависимостей от CM6
2. **CM6-интеграция** — `@codemirror/lint` для inline-подсветки ошибок в редакторе
3. **Angular-мост** — проброс числа ошибок наружу через `@Output()` для предупреждений на кнопках Сохранить/Модерировать

## Принятые решения

| Вопрос | Решение |
|--------|---------|
| Правила на старте | Заголовки: запрет ссылок `(())`, жирного `*`, курсива `_`, сносок `[[]]` внутри `== ==` и `=== ===`. Архитектура расширяемая |
| Где нужна валидация без редактора | На кнопках Сохранить / Модерировать (предупреждение, не блокировка) |
| Severity | Два типа: **error** (блокирует сохранение) и **warning** (предупреждение, не блокирует). Стартовые правила — warning |
| Расположение чистого ядра | `libs/editor` (рядом с CM6-обёрткой, но без CM6-зависимостей) |
| Debounce линтера | 750мс (дефолт CM6), не указываем явно |
| Панель диагностик | Полный набор: gutter + inline + панель (openLintPanel) |
| Архитектура правил | Rule-объект с метаданными `{ id, defaultSeverity, validate() }`, severity переопределяется через конфигурацию |
| Output валидации | `@Output() validationChange` → `ValidationResult { errors, warnings }`. Angular convention `*Change`, покрывает оба severity |
| Angular bridge | Читаем из CM6 lint state через `forEachDiagnostic` + `setDiagnosticsEffect`. Единый источник правды, без дублирования валидации |
| Модерация: передача count | Input `validationResult` на `ModerationSidebarActionComponent`. Только одна цепочка: diff-page → moderation (прямой input). На content-tab не валидируем (content там HTML, не raw wiki) |
| Блокировка save | Синхронный `validateWikiContent()` в save() — authoritative. Output `validationChange` — только для UI-индикации |
| Начальный emit | После создания EditorView прочитать текущий lint state и эмитить initial `ValidationResult` |

## Архитектура

```
libs/editor/src/lib/
  validation/
    rules/
      heading-rules.ts            ← правила для заголовков (объекты ValidationRule)
      index.ts                    ← ALL_RULES массив, реэкспорт
    models/
      content-error.model.ts      ← интерфейс ContentError
      validation-rule.model.ts    ← интерфейсы ValidationRule, RuleMatch, ValidationConfig
      validation-result.model.ts  ← интерфейс ValidationResult (errors/warnings counts)
    validate-wiki-content.ts      ← чистая функция-агрегатор
    validate-wiki-content.spec.ts ← тесты чистого ядра
    wiki-linter.ts                ← CM6 LintSource + lintGutter + lintKeymap
    wiki-linter.spec.ts           ← тесты линтера
  ...
```

### Слой 1: Чистое ядро (`validate-wiki-content.ts`)

```typescript
// models/content-error.model.ts
export interface ContentError {
  readonly from: number;      // позиция начала (смещение в строке)
  readonly to: number;        // позиция конца
  readonly message: string;   // "Ссылки запрещены в заголовках"
  readonly severity: 'error' | 'warning';
  readonly ruleId: string;    // 'heading-no-links', 'heading-no-formatting'
}

// models/validation-rule.model.ts
export interface RuleMatch {
  readonly from: number;
  readonly to: number;
  readonly message: string;
}

export interface ValidationRule {
  readonly id: string;
  readonly defaultSeverity: 'error' | 'warning';
  validate(text: string): readonly RuleMatch[];
}

export interface ValidationConfig {
  readonly overrides?: Partial<Record<string, 'error' | 'warning' | 'off'>>;
}
```

```typescript
// validate-wiki-content.ts
import { ALL_RULES } from './rules';

export function validateWikiContent(text: string, config?: ValidationConfig): readonly ContentError[] {
  return ALL_RULES.flatMap(rule => {
    const severity = config?.overrides?.[rule.id] ?? rule.defaultSeverity;
    if (severity === 'off') return [];
    return rule.validate(text).map(match => ({
      ...match,
      severity,
      ruleId: rule.id,
    }));
  });
}
```

```typescript
// rules/heading-rules.ts — каждое правило как объект ValidationRule
export const headingNoLinks: ValidationRule = {
  id: 'heading-no-links',
  defaultSeverity: 'warning',
  validate(text) { /* ... */ },
};

export const headingNoFormatting: ValidationRule = { /* ... */ };
export const headingNoFootnotes: ValidationRule = { /* ... */ };
```

**Добавление нового правила**: создать объект `ValidationRule` в `rules/`, добавить в массив `ALL_RULES`.

### Слой 2: CM6-интеграция (`wiki-linter.ts`)

```typescript
import { linter, lintGutter, lintKeymap, Diagnostic } from '@codemirror/lint';
import { keymap } from '@codemirror/view';

function wikiLintSource(view: EditorView): readonly Diagnostic[] {
  return validateWikiContent(view.state.doc.toString()).map(err => ({
    from: err.from,
    to: err.to,
    severity: err.severity,
    message: err.message,
  }));
}

export const wikiLinter = linter(wikiLintSource);
export const wikiLintGutter = lintGutter();
export const wikiLintKeymap = keymap.of(lintKeymap); // Ctrl+Shift+M открывает панель
```

Подключается как extension в `EditorFactoryService.createState()`.

### Слой 3: Angular-мост (в `EditorComponent`)

```typescript
// models (экспортируется из @drevo-web/editor)
export interface ValidationResult {
  readonly errors: number;
  readonly warnings: number;
}

// editor.component.ts — новый output
@Output() readonly validationChange = new EventEmitter<ValidationResult>();

// Механизм связи: читаем из CM6 lint state (не дублируем валидацию)
// Extension добавляется в EditorFactoryService.createState()
import { setDiagnosticsEffect, forEachDiagnostic } from '@codemirror/lint';

EditorView.updateListener.of((update) => {
  const hasLintUpdate = update.transactions.some(tr =>
    tr.effects.some(e => e.is(setDiagnosticsEffect))
  );
  if (hasLintUpdate) {
    let errors = 0, warnings = 0;
    forEachDiagnostic(update.state, (d) => {
      if (d.severity === 'error') errors++;
      else if (d.severity === 'warning') warnings++;
    });
    this.validationHandler({ errors, warnings });
  }
});

// Начальный emit: после создания EditorView прочитать текущий lint state
// (lint может отработать синхронно при создании state)
private emitInitialValidation(): void {
  let errors = 0, warnings = 0;
  forEachDiagnostic(this.editor.state, (d) => {
    if (d.severity === 'error') errors++;
    else if (d.severity === 'warning') warnings++;
  });
  this.validationChange.emit({ errors, warnings });
}
// Вызвать в ngAfterViewInit() после создания EditorView
```

**Для использования без редактора** (diff-page, save):
```typescript
import { validateWikiContent } from '@drevo-web/editor';
// вызов напрямую, без CM6 — только на raw wiki-контенте!
const problems = validateWikiContent(rawWikiContent);
const errors = problems.filter(p => p.severity === 'error');
const warnings = problems.filter(p => p.severity === 'warning');
```

## Правила валидации (стартовый набор)

### `heading-no-links` (warning)
Запрет ссылок `(( ))` внутри заголовков `== ... ==` и `=== ... ===`.

**Regex**: находим заголовки `^(={2,3})\s(.+?)\s\1$`, внутри содержимого ищем `\(\(.*?\)\)`.

### `heading-no-formatting` (warning)
Запрет жирного `*...*` и курсива `_..._` внутри заголовков.

### `heading-no-footnotes` (warning)
Запрет сносок `[[ ... ]]` внутри заголовков.

## Точки интеграции

### 1. Редактор (inline подсветка)

**Файл**: `libs/editor/src/lib/services/editor-factory/editor-factory.service.ts`

Добавить в массив extensions:
```typescript
import { wikiLinter, wikiLintGutter, wikiLintKeymap } from '../../validation/wiki-linter';

// в createState():
extensions: [
  ...existingExtensions,
  wikiLinter,
  wikiLintGutter,
  wikiLintKeymap,
]
```

### 2. Страница редактирования — кнопка «Сохранить»

**Файл**: `apps/client/src/app/features/article/pages/article-edit/article-edit.component.ts`

- `(validationChange)` output из `<lib-editor>` — для **UI-индикации** (badge, иконки предупреждений)
- В методе `save()` — **синхронная authoritative проверка** (не полагаемся на debounced lint state):
  ```typescript
  const problems = validateWikiContent(this.editorContent());
  const errors = problems.filter(p => p.severity === 'error');
  const warnings = problems.filter(p => p.severity === 'warning');
  ```
  - Если `errors.length > 0` — блокировать сохранение, показать сообщение: «В тексте найдены ошибки (N). Исправьте их перед сохранением»
  - Если `warnings.length > 0` (и нет errors) — показать `ConfirmationService.open()`: «В тексте найдены предупреждения (N). Сохранить?»
  - Если пользователь подтвердил — сохранить как обычно

```html
<lib-editor
    ...
    (validationChange)="onValidationChange($event)"
/>
```

### 3. Модерация — кнопки «Одобрить» / «На проверку» / «Отклонить»

**Проблема**: `ArticleModerationPanelComponent` получает `VersionForModeration`, у которого нет поля `content`. Модерация работает с версией, контент которой уже на сервере.

**Решение**: валидировать только на diff-page, где raw wiki-контент гарантирован. На article-content-tab не валидируем — `article().content` там содержит HTML (endpoint `/api/articles/show/{id}` форматирует контент).

**Единственная цепочка:**

```
diff-page (имеет data.versionPairs()?.current.content — raw wiki)
  → computed: validationResult = toValidationResult(validateWikiContent(content))
  → [validationResult] → moderation-sidebar-action
    → показывает ui-badge (errors + warnings)
```

Input на `ModerationSidebarActionComponent`: `validationResult = input<ValidationResult>({ errors: 0, warnings: 0 })`.

## Стилизация

### CM6 lint (встроенные стили)
`@codemirror/lint` добавляет классы: `.cm-lint-marker-warning`, `.cm-diagnostic-warning`, волнистое подчёркивание.

Кастомизация в `libs/editor/src/lib/components/editor/codemirror-custom.scss`:
```scss
.cm-diagnostic-warning {
  border-color: var(--themed-warning);
}
.cm-lint-marker-warning {
  // стиль gutter-маркера
}
// tooltip при наведении на ошибку — стандартный CM6, при необходимости кастомизируем
```

### Badge на кнопке модерации
Использовать `ui-badge` из `@drevo-web/ui` с числом ошибок.

## Экспорт из libs/editor

Добавить в `libs/editor/src/index.ts`:
```typescript
export { validateWikiContent } from './lib/validation/validate-wiki-content';
export type { ContentError } from './lib/validation/models/content-error.model';
export type { ValidationResult } from './lib/validation/models/validation-result.model';
```

CM6-специфичные `wikiLinter`, `wikiLintGutter` — используются только внутри `libs/editor`, не экспортируются.

## Зависимости

`@codemirror/lint` v6.9.3 — уже установлен как транзитивная зависимость через `codemirror`. Отдельная установка не нужна.

## Этапы реализации

### Этап 1: Чистое ядро + тесты
1. Создать `validation/models/content-error.model.ts`
2. Создать `validation/rules/heading-rules.ts` с тремя правилами
3. Создать `validation/validate-wiki-content.ts` — агрегатор
4. Написать тесты: `validate-wiki-content.spec.ts` — покрыть все правила (чистый текст → массив ошибок)
5. Экспортировать из `index.ts`

### Этап 2: CM6-линтер
1. Установить `@codemirror/lint` (если не установлен)
2. Создать `validation/wiki-linter.ts`
3. Подключить в `EditorFactoryService.createState()`
4. Добавить стили в `codemirror-custom.scss`
5. Проверить в браузере: вставить ссылку в заголовок → волнистое подчёркивание + tooltip

### Этап 3: Angular-мост в редакторе
1. Добавить `@Output() validationChange` → `ValidationResult` в `EditorComponent`
2. В `EditorFactoryService` добавить `setValidationHandler` + `updateListener` с `setDiagnosticsEffect` / `forEachDiagnostic`. В `EditorComponent.ngAfterViewInit()` подключить handler → `validationChange.emit()`
3. Добавить `emitInitialValidation()` — прочитать lint state после создания EditorView и эмитить начальный результат
4. В `ArticleEditComponent.save()` — **синхронный** `validateWikiContent(this.editorContent())`. При errors — блокировать, при warnings — confirmation dialog
5. Тесты для `EditorComponent` (mock lint state → проверить emit, включая initial)

### Этап 4: Интеграция с модерацией (только diff-page)
1. Добавить `validationResult = input<ValidationResult>({ errors: 0, warnings: 0 })` в `ModerationSidebarActionComponent`, показать `ui-badge` при errors + warnings > 0
2. В `DiffPageComponent` — `computed` с `validateWikiContent(data.versionPairs()?.current.content)` → `ValidationResult`, передать `[validationResult]` в `moderation-sidebar-action`
3. Тесты

## Оценка трудоёмкости

| Этап | Ориентир |
|------|----------|
| Этап 1: Ядро + тесты | ~2 часа |
| Этап 2: CM6 lint | ~1-2 часа |
| Этап 3: Angular-мост + save | ~2-3 часа |
| Этап 4: Модерация (только diff-page) | ~1-2 часа |
| **Итого** | **~6-9 часов** |

## Открытые вопросы

Все вопросы закрыты — решения зафиксированы в таблице «Принятые решения» (включая исправления по ревью Codex).
