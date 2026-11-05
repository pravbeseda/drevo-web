import { ArticleService } from '../../../services/articles';
import { InworkService } from '../../../services/inwork';
import { NewsService } from '../../../services/news/news.service';
import { LinksService } from '../../../services/links/links.service';
import { PageEditSession, toEditSession } from '../../models/page-edit-session';
import { DraftEditorService } from '../../services/draft-editor/draft-editor.service';
import { createMockArticle } from '../../testing/article-testing.helper';
import { PageEditComponent } from './page-edit.component';
import { NewsFieldsComponent } from '../news-fields/news-fields.component';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { SaveArticleVersionResult } from '@drevo-web/shared';
import { ConfirmationService } from '@drevo-web/ui/confirmation';
import { NotificationService } from '@drevo-web/core';
import { createComponentFactory, Spectator, SpyObject } from '@ngneat/spectator/jest';
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

function createMockActivatedRoute(session: PageEditSession = toEditSession(mockVersion, 'articles')) {
    return {
        provide: ActivatedRoute,
        useValue: {
            snapshot: {
                data: { session },
            },
        },
    };
}

describe('PageEditComponent', () => {
    let spectator: Spectator<PageEditComponent>;
    let articleService: jest.Mocked<ArticleService>;
    let notificationService: SpyObject<NotificationService>;
    let router: jest.Mocked<Router>;
    let confirmationService: jest.Mocked<ConfirmationService>;
    const createComponent = createComponentFactory({
        component: PageEditComponent,
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
        articleService = spectator.inject(ArticleService);
        notificationService = spectator.inject(NotificationService);
        router = spectator.inject(Router);
        confirmationService = spectator.inject(ConfirmationService);
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
            confirmationService = spectator.inject(ConfirmationService);
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
            confirmationService = spectator.inject(ConfirmationService);
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
            confirmationService = spectator.inject(ConfirmationService);
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
            articleService = spectator.inject(ArticleService);
            confirmationService = spectator.inject(ConfirmationService);
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

            expect(articleService.saveArticleVersion).toHaveBeenCalledWith(
                {
                    versionId: 456,
                    content: 'draft content',
                },
                'articles',
            );
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

            expect(articleService.saveArticleVersion).toHaveBeenCalledWith(
                {
                    versionId: 456,
                    content: 'new content',
                },
                'articles',
            );
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

            expect(router.navigateByUrl).toHaveBeenCalledWith('/articles/123');
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

        it('should not treat a 409 DUPLICATE_TITLE as a duplicate on a version save', () => {
            spectator.detectChanges();
            spectator.component.contentChanged('new content');

            const error = new HttpErrorResponse({
                status: 409,
                statusText: 'Conflict',
                error: { error: 'Конфликт', errorCode: 'DUPLICATE_TITLE', data: { articleId: 321 } },
            });
            articleService.saveArticleVersion.mockReturnValue(throwError(() => error));

            spectator.component.save();

            // Version save has no title to duplicate — must not bounce the editor.
            expect(router.navigate).not.toHaveBeenCalled();
            expect(router.navigateByUrl).not.toHaveBeenCalled();
            expect(notificationService.error).toHaveBeenCalledWith('Конфликт');
        });

        it('should set isSaving to false after error', () => {
            spectator.detectChanges();
            spectator.component.contentChanged('new content');

            const error = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
            articleService.saveArticleVersion.mockReturnValue(throwError(() => error));

            spectator.component.save();

            expect(spectator.component.isSaving()).toBe(false);
        });

        describe('validation', () => {
            it('should show confirmation when content has warnings', () => {
                confirmationService.open.mockReturnValue(NEVER);
                spectator.detectChanges();
                spectator.component.contentChanged('== ((ссылка)) ==');

                spectator.component.save();

                expect(confirmationService.open).toHaveBeenCalledWith(
                    expect.objectContaining({
                        title: 'Предупреждения в тексте',
                    }),
                );
                expect(articleService.saveArticleVersion).not.toHaveBeenCalled();
            });

            it('should save after user confirms warnings', () => {
                confirmationService.open.mockReturnValue(of('confirm'));
                spectator.detectChanges();
                spectator.component.contentChanged('== ((ссылка)) ==');

                spectator.component.save();

                expect(articleService.saveArticleVersion).toHaveBeenCalledWith(
                    {
                        versionId: 456,
                        content: '== ((ссылка)) ==',
                    },
                    'articles',
                );
            });

            it('should not save when user cancels warning dialog', () => {
                confirmationService.open.mockReturnValue(of('cancel'));
                spectator.detectChanges();
                spectator.component.contentChanged('== ((ссылка)) ==');

                spectator.component.save();

                expect(articleService.saveArticleVersion).not.toHaveBeenCalled();
            });

            it('should show confirmation for bracket warnings', () => {
                confirmationService.open.mockReturnValue(NEVER);
                spectator.detectChanges();
                spectator.component.contentChanged('текст (без закрытия');

                spectator.component.save();

                expect(confirmationService.open).toHaveBeenCalledWith(
                    expect.objectContaining({
                        title: 'Предупреждения в тексте',
                    }),
                );
                expect(articleService.saveArticleVersion).not.toHaveBeenCalled();
            });
        });
    });

    describe('validation indicators', () => {
        it('should default to no problems', () => {
            spectator.detectChanges();

            expect(spectator.component.validationResult()).toEqual({ errors: 0, warnings: 0 });
            expect(spectator.component.hasProblems()).toBe(false);
        });

        it('should update on validationChange', () => {
            spectator.detectChanges();

            spectator.component.onValidationChange({ errors: 2, warnings: 1 });

            expect(spectator.component.validationResult()).toEqual({ errors: 2, warnings: 1 });
        });

        it('should compute hasErrors', () => {
            spectator.detectChanges();
            spectator.component.onValidationChange({ errors: 1, warnings: 0 });

            expect(spectator.component.hasErrors()).toBe(true);
            expect(spectator.component.hasWarnings()).toBe(false);
        });

        it('should compute hasWarnings', () => {
            spectator.detectChanges();
            spectator.component.onValidationChange({ errors: 0, warnings: 3 });

            expect(spectator.component.hasErrors()).toBe(false);
            expect(spectator.component.hasWarnings()).toBe(true);
        });

        it('should compute hasProblems when both exist', () => {
            spectator.detectChanges();
            spectator.component.onValidationChange({ errors: 1, warnings: 2 });

            expect(spectator.component.hasProblems()).toBe(true);
        });

        it('should return "Проблем нет" tooltip when no problems', () => {
            spectator.detectChanges();

            expect(spectator.component.validationTooltip()).toBe('Проблем нет');
        });

        it('should return errors-only tooltip', () => {
            spectator.detectChanges();
            spectator.component.onValidationChange({ errors: 3, warnings: 0 });

            expect(spectator.component.validationTooltip()).toBe('Ошибок: 3');
        });

        it('should return warnings-only tooltip', () => {
            spectator.detectChanges();
            spectator.component.onValidationChange({ errors: 0, warnings: 2 });

            expect(spectator.component.validationTooltip()).toBe('Предупреждений: 2');
        });

        it('should return combined tooltip', () => {
            spectator.detectChanges();
            spectator.component.onValidationChange({ errors: 1, warnings: 2 });

            expect(spectator.component.validationTooltip()).toBe('Ошибок: 1. Предупреждений: 2');
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

            expect(router.navigateByUrl).toHaveBeenCalledWith('/articles/123');
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

            expect(confirmationService.open).not.toHaveBeenCalled();
            expect(router.navigateByUrl).toHaveBeenCalledWith('/articles/123/version/456');
        });

        it('should ask before discarding edits the debounced draft write has not stored yet', async () => {
            spectator.detectChanges();
            mockDraftEditorService.getDraft.mockResolvedValue(undefined);
            confirmationService.open.mockReturnValue(of('cancel'));
            spectator.component.contentChanged('fresh edit');

            await spectator.component.cancel();

            expect(confirmationService.open).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Удалить черновик?', disableClose: true }),
            );
            expect(mockDraftEditorService.discardDraft).not.toHaveBeenCalled();
            expect(router.navigate).not.toHaveBeenCalled();
            expect(router.navigateByUrl).not.toHaveBeenCalled();
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
            expect(router.navigateByUrl).toHaveBeenCalledWith('/articles/123/version/456');
        });

        it('should stay on page when user cancels', async () => {
            spectator.detectChanges();
            const draft = { userId: 'u1', route: DRAFT_ROUTE, title: 'Test', text: 'x', time: 1000 };
            mockDraftEditorService.getDraft.mockResolvedValue(draft);
            confirmationService.open.mockReturnValue(of('cancel'));

            await spectator.component.cancel();

            expect(mockDraftEditorService.discardDraft).not.toHaveBeenCalled();
            expect(router.navigate).not.toHaveBeenCalled();
            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });
    });
});

describe('PageEditComponent in create mode', () => {
    const CREATE_DRAFT_ROUTE = '/articles/find/НОВАЯ СТАТЬЯ/edit';
    const createSession: PageEditSession = {
        kind: 'articles',
        mode: 'create',
        articleId: 0,
        versionId: 0,
        title: 'НОВАЯ СТАТЬЯ',
        content: '',
    };
    const mockCreateResult: SaveArticleVersionResult = {
        articleId: 555,
        versionId: 777,
        title: 'НОВАЯ СТАТЬЯ',
        author: 'Test Author',
        date: new Date('2024-01-15T10:00:00Z'),
        approved: 0,
    };

    let spectator: Spectator<PageEditComponent>;
    let articleService: jest.Mocked<ArticleService>;
    let notificationService: SpyObject<NotificationService>;
    let router: jest.Mocked<Router>;

    const createComponent = createComponentFactory({
        component: PageEditComponent,
        mocks: [ArticleService, NotificationService, Router, ConfirmationService],
        componentProviders: [mockLinksServiceProvider, mockDraftEditorServiceProvider, mockInworkServiceProvider],
        providers: [
            mockLoggerProvider(),
            {
                provide: ActivatedRoute,
                useValue: { snapshot: { data: { session: createSession } } },
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        mockDraftEditorService.getDraft.mockResolvedValue(undefined);
        mockDraftEditorService.hasActiveSession.mockReturnValue(false);
        mockDraftEditorService.discardDraft.mockClear();
        mockInwork.getActiveEditor.mockClear().mockReturnValue(of(undefined));
        mockInwork.markEditing.mockClear().mockReturnValue(of(undefined));
        mockInwork.clearEditing.mockClear().mockReturnValue(of(undefined));
        spectator = createComponent();
        articleService = spectator.inject(ArticleService);
        notificationService = spectator.inject(NotificationService);
        router = spectator.inject(Router);
        articleService.createArticle.mockReturnValue(of(mockCreateResult));
    });

    it('should start with empty content', () => {
        spectator.detectChanges();

        expect(spectator.component.editorContent()).toBe('');
        expect(spectator.component.articleId()).toBe(0);
    });

    it('should use the find route for drafts', () => {
        spectator.detectChanges();

        expect(mockDraftEditorService.getDraft).toHaveBeenCalledWith(CREATE_DRAFT_ROUTE);
    });

    it('should refuse to save empty content', () => {
        spectator.detectChanges();

        spectator.component.save();

        expect(notificationService.info).toHaveBeenCalledWith('Введите текст статьи');
        expect(articleService.createArticle).not.toHaveBeenCalled();
    });

    it('should create the article instead of saving a version', () => {
        spectator.detectChanges();
        spectator.component.contentChanged('Текст новой статьи');

        spectator.component.save();

        expect(articleService.createArticle).toHaveBeenCalledWith({
            title: 'НОВАЯ СТАТЬЯ',
            content: 'Текст новой статьи',
            info: 'Новая статья',
        });
        expect(articleService.saveArticleVersion).not.toHaveBeenCalled();
    });

    it('should navigate to the created article', () => {
        spectator.detectChanges();
        spectator.component.contentChanged('Текст новой статьи');

        spectator.component.save();

        expect(notificationService.success).toHaveBeenCalledWith('Статья создана');
        expect(router.navigateByUrl).toHaveBeenCalledWith('/articles/555');
    });

    it('should keep the draft and stay in the editor on a duplicate title', () => {
        spectator.detectChanges();
        spectator.component.contentChanged('Текст новой статьи');
        const error = new HttpErrorResponse({
            status: 409,
            statusText: 'Conflict',
            error: {
                success: false,
                error: 'Статья с таким названием уже существует',
                errorCode: 'DUPLICATE_TITLE',
                data: { articleId: 321 },
            },
        });
        articleService.createArticle.mockReturnValue(throwError(() => error));

        spectator.component.save();

        // Concurrent creation — warn the text is unsaved, but don't discard the
        // draft or bounce the user away, so they can copy their content out.
        expect(notificationService.error).toHaveBeenCalledWith(
            'Статья с таким названием уже создана. Ваш текст не сохранён — скопируйте его при необходимости.',
        );
        expect(router.navigate).not.toHaveBeenCalled();
        expect(router.navigateByUrl).not.toHaveBeenCalled();
        expect(mockDraftEditorService.discardDraft).not.toHaveBeenCalled();
    });

    it('should stay in the editor on other create errors', () => {
        spectator.detectChanges();
        spectator.component.contentChanged('Текст новой статьи');
        const error = new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden',
            error: { error: 'Превышен лимит правок' },
        });
        articleService.createArticle.mockReturnValue(throwError(() => error));

        spectator.component.save();

        expect(notificationService.error).toHaveBeenCalledWith('Превышен лимит правок');
        expect(router.navigate).not.toHaveBeenCalled();
        expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('should cancel back to the find page', async () => {
        spectator.detectChanges();
        mockDraftEditorService.getDraft.mockResolvedValue(undefined);

        await spectator.component.cancel();

        expect(router.navigate).toHaveBeenCalledWith(['/articles', 'find', 'НОВАЯ СТАТЬЯ']);
    });
});

describe('PageEditComponent with undefined version', () => {
    const createComponent = createComponentFactory({
        component: PageEditComponent,
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

describe('PageEditComponent on a news version', () => {
    let spectator: Spectator<PageEditComponent>;
    let articleService: jest.Mocked<ArticleService>;
    let notificationService: SpyObject<NotificationService>;
    let router: jest.Mocked<Router>;
    let confirmationService: jest.Mocked<ConfirmationService>;

    const newsSession = toEditSession(
        createMockArticle({ articleId: 7, versionId: 70, title: 'Новость', content: 'Текст новости' }),
        'news',
    );

    const createComponent = createComponentFactory({
        component: PageEditComponent,
        mocks: [ArticleService, NotificationService, Router, ConfirmationService],
        componentProviders: [mockLinksServiceProvider, mockDraftEditorServiceProvider, mockInworkServiceProvider],
        providers: [mockLoggerProvider(), createMockActivatedRoute(newsSession)],
        detectChanges: false,
    });

    beforeEach(() => {
        mockDraftEditorService.getDraft.mockClear().mockResolvedValue(undefined);
        mockDraftEditorService.hasActiveSession.mockReturnValue(false);
        mockDraftEditorService.discardDraft.mockClear();
        mockDraftEditorService.onContentChanged.mockClear();
        mockInwork.getActiveEditor.mockClear().mockReturnValue(of(undefined));
        mockInwork.markEditing.mockClear().mockReturnValue(of(undefined));
        mockInwork.clearEditing.mockClear().mockReturnValue(of(undefined));
        spectator = createComponent();
        articleService = spectator.inject(ArticleService);
        notificationService = spectator.inject(NotificationService);
        router = spectator.inject(Router);
        confirmationService = spectator.inject(ConfirmationService);
        articleService.saveArticleVersion.mockReturnValue(
            of({ articleId: 7, versionId: 71, title: 'Новость', author: 'a', date: new Date(), approved: 0 }),
        );
    });

    it('saves the news version through the news endpoints and opens the news item', () => {
        spectator.detectChanges();
        spectator.component.contentChanged('Новый текст');

        spectator.component.save();

        expect(articleService.saveArticleVersion).toHaveBeenCalledWith(
            { versionId: 70, content: 'Новый текст' },
            'news',
        );
        expect(notificationService.success).toHaveBeenCalledWith('Новость сохранена');
        expect(router.navigateByUrl).toHaveBeenCalledWith('/news/7');
    });

    it('keeps its draft under the news version', () => {
        spectator.detectChanges();
        spectator.component.contentChanged('Новый текст');

        expect(mockDraftEditorService.onContentChanged).toHaveBeenCalledWith({
            route: '/news/7/version/70/edit',
            title: 'Новость',
            text: 'Новый текст',
        });
    });

    it('marks nothing as in work: the editing marks are kept for articles only', () => {
        spectator.detectChanges();
        spectator.component.ngOnDestroy();

        expect(mockInwork.getActiveEditor).not.toHaveBeenCalled();
        expect(mockInwork.markEditing).not.toHaveBeenCalled();
        expect(mockInwork.clearEditing).not.toHaveBeenCalled();
    });

    it('goes back to the news version on cancel', async () => {
        spectator.detectChanges();

        await spectator.component.cancel();

        expect(router.navigateByUrl).toHaveBeenCalledWith('/news/7/version/70');
        expect(confirmationService.open).not.toHaveBeenCalled();
    });
});

describe('PageEditComponent creating a news item', () => {
    let spectator: Spectator<PageEditComponent>;
    let newsService: jest.Mocked<NewsService>;
    let notificationService: SpyObject<NotificationService>;
    let router: jest.Mocked<Router>;

    const topics = [
        { id: 3, title: 'Церковь' },
        { id: 5, title: 'Общество' },
    ];
    const createSession: PageEditSession = {
        kind: 'news',
        mode: 'create',
        articleId: 0,
        versionId: 0,
        title: '',
        content: '',
        newsTopics: topics,
    };

    const createComponent = createComponentFactory({
        component: PageEditComponent,
        mocks: [ArticleService, NewsService, NotificationService, Router, ConfirmationService],
        componentProviders: [mockLinksServiceProvider, mockDraftEditorServiceProvider, mockInworkServiceProvider],
        providers: [mockLoggerProvider(), createMockActivatedRoute(createSession)],
        detectChanges: false,
    });

    const fields = (): NewsFieldsComponent | null => spectator.query(NewsFieldsComponent);
    const fill = (title: string, topic: number | undefined, content: string): void => {
        spectator.component.onNewsFields({ title, newsDate: '2026-11-05', topic });
        spectator.component.contentChanged(content);
    };

    beforeEach(() => {
        jest.useFakeTimers({ now: new Date(2026, 10, 5, 12, 0), doNotFake: ['queueMicrotask', 'nextTick'] });
        mockDraftEditorService.getDraft.mockClear().mockResolvedValue(undefined);
        mockDraftEditorService.hasActiveSession.mockReturnValue(false);
        mockDraftEditorService.onContentChanged.mockClear();
        mockInwork.getActiveEditor.mockClear().mockReturnValue(of(undefined));
        spectator = createComponent();
        newsService = spectator.inject(NewsService);
        notificationService = spectator.inject(NotificationService);
        router = spectator.inject(Router);
        newsService.createNews.mockReturnValue(
            of({ articleId: 7, versionId: 70, title: 'Новость', author: 'a', date: new Date(), approved: 0 }),
        );
        spectator.detectChanges();
    });

    afterEach(() => jest.useRealTimers());

    it('asks for the title, the day — today by default — and the section', () => {
        expect(fields()?.topics()).toEqual(topics);
        expect(fields()?.value()).toEqual({ title: '', newsDate: '2026-11-05', topic: undefined });
    });

    it('creates the news item from the fields and the text, then opens it', () => {
        fill('  Новость  ', 3, 'Текст');

        spectator.component.save();

        expect(newsService.createNews).toHaveBeenCalledWith({
            title: 'Новость',
            newsDate: '2026-11-05',
            topic: 3,
            content: 'Текст',
            info: 'Новая новость',
        });
        expect(notificationService.success).toHaveBeenCalledWith('Новость создана');
        expect(router.navigateByUrl).toHaveBeenCalledWith('/news/7');
    });

    it.each([
        ['a title', '', 3, 'Текст', 'Введите заголовок новости'],
        ['a section', 'Новость', undefined, 'Текст', 'Выберите раздел новости'],
        ['a text', 'Новость', 3, '  ', 'Введите текст новости'],
    ])('asks for %s before creating', (_case, title, topic, content, message) => {
        fill(title, topic, content);

        spectator.component.save();

        expect(notificationService.info).toHaveBeenCalledWith(message);
        expect(newsService.createNews).not.toHaveBeenCalled();
    });

    it('asks for the day before creating', () => {
        spectator.component.onNewsFields({ title: 'Новость', newsDate: '', topic: 3 });
        spectator.component.contentChanged('Текст');

        spectator.component.save();

        expect(notificationService.info).toHaveBeenCalledWith('Укажите дату новости');
        expect(newsService.createNews).not.toHaveBeenCalled();
    });

    it('keeps its draft under /news/new, named by the title typed', () => {
        fill('Новость', 3, 'Текст');

        expect(mockDraftEditorService.onContentChanged).toHaveBeenLastCalledWith({
            route: '/news/new',
            title: 'Новость',
            text: 'Текст',
        });
    });

    it('goes back to the news history on cancel', async () => {
        await spectator.component.cancel();

        expect(router.navigateByUrl).toHaveBeenCalledWith('/history/news');
    });
});
