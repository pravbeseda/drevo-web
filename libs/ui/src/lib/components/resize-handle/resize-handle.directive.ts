import { afterNextRender, Directive, ElementRef, inject, input, signal } from '@angular/core';
import { StorageService, WINDOW } from '@drevo-web/core';

export type ResizeOrientation = 'horizontal' | 'vertical';

interface ResizeBounds {
    readonly min: number;
    readonly max: number | undefined;
}

interface DragStart {
    readonly position: number;
    readonly size: number;
}

const SIZE_PROPERTY = '--ui-resize-size';
const PRIMARY_BUTTON = 0;
const KEYBOARD_STEP_PX = 16;
const PERCENT = 100;

/**
 * A handle that resizes the element before it — `[uiResizeHandle]="target"` — by
 * dragging or with the arrow keys. The size lands in `--ui-resize-size` on the
 * target, and the target's own CSS decides what to do with it. Its `min-*` and
 * `max-*` bound the size, and the handle reads them, so a drag stops where the
 * CSS does and a percentage `max-*` follows the parent. The look lives in
 * `styles/_resize-handle.scss`.
 */
@Directive({
    selector: '[uiResizeHandle]',
    host: {
        class: 'ui-resize-handle',
        role: 'separator',
        tabindex: '0',
        '[attr.aria-orientation]': "orientation() === 'horizontal' ? 'vertical' : 'horizontal'",
        '[attr.aria-valuenow]': 'size()',
        '[attr.aria-valuemin]': 'bounds()?.min',
        '[attr.aria-valuemax]': 'bounds()?.max',
        '(pointerdown)': 'startDrag($event)',
        '(pointermove)': 'drag($event)',
        '(pointerup)': 'endDrag($event)',
        '(pointercancel)': 'endDrag($event)',
        '(keydown)': 'step($event)',
    },
})
export class ResizeHandleDirective {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly window = inject(WINDOW);
    private readonly storage = inject(StorageService);

    readonly target = input.required<HTMLElement>({ alias: 'uiResizeHandle' });
    /** The direction the target grows in: `horizontal` resizes its width. */
    readonly orientation = input<ResizeOrientation>('horizontal');
    /** Where the chosen size is remembered; nothing is remembered without one. */
    readonly storageKey = input<string | undefined>(undefined);

    protected readonly size = signal<number | undefined>(undefined);
    protected readonly bounds = signal<ResizeBounds | undefined>(undefined);
    private dragStart: DragStart | undefined;

    constructor() {
        afterNextRender(() => {
            const key = this.storageKey();
            const stored = key ? this.storage.get<number>(key) : undefined;
            if (typeof stored === 'number') {
                this.resize(stored);
            } else {
                this.size.set(this.measure());
                this.bounds.set(this.readBounds());
            }
        });
    }

    protected startDrag(event: PointerEvent): void {
        if (event.button !== PRIMARY_BUTTON) {
            return;
        }
        event.preventDefault();
        this.host.setPointerCapture(event.pointerId);
        this.dragStart = { position: this.position(event), size: this.measure() };
    }

    protected drag(event: PointerEvent): void {
        if (this.dragStart) {
            this.resize(this.dragStart.size + this.position(event) - this.dragStart.position);
        }
    }

    protected endDrag(event: PointerEvent): void {
        if (!this.dragStart) {
            return;
        }
        this.dragStart = undefined;
        this.host.releasePointerCapture(event.pointerId);
        this.remember();
    }

    protected step(event: KeyboardEvent): void {
        const [shrinkKey, growKey] =
            this.orientation() === 'horizontal' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
        let delta: number;
        if (event.key === growKey) {
            delta = KEYBOARD_STEP_PX;
        } else if (event.key === shrinkKey) {
            delta = -KEYBOARD_STEP_PX;
        } else {
            return;
        }
        event.preventDefault();
        this.resize((this.size() ?? this.measure()) + delta);
        this.remember();
    }

    private resize(requested: number): void {
        const bounds = this.readBounds();
        const size = Math.round(Math.min(Math.max(requested, bounds.min), bounds.max ?? Number.POSITIVE_INFINITY));
        this.target().style.setProperty(SIZE_PROPERTY, `${size}px`);
        this.size.set(size);
        this.bounds.set(bounds);
    }

    private remember(): void {
        const key = this.storageKey();
        const size = this.size();
        if (key && size !== undefined) {
            this.storage.set(key, size);
        }
    }

    private position(event: PointerEvent): number {
        return this.orientation() === 'horizontal' ? event.clientX : event.clientY;
    }

    private measure(): number {
        const rect = this.target().getBoundingClientRect();
        return Math.round(this.orientation() === 'horizontal' ? rect.width : rect.height);
    }

    private readBounds(): ResizeBounds {
        const target = this.target();
        const style = this.window?.getComputedStyle(target);
        const parent = target.parentElement;
        const horizontal = this.orientation() === 'horizontal';
        const parentSize = (horizontal ? parent?.clientWidth : parent?.clientHeight) ?? 0;
        return {
            min: toPixels(horizontal ? style?.minWidth : style?.minHeight, parentSize) ?? 0,
            max: toPixels(horizontal ? style?.maxWidth : style?.maxHeight, parentSize),
        };
    }
}

/** A computed `min-*`/`max-*` in pixels; `none`, `auto` and the like bound nothing. */
function toPixels(value: string | undefined, parentSize: number): number | undefined {
    if (value?.endsWith('px')) {
        return parseFloat(value);
    }
    if (value?.endsWith('%')) {
        return (parentSize * parseFloat(value)) / PERCENT;
    }
    return undefined;
}
