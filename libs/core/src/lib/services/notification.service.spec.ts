import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator/jest';
import { Subject } from 'rxjs';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
    let spectator: SpectatorService<NotificationService>;
    let snackBar: SpyObject<MatSnackBar>;
    let mockSnackBarRef: {
        onAction: jest.Mock;
        afterDismissed: jest.Mock;
        dismiss: jest.Mock;
    };
    let onActionSubject: Subject<void>;
    let afterDismissedSubject: Subject<{ dismissedByAction: boolean }>;

    const createService = createServiceFactory({
        service: NotificationService,
        mocks: [MatSnackBar],
    });

    beforeEach(() => {
        onActionSubject = new Subject<void>();
        afterDismissedSubject = new Subject<{ dismissedByAction: boolean }>();
        mockSnackBarRef = {
            onAction: jest.fn().mockReturnValue(onActionSubject.asObservable()),
            afterDismissed: jest.fn().mockReturnValue(afterDismissedSubject.asObservable()),
            dismiss: jest.fn(),
        };

        spectator = createService();
        snackBar = spectator.inject(MatSnackBar);
        snackBar.open.mockReturnValue(mockSnackBarRef as unknown as MatSnackBarRef<TextOnlySnackBar>);
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

            expect(snackBar.open).toHaveBeenCalledWith('Success message', 'OK', {
                duration: 3000,
                horizontalPosition: 'end',
                verticalPosition: 'top',
                panelClass: ['toast-success'],
                politeness: 'polite',
            });
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

    describe('showPersistent()', () => {
        it('should open snackbar with duration 0', () => {
            spectator.service.showPersistent({
                message: 'Persistent message',
                actionLabel: 'Action',
                onAction: jest.fn(),
            });

            expect(snackBar.open).toHaveBeenCalledWith('Persistent message', 'Action', {
                duration: 0,
                horizontalPosition: 'center',
                verticalPosition: 'bottom',
                panelClass: ['toast-info', 'toast-persistent'],
                politeness: 'polite',
            });
        });

        it('should use specified kind for panel class', () => {
            spectator.service.showPersistent({
                message: 'Error message',
                actionLabel: 'Retry',
                onAction: jest.fn(),
                kind: 'error',
            });

            expect(snackBar.open).toHaveBeenCalledWith(
                'Error message',
                'Retry',
                expect.objectContaining({
                    panelClass: ['toast-error', 'toast-persistent'],
                }),
            );
        });

        it('should call onAction callback when action clicked', () => {
            const onAction = jest.fn();
            spectator.service.showPersistent({
                message: 'Message',
                actionLabel: 'Action',
                onAction,
            });

            onActionSubject.next();

            expect(onAction).toHaveBeenCalledTimes(1);
        });

        it('should call onDismiss callback when snackbar dismissed', () => {
            const onDismiss = jest.fn();
            spectator.service.showPersistent({
                message: 'Message',
                actionLabel: 'Action',
                onAction: jest.fn(),
                onDismiss,
            });

            afterDismissedSubject.next({ dismissedByAction: false });

            expect(onDismiss).toHaveBeenCalledTimes(1);
        });

        it('should not fail if onDismiss is not provided', () => {
            spectator.service.showPersistent({
                message: 'Message',
                actionLabel: 'Action',
                onAction: jest.fn(),
            });

            expect(() => afterDismissedSubject.next({ dismissedByAction: false })).not.toThrow();
        });

        it('should not call onDismiss when dismissed by action', () => {
            const onDismiss = jest.fn();
            spectator.service.showPersistent({
                message: 'Message',
                actionLabel: 'Action',
                onAction: jest.fn(),
                onDismiss,
            });

            afterDismissedSubject.next({ dismissedByAction: true });

            expect(onDismiss).not.toHaveBeenCalled();
        });

        it('should return dismiss function', () => {
            const dismiss = spectator.service.showPersistent({
                message: 'Message',
                actionLabel: 'Action',
                onAction: jest.fn(),
            });

            dismiss();

            expect(mockSnackBarRef.dismiss).toHaveBeenCalledTimes(1);
        });
    });
});
