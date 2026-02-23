import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { of, throwError, NEVER, BehaviorSubject } from 'rxjs';
import { NotificationService } from '@drevo-web/core';
import { ArticleVersion, SaveArticleVersionResult } from '@drevo-web/shared';
import { ArticleService } from '../../../../services/articles';
import { LinksService } from '../../../../services/links/links.service';
import { DraftEditorService } from '../../../../shared/services/draft-editor/draft-editor.service';
import { ArticleEditComponent } from './article-edit.component';

const mockDraftEditorServiceProvider = {
    provide: DraftEditorService,
    useValue: {
        checkDraft: jest.fn().mockResolvedValue(undefined),
        onContentChanged: jest.fn(),
        discardDraft: jest.fn().mockResolvedValue(undefined),
        confirmDiscardAndNavigate: jest.fn().mockResolvedValue(undefined),
    },
};

const mockLinksServiceProvider = { provide: LinksService, useValue: { getLinkStatuses: jest.fn() } };

describe('ArticleEditComponent', () => {
    let spectator: Spectator<ArticleEditComponent>;
    let articleService: jest.Mocked<ArticleService>;
    let notificationService: jest.Mocked<NotificationService>;
    let router: jest.Mocked<Router>;
    let linksService: jest.Mocked<LinksService>;
    let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

    const mockVersion: ArticleVersion = {
        articleId: 123,
        versionId: 456,
        title: 'Test Article Title',
        content: '<p>Test article content</p>',
        author: 'Test Author',
        date: new Date('2024-01-15T10:00:00Z'),
        redirect: false,
        approved: 1,
        info: 'Test info',
        comment: 'Test comment',
    } as ArticleVersion;

    const createComponent = createComponentFactory({
        component: ArticleEditComponent,
        mocks: [ArticleService, NotificationService, Router],
        componentProviders: [mockLinksServiceProvider, mockDraftEditorServiceProvider],
        providers: [
            {
                provide: ActivatedRoute,
                useFactory: () => ({
                    paramMap: paramMapSubject.asObservable(),
                }),
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        paramMapSubject = new BehaviorSubject(convertToParamMap({ id: '456' }));
        spectator = createComponent();
        articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
        notificationService = spectator.inject(NotificationService) as jest.Mocked<NotificationService>;
        router = spectator.inject(Router) as jest.Mocked<Router>;
        linksService = spectator.component['linksService'] as jest.Mocked<LinksService>;
        articleService.getArticleVersion.mockReturnValue(of(mockVersion));
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    describe('successful version loading', () => {
        it('should display spinner while loading', () => {
            articleService.getArticleVersion.mockReturnValue(NEVER);
            spectator.detectChanges();

            expect(spectator.component.isLoading()).toBe(true);
            expect(spectator.query('ui-spinner')).toBeTruthy();
            expect(spectator.query('.article-edit')).toBeFalsy();
        });

        it('should load and display version for editing', () => {
            spectator.detectChanges();

            expect(articleService.getArticleVersion).toHaveBeenCalledWith(456);
            expect(spectator.component.version()).toEqual(mockVersion);
            expect(spectator.component.isLoading()).toBe(false);
            expect(spectator.query('.article-edit-title')).toHaveText('Test Article Title');
        });

        it('should render editor component with version content', () => {
            spectator.detectChanges();

            const editorComponent = spectator.query('lib-editor');
            expect(editorComponent).toBeTruthy();
        });

        it('should call checkDraft after version loads', () => {
            const draftEditor = spectator.component['draftEditor'] as jest.Mocked<DraftEditorService>;
            spectator.detectChanges();

            expect(draftEditor.checkDraft).toHaveBeenCalledWith('/articles/edit/123');
        });

        it('should set editorContent to draft text when draft is restored', async () => {
            const draftEditor = spectator.component['draftEditor'] as jest.Mocked<DraftEditorService>;
            draftEditor.checkDraft.mockResolvedValue('draft content');
            spectator.detectChanges();

            await draftEditor.checkDraft.mock.results[0].value;

            expect(spectator.component.editorContent()).toBe('draft content');
        });

        it('should keep original content when no draft exists', async () => {
            const draftEditor = spectator.component['draftEditor'] as jest.Mocked<DraftEditorService>;
            draftEditor.checkDraft.mockResolvedValue(undefined);
            spectator.detectChanges();

            await draftEditor.checkDraft.mock.results[0].value;

            expect(spectator.component.editorContent()).toBe('<p>Test article content</p>');
        });

        it('should reload version when route param changes', () => {
            spectator.detectChanges();

            expect(articleService.getArticleVersion).toHaveBeenCalledWith(456);

            const anotherVersion: ArticleVersion = {
                ...mockVersion,
                versionId: 789,
                title: 'Another Version',
            };
            articleService.getArticleVersion.mockReturnValue(of(anotherVersion));

            paramMapSubject.next(convertToParamMap({ id: '789' }));

            expect(articleService.getArticleVersion).toHaveBeenCalledWith(789);
            expect(spectator.component.version()).toEqual(anotherVersion);
        });

        it('should not reload when same ID is emitted', () => {
            spectator.detectChanges();

            expect(articleService.getArticleVersion).toHaveBeenCalledTimes(1);

            paramMapSubject.next(convertToParamMap({ id: '456' }));

            expect(articleService.getArticleVersion).toHaveBeenCalledTimes(1);
        });

        it('should retry loading after error when navigating to different version', () => {
            const error = new HttpErrorResponse({
                status: 500,
                statusText: 'Server Error',
            });
            articleService.getArticleVersion.mockReturnValue(throwError(() => error));
            spectator.detectChanges();

            expect(spectator.component.error()).toBe('Ошибка загрузки версии');

            articleService.getArticleVersion.mockReturnValue(of(mockVersion));

            paramMapSubject.next(convertToParamMap({ id: '789' }));

            expect(articleService.getArticleVersion).toHaveBeenCalledWith(789);
            expect(spectator.component.version()).toEqual(mockVersion);
            expect(spectator.component.error()).toBeUndefined();
        });
    });

    describe('error handling', () => {
        it('should display error message when version not found (404)', () => {
            const error = new HttpErrorResponse({
                status: 404,
                statusText: 'Not Found',
            });
            articleService.getArticleVersion.mockReturnValue(throwError(() => error));
            spectator.detectChanges();

            expect(spectator.component.error()).toBe('Версия не найдена');
            expect(spectator.component.isLoading()).toBe(false);
            expect(spectator.query('.error-message')).toHaveText('Версия не найдена');
        });

        it('should display access denied message for 403 error', () => {
            const error = new HttpErrorResponse({
                status: 403,
                statusText: 'Forbidden',
            });
            articleService.getArticleVersion.mockReturnValue(throwError(() => error));
            spectator.detectChanges();

            expect(spectator.component.error()).toBe('Доступ запрещён');
            expect(spectator.component.isLoading()).toBe(false);
        });

        it('should display generic error message for other errors', () => {
            const error = new HttpErrorResponse({
                status: 500,
                statusText: 'Server Error',
            });
            articleService.getArticleVersion.mockReturnValue(throwError(() => error));
            spectator.detectChanges();

            expect(spectator.component.error()).toBe('Ошибка загрузки версии');
        });

        it('should clear previous version when error occurs', () => {
            spectator.detectChanges();
            expect(spectator.component.version()).toEqual(mockVersion);

            const error = new HttpErrorResponse({
                status: 500,
                statusText: 'Server Error',
            });
            articleService.getArticleVersion.mockReturnValue(throwError(() => error));

            paramMapSubject.next(convertToParamMap({ id: '789' }));

            expect(spectator.component.version()).toBeUndefined();
        });
    });

    describe('updateLinks method', () => {
        it('should expose updateLinksState$ with empty initial value', () => {
            spectator.detectChanges();

            let emittedValue: Record<string, boolean> | undefined;
            spectator.component.updateLinksState$.subscribe(value => {
                emittedValue = value;
            });

            expect(emittedValue).toEqual({});
        });

        it('should call linksService.getLinkStatuses with given links', () => {
            linksService.getLinkStatuses.mockReturnValue(of({}));
            spectator.detectChanges();

            spectator.component.updateLinks(['link1', 'link2']);

            expect(linksService.getLinkStatuses).toHaveBeenCalledWith(['link1', 'link2']);
        });

        it('should update updateLinksState$ with link statuses', () => {
            const mockStatuses = { link1: true, link2: false };
            linksService.getLinkStatuses.mockReturnValue(of(mockStatuses));
            spectator.detectChanges();

            let emittedValue: Record<string, boolean> | undefined;
            spectator.component.updateLinksState$.subscribe(value => {
                emittedValue = value;
            });

            spectator.component.updateLinks(['link1', 'link2']);

            expect(emittedValue).toEqual(mockStatuses);
        });

        it('should not throw on error from linksService', () => {
            linksService.getLinkStatuses.mockReturnValue(throwError(() => new Error('Network error')));
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
            const draftEditor = spectator.component['draftEditor'] as jest.Mocked<DraftEditorService>;

            spectator.component.contentChanged('updated content');

            expect(draftEditor.onContentChanged).toHaveBeenCalledWith({
                route: '/articles/edit/123',
                title: 'Test Article Title',
                text: 'updated content',
            });
        });

        it('should not call draftEditor.onContentChanged when version is undefined', () => {
            const draftEditor = spectator.component['draftEditor'] as jest.Mocked<DraftEditorService>;
            draftEditor.onContentChanged.mockClear();

            spectator.component.contentChanged('content');

            expect(draftEditor.onContentChanged).not.toHaveBeenCalled();
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

        it('should not save when version is undefined', () => {
            spectator.component.save();

            expect(articleService.saveArticleVersion).not.toHaveBeenCalled();
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
            const draftEditor = spectator.component['draftEditor'] as jest.Mocked<DraftEditorService>;

            spectator.component.save();

            expect(draftEditor.discardDraft).toHaveBeenCalledWith('/articles/edit/123');
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

            const error = new HttpErrorResponse({
                status: 401,
                statusText: 'Unauthorized',
            });
            articleService.saveArticleVersion.mockReturnValue(throwError(() => error));

            spectator.component.save();

            expect(notificationService.error).toHaveBeenCalledWith('Необходима авторизация');
        });

        it('should show error notification on 403 error', () => {
            spectator.detectChanges();
            spectator.component.contentChanged('new content');

            const error = new HttpErrorResponse({
                status: 403,
                statusText: 'Forbidden',
            });
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

            const error = new HttpErrorResponse({
                status: 500,
                statusText: 'Server Error',
            });
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

            const error = new HttpErrorResponse({
                status: 500,
                statusText: 'Server Error',
            });
            articleService.saveArticleVersion.mockReturnValue(throwError(() => error));

            spectator.component.save();

            expect(spectator.component.isSaving()).toBe(false);
        });
    });

    describe('cancel method', () => {
        it('should call confirmDiscardAndNavigate when version exists', () => {
            spectator.detectChanges();
            const draftEditor = spectator.component['draftEditor'] as jest.Mocked<DraftEditorService>;

            spectator.component.cancel();

            expect(draftEditor.confirmDiscardAndNavigate).toHaveBeenCalledWith('/articles/edit/123', [
                '/articles',
                123,
            ]);
        });

        it('should navigate to home when version is undefined', () => {
            spectator.component.cancel();

            expect(router.navigate).toHaveBeenCalledWith(['/']);
        });
    });
});

describe('ArticleEditComponent with invalid ID', () => {
    const createComponentWithInvalidId = createComponentFactory({
        component: ArticleEditComponent,
        mocks: [ArticleService],
        componentProviders: [mockLinksServiceProvider, mockDraftEditorServiceProvider],
        providers: [
            {
                provide: ActivatedRoute,
                useFactory: () => ({
                    paramMap: of(convertToParamMap({ id: 'invalid' })),
                }),
            },
        ],
    });

    it('should show error for non-numeric ID', () => {
        const spectator = createComponentWithInvalidId();

        expect(spectator.component.error()).toBe('Неверный ID версии');
        expect(spectator.component.isLoading()).toBe(false);
    });

    it('should not call articleService for invalid ID', () => {
        const spectator = createComponentWithInvalidId();
        const articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;

        expect(articleService.getArticleVersion).not.toHaveBeenCalled();
    });
});

describe('ArticleEditComponent with negative ID', () => {
    const createComponentWithNegativeId = createComponentFactory({
        component: ArticleEditComponent,
        mocks: [ArticleService],
        componentProviders: [mockLinksServiceProvider, mockDraftEditorServiceProvider],
        providers: [
            {
                provide: ActivatedRoute,
                useFactory: () => ({
                    paramMap: of(convertToParamMap({ id: '-5' })),
                }),
            },
        ],
    });

    it('should show error for negative ID', () => {
        const spectator = createComponentWithNegativeId();

        expect(spectator.component.error()).toBe('Неверный ID версии');
    });
});

describe('ArticleEditComponent with zero ID', () => {
    const createComponentWithZeroId = createComponentFactory({
        component: ArticleEditComponent,
        mocks: [ArticleService],
        componentProviders: [mockLinksServiceProvider, mockDraftEditorServiceProvider],
        providers: [
            {
                provide: ActivatedRoute,
                useFactory: () => ({
                    paramMap: of(convertToParamMap({ id: '0' })),
                }),
            },
        ],
    });

    it('should show error for zero ID', () => {
        const spectator = createComponentWithZeroId();

        expect(spectator.component.error()).toBe('Неверный ID версии');
    });
});

describe('ArticleEditComponent with missing ID', () => {
    const createComponentWithMissingId = createComponentFactory({
        component: ArticleEditComponent,
        mocks: [ArticleService],
        componentProviders: [mockLinksServiceProvider, mockDraftEditorServiceProvider],
        providers: [
            {
                provide: ActivatedRoute,
                useFactory: () => ({
                    paramMap: of(convertToParamMap({})),
                }),
            },
        ],
    });

    it('should show error when ID is missing', () => {
        const spectator = createComponentWithMissingId();

        expect(spectator.component.error()).toBe('Неверный ID версии');
    });
});
