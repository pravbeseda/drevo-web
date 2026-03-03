import { LoggerService } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { CmDiffViewComponent } from './cm-diff-view.component';

describe('CmDiffViewComponent', () => {
    let spectator: Spectator<CmDiffViewComponent>;

    const createComponent = createComponentFactory({
        component: CmDiffViewComponent,
        providers: [mockLoggerProvider()],
        detectChanges: false,
    });

    beforeEach(() => {
        spectator = createComponent({
            props: {
                oldText: 'old content',
                newText: 'new content',
            },
        });
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
