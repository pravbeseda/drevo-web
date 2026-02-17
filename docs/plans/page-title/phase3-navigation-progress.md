# Фаза 3: Глобальный progress bar навигации

## Предусловие

[Фаза 2](phase2-article-resolver.md) завершена: resolver загружает статью до показа компонента. Побочный эффект — пользователь видит предыдущую страницу без индикации загрузки, пока идёт HTTP-запрос.

## Цель

Добавить глобальный progress bar в верхней части страницы (по аналогии с YouTube, GitHub), который показывается при навигации с resolver-ами или любой другой задержкой маршрутизации.

## Архитектура

```
Router.events
    ↓ NavigationStart  → показать progress bar
    ↓ NavigationEnd    → скрыть progress bar
    ↓ NavigationCancel → скрыть progress bar
    ↓ NavigationError  → скрыть progress bar

NavigationProgressComponent (в AppComponent, над router-outlet)
    ↓ подписка на Router.events
    ↓ signal isNavigating → CSS-анимация
```

## Шаги реализации

### 1. Создать `NavigationProgressComponent`

Файл: `apps/client/src/app/components/navigation-progress/navigation-progress.component.ts`

Standalone компонент с подпиской на `Router.events`:

```typescript
@Component({
    selector: 'app-navigation-progress',
    templateUrl: './navigation-progress.component.html',
    styleUrl: './navigation-progress.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationProgressComponent {
    private readonly router = inject(Router);

    readonly isNavigating = toSignal(
        this.router.events.pipe(
            filter(e =>
                e instanceof NavigationStart ||
                e instanceof NavigationEnd ||
                e instanceof NavigationCancel ||
                e instanceof NavigationError
            ),
            map(e => e instanceof NavigationStart)
        ),
        { initialValue: false }
    );
}
```

### 2. Шаблон и стили

```html
<!-- navigation-progress.component.html -->
@if (isNavigating()) {
    <div class="navigation-progress" data-testid="navigation-progress">
        <div class="navigation-progress__bar"></div>
    </div>
}
```

```scss
// navigation-progress.component.scss
.navigation-progress {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    height: 3px;
    overflow: hidden;

    &__bar {
        height: 100%;
        background: var(--themed-primary);
        animation: progress 2s ease-in-out infinite;
    }
}

@keyframes progress {
    0% {
        width: 0;
        margin-left: 0;
    }
    50% {
        width: 70%;
        margin-left: 15%;
    }
    100% {
        width: 0;
        margin-left: 100%;
    }
}
```

### 3. Добавить в `AppComponent`

```html
<app-navigation-progress />
<!-- остальной контент -->
```

### 4. Написать тесты

- Проверить что `isNavigating()` = `true` при `NavigationStart`
- Проверить что `isNavigating()` = `false` при `NavigationEnd`, `NavigationCancel`, `NavigationError`
- Проверить что `[data-testid="navigation-progress"]` рендерится при `isNavigating()` = `true`

---

## Файлы для создания

| Файл | Назначение |
|------|-----------|
| `apps/client/src/app/components/navigation-progress/navigation-progress.component.ts` | Компонент progress bar |
| `apps/client/src/app/components/navigation-progress/navigation-progress.component.html` | Шаблон |
| `apps/client/src/app/components/navigation-progress/navigation-progress.component.scss` | Стили |
| `apps/client/src/app/components/navigation-progress/navigation-progress.component.spec.ts` | Тесты |

## Файлы для изменения

| Файл | Что меняется |
|------|-------------|
| `apps/client/src/app/app.component.html` | Добавить `<app-navigation-progress />` |
| `apps/client/src/app/app.component.ts` | Добавить `NavigationProgressComponent` в imports |

## Открытые вопросы

1. **Debounce**: стоит ли добавить debounce (например 100ms) чтобы не мигать при быстрой навигации без resolver-ов?
2. **Angular Material progress bar**: использовать `mat-progress-bar` (mode="indeterminate") через `@drevo-web/ui` или свой CSS? Material даёт accessibility из коробки.
3. **SSR**: компонент должен рендериться только в browser (`isPlatformBrowser`), т.к. на сервере навигация всегда синхронная.
