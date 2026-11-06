import { ArticleService } from '../../../../services/articles';
import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { SidebarReserveComponent } from '../../../../shared/components/sidebar-reserve/sidebar-reserve.component';
import { isPageContentPath, primaryPath } from '../../../../shared/helpers/content-tab';
import { MissingArticle, isMissingArticle } from '../../models/missing-article';
import { ArticlePageService } from '../../services/article-page.service';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { ArticleVersion } from '@drevo-web/shared';
import { TabGroup, TabsGroupComponent } from '@drevo-web/ui/tabs-group';
import { catchError, filter, map, of, startWith, switchMap } from 'rxjs';

/** A tab with nothing in it carries no badge. */
function badge(count: number | undefined): number | undefined {
    return count || undefined;
}

@Component({
    selector: 'app-article',
    imports: [ErrorComponent, SidebarReserveComponent, TabsGroupComponent, RouterOutlet],
    templateUrl: './article.component.html',
    styleUrl: './article.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleComponent {
    private readonly pageService = inject(ArticlePageService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly articleService = inject(ArticleService);
    private readonly logger = inject(LoggerService).withContext('ArticleComponent');

    constructor() {
        this.route.data
            .pipe(
                map(data => data['article'] as ArticleVersion | MissingArticle | undefined),
                takeUntilDestroyed(),
            )
            .subscribe(article => {
                if (!article) {
                    this.pageService.setError('Ошибка загрузки статьи');
                } else if (isMissingArticle(article)) {
                    this.pageService.setMissing(article);
                } else {
                    this.pageService.setArticle(article);
                }
            });
    }

    private readonly url = toSignal(
        this.router.events.pipe(
            filter((e): e is NavigationEnd => e instanceof NavigationEnd),
            map(e => e.urlAfterRedirects),
        ),
        { initialValue: this.router.url },
    );

    private readonly articleTabActive = computed(() => {
        const path = primaryPath(this.router, this.url());
        const basePath = this.pageService.basePath();
        if (!path || !basePath) return false;
        if (this.pageService.isMissing()) {
            const base = basePath.slice(1);
            return path === base || path === `${base}/edit`;
        }
        return isPageContentPath(path, basePath);
    });

    /** The badges of the news and discussion tabs; a page not created yet has neither. */
    private readonly counts = toSignal(
        toObservable(this.pageService.articleId).pipe(
            switchMap(articleId =>
                articleId === undefined
                    ? of(undefined)
                    : this.articleService.getCounts(articleId).pipe(
                          startWith(undefined),
                          catchError((error: unknown) => {
                              this.logger.error('Failed to load the tab counts', { articleId, error });
                              return of(undefined);
                          }),
                      ),
            ),
        ),
    );

    readonly article = this.pageService.article;
    readonly isMissing = this.pageService.isMissing;
    readonly error = this.pageService.error;

    readonly tabGroups = computed<TabGroup[]>(() => {
        const base = this.pageService.basePath();
        if (!base) {
            return [];
        }
        const counts = this.counts();
        // Versions and discussions hang off the article's id, which a page not written yet lacks.
        const isMissing = this.pageService.isMissing();
        const historyTab = isMissing
            ? []
            : [
                  {
                      label: 'Версии',
                      route: `${base}/history`,
                      icon: 'history',
                      testId: 'tab-history',
                  },
              ];
        const forumTab = isMissing
            ? []
            : [
                  {
                      label: 'Обсуждение',
                      route: `${base}/forum`,
                      icon: 'forum',
                      badge: badge(counts?.forum),
                      testId: 'tab-forum',
                  },
              ];
        return [
            {
                items: [
                    {
                        label: 'Статья',
                        route: base,
                        icon: 'article',
                        isActive: this.articleTabActive,
                        testId: 'tab-article',
                    },
                    {
                        label: 'Новости',
                        route: `${base}/news`,
                        icon: 'newspaper',
                        badge: badge(counts?.news),
                        testId: 'tab-news',
                    },
                    ...forumTab,
                ],
            },
            {
                items: [
                    ...historyTab,
                    {
                        label: 'Кто ссылается',
                        route: `${base}/linkedhere`,
                        icon: 'link',
                        testId: 'tab-linkedhere',
                    },
                ],
                align: 'end',
            },
        ];
    });
}
