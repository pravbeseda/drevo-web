import { AuthService } from '../../../../services/auth/auth.service';
import { NewsService } from '../../../../services/news/news.service';
import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { NewsTopicSidebarActionComponent } from '../../../../shared/components/news-topic-sidebar-action/news-topic-sidebar-action.component';
import { SidebarReserveComponent } from '../../../../shared/components/sidebar-reserve/sidebar-reserve.component';
import { isPageContentPath, primaryPath } from '../../../../shared/helpers/content-tab';
import { pageUrl } from '../../../../shared/helpers/page-kind';
import { PageResolveResult } from '../../../../shared/resolvers/page.resolver';
import { NewsPageService } from '../../services/news-page.service';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { NewsTopic } from '@drevo-web/shared';
import { TabGroup, TabsGroupComponent } from '@drevo-web/ui/tabs-group';
import { filter, map } from 'rxjs';

/**
 * The page of one news item: its tabs around the outlet that shows the active
 * one, and a moderator's section action on the item and its versions.
 */
@Component({
    selector: 'app-news',
    imports: [
        ErrorComponent,
        NewsTopicSidebarActionComponent,
        RouterOutlet,
        SidebarReserveComponent,
        TabsGroupComponent,
    ],
    templateUrl: './news.component.html',
    styleUrl: './news.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsComponent {
    private readonly pageService = inject(NewsPageService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly newsService = inject(NewsService);
    private readonly notification = inject(NotificationService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('NewsComponent');
    private readonly user = toSignal(inject(AuthService).user$);

    constructor() {
        this.route.data.pipe(takeUntilDestroyed()).subscribe(data => {
            const news = data['news'] as PageResolveResult;
            const topics = (data['topics'] as readonly NewsTopic[] | undefined) ?? [];
            if (news === 'not-found') {
                this.pageService.setNotFound();
            } else if (news === 'load-error') {
                this.pageService.setError('Ошибка загрузки новости');
            } else {
                this.pageService.setNews(news, topics);
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

    /** The news item or one of its versions is on screen — not its editor, not another tab. */
    private readonly isViewingNews = computed(
        () => this.newsTabActive() && !primaryPath(this.router, this.url())?.endsWith('/edit'),
    );

    readonly canPickTopic = computed(() => this.isViewingNews() && (this.user()?.permissions.canModerate ?? false));
    readonly topics = this.pageService.topics;

    private readonly _isSavingTopic = signal(false);
    readonly isSavingTopic = this._isSavingTopic.asReadonly();

    readonly news = this.pageService.article;
    readonly error = this.pageService.error;
    readonly isNotFound = this.pageService.isNotFound;

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

    saveTopic(topic: number): void {
        const news = this.news();
        if (!news) return;
        this._isSavingTopic.set(true);
        this.newsService
            .updateMeta(news.articleId, { topic })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: meta => {
                    this._isSavingTopic.set(false);
                    this.pageService.applyMeta(meta);
                    this.notification.success('Раздел сохранён');
                },
                error: (err: unknown) => {
                    this._isSavingTopic.set(false);
                    this.logger.error('Failed to save the news section', err);
                    this.notification.error('Не удалось сохранить раздел');
                },
            });
    }
}
