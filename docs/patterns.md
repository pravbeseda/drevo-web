# Code patterns

Detail behind the "Conventions" section of [`AGENTS.md`](../AGENTS.md). These are the shapes to copy; the rules that make them mandatory are in the canon.

## Signals — private writable + public readonly

```typescript
private readonly _isLoading = signal(false);
readonly isLoading = this._isLoading.asReadonly();

readonly hasData = computed(() => !!this.data());

readonly user = toSignal(this.authService.user$);

private readonly _eventSubject = new Subject<Event>();
readonly event$ = this._eventSubject.asObservable();
```

## HTTP services — two-layer pattern

API service (low-level HTTP) + domain service (business logic, mapping). Both live in `app/services/` with `providedIn: 'root'`:

```typescript
// app/services/articles/article-api.service.ts — HTTP layer
@Injectable({ providedIn: 'root' })
export class ArticleApiService {
    private readonly apiUrl = environment.apiUrl;
    private readonly http = inject(HttpClient);

    getArticle(id: number): Observable<ArticleVersionDto> {
        return this.http
            .get<ApiResponse<ArticleVersionDto>>(
                `${this.apiUrl}/api/articles/show/${id}`,
                { withCredentials: true }
            )
            .pipe(map(response => {
                assertIsDefined(response.data, 'Response data is undefined');
                return response.data;
            }));
    }
}

// app/services/articles/article.service.ts — domain layer (used by features)
@Injectable({ providedIn: 'root' })
export class ArticleService {
    private readonly articleApiService = inject(ArticleApiService);

    getArticle(id: number): Observable<ArticleVersion> {
        return this.articleApiService.getArticle(id).pipe(
            map(dto => this.mapArticleVersion(dto))
        );
    }
}
```

## Authentication & HTTP

- **AuthInterceptor** — CSRF tokens (auto-added to POST/PUT/DELETE/PATCH), 401/403 handling
- **Credentials** — `withCredentials: true` for all requests to our API, and never on a third-party one: an `access-control-allow-origin: *` answer, like OpenRouter's in `JevApiService`, fails a request with credentials
- **Per-request error control** — HTTP context tokens from `@drevo-web/core`:

```typescript
this.http.get('/api/data', {
    context: new HttpContext()
        .set(SKIP_ERROR_NOTIFICATION, true)      // no toast on error
        .set(SKIP_ERROR_FOR_STATUSES, [404])     // skip specific codes
        .set(CUSTOM_ERROR_MESSAGE, 'Custom message'),
});
```

## SSR-safe browser access

Browser APIs arrive by injection — `WINDOW` from `@drevo-web/core`, `DOCUMENT` from `@angular/common`, `StorageService` from `@drevo-web/core` for local and session storage. The server render has no globals, so injection is what keeps SSR working. Where injection does not fit, guard the block:

```typescript
private readonly platformId = inject(PLATFORM_ID);

if (isPlatformBrowser(this.platformId)) {
    // browser-only: DOM, window, localStorage
}
```

## Logging

```typescript
import { LoggerService } from '@drevo-web/core';

private readonly logger = inject(LoggerService).withContext('MyService');

this.logger.info('message', { data });
this.logger.error('error', error);
```

An error the code cannot handle where it is caught — a lazy chunk that failed to load is the usual one — goes to Angular's `ErrorHandler` instead (`inject(ErrorHandler).handleError(error)`). `ChunkErrorHandler` shows the reload prompt when a chunk failed to load, hands the error to `DELEGATE_ERROR_HANDLER` — Angular's own handler, which writes the real `Error` to the console, or Sentry's where a DSN is configured, which also sends it to Sentry — and records it through `LoggerService` marked `alreadyReported`, so the IndexedDB log keeps the sanitized copy and nothing reaches the console or Sentry twice; a local `logger.error` would log it but never reach that prompt.
