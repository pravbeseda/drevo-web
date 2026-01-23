import {
    createDirectiveFactory,
    SpectatorDirective,
    SpyObject,
} from '@ngneat/spectator/jest';
import { SidebarActionDirective } from './sidebar-action.directive';
import { SidebarService } from '@drevo-web/core';
import { SidebarAction } from '@drevo-web/shared';

describe('SidebarActionDirective', () => {
    let spectator: SpectatorDirective<SidebarActionDirective>;
    let sidebarService: SpyObject<SidebarService>;

    const createDirective = createDirectiveFactory({
        directive: SidebarActionDirective,
        mocks: [SidebarService],
    });

    describe('basic functionality', () => {
        beforeEach(() => {
            spectator = createDirective(
                `<button sidebarAction icon="edit" label="Edit"></button>`
            );
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

            expect(sidebarService.unregisterAction).toHaveBeenCalledWith(
                action.id
            );
        });

        it('should trigger click on host element when action is called', () => {
            const clickSpy = jest.fn();
            spectator.element.addEventListener('click', clickSpy);

            const action = sidebarService.registerAction.mock
                .calls[0][0] as SidebarAction;
            action.action();

            expect(clickSpy).toHaveBeenCalled();
        });
    });

    describe('primary priority', () => {
        beforeEach(() => {
            spectator = createDirective(
                `<button sidebarAction icon="add" label="Add" priority="primary"></button>`
            );
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
            spectator = createDirective(
                `<button sidebarAction icon="edit" label="Edit"></button>`
            );
            sidebarService = spectator.inject(SidebarService);

            const action = sidebarService.registerAction.mock.calls[0][0];

            expect(action.id).toMatch(/^sidebar-action-\d+$/);
        });
    });

    describe('different inputs', () => {
        it('should register action with custom icon and label', () => {
            spectator = createDirective(
                `<button sidebarAction icon="delete" label="Remove Item"></button>`
            );
            sidebarService = spectator.inject(SidebarService);

            const action = sidebarService.registerAction.mock.calls[0][0];

            expect(action.icon).toBe('delete');
            expect(action.label).toBe('Remove Item');
        });
    });
});
