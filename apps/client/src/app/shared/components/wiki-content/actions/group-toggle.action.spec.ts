import { GroupToggleAction } from './group-toggle.action';
import { TestBed } from '@angular/core/testing';
import { LoggerService } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';

describe('GroupToggleAction', () => {
    let action: GroupToggleAction;
    let host: HTMLElement;
    let logger: MockLoggerService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [GroupToggleAction, mockLoggerProvider()],
        });
        action = TestBed.inject(GroupToggleAction);
        logger = TestBed.inject(LoggerService) as unknown as MockLoggerService;
        host = document.createElement('div');
    });

    it('should have name', () => {
        expect(action.name).toBe('GroupToggle');
    });

    describe('canExecute', () => {
        it('should match toggleGroup', () => {
            expect(action.canExecute('toggleGroup')).toBe(true);
        });

        it('should not match other actions', () => {
            expect(action.canExecute('toggleAll')).toBe(false);
        });
    });

    describe('execute', () => {
        it('should hide visible elements with specified class', () => {
            host.innerHTML = '<div class="group1">Item 1</div><div class="group1">Item 2</div>';

            action.execute('toggleGroup', host, 'group1');

            const items = host.querySelectorAll<HTMLElement>('.group1');
            expect(items[0].style.display).toBe('none');
            expect(items[1].style.display).toBe('none');
        });

        it('should show hidden elements when toggled again', () => {
            host.innerHTML = '<div class="group1">Item</div>';

            action.execute('toggleGroup', host, 'group1');
            action.execute('toggleGroup', host, 'group1');

            const item = host.querySelector('.group1') as HTMLElement;
            expect(item.style.display).toBe('');
        });

        it('should warn when param is missing', () => {
            action.execute('toggleGroup', host);

            expect(logger.mockLogger.warn).toHaveBeenCalledWith('toggleGroup requires a class name parameter');
        });

        it('should not throw when no elements match', () => {
            expect(() => action.execute('toggleGroup', host, 'nonexistent')).not.toThrow();
        });
    });
});
