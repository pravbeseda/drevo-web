import { ForumService } from '../../../services/forum/forum.service';
import { forumSectionOf } from '../../helpers/forum-owner';
import { pageUrl } from '../../helpers/page-kind';
import { PageContext } from '../../services/page-context/page-context';
import { TopicListPagesService, TopicPageFetch } from '../../services/topic-list-pages/topic-list-pages.service';
import { NEW_TOPIC_TARGET, NewTopicTarget } from '../new-topic-page/new-topic-target';
import { TopicListComponent } from '../topic-list/topic-list.component';
import { TopicPanesComponent } from '../topic-panes/topic-panes.component';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';
import { ForumTopicListResponse, PageKind } from '@drevo-web/shared';
import { SpinnerComponent } from '@drevo-web/ui/spinner';
import { Observable, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, switchMap, tap } from 'rxjs/operators';

/** How the log names the page. */
const LOG_NAME: Readonly<Record<PageKind, string>> = {
    articles: 'article',
    news: 'news item',
};

/** How the empty list names the page. */
const EMPTY_MESSAGE: Readonly<Record<PageKind, string>> = {
    articles: 'Обсуждений этой статьи пока нет.',
    news: 'Обсуждений этой новости пока нет.',
};

type TopicsResult = ForumTopicListResponse | 'load-error';

/** The discussions of an article or a news item, with a topic opened beside them. */
@Component({
    selector: 'app-page-forum-tab',
    imports: [SpinnerComponent, TopicListComponent, TopicPanesComponent],
    templateUrl: './page-forum-tab.component.html',
    styleUrl: './page-forum-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        TopicListPagesService,
        // The form opens in this tab's panel, so the topic it starts is one about the page.
        { provide: NEW_TOPIC_TARGET, useFactory: () => inject(PageForumTabComponent).newTopicTarget },
    ],
})
export class PageForumTabComponent {
    private readonly forumService = inject(ForumService);
    private readonly page = inject(PageContext);
    private readonly logger = inject(LoggerService).withContext('PageForumTab');
    private readonly section = forumSectionOf(this.page.kind);

    readonly emptyMessage = EMPTY_MESSAGE[this.page.kind];
    protected readonly pages = inject(TopicListPagesService);

    private readonly _firstPage = signal<TopicsResult | undefined>(undefined);

    readonly isLoaded = computed(() => typeof this._firstPage() === 'object');
    readonly isLoadError = computed(() => this._firstPage() === 'load-error');

    readonly newTopicTarget = computed<NewTopicTarget>(() => ({
        part: this.section,
        partId: this.page.articleId(),
        ownerTitle: this.page.title(),
    }));

    readonly newTopicLink = computed(() => {
        const articleId = this.page.articleId();
        return articleId === undefined ? undefined : `${pageUrl(this.page.kind, articleId)}/forum/new`;
    });

    /** The page is read when a list page is asked for: a list of the previous one is gone by then. */
    private readonly fetchPage: TopicPageFetch = listPage =>
        this.forumService.getTopics(this.section, this.page.articleId(), listPage);

    constructor() {
        // The page the shell holds is what decides which discussions belong
        // here, and it changes under a live component: moving to another
        // page reuses this tab rather than recreating it.
        toObservable(this.page.articleId)
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
        return this.forumService.getTopics(this.section, articleId).pipe(
            catchError((error: unknown) => {
                this.logger.error(
                    `Failed to load the discussions of the ${LOG_NAME[this.page.kind]} ${articleId}`,
                    error,
                );
                return of('load-error' as const);
            }),
        );
    }
}
