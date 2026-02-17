# Фаза 3: Глобальный progress bar навигации

## Предусловие

[Фаза 2](phase2-article-resolver.md) завершена: resolver загружает статью до показа компонента. Побочный эффект — пользователь видит предыдущую страницу без индикации загрузки, пока идёт HTTP-запрос.

## Цель

Добавить глобальный progress bar в верхней части страницы (по аналогии с YouTube, GitHub), который показывается при навигации с resolver-ами или любой другой задержкой маршрутизации.

## Архитектура

```
Router.events
    ↓ NavigationStart  → debounce 100ms → показать progress bar
    ↓ NavigationEnd    → скрыть progress bar (немедленно)
    ↓ NavigationCancel → скрыть progress bar (немедленно)
    ↓ NavigationError  → скрыть progress bar (немедленно)

NavigationProgressComponent (в libs/ui, используется в AppComponent над router-outlet)
    ↓ input isNavigating → управляет видимостью
    ↓ Angular Material mat-progress-bar (mode="indeterminate")
```

Debounce применяется только к показу (NavigationStart): если навигация завершается быстрее 100ms, progress bar не появляется. Скрытие — мгновенное.

## Шаги реализации

### 1. Создать `NavigationProgressComponent` в `libs/ui`

Файл: `libs/ui/src/lib/components/navigation-progress/navigation-progress.component.ts`

Standalone UI-компонент с input-сигналом. Логика навигации остаётся в `AppComponent` — UI-компонент только отображает progress bar:

```typescript
@Component({
    selector: 'ui-navigation-progress',
    templateUrl: './navigation-progress.component.html',
    styleUrl: './navigation-progress.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatProgressBarModule],
})
export class NavigationProgressComponent {
    readonly isNavigating = input.required<boolean>();
}
```

### 2. Шаблон и стили

```html
<!-- navigation-progress.component.html -->
@if (isNavigating()) {
    <mat-progress-bar
        mode="indeterminate"
        data-testid="navigation-progress"
    />
}
```

```scss
// navigation-progress.component.scss
:host {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
}
```

### 3. Экспортировать из `libs/ui`

Добавить в `libs/ui/src/index.ts`:

```typescript
export * from './lib/components/navigation-progress/navigation-progress.component';
```

### 4. Использовать в `AppComponent`

```typescript
// app.component.ts
import { NavigationProgressComponent } from '@drevo-web/ui';

const NAVIGATION_DEBOUNCE_MS = 100;

// В конструкторе или как поле класса:
private readonly router = inject(Router);

readonly isNavigating = toSignal(
    this.router.events.pipe(
        filter(e =>
            e instanceof NavigationStart ||
            e instanceof NavigationEnd ||
            e instanceof NavigationCancel ||
            e instanceof NavigationError
        ),
        map(e => e instanceof NavigationStart),
        switchMap(navigating =>
            navigating
                ? timer(NAVIGATION_DEBOUNCE_MS).pipe(map(() => true))
                : of(false)
        )
    ),
    { initialValue: false }
);
```

```html
<!-- app.component.html -->
<ui-navigation-progress [isNavigating]="isNavigating()" />
<!-- остальной контент -->
```

SSR: на сервере `toSignal` начинает с `initialValue: false`, Router events с debounce не эмитят — progress bar не появится.

### 5. Написать тесты

#### UI-компонент (`libs/ui`)
- Проверить что `mat-progress-bar` рендерится при `isNavigating = true`
- Проверить что `mat-progress-bar` не рендерится при `isNavigating = false`

#### AppComponent (интеграция)
- Проверить что `isNavigating()` = `true` при `NavigationStart` после 100ms debounce
- Проверить что `isNavigating()` = `false` при `NavigationEnd`, `NavigationCancel`, `NavigationError`
- Проверить что progress bar не появляется, если навигация завершается быстрее 100ms

---

## Файлы для создания

| Файл | Назначение |
|------|-----------|
| `libs/ui/src/lib/components/navigation-progress/navigation-progress.component.ts` | UI-компонент progress bar |
| `libs/ui/src/lib/components/navigation-progress/navigation-progress.component.html` | Шаблон (mat-progress-bar) |
| `libs/ui/src/lib/components/navigation-progress/navigation-progress.component.scss` | Стили (позиционирование) |
| `libs/ui/src/lib/components/navigation-progress/navigation-progress.component.spec.ts` | Тесты UI-компонента |

## Файлы для изменения

| Файл | Что меняется |
|------|-------------|
| `libs/ui/src/index.ts` | Экспорт `NavigationProgressComponent` |
| `apps/client/src/app/app.component.html` | Добавить `<ui-navigation-progress />` |
| `apps/client/src/app/app.component.ts` | Добавить `NavigationProgressComponent` в imports, логику `isNavigating` |
