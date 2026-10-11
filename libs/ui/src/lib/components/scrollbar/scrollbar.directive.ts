import { DOCUMENT } from '@angular/common';
import { afterNextRender, DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core';
import { LoggerService } from '@drevo-web/core';
import type { OverlayScrollbars as OverlayScrollbarsInstance } from 'overlayscrollbars';

const HIDE_DELAY_MS = 200;

/**
 * Opts a scroll container into the app's custom scrollbar. How it is drawn is
 * decided here and in `styles/_scrollbar.scss` only, so consumers never change.
 */
@Directive({
    selector: '[uiScrollbar]',
    // Hides the native scrollbar until the custom one is drawn, and hands it back if that fails.
    host: { '[attr.data-overlayscrollbars-initialize]': 'nativeScrollbarHidden() ? "" : null' },
})
export class ScrollbarDirective {
    protected readonly nativeScrollbarHidden = signal(true);

    private readonly document = inject(DOCUMENT);

    constructor() {
        const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
        const destroyRef = inject(DestroyRef);
        const logger = inject(LoggerService).withContext('ScrollbarDirective');

        afterNextRender(() => {
            // Loaded lazily to keep the library out of the initial bundle.
            import('overlayscrollbars')
                .then(({ OverlayScrollbars }) => {
                    if (destroyRef.destroyed) {
                        return;
                    }
                    const slot = this.createSlot(host);
                    // The host doubles as the viewport, so the library leaves Angular's children where they are.
                    const scrollbar = OverlayScrollbars(
                        { target: host, elements: { viewport: host }, scrollbars: { slot } },
                        {
                            scrollbars: {
                                theme: 'ui-scrollbar',
                                autoHide: 'leave',
                                autoHideDelay: HIDE_DELAY_MS,
                                clickScroll: 'instant',
                            },
                        },
                        {
                            initialized: instance => this.sizeSlot(slot, instance),
                            updated: (instance, { updateHints }) => {
                                if (updateHints.overflowEdgeChanged) {
                                    this.sizeSlot(slot, instance);
                                }
                            },
                        },
                    );
                    destroyRef.onDestroy(() => scrollbar.destroy());
                })
                .catch((err: unknown) => {
                    logger.error('Failed to draw the custom scrollbar', err);
                    this.nativeScrollbarHidden.set(false);
                });
        });
    }

    /**
     * The bars' own box. Drawn straight into the host, a bar scrolls with the
     * content and the library shifts it back by the scroll offset, which holds
     * the scrolled-to height open after the content shrinks: the reader is
     * left below the end of it. The slot sticks to the visible area instead.
     */
    private createSlot(host: HTMLElement): HTMLElement {
        const slot = this.document.createElement('div');
        slot.className = 'ui-scrollbar-slot';
        host.prepend(slot);

        return slot;
    }

    /** Spans the visible height of the host while taking no room in its flow. */
    private sizeSlot(slot: HTMLElement, instance: OverlayScrollbarsInstance): void {
        const height = instance.state().overflowEdge.y;
        slot.style.height = `${height}px`;
        slot.style.marginBottom = `${-height}px`;
    }
}
