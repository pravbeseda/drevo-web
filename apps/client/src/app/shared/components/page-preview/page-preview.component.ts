import { ArticleService } from '../../../services/articles';
import { ErrorComponent } from '../error/error.component';
import { WikiContentComponent } from '../wiki-content/wiki-content.component';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';
import { PageKind } from '@drevo-web/shared';
import { SpinnerComponent } from '@drevo-web/ui/spinner';

@Component({
    selector: 'app-page-preview',
    templateUrl: './page-preview.component.html',
    styleUrl: './page-preview.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [WikiContentComponent, ErrorComponent, SpinnerComponent],
})
/** The wiki text being edited, formatted by the backend of its page kind. */
export class PagePreviewComponent implements OnInit {
    readonly content = input.required<string>();
    readonly articleId = input.required<number>();
    readonly kind = input<PageKind>('articles');

    private readonly articleService = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('PreviewComponent');

    private readonly _previewHtml = signal('');
    private readonly _isLoading = signal(true);
    private readonly _error = signal<string | undefined>(undefined);

    readonly previewHtml = this._previewHtml.asReadonly();
    readonly isLoading = this._isLoading.asReadonly();
    readonly error = this._error.asReadonly();

    ngOnInit(): void {
        this.loadPreview();
    }

    private loadPreview(): void {
        this._isLoading.set(true);
        this._error.set(undefined);

        this.articleService
            .previewArticle(this.content(), this.articleId(), this.kind())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: html => {
                    this._previewHtml.set(html);
                    this._isLoading.set(false);
                    this.logger.info('Preview loaded', { articleId: this.articleId() });
                },
                error: (err: unknown) => {
                    this._isLoading.set(false);
                    this._error.set('Не удалось загрузить предпросмотр');
                    this.logger.error('Failed to load preview', err);
                },
            });
    }
}
