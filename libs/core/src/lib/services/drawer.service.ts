import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class DrawerService {
    readonly isOpen = signal(true);

    toggle(): void {
        this.isOpen.update(v => !v);
    }

    open(): void {
        this.isOpen.set(true);
    }

    close(): void {
        this.isOpen.set(false);
    }
}
