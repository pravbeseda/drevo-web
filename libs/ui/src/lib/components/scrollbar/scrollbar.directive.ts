import { afterNextRender, DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core';
import { LoggerService } from '@drevo-web/core';

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
                    // The host doubles as the viewport, so the library leaves Angular's children where they are.
                    const scrollbar = OverlayScrollbars(
                        { target: host, elements: { viewport: host } },
                        {
                            scrollbars: {
                                theme: 'ui-scrollbar',
                                autoHide: 'leave',
                                autoHideDelay: HIDE_DELAY_MS,
                                clickScroll: 'instant',
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
}
