import { resolveNewsCreateSession } from './news-create-session.resolver';
import { NewsService } from '../../../services/news/news.service';
import { MockLoggerService } from '@drevo-web/core/testing';
import { of } from 'rxjs';

describe('resolveNewsCreateSession', () => {
    it('opens an empty news item, its sections to pick from', done => {
        const topics = [{ id: 3, title: 'Церковь' }];
        const newsService = { getTopics: jest.fn().mockReturnValue(of(topics)) };

        resolveNewsCreateSession(
            newsService as unknown as NewsService,
            new MockLoggerService().withContext('t'),
        ).subscribe(session => {
            expect(session).toEqual({
                kind: 'news',
                mode: 'create',
                articleId: 0,
                versionId: 0,
                title: '',
                content: '',
                newsTopics: topics,
            });
            done();
        });
    });
});
