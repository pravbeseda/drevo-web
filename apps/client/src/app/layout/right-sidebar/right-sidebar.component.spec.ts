import { signal } from '@angular/core';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { SidebarService } from '@drevo-web/core';
import { SidebarAction } from '@drevo-web/shared';
import { RightSidebarComponent } from './right-sidebar.component';

describe('RightSidebarComponent', () => {
    let spectator: Spectator<RightSidebarComponent>;

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

    const mockPrimaryActions = mockActions.filter(a => a.priority === 'primary');
    const mockSecondaryActions = mockActions.filter(a => a.priority === 'secondary');

    const createComponent = createComponentFactory({
        component: RightSidebarComponent,
        providers: [
            mockProvider(SidebarService, {
                actions: signal(mockActions),
                primaryActions: signal(mockPrimaryActions),
                secondaryActions: signal(mockSecondaryActions),
            }),
        ],
    });

    beforeEach(() => {
        mockActions.forEach(a => (a.action as jest.Mock).mockClear());
        spectator = createComponent();
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

    describe('mobile sidebar', () => {
        it('should render primary action button', () => {
            const primaryButton = spectator.query('.fab-container ui-action-button[priority="primary"]');

            expect(primaryButton).toBeTruthy();
        });

        it('should render menu toggle button when secondary actions exist', () => {
            const menuButton = spectator.query('.fab-container ui-action-button[variant="menu"]');

            expect(menuButton).toBeTruthy();
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
            const action = mockSecondaryActions[0];

            spectator.component.handleSpeedDialAction(action);

            expect(action.action).toHaveBeenCalled();
        });

        it('should close menu after action', () => {
            spectator.component.menuOpen.set(true);
            const action = mockSecondaryActions[0];

            spectator.component.handleSpeedDialAction(action);

            expect(spectator.component.menuOpen()).toBe(false);
        });
    });

    describe('action callbacks', () => {
        it('should call primary action when clicked', () => {
            const primaryButton = spectator.query('.fab-container ui-action-button[variant="main"]');

            spectator.dispatchFakeEvent(primaryButton!, 'clicked');

            expect(mockPrimaryActions[0].action).toHaveBeenCalled();
        });
    });
});
