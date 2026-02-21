import { DiffPageDataService } from '../../services/diff-page-data.service';
import { LoggerService, StorageService } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { VersionPairs } from '@drevo-web/shared';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { DiffPageComponent } from './diff-page.component';

const mockVersionPairs: VersionPairs = {
    current: {
        articleId: 1,
        versionId: 200,
        content: 'new content',
        author: 'Author A',
        date: new Date('2025-01-15T14:30:00'),
        title: 'Test Article',
        info: 'Updated text',
        approved: 1,
    },
    previous: {
        articleId: 1,
        versionId: 199,
        content: 'old content',
        author: 'Author B',
        date: new Date('2025-01-14T10:00:00'),
        title: 'Test Article',
        info: '',
        approved: 1,
    },
};

function createMockDataService(
    pairs: VersionPairs | undefined = undefined,
    error?: string
): Partial<DiffPageDataService> {
    return {
        isLoading: signal(false).asReadonly(),
        error: signal(error).asReadonly(),
        versionPairs: signal(pairs).asReadonly(),
    };
}

describe('DiffPageComponent', () => {
    describe('diff type preferences', () => {
        let spectator: Spectator<DiffPageComponent>;
        let storageService: jest.Mocked<StorageService>;

        const createComponent = createComponentFactory({
            component: DiffPageComponent,
            providers: [
                mockLoggerProvider(),
                mockProvider(StorageService),
                {
                    provide: DiffPageDataService,
                    useValue: createMockDataService(),
                },
            ],
            detectChanges: false,
        });

        beforeEach(() => {
            spectator = createComponent();
            storageService = spectator.inject(StorageService) as jest.Mocked<StorageService>;
        });

        it('should create', () => {
            spectator.detectChanges();
            expect(spectator.component).toBeTruthy();
        });

        it('should default to cm when no stored preference', () => {
            storageService.getString.mockReturnValue(undefined);
            spectator.detectChanges();
            expect(spectator.component.diffType()).toBe('cm');
        });

        it('should read stored preference on init', () => {
            storageService.getString.mockReturnValue('jsdiff');
            const s = createComponent();
            s.detectChanges();
            expect(s.component.diffType()).toBe('jsdiff');
        });

        it('should fallback to cm for invalid stored value', () => {
            storageService.getString.mockReturnValue('invalid');
            const s = createComponent();
            s.detectChanges();
            expect(s.component.diffType()).toBe('cm');
        });

        it('should toggle from cm to jsdiff', () => {
            spectator.detectChanges();
            spectator.component.toggleDiffType();
            expect(spectator.component.diffType()).toBe('jsdiff');
        });

        it('should toggle from jsdiff back to cm', () => {
            spectator.detectChanges();
            spectator.component.toggleDiffType();
            spectator.component.toggleDiffType();
            expect(spectator.component.diffType()).toBe('cm');
        });

        it('should save preference to storage on toggle', () => {
            spectator.detectChanges();
            spectator.component.toggleDiffType();
            expect(storageService.setString).toHaveBeenCalledWith('diff-view-type', 'jsdiff');
        });

        it('should log diff type change', () => {
            spectator.detectChanges();
            spectator.component.toggleDiffType();
            const loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
            expect(loggerService.mockLogger.info).toHaveBeenCalledWith('Diff view type changed', { type: 'jsdiff' });
        });
    });

    describe('version info display', () => {
        let spectator: Spectator<DiffPageComponent>;

        const createComponent = createComponentFactory({
            component: DiffPageComponent,
            providers: [
                mockLoggerProvider(),
                mockProvider(StorageService),
                provideRouter([]),
                {
                    provide: DiffPageDataService,
                    useValue: createMockDataService(mockVersionPairs),
                },
            ],
        });

        beforeEach(() => {
            spectator = createComponent();
        });

        it('should display version labels', () => {
            const versions = spectator.query('.diff-page-meta-versions');
            expect(versions).toBeTruthy();

            const labels = spectator.queryAll('app-version-label');
            expect(labels.length).toBe(2);
        });

        it('should display version comment when present', () => {
            const comment = spectator.query('.diff-page-meta-comment');
            expect(comment).toBeTruthy();
            expect(comment?.textContent?.trim()).toBe('Updated text');
        });

        it('should not show error section', () => {
            expect(spectator.query('.diff-page-error')).toBeFalsy();
        });
    });

    describe('version comment hidden when empty', () => {
        const pairsNoComment: VersionPairs = {
            ...mockVersionPairs,
            current: { ...mockVersionPairs.current, info: '' },
        };

        const createComponent = createComponentFactory({
            component: DiffPageComponent,
            providers: [
                mockLoggerProvider(),
                mockProvider(StorageService),
                provideRouter([]),
                {
                    provide: DiffPageDataService,
                    useValue: createMockDataService(pairsNoComment),
                },
            ],
        });

        it('should hide version comment when empty', () => {
            const spectator = createComponent();
            expect(spectator.query('.diff-page-meta-comment')).toBeFalsy();
        });
    });

    describe('error display', () => {
        const createComponent = createComponentFactory({
            component: DiffPageComponent,
            providers: [
                mockLoggerProvider(),
                mockProvider(StorageService),
                {
                    provide: DiffPageDataService,
                    useValue: createMockDataService(undefined, 'Ошибка загрузки данных'),
                },
            ],
        });

        it('should show error message when error is set', () => {
            const spectator = createComponent();

            const errorEl = spectator.query('.diff-page-error p');
            expect(errorEl).toBeTruthy();
            expect(errorEl?.textContent?.trim()).toBe('Ошибка загрузки данных');
        });
    });
});
