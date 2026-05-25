import { ArticleService } from '../../../services/articles/article.service';
import { AuthService } from '../../../services/auth/auth.service';
import { VersionForModeration } from '../../models/version-for-moderation.model';
import { SidebarActionComponent } from '../sidebar-action/sidebar-action.component';
import { HttpErrorResponse } from '@angular/common/http';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { NotificationService, SidebarService } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ApprovalStatus, CancelVersionResult } from '@drevo-web/shared';
import { ConfirmationService } from '@drevo-web/ui';
import { of, throwError } from 'rxjs';
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

describe('CancelVersionSidebarActionComponent', () => {
    describe('author of pending version', () => {
        let spectator: Spectator<CancelVersionSidebarActionComponent>;

        const createComponent = createComponentFactory({
            component: CancelVersionSidebarActionComponent,
            providers: [
                mockProvider(SidebarService),
                mockProvider(ArticleService),
                mockProvider(ConfirmationService),
                mockProvider(NotificationService),
                mockLoggerProvider(),
                { provide: AuthService, useValue: { user$: of(mockAuthorUser) } },
            ],
            detectChanges: false,
        });

        beforeEach(() => {
            spectator = createComponent({ props: { version: mockVersion } });
        });

        it('should be visible (canCancel=true)', () => {
            spectator.detectChanges();
            expect(spectator.component.canCancel()).toBe(true);
            expect(spectator.query(SidebarActionComponent)).toBeTruthy();
        });

        it('does nothing when confirmation is cancelled', () => {
            spectator.detectChanges();
            const confirmation = spectator.inject(ConfirmationService);
            const articleService = spectator.inject(ArticleService);
            (confirmation.open as jest.Mock).mockReturnValue(of('cancel'));

            spectator.component.onActivated();

            expect(articleService.cancelVersion).not.toHaveBeenCalled();
        });

        it('emits result and shows success notification on success', () => {
            spectator.detectChanges();
            const result: CancelVersionResult = {
                versionId: 789,
                articleId: 100,
                approved: ApprovalStatus.Cancelled,
            };
            (spectator.inject(ConfirmationService).open as jest.Mock).mockReturnValue(of('confirm'));
            (spectator.inject(ArticleService).cancelVersion as jest.Mock).mockReturnValue(of(result));

            const emitSpy = jest.fn();
            spectator.component.cancelled.subscribe(emitSpy);

            spectator.component.onActivated();

            expect(spectator.inject(ArticleService).cancelVersion).toHaveBeenCalledWith(789);
            expect(spectator.inject(NotificationService).success).toHaveBeenCalledWith('Версия отменена');
            expect(emitSpy).toHaveBeenCalledWith(result);
        });

        it('handles 409 conflict: emits payload, shows info notification', () => {
            spectator.detectChanges();
            const conflictError = new HttpErrorResponse({
                status: 409,
                error: {
                    errorCode: 'INVALID_STATE',
                    data: { versionId: 789, articleId: 100, approved: ApprovalStatus.Approved },
                },
            });
            (spectator.inject(ConfirmationService).open as jest.Mock).mockReturnValue(of('confirm'));
            (spectator.inject(ArticleService).cancelVersion as jest.Mock).mockReturnValue(throwError(() => conflictError));

            const emitSpy = jest.fn();
            spectator.component.cancelled.subscribe(emitSpy);

            spectator.component.onActivated();

            expect(spectator.inject(NotificationService).info).toHaveBeenCalledWith(
                'Версия уже не в статусе «На проверке»',
            );
            expect(emitSpy).toHaveBeenCalledWith({
                versionId: 789,
                articleId: 100,
                approved: ApprovalStatus.Approved,
            });
        });

        it('handles other errors: shows error notification, no emit', () => {
            spectator.detectChanges();
            const error = new HttpErrorResponse({ status: 500 });
            (spectator.inject(ConfirmationService).open as jest.Mock).mockReturnValue(of('confirm'));
            (spectator.inject(ArticleService).cancelVersion as jest.Mock).mockReturnValue(throwError(() => error));

            const emitSpy = jest.fn();
            spectator.component.cancelled.subscribe(emitSpy);

            spectator.component.onActivated();

            expect(spectator.inject(NotificationService).error).toHaveBeenCalledWith('Не удалось отменить версию');
            expect(emitSpy).not.toHaveBeenCalled();
        });
    });

    describe('different author', () => {
        const createComponent = createComponentFactory({
            component: CancelVersionSidebarActionComponent,
            providers: [
                mockProvider(SidebarService),
                mockProvider(ArticleService),
                mockProvider(ConfirmationService),
                mockProvider(NotificationService),
                mockLoggerProvider(),
                { provide: AuthService, useValue: { user$: of(mockOtherUser) } },
            ],
            detectChanges: false,
        });

        it('is hidden (canCancel=false)', () => {
            const spectator = createComponent({ props: { version: mockVersion } });
            spectator.detectChanges();
            expect(spectator.component.canCancel()).toBe(false);
            expect(spectator.query(SidebarActionComponent)).toBeFalsy();
        });
    });

    describe('approved version', () => {
        const createComponent = createComponentFactory({
            component: CancelVersionSidebarActionComponent,
            providers: [
                mockProvider(SidebarService),
                mockProvider(ArticleService),
                mockProvider(ConfirmationService),
                mockProvider(NotificationService),
                mockLoggerProvider(),
                { provide: AuthService, useValue: { user$: of(mockAuthorUser) } },
            ],
            detectChanges: false,
        });

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
        const createComponent = createComponentFactory({
            component: CancelVersionSidebarActionComponent,
            providers: [
                mockProvider(SidebarService),
                mockProvider(ArticleService),
                mockProvider(ConfirmationService),
                mockProvider(NotificationService),
                mockLoggerProvider(),
                { provide: AuthService, useValue: { user$: of(undefined) } },
            ],
            detectChanges: false,
        });

        it('is hidden when no user', () => {
            const spectator = createComponent({ props: { version: mockVersion } });
            spectator.detectChanges();
            expect(spectator.component.canCancel()).toBe(false);
        });
    });
});
