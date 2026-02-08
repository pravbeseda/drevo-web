import { HttpErrorResponse } from '@angular/common/http';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
} from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { of, throwError, NEVER, BehaviorSubject } from 'rxjs';
import { ArticleVersion } from '@drevo-web/shared';
import { ArticleService } from '../../services/articles';
import { ArticleComponent } from './article.component';

describe('ArticleComponent', () => {
    let spectator: Spectator<ArticleComponent>;
    let articleService: jest.Mocked<ArticleService>;
    let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
    let fragmentSubject: BehaviorSubject<string | undefined>;
    let dataSubject: BehaviorSubject<Record<string, unknown>>;

    const mockArticle: ArticleVersion = {
        articleId: 123,
        versionId: 456,
        title: 'Test Article Title',
        content: '<p>Test article content</p>',
        author: 'Test Author',
        date: new Date('2024-01-15T10:00:00Z'),
        redirect: false,
        new: false,
        approved: 1,
        info: '',
        comment: '',
    };

    const createComponent = createComponentFactory({
        component: ArticleComponent,
        mocks: [ArticleService],
        providers: [
            provideRouter([]),
            {
                provide: ActivatedRoute,
                useFactory: () => ({
                    paramMap: paramMapSubject.asObservable(),
                    fragment: fragmentSubject.asObservable(),
                    data: dataSubject.asObservable(),
                }),
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        paramMapSubject = new BehaviorSubject(convertToParamMap({ id: '123' }));
        fragmentSubject = new BehaviorSubject<string | undefined>(undefined);
        dataSubject = new BehaviorSubject<Record<string, unknown>>({});
        spectator = createComponent();
        articleService = spectator.inject(
            ArticleService
        ) as jest.Mocked<ArticleService>;
        articleService.getArticle.mockReturnValue(of(mockArticle));
        articleService.getVersionShow.mockReturnValue(of(mockArticle));
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    describe('successful article loading', () => {
        it('should display spinner while loading', () => {
            // Use NEVER to keep observable pending (loading state)
            articleService.getArticle.mockReturnValue(NEVER);
            spectator.detectChanges();

            expect(spectator.component.isLoading()).toBe(true);
            expect(spectator.query('ui-spinner')).toBeTruthy();
            expect(spectator.query('.article')).toBeFalsy();
        });

        it('should load and display article', () => {
            spectator.detectChanges();

            expect(articleService.getArticle).toHaveBeenCalledWith(123);
            expect(spectator.component.article()).toEqual(mockArticle);
            expect(spectator.component.isLoading()).toBe(false);
            expect(spectator.query('.article-title')).toHaveText(
                'Test Article Title'
            );
        });

        it('should render article content as HTML', () => {
            spectator.detectChanges();

            const contentComponent = spectator.query('app-article-content');
            expect(contentComponent).toBeTruthy();
            expect(contentComponent?.innerHTML).toContain(
                '<p>Test article content</p>'
            );
        });

        it('should reload article when route param changes', () => {
            spectator.detectChanges();

            expect(articleService.getArticle).toHaveBeenCalledWith(123);

            const anotherArticle: ArticleVersion = {
                ...mockArticle,
                articleId: 456,
                title: 'Another Article',
            };
            articleService.getArticle.mockReturnValue(of(anotherArticle));

            paramMapSubject.next(convertToParamMap({ id: '456' }));

            expect(articleService.getArticle).toHaveBeenCalledWith(456);
            expect(spectator.component.article()).toEqual(anotherArticle);
        });

        it('should retry loading after error when navigating to same or different article', () => {
            const error = new HttpErrorResponse({
                status: 500,
                statusText: 'Server Error',
            });
            articleService.getArticle.mockReturnValue(throwError(() => error));
            spectator.detectChanges();

            expect(spectator.component.error()).toBe('Ошибка загрузки статьи');

            // Now the server recovers
            articleService.getArticle.mockReturnValue(of(mockArticle));

            // Navigate to another article
            paramMapSubject.next(convertToParamMap({ id: '456' }));

            expect(articleService.getArticle).toHaveBeenCalledWith(456);
            expect(spectator.component.article()).toEqual(mockArticle);
            expect(spectator.component.error()).toBeUndefined();
        });

        it('should not show version banner in article mode', () => {
            spectator.detectChanges();

            expect(
                spectator.query('[data-testid="version-banner"]')
            ).toBeFalsy();
        });
    });

    describe('fragment scrolling', () => {
        let mainContainer: HTMLElement;
        let scrollToMock: jest.Mock;

        beforeEach(() => {
            // Create mock main container
            mainContainer = document.createElement('div');
            mainContainer.id = 'content';
            mainContainer.className = 'main';
            mainContainer.style.overflowY = 'auto';
            mainContainer.style.height = '500px';
            scrollToMock = jest.fn();
            mainContainer.scrollTo = scrollToMock;
            document.body.appendChild(mainContainer);
        });

        afterEach(() => {
            if (document.body.contains(mainContainer)) {
                document.body.removeChild(mainContainer);
            }
        });

        it('should scroll main container to element when fragment is provided', () => {
            const mockElement = document.createElement('div');
            mockElement.id = 'S26';
            mainContainer.appendChild(mockElement);

            // Mock getBoundingClientRect
            jest.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({
                top: 300,
                bottom: 350,
                left: 0,
                right: 100,
                width: 100,
                height: 50,
                x: 0,
                y: 300,
                toJSON: () => ({}),
            });

            jest.spyOn(mainContainer, 'getBoundingClientRect').mockReturnValue({
                top: 100,
                bottom: 600,
                left: 0,
                right: 800,
                width: 800,
                height: 500,
                x: 0,
                y: 100,
                toJSON: () => ({}),
            });

            Object.defineProperty(mainContainer, 'scrollTop', {
                value: 0,
                writable: true,
                configurable: true,
            });

            fragmentSubject.next('S26');
            spectator.detectChanges();

            expect(scrollToMock).toHaveBeenCalledWith({
                top: 200, // 300 - 100 + 0
                behavior: 'smooth',
            });
        });

        it('should not scroll when no fragment is provided', () => {
            const mockElement = document.createElement('div');
            mockElement.id = 'S26';
            mainContainer.appendChild(mockElement);

            fragmentSubject.next(undefined);
            spectator.detectChanges();

            expect(scrollToMock).not.toHaveBeenCalled();
        });

        it('should handle non-existent fragment gracefully', () => {
            fragmentSubject.next('nonexistent');
            spectator.detectChanges();

            expect(scrollToMock).not.toHaveBeenCalled();
        });

        it('should scroll to element with name attribute when id not found', () => {
            const mockAnchor = document.createElement('a');
            mockAnchor.setAttribute('name', 'S26');
            mainContainer.appendChild(mockAnchor);

            // Mock getBoundingClientRect
            jest.spyOn(mockAnchor, 'getBoundingClientRect').mockReturnValue({
                top: 300,
                bottom: 350,
                left: 0,
                right: 100,
                width: 100,
                height: 50,
                x: 0,
                y: 300,
                toJSON: () => ({}),
            });

            jest.spyOn(mainContainer, 'getBoundingClientRect').mockReturnValue({
                top: 100,
                bottom: 600,
                left: 0,
                right: 800,
                width: 800,
                height: 500,
                x: 0,
                y: 100,
                toJSON: () => ({}),
            });

            Object.defineProperty(mainContainer, 'scrollTop', {
                value: 0,
                writable: true,
                configurable: true,
            });

            fragmentSubject.next('S26');
            spectator.detectChanges();

            expect(scrollToMock).toHaveBeenCalledWith({
                top: 200,
                behavior: 'smooth',
            });
        });

        it('should prefer id over name attribute', () => {
            // Create element with name attribute
            const mockAnchor = document.createElement('a');
            mockAnchor.setAttribute('name', 'S26');
            mainContainer.appendChild(mockAnchor);

            // Create element with id
            const mockDiv = document.createElement('div');
            mockDiv.id = 'S26';
            mainContainer.appendChild(mockDiv);

            jest.spyOn(mockDiv, 'getBoundingClientRect').mockReturnValue({
                top: 400,
                bottom: 450,
                left: 0,
                right: 100,
                width: 100,
                height: 50,
                x: 0,
                y: 400,
                toJSON: () => ({}),
            });

            jest.spyOn(mainContainer, 'getBoundingClientRect').mockReturnValue({
                top: 100,
                bottom: 600,
                left: 0,
                right: 800,
                width: 800,
                height: 500,
                x: 0,
                y: 100,
                toJSON: () => ({}),
            });

            Object.defineProperty(mainContainer, 'scrollTop', {
                value: 0,
                writable: true,
                configurable: true,
            });

            fragmentSubject.next('S26');
            spectator.detectChanges();

            // Should scroll to element with id (position 400), not name (position 300)
            expect(scrollToMock).toHaveBeenCalledWith({
                top: 300, // 400 - 100 + 0
                behavior: 'smooth',
            });
        });

        it('should scroll to new fragment when fragment changes', () => {
            const mockElement1 = document.createElement('div');
            mockElement1.id = 'S26';
            mainContainer.appendChild(mockElement1);

            const mockElement2 = document.createElement('div');
            mockElement2.id = 'S30';
            mainContainer.appendChild(mockElement2);

            // Mock getBoundingClientRect for elements
            jest.spyOn(mockElement1, 'getBoundingClientRect').mockReturnValue({
                top: 300,
                bottom: 350,
                left: 0,
                right: 100,
                width: 100,
                height: 50,
                x: 0,
                y: 300,
                toJSON: () => ({}),
            });

            jest.spyOn(mockElement2, 'getBoundingClientRect').mockReturnValue({
                top: 500,
                bottom: 550,
                left: 0,
                right: 100,
                width: 100,
                height: 50,
                x: 0,
                y: 500,
                toJSON: () => ({}),
            });

            jest.spyOn(mainContainer, 'getBoundingClientRect').mockReturnValue({
                top: 100,
                bottom: 600,
                left: 0,
                right: 800,
                width: 800,
                height: 500,
                x: 0,
                y: 100,
                toJSON: () => ({}),
            });

            Object.defineProperty(mainContainer, 'scrollTop', {
                value: 0,
                writable: true,
                configurable: true,
            });

            fragmentSubject.next('S26');
            spectator.detectChanges();

            expect(scrollToMock).toHaveBeenCalledWith({
                top: 200,
                behavior: 'smooth',
            });

            // Change fragment
            fragmentSubject.next('S30');
            spectator.detectChanges();

            expect(scrollToMock).toHaveBeenCalledWith({
                top: 400,
                behavior: 'smooth',
            });
        });

        it('should fallback to scrollIntoView if main container is not found', () => {
            // Remove main container
            document.body.removeChild(mainContainer);

            const mockElement = document.createElement('div');
            mockElement.id = 'S26';
            const scrollIntoViewMock = jest.fn();
            mockElement.scrollIntoView = scrollIntoViewMock;
            document.body.appendChild(mockElement);

            fragmentSubject.next('S26');
            spectator.detectChanges();

            expect(scrollIntoViewMock).toHaveBeenCalledWith({
                behavior: 'smooth',
                block: 'start',
            });

            document.body.removeChild(mockElement);
        });
    });

    describe('error handling', () => {
        it('should display error message when article not found (404)', () => {
            const error = new HttpErrorResponse({
                status: 404,
                statusText: 'Not Found',
            });
            articleService.getArticle.mockReturnValue(throwError(() => error));
            spectator.detectChanges();

            expect(spectator.component.error()).toBe('Статья не найдена');
            expect(spectator.component.isLoading()).toBe(false);
            expect(spectator.query('.error-message')).toHaveText(
                'Статья не найдена'
            );
        });

        it('should display generic error message for other errors', () => {
            const error = new HttpErrorResponse({
                status: 500,
                statusText: 'Server Error',
            });
            articleService.getArticle.mockReturnValue(throwError(() => error));
            spectator.detectChanges();

            expect(spectator.component.error()).toBe('Ошибка загрузки статьи');
        });
    });

    describe('version view mode', () => {
        const mockVersion: ArticleVersion = {
            articleId: 100,
            versionId: 789,
            title: 'Versioned Article',
            content: '<p>Version content</p>',
            author: 'Version Author',
            date: new Date('2024-03-20T12:00:00Z'),
            redirect: false,
            new: false,
            approved: 0,
            info: 'Updated intro',
            comment: '',
        };

        beforeEach(() => {
            dataSubject.next({ isVersionView: true });
            articleService.getVersionShow.mockReturnValue(of(mockVersion));
        });

        it('should call getVersionShow instead of getArticle', () => {
            spectator.detectChanges();

            expect(articleService.getVersionShow).toHaveBeenCalledWith(123);
            expect(articleService.getArticle).not.toHaveBeenCalled();
        });

        it('should show version banner', () => {
            spectator.detectChanges();

            expect(
                spectator.query('[data-testid="version-banner"]')
            ).toBeTruthy();
        });

        it('should display author and info in banner', () => {
            spectator.detectChanges();

            const banner = spectator.query('[data-testid="version-banner"]');
            expect(banner?.textContent).toContain('Version Author');
            expect(banner?.textContent).toContain('Updated intro');
        });

        it('should show link to current article version', () => {
            spectator.detectChanges();

            const link = spectator.query(
                '[data-testid="version-banner"] a'
            ) as HTMLAnchorElement;
            expect(link).toBeTruthy();
            expect(link.textContent).toContain('Перейти к текущей версии');
            expect(link.getAttribute('href')).toBe('/articles/100');
        });

        it('should show version-specific error for invalid ID', () => {
            paramMapSubject.next(convertToParamMap({ id: 'invalid' }));
            spectator.detectChanges();

            expect(spectator.component.error()).toBe('Неверный ID версии');
        });

        it('should show version-specific 404 error', () => {
            const error = new HttpErrorResponse({
                status: 404,
                statusText: 'Not Found',
            });
            articleService.getVersionShow.mockReturnValue(
                throwError(() => error)
            );
            spectator.detectChanges();

            expect(spectator.component.error()).toBe('Версия не найдена');
        });

        it('should show version-specific generic error', () => {
            const error = new HttpErrorResponse({
                status: 500,
                statusText: 'Server Error',
            });
            articleService.getVersionShow.mockReturnValue(
                throwError(() => error)
            );
            spectator.detectChanges();

            expect(spectator.component.error()).toBe('Ошибка загрузки версии');
        });
    });
});

describe('ArticleComponent with invalid ID', () => {
    const createComponentWithInvalidId = createComponentFactory({
        component: ArticleComponent,
        mocks: [ArticleService],
        providers: [
            provideRouter([]),
            {
                provide: ActivatedRoute,
                useFactory: () => ({
                    paramMap: of(convertToParamMap({ id: 'invalid' })),
                    fragment: of(undefined),
                    data: of({}),
                }),
            },
        ],
    });

    it('should show error for non-numeric ID', () => {
        const spectator = createComponentWithInvalidId();

        expect(spectator.component.error()).toBe('Неверный ID статьи');
        expect(spectator.component.isLoading()).toBe(false);
    });
});

describe('ArticleComponent with negative ID', () => {
    const createComponentWithNegativeId = createComponentFactory({
        component: ArticleComponent,
        mocks: [ArticleService],
        providers: [
            provideRouter([]),
            {
                provide: ActivatedRoute,
                useFactory: () => ({
                    paramMap: of(convertToParamMap({ id: '-5' })),
                    fragment: of(undefined),
                    data: of({}),
                }),
            },
        ],
    });

    it('should show error for negative ID', () => {
        const spectator = createComponentWithNegativeId();

        expect(spectator.component.error()).toBe('Неверный ID статьи');
    });
});

describe('ArticleComponent with zero ID', () => {
    const createComponentWithZeroId = createComponentFactory({
        component: ArticleComponent,
        mocks: [ArticleService],
        providers: [
            provideRouter([]),
            {
                provide: ActivatedRoute,
                useFactory: () => ({
                    paramMap: of(convertToParamMap({ id: '0' })),
                    fragment: of(undefined),
                    data: of({}),
                }),
            },
        ],
    });

    it('should show error for zero ID', () => {
        const spectator = createComponentWithZeroId();

        expect(spectator.component.error()).toBe('Неверный ID статьи');
    });
});
