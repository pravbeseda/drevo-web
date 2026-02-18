import { ArticlePageService } from './article-page.service';
import { createMockArticle } from './article-testing.helper';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';

const mockArticle = createMockArticle();

describe('ArticlePageService', () => {
    let spectator: SpectatorService<ArticlePageService>;

    const createService = createServiceFactory({
        service: ArticlePageService,
        providers: [mockLoggerProvider()],
    });

    beforeEach(() => {
        spectator = createService();
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    it('should have undefined article initially', () => {
        expect(spectator.service.article()).toBeUndefined();
    });

    it('should have undefined error initially', () => {
        expect(spectator.service.error()).toBeUndefined();
    });

    describe('setArticle', () => {
        it('should set article signal', () => {
            spectator.service.setArticle(mockArticle);

            expect(spectator.service.article()).toEqual(mockArticle);
        });

        it('should clear error when setting article', () => {
            spectator.service.setError('some error');
            spectator.service.setArticle(mockArticle);

            expect(spectator.service.error()).toBeUndefined();
        });
    });

    describe('setError', () => {
        it('should set error signal', () => {
            spectator.service.setError('Ошибка загрузки статьи');

            expect(spectator.service.error()).toBe('Ошибка загрузки статьи');
        });

        it('should clear article when setting error', () => {
            spectator.service.setArticle(mockArticle);
            spectator.service.setError('Error');

            expect(spectator.service.article()).toBeUndefined();
        });
    });

    describe('computed signals', () => {
        it('should compute articleId from article', () => {
            expect(spectator.service.articleId()).toBeUndefined();

            spectator.service.setArticle(mockArticle);

            expect(spectator.service.articleId()).toBe(123);
        });

        it('should compute title from article', () => {
            expect(spectator.service.title()).toBeUndefined();

            spectator.service.setArticle(mockArticle);

            expect(spectator.service.title()).toBe('Test Article');
        });

        it('should compute editUrl from article versionId', () => {
            expect(spectator.service.editUrl()).toBeUndefined();

            spectator.service.setArticle(mockArticle);

            expect(spectator.service.editUrl()).toBe('/articles/edit/456');
        });

        it('should clear computed values after setError', () => {
            spectator.service.setArticle(mockArticle);
            spectator.service.setError('Error');

            expect(spectator.service.articleId()).toBeUndefined();
            expect(spectator.service.title()).toBeUndefined();
            expect(spectator.service.editUrl()).toBeUndefined();
        });
    });
});
