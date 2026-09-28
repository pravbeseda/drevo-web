import { Injectable, inject } from '@angular/core';
import { WINDOW } from '@drevo-web/core';
import { Observable, from, throwError } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ClipboardService {
    private readonly window = inject(WINDOW, { optional: true });

    /**
     * Put the text on the clipboard. Where the API is missing — a non-secure
     * context, the server render — the stream fails at once rather than throws.
     */
    copy(text: string): Observable<void> {
        // lib.dom types `navigator.clipboard` as always present; it is missing
        // in non-secure contexts.
        const clipboard: Clipboard | undefined = this.window?.navigator.clipboard;
        if (!clipboard) {
            return throwError(() => new Error('Clipboard API unavailable'));
        }

        return from(clipboard.writeText(text));
    }
}
