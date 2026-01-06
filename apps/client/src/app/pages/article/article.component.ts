import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InternalLinksDirective, SpinnerComponent } from '@drevo-web/ui';
import { Article } from '@drevo-web/shared';
import { ArticleService } from '../../services/articles';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-article',
    imports: [CommonModule, SpinnerComponent, InternalLinksDirective],
    templateUrl: './article.component.html',
    styleUrl: './article.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly articleService = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);

    readonly article = signal<Article | undefined>(undefined);
    readonly isLoading = signal<boolean>(false);
    readonly error = signal<string | undefined>(undefined);

    ngOnInit(): void {
        this.route.paramMap
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(params => {
                const idParam = params.get('id');
                const id = idParam ? parseInt(idParam, 10) : NaN;

                if (isNaN(id) || id <= 0) {
                    this.error.set('Неверный ID статьи');
                    this.isLoading.set(false);
                    return;
                }

                this.loadArticle(id);
            });
    }

    private loadArticle(id: number): void {
        this.article.set(undefined);
        this.isLoading.set(true);
        this.error.set(undefined);

        this.articleService.getArticle(id).subscribe({
            next: article => {
                this.article.set(article);
                this.isLoading.set(false);
            },
            error: (err: HttpErrorResponse) => {
                if (err.status === 404) {
                    this.error.set('Статья не найдена');
                } else {
                    this.error.set('Ошибка загрузки статьи');
                }
                this.isLoading.set(false);
            },
        });
    }
}
