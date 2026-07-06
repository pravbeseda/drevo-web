# План реализации: переиспользование ui-lib в review-block

Источник решений: [`ui-reuse.md`](./ui-reuse.md) (Q1–Q4, все приняты).
Цель — убрать самописный UI в `app-review-block`, переведя его на примитивы
`@drevo-web/ui`, расширив их где нужно. Доменную логику (signals, формы, права,
загрузка отзывов) НЕ трогаем — меняем только presentation-слой.

## Context

`app-review-block` (`apps/client/src/app/shared/components/review-block/`) собран и покрыт
тестами, но дублирует/обходит ui-lib в четырёх местах. Правила проекта: Material только
через `@drevo-web/ui`; размеры — токенами `_tokens.scss`; `data-testid` для тест-селекторов;
тесты обязательны. Порядок работ — Q1 → Q2 → Q3 → Q4: `tone` из Q1 переиспользуется
в пилюлях (Q2) и косвенно в `ui-icon-button` (Q3).

## Принятые решения (из ui-reuse.md)

- **Q1** — добавить `tone` в `ui-icon` (опциональный, без дефолта; `undefined` = наследуем
  ambient `color`). Убрать `.review-ic` (3×) и цветовой SCSS-блок.
- **Q2** — новый `ui-button-toggle-group` (обёртка `mat-button-toggle-group`, CVA) в
  `libs/ui`. Заменить рукописные радио-пилюли.
- **Q3** — `ui-icon-button icon="delete"` + tooltip/aria. Убрать `.review-cmt-del`.
- **Q4** — карточку оставить кастомной; вынести `border-radius: 10px` в токен `_tokens.scss`
  и применить в `.review-block` + `ui-banner`.

## Recommended Approach

### Шаг 1 — Q1: `tone` в `ui-icon` (`libs/ui`)

`libs/ui/src/lib/components/icon/icon.component.ts`:
- добавить `export type IconTone = 'success' | 'warning' | 'error' | 'neutral' | 'primary' | 'secondary';`
- `readonly tone = input<IconTone>();` (без дефолта)
- host-class под цвет: `host: { '[class]': 'toneClass()' }`, где
  `toneClass = computed(() => this.tone() ? 'tone-' + this.tone() : '')`.
  (учесть, что `[class]` заменяет classList host'а — здесь конфликтов нет, у `:host` своих
  классов нет; если появятся — перейти на `[class.tone-...]` биндинги.)

`icon.component.scss` — добавить карту цветов на `:host`:
```scss
:host {
    &.tone-success   { color: var(--themed-text-success); }
    &.tone-warning   { color: var(--themed-text-warning); }
    &.tone-error     { color: var(--themed-text-error); }
    &.tone-neutral   { color: var(--themed-text-muted); }
    &.tone-primary   { color: var(--themed-text-primary); }
    &.tone-secondary { color: var(--themed-text-secondary); }
}
```
(`mat-icon` рисуется `currentColor` → задание `color` на host красит иконку.)

Тест `icon.component.spec`: `tone` вешает класс `tone-*`; без `tone` — класса нет
(наследование сохранено).

**ReviewStatusClass → IconTone**: значения совпадают 1:1
(`success|warning|error|neutral`), маппинг не нужен — `[tone]="item.cssClass"`.

### Шаг 2 — Q2: `ui-button-toggle-group` (`libs/ui`)

Новый компонент `libs/ui/src/lib/components/button-toggle-group/`:
`button-toggle-group.component.{ts,html,scss,spec.ts}`.

- селектор `ui-button-toggle-group`, OnPush, отдельные html/scss.
- обёртка над `MatButtonToggleModule` (`mat-button-toggle-group` + `mat-button-toggle`),
  `multiple=false` (single-select).
- CVA по образцу `toggle.component.ts` (`NG_VALUE_ACCESSOR` + `forwardRef`), но значение —
  `string | number` (ReviewStatus числовой). `writeValue` пишет в `signal`,
  `onChange`/`onTouched` при выборе/blur.
- API — опции через **input-массив** (проще тестировать и типизировать):
  ```ts
  export interface ButtonToggleOption {
      readonly value: string | number;
      readonly label: string;
      readonly icon?: string;
      readonly tone?: IconTone;   // из Q1 — цвет иконки опции
  }
  readonly options = input.required<readonly ButtonToggleOption[]>();
  readonly ariaLabel = input<string>();
  ```
  В шаблоне: `@for (opt of options())` → `mat-button-toggle [value]="opt.value"` с
  `ui-icon [name]="opt.icon" [tone]="opt.tone"` + лейбл.
- стили: скруглённые «пилюли» с зазором (повторить нынешний вид через
  `--mat-*`-override в SCSS компонента — это разрешено внутри `libs/ui`); выбранное
  состояние — рамка/фон по `--themed-*`.
- `data-testid` прокинуть на каждый toggle (напр. `testIdPrefix` input или
  `[attr.data-testid]="'toggle-' + opt.value"`).
- экспорт в `libs/ui/src/index.ts` (+ тип `ButtonToggleOption`).
- тест компонента: рендер опций; выбор эмитит значение и зовёт `onChange`; `writeValue`
  подсвечивает опцию; работа как `ControlValueAccessor` с `FormControl`.

В review-block:
- `review-block.component.ts`: `formOptions()` уже отдаёт нужные поля
  (`status/label/icon/cssClass`) — добавить маппинг в `ButtonToggleOption`
  (`value: status`, `tone: cssClass`) либо отдавать сразу в этом виде.
- `review-block.component.html`: заменить блок `.review-statuses`/`.review-opt`/`.review-pill`
  (стр. 88–113) на:
  ```html
  <ui-button-toggle-group
      formControlName="status"
      [options]="formOptions()"
      ariaLabel="Ваш отзыв"
      data-testid="review-status"
  />
  ```
- `review-block.component.scss`: удалить `.review-statuses`, `.review-opt`, `.review-pill`,
  `.review-opt-label`, `.review-pill`-состояния (стр. 142–189).
- imports: убрать неиспользуемое (если `ReactiveFormsModule` остаётся для формы — оставить),
  добавить `ButtonToggleGroupComponent`.

### Шаг 3 — Q3: `ui-icon-button` для удаления

`review-block.component.html` (стр. 51–58): заменить `<button class="review-cmt-del">` на:
```html
@if (item.canDelete) {
    <ui-icon-button
        class="review-cmt-del"
        icon="delete"
        label="Удалить отзыв"
        data-testid="review-delete"
        (clicked)="deleteReview(item.review)"
    />
}
```
- `review-block.component.scss`: удалить стили `.review-cmt-del` (стр. 99–112); при
  необходимости оставить только `margin-left:auto` для выравнивания вправо.
- imports: добавить `IconButtonComponent`, убрать неиспользуемое.

### Шаг 4 — Q4: токен радиуса

`libs/ui/src/lib/styles/_tokens.scss`: добавить в секцию размеров, напр.:
```scss
$panel-border-radius: 10px;
```
Применить:
- `review-block.component.scss` (`.review-block`): `@use 'tokens' as *;` +
  `border-radius: $panel-border-radius;`. Доступ подтверждён —
  `apps/client/project.json` задаёт `includePaths: ["libs/ui/src/lib/styles"]`, и многие
  app-компоненты уже используют `@use 'tokens' as *`.
- `banner.component.scss`: заменить `border-radius: 10px` на токен.

## Обновление тестов

- `review-block.component.spec.ts`:
  - тест «hide Одобряю» (стр. 89–96) — селектор `.review-opt-label` больше не существует.
    Перевести на проверку через новый контрол: либо `data-testid` опций
    (`review-status` → отсутствие toggle со значением `Approve`/лейблом «Одобряю`),
    либо проверку `formOptions()` (уже есть проверка `isOwnVersion()`), плюс DOM-проверка
    отрендеренных лейблов toggle-группы.
  - тест удаления (стр. 129–143) зовёт `component.deleteReview()` напрямую — DOM-замена
    кнопки на `ui-icon-button` его не ломает; опционально добавить проверку клика по
    `[data-testid="review-delete"]`.
  - остальные тесты завязаны на `component.form`/`canSave`/`canClear` — не зависят от
    виджета, остаются.
- новые specs: `icon.component.spec` (tone), `button-toggle-group.component.spec`.
- `banner` спека (если есть) — радиус из токена, поведение не меняется.

## Критические файлы

**libs/ui (новое/изменяемое):**
- `components/icon/icon.component.{ts,scss}` (+ `IconTone`, spec)
- `components/button-toggle-group/*` (новый компонент + spec)
- `components/banner/banner.component.scss` (токен радиуса)
- `lib/styles/_tokens.scss` (+ `$panel-border-radius`)
- `src/index.ts` (экспорт `ButtonToggleGroupComponent` + `ButtonToggleOption`)

**apps/client (review-block):**
- `shared/components/review-block/review-block.component.{ts,html,scss}`
- `shared/components/review-block/review-block.component.spec.ts`

**Переиспользуем:** `ui-icon` (+tone), `ui-icon-button`, `ui-button`, `ui-text-input`,
`FormatDatePipe`, `ConfirmationService`, токены `--themed-*`.

## Разбивка на PR

Связность высокая (review-block потребляет новые примитивы), поэтому **один PR** с
логически раздельными коммитами:
1. `feat(ui): add tone input to ui-icon`
2. `feat(ui): add ui-button-toggle-group`
3. `refactor(ui): extract panel border-radius token`
4. `refactor(reviews): consume ui primitives in review-block` (Q1–Q4 в review-block + тесты)

(Допустимо разбить на 2 PR: ui-lib-примитивы → потребление в review-block, если ревью
удобнее по слоям.)

## Verification

- `yarn nx test ui` — icon (tone), button-toggle-group, banner.
- `yarn nx test client` — review-block (обновлённый «hide Одобряю» + остальное зелёное).
- `yarn nx build client` — typecheck (ts-jest transpile-only не ловит типы).
- `yarn lint`, `yarn format:check`.
- Ручная (`yarn serve`): pending-версия с правом ревью — пилюли через
  `ui-button-toggle-group` выбираются/обязательность комментария/save/clear работают;
  иконка-корзина удаляет (с подтверждением); цвет иконок статусов корректен в светлой/
  тёмной теме; карточка визуально не изменилась (радиус из токена).
- a11y-проверка: toggle-группа навигируется стрелками; у иконки-удаления есть
  accessible name (`label` → aria/tooltip).

## Риски / на что смотреть

- `[class]` host-биндинг в `ui-icon` затирает classList — убедиться, что у `:host` нет
  других динамических классов (сейчас нет). Иначе перейти на `[class.tone-*]`.
- Визуальный паритет `mat-button-toggle` с нынешними пилюлями требует `--mat-*`-overrides
  в SCSS компонента (разрешено в `libs/ui`) — заложить время на подгонку.
