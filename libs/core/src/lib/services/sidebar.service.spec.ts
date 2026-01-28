import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { SidebarAction } from '@drevo-web/shared';
import { SidebarService } from './sidebar.service';

describe('SidebarService', () => {
    let spectator: SpectatorService<SidebarService>;

    const createService = createServiceFactory({
        service: SidebarService,
    });

    const createAction = (
        overrides: Partial<SidebarAction> = {}
    ): SidebarAction => ({
        id: 'test-action',
        icon: 'edit',
        label: 'Test Action',
        priority: 'primary',
        action: jest.fn(),
        ...overrides,
    });

    beforeEach(() => {
        spectator = createService();
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    it('should start with empty actions', () => {
        expect(spectator.service.actions()).toEqual([]);
        expect(spectator.service.primaryActions()).toEqual([]);
        expect(spectator.service.secondaryActions()).toEqual([]);
    });

    describe('registerAction()', () => {
        it('should register a single action', () => {
            const action = createAction();

            spectator.service.registerAction(action);

            expect(spectator.service.actions()).toEqual([action]);
        });

        it('should register multiple actions', () => {
            const action1 = createAction({ id: 'action-1' });
            const action2 = createAction({ id: 'action-2' });

            spectator.service.registerAction(action1);
            spectator.service.registerAction(action2);

            expect(spectator.service.actions()).toHaveLength(2);
            expect(spectator.service.actions()).toContainEqual(action1);
            expect(spectator.service.actions()).toContainEqual(action2);
        });

        it('should overwrite action with same id', () => {
            const action1 = createAction({ id: 'same-id', label: 'First' });
            const action2 = createAction({ id: 'same-id', label: 'Second' });

            spectator.service.registerAction(action1);
            spectator.service.registerAction(action2);

            expect(spectator.service.actions()).toHaveLength(1);
            expect(spectator.service.actions()[0].label).toBe('Second');
        });
    });

    describe('unregisterAction()', () => {
        it('should remove action by id', () => {
            const action = createAction({ id: 'to-remove' });
            spectator.service.registerAction(action);

            spectator.service.unregisterAction('to-remove');

            expect(spectator.service.actions()).toEqual([]);
        });

        it('should only remove specified action', () => {
            const action1 = createAction({ id: 'keep' });
            const action2 = createAction({ id: 'remove' });
            spectator.service.registerAction(action1);
            spectator.service.registerAction(action2);

            spectator.service.unregisterAction('remove');

            expect(spectator.service.actions()).toHaveLength(1);
            expect(spectator.service.actions()[0].id).toBe('keep');
        });

        it('should handle unregistering non-existent action', () => {
            const action = createAction();
            spectator.service.registerAction(action);

            spectator.service.unregisterAction('non-existent');

            expect(spectator.service.actions()).toHaveLength(1);
        });
    });

    describe('clear()', () => {
        it('should remove all actions', () => {
            spectator.service.registerAction(createAction({ id: 'action-1' }));
            spectator.service.registerAction(createAction({ id: 'action-2' }));
            spectator.service.registerAction(createAction({ id: 'action-3' }));

            spectator.service.clear();

            expect(spectator.service.actions()).toEqual([]);
        });

        it('should work on empty state', () => {
            spectator.service.clear();

            expect(spectator.service.actions()).toEqual([]);
        });
    });

    describe('primaryActions', () => {
        it('should return only primary actions', () => {
            const primary1 = createAction({ id: 'primary-1', priority: 'primary' });
            const primary2 = createAction({ id: 'primary-2', priority: 'primary' });
            const secondary = createAction({
                id: 'secondary',
                priority: 'secondary',
            });

            spectator.service.registerAction(primary1);
            spectator.service.registerAction(secondary);
            spectator.service.registerAction(primary2);

            expect(spectator.service.primaryActions()).toHaveLength(2);
            expect(spectator.service.primaryActions()).toContainEqual(primary1);
            expect(spectator.service.primaryActions()).toContainEqual(primary2);
        });

        it('should return empty array when no primary actions', () => {
            spectator.service.registerAction(
                createAction({ id: 'secondary', priority: 'secondary' })
            );

            expect(spectator.service.primaryActions()).toEqual([]);
        });
    });

    describe('secondaryActions', () => {
        it('should return only secondary actions', () => {
            const secondary1 = createAction({
                id: 'secondary-1',
                priority: 'secondary',
            });
            const secondary2 = createAction({
                id: 'secondary-2',
                priority: 'secondary',
            });
            const primary = createAction({ id: 'primary', priority: 'primary' });

            spectator.service.registerAction(secondary1);
            spectator.service.registerAction(primary);
            spectator.service.registerAction(secondary2);

            expect(spectator.service.secondaryActions()).toHaveLength(2);
            expect(spectator.service.secondaryActions()).toContainEqual(secondary1);
            expect(spectator.service.secondaryActions()).toContainEqual(secondary2);
        });

        it('should return empty array when no secondary actions', () => {
            spectator.service.registerAction(
                createAction({ id: 'primary', priority: 'primary' })
            );

            expect(spectator.service.secondaryActions()).toEqual([]);
        });
    });

    describe('computed signals reactivity', () => {
        it('should update computed signals when actions change', () => {
            expect(spectator.service.actions()).toHaveLength(0);

            const action = createAction();
            spectator.service.registerAction(action);

            expect(spectator.service.actions()).toHaveLength(1);

            spectator.service.unregisterAction(action.id);

            expect(spectator.service.actions()).toHaveLength(0);
        });

        it('should update filtered signals when priorities change via re-registration', () => {
            const action = createAction({ id: 'changeable', priority: 'primary' });
            spectator.service.registerAction(action);

            expect(spectator.service.primaryActions()).toHaveLength(1);
            expect(spectator.service.secondaryActions()).toHaveLength(0);

            const updatedAction = createAction({
                id: 'changeable',
                priority: 'secondary',
            });
            spectator.service.registerAction(updatedAction);

            expect(spectator.service.primaryActions()).toHaveLength(0);
            expect(spectator.service.secondaryActions()).toHaveLength(1);
        });
    });
});
