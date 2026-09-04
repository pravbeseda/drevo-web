import { ForumService } from '../../../../../../services/forum/forum.service';
import { TopicListComponent } from '../../../../../../shared/components/topic-list/topic-list.component';
import { ArticlePageService } from '../../../../services/article-page.service';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { ForumTopicListItem } from '@drevo-web/shared';
import { SpinnerComponent } from '@drevo-web/ui';
import { Observable, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs/operators';

/** The forum section that holds the discussions of an article. */
const ARTICLE_SECTION = 'articles';

type TopicsResult = readonly ForumTopicListItem[] | 'load-error';

@Component({
    selector: 'app-article-forum-tab',
    imports: [RouterLink, SpinnerComponent, TopicListComponent],
    templateUrl: './article-forum-tab.component.html',
    styleUrl: './article-forum-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleForumTabComponent {
    private readonly forumService = inject(ForumService);
    private readonly pageService = inject(ArticlePageService);
    private readonly logger = inject(LoggerService).withContext('ArticleForumTab');

    private readonly _topics = signal<readonly ForumTopicListItem[] | undefined>(undefined);
    private readonly _isLoadError = signal(false);

    readonly topics = this._topics.asReadonly();
    readonly isLoadError = this._isLoadError.asReadonly();

    /** The section's own address, where the whole list lives — the tab shows the first page only. */
    readonly sectionUrl = computed(() => `/forum/${ARTICLE_SECTION}/${this.pageService.articleId()}`);

    constructor() {
        // The article the page holds is what decides which discussions belong
        // here, and it changes under a live component: moving to another
        // article reuses this tab rather than recreating it.
        toObservable(this.pageService.articleId)
            .pipe(
                filter((articleId): articleId is number => articleId !== undefined),
                distinctUntilChanged(),
                tap(() => this.startLoad()),
                switchMap(articleId => this.loadTopics(articleId)),
                takeUntilDestroyed(),
            )
            .subscribe(result => this.applyResult(result));
    }

    private startLoad(): void {
        this._topics.set(undefined);
        this._isLoadError.set(false);
    }

    private applyResult(result: TopicsResult): void {
        this._isLoadError.set(result === 'load-error');
        this._topics.set(result === 'load-error' ? undefined : result);
    }

    private loadTopics(articleId: number): Observable<TopicsResult> {
        return this.forumService.getTopics(ARTICLE_SECTION, articleId).pipe(
            map(response => response.items),
            catchError((error: unknown) => {
                this.logger.error(`Failed to load the discussions of the article ${articleId}`, error);
                return of('load-error' as const);
            }),
        );
    }
}
