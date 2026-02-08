import { ArticleService } from '../../services/articles';
import { ErrorComponent } from '../error/error.component';
import { ArticleContentComponent } from './article-content/article-content.component';
import { NgClass } from '@angular/common';
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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import {
    APPROVAL_CLASS,
    APPROVAL_ICONS,
    APPROVAL_TITLES,
    ArticleVersion,
} from '@drevo-web/shared';
import {
    FormatTimePipe,
    IconComponent,
    SpinnerComponent,
    SidebarActionDirective,
} from '@drevo-web/ui';
import { combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Component({
    selector: 'app-article',
    imports: [
        SpinnerComponent,
        ArticleContentComponent,
        SidebarActionDirective,
        ErrorComponent,
        NgClass,
        RouterLink,
        FormatTimePipe,
        IconComponent,
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
    readonly isVersionView = signal(false);
    readonly editUrl = computed(() => {
        const versionId = this.article()?.versionId;
        return versionId ? `/articles/edit/${versionId}` : undefined;
    });
    readonly articleUrl = computed(() => {
        const articleId = this.article()?.articleId;
        return articleId ? `/articles/${articleId}` : undefined;
    });
    readonly approvalClass = computed(() => {
        const approved = this.article()?.approved;
        return approved !== undefined ? APPROVAL_CLASS[approved] : undefined;
    });
    readonly statusIcon = computed(() => {
        const cls = this.approvalClass();
        return cls ? APPROVAL_ICONS[cls] : undefined;
    });
    readonly statusTitle = computed(() => {
        const cls = this.approvalClass();
        return cls ? APPROVAL_TITLES[cls] : undefined;
    });
    private currentFragment: string | undefined = undefined;

    ngOnInit(): void {
        combineLatest([this.route.data, this.route.paramMap])
            .pipe(
                map(([data, params]) => {
                    const idParam = params.get('id');
                    return {
                        id: idParam ? parseInt(idParam, 10) : NaN,
                        isVersionView: !!data['isVersionView'],
                    };
                }),
                distinctUntilChanged(
                    (prev, curr) =>
                        prev.id === curr.id &&
                        prev.isVersionView === curr.isVersionView
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(({ id, isVersionView }) => {
                this.isVersionView.set(isVersionView);

                if (isNaN(id) || id <= 0) {
                    this.article.set(undefined);
                    this.error.set(
                        isVersionView
                            ? 'Неверный ID версии'
                            : 'Неверный ID статьи'
                    );
                    this.logger.error(
                        isVersionView
                            ? 'Invalid version ID'
                            : 'Invalid article ID',
                        id
                    );
                    this.isLoading.set(false);
                    return;
                }

                this.loadArticle(id, isVersionView);
            });

        this.route.fragment
            .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe(fragment => {
                this.currentFragment = fragment ?? undefined;
                this.scrollToFragment();
            });
    }

    private loadArticle(id: number, isVersionView: boolean): void {
        this.article.set(undefined);
        this.isLoading.set(true);
        this.error.set(undefined);

        const source$ = isVersionView
            ? this.articleService.getVersionShow(id)
            : this.articleService.getArticle(id);

        source$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: article => {
                this.article.set(article);
                this.isLoading.set(false);
                this.logger.info(
                    isVersionView ? 'Version loaded' : 'Article loaded',
                    {
                        id: article.articleId,
                        versionId: article.versionId,
                        title: article.title,
                    }
                );
                this.scrollToFragment();
            },
            error: (err: HttpErrorResponse) => {
                this.article.set(undefined);
                this.logger.error(
                    isVersionView
                        ? 'Failed to load version'
                        : 'Failed to load article',
                    { id, status: err.status }
                );
                if (err.status === 404) {
                    this.error.set(
                        isVersionView
                            ? 'Версия не найдена'
                            : 'Статья не найдена'
                    );
                } else {
                    this.error.set(
                        isVersionView
                            ? 'Ошибка загрузки версии'
                            : 'Ошибка загрузки статьи'
                    );
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
