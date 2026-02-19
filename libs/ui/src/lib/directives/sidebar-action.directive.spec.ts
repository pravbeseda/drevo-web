import { createDirectiveFactory, SpectatorDirective, SpyObject } from '@ngneat/spectator/jest';
import { SidebarService } from '@drevo-web/core';
import { SidebarAction } from '@drevo-web/shared';
import { SidebarActionDirective } from './sidebar-action.directive';

describe('SidebarActionDirective', () => {
    let spectator: SpectatorDirective<SidebarActionDirective>;
    let sidebarService: SpyObject<SidebarService>;

    const createDirective = createDirectiveFactory({
        directive: SidebarActionDirective,
        mocks: [SidebarService],
    });

    describe('basic functionality', () => {
        beforeEach(() => {
            spectator = createDirective(`<button sidebarAction icon="edit" label="Edit"></button>`);
            sidebarService = spectator.inject(SidebarService);
        });

        it('should create', () => {
            expect(spectator.directive).toBeTruthy();
        });

        it('should hide the host element', () => {
            expect(spectator.element).toHaveStyle({ display: 'none' });
        });

        it('should register action with SidebarService', () => {
            expect(sidebarService.registerAction).toHaveBeenCalled();
        });

        it('should register action with correct icon', () => {
            const action = sidebarService.registerAction.mock.calls[0][0];

            expect(action.icon).toBe('edit');
        });

        it('should register action with correct label', () => {
            const action = sidebarService.registerAction.mock.calls[0][0];

            expect(action.label).toBe('Edit');
        });

        it('should register action with default secondary priority', () => {
            const action = sidebarService.registerAction.mock.calls[0][0];

            expect(action.priority).toBe('secondary');
        });

        it('should register action with unique id', () => {
            const action = sidebarService.registerAction.mock.calls[0][0];

            expect(action.id).toMatch(/^sidebar-action-\d+$/);
        });

        it('should register action with action callback', () => {
            const action = sidebarService.registerAction.mock.calls[0][0];

            expect(typeof action.action).toBe('function');
        });

        it('should unregister action on destroy', () => {
            const action = sidebarService.registerAction.mock.calls[0][0];

            spectator.directive.ngOnDestroy();

            expect(sidebarService.unregisterAction).toHaveBeenCalledWith(action.id);
        });

        it('should trigger click on host element when action is called', () => {
            const clickSpy = jest.fn();
            spectator.element.addEventListener('click', clickSpy);

            const action = sidebarService.registerAction.mock.calls[0][0] as SidebarAction;
            action.action?.();

            expect(clickSpy).toHaveBeenCalled();
        });
    });

    describe('primary priority', () => {
        beforeEach(() => {
            spectator = createDirective(`<button sidebarAction icon="add" label="Add" priority="primary"></button>`);
            sidebarService = spectator.inject(SidebarService);
        });

        it('should register action with primary priority when specified', () => {
            const action = sidebarService.registerAction.mock.calls[0][0];

            expect(action.priority).toBe('primary');
        });
    });

    describe('secondary priority explicit', () => {
        beforeEach(() => {
            spectator = createDirective(
                `<button sidebarAction icon="delete" label="Delete" priority="secondary"></button>`
            );
            sidebarService = spectator.inject(SidebarService);
        });

        it('should register action with secondary priority when explicitly specified', () => {
            const action = sidebarService.registerAction.mock.calls[0][0];

            expect(action.priority).toBe('secondary');
        });
    });

    describe('unique ids across instances', () => {
        it('should generate unique id for first directive', () => {
            spectator = createDirective(`<button sidebarAction icon="edit" label="Edit"></button>`);
            sidebarService = spectator.inject(SidebarService);

            const action = sidebarService.registerAction.mock.calls[0][0];

            expect(action.id).toMatch(/^sidebar-action-\d+$/);
        });
    });

    describe('different inputs', () => {
        it('should register action with custom icon and label', () => {
            spectator = createDirective(`<button sidebarAction icon="delete" label="Remove Item"></button>`);
            sidebarService = spectator.inject(SidebarService);

            const action = sidebarService.registerAction.mock.calls[0][0];

            expect(action.icon).toBe('delete');
            expect(action.label).toBe('Remove Item');
        });
    });

    describe('link', () => {
        beforeEach(() => {
            spectator = createDirective(
                `<button sidebarAction icon="edit" label="Edit" link="/edit/123"></button>`
            );
            sidebarService = spectator.inject(SidebarService);
        });

        it('should register action with href from link input', () => {
            const action = sidebarService.registerAction.mock.calls[0][0];

            expect(action.link).toBe('/edit/123');
        });

        it('should not have action callback when link is provided', () => {
            const action = sidebarService.registerAction.mock.calls[0][0];

            expect(action.action).toBeUndefined();
        });
    });

    describe('disabled', () => {
        beforeEach(() => {
            spectator = createDirective(
                `<button sidebarAction icon="edit" label="Edit" [disabled]="true"></button>`
            );
            sidebarService = spectator.inject(SidebarService);
        });

        it('should register action with disabled state', () => {
            const action = sidebarService.registerAction.mock.calls[0][0];

            expect(action.disabled).toBe(true);
        });
    });

    describe('link with disabled', () => {
        beforeEach(() => {
            spectator = createDirective(
                `<button sidebarAction icon="edit" label="Edit" link="/edit/123" [disabled]="true"></button>`
            );
            sidebarService = spectator.inject(SidebarService);
        });

        it('should register action with both link and disabled', () => {
            const action = sidebarService.registerAction.mock.calls[0][0];

            expect(action.link).toBe('/edit/123');
            expect(action.disabled).toBe(true);
        });
    });

    describe('dynamic disabled changes', () => {
        beforeEach(() => {
            spectator = createDirective(
                `<button sidebarAction icon="edit" label="Edit" [disabled]="isDisabled"></button>`,
                {
                    hostProps: { isDisabled: false },
                }
            );
            sidebarService = spectator.inject(SidebarService);
        });

        it('should register action with initial disabled state', () => {
            const action = sidebarService.registerAction.mock.calls[0][0];

            expect(action.disabled).toBe(false);
        });

        it('should re-register action when disabled changes', () => {
            const callsBefore = sidebarService.registerAction.mock.calls.length;

            spectator.setHostInput({ isDisabled: true });

            expect(sidebarService.registerAction.mock.calls.length).toBe(callsBefore + 1);
        });

        it('should register action with updated disabled state', () => {
            spectator.setHostInput({ isDisabled: true });

            const lastCall =
                sidebarService.registerAction.mock.calls[sidebarService.registerAction.mock.calls.length - 1][0];

            expect(lastCall.disabled).toBe(true);
        });

        it('should preserve action id when re-registering', () => {
            const initialAction = sidebarService.registerAction.mock.calls[0][0];

            spectator.setHostInput({ isDisabled: true });

            const calls = sidebarService.registerAction.mock.calls;
            const updatedAction = calls[calls.length - 1][0];

            expect(updatedAction.id).toBe(initialAction.id);
        });
    });
});
