import { ArticleService } from '../../../../services/articles';
import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { ArticleContentComponent } from '../article-content/article-content.component';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';
import { SpinnerComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-preview',
    templateUrl: './preview.component.html',
    styleUrl: './preview.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ArticleContentComponent, ErrorComponent, SpinnerComponent],
})
export class PreviewComponent implements OnInit {
    readonly content = input.required<string>();
    readonly articleId = input.required<number>();

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
            .previewArticle(this.content(), this.articleId())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: html => {
                    this._previewHtml.set(html);
                    this._isLoading.set(false);
                    this.logger.info('Preview loaded', { articleId: this.articleId() });
                },
                error: err => {
                    this._isLoading.set(false);
                    this._error.set('Не удалось загрузить предпросмотр');
                    this.logger.error('Failed to load preview', err);
                },
            });
    }
}
