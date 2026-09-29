import { ArticleForumTabComponent } from './article-forum-tab.component';
import { ForumService } from '../../../../../../services/forum/forum.service';
import { NEW_TOPIC_TARGET } from '../../../../../../shared/components/new-topic-page/new-topic-target';
import { TopicListComponent } from '../../../../../../shared/components/topic-list/topic-list.component';
import { ArticlePageService } from '../../../../services/article-page.service';
import { createMockArticle } from '../../../../testing/article-testing.helper';
import { computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { LoggerService, SidebarService } from '@drevo-web/core';
import { MockLoggerService, mockLoggerProvider } from '@drevo-web/core/testing';
import { ArticleVersion, ForumTopicListItem, ForumTopicListResponse } from '@drevo-web/shared';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { NEVER, of, throwError } from 'rxjs';

const ARTICLE_ID = 123;

function createItem(id: number): ForumTopicListItem {
    return {
        id,
        title: `Тема ${id}`,
        lastPostAt: undefined,
        pinned: false,
        author: 'Иванов И.И.',
        article: undefined,
        section: undefined,
    };
}

function createPage(
    items: readonly ForumTopicListItem[],
    overrides: Partial<ForumTopicListResponse> = {},
): ForumTopicListResponse {
    return { items, total: items.length, page: 1, pageSize: 20, totalPages: 1, ...overrides };
}

describe('ArticleForumTabComponent', () => {
    let spectator: Spectator<ArticleForumTabComponent>;
    let forumService: { getTopics: jest.Mock };
    let article: ReturnType<typeof signal<ArticleVersion | undefined>>;

    const createComponent = createComponentFactory({
        component: ArticleForumTabComponent,
        providers: [provideRouter([]), mockLoggerProvider()],
    });

    beforeEach(() => {
        forumService = { getTopics: jest.fn().mockReturnValue(of(createPage([createItem(1)]))) };
        article = signal<ArticleVersion | undefined>(createMockArticle({ articleId: ARTICLE_ID }));
    });

    const render = (): void => {
        spectator = createComponent({
            providers: [
                { provide: ForumService, useValue: forumService },
                {
                    provide: ArticlePageService,
                    useValue: { article, articleId: computed(() => article()?.articleId) },
                },
            ],
        });
    };

    const topicList = (): TopicListComponent | null => spectator.query(TopicListComponent);

    /** What the tab hands the list; which of them are drawn is the list's own business. */
    const titles = (): string[] =>
        topicList()
            ?.items()
            .map(item => item.title) ?? [];

    /** The reader scrolling near the end of the loaded rows. */
    const loadMore = (): void => {
        topicList()?.loadMore.emit();
        spectator.detectChanges();
    };

    it('carries the topic panel beside the list', () => {
        render();

        expect(spectator.query('[data-testid="forum-panes"]')).toExist();
        expect(spectator.query('[data-testid="topic-placeholder-hint"]')).toExist();
    });

    it('asks the forum for the topics of this article', () => {
        render();

        expect(forumService.getTopics).toHaveBeenCalledWith('articles', ARTICLE_ID);
    });

    it('renders the loaded topics as a topic list', () => {
        forumService.getTopics.mockReturnValue(of(createPage([createItem(1), createItem(2)])));

        render();

        expect(spectator.query('app-topic-list')).toBeTruthy();
        expect(titles()).toEqual(['Тема 1', 'Тема 2']);
    });

    describe('paging', () => {
        beforeEach(() => {
            forumService.getTopics.mockReturnValue(of(createPage([createItem(1)], { total: 2, totalPages: 2 })));
        });

        it('tells the list how many discussions the article has', () => {
            render();

            expect(topicList()?.total()).toBe(2);
        });

        it('appends the next page of this article discussions as the reader scrolls', () => {
            render();
            forumService.getTopics.mockReturnValue(
                of(createPage([createItem(2)], { page: 2, total: 2, totalPages: 2 })),
            );

            loadMore();

            expect(forumService.getTopics).toHaveBeenLastCalledWith('articles', ARTICLE_ID, 2);
            expect(titles()).toEqual(['Тема 1', 'Тема 2']);
        });

        it('pages through the article the page moved to', () => {
            render();
            forumService.getTopics.mockReturnValue(of(createPage([createItem(7)], { total: 2, totalPages: 2 })));
            article.set(createMockArticle({ articleId: 456 }));
            spectator.detectChanges();

            loadMore();

            expect(forumService.getTopics).toHaveBeenLastCalledWith('articles', 456, 2);
        });

        it('reports a failed page to the list and loads it again on retry', () => {
            render();
            forumService.getTopics.mockReturnValue(throwError(() => new Error('boom')));
            loadMore();

            expect(topicList()?.loadState()).toBe('failed');

            forumService.getTopics.mockReturnValue(
                of(createPage([createItem(2)], { page: 2, total: 2, totalPages: 2 })),
            );
            topicList()?.retry.emit();
            spectator.detectChanges();

            expect(titles()).toEqual(['Тема 1', 'Тема 2']);
        });
    });

    it('shows the spinner while the request is in flight', () => {
        forumService.getTopics.mockReturnValue(NEVER);

        render();

        expect(spectator.query('ui-spinner')).toBeTruthy();
        expect(spectator.query('app-topic-list')).toBeFalsy();
    });

    it('states that the article has no discussions yet', () => {
        forumService.getTopics.mockReturnValue(of(createPage([])));

        render();

        expect(spectator.query('[data-testid="article-forum-empty"]')).toHaveText('Обсуждений этой статьи пока нет.');
        expect(spectator.query('app-topic-list')).toBeFalsy();
    });

    it('reports a failed request to the reader and to the log', () => {
        const failure = new Error('boom');
        forumService.getTopics.mockReturnValue(throwError(() => failure));

        render();

        expect(spectator.query('[data-testid="article-forum-error"]')).toHaveText(
            'Не удалось загрузить обсуждения. Попробуйте обновить страницу.',
        );
        const loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
        expect(loggerService.mockLogger.error).toHaveBeenCalledWith(
            `Failed to load the discussions of the article ${ARTICLE_ID}`,
            failure,
        );
    });

    it('reloads when the page moves to another article, which reuses this component', () => {
        render();
        forumService.getTopics.mockReturnValue(of(createPage([createItem(7)])));

        article.set(createMockArticle({ articleId: 456 }));
        spectator.detectChanges();

        expect(forumService.getTopics).toHaveBeenLastCalledWith('articles', 456);
        expect(titles()).toEqual(['Тема 7']);
    });

    it('waits for the article before asking the forum', () => {
        article.set(undefined);

        render();

        expect(forumService.getTopics).not.toHaveBeenCalled();
        expect(spectator.query('ui-spinner')).toBeTruthy();
    });

    describe('starting a topic', () => {
        it('offers a new topic on the article above its discussions', () => {
            render();

            expect(spectator.query('[data-testid="forum-new-topic"] a')?.getAttribute('href')).toBe(
                `/articles/${ARTICLE_ID}/forum/new`,
            );
            expect(spectator.inject(SidebarService).actions()).toEqual([]);
        });

        it('binds the topic to the article the page holds', () => {
            render();

            expect(spectator.inject(NEW_TOPIC_TARGET, true)()).toEqual({ part: 'articles', partId: ARTICLE_ID });
        });
    });
});
