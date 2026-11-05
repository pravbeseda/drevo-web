import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { SidebarReserveComponent } from '../../../../shared/components/sidebar-reserve/sidebar-reserve.component';
import { isPageContentPath, primaryPath } from '../../../../shared/helpers/content-tab';
import { pageUrl } from '../../../../shared/helpers/page-kind';
import { NewsPageService } from '../../services/news-page.service';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ArticleVersion, NewsTopic } from '@drevo-web/shared';
import { TabGroup, TabsGroupComponent } from '@drevo-web/ui/tabs-group';
import { filter, map } from 'rxjs';

/** The page of one news item: its tabs around the outlet that shows the active one. */
@Component({
    selector: 'app-news',
    imports: [ErrorComponent, SidebarReserveComponent, TabsGroupComponent, RouterOutlet],
    templateUrl: './news.component.html',
    styleUrl: './news.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsComponent {
    private readonly pageService = inject(NewsPageService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    constructor() {
        this.route.data.pipe(takeUntilDestroyed()).subscribe(data => {
            const news = data['news'] as ArticleVersion | undefined;
            const topics = (data['topics'] as readonly NewsTopic[] | undefined) ?? [];
            if (news) {
                this.pageService.setNews(news, topics);
            } else {
                this.pageService.setError('Ошибка загрузки новости');
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

    private readonly newsTabActive = computed(() => {
        const id = this.pageService.articleId();
        const path = primaryPath(this.router, this.url());
        return id !== undefined && !!path && isPageContentPath(path, pageUrl('news', id));
    });

    readonly news = this.pageService.article;
    readonly error = this.pageService.error;

    readonly tabGroups = computed<TabGroup[]>(() => {
        const id = this.pageService.articleId();
        if (id === undefined) {
            return [];
        }
        const base = pageUrl('news', id);
        return [
            {
                items: [
                    {
                        label: 'Новость',
                        route: base,
                        icon: 'newspaper',
                        isActive: this.newsTabActive,
                        testId: 'tab-news-item',
                    },
                    { label: 'Обсуждение', route: `${base}/forum`, icon: 'forum', testId: 'tab-forum' },
                ],
            },
            {
                items: [{ label: 'Версии', route: `${base}/history`, icon: 'history', testId: 'tab-history' }],
                align: 'end',
            },
        ];
    });
}
