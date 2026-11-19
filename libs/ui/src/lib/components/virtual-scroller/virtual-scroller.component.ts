import { ScrollbarDirective } from '../scrollbar/scrollbar.directive';
import { SpinnerComponent } from '../spinner/spinner.component';
import { FlexibleVirtualScrollStrategy } from './flexible-virtual-scroll-strategy';
import { VirtualScrollerItemDirective } from './virtual-scroller-item.directive';
import {
    CdkVirtualForOf,
    CdkVirtualScrollableElement,
    CdkVirtualScrollViewport,
    VIRTUAL_SCROLL_STRATEGY,
} from '@angular/cdk/scrolling';
import { NgTemplateOutlet } from '@angular/common';
import {
    afterNextRender,
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    computed,
    contentChild,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    input,
    OnInit,
    output,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, filter, merge, tap, throttleTime } from 'rxjs';

export { VirtualScrollerItemDirective } from './virtual-scroller-item.directive';

/** Default number of items from the end to trigger loading more */
const DEFAULT_LOAD_MORE_THRESHOLD = 5;

const SCROLL_SAMPLE_MS = 100;

/** Above this speed a page requested now only moves the end the wheel's momentum would otherwise stop at. */
const MAX_LOAD_MORE_SCROLL_PX_PER_MS = 1.5;

/** Longer than SCROLL_SAMPLE_MS, so that the trailing sample cannot follow it and report the old speed. */
const SCROLL_SETTLED_MS = 150;

/**
 * Context provided to the item template
 */
export interface VirtualScrollerItemContext<T> {
    /** The item data */
    $implicit: T;
    /** Index of the item in the list */
    index: number;
}

/**
 * A lazily rendered list. The host is the scroll container and carries the
 * app's scrollbar; content projected next to the item template follows the
 * rows inside the scrolled area.
 */
@Component({
    selector: 'ui-virtual-scroller',
    imports: [NgTemplateOutlet, CdkVirtualScrollViewport, CdkVirtualForOf, SpinnerComponent],
    templateUrl: './virtual-scroller.component.html',
    styleUrl: './virtual-scroller.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    hostDirectives: [CdkVirtualScrollableElement, ScrollbarDirective],
    providers: [
        FlexibleVirtualScrollStrategy,
        { provide: VIRTUAL_SCROLL_STRATEGY, useExisting: FlexibleVirtualScrollStrategy },
    ],
})
export class VirtualScrollerComponent<T> implements OnInit, AfterViewInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly scrollable = inject(CdkVirtualScrollableElement);
    private readonly scrollStrategy = inject(FlexibleVirtualScrollStrategy);

    private scrollSample = { top: 0, time: 0 };
    private scrollSpeed = 0;

    /** Items to display in the virtual scroll */
    readonly items = input.required<readonly T[]>();

    /**
     * Each item's height in pixels, margins included, when the layout knows it before rendering:
     * the items are then placed by it instead of measured as they render.
     */
    readonly itemSize = input<(item: T) => number>();

    /** Number of items from the end to trigger loadMore event */
    readonly loadMoreThreshold = input<number>(DEFAULT_LOAD_MORE_THRESHOLD);

    /** Total number of items available (for determining if more can be loaded) */
    readonly totalItems = input<number>(0);

    /** Whether more items are currently being loaded */
    readonly isLoading = input<boolean>(false);

    /** Track by function for cdkVirtualFor */
    readonly trackByFn = input<(index: number, item: T) => unknown>((index: number) => index);

    /** Emitted when more items should be loaded */
    readonly loadMore = output();

    /** Reference to the viewport for scroll handling */
    readonly viewport = viewChild.required(CdkVirtualScrollViewport);

    /** Template directive for rendering each item */
    readonly itemTemplateDirective = contentChild(VirtualScrollerItemDirective);

    /** Get the template from the directive */
    readonly itemTemplate = computed(() => this.itemTemplateDirective()?.template);

    /** Whether all items have been loaded */
    readonly allItemsLoaded = computed(() => {
        const total = this.totalItems();
        const currentCount = this.items().length;
        return total > 0 && currentCount >= total;
    });

    /** The size of the whole collection for assistive technology, which sees only the rendered rows. */
    readonly setSize = computed(() => this.totalItems() || this.items().length);

    /** Whether the loading indicator should be shown */
    readonly showLoadingIndicator = computed(() => this.isLoading() && this.items().length > 0);

    // Not isLoading: after a failed page the list stays as it was, and checking then would ask for it again at once.
    private readonly itemsChange$ = toObservable(this.items);

    constructor() {
        afterNextRender(() => this.watchOwnSize());
        effect(() => {
            const itemSize = this.itemSize();
            if (itemSize) {
                this.scrollStrategy.setItemSizes(this.items().map(itemSize));
            }
        });
    }

    ngOnInit(): void {
        if (this.itemSize()) {
            this.scrollStrategy.useKnownSizes();
        }
    }

    ngAfterViewInit(): void {
        this.setupScrollListener();
    }

    /**
     * The viewport measures itself on window resizes only, so a list shown
     * again after `display: none`, or squeezed by a neighbour, would keep
     * rendering for its old height.
     */
    private watchOwnSize(): void {
        if (typeof ResizeObserver === 'undefined') {
            return;
        }
        const observer = new ResizeObserver(() => this.viewport().checkViewportSize());
        observer.observe(this.host);
        this.destroyRef.onDestroy(() => observer.disconnect());
    }

    private setupScrollListener(): void {
        const viewport = this.viewport();

        const scrolled$ = this.scrollable.elementScrolled();

        const scroll$ = scrolled$.pipe(
            throttleTime(SCROLL_SAMPLE_MS, undefined, { leading: true, trailing: true }),
            tap(() => this.sampleScrollSpeed()),
        );

        // A scroll stopped at the end of the list emits nothing more, so its rest has to be a signal of its own.
        const scrollSettled$ = scrolled$.pipe(
            debounceTime(SCROLL_SETTLED_MS),
            tap(() => (this.scrollSpeed = 0)),
        );

        // Also check when CDK updates the rendered range — covers the case where
        // all items fit in the viewport without scrolling (e.g. wide screen) — and when
        // the items change: CDK keeps the range for a list replaced by one of the same length.
        // debounceTime(0) collapses any synchronous batch of updates into one emission.
        const listChange$ = merge(viewport.renderedRangeStream, this.itemsChange$).pipe(debounceTime(0));

        merge(scroll$, scrollSettled$, listChange$)
            .pipe(
                // Teardown completes itemsChange$ before this subscription ends, and debounceTime flushes on completion.
                filter(() => !this.destroyRef.destroyed),
                filter(() => this.scrollSpeed <= MAX_LOAD_MORE_SCROLL_PX_PER_MS),
                filter(() => !this.isLoading() && !this.allItemsLoaded()),
                filter(() => this.shouldLoadMore()),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => {
                this.loadMore.emit();
            });
    }

    private sampleScrollSpeed(): void {
        const sample = { top: this.host.scrollTop, time: Date.now() };
        this.scrollSpeed = Math.abs(sample.top - this.scrollSample.top) / (sample.time - this.scrollSample.time);
        this.scrollSample = sample;
    }

    private shouldLoadMore(): boolean {
        const viewport = this.viewport();
        const items = this.items();
        const threshold = this.loadMoreThreshold();

        const renderedRange = viewport.getRenderedRange();
        const lastRenderedIndex = renderedRange.end;
        // No row drawn, no reader at the end yet: the range stream checks again once rows are drawn.
        if (lastRenderedIndex === 0) {
            return false;
        }
        const itemsRemaining = items.length - lastRenderedIndex;

        return itemsRemaining <= threshold;
    }
}
