# Фаза 1: Статические заголовки страниц

## Цель

Вместо статичного «Древо» в хэдере показывать название текущей страницы. В `<title>` — то же название + суффикс ` - Древо` (для SEO и SSR).

Для `articles/:id` — временный статический title `'Статья'`. Динамический title через resolver — в [фазе 2](phase2-article-resolver.md).

## Архитектура

```
Route title → PageTitleStrategy → Title.setTitle(pageTitle + ' - Древо')   // <title>
                                → signal _pageTitle                         // хэдер
HeaderComponent ← inject(PageTitleStrategy).pageTitle()
```

Один source of truth — свойство `title` на роуте. `PageTitleStrategy` — единственный потребитель, который раздаёт title в два направления.

---

## Шаги реализации

### 1. Исправить дублирование роутера в `app.config.ts`

Сейчас роуты регистрируются дважды — через `provideRouter()` и `RouterModule.forRoot()`. Убрать `RouterModule.forRoot`, оставить только `provideRouter`. Если нужен `enableTracing` — добавить `withDebugTracing()` в `provideRouter`.

### 2. Создать `PageTitleStrategy`

Файл: `apps/client/src/app/services/page-title.strategy.ts`

```typescript
@Injectable()
export class PageTitleStrategy extends TitleStrategy {
    private readonly title = inject(Title);  // из @angular/platform-browser
    private readonly logger = inject(LoggerService).withContext('PageTitleStrategy');
    private readonly _pageTitle = signal('Древо');
    readonly pageTitle = this._pageTitle.asReadonly();

    override updateTitle(snapshot: RouterStateSnapshot): void {
        const title = this.buildTitle(snapshot);  // встроенный метод TitleStrategy
        if (title) {
            this._pageTitle.set(title);
            this.title.setTitle(`${title} - Древо`);
        } else {
            this._pageTitle.set('Древо');
            this.title.setTitle('Древо');
        }
        this.logger.debug('Title updated', { title: title ?? 'Древо' });
    }
}
```

**Ключевые моменты:**
- `TitleStrategy` — абстрактный класс Angular, `buildTitle()` собирает title из deepest child route
- `Title` из `@angular/platform-browser` — SSR-совместимый сервис для `<title>`
- Signal `pageTitle` — для чтения в хэдере
- Fallback на `'Древо'` если title не задан (не должно случаться, но safety net)
- Логирование через `LoggerService` по конвенциям проекта

### 3. Зарегистрировать стратегию в `app.config.ts`

```typescript
import { TitleStrategy } from '@angular/router';
import { PageTitleStrategy } from './services/page-title.strategy';

// В providers:
{ provide: TitleStrategy, useClass: PageTitleStrategy }
```

### 4. Добавить `title` на все роуты

В `app.routes.ts` и `article.routes.ts` — статические строки:

| Роут | `title` |
|------|---------|
| `/login` | `'Вход'` |
| `/` | `'Главная'` |
| `/editor` | `'Редактор'` |
| `/history` (внешний узел `path: 'history'`) | `'История изменений'` (fallback для всех children, diff-роуты перекроют своим title) |
| `/history/articles` | — (наследует от родителя) |
| `/history/news` | `'История новостей'` |
| `/history/forum` | `'История обсуждений'` |
| `/history/pictures` | `'История изображений'` |
| `/history/articles/diff2/:id` | `'Сравнение версий'` |
| `/history/articles/diff2/:id1/:id2` | `'Сравнение версий'` |
| `/history/articles/diff/:id` | `'Сравнение версий'` |
| `/history/articles/diff/:id1/:id2` | `'Сравнение версий'` |
| `/articles/edit/:id` | `'Редактирование статьи'` |
| `/articles/version/:id` | `'Перенаправление'` |
| `/articles/:id` | `'Статья'` (временно, до фазы 2) |
| `/articles/:id/version/:versionId` | `'Статья'` (наследует от родителя) |
| `/articles/:id/history` | `'История версий'` |
| `/articles/:id/news` | `'Новости'` |
| `/articles/:id/forum` | `'Обсуждение'` |
| `/articles/:id/linkedhere` | `'Кто ссылается'` |
| `/**` | `'Страница не найдена'` |

> **Как работает наследование title**: `title: 'История изменений'` ставится на внешний узел `path: 'history'`, а не на внутренний `path: ''` (HistoryComponent). Это даёт fallback для всех children, включая diff-роуты. Если у дочернего роута задан свой `title` (например, `'Сравнение версий'`) — `buildTitle()` вернёт его вместо родительского (стандартное поведение Angular — deepest child title побеждает). Роуты без своего title (например, `/history/articles`) унаследуют `'История изменений'` от parent.

### 5. Обновить `HeaderComponent`

```typescript
// header.component.ts
private readonly pageTitleStrategy = inject(PageTitleStrategy);
readonly pageTitle = this.pageTitleStrategy.pageTitle;
```

```html
<!-- header.component.html -->
<span class="page-title">{{ pageTitle() }}</span>
```

### 6. Написать и обновить тесты

- **`PageTitleStrategy`** — юнит-тест: проверить что `updateTitle` корректно устанавливает signal и вызывает `Title.setTitle()` с суффиксом
- **`HeaderComponent`** — обновить тест: мокнуть `PageTitleStrategy`, проверить что отображается значение signal

---

## Файлы для создания

| Файл | Назначение |
|------|-----------|
| `apps/client/src/app/services/page-title.strategy.ts` | Кастомный `TitleStrategy` |
| `apps/client/src/app/services/page-title.strategy.spec.ts` | Тесты стратегии |

## Файлы для изменения

| Файл | Что меняется |
|------|-------------|
| `apps/client/src/app/app.config.ts` | Убрать `RouterModule.forRoot`, зарегистрировать `PageTitleStrategy` |
| `apps/client/src/app/app.routes.ts` | Добавить `title` на все роуты |
| `apps/client/src/app/pages/article/article.routes.ts` | Добавить статические `title` на дочерние табы |
| `apps/client/src/app/layout/header/header.component.ts` | Инжектить `PageTitleStrategy`, экспонировать signal |
| `apps/client/src/app/layout/header/header.component.html` | `{{ pageTitle() }}` вместо `Древо` |
| `apps/client/src/app/layout/header/header.component.spec.ts` | Обновить тесты |

---

## SSR и SEO

- `Title` из `@angular/platform-browser` работает и на сервере — при SSR-рендере `<title>` будет корректным в HTML-ответе
- `TitleStrategy` вызывается роутером при навигации — работает одинаково на сервере и клиенте
- Гидрация не ломается — signal инициализируется до рендера
- Для статьи SSR отдаст `<title>Статья - Древо</title>` — это временное ограничение, исправляется в фазе 2

## Заметки

- `login` роут имеет `data: { layout: 'none' }` — хэдер не показывается, но `<title>` всё равно устанавливается корректно
- Фаза 1 полностью самоценна и может быть смержена независимо от фазы 2

## Порядок работы

1. Исправить дублирование роутера в `app.config.ts`
2. Создать `PageTitleStrategy` + зарегистрировать
3. Добавить статические `title` на все роуты
4. Обновить хэдер
5. Написать тесты
6. Проверить работу
