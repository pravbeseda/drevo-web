import { ArticleForumTabComponent } from './article-forum-tab.component';
import { ForumService } from '../../../../../../services/forum/forum.service';
import { ArticlePageService } from '../../../../services/article-page.service';
import { createMockArticle } from '../../../../testing/article-testing.helper';
import { computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { MockLoggerService, mockLoggerProvider } from '@drevo-web/core/testing';
import { ArticleVersion, ForumTopicListItem, ForumTopicListResponse } from '@drevo-web/shared';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { NEVER, of, throwError } from 'rxjs';

const ARTICLE_ID = 123;

function createItem(id: number): ForumTopicListItem {
    return {
        id,
        title: `Тема ${id}`,
        author: 'Иванов И.И.',
        createdAt: new Date('2025-03-15T10:00:00Z'),
        repliesCount: 0,
        lastPostId: undefined,
        lastPostAt: undefined,
        pinned: false,
    };
}

function createPage(items: readonly ForumTopicListItem[]): ForumTopicListResponse {
    return { items, total: items.length, page: 1, pageSize: 20, totalPages: 1 };
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

    const titles = (): (string | undefined)[] =>
        spectator.queryAll('[data-testid="topic-title"]').map(element => element.textContent?.trim());

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

    it('links to the section holding every topic of this article', () => {
        render();

        expect(spectator.query('[data-testid="article-forum-all"]')).toHaveAttribute(
            'href',
            `/forum/articles/${ARTICLE_ID}`,
        );
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
});
