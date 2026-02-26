import { AuthService } from '../../../../services/auth/auth.service';
import { DiffPageDataService } from '../../services/diff-page-data.service';
import { LoggerService, StorageService } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { ApprovalStatus, VersionPairs } from '@drevo-web/shared';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
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
        updateCurrentApproval: jest.fn(),
    };
}

const mockModeratorUser = {
    id: 1,
    login: 'moderator',
    name: 'Moderator',
    email: 'mod@test.com',
    role: 'moderator' as const,
    permissions: { canEdit: true, canModerate: true, canAdmin: false },
};

const mockRegularUser = {
    id: 2,
    login: 'user',
    name: 'User',
    email: 'user@test.com',
    role: 'user' as const,
    permissions: { canEdit: true, canModerate: false, canAdmin: false },
};

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

    describe('moderation — moderator user', () => {
        let spectator: Spectator<DiffPageComponent>;
        let dataService: Partial<DiffPageDataService>;

        const createComponent = createComponentFactory({
            component: DiffPageComponent,
            providers: [
                mockLoggerProvider(),
                mockProvider(StorageService),
                provideRouter([]),
                {
                    provide: AuthService,
                    useValue: { user$: of(mockModeratorUser) },
                },
            ],
            detectChanges: false,
        });

        it('should set canModerate to true for moderator', () => {
            dataService = createMockDataService(mockVersionPairs);
            spectator = createComponent({ providers: [{ provide: DiffPageDataService, useValue: dataService }] });
            spectator.detectChanges();
            expect(spectator.component.canModerate()).toBe(true);
        });

        it('should compute moderationIcon based on current approval', () => {
            dataService = createMockDataService(mockVersionPairs);
            spectator = createComponent({ providers: [{ provide: DiffPageDataService, useValue: dataService }] });
            spectator.detectChanges();
            expect(spectator.component.moderationIcon()).toBe('check_circle');
        });

        it('should compute moderationLabel based on current approval', () => {
            dataService = createMockDataService(mockVersionPairs);
            spectator = createComponent({ providers: [{ provide: DiffPageDataService, useValue: dataService }] });
            spectator.detectChanges();
            expect(spectator.component.moderationLabel()).toBe('Одобрено');
        });

        it('should return schedule icon when no pairs', () => {
            dataService = createMockDataService(undefined);
            spectator = createComponent({ providers: [{ provide: DiffPageDataService, useValue: dataService }] });
            spectator.detectChanges();
            expect(spectator.component.moderationIcon()).toBe('schedule');
        });

        it('should enable moderation when previous version is approved', () => {
            dataService = createMockDataService(mockVersionPairs);
            spectator = createComponent({ providers: [{ provide: DiffPageDataService, useValue: dataService }] });
            spectator.detectChanges();
            expect(spectator.component.isModerationEnabled()).toBe(true);
        });

        it('should disable moderation when previous version is not approved', () => {
            const pairs: VersionPairs = {
                ...mockVersionPairs,
                previous: { ...mockVersionPairs.previous, approved: ApprovalStatus.Pending },
            };
            dataService = createMockDataService(pairs);
            spectator = createComponent({ providers: [{ provide: DiffPageDataService, useValue: dataService }] });
            spectator.detectChanges();
            expect(spectator.component.isModerationEnabled()).toBe(false);
        });

        it('should toggle moderation panel', () => {
            dataService = createMockDataService(mockVersionPairs);
            spectator = createComponent({ providers: [{ provide: DiffPageDataService, useValue: dataService }] });
            spectator.detectChanges();
            expect(spectator.component.isModerationPanelOpen()).toBe(false);
            spectator.component.toggleModerationPanel();
            expect(spectator.component.isModerationPanelOpen()).toBe(true);
            spectator.component.toggleModerationPanel();
            expect(spectator.component.isModerationPanelOpen()).toBe(false);
        });

        it('should close moderation panel', () => {
            dataService = createMockDataService(mockVersionPairs);
            spectator = createComponent({ providers: [{ provide: DiffPageDataService, useValue: dataService }] });
            spectator.detectChanges();
            spectator.component.toggleModerationPanel();
            spectator.component.closeModerationPanel();
            expect(spectator.component.isModerationPanelOpen()).toBe(false);
        });

        it('should update approval and close panel on moderated', () => {
            dataService = createMockDataService(mockVersionPairs);
            spectator = createComponent({ providers: [{ provide: DiffPageDataService, useValue: dataService }] });
            spectator.detectChanges();
            spectator.component.toggleModerationPanel();

            spectator.component.onModerated({
                versionId: 200,
                articleId: 1,
                approved: ApprovalStatus.Rejected,
                comment: 'Needs revision',
            });

            expect(dataService.updateCurrentApproval).toHaveBeenCalledWith(ApprovalStatus.Rejected, 'Needs revision');
            expect(spectator.component.isModerationPanelOpen()).toBe(false);
        });
    });

    describe('moderation — regular user', () => {
        const createComponent = createComponentFactory({
            component: DiffPageComponent,
            providers: [
                mockLoggerProvider(),
                mockProvider(StorageService),
                provideRouter([]),
                {
                    provide: AuthService,
                    useValue: { user$: of(mockRegularUser) },
                },
                {
                    provide: DiffPageDataService,
                    useValue: createMockDataService(mockVersionPairs),
                },
            ],
        });

        it('should set canModerate to false for regular user', () => {
            const spectator = createComponent();
            expect(spectator.component.canModerate()).toBe(false);
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
