import { MapStubAction } from './map-stub.action';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from '@drevo-web/core';

describe('MapStubAction', () => {
    let action: MapStubAction;
    let notification: jest.Mocked<NotificationService>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [MapStubAction, { provide: NotificationService, useValue: { info: jest.fn() } }],
        });
        action = TestBed.inject(MapStubAction);
        notification = TestBed.inject(NotificationService) as jest.Mocked<NotificationService>;
    });

    it('should have name', () => {
        expect(action.name).toBe('MapStub');
    });

    describe('canExecute', () => {
        it('should match toggleYandexMap', () => {
            expect(action.canExecute('toggleYandexMap')).toBe(true);
        });

        it('should match googleMap', () => {
            expect(action.canExecute('googleMap')).toBe(true);
        });

        it('should not match other actions', () => {
            expect(action.canExecute('toggleAll')).toBe(false);
        });
    });

    describe('execute', () => {
        it('should show not-implemented notification', () => {
            action.execute('toggleYandexMap', document.createElement('div'));

            expect(notification.info).toHaveBeenCalledWith('Функция еще не реализована');
        });
    });
});
