import { TopicsSidebarActionComponent } from '../topics-sidebar-action/topics-sidebar-action.component';
import { AuthService } from '../../../services/auth/auth.service';
import { ModerationSidebarActionComponent } from '../moderation-sidebar-action/moderation-sidebar-action.component';
import { SidebarActionComponent } from '../sidebar-action/sidebar-action.component';
import { VersionForModeration } from '../../models/version-for-moderation.model';
import { PageSidebarActionsComponent } from './page-sidebar-actions.component';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { NotificationService, SidebarService } from '@drevo-web/core';
import { ApprovalStatus, ModerationResult } from '@drevo-web/shared';
import { createMockUser } from '@drevo-web/shared/testing';
import { of } from 'rxjs';

const mockVersion: VersionForModeration = {
    versionId: 200,
    author: 'Author A',
    date: new Date('2025-01-15T14:30:00'),
    approved: ApprovalStatus.Pending,
    comment: '',
};

const mockModeratorUser = createMockUser({
    login: 'moderator',
    name: 'Moderator',
    email: 'mod@test.com',
    role: 'moder',
    permissions: { canModerate: true },
});

describe('PageSidebarActionsComponent', () => {
    let spectator: Spectator<PageSidebarActionsComponent>;

    const createComponent = createComponentFactory({
        component: PageSidebarActionsComponent,
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
            spectator.setInput('editUrl', '/articles/123/version/456/edit');
            spectator.detectChanges();
            const actions = spectator.queryAll(SidebarActionComponent);
            const editAction = actions.find(a => a.icon() === 'edit');
            expect(editAction).toBeTruthy();
            expect(editAction?.label()).toBe('Редактировать');
            expect(editAction?.link()).toBe('/articles/123/version/456/edit');
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

            expect(spectator.query(ModerationSidebarActionComponent)).toBeTruthy();
            spectator.triggerEventHandler(ModerationSidebarActionComponent, 'moderated', result);

            expect(spy).toHaveBeenCalledWith(result);
        });
    });

    describe('moderationPriority', () => {
        it('should be secondary when topics are not provided', () => {
            spectator.setInput('version', mockVersion);
            spectator.detectChanges();
            expect(spectator.component.moderationPriority()).toBe('secondary');
        });

        it('should be secondary when topics are empty', () => {
            spectator.setInput('version', mockVersion);
            spectator.setInput('topics', []);
            spectator.detectChanges();
            expect(spectator.component.moderationPriority()).toBe('secondary');
        });

        it('should be primary when topics are present', () => {
            spectator.setInput('version', mockVersion);
            spectator.setInput('topics', [1, 2]);
            spectator.detectChanges();
            expect(spectator.component.moderationPriority()).toBe('primary');
        });

        it('should be secondary when topics are present but version is approved', () => {
            spectator.setInput('version', { ...mockVersion, approved: ApprovalStatus.Approved });
            spectator.setInput('topics', [1, 2]);
            spectator.detectChanges();
            expect(spectator.component.moderationPriority()).toBe('secondary');
        });

        it('should be secondary when topics are present but version is rejected', () => {
            spectator.setInput('version', { ...mockVersion, approved: ApprovalStatus.Rejected });
            spectator.setInput('topics', [1, 2]);
            spectator.detectChanges();
            expect(spectator.component.moderationPriority()).toBe('secondary');
        });

        it('should pass priority to moderation component', () => {
            spectator.setInput('version', mockVersion);
            spectator.setInput('topics', [1]);
            spectator.detectChanges();
            const moderation = spectator.query(ModerationSidebarActionComponent);
            expect(moderation?.priority()).toBe('primary');
        });
    });

    describe('moderationDisabled', () => {
        it('should be true when topics are not provided', () => {
            spectator.setInput('version', mockVersion);
            spectator.detectChanges();
            expect(spectator.component.moderationDisabled()).toBe(true);
        });

        it('should be true when topics are empty', () => {
            spectator.setInput('version', mockVersion);
            spectator.setInput('topics', []);
            spectator.detectChanges();
            expect(spectator.component.moderationDisabled()).toBe(true);
        });

        it('should be false when topics are present', () => {
            spectator.setInput('version', mockVersion);
            spectator.setInput('topics', [1]);
            spectator.detectChanges();
            expect(spectator.component.moderationDisabled()).toBe(false);
        });

        it('should pass disabled=true to moderation component when topics are empty', () => {
            spectator.setInput('version', mockVersion);
            spectator.detectChanges();
            const moderation = spectator.query(ModerationSidebarActionComponent);
            expect(moderation?.disabled()).toBe(true);
        });

        it('should pass disabled=false to moderation component when topics are present', () => {
            spectator.setInput('version', mockVersion);
            spectator.setInput('topics', [1]);
            spectator.detectChanges();
            const moderation = spectator.query(ModerationSidebarActionComponent);
            expect(moderation?.disabled()).toBe(false);
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

    describe('on a news item', () => {
        const pendingVersion = { ...mockVersion, approved: ApprovalStatus.Pending };

        beforeEach(() => {
            spectator.setInput({ kind: 'news', articleId: 7, topics: [3], version: pendingVersion });
            spectator.detectChanges();
        });

        it('offers no topics action: the sections of a news item are not dictionary topics', () => {
            expect(spectator.query(TopicsSidebarActionComponent)).toBeNull();
        });

        it('moderates the version as news', () => {
            expect(spectator.query(ModerationSidebarActionComponent)?.kind()).toBe('news');
        });

        it('does not hold moderation back for topics, which only articles need', () => {
            spectator.setInput('topics', []);
            spectator.detectChanges();

            expect(spectator.component.moderationDisabled()).toBe(false);
            expect(spectator.component.moderationPriority()).toBe('primary');
        });
    });
});
