import { afterNextRender, DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';

/**
 * Emits each time the element scrolls into view. The observer exists only in
 * the browser; a server render never emits.
 */
@Directive({
    selector: '[uiInView]',
})
export class InViewDirective {
    private readonly element = inject<ElementRef<Element>>(ElementRef);
    private readonly destroyRef = inject(DestroyRef);

    readonly uiInView = output();

    constructor() {
        afterNextRender(() => {
            if (typeof IntersectionObserver === 'undefined') {
                return;
            }
            const observer = new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                    this.uiInView.emit();
                }
            });
            observer.observe(this.element.nativeElement);
            this.destroyRef.onDestroy(() => observer.disconnect());
        });
    }
}
