import { ForumService } from '../../../../../../services/forum/forum.service';
import { NEW_TOPIC_TARGET, NewTopicTarget } from '../../../../../../shared/components/new-topic-page/new-topic-target';
import { SidebarActionComponent } from '../../../../../../shared/components/sidebar-action/sidebar-action.component';
import { TopicListComponent } from '../../../../../../shared/components/topic-list/topic-list.component';
import { TopicPanesComponent } from '../../../../../../shared/components/topic-panes/topic-panes.component';
import {
    TopicListPagesService,
    TopicPageFetch,
} from '../../../../../../shared/services/topic-list-pages/topic-list-pages.service';
import { ArticlePageService } from '../../../../services/article-page.service';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';
import { ForumTopicListResponse } from '@drevo-web/shared';
import { SpinnerComponent } from '@drevo-web/ui';
import { Observable, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, switchMap, tap } from 'rxjs/operators';

/** The forum section that holds the discussions of an article. */
const ARTICLE_SECTION = 'articles';

type TopicsResult = ForumTopicListResponse | 'load-error';

@Component({
    selector: 'app-article-forum-tab',
    imports: [SidebarActionComponent, SpinnerComponent, TopicListComponent, TopicPanesComponent],
    templateUrl: './article-forum-tab.component.html',
    styleUrl: './article-forum-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        TopicListPagesService,
        // The form opens in this tab's panel, so the topic it starts is one about the article.
        { provide: NEW_TOPIC_TARGET, useFactory: () => inject(ArticleForumTabComponent).newTopicTarget },
    ],
})
export class ArticleForumTabComponent {
    private readonly forumService = inject(ForumService);
    private readonly pageService = inject(ArticlePageService);
    private readonly logger = inject(LoggerService).withContext('ArticleForumTab');
    protected readonly pages = inject(TopicListPagesService);

    private readonly _firstPage = signal<TopicsResult | undefined>(undefined);

    readonly isLoaded = computed(() => typeof this._firstPage() === 'object');
    readonly isLoadError = computed(() => this._firstPage() === 'load-error');

    readonly newTopicTarget = computed<NewTopicTarget>(() => ({
        part: ARTICLE_SECTION,
        partId: this.pageService.articleId(),
    }));

    /** The sidebar renders outside this route, so the link is absolute. */
    readonly newTopicLink = computed(() => {
        const articleId = this.pageService.articleId();
        return articleId === undefined ? undefined : `/articles/${articleId}/forum/new`;
    });

    /** The article is read when the page is asked for: a list of the previous one is gone by then. */
    private readonly fetchPage: TopicPageFetch = page =>
        this.forumService.getTopics(ARTICLE_SECTION, this.pageService.articleId(), page);

    constructor() {
        // The article the page holds is what decides which discussions belong
        // here, and it changes under a live component: moving to another
        // article reuses this tab rather than recreating it.
        toObservable(this.pageService.articleId)
            .pipe(
                filter((articleId): articleId is number => articleId !== undefined),
                distinctUntilChanged(),
                tap(() => this.startLoad()),
                switchMap(articleId => this.loadFirstPage(articleId)),
                takeUntilDestroyed(),
            )
            .subscribe(result => this.applyFirstPage(result));
    }

    private startLoad(): void {
        this._firstPage.set(undefined);
        // Drops a page of the previous article still in flight.
        this.pages.reset(undefined, this.fetchPage);
    }

    private applyFirstPage(result: TopicsResult): void {
        this._firstPage.set(result);
        if (result !== 'load-error') {
            this.pages.reset(result, this.fetchPage);
        }
    }

    private loadFirstPage(articleId: number): Observable<TopicsResult> {
        return this.forumService.getTopics(ARTICLE_SECTION, articleId).pipe(
            catchError((error: unknown) => {
                this.logger.error(`Failed to load the discussions of the article ${articleId}`, error);
                return of('load-error' as const);
            }),
        );
    }
}
