import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError, NEVER, BehaviorSubject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ArticleEditComponent } from './article-edit.component';
import { ArticleService } from '../../services/articles';
import { ArticleVersion } from '@drevo-web/shared';

describe('ArticleEditComponent', () => {
    let spectator: Spectator<ArticleEditComponent>;
    let articleService: jest.Mocked<ArticleService>;
    let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

    const mockVersion: ArticleVersion = {
        articleId: 123,
        versionId: 456,
        title: 'Test Article Title',
        content: '<p>Test article content</p>',
        author: 'Test Author',
        date: new Date('2024-01-15T10:00:00Z'),
        redirect: false,
        approved: true,
        info: 'Test info',
        editor: 'Test Editor',
        edited: new Date('2024-01-16T10:00:00Z'),
        comment: 'Test comment',
    };

    const createComponent = createComponentFactory({
        component: ArticleEditComponent,
        mocks: [ArticleService],
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
        articleService = spectator.inject(
            ArticleService
        ) as jest.Mocked<ArticleService>;
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
            expect(spectator.query('.article-edit-title')).toHaveText(
                'Test Article Title'
            );
        });

        it('should render editor component with version content', () => {
            spectator.detectChanges();

            const editorComponent = spectator.query('lib-editor');
            expect(editorComponent).toBeTruthy();
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
            expect(spectator.query('.error-message')).toHaveText(
                'Версия не найдена'
            );
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
        it('should expose updateLinksState$ observable', () => {
            spectator.detectChanges();

            let emittedValue: Record<string, boolean> | undefined;
            spectator.component.updateLinksState$.subscribe(value => {
                emittedValue = value;
            });

            expect(emittedValue).toEqual({});
        });

        it('should accept links array without throwing', () => {
            spectator.detectChanges();

            expect(() => {
                spectator.component.updateLinks(['link1', 'link2']);
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
    });
});

describe('ArticleEditComponent with invalid ID', () => {
    const createComponentWithInvalidId = createComponentFactory({
        component: ArticleEditComponent,
        mocks: [ArticleService],
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
        const articleService = spectator.inject(
            ArticleService
        ) as jest.Mocked<ArticleService>;

        expect(articleService.getArticleVersion).not.toHaveBeenCalled();
    });
});

describe('ArticleEditComponent with negative ID', () => {
    const createComponentWithNegativeId = createComponentFactory({
        component: ArticleEditComponent,
        mocks: [ArticleService],
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
