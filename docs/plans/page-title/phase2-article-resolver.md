# Фаза 2: Динамический title статьи через resolver

## Предусловие

[Фаза 1](phase1-static-titles.md) завершена: `PageTitleStrategy` работает, все роуты имеют статические title, хэдер отображает `pageTitle()`.

## Цель

Заменить временный статический title `'Статья'` на динамический — название статьи. На дочерних табах — составной title `"Tab: Название статьи"` (например, `"История версий: Фотосинтез"`).

Одновременно — рефакторинг загрузки статьи из `ArticlePageService.init(route)` в resolver-based подход, чтобы данные были доступны компоненту через `route.data`.

> **Известное ограничение**: resolver блокирует показ компонента до завершения HTTP-запроса. Пользователь видит предыдущую страницу без индикации загрузки. Глобальный progress bar навигации — [фаза 3](phase3-navigation-progress.md).

## Архитектура

```
articleResolver (ResolveFn<ArticleVersion | undefined>) ┐
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

Resolver возвращает `ArticleVersion | undefined` — при ошибке или невалидном ID возвращает `undefined` через `catchError`, чтобы навигация не отменялась. Логика вынесена в экспортируемую чистую функцию `resolveArticle()` — это позволяет тестировать без injection context (см. шаг 10).

```typescript
export function resolveArticle(
    articleService: ArticleService,
    route: ActivatedRouteSnapshot
): Observable<ArticleVersion | undefined> {
    const id = Number(route.paramMap.get('id'));

    if (isNaN(id) || id <= 0) {
        return of(undefined);
    }

    return articleService.getArticle(id).pipe(
        catchError(() => of(undefined))
    );
}

export const articleResolver: ResolveFn<ArticleVersion | undefined> = (route) =>
    resolveArticle(inject(ArticleService), route);
```

### 2. Добавить in-flight кэш в `ArticleService`

Файл: `apps/client/src/app/services/articles/article.service.ts`

Resolver-ы `article` и `title` выполняются параллельно, оба вызывают `getArticle(id)`. In-flight кэш гарантирует один HTTP-запрос.

Используем `shareReplay({ bufferSize: 1, refCount: false })` — `refCount: false` гарантирует, что HTTP-запрос не будет отменён при отписке одного из resolver-ов до завершения:

```typescript
private readonly inflight = new Map<number, Observable<ArticleVersion>>();

getArticle(id: number): Observable<ArticleVersion> {
    if (!this.inflight.has(id)) {
        const obs$ = this.articleApiService.getArticle(id).pipe(
            map(response => this.mapArticleVersion({
                ...response,
                content: this.transformArticleLinks(response.content),
            })),
            shareReplay({ bufferSize: 1, refCount: false }),
            finalize(() => this.inflight.delete(id))
        );
        this.inflight.set(id, obs$);
    }
    return this.inflight.get(id)!;
}
```

### 3. Создать `articleTitleResolver`

Файл: `apps/client/src/app/pages/article/article-title.resolver.ts`

Title resolver обращается к `ArticleService` напрямую (не через `route.data`), т.к. resolver-ы выполняются параллельно и `route.data['article']` ещё недоступен. Логика вынесена в чистую функцию `resolveArticleTitle()` для тестирования без injection context:

```typescript
export function resolveArticleTitle(
    articleService: ArticleService,
    route: ActivatedRouteSnapshot
): Observable<string> {
    const id = Number(route.paramMap.get('id'));

    return articleService.getArticle(id).pipe(
        map(article => article.title),
        catchError(() => of('Статья'))  // fallback при ошибке
    );
}

export const articleTitleResolver: ResolveFn<string> = (route) =>
    resolveArticleTitle(inject(ArticleService), route);
```

### 4. Рефакторинг `ArticlePageService`

Текущее поведение:
- `init(route)` → подписка на `route.paramMap` → `loadArticle(id)` → HTTP-запрос
- `_articleId` — отдельный signal, устанавливается из paramMap до загрузки
- Инжектит `ArticleService`, `DestroyRef`

Новое поведение:
- Убрать `init()`, `loadArticle()` и подписку на `paramMap`
- Убрать инжекцию `ArticleService` и `DestroyRef` (больше не нужны)
- Получать данные из `route.data` (заполненным resolver-ом) — через `ArticleComponent`
- Оставить signal-ы `article`, `isLoading`, `error` как публичный API
- `isLoading` → всегда `false` после resolver-а (данные уже загружены)
- `articleId` → `computed` из `article()` (вместо отдельного signal)

> **Важно**: `articleId` становится `computed(() => this.article()?.articleId)`. При resolver-подходе данные доступны сразу при вызове `setArticle()`, поэтому `tabGroups` в `ArticleComponent` вычислятся корректно.

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

Вместо `articlePageService.init(route)` — получить данные из `route.data`.

**Что убрать:**
- `implements OnInit` и метод `ngOnInit()`
- Импорт `OnInit` из `@angular/core`

**Подписку оформить как field initializer** (идиоматично для проекта, `takeUntilDestroyed()` требует injection context):

```typescript
private readonly route = inject(ActivatedRoute);
private readonly articlePageService = inject(ArticlePageService);

// Field initializer — takeUntilDestroyed() работает в injection context
private readonly articleSubscription = this.route.data.pipe(
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

Заменить существующие статические `title` (добавленные в фазе 1) на `createArticleTabTitleResolver`:

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
                path: 'version/:versionId',
                // Без title — наследует articleTitleResolver от parent
                loadComponent: () => ...,
            },
            {
                path: 'news',
                title: createArticleTabTitleResolver('Новости'),
                loadComponent: () => ...,
            },
            {
                path: 'forum',
                title: createArticleTabTitleResolver('Обсуждение'),
                loadComponent: () => ...,
            },
            {
                path: 'history',
                title: createArticleTabTitleResolver('История версий'),
                loadComponent: () => ...,
            },
            {
                path: 'linkedhere',
                title: createArticleTabTitleResolver('Кто ссылается'),
                loadComponent: () => ...,
            },
        ],
    },
];
```

### 7.1. Убрать статический `title: 'Статья'` из `app.routes.ts`

В `app.routes.ts` на parent route `articles/:id` стоит `title: 'Статья'` (из фазы 1). Его нужно **убрать**, т.к. теперь title устанавливается `articleTitleResolver` на child route. При ошибке resolver fallback `'Статья'` обеспечивается `articleTitleResolver` через `catchError`.

### 8. Обработка ошибок

`articleResolver` использует `catchError` и возвращает `undefined` при ошибке. `ArticleComponent` проверяет `route.data['article']` — если `undefined`, показывает `ErrorComponent`.

> **Примечание**: текущий `ArticlePageService` различает 404 (`'Статья не найдена'`) от прочих ошибок (`'Ошибка загрузки статьи'`). При переходе на resolver эта детализация теряется — resolver возвращает `undefined` без информации о типе ошибки. Это приемлемо, т.к. `errorNotificationInterceptor` уже показывает toast с детализацией, а `ErrorComponent` отображает общее сообщение.

```typescript
// Полная реализация — см. шаг 1 (resolveArticle + articleResolver)
// Обработка в ArticleComponent — см. шаг 5 (field initializer)
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

**Resolver-ы** — логика вынесена в чистые функции (`resolveArticle`, `resolveArticleTitle`), которые тестируются как обычные функции **без injection context и без TestBed**. Зависимости передаются как аргументы, `ActivatedRouteSnapshot` мокается вручную. `createArticleTabTitleResolver` — фабрика, возвращающая чистую функцию без `inject()`, тестируется напрямую.

- **`resolveArticle`** — тест на возврат `ArticleVersion` через мок `ArticleService`, тест на `undefined` при невалидном ID, тест на `catchError`
- **`resolveArticleTitle`** — тест на возврат title строки, тест на fallback `'Статья'` при ошибке
- **`createArticleTabTitleResolver`** — тест на составной title, тест на fallback без parent data

**Обновление существующих тестов:**

- **`ArticlePageService`** — убрать тесты `init()`, `loadArticle`, `paramMap`-подписки. Добавить тесты `setArticle()`, `setError()`, проверить что `articleId`, `title`, `editUrl` корректно вычисляются как computed
- **`ArticleComponent`** — убрать тесты `init()`. Мокнуть `ActivatedRoute.data` как `BehaviorSubject`. Проверить что `setArticle()` вызывается при emit, `setError()` при `undefined`
- **`ArticleService`** — добавить тест на in-flight кэш: два вызова `getArticle(id)` → один HTTP-запрос

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
| `apps/client/src/app/services/articles/article.service.ts` | Добавить in-flight кэш (`shareReplay` + `finalize`) |
| `apps/client/src/app/services/articles/article.service.spec.ts` | Тест на in-flight кэш |
| `apps/client/src/app/pages/article/article-page.service.ts` | Убрать `init()`, `loadArticle()`, `DestroyRef`, `ArticleService`. Добавить `setArticle()`, `setError()`. `articleId` → computed |
| `apps/client/src/app/pages/article/article-page.service.spec.ts` | Обновить тесты |
| `apps/client/src/app/pages/article/article.component.ts` | Убрать `OnInit`. Получать данные из `route.data` (field initializer) вместо `init()` |
| `apps/client/src/app/pages/article/article.component.spec.ts` | Обновить тесты |
| `apps/client/src/app/pages/article/article.routes.ts` | Добавить resolver-ы, заменить статические title на `createArticleTabTitleResolver` |
| `apps/client/src/app/app.routes.ts` | Убрать `title: 'Статья'` с parent route `articles/:id` |

## Файлы для удаления (при необходимости)

Нет — весь рефакторинг через изменение существующих файлов.

---

## Решённые архитектурные вопросы

1. **Порядок resolver-ов**: Angular выполняет `resolve` и `title` resolver параллельно через `forkJoin`. Поэтому `articleTitleResolver` обращается к `ArticleService.getArticle(id)` напрямую, а in-flight кэш (`shareReplay({ bufferSize: 1, refCount: false })` + `finalize` в `ArticleService`) гарантирует один HTTP-запрос. `refCount: false` предотвращает отмену HTTP-запроса при отписке одного из resolver-ов. Для дочерних табов проблемы нет — parent resolvers завершаются ДО child resolvers, `route.parent.data['article']` доступен.

2. **Блокировка навигации**: resolver блокирует показ компонента до завершения HTTP-запроса (UX-регрессия — пользователь видит предыдущую страницу без индикации загрузки). Решение — [фаза 3: глобальный progress bar навигации](phase3-navigation-progress.md).

3. **Обработка ошибок**: `articleResolver` возвращает `undefined` через `catchError` (nav не отменяется). `ArticleComponent` проверяет и показывает `ErrorComponent`. Детализация ошибок (404 vs другие) теряется, но `errorNotificationInterceptor` показывает toast с деталями. `articleTitleResolver` возвращает fallback `'Статья'`.

4. **Кэширование между табами**: Angular кэширует resolved data при навигации между children одного parent route. Проверить при реализации.

5. **Перезапуск resolver при смене `:id`**: проверить при реализации, при необходимости добавить `runGuardsAndResolvers: 'paramsChange'` на parent route.

6. **`articleId` signal**: `computed(() => this.article()?.articleId)` в `ArticlePageService` — используется в `ArticleComponent` для построения URL табов и `editUrl`. При resolver-подходе `setArticle()` вызывается сразу из field initializer, поэтому computed-ы вычислятся до рендера.

7. **`version/:versionId` title**: наследует `articleTitleResolver` от parent (название статьи). Составной title ("Версия: ...") — пока не нужен.

8. **Тестирование resolver-ов**: логика resolver-ов вынесена в экспортируемые чистые функции (`resolveArticle`, `resolveArticleTitle`), которые принимают зависимости как аргументы. Это позволяет тестировать без injection context — ни `TestBed`, ни Spectator для DI не нужны. `ActivatedRouteSnapshot.paramMap` мокается через `convertToParamMap()`. `createArticleTabTitleResolver` не использует `inject()` — тестируется как обычная функция.

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
