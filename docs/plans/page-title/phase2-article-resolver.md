# Фаза 2: Динамический title статьи через resolver

## Предусловие

[Фаза 1](phase1-static-titles.md) завершена: `PageTitleStrategy` работает, все роуты имеют статические title, хэдер отображает `pageTitle()`.

## Цель

Заменить временный статический title `'Статья'` на динамический — название статьи. На дочерних табах — составной title `"Tab: Название статьи"` (например, `"История версий: Фотосинтез"`).

Одновременно — рефакторинг загрузки статьи из `ArticlePageService.init(route)` в resolver-based подход, чтобы данные были доступны компоненту через `route.data`.

## Архитектура

```
articleResolver (ResolveFn<ArticleVersion>)        ┐
    ↓ загружает статью через ArticleService       │ Один HTTP-запрос
    ↓ кладёт в route.data['article']               │ (через in-flight кэш)
                                                    │
articleTitleResolver (ResolveFn<string>)            │
    ↓ запрашивает ArticleService.getArticle(id)  ┘
    ↓ возвращает article.title
    ↓
PageTitleStrategy → <title> + хэдер

ArticleComponent ← route.data['article']    // данные сразу доступны
    ↓
Дочерние табы ← ArticlePageService.article()  // signal, данные уже есть
```

> **Ключевое решение**: Angular выполняет resolver-ы на одном уровне параллельно (`forkJoin`). Поэтому `articleTitleResolver` НЕ может читать `route.data['article']` — его ещё нет. Вместо этого оба resolver-а обращаются к `ArticleService.getArticle(id)`, а in-flight кэш гарантирует один HTTP-запрос.

---

## Шаги реализации

### 1. Создать `articleResolver`

Файл: `apps/client/src/app/pages/article/article.resolver.ts`

```typescript
export const articleResolver: ResolveFn<ArticleVersion> = (route) => {
    const articleService = inject(ArticleService);
    const id = Number(route.paramMap.get('id'));

    return articleService.getArticle(id);
};
```

### 2. Добавить in-flight кэш в `ArticleService`

Файл: `apps/client/src/app/services/articles/article.service.ts`

Resolver-ы `article` и `title` выполняются параллельно, оба вызывают `getArticle(id)`. In-flight кэш гарантирует один HTTP-запрос:

```typescript
private readonly inflight = new Map<number, Observable<ArticleVersion>>();

getArticle(id: number): Observable<ArticleVersion> {
    if (!this.inflight.has(id)) {
        const obs$ = this.articleApiService.getArticle(id).pipe(
            map(response => this.mapArticleVersion({
                ...response,
                content: this.transformArticleLinks(response.content),
            })),
            shareReplay(1),
            finalize(() => this.inflight.delete(id))
        );
        this.inflight.set(id, obs$);
    }
    return this.inflight.get(id)!;
}
```

### 3. Создать `articleTitleResolver`

Файл: `apps/client/src/app/pages/article/article-title.resolver.ts`

Title resolver обращается к `ArticleService` напрямую (не через `route.data`), т.к. resolver-ы выполняются параллельно и `route.data['article']` ещё недоступен:

```typescript
export const articleTitleResolver: ResolveFn<string> = (route) => {
    const articleService = inject(ArticleService);
    const id = Number(route.paramMap.get('id'));

    return articleService.getArticle(id).pipe(
        map(article => article.title),
        catchError(() => of('Статья'))  // fallback при ошибке
    );
};
```

### 4. Рефакторинг `ArticlePageService`

Текущее поведение:
- `init(route)` → подписка на `route.paramMap` → `loadArticle(id)` → HTTP-запрос

Новое поведение:
- Убрать `init()` и подписку на `paramMap`
- Получать данные из `route.data` (заполненным resolver-ом)
- Оставить signal-ы `article`, `isLoading`, `error` как публичный API
- `isLoading` → всегда `false` после resolver-а (данные уже загружены)

> **Важно**: сохранить `articleId` как computed signal — он используется в `ArticleComponent` для построения URL табов и `editUrl`.

```typescript
@Injectable()
export class ArticlePageService {
    private readonly logger = inject(LoggerService).withContext('ArticlePageService');

    private readonly _article = signal<ArticleVersion | undefined>(undefined);
    private readonly _error = signal<string | undefined>(undefined);

    readonly article = this._article.asReadonly();
    readonly error = this._error.asReadonly();
    readonly isLoading = signal(false).asReadonly();  // всегда false после resolver
    readonly articleId = computed(() => this.article()?.articleId);  // используется для табов
    readonly title = computed(() => this.article()?.title);
    readonly editUrl = computed(() => {
        const versionId = this.article()?.versionId;
        return versionId ? `/articles/edit/${versionId}` : undefined;
    });

    // Вызывается из ArticleComponent при получении данных из route.data
    setArticle(article: ArticleVersion): void {
        this._article.set(article);
        this._error.set(undefined);
        this.logger.info('Article set from resolver', {
            id: article.articleId,
            title: article.title,
        });
    }

    setError(message: string): void {
        this._article.set(undefined);
        this._error.set(message);
    }
}
```

### 5. Обновить `ArticleComponent`

Вместо `articlePageService.init(route)` — получить данные из `route.data`:

```typescript
private readonly route = inject(ActivatedRoute);
private readonly articlePageService = inject(ArticlePageService);

constructor() {
    // route.data содержит resolved данные
    this.route.data.pipe(
        map(data => data['article'] as ArticleVersion),
        takeUntilDestroyed()
    ).subscribe(article => {
        this.articlePageService.setArticle(article);
    });
}
```

### 6. Составные title для дочерних табов

На дочерних табах статьи (`history`, `news`, `forum`, `linkedhere`) — title включает название статьи.

Вариант — resolver-функция, переиспользуемая для всех табов:

```typescript
// article-tab-title.resolver.ts
export function createArticleTabTitleResolver(tabName: string): ResolveFn<string> {
    return (route) => {
        // Получить article из parent route data
        const parentData = route.parent?.data;
        const articleTitle = parentData?.['article']?.title;
        return articleTitle ? `${tabName}: ${articleTitle}` : tabName;
    };
}
```

Использование в `article.routes.ts`:

```typescript
{
    path: 'history',
    title: createArticleTabTitleResolver('История версий'),
    loadComponent: () => ...
}
```

### 7. Обновить `article.routes.ts`

```typescript
export const ARTICLE_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () => import('./article.component').then(m => m.ArticleComponent),
        providers: [ArticlePageService],
        resolve: { article: articleResolver },
        title: articleTitleResolver,
        children: [
            {
                path: '',
                pathMatch: 'full',
                loadComponent: () => ...,
            },
            {
                path: 'history',
                title: createArticleTabTitleResolver('История версий'),
                loadComponent: () => ...,
            },
            // ...остальные табы
        ],
    },
];
```

### 8. Обработка ошибок

`articleResolver` использует `catchError` и возвращает `undefined` при ошибке. `ArticleComponent` проверяет `route.data['article']` — если `undefined`, показывает `ErrorComponent` (сохраняя текущий UX):

```typescript
// в articleResolver:
export const articleResolver: ResolveFn<ArticleVersion | undefined> = (route) => {
    const articleService = inject(ArticleService);
    const id = Number(route.paramMap.get('id'));

    if (isNaN(id) || id <= 0) {
        return of(undefined);
    }

    return articleService.getArticle(id).pipe(
        catchError((err: HttpErrorResponse) => {
            // errorNotificationInterceptor обработает toast,
            // возвращаем undefined чтобы навигация не отменялась
            return of(undefined);
        })
    );
};

// в ArticleComponent:
this.route.data.pipe(
    map(data => data['article'] as ArticleVersion | undefined),
    takeUntilDestroyed()
).subscribe(article => {
    if (article) {
        this.articlePageService.setArticle(article);
    } else {
        this.articlePageService.setError('Ошибка загрузки статьи');
    }
});
```

`articleTitleResolver` уже имеет `catchError(() => of('Статья'))` — title всегда возвращается.

### 9. Проверить перезапуск resolver при смене `:id`

При навигации `/articles/1` → `/articles/2` resolver должен перезапуститься. `:id` объявлен на parent route (`app.routes.ts`, `articles/:id`), resolver на child route (`article.routes.ts`, `path: ''`). Angular по умолчанию перезапускает resolver-ы при смене params parent route.

**При реализации**: проверить это поведение. Если resolver не перезапускается — добавить `runGuardsAndResolvers: 'paramsChange'` на parent route в `app.routes.ts`:

```typescript
{
    path: 'articles/:id',
    runGuardsAndResolvers: 'paramsChange',
    loadChildren: () => import('./pages/article/article.routes').then(m => m.ARTICLE_ROUTES),
}
```

### 10. Написать тесты

- **`articleResolver`** — тест на возврат `ArticleVersion` через `ArticleService`
- **`articleTitleResolver`** — тест на возврат title из `route.data`
- **`createArticleTabTitleResolver`** — тест на составной title
- **`ArticlePageService`** — обновить тесты: убрать `init()`, проверить `setArticle()`
- **`ArticleComponent`** — обновить тесты: мокнуть `ActivatedRoute.data`

---

## Файлы для создания

| Файл | Назначение |
|------|-----------|
| `apps/client/src/app/pages/article/article.resolver.ts` | Resolver загрузки статьи |
| `apps/client/src/app/pages/article/article-title.resolver.ts` | Resolver title статьи (обращается к ArticleService напрямую) |
| `apps/client/src/app/pages/article/article-tab-title.resolver.ts` | Фабрика resolver-ов для табов |

## Файлы для изменения

| Файл | Что меняется |
|------|-------------|
| `apps/client/src/app/pages/article/article-page.service.ts` | Убрать `init()`, добавить `setArticle()`, сохранить `articleId` как computed |
| `apps/client/src/app/services/articles/article.service.ts` | Добавить in-flight кэш (`shareReplay` + `finalize`) |
| `apps/client/src/app/pages/article/article-page.service.spec.ts` | Обновить тесты |
| `apps/client/src/app/pages/article/article.component.ts` | Получать данные из `route.data` вместо `init()` |
| `apps/client/src/app/pages/article/article.component.spec.ts` | Обновить тесты |
| `apps/client/src/app/pages/article/article.routes.ts` | Добавить resolver-ы и динамические title |

## Файлы для удаления (при необходимости)

Нет — весь рефакторинг через изменение существующих файлов.

---

## Решённые архитектурные вопросы

1. **Порядок resolver-ов**: Angular выполняет `resolve` и `title` resolver параллельно через `forkJoin`. Поэтому `articleTitleResolver` обращается к `ArticleService.getArticle(id)` напрямую, а in-flight кэш (`shareReplay` + `finalize` в `ArticleService`) гарантирует один HTTP-запрос. Для дочерних табов проблемы нет — parent resolvers завершаются ДО child resolvers, `route.parent.data['article']` доступен.

2. **Блокировка навигации**: resolver блокирует показ компонента до завершения HTTP-запроса (UX-регрессия — пользователь видит предыдущую страницу без индикации загрузки). **Prerequisite**: глобальный progress bar навигации через `Router.events` (`NavigationStart`/`NavigationEnd`) — отдельная задача, но должна быть реализована до или одновременно с фазой 2.

3. **Обработка ошибок**: `articleResolver` возвращает `undefined` через `catchError` (nav не отменяется). `ArticleComponent` проверяет и показывает `ErrorComponent` (UX как сейчас). `articleTitleResolver` возвращает fallback `'Статья'`.

4. **Кэширование между табами**: Angular кэширует resolved data при навигации между children одного parent route. Проверить при реализации.

5. **Перезапуск resolver при смене `:id`**: проверить при реализации, при необходимости добавить `runGuardsAndResolvers: 'paramsChange'` на parent route.

6. **`articleId` signal**: сохранён как `computed(() => this.article()?.articleId)` в `ArticlePageService` — используется в `ArticleComponent` для построения URL табов и `editUrl`.

## Порядок работы

1. Добавить in-flight кэш в `ArticleService`
2. Создать `articleResolver` + `articleTitleResolver`
3. Рефакторинг `ArticlePageService` — убрать `init()`, добавить `setArticle()`, сохранить `articleId` как computed
4. Обновить `ArticleComponent` — получать данные из `route.data`, обработка `undefined`
5. Создать `createArticleTabTitleResolver` для составных title табов
6. Обновить `article.routes.ts` — подключить resolver-ы и title
7. Проверить перезапуск resolver при смене `:id` (при необходимости `runGuardsAndResolvers`)
8. Написать тесты
9. Проверить: SSR, переходы между статьями, переходы между табами
