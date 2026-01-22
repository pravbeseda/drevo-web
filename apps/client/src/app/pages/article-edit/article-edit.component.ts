import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { AsyncPipe } from '@angular/common';

import { EditorComponent } from '@drevo-web/editor';
import { SpinnerComponent } from '@drevo-web/ui';
import { Article } from '@drevo-web/shared';
import { ArticleService } from '../../services/articles';
// import { LinksService } from '../../services/links/links.service';
import { LoggerService } from '@drevo-web/core';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-article-edit',
    imports: [EditorComponent, SpinnerComponent, AsyncPipe],
    // providers: [LinksService],
    templateUrl: './article-edit.component.html',
    styleUrl: './article-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleEditComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly articleService = inject(ArticleService);
    // private readonly linksService = inject(LinksService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext(
        'ArticleEditComponent'
    );

    private readonly updateLinksStateSubject = new BehaviorSubject<
        Record<string, boolean>
    >({});

    readonly article = signal<Article | undefined>(undefined);
    readonly isLoading = signal<boolean>(false);
    readonly error = signal<string | undefined>(undefined);
    readonly updateLinksState$ = this.updateLinksStateSubject.asObservable();

    ngOnInit(): void {
        this.route.paramMap
            .pipe(
                map(params => {
                    const idParam = params.get('id');
                    return idParam ? parseInt(idParam, 10) : NaN;
                }),
                distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(id => {
                if (isNaN(id) || id <= 0) {
                    this.article.set(undefined);
                    this.error.set('Неверный ID статьи');
                    this.logger.error('Invalid article ID', id);
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

        this.articleService
            .getArticle(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: article => {
                    this.article.set(article);
                    this.isLoading.set(false);
                    this.logger.info('Article loaded for editing', {
                        id: article.articleId,
                        title: article.title,
                    });
                },
                error: (err: HttpErrorResponse) => {
                    this.article.set(undefined);
                    if (err.status === 404) {
                        this.error.set('Статья не найдена');
                    } else {
                        this.error.set('Ошибка загрузки статьи');
                    }
                    this.isLoading.set(false);
                },
            });
    }

    updateLinks(_links: string[]): void {
        // this.linksService
        //     .getLinkStatuses(links)
        //     .pipe(first())
        //     .subscribe(linksState => {
        //         this.updateLinksStateSubject.next(linksState);
        //     });
    }

    contentChanged(content: string): void {
        this.logger.debug('Content changed', { length: content.length });
    }
}
