import { ArticleService } from '../../../../../services/articles/article.service';
import { CmDiffPageComponent } from './cm-diff-page.component';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { VersionPairs } from '@drevo-web/shared';
import { LoggerService } from '@drevo-web/core';

const mockVersionPairs: VersionPairs = {
    current: {
        versionId: 200,
        content: 'new content',
        author: 'Author A',
        date: new Date('2025-01-15T14:30:00'),
        title: 'Test Article',
        info: 'Updated text',
    },
    previous: {
        versionId: 199,
        content: 'old content',
        author: 'Author B',
        date: new Date('2025-01-14T10:00:00'),
        title: 'Test Article',
        info: '',
    },
};

const mockVersionPairsNoComment: VersionPairs = {
    ...mockVersionPairs,
    current: {
        ...mockVersionPairs.current,
        info: '',
    },
};

describe('CmDiffPageComponent', () => {
    let spectator: Spectator<CmDiffPageComponent>;
    let articleService: jest.Mocked<ArticleService>;

    const createComponent = createComponentFactory({
        component: CmDiffPageComponent,
        mocks: [ArticleService],
        providers: [
            mockLoggerProvider(),
            {
                provide: ActivatedRoute,
                useValue: {
                    snapshot: {
                        paramMap: convertToParamMap({ id: '200' }),
                    },
                },
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        spectator = createComponent();
        articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
    });

    it('should create', () => {
        articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    describe('loading state', () => {
        it('should show spinner while loading', () => {
            articleService.getVersionPairs.mockReturnValue(NEVER);
            spectator.detectChanges();

            expect(spectator.query('[data-testid="loading"]')).toBeTruthy();
            expect(spectator.query('ui-spinner')).toBeTruthy();
        });

        it('should hide spinner after data loads', () => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.detectChanges();

            expect(spectator.query('[data-testid="loading"]')).toBeFalsy();
        });
    });

    describe('data loading', () => {
        it('should load version pairs with single ID on init', () => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.detectChanges();

            expect(articleService.getVersionPairs).toHaveBeenCalledWith(200, undefined);
        });

        it('should display version info after loading', () => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.detectChanges();

            expect(spectator.component.data.isLoading()).toBe(false);
            expect(spectator.component.data.versionInfo()).toBeTruthy();
            expect(spectator.component.data.versionInfo()?.title).toBe('Test Article');
        });

        it('should display article title', () => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.detectChanges();

            const titleEl = spectator.query('.cm-diff-page-meta-title span');
            expect(titleEl?.textContent?.trim()).toBe('Test Article');
        });

        it('should display version details', () => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.detectChanges();

            const versionInfo = spectator.query('[data-testid="version-info"]');
            expect(versionInfo).toBeTruthy();
            expect(versionInfo?.textContent).toContain('199');
            expect(versionInfo?.textContent).toContain('200');
            expect(versionInfo?.textContent).toContain('Author A');
            expect(versionInfo?.textContent).toContain('Author B');
        });

        it('should display version comment when present', () => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.detectChanges();

            const comment = spectator.query('[data-testid="version-comment"]');
            expect(comment).toBeTruthy();
            expect(comment?.textContent?.trim()).toBe('Updated text');
        });

        it('should hide version comment when empty', () => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairsNoComment));
            spectator.detectChanges();

            expect(spectator.query('[data-testid="version-comment"]')).toBeFalsy();
        });
    });

    describe('error handling', () => {
        it('should show "no previous version" error', () => {
            articleService.getVersionPairs.mockReturnValue(
                throwError(() => ({
                    error: { errorCode: 'NO_PREVIOUS_VERSION' },
                }))
            );
            spectator.detectChanges();

            expect(spectator.component.data.error()).toBe('Предыдущая версия не найдена');
            const errorEl = spectator.query('[data-testid="error-message"]');
            expect(errorEl?.textContent?.trim()).toBe('Предыдущая версия не найдена');
        });

        it('should show generic error on API failure', () => {
            articleService.getVersionPairs.mockReturnValue(throwError(() => ({ error: { errorCode: 'UNKNOWN' } })));
            spectator.detectChanges();

            expect(spectator.component.data.error()).toBe('Ошибка загрузки данных');
        });

        it('should log error on API failure', () => {
            articleService.getVersionPairs.mockReturnValue(throwError(() => ({ error: { errorCode: 'UNKNOWN' } })));
            spectator.detectChanges();

            const loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
            expect(loggerService.mockLogger.error).toHaveBeenCalledWith(
                'Failed to load version pairs',
                expect.anything()
            );
        });

        it('should not show error section when no error', () => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.detectChanges();

            expect(spectator.query('[data-testid="error"]')).toBeFalsy();
        });
    });

    describe('view mode toggle', () => {
        beforeEach(() => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.detectChanges();
        });

        it('should start in unified mode', () => {
            expect(spectator.component.viewMode()).toBe('unified');
        });

        it('should toggle to side-by-side mode', () => {
            spectator.component.toggleViewMode();
            expect(spectator.component.viewMode()).toBe('side-by-side');
        });

        it('should toggle back to unified mode', () => {
            spectator.component.toggleViewMode();
            spectator.component.toggleViewMode();
            expect(spectator.component.viewMode()).toBe('unified');
        });

        it('should log view mode change', () => {
            spectator.component.toggleViewMode();

            const loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
            expect(loggerService.mockLogger.info).toHaveBeenCalledWith('View mode changed', {
                mode: 'side-by-side',
            });
        });
    });

    describe('navigation buttons', () => {
        it('should render navigation buttons', () => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.detectChanges();

            expect(spectator.query('[data-testid="prev-change-button"]')).toBeTruthy();
            expect(spectator.query('[data-testid="next-change-button"]')).toBeTruthy();
            expect(spectator.query('[data-testid="toggle-view-button"]')).toBeTruthy();
        });
    });

    describe('versionInfo computed', () => {
        it('should return undefined when no version pairs', () => {
            articleService.getVersionPairs.mockReturnValue(NEVER);
            spectator.detectChanges();

            expect(spectator.component.data.versionInfo()).toBeUndefined();
        });

        it('should return version info with correct structure', () => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.detectChanges();

            const info = spectator.component.data.versionInfo();
            expect(info).toEqual({
                title: 'Test Article',
                previous: mockVersionPairs.previous,
                current: mockVersionPairs.current,
            });
        });
    });

    describe('cleanup', () => {
        it('should destroy editor view on component destroy', () => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.detectChanges();

            expect(() => spectator.fixture.destroy()).not.toThrow();
        });
    });
});

describe('CmDiffPageComponent (two-param route)', () => {
    let spectator: Spectator<CmDiffPageComponent>;
    let articleService: jest.Mocked<ArticleService>;

    const createComponent = createComponentFactory({
        component: CmDiffPageComponent,
        mocks: [ArticleService],
        providers: [
            mockLoggerProvider(),
            {
                provide: ActivatedRoute,
                useValue: {
                    snapshot: {
                        paramMap: convertToParamMap({ id1: '100', id2: '200' }),
                    },
                },
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        spectator = createComponent();
        articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
    });

    it('should load version pairs with both IDs sorted (newer first, older second)', () => {
        articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
        spectator.detectChanges();
        expect(articleService.getVersionPairs).toHaveBeenCalledWith(200, 100);
    });

    it('should handle reversed order of IDs', () => {
        articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
        spectator.detectChanges();

        // Even though id1=100 and id2=200, it should sort them: newer=200, older=100
        expect(articleService.getVersionPairs).toHaveBeenCalledWith(200, 100);
    });
});

describe('CmDiffPageComponent (invalid second param)', () => {
    let spectator: Spectator<CmDiffPageComponent>;

    const createComponent = createComponentFactory({
        component: CmDiffPageComponent,
        mocks: [ArticleService],
        providers: [
            mockLoggerProvider(),
            {
                provide: ActivatedRoute,
                useValue: {
                    snapshot: {
                        paramMap: convertToParamMap({ id1: '100', id2: 'abc' }),
                    },
                },
            },
        ],
        detectChanges: false,
    });

    it('should show error for invalid second version ID', () => {
        spectator = createComponent();
        spectator.detectChanges();

        expect(spectator.component.data.error()).toBe('Неверный ID версии');
        expect(spectator.component.data.isLoading()).toBe(false);
    });
});

describe('CmDiffPageComponent (invalid version ID)', () => {
    let spectator: Spectator<CmDiffPageComponent>;

    const createComponent = createComponentFactory({
        component: CmDiffPageComponent,
        mocks: [ArticleService],
        providers: [
            mockLoggerProvider(),
            {
                provide: ActivatedRoute,
                useValue: {
                    snapshot: {
                        paramMap: convertToParamMap({ id: 'abc' }),
                    },
                },
            },
        ],
        detectChanges: false,
    });

    it('should show error for non-numeric version ID', () => {
        spectator = createComponent();
        spectator.detectChanges();

        expect(spectator.component.data.error()).toBe('Неверный ID версии');
        expect(spectator.component.data.isLoading()).toBe(false);
    });
});

describe('CmDiffPageComponent (zero version ID)', () => {
    let spectator: Spectator<CmDiffPageComponent>;

    const createComponent = createComponentFactory({
        component: CmDiffPageComponent,
        mocks: [ArticleService],
        providers: [
            mockLoggerProvider(),
            {
                provide: ActivatedRoute,
                useValue: {
                    snapshot: {
                        paramMap: convertToParamMap({ id: '0' }),
                    },
                },
            },
        ],
        detectChanges: false,
    });

    it('should show error for zero version ID', () => {
        spectator = createComponent();
        spectator.detectChanges();

        expect(spectator.component.data.error()).toBe('Неверный ID версии');
    });
});

describe('CmDiffPageComponent (negative version ID)', () => {
    let spectator: Spectator<CmDiffPageComponent>;

    const createComponent = createComponentFactory({
        component: CmDiffPageComponent,
        mocks: [ArticleService],
        providers: [
            mockLoggerProvider(),
            {
                provide: ActivatedRoute,
                useValue: {
                    snapshot: {
                        paramMap: convertToParamMap({ id: '-5' }),
                    },
                },
            },
        ],
        detectChanges: false,
    });

    it('should show error for negative version ID', () => {
        spectator = createComponent();
        spectator.detectChanges();

        expect(spectator.component.data.error()).toBe('Неверный ID версии');
    });
});
