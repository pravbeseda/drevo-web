import { LoggerService } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { VersionPairs } from '@drevo-web/shared';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { DiffPageDataService } from '../../services/diff-page-data.service';
import { CmDiffViewComponent } from './cm-diff-view.component';

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

function createMockDataService(
    pairs: VersionPairs | undefined = mockVersionPairs,
    error?: string
): Partial<DiffPageDataService> {
    return {
        isLoading: signal(false).asReadonly(),
        error: signal(error).asReadonly(),
        versionPairs: signal(pairs).asReadonly(),
    };
}

describe('CmDiffViewComponent', () => {
    let spectator: Spectator<CmDiffViewComponent>;

    const createComponent = createComponentFactory({
        component: CmDiffViewComponent,
        providers: [
            mockLoggerProvider(),
            {
                provide: DiffPageDataService,
                useValue: createMockDataService(),
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    describe('view mode toggle', () => {
        beforeEach(() => {
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
            spectator.detectChanges();

            const actions = spectator.queryAll('app-sidebar-action');
            expect(actions.length).toBeGreaterThanOrEqual(3);
        });

        it('should not throw when goToNext is called without editor', () => {
            spectator.detectChanges();
            expect(() => spectator.component.goToNext()).not.toThrow();
        });

        it('should not throw when goToPrevious is called without editor', () => {
            spectator.detectChanges();
            expect(() => spectator.component.goToPrevious()).not.toThrow();
        });
    });

    describe('cleanup', () => {
        it('should destroy editor view on component destroy', () => {
            spectator.detectChanges();
            expect(() => spectator.fixture.destroy()).not.toThrow();
        });
    });
});
