import { AuthService } from '../../../../services/auth/auth.service';
import { ModerationSidebarActionComponent } from '../../../../shared/components/moderation-sidebar-action/moderation-sidebar-action.component';
import { SidebarActionComponent } from '../../../../shared/components/sidebar-action/sidebar-action.component';
import { VersionForModeration } from '../../../../shared/models/version-for-moderation.model';
import { ArticleSidebarActionsComponent } from './article-sidebar-actions.component';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { NotificationService, SidebarService } from '@drevo-web/core';
import { ApprovalStatus, ModerationResult } from '@drevo-web/shared';
import { of } from 'rxjs';

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

describe('ArticleSidebarActionsComponent', () => {
    let spectator: Spectator<ArticleSidebarActionsComponent>;

    const createComponent = createComponentFactory({
        component: ArticleSidebarActionsComponent,
        providers: [
            mockProvider(SidebarService),
            mockProvider(NotificationService),
            {
                provide: AuthService,
                useValue: { user$: of(mockModeratorUser) },
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

    it('should always render TOC sidebar action', () => {
        spectator.detectChanges();
        const actions = spectator.queryAll(SidebarActionComponent);
        const tocAction = actions.find(a => a.icon() === 'toc');
        expect(tocAction).toBeTruthy();
        expect(tocAction?.label()).toBe('Содержание');
    });

    describe('edit action', () => {
        it('should not render edit action when editUrl is not provided', () => {
            spectator.detectChanges();
            const actions = spectator.queryAll(SidebarActionComponent);
            const editAction = actions.find(a => a.icon() === 'edit');
            expect(editAction).toBeFalsy();
        });

        it('should render edit action when editUrl is provided', () => {
            spectator.setInput('editUrl', '/articles/edit/456');
            spectator.detectChanges();
            const actions = spectator.queryAll(SidebarActionComponent);
            const editAction = actions.find(a => a.icon() === 'edit');
            expect(editAction).toBeTruthy();
            expect(editAction?.label()).toBe('Редактировать');
            expect(editAction?.link()).toBe('/articles/edit/456');
        });
    });

    describe('moderation action', () => {
        it('should not render moderation when version is not provided', () => {
            spectator.detectChanges();
            expect(spectator.query(ModerationSidebarActionComponent)).toBeFalsy();
        });

        it('should render moderation when version is provided', () => {
            spectator.setInput('version', mockVersion);
            spectator.detectChanges();
            expect(spectator.query(ModerationSidebarActionComponent)).toBeTruthy();
        });

        it('should pass version to moderation component', () => {
            spectator.setInput('version', mockVersion);
            spectator.detectChanges();
            const moderation = spectator.query(ModerationSidebarActionComponent);
            expect(moderation?.version()).toEqual(mockVersion);
        });

        it('should emit moderated event from moderation component', () => {
            spectator.setInput('version', mockVersion);
            spectator.detectChanges();

            const spy = jest.fn();
            spectator.component.moderated.subscribe(spy);

            const result: ModerationResult = {
                versionId: 200,
                articleId: 1,
                approved: ApprovalStatus.Approved,
                comment: 'OK',
            };

            const moderation = spectator.query(ModerationSidebarActionComponent)!;
            moderation.onModerated(result);

            expect(spy).toHaveBeenCalledWith(result);
        });
    });

    describe('openTableOfContents', () => {
        it('should show notification', () => {
            spectator.detectChanges();
            const notification = spectator.inject(NotificationService);

            spectator.component.openTableOfContents();

            expect(notification.info).toHaveBeenCalledWith('Функция еще не реализована');
        });
    });
});
