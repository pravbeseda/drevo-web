import { ArticleService } from '../../services/articles';
import { ErrorComponent } from '../error/error.component';
import { ArticleContentComponent } from './article-content/article-content.component';
import { HttpErrorResponse } from '@angular/common/http';
import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    Injector,
    OnInit,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { ArticleVersion } from '@drevo-web/shared';
import { SpinnerComponent, SidebarActionDirective } from '@drevo-web/ui';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Component({
    selector: 'app-article',
    imports: [
        SpinnerComponent,
        ArticleContentComponent,
        SidebarActionDirective,
        ErrorComponent,
    ],
    templateUrl: './article.component.html',
    styleUrl: './article.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly articleService = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly injector = inject(Injector);
    private readonly logger =
        inject(LoggerService).withContext('ArticleComponent');

    readonly article = signal<ArticleVersion | undefined>(undefined);
    readonly isLoading = signal<boolean>(false);
    readonly error = signal<string | undefined>(undefined);
    readonly editUrl = computed(() => {
        const versionId = this.article()?.versionId;
        return versionId ? `/articles/edit/${versionId}` : undefined;
    });
    private currentFragment: string | undefined = undefined;

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

        this.route.fragment
            .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe(fragment => {
                this.currentFragment = fragment ?? undefined;
                this.scrollToFragment();
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
                    this.logger.info('Article loaded', {
                        id: article.articleId,
                        versionId: article.versionId,
                        title: article.title,
                    });
                    this.scrollToFragment();
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

    private scrollToFragment(): void {
        afterNextRender(
            () => {
                if (!this.currentFragment || !this.article()) {
                    this.logger.debug(
                        'scrollToFragment failed: no currentFragment or article',
                        {
                            currentFragment: !!this.currentFragment,
                            article: !!this.article(),
                        }
                    );
                    return;
                }

                let targetElement: Element | undefined = undefined;
                try {
                    targetElement =
                        document.getElementById(this.currentFragment) ||
                        document.querySelector(
                            `a[name="${CSS.escape(this.currentFragment)}"]`
                        ) ||
                        undefined;
                } catch (error) {
                    this.logger.error(
                        'scrollToFragment: querySelector failed',
                        { error }
                    );
                    return;
                }

                if (!targetElement) {
                    this.logger.debug('scrollToFragment: no targetElement');
                    return;
                }

                const mainContainer = document.getElementById('content');
                if (mainContainer) {
                    const targetRect = targetElement.getBoundingClientRect();
                    const containerRect = mainContainer.getBoundingClientRect();
                    const scrollTop =
                        targetRect.top -
                        containerRect.top +
                        mainContainer.scrollTop;

                    mainContainer.scrollTo({
                        top: scrollTop,
                        behavior: 'smooth',
                    });
                } else {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                    });
                }
            },
            { injector: this.injector }
        );
    }

    openTableOfContents(): void {
        this.logger.info('Open table of contents');
    }
}
