import { isPlatformBrowser } from '@angular/common';
import {
    computed,
    effect,
    inject,
    Injectable,
    PLATFORM_ID,
    signal,
} from '@angular/core';
import { StorageService } from '@drevo-web/core';

const FONT_SCALE_KEY = 'drevo-font-scale';
const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.5;
const SCALE_STEP = 0.1;
const BASE_FONT_SIZE = 14;

@Injectable({
    providedIn: 'root',
})
export class FontScaleService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);
    private readonly storage = inject(StorageService);

    private readonly _scale = signal<number>(this.getInitialScale());
    readonly scale = this._scale.asReadonly();

    readonly scalePercent = computed(() => Math.round(this._scale() * 100));
    readonly canIncrease = computed(() => this._scale() < MAX_SCALE);
    readonly canDecrease = computed(() => this._scale() > MIN_SCALE);
    readonly isDefault = computed(() => this._scale() === DEFAULT_SCALE);

    constructor() {
        effect(() => {
            const currentScale = this._scale();
            if (this.isBrowser) {
                this.applyScale(currentScale);
            }
            this.saveScale(currentScale);
        });
    }

    increase(): void {
        if (this.canIncrease()) {
            this._scale.update(current =>
                Math.min(MAX_SCALE, Math.round((current + SCALE_STEP) * 10) / 10)
            );
        }
    }

    decrease(): void {
        if (this.canDecrease()) {
            this._scale.update(current =>
                Math.max(MIN_SCALE, Math.round((current - SCALE_STEP) * 10) / 10)
            );
        }
    }

    reset(): void {
        this._scale.set(DEFAULT_SCALE);
    }

    private getInitialScale(): number {
        const savedScale = this.storage.get<number>(FONT_SCALE_KEY);
        if (
            savedScale !== undefined &&
            savedScale >= MIN_SCALE &&
            savedScale <= MAX_SCALE
        ) {
            return savedScale;
        }
        return DEFAULT_SCALE;
    }

    private applyScale(scale: number): void {
        document.documentElement.style.fontSize = `${BASE_FONT_SIZE * scale}px`;
    }

    private saveScale(scale: number): void {
        if (scale === DEFAULT_SCALE) {
            this.storage.remove(FONT_SCALE_KEY);
        } else {
            this.storage.set(FONT_SCALE_KEY, scale);
        }
    }
}
