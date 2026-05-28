import { ArticlePageService } from './article-page.service';
import { createMockArticle } from '../testing/article-testing.helper';
import { ArticleService } from '../../../services/articles';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ApprovalStatus } from '@drevo-web/shared';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { Subject } from 'rxjs';

const mockArticle = createMockArticle();

describe('ArticlePageService', () => {
    let spectator: SpectatorService<ArticlePageService>;
    let renamedSubject: Subject<{ articleId: number; title: string }>;

    const createService = createServiceFactory({
        service: ArticlePageService,
        providers: [
            mockLoggerProvider(),
            MockProvider(ArticleService, {
                get renamed$() {
                    return renamedSubject.asObservable();
                },
            }),
        ],
    });

    beforeEach(() => {
        renamedSubject = new Subject();
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

            expect(spectator.service.editUrl()).toBe('/articles/123/version/456/edit');
        });

        it('should clear computed values after setError', () => {
            spectator.service.setArticle(mockArticle);
            spectator.service.setError('Error');

            expect(spectator.service.articleId()).toBeUndefined();
            expect(spectator.service.title()).toBeUndefined();
            expect(spectator.service.editUrl()).toBeUndefined();
        });
    });

    describe('updateApproval', () => {
        it('should update approved and comment on current article', () => {
            spectator.service.setArticle(mockArticle);

            spectator.service.updateApproval(ApprovalStatus.Rejected, 'Needs changes');

            const article = spectator.service.article()!;
            expect(article.approved).toBe(ApprovalStatus.Rejected);
            expect(article.comment).toBe('Needs changes');
        });

        it('should preserve other article fields', () => {
            spectator.service.setArticle(mockArticle);

            spectator.service.updateApproval(ApprovalStatus.Approved, 'OK');

            const article = spectator.service.article()!;
            expect(article.articleId).toBe(mockArticle.articleId);
            expect(article.versionId).toBe(mockArticle.versionId);
            expect(article.title).toBe(mockArticle.title);
            expect(article.content).toBe(mockArticle.content);
        });

        it('should do nothing when no article is set', () => {
            spectator.service.updateApproval(ApprovalStatus.Approved, 'OK');

            expect(spectator.service.article()).toBeUndefined();
        });
    });

    describe('rename event sync', () => {
        it('should update article title when rename event matches articleId', () => {
            spectator.service.setArticle(mockArticle);

            renamedSubject.next({ articleId: mockArticle.articleId, title: 'New Title' });

            expect(spectator.service.title()).toBe('New Title');
            expect(spectator.service.article()?.title).toBe('New Title');
        });

        it('should preserve other article fields when syncing rename', () => {
            spectator.service.setArticle(mockArticle);

            renamedSubject.next({ articleId: mockArticle.articleId, title: 'New Title' });

            const article = spectator.service.article();
            expect(article?.articleId).toBe(mockArticle.articleId);
            expect(article?.versionId).toBe(mockArticle.versionId);
            expect(article?.content).toBe(mockArticle.content);
            expect(article?.approved).toBe(mockArticle.approved);
        });

        it('should ignore rename event for different articleId', () => {
            spectator.service.setArticle(mockArticle);

            renamedSubject.next({ articleId: mockArticle.articleId + 1, title: 'Other' });

            expect(spectator.service.article()?.title).toBe(mockArticle.title);
        });

        it('should ignore rename event when no article is set', () => {
            renamedSubject.next({ articleId: 1, title: 'X' });

            expect(spectator.service.article()).toBeUndefined();
        });
    });
});
