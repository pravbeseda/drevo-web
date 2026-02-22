import { WritableSignal, signal } from '@angular/core';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { SidebarService } from '@drevo-web/core';
import { SidebarAction } from '@drevo-web/shared';
import { RightSidebarComponent } from './right-sidebar.component';

describe('RightSidebarComponent', () => {
    let spectator: Spectator<RightSidebarComponent>;
    let actionsSignal: WritableSignal<SidebarAction[]>;

    const mockActions: SidebarAction[] = [
        {
            id: 'edit',
            icon: 'edit',
            label: 'Редактировать',
            priority: 'primary',
            action: jest.fn(),
        },
        {
            id: 'share',
            icon: 'share',
            label: 'Поделиться',
            priority: 'secondary',
            action: jest.fn(),
        },
        {
            id: 'delete',
            icon: 'delete',
            label: 'Удалить',
            priority: 'secondary',
            action: jest.fn(),
        },
    ];

    const createComponent = createComponentFactory({
        component: RightSidebarComponent,
        detectChanges: false,
        providers: [
            mockProvider(SidebarService, {
                actions: (actionsSignal = signal(mockActions)),
            }),
        ],
    });

    beforeEach(() => {
        mockActions.forEach(a => (a.action as jest.Mock).mockClear());
        actionsSignal.set(mockActions);
        spectator = createComponent();
        spectator.detectChanges();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    describe('desktop sidebar', () => {
        it('should render all actions in floating sidebar', () => {
            const buttons = spectator.queryAll('.floating-sidebar ui-action-button');

            expect(buttons.length).toBe(3);
        });
    });

    describe('mainAction', () => {
        it('should select first primary action as main', () => {
            expect(spectator.component.mainAction()?.id).toBe('edit');
        });

        it('should select first action when no primary exists', () => {
            actionsSignal.set([
                { id: 'a', icon: 'a', label: 'A', priority: 'secondary', action: jest.fn() },
                { id: 'b', icon: 'b', label: 'B', priority: 'secondary', action: jest.fn() },
            ]);

            expect(spectator.component.mainAction()?.id).toBe('a');
        });

        it('should be undefined when no actions', () => {
            actionsSignal.set([]);

            expect(spectator.component.mainAction()).toBeUndefined();
        });
    });

    describe('menuActions', () => {
        it('should contain all actions except main', () => {
            const ids = spectator.component.menuActions().map(a => a.id);

            expect(ids).toEqual(['share', 'delete']);
        });
    });

    describe('mobile sidebar', () => {
        it('should render main action FAB', () => {
            const mainButton = spectator.query('[data-testid="fab-main"]');

            expect(mainButton).toBeTruthy();
        });

        it('should render menu toggle when menu actions exist', () => {
            const menuToggle = spectator.query('[data-testid="fab-menu-toggle"]');

            expect(menuToggle).toBeTruthy();
        });

        it('should not render menu toggle when only one action', () => {
            actionsSignal.set([
                { id: 'only', icon: 'star', label: 'Only', priority: 'primary', action: jest.fn() },
            ]);
            spectator.detectChanges();

            expect(spectator.query('[data-testid="fab-main"]')).toBeTruthy();
            expect(spectator.query('[data-testid="fab-menu-toggle"]')).toBeFalsy();
            expect(spectator.query('.speed-dial')).toBeFalsy();
        });

        it('should not show speed dial by default', () => {
            const speedDial = spectator.query('.speed-dial');

            expect(speedDial).not.toHaveClass('open');
        });
    });

    describe('menu toggle', () => {
        it('should start with menu closed', () => {
            expect(spectator.component.menuOpen()).toBe(false);
        });

        it('should open menu when toggleMenu is called', () => {
            spectator.component.toggleMenu();

            expect(spectator.component.menuOpen()).toBe(true);
        });

        it('should close menu when toggleMenu is called twice', () => {
            spectator.component.toggleMenu();
            spectator.component.toggleMenu();

            expect(spectator.component.menuOpen()).toBe(false);
        });

        it('should add open class to speed dial when menu is open', () => {
            spectator.component.toggleMenu();
            spectator.detectChanges();

            const speedDial = spectator.query('.speed-dial');

            expect(speedDial).toHaveClass('open');
        });
    });

    describe('handleSpeedDialAction', () => {
        it('should call action callback', () => {
            const action = mockActions[1];

            spectator.component.handleSpeedDialAction(action);

            expect(action.action).toHaveBeenCalled();
        });

        it('should close menu after action', () => {
            spectator.component.menuOpen.set(true);
            const action = mockActions[1];

            spectator.component.handleSpeedDialAction(action);

            expect(spectator.component.menuOpen()).toBe(false);
        });
    });

    describe('action callbacks', () => {
        it('should call main action when clicked', () => {
            const mainButton = spectator.query('[data-testid="fab-main"]');

            spectator.dispatchFakeEvent(mainButton!, 'clicked');

            expect(mockActions[0].action).toHaveBeenCalled();
        });
    });
});
