import { AuthService } from '../../../services/auth/auth.service';
import { VersionForModeration } from '../../models/version-for-moderation.model';
import { SidebarActionComponent } from '../sidebar-action/sidebar-action.component';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { SidebarService } from '@drevo-web/core';
import { ApprovalStatus, ModerationResult } from '@drevo-web/shared';
import { SidePanelComponent } from '@drevo-web/ui';
import { of } from 'rxjs';
import { ModerationSidebarActionComponent } from './moderation-sidebar-action.component';

const mockVersion: VersionForModeration = {
    versionId: 200,
    author: 'Author A',
    date: new Date('2025-01-15T14:30:00'),
    approved: ApprovalStatus.Pending,
    comment: '',
};

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

describe('ModerationSidebarActionComponent', () => {
    describe('moderator user', () => {
        let spectator: Spectator<ModerationSidebarActionComponent>;

        const createComponent = createComponentFactory({
            component: ModerationSidebarActionComponent,
            providers: [
                mockProvider(SidebarService),
                {
                    provide: AuthService,
                    useValue: { user$: of(mockModeratorUser) },
                },
            ],
            detectChanges: false,
        });

        beforeEach(() => {
            spectator = createComponent({ props: { version: mockVersion } });
        });

        it('should create', () => {
            spectator.detectChanges();
            expect(spectator.component).toBeTruthy();
        });

        it('should set canModerate to true', () => {
            spectator.detectChanges();
            expect(spectator.component.canModerate()).toBe(true);
        });

        it('should render sidebar action', () => {
            spectator.detectChanges();
            expect(spectator.query(SidebarActionComponent)).toBeTruthy();
        });

        it('should render side panel', () => {
            spectator.detectChanges();
            expect(spectator.query(SidePanelComponent)).toBeTruthy();
        });

        describe('icon and label computation', () => {
            it('should show pending icon and label', () => {
                spectator.detectChanges();
                expect(spectator.component.moderationIcon()).toBe('schedule');
                expect(spectator.component.moderationLabel()).toBe('Модерация: На проверке');
            });

            it('should show approved icon and label', () => {
                spectator.setInput('version', { ...mockVersion, approved: ApprovalStatus.Approved });
                spectator.detectChanges();
                expect(spectator.component.moderationIcon()).toBe('check_circle');
                expect(spectator.component.moderationLabel()).toBe('Модерация: Одобрено');
            });

            it('should show rejected icon and label', () => {
                spectator.setInput('version', { ...mockVersion, approved: ApprovalStatus.Rejected });
                spectator.detectChanges();
                expect(spectator.component.moderationIcon()).toBe('cancel');
                expect(spectator.component.moderationLabel()).toBe('Модерация: Отклонено');
            });

            it('should update icon when version input changes', () => {
                spectator.detectChanges();
                expect(spectator.component.moderationIcon()).toBe('schedule');

                spectator.setInput('version', { ...mockVersion, approved: ApprovalStatus.Approved });
                expect(spectator.component.moderationIcon()).toBe('check_circle');
            });
        });

        describe('sidebar action bindings', () => {
            it('should pass icon to sidebar action', () => {
                spectator.detectChanges();
                const action = spectator.query(SidebarActionComponent);
                expect(action?.icon()).toBe('schedule');
            });

            it('should pass label to sidebar action', () => {
                spectator.detectChanges();
                const action = spectator.query(SidebarActionComponent);
                expect(action?.label()).toBe('Модерация: На проверке');
            });

            it('should pass disabled=false by default', () => {
                spectator.detectChanges();
                const action = spectator.query(SidebarActionComponent);
                expect(action?.disabled()).toBe(false);
            });

            it('should pass disabled=true when set', () => {
                spectator.setInput('disabled', true);
                spectator.detectChanges();
                const action = spectator.query(SidebarActionComponent);
                expect(action?.disabled()).toBe(true);
            });
        });

        describe('panel toggle', () => {
            it('should start with panel closed', () => {
                spectator.detectChanges();
                expect(spectator.component.isPanelOpen()).toBe(false);
            });

            it('should open panel on toggle', () => {
                spectator.detectChanges();
                spectator.component.togglePanel();
                expect(spectator.component.isPanelOpen()).toBe(true);
            });

            it('should close panel on second toggle', () => {
                spectator.detectChanges();
                spectator.component.togglePanel();
                spectator.component.togglePanel();
                expect(spectator.component.isPanelOpen()).toBe(false);
            });

            it('should close panel via closePanel', () => {
                spectator.detectChanges();
                spectator.component.togglePanel();
                spectator.component.closePanel();
                expect(spectator.component.isPanelOpen()).toBe(false);
            });

            it('should pass open state to side panel', () => {
                spectator.detectChanges();
                const panel = spectator.query(SidePanelComponent);
                expect(panel?.open()).toBe(false);

                spectator.component.togglePanel();
                spectator.detectChanges();
                expect(panel?.open()).toBe(true);
            });
        });

        describe('onModerated', () => {
            const result: ModerationResult = {
                versionId: 200,
                articleId: 1,
                approved: ApprovalStatus.Approved,
                comment: 'Looks good',
            };

            it('should close panel', () => {
                spectator.detectChanges();
                spectator.component.togglePanel();
                expect(spectator.component.isPanelOpen()).toBe(true);

                spectator.component.onModerated(result);
                expect(spectator.component.isPanelOpen()).toBe(false);
            });

            it('should emit moderated event', () => {
                spectator.detectChanges();
                const spy = jest.fn();
                spectator.component.moderated.subscribe(spy);

                spectator.component.onModerated(result);

                expect(spy).toHaveBeenCalledWith(result);
            });

            it('should emit moderated event only once', () => {
                spectator.detectChanges();
                const spy = jest.fn();
                spectator.component.moderated.subscribe(spy);

                spectator.component.onModerated(result);

                expect(spy).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('regular user', () => {
        const createComponent = createComponentFactory({
            component: ModerationSidebarActionComponent,
            providers: [
                mockProvider(SidebarService),
                {
                    provide: AuthService,
                    useValue: { user$: of(mockRegularUser) },
                },
            ],
            detectChanges: false,
        });

        it('should set canModerate to false', () => {
            const spectator = createComponent({ props: { version: mockVersion } });
            spectator.detectChanges();
            expect(spectator.component.canModerate()).toBe(false);
        });

        it('should not render sidebar action', () => {
            const spectator = createComponent({ props: { version: mockVersion } });
            spectator.detectChanges();
            expect(spectator.query(SidebarActionComponent)).toBeFalsy();
        });

        it('should not render side panel', () => {
            const spectator = createComponent({ props: { version: mockVersion } });
            spectator.detectChanges();
            expect(spectator.query(SidePanelComponent)).toBeFalsy();
        });
    });

    describe('no user', () => {
        const createComponent = createComponentFactory({
            component: ModerationSidebarActionComponent,
            providers: [
                mockProvider(SidebarService),
                {
                    provide: AuthService,
                    useValue: { user$: of(undefined) },
                },
            ],
            detectChanges: false,
        });

        it('should set canModerate to false when no user', () => {
            const spectator = createComponent({ props: { version: mockVersion } });
            spectator.detectChanges();
            expect(spectator.component.canModerate()).toBe(false);
        });

        it('should not render sidebar action when no user', () => {
            const spectator = createComponent({ props: { version: mockVersion } });
            spectator.detectChanges();
            expect(spectator.query(SidebarActionComponent)).toBeFalsy();
        });
    });
});
