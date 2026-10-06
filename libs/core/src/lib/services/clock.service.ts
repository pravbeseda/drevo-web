import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

const TICK_MS = 60 * 1000;

/**
 * The current moment as a signal, for text that ages — «5 мин. назад». It moves
 * once a minute in the browser and stays at the moment of the render on the server.
 */
@Injectable({
    providedIn: 'root',
})
export class ClockService {
    private readonly _now = signal(new Date());
    readonly now = this._now.asReadonly();

    constructor() {
        if (!isPlatformBrowser(inject(PLATFORM_ID))) {
            return;
        }
        interval(TICK_MS)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this._now.set(new Date()));
    }
}
