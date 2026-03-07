import { ArticleService } from '../../../../services/articles';
import { InworkService } from '../../../../services/inwork/inwork.service';
import { LinksService } from '../../../../services/links/links.service';
import { DraftEditorService } from '../../../../shared/services/draft-editor/draft-editor.service';
import { createMockArticle } from '../../testing/article-testing.helper';
import { ArticleEditComponent } from './article-edit.component';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { SaveArticleVersionResult } from '@drevo-web/shared';
import { ConfirmationService } from '@drevo-web/ui';
import { NotificationService } from '@drevo-web/core';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { NEVER, of, throwError } from 'rxjs';

const DRAFT_ROUTE = '/articles/123/version/456/edit';

const mockDraftEditorService = {
    getDraft: jest.fn().mockResolvedValue(undefined),
    onContentChanged: jest.fn(),
    discardDraft: jest.fn().mockResolvedValue(undefined),
    flush: jest.fn(),
    hasActiveSession: jest.fn().mockReturnValue(false),
};
const mockDraftEditorServiceProvider = { provide: DraftEditorService, useValue: mockDraftEditorService };

const mockLinks = { getLinkStatuses: jest.fn() };
const mockLinksServiceProvider = { provide: LinksService, useValue: mockLinks };

const mockInwork = {
    getActiveEditor: jest.fn().mockReturnValue(of(undefined)),
    markEditing: jest.fn().mockReturnValue(of(undefined)),
    clearEditing: jest.fn().mockReturnValue(of(undefined)),
};
const mockInworkServiceProvider = { provide: InworkService, useValue: mockInwork };

const mockVersion = createMockArticle({
    title: 'Test Article Title',
    content: '<p>Test article content</p>',
});

function createMockActivatedRoute(version = mockVersion) {
    return {
        provide: ActivatedRoute,
        useValue: {
            snapshot: {
                data: { version },
            },
        },
    };
}

describe('ArticleEditComponent', () => {
    let spectator: Spectator<ArticleEditComponent>;
    let articleService: jest.Mocked<ArticleService>;
    let notificationService: jest.Mocked<NotificationService>;
    let router: jest.Mocked<Router>;
    let confirmationService: jest.Mocked<ConfirmationService>;
    const createComponent = createComponentFactory({
        component: ArticleEditComponent,
        mocks: [ArticleService, NotificationService, Router, ConfirmationService],
        componentProviders: [mockLinksServiceProvider, mockDraftEditorServiceProvider, mockInworkServiceProvider],
        providers: [mockLoggerProvider(), createMockActivatedRoute()],
        detectChanges: false,
    });

    beforeEach(() => {
        mockDraftEditorService.getDraft.mockResolvedValue(undefined);
        mockDraftEditorService.hasActiveSession.mockReturnValue(false);
        mockDraftEditorService.onContentChanged.mockClear();
        mockDraftEditorService.discardDraft.mockClear();
        mockDraftEditorService.flush.mockClear();
        mockInwork.getActiveEditor.mockClear().mockReturnValue(of(undefined));
        mockInwork.markEditing.mockClear().mockReturnValue(of(undefined));
        mockInwork.clearEditing.mockClear().mockReturnValue(of(undefined));
        spectator = createComponent();
        articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
        notificationService = spectator.inject(NotificationService) as jest.Mocked<NotificationService>;
        router = spectator.inject(Router) as jest.Mocked<Router>;
        confirmationService = spectator.inject(ConfirmationService) as jest.Mocked<ConfirmationService>;
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    describe('version from route data', () => {
        it('should read version from route data', () => {
            spectator.detectChanges();

            expect(spectator.component.editorContent()).toBe('<p>Test article content</p>');
        });

        it('should render editor component with version content', () => {
            spectator.detectChanges();

            const editorComponent = spectator.query('lib-editor');
            expect(editorComponent).toBeTruthy();
        });

        it('should call getDraft after initialization', () => {
            spectator.detectChanges();

            expect(mockDraftEditorService.getDraft).toHaveBeenCalledWith(DRAFT_ROUTE);
        });

        it('should keep original content when no draft exists', async () => {
            spectator.detectChanges();
            await mockDraftEditorService.getDraft.mock.results[0].value;

            expect(spectator.component.editorContent()).toBe('<p>Test article content</p>');
        });

        it('should show restore dialog when draft exists on first entry', async () => {
            const draft = { userId: 'u1', route: DRAFT_ROUTE, title: 'Test', text: 'draft content', time: 1000 };
            mockDraftEditorService.getDraft.mockResolvedValue(draft);
            confirmationService.open.mockReturnValue(of('restore'));

            spectator = createComponent();
            confirmationService = spectator.inject(ConfirmationService) as jest.Mocked<ConfirmationService>;
            spectator.detectChanges();

            await mockDraftEditorService.getDraft.mock.results[0].value;

            expect(confirmationService.open).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Найден черновик',
                    disableClose: true,
                }),
            );
        });

        it('should restore draft content when user confirms restore', async () => {
            const draft = { userId: 'u1', route: DRAFT_ROUTE, title: 'Test', text: 'draft content', time: 1000 };
            mockDraftEditorService.getDraft.mockResolvedValue(draft);
            confirmationService.open.mockReturnValue(of('restore'));

            spectator = createComponent();
            confirmationService = spectator.inject(ConfirmationService) as jest.Mocked<ConfirmationService>;
            spectator.detectChanges();

            await mockDraftEditorService.getDraft.mock.results[0].value;
            // Wait for showRestoreDraftDialog to complete
            await Promise.resolve();

            expect(spectator.component.editorContent()).toBe('draft content');
        });

        it('should silently restore draft on re-entry', async () => {
            const draft = { userId: 'u1', route: DRAFT_ROUTE, title: 'Test', text: 'draft content', time: 1000 };
            mockDraftEditorService.getDraft.mockResolvedValue(draft);
            mockDraftEditorService.hasActiveSession.mockReturnValue(true);

            spectator = createComponent();
            confirmationService = spectator.inject(ConfirmationService) as jest.Mocked<ConfirmationService>;
            spectator.detectChanges();

            await mockDraftEditorService.getDraft.mock.results[0].value;

            expect(spectator.component.editorContent()).toBe('draft content');
            expect(confirmationService.open).not.toHaveBeenCalled();
        });

        it('should save restored draft content without extra contentChanged event', async () => {
            const draft = { userId: 'u1', route: DRAFT_ROUTE, title: 'Test', text: 'draft content', time: 1000 };
            mockDraftEditorService.getDraft.mockResolvedValue(draft);
            confirmationService.open.mockReturnValue(of('restore'));

            spectator = createComponent();
            articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
            confirmationService = spectator.inject(ConfirmationService) as jest.Mocked<ConfirmationService>;
            articleService.saveArticleVersion.mockReturnValue(
                of({
                    articleId: 123,
                    versionId: 999,
                    title: 'Test Article Title',
                    author: 'Test Author',
                    date: new Date('2024-01-15T10:00:00Z'),
                    approved: 0,
                }),
            );
            spectator.detectChanges();

            await mockDraftEditorService.getDraft.mock.results[0].value;
            await Promise.resolve();

            spectator.component.save();

            expect(articleService.saveArticleVersion).toHaveBeenCalledWith({
                versionId: 456,
                content: 'draft content',
            });
        });
    });

    describe('ngOnDestroy', () => {
        it('should call flush on destroy', () => {
            spectator.detectChanges();
            spectator.component.ngOnDestroy();

            expect(mockDraftEditorService.flush).toHaveBeenCalled();
        });
    });

    describe('updateLinks method', () => {
        it('should have empty initial updateLinksState', () => {
            spectator.detectChanges();

            expect(spectator.component.updateLinksState()).toEqual({});
        });

        it('should call linksService.getLinkStatuses with given links', () => {
            mockLinks.getLinkStatuses.mockReturnValue(of({}));
            spectator.detectChanges();

            spectator.component.updateLinks(['link1', 'link2']);

            expect(mockLinks.getLinkStatuses).toHaveBeenCalledWith(['link1', 'link2']);
        });

        it('should update updateLinksState with link statuses', () => {
            const mockStatuses = { link1: true, link2: false };
            mockLinks.getLinkStatuses.mockReturnValue(of(mockStatuses));
            spectator.detectChanges();

            spectator.component.updateLinks(['link1', 'link2']);

            expect(spectator.component.updateLinksState()).toEqual(mockStatuses);
        });

        it('should not throw on error from linksService', () => {
            mockLinks.getLinkStatuses.mockReturnValue(throwError(() => new Error('Network error')));
            spectator.detectChanges();

            expect(() => {
                spectator.component.updateLinks(['link1']);
            }).not.toThrow();
        });
    });

    describe('contentChanged method', () => {
        it('should accept content string without throwing', () => {
            spectator.detectChanges();

            expect(() => {
                spectator.component.contentChanged('new content');
            }).not.toThrow();
        });

        it('should call draftEditor.onContentChanged with correct input', () => {
            spectator.detectChanges();

            spectator.component.contentChanged('updated content');

            expect(mockDraftEditorService.onContentChanged).toHaveBeenCalledWith({
                route: DRAFT_ROUTE,
                title: 'Test Article Title',
                text: 'updated content',
            });
        });
    });

    describe('save method', () => {
        const mockSaveResult: SaveArticleVersionResult = {
            articleId: 123,
            versionId: 999,
            title: 'Test Article Title',
            author: 'Test Author',
            date: new Date('2024-01-15T10:00:00Z'),
            approved: 0,
        };

        beforeEach(() => {
            articleService.saveArticleVersion.mockReturnValue(of(mockSaveResult));
        });

        it('should not save when already saving', () => {
            spectator.detectChanges();
            spectator.component.contentChanged('new content');

            articleService.saveArticleVersion.mockReturnValue(NEVER);
            spectator.component.save();
            spectator.component.save();

            expect(articleService.saveArticleVersion).toHaveBeenCalledTimes(1);
        });

        it('should show info notification when content has not changed', () => {
            spectator.detectChanges();

            spectator.component.save();

            expect(notificationService.info).toHaveBeenCalledWith('Нет изменений для сохранения');
            expect(articleService.saveArticleVersion).not.toHaveBeenCalled();
        });

        it('should save when content has changed', () => {
            spectator.detectChanges();
            spectator.component.contentChanged('new content');

            spectator.component.save();

            expect(articleService.saveArticleVersion).toHaveBeenCalledWith({
                versionId: 456,
                content: 'new content',
            });
        });

        it('should set isSaving to true while saving', () => {
            spectator.detectChanges();
            spectator.component.contentChanged('new content');
            articleService.saveArticleVersion.mockReturnValue(NEVER);

            spectator.component.save();

            expect(spectator.component.isSaving()).toBe(true);
        });

        it('should navigate to article page on successful save', () => {
            spectator.detectChanges();
            spectator.component.contentChanged('new content');

            spectator.component.save();

            expect(router.navigate).toHaveBeenCalledWith(['/articles', 123]);
        });

        it('should show success notification on successful save', () => {
            spectator.detectChanges();
            spectator.component.contentChanged('new content');

            spectator.component.save();

            expect(notificationService.success).toHaveBeenCalledWith('Статья сохранена');
        });

        it('should discard draft after successful save', () => {
            spectator.detectChanges();
            spectator.component.contentChanged('new content');

            spectator.component.save();

            expect(mockDraftEditorService.discardDraft).toHaveBeenCalledWith(DRAFT_ROUTE);
        });

        it('should set isSaving to false after successful save', () => {
            spectator.detectChanges();
            spectator.component.contentChanged('new content');

            spectator.component.save();

            expect(spectator.component.isSaving()).toBe(false);
        });

        it('should show error notification on 401 error', () => {
            spectator.detectChanges();
            spectator.component.contentChanged('new content');

            const error = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
            articleService.saveArticleVersion.mockReturnValue(throwError(() => error));

            spectator.component.save();

            expect(notificationService.error).toHaveBeenCalledWith('Необходима авторизация');
        });

        it('should show error notification on 403 error', () => {
            spectator.detectChanges();
            spectator.component.contentChanged('new content');

            const error = new HttpErrorResponse({ status: 403, statusText: 'Forbidden' });
            articleService.saveArticleVersion.mockReturnValue(throwError(() => error));

            spectator.component.save();

            expect(notificationService.error).toHaveBeenCalledWith('Нет прав для сохранения');
        });

        it('should show custom error message from 403 response', () => {
            spectator.detectChanges();
            spectator.component.contentChanged('new content');

            const error = new HttpErrorResponse({
                status: 403,
                statusText: 'Forbidden',
                error: { error: 'Статья заблокирована' },
            });
            articleService.saveArticleVersion.mockReturnValue(throwError(() => error));

            spectator.component.save();

            expect(notificationService.error).toHaveBeenCalledWith('Статья заблокирована');
        });

        it('should show generic error message on other errors', () => {
            spectator.detectChanges();
            spectator.component.contentChanged('new content');

            const error = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
            articleService.saveArticleVersion.mockReturnValue(throwError(() => error));

            spectator.component.save();

            expect(notificationService.error).toHaveBeenCalledWith('Ошибка сохранения');
        });

        it('should show error message from response body', () => {
            spectator.detectChanges();
            spectator.component.contentChanged('new content');

            const error = new HttpErrorResponse({
                status: 500,
                statusText: 'Server Error',
                error: { error: 'Внутренняя ошибка сервера' },
            });
            articleService.saveArticleVersion.mockReturnValue(throwError(() => error));

            spectator.component.save();

            expect(notificationService.error).toHaveBeenCalledWith('Внутренняя ошибка сервера');
        });

        it('should set isSaving to false after error', () => {
            spectator.detectChanges();
            spectator.component.contentChanged('new content');

            const error = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
            articleService.saveArticleVersion.mockReturnValue(throwError(() => error));

            spectator.component.save();

            expect(spectator.component.isSaving()).toBe(false);
        });
    });

    describe('onTabChange method', () => {
        it('should call requestMeasure via requestAnimationFrame when switching to editor tab', () => {
            spectator.detectChanges();
            const rafSpy = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(cb => {
                cb(0);
                return 0;
            });
            const measureSpy = jest.fn();

            // Set up a mock editorComponent with requestMeasure
            Object.defineProperty(spectator.component, 'editorComponent', {
                get: () => ({ requestMeasure: measureSpy }),
                configurable: true,
            });

            spectator.component.onTabChange(0);

            expect(rafSpy).toHaveBeenCalled();
            expect(measureSpy).toHaveBeenCalled();
            rafSpy.mockRestore();
        });

        it('should not call requestAnimationFrame when switching to non-editor tab', () => {
            spectator.detectChanges();
            const rafSpy = jest.spyOn(globalThis, 'requestAnimationFrame');

            spectator.component.onTabChange(1);

            expect(rafSpy).not.toHaveBeenCalled();
            rafSpy.mockRestore();
        });
    });

    describe('inwork integration', () => {
        it('should check inwork status on init', () => {
            spectator.detectChanges();

            expect(mockInwork.getActiveEditor).toHaveBeenCalledWith('Test Article Title');
        });

        it('should mark editing when no other editor found', () => {
            mockInwork.getActiveEditor.mockReturnValue(of(undefined));
            spectator.detectChanges();

            expect(mockInwork.markEditing).toHaveBeenCalledWith('Test Article Title', 456);
        });

        it('should show warning dialog when another editor is found', () => {
            mockInwork.getActiveEditor.mockReturnValue(of('OtherUser'));
            confirmationService.open.mockReturnValue(NEVER);
            spectator.detectChanges();

            expect(confirmationService.open).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Статья редактируется',
                    disableClose: true,
                }),
            );
            expect(mockInwork.markEditing).not.toHaveBeenCalled();
        });

        it('should mark editing when user chooses to continue despite warning', () => {
            mockInwork.getActiveEditor.mockReturnValue(of('OtherUser'));
            confirmationService.open.mockReturnValue(of('continue'));
            spectator.detectChanges();

            expect(mockInwork.markEditing).toHaveBeenCalledWith('Test Article Title', 456);
        });

        it('should navigate back when user chooses not to edit', () => {
            mockInwork.getActiveEditor.mockReturnValue(of('OtherUser'));
            confirmationService.open.mockReturnValue(of('back'));
            spectator.detectChanges();

            expect(router.navigate).toHaveBeenCalledWith(['/articles', 123]);
            expect(mockInwork.markEditing).not.toHaveBeenCalled();
        });

        it('should clear editing mark on destroy', () => {
            spectator.detectChanges();
            spectator.component.ngOnDestroy();

            expect(mockInwork.clearEditing).toHaveBeenCalledWith('Test Article Title');
        });

        it('should clear editing mark on successful save', () => {
            const mockSaveResult: SaveArticleVersionResult = {
                articleId: 123,
                versionId: 999,
                title: 'Test Article Title',
                author: 'Test Author',
                date: new Date('2024-01-15T10:00:00Z'),
                approved: 0,
            };
            articleService.saveArticleVersion.mockReturnValue(of(mockSaveResult));
            spectator.detectChanges();
            spectator.component.contentChanged('new content');

            spectator.component.save();

            expect(mockInwork.clearEditing).toHaveBeenCalledWith('Test Article Title');
        });

        it('should not clear editing mark twice', () => {
            spectator.detectChanges();
            spectator.component.ngOnDestroy();
            spectator.component.ngOnDestroy();

            expect(mockInwork.clearEditing).toHaveBeenCalledTimes(1);
        });

        it('should clear editing mark on cancel without draft', async () => {
            spectator.detectChanges();
            mockDraftEditorService.getDraft.mockResolvedValue(undefined);

            await spectator.component.cancel();

            expect(mockInwork.clearEditing).toHaveBeenCalledWith('Test Article Title');
        });

        it('should not clear editing mark when user chose back from inwork warning', () => {
            mockInwork.getActiveEditor.mockReturnValue(of('OtherUser'));
            confirmationService.open.mockReturnValue(of('back'));
            spectator.detectChanges();

            spectator.component.ngOnDestroy();

            expect(mockInwork.clearEditing).not.toHaveBeenCalled();
        });
    });

    describe('cancel method', () => {
        it('should navigate immediately when no draft exists', async () => {
            spectator.detectChanges();
            mockDraftEditorService.getDraft.mockResolvedValue(undefined);

            await spectator.component.cancel();

            expect(router.navigate).toHaveBeenCalledWith(['/articles', 123, 'version', 456]);
        });

        it('should show confirm dialog when draft exists', async () => {
            spectator.detectChanges();
            const draft = { userId: 'u1', route: DRAFT_ROUTE, title: 'Test', text: 'x', time: 1000 };
            mockDraftEditorService.getDraft.mockResolvedValue(draft);
            confirmationService.open.mockReturnValue(of('confirm'));

            await spectator.component.cancel();

            expect(confirmationService.open).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Удалить черновик?', disableClose: true }),
            );
        });

        it('should discard and navigate when user confirms', async () => {
            spectator.detectChanges();
            const draft = { userId: 'u1', route: DRAFT_ROUTE, title: 'Test', text: 'x', time: 1000 };
            mockDraftEditorService.getDraft.mockResolvedValue(draft);
            confirmationService.open.mockReturnValue(of('confirm'));

            await spectator.component.cancel();

            expect(mockDraftEditorService.discardDraft).toHaveBeenCalledWith(DRAFT_ROUTE);
            expect(router.navigate).toHaveBeenCalledWith(['/articles', 123, 'version', 456]);
        });

        it('should stay on page when user cancels', async () => {
            spectator.detectChanges();
            const draft = { userId: 'u1', route: DRAFT_ROUTE, title: 'Test', text: 'x', time: 1000 };
            mockDraftEditorService.getDraft.mockResolvedValue(draft);
            confirmationService.open.mockReturnValue(of('cancel'));

            await spectator.component.cancel();

            expect(mockDraftEditorService.discardDraft).not.toHaveBeenCalled();
            expect(router.navigate).not.toHaveBeenCalled();
        });
    });
});

describe('ArticleEditComponent with undefined version', () => {
    const createComponent = createComponentFactory({
        component: ArticleEditComponent,
        mocks: [ArticleService, Router, ConfirmationService],
        componentProviders: [
            { provide: LinksService, useValue: { getLinkStatuses: jest.fn() } },
            { provide: DraftEditorService, useValue: mockDraftEditorService },
            mockInworkServiceProvider,
        ],
        providers: [
            mockLoggerProvider(),
            {
                provide: ActivatedRoute,
                useValue: { snapshot: { data: {} } },
            },
        ],
    });

    it('should show error when version is undefined', () => {
        const spectator = createComponent();

        expect(spectator.component.error()).toBe('Версия не найдена');
    });

    it('should navigate to home on cancel when version is undefined', async () => {
        const spectator = createComponent();
        const router = spectator.inject(Router) as jest.Mocked<Router>;

        await spectator.component.cancel();

        expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
});
