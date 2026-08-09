import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { SidebarReserveComponent } from '../../../../shared/components/sidebar-reserve/sidebar-reserve.component';
import { MissingArticle, isMissingArticle } from '../../models/missing-article';
import { ArticlePageService } from '../../services/article-page.service';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet, UrlSegmentGroup } from '@angular/router';
import { ArticleVersion } from '@drevo-web/shared';
import { TabGroup, TabsGroupComponent } from '@drevo-web/ui';
import { filter, map } from 'rxjs';

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
        // `children` is typed as if every outlet were present; only `primary` is guaranteed
        // to exist while an outlet is actually activated.
        const children: Record<string, UrlSegmentGroup | undefined> = this.router.parseUrl(this.url()).root.children;
        const path = children['primary']?.segments.map(s => s.path).join('/');
        const basePath = this.pageService.basePath();
        if (!path || !basePath) return false;
        const base = basePath.slice(1);
        if (this.pageService.isMissing()) {
            return path === base || path === `${base}/edit`;
        }
        return path === base || path.startsWith(`${base}/version/`);
    });

    readonly article = this.pageService.article;
    readonly isMissing = this.pageService.isMissing;
    readonly error = this.pageService.error;

    readonly tabGroups = computed<TabGroup[]>(() => {
        const base = this.pageService.basePath();
        if (!base) {
            return [];
        }
        const historyTab = this.pageService.isMissing()
            ? []
            : [
                  {
                      label: 'Версии',
                      route: `${base}/history`,
                      icon: 'history',
                      testId: 'tab-history',
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
                        testId: 'tab-news',
                    },
                    {
                        label: 'Обсуждение',
                        route: `${base}/forum`,
                        icon: 'forum',
                        testId: 'tab-forum',
                    },
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
