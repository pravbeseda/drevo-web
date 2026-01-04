import {
    createServiceFactory,
    SpectatorService,
    SpyObject,
} from '@ngneat/spectator/jest';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
    let spectator: SpectatorService<NotificationService>;
    let snackBar: SpyObject<MatSnackBar>;

    const createService = createServiceFactory({
        service: NotificationService,
        mocks: [MatSnackBar],
    });

    beforeEach(() => {
        spectator = createService();
        snackBar = spectator.inject(MatSnackBar);
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    describe('error()', () => {
        it('should show error toast with 6000ms duration', () => {
            spectator.service.error('Error message');

            expect(snackBar.open).toHaveBeenCalledWith('Error message', 'OK', {
                duration: 6000,
                horizontalPosition: 'end',
                verticalPosition: 'top',
                panelClass: ['toast-error'],
                politeness: 'assertive',
            });
        });
    });

    describe('success()', () => {
        it('should show success toast with 3000ms duration', () => {
            spectator.service.success('Success message');

            expect(snackBar.open).toHaveBeenCalledWith(
                'Success message',
                'OK',
                {
                    duration: 3000,
                    horizontalPosition: 'end',
                    verticalPosition: 'top',
                    panelClass: ['toast-success'],
                    politeness: 'polite',
                }
            );
        });
    });

    describe('info()', () => {
        it('should show info toast with 3000ms duration', () => {
            spectator.service.info('Info message');

            expect(snackBar.open).toHaveBeenCalledWith('Info message', 'OK', {
                duration: 3000,
                horizontalPosition: 'end',
                verticalPosition: 'top',
                panelClass: ['toast-info'],
                politeness: 'polite',
            });
        });
    });

    describe('throttling', () => {
        it('should throttle duplicate messages within 2000ms', () => {
            spectator.service.error('Same message');
            spectator.service.error('Same message');
            spectator.service.error('Same message');

            expect(snackBar.open).toHaveBeenCalledTimes(1);
        });

        it('should allow same message after throttle time passes', () => {
            spectator.service.error('Same message');
            expect(snackBar.open).toHaveBeenCalledTimes(1);

            // Advance time by 2000ms (throttle time)
            jest.advanceTimersByTime(2000);

            spectator.service.error('Same message');
            expect(snackBar.open).toHaveBeenCalledTimes(2);
        });

        it('should allow different messages immediately', () => {
            spectator.service.error('First message');
            spectator.service.error('Second message');
            spectator.service.success('Third message');

            expect(snackBar.open).toHaveBeenCalledTimes(3);
        });

        it('should treat same message with different kind as different', () => {
            spectator.service.error('Message');
            spectator.service.info('Message');
            spectator.service.success('Message');

            expect(snackBar.open).toHaveBeenCalledTimes(3);
        });

        it('should continue throttling message just before throttle time expires', () => {
            spectator.service.info('Message');
            expect(snackBar.open).toHaveBeenCalledTimes(1);

            // Advance time by 1999ms (just under throttle time)
            jest.advanceTimersByTime(1999);

            spectator.service.info('Message');
            expect(snackBar.open).toHaveBeenCalledTimes(1);
        });
    });
});
