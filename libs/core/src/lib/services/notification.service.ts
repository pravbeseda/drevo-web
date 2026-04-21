import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export type ToastKind = 'error' | 'info' | 'success';
const errorDurationMs = 6000;
const messageDurationMs = 3000;
const throttleTimeMs = 2000;

export interface PersistentNotificationConfig {
    readonly message: string;
    readonly actionLabel: string;
    readonly onAction: () => void;
    readonly onDismiss?: () => void;
    readonly kind?: ToastKind;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly snackBar = inject(MatSnackBar);

    private lastKey: string | undefined = undefined;
    private lastAt = 0;

    private show(message: string, kind: ToastKind = 'info'): void {
        const key = `${kind}:${message}`;
        const now = Date.now();

        // Simple dedupe/throttle: ignore same message within throttleTimeMs
        if (this.lastKey === key && now - this.lastAt < throttleTimeMs) return;

        this.lastKey = key;
        this.lastAt = now;

        this.snackBar.open(message, 'OK', {
            duration: kind === 'error' ? errorDurationMs : messageDurationMs,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: [`toast-${kind}`],
            politeness: kind === 'error' ? 'assertive' : 'polite',
        });
    }

    error(message: string): void {
        this.show(message, 'error');
    }

    success(message: string): void {
        this.show(message, 'success');
    }

    info(message: string): void {
        this.show(message, 'info');
    }

    showPersistent(config: PersistentNotificationConfig): () => void {
        const ref = this.snackBar.open(config.message, config.actionLabel, {
            duration: 0,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: [`toast-${config.kind ?? 'info'}`, 'toast-persistent'],
            politeness: 'polite',
        });

        ref.onAction().subscribe(() => {
            config.onAction();
        });

        ref.afterDismissed().subscribe(({ dismissedByAction }) => {
            if (!dismissedByAction) {
                config.onDismiss?.();
            }
        });

        return () => ref.dismiss();
    }
}
