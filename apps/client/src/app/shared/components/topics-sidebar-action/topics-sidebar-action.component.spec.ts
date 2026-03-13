import { ArticleService } from '../../../services/articles';
import { AuthService } from '../../../services/auth/auth.service';
import { SidebarActionComponent } from '../sidebar-action/sidebar-action.component';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { NotificationService, SidebarService } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { SidePanelComponent } from '@drevo-web/ui';
import { of, throwError } from 'rxjs';
import { TopicsSidebarActionComponent } from './topics-sidebar-action.component';

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

describe('TopicsSidebarActionComponent', () => {
    describe('moderator user', () => {
        let spectator: Spectator<TopicsSidebarActionComponent>;

        const createComponent = createComponentFactory({
            component: TopicsSidebarActionComponent,
            providers: [
                mockProvider(SidebarService),
                mockProvider(ArticleService),
                mockProvider(NotificationService),
                mockLoggerProvider(),
                {
                    provide: AuthService,
                    useValue: { user$: of(mockModeratorUser) },
                },
            ],
            detectChanges: false,
        });

        beforeEach(() => {
            spectator = createComponent({ props: { articleId: 1, topics: [1, 2] } });
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

        describe('computed properties', () => {
            it('should compute firstTopicIcon from first topic', () => {
                spectator.detectChanges();
                expect(spectator.component.firstTopicIcon()).toBe('topic_person');
            });

            it('should return undefined firstTopicIcon when no topics', () => {
                spectator.setInput('topics', []);
                spectator.detectChanges();
                expect(spectator.component.firstTopicIcon()).toBeUndefined();
            });

            it('should compute topicCount', () => {
                spectator.detectChanges();
                expect(spectator.component.topicCount()).toBe(2);
            });

            it('should compute topicBadge when count > 1', () => {
                spectator.detectChanges();
                expect(spectator.component.topicBadge()).toBe(2);
            });

            it('should return undefined topicBadge when count is 1', () => {
                spectator.setInput('topics', [1]);
                spectator.detectChanges();
                expect(spectator.component.topicBadge()).toBeUndefined();
            });

            it('should return undefined topicBadge when no topics', () => {
                spectator.setInput('topics', []);
                spectator.detectChanges();
                expect(spectator.component.topicBadge()).toBeUndefined();
            });

            it('should compute topicsLabel from topic names', () => {
                spectator.detectChanges();
                expect(spectator.component.topicsLabel()).toBe('Персоналии\nОрганизации');
            });

            it('should return fallback label when no topics', () => {
                spectator.setInput('topics', []);
                spectator.detectChanges();
                expect(spectator.component.topicsLabel()).toBe('Укажите словник');
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

            it('should initialize selectedTopics from topics input when opening', () => {
                spectator.detectChanges();
                spectator.component.togglePanel();
                expect(spectator.component.selectedTopics().has(1)).toBe(true);
                expect(spectator.component.selectedTopics().has(2)).toBe(true);
                expect(spectator.component.selectedTopics().has(3)).toBe(false);
            });
        });

        describe('topic toggle', () => {
            beforeEach(() => {
                spectator.detectChanges();
                spectator.component.togglePanel();
            });

            it('should add topic when checked', () => {
                spectator.component.onTopicToggle(3, true);
                expect(spectator.component.selectedTopics().has(3)).toBe(true);
            });

            it('should remove topic when unchecked', () => {
                spectator.component.onTopicToggle(1, false);
                expect(spectator.component.selectedTopics().has(1)).toBe(false);
            });

            it('should not duplicate topic when adding existing', () => {
                spectator.component.onTopicToggle(1, true);
                expect(spectator.component.selectedTopics().has(1)).toBe(true);
            });
        });

        describe('save', () => {
            it('should call articleService.updateTopics and emit topicsChanged', () => {
                spectator.detectChanges();
                spectator.component.togglePanel();

                const articleService = spectator.inject(ArticleService);
                const updatedTopics = [1, 2, 3];
                articleService.updateTopics = jest.fn().mockReturnValue(of(updatedTopics));

                const topicsChangedSpy = jest.fn();
                spectator.component.topicsChanged.subscribe(topicsChangedSpy);

                spectator.component.save();

                expect(articleService.updateTopics).toHaveBeenCalledWith(1, [1, 2]);
                expect(topicsChangedSpy).toHaveBeenCalledWith(updatedTopics);
                expect(spectator.component.isPanelOpen()).toBe(false);
                expect(spectator.component.isSaving()).toBe(false);
            });

            it('should show success notification on save', () => {
                spectator.detectChanges();
                spectator.component.togglePanel();

                const articleService = spectator.inject(ArticleService);
                articleService.updateTopics = jest.fn().mockReturnValue(of([1, 2]));

                const notification = spectator.inject(NotificationService);

                spectator.component.save();

                expect(notification.success).toHaveBeenCalledWith('Словники сохранены');
            });

            it('should show error notification on failure', () => {
                spectator.detectChanges();
                spectator.component.togglePanel();

                const articleService = spectator.inject(ArticleService);
                articleService.updateTopics = jest.fn().mockReturnValue(throwError(() => new Error('fail')));

                const notification = spectator.inject(NotificationService);

                spectator.component.save();

                expect(notification.error).toHaveBeenCalledWith('Не удалось сохранить словники');
                expect(spectator.component.isSaving()).toBe(false);
                expect(spectator.component.isPanelOpen()).toBe(true);
            });

            it('should set isSaving during save', () => {
                spectator.detectChanges();
                spectator.component.togglePanel();

                const articleService = spectator.inject(ArticleService);
                articleService.updateTopics = jest.fn().mockReturnValue(of([1, 2]));

                expect(spectator.component.isSaving()).toBe(false);
                spectator.component.save();
                expect(spectator.component.isSaving()).toBe(false);
            });
        });
    });

    describe('regular user', () => {
        const createComponent = createComponentFactory({
            component: TopicsSidebarActionComponent,
            providers: [
                mockProvider(SidebarService),
                mockProvider(ArticleService),
                mockProvider(NotificationService),
                mockLoggerProvider(),
                {
                    provide: AuthService,
                    useValue: { user$: of(mockRegularUser) },
                },
            ],
            detectChanges: false,
        });

        it('should set canModerate to false', () => {
            const spectator = createComponent({ props: { articleId: 1, topics: [] } });
            spectator.detectChanges();
            expect(spectator.component.canModerate()).toBe(false);
        });

        it('should not render sidebar action', () => {
            const spectator = createComponent({ props: { articleId: 1, topics: [] } });
            spectator.detectChanges();
            expect(spectator.query(SidebarActionComponent)).toBeFalsy();
        });

        it('should not render side panel', () => {
            const spectator = createComponent({ props: { articleId: 1, topics: [] } });
            spectator.detectChanges();
            expect(spectator.query(SidePanelComponent)).toBeFalsy();
        });
    });

    describe('no user', () => {
        const createComponent = createComponentFactory({
            component: TopicsSidebarActionComponent,
            providers: [
                mockProvider(SidebarService),
                mockProvider(ArticleService),
                mockProvider(NotificationService),
                mockLoggerProvider(),
                {
                    provide: AuthService,
                    useValue: { user$: of(undefined) },
                },
            ],
            detectChanges: false,
        });

        it('should set canModerate to false when no user', () => {
            const spectator = createComponent({ props: { articleId: 1, topics: [] } });
            spectator.detectChanges();
            expect(spectator.component.canModerate()).toBe(false);
        });
    });
});
