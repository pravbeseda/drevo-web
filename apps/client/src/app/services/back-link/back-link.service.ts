import { Injectable, signal } from '@angular/core';

/**
 * The way back a page offers in the header while it hides the list it came
 * from — a topic that took the list's place on a narrow screen.
 */
@Injectable({ providedIn: 'root' })
export class BackLinkService {
    private readonly _link = signal<string | undefined>(undefined);

    readonly link = this._link.asReadonly();

    show(link: string): void {
        this._link.set(link);
    }

    /** Drops `link` only while it is still the one shown: the next page may have shown its own first. */
    hide(link: string): void {
        if (this._link() === link) {
            this._link.set(undefined);
        }
    }
}
