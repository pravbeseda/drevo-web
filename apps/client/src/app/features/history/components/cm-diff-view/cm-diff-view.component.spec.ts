import { CmDiffViewComponent } from './cm-diff-view.component';
import { DiffPageDataService } from '../../services/diff-page-data.service';
import { ArticleService } from '../../../../services/articles/article.service';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { VersionPairs } from '@drevo-web/shared';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { NEVER, of, throwError } from 'rxjs';

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

describe('CmDiffViewComponent', () => {
    let spectator: Spectator<CmDiffViewComponent>;
    let articleService: jest.Mocked<ArticleService>;

    const createComponent = createComponentFactory({
        component: CmDiffViewComponent,
        mocks: [ArticleService],
        providers: [
            mockLoggerProvider(),
            DiffPageDataService,
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
        spectator.component.data.loadFromRoute();
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    describe('loading state', () => {
        it('should show spinner while loading', () => {
            articleService.getVersionPairs.mockReturnValue(NEVER);
            spectator.component.data.loadFromRoute();
            spectator.detectChanges();

            expect(spectator.query('[data-testid="loading"]')).toBeTruthy();
            expect(spectator.query('ui-spinner')).toBeTruthy();
        });

        it('should hide spinner after data loads', () => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.component.data.loadFromRoute();
            spectator.detectChanges();

            expect(spectator.query('[data-testid="loading"]')).toBeFalsy();
        });
    });

    describe('data display', () => {
        beforeEach(() => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.component.data.loadFromRoute();
            spectator.detectChanges();
        });

        it('should display article title', () => {
            const titleEl = spectator.query('.cm-diff-page-meta-title span');
            expect(titleEl?.textContent?.trim()).toBe('Test Article');
        });

        it('should display version details', () => {
            const versionInfo = spectator.query('[data-testid="version-info"]');
            expect(versionInfo).toBeTruthy();
            expect(versionInfo?.textContent).toContain('199');
            expect(versionInfo?.textContent).toContain('200');
            expect(versionInfo?.textContent).toContain('Author A');
            expect(versionInfo?.textContent).toContain('Author B');
        });

        it('should display version comment when present', () => {
            const comment = spectator.query('[data-testid="version-comment"]');
            expect(comment).toBeTruthy();
            expect(comment?.textContent?.trim()).toBe('Updated text');
        });

        it('should hide version comment when empty', () => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairsNoComment));
            const s = createComponent();
            const as = s.inject(ArticleService) as jest.Mocked<ArticleService>;
            as.getVersionPairs.mockReturnValue(of(mockVersionPairsNoComment));
            s.component.data.loadFromRoute();
            s.detectChanges();

            expect(s.query('[data-testid="version-comment"]')).toBeFalsy();
        });
    });

    describe('error handling', () => {
        it('should show "no previous version" error', () => {
            articleService.getVersionPairs.mockReturnValue(
                throwError(() => ({
                    error: { errorCode: 'NO_PREVIOUS_VERSION' },
                })),
            );
            spectator.component.data.loadFromRoute();
            spectator.detectChanges();

            expect(spectator.component.data.error()).toBe('Предыдущая версия не найдена');
            const errorEl = spectator.query('[data-testid="error-message"]');
            expect(errorEl?.textContent?.trim()).toBe('Предыдущая версия не найдена');
        });

        it('should show generic error on API failure', () => {
            articleService.getVersionPairs.mockReturnValue(throwError(() => ({ error: { errorCode: 'UNKNOWN' } })));
            spectator.component.data.loadFromRoute();
            spectator.detectChanges();

            expect(spectator.component.data.error()).toBe('Ошибка загрузки данных');
        });

        it('should log error on API failure', () => {
            articleService.getVersionPairs.mockReturnValue(throwError(() => ({ error: { errorCode: 'UNKNOWN' } })));
            spectator.component.data.loadFromRoute();
            spectator.detectChanges();

            const loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
            expect(loggerService.mockLogger.error).toHaveBeenCalledWith(
                'Failed to load version pairs',
                expect.anything(),
            );
        });

        it('should not show error section when no error', () => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.component.data.loadFromRoute();
            spectator.detectChanges();

            expect(spectator.query('[data-testid="error"]')).toBeFalsy();
        });
    });

    describe('view mode toggle', () => {
        beforeEach(() => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.component.data.loadFromRoute();
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
        it('should register sidebar actions when data is loaded', () => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.component.data.loadFromRoute();
            spectator.detectChanges();

            const actions = spectator.queryAll('ui-sidebar-action');
            expect(actions.length).toBeGreaterThanOrEqual(3);
        });

        it('should not throw when goToNext is called without editor', () => {
            articleService.getVersionPairs.mockReturnValue(NEVER);
            spectator.component.data.loadFromRoute();
            spectator.detectChanges();

            expect(() => spectator.component.goToNext()).not.toThrow();
        });

        it('should not throw when goToPrevious is called without editor', () => {
            articleService.getVersionPairs.mockReturnValue(NEVER);
            spectator.component.data.loadFromRoute();
            spectator.detectChanges();

            expect(() => spectator.component.goToPrevious()).not.toThrow();
        });
    });

    describe('cleanup', () => {
        it('should destroy editor view on component destroy', () => {
            articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
            spectator.component.data.loadFromRoute();
            spectator.detectChanges();

            expect(() => spectator.fixture.destroy()).not.toThrow();
        });
    });
});
