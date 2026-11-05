import { resolveNewsTopics } from './news-topics.resolver';
import { NewsService } from '../../../services/news/news.service';
import { MockLoggerService } from '@drevo-web/core/testing';
import { of, throwError } from 'rxjs';

describe('resolveNewsTopics', () => {
    const logger = new MockLoggerService().withContext('test');

    it('resolves the news sections', done => {
        const newsService = { getTopics: jest.fn().mockReturnValue(of([{ id: 3, title: 'Церковь' }])) };

        resolveNewsTopics(newsService as unknown as NewsService, logger).subscribe(result => {
            expect(result).toEqual([{ id: 3, title: 'Церковь' }]);
            done();
        });
    });

    it('reports a failure and resolves no sections, so the feed still shows', done => {
        const error = new Error('down');
        const newsService = { getTopics: jest.fn().mockReturnValue(throwError(() => error)) };

        resolveNewsTopics(newsService as unknown as NewsService, logger).subscribe(result => {
            expect(result).toEqual([]);
            expect(logger.error).toHaveBeenCalledWith('Failed to load the news sections', error);
            done();
        });
    });
});
