import { CancelVersionService } from '../../../services/articles/cancel-version.service';
import { AuthService } from '../../../services/auth/auth.service';
import { VersionForModeration } from '../../models/version-for-moderation.model';
import { SidebarActionComponent } from '../sidebar-action/sidebar-action.component';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { SidebarService } from '@drevo-web/core';
import { ApprovalStatus, CancelVersionResult } from '@drevo-web/shared';
import { EMPTY, of } from 'rxjs';
import { CancelVersionSidebarActionComponent } from './cancel-version-sidebar-action.component';

const mockVersion: VersionForModeration = {
    versionId: 789,
    author: 'Author Name',
    date: new Date('2025-01-15T14:30:00'),
    approved: ApprovalStatus.Pending,
    comment: '',
};

const mockAuthorUser = {
    id: 1,
    login: 'author1',
    name: 'Author Name',
    email: 'a@test.com',
    role: 'user' as const,
    permissions: { canEdit: true, canModerate: false, canAdmin: false },
};

const mockOtherUser = {
    id: 2,
    login: 'someoneElse',
    name: 'Other Name',
    email: 'o@test.com',
    role: 'user' as const,
    permissions: { canEdit: true, canModerate: false, canAdmin: false },
};

function makeFactory(user: typeof mockAuthorUser | undefined) {
    return createComponentFactory({
        component: CancelVersionSidebarActionComponent,
        providers: [mockProvider(SidebarService), { provide: AuthService, useValue: { user$: of(user) } }],
        componentProviders: [mockProvider(CancelVersionService)],
        detectChanges: false,
    });
}

describe('CancelVersionSidebarActionComponent', () => {
    describe('author of pending version', () => {
        const createComponent = makeFactory(mockAuthorUser);
        let spectator: Spectator<CancelVersionSidebarActionComponent>;

        beforeEach(() => {
            spectator = createComponent({ props: { version: mockVersion } });
        });

        it('is visible (canCancel=true)', () => {
            spectator.detectChanges();
            expect(spectator.component.canCancel()).toBe(true);
            expect(spectator.query(SidebarActionComponent)).toBeTruthy();
        });

        it('delegates to CancelVersionService and emits the result', () => {
            spectator.detectChanges();
            const cancelService = spectator.inject(CancelVersionService, true) as jest.Mocked<CancelVersionService>;
            const result: CancelVersionResult = {
                versionId: 789,
                articleId: 100,
                approved: ApprovalStatus.Cancelled,
            };
            cancelService.cancelVersion.mockReturnValue(of(result));

            const emitSpy = jest.fn();
            spectator.component.cancelled.subscribe(emitSpy);

            spectator.component.onActivated();

            expect(cancelService.cancelVersion).toHaveBeenCalledWith(789);
            expect(emitSpy).toHaveBeenCalledWith(result);
        });

        it('does not emit when service stream completes empty', () => {
            spectator.detectChanges();
            const cancelService = spectator.inject(CancelVersionService, true) as jest.Mocked<CancelVersionService>;
            cancelService.cancelVersion.mockReturnValue(EMPTY);

            const emitSpy = jest.fn();
            spectator.component.cancelled.subscribe(emitSpy);

            spectator.component.onActivated();

            expect(emitSpy).not.toHaveBeenCalled();
        });
    });

    describe('different author', () => {
        const createComponent = makeFactory(mockOtherUser);

        it('is hidden (canCancel=false)', () => {
            const spectator = createComponent({ props: { version: mockVersion } });
            spectator.detectChanges();
            expect(spectator.component.canCancel()).toBe(false);
            expect(spectator.query(SidebarActionComponent)).toBeFalsy();
        });
    });

    describe('approved version', () => {
        const createComponent = makeFactory(mockAuthorUser);

        it('is hidden when approved !== Pending', () => {
            const spectator = createComponent({
                props: { version: { ...mockVersion, approved: ApprovalStatus.Approved } },
            });
            spectator.detectChanges();
            expect(spectator.component.canCancel()).toBe(false);
            expect(spectator.query(SidebarActionComponent)).toBeFalsy();
        });
    });

    describe('no user', () => {
        const createComponent = makeFactory(undefined);

        it('is hidden when no user', () => {
            const spectator = createComponent({ props: { version: mockVersion } });
            spectator.detectChanges();
            expect(spectator.component.canCancel()).toBe(false);
        });
    });
});
