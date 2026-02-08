import { ArticleService } from '../../services/articles';
import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { SpinnerComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-version-redirect',
    imports: [SpinnerComponent],
    template: `
        @if (error()) {
            <p class="error-text">{{ error() }}</p>
        } @else {
            <div class="loading-container">
                <ui-spinner [diameter]="48" />
            </div>
        }
    `,
    styles: `
        .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 200px;
        }

        .error-text {
            color: var(--themed-text-error);
            text-align: center;
            padding: 2rem;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VersionRedirectComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly articleService = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger =
        inject(LoggerService).withContext('VersionRedirect');

    readonly error = signal<string | undefined>(undefined);

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        const versionId = idParam ? parseInt(idParam, 10) : NaN;

        if (isNaN(versionId) || versionId <= 0) {
            this.error.set('Неверный ID версии');
            this.logger.error('Invalid version ID for redirect', idParam);
            return;
        }

        this.articleService
            .getVersionShow(versionId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: article => {
                    this.logger.info('Redirecting version URL', {
                        versionId,
                        articleId: article.articleId,
                    });
                    this.router.navigate(
                        [
                            '/articles',
                            article.articleId,
                            'version',
                            versionId,
                        ],
                        { replaceUrl: true }
                    );
                },
                error: (err: HttpErrorResponse) => {
                    this.logger.error('Failed to load version for redirect', {
                        versionId,
                        status: err.status,
                    });
                    this.error.set(
                        err.status === 404
                            ? 'Версия не найдена'
                            : 'Ошибка загрузки версии'
                    );
                },
            });
    }
}
