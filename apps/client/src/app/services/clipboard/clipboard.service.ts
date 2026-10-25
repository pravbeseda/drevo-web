import { Injectable, inject } from '@angular/core';
import { LoggerService, NotificationService, WINDOW } from '@drevo-web/core';
import { Observable, from, throwError } from 'rxjs';

/** The notices shown once the text is on the clipboard, and when it could not be put there. */
export interface CopyFeedback {
    readonly success: string;
    readonly failure: string;
}

@Injectable({
    providedIn: 'root',
})
export class ClipboardService {
    private readonly window = inject(WINDOW, { optional: true });
    private readonly notification = inject(NotificationService);
    private readonly logger = inject(LoggerService).withContext('ClipboardService');

    /** Put the text on the clipboard and tell the user how it went. */
    copy(text: string, feedback: CopyFeedback): void {
        this.write(text).subscribe({
            complete: () => {
                this.notification.success(feedback.success);
                this.logger.info('Text copied', { text });
            },
            error: (err: unknown) => {
                this.notification.error(feedback.failure);
                this.logger.error('Copy failed', err);
            },
        });
    }

    // Where the API is missing — a non-secure context, the server render — the stream fails at once rather than throws.
    private write(text: string): Observable<void> {
        // lib.dom types `navigator.clipboard` as always present; it is missing
        // in non-secure contexts.
        const clipboard: Clipboard | undefined = this.window?.navigator.clipboard;
        if (!clipboard) {
            return throwError(() => new Error('Clipboard API unavailable'));
        }

        return from(clipboard.writeText(text));
    }
}
