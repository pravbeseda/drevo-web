import { StorageService } from './storage.service';
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

const DRAWER_STORAGE_KEY = 'drevo-sidebar-open';
const DEFAULT_OPEN = true;

@Injectable({
    providedIn: 'root',
})
export class DrawerService {
    private readonly storage = inject(StorageService);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    private readonly _isOpen = signal(false);
    readonly isOpen = this._isOpen.asReadonly();

    toggle(): void {
        this._isOpen.update(v => !v);
        this.save(this._isOpen());
    }

    open(): void {
        this._isOpen.set(true);
    }

    close(): void {
        this._isOpen.set(false);
    }

    restoreSaved(): void {
        this._isOpen.set(this.loadSaved());
    }

    private loadSaved(): boolean {
        if (!this.isBrowser) {
            return DEFAULT_OPEN;
        }
        return this.storage.get<boolean>(DRAWER_STORAGE_KEY) ?? DEFAULT_OPEN;
    }

    private save(isOpen: boolean): void {
        if (!this.isBrowser) {
            return;
        }
        this.storage.set(DRAWER_STORAGE_KEY, isOpen);
    }
}
