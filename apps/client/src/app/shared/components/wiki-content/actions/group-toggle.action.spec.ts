import { GroupToggleAction } from './group-toggle.action';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { LoggerService } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';

describe('GroupToggleAction', () => {
    let spectator: SpectatorService<GroupToggleAction>;
    let host: HTMLElement;

    const createService = createServiceFactory({
        service: GroupToggleAction,
        providers: [mockLoggerProvider()],
    });

    beforeEach(() => {
        spectator = createService();
        host = document.createElement('div');
    });

    it('should have name', () => {
        expect(spectator.service.name).toBe('GroupToggle');
    });

    describe('canExecute', () => {
        it('should match toggleGroup', () => {
            expect(spectator.service.canExecute('toggleGroup')).toBe(true);
        });

        it('should not match other actions', () => {
            expect(spectator.service.canExecute('toggleAll')).toBe(false);
        });
    });

    describe('execute', () => {
        it('should hide visible elements with specified class', () => {
            host.innerHTML = '<div class="group1">Item 1</div><div class="group1">Item 2</div>';

            spectator.service.execute('toggleGroup', host, 'group1');

            const items = host.querySelectorAll<HTMLElement>('.group1');
            expect(items[0].style.display).toBe('none');
            expect(items[1].style.display).toBe('none');
        });

        it('should show hidden elements when toggled again', () => {
            host.innerHTML = '<div class="group1">Item</div>';

            spectator.service.execute('toggleGroup', host, 'group1');
            spectator.service.execute('toggleGroup', host, 'group1');

            const item = host.querySelector('.group1') as HTMLElement;
            expect(item.style.display).toBe('');
        });

        it('should warn when param is missing', () => {
            const logger = spectator.inject(LoggerService) as unknown as MockLoggerService;

            spectator.service.execute('toggleGroup', host);

            expect(logger.mockLogger.warn).toHaveBeenCalledWith('toggleGroup requires a class name parameter');
        });

        it('should not throw when no elements match', () => {
            expect(() => spectator.service.execute('toggleGroup', host, 'nonexistent')).not.toThrow();
        });
    });
});
