import { NewsPageService } from './news-page.service';
import { createMockArticle } from '../../../shared/testing/article-testing.helper';
import { LoggerService } from '@drevo-web/core';
import { MockLoggerService, mockLoggerProvider } from '@drevo-web/core/testing';
import { ApprovalStatus } from '@drevo-web/shared';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';

describe('NewsPageService', () => {
    let spectator: SpectatorService<NewsPageService>;

    const createService = createServiceFactory({
        service: NewsPageService,
        providers: [mockLoggerProvider()],
    });

    const topics = [
        { id: 1, title: 'Церковь' },
        { id: 2, title: 'Общество' },
        { id: 3, title: 'Культура' },
    ];

    beforeEach(() => (spectator = createService()));

    it('is the page context of a news item', () => {
        expect(spectator.service.kind).toBe('news');
    });

    it('holds the news item it is given', () => {
        spectator.service.setNews(createMockArticle({ articleId: 7, title: 'Новость' }), topics);

        expect(spectator.service.articleId()).toBe(7);
        expect(spectator.service.title()).toBe('Новость');
        expect(spectator.service.error()).toBeUndefined();
    });

    it('names the sections of the news item in its own order, skipping unknown ones', () => {
        spectator.service.setNews(createMockArticle({ topics: [3, 9, 1] }), topics);

        expect(spectator.service.sections()).toEqual([
            { id: 3, title: 'Культура' },
            { id: 1, title: 'Церковь' },
        ]);
    });

    it('drops the news item on an error', () => {
        spectator.service.setNews(createMockArticle(), topics);

        spectator.service.setError('Ошибка загрузки новости');

        expect(spectator.service.article()).toBeUndefined();
        expect(spectator.service.error()).toBe('Ошибка загрузки новости');
    });

    it('drops the news item when it is not found, without reporting a stale link as an error', () => {
        spectator.service.setNews(createMockArticle(), topics);
        spectator.service.setError('Ошибка загрузки новости');

        spectator.service.setNews(createMockArticle(), topics);
        const logger = (spectator.inject(LoggerService) as unknown as MockLoggerService).mockLogger;
        logger.error.mockClear();
        spectator.service.setNotFound();

        expect(spectator.service.isNotFound()).toBe(true);
        expect(spectator.service.article()).toBeUndefined();
        expect(spectator.service.error()).toBeUndefined();
        expect(logger.error).not.toHaveBeenCalled();
    });

    it.each([
        ['setNews', (service: NewsPageService) => service.setNews(createMockArticle(), topics)],
        ['setError', (service: NewsPageService) => service.setError('Ошибка')],
    ])('stops being not found on %s', (_name, reset) => {
        spectator.service.setNotFound();

        reset(spectator.service);

        expect(spectator.service.isNotFound()).toBe(false);
    });

    it('reflects a moderation decision on the current version', () => {
        spectator.service.setNews(createMockArticle({ approved: ApprovalStatus.Pending }), topics);

        spectator.service.updateApproval(ApprovalStatus.Approved, 'Хорошо');

        expect(spectator.service.article()).toEqual(
            expect.objectContaining({ approved: ApprovalStatus.Approved, comment: 'Хорошо' }),
        );
    });

    it('takes the meta a moderator changed', () => {
        spectator.service.setNews(createMockArticle({ articleId: 7, title: 'Новость', topics: [1] }), topics);

        spectator.service.applyMeta({
            articleId: 7,
            title: 'Другой заголовок',
            newsDate: new Date(2026, 10, 6),
            topics: [2],
        });

        expect(spectator.service.article()).toEqual(
            expect.objectContaining({
                title: 'Другой заголовок',
                newsDate: new Date(2026, 10, 6),
                topics: [2],
            }),
        );
        expect(spectator.service.sections()).toEqual([{ id: 2, title: 'Общество' }]);
    });
});
