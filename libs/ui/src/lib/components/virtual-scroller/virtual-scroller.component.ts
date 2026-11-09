import { FlexibleVirtualScrollStrategy } from './flexible-virtual-scroll-strategy';
import { VirtualScrollerItemDirective } from './virtual-scroller-item.directive';
import { ScrollbarDirective } from '../scrollbar/scrollbar.directive';
import { SpinnerComponent } from '../spinner/spinner.component';
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
    ElementRef,
    inject,
    input,
    OnInit,
    output,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

    /** Fixed height of each item in pixels. When set, uses fixed-size strategy (better performance). When omitted, uses autosize strategy (variable-height items). */
    readonly itemSize = input<number | undefined>();

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

    constructor() {
        afterNextRender(() => this.watchOwnSize());
    }

    ngOnInit(): void {
        this.scrollStrategy.configure(this.itemSize());
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
        // all items fit in the viewport without scrolling (e.g. wide screen).
        // debounceTime(0) collapses any synchronous batch of range updates into one emission.
        const rangeChange$ = viewport.renderedRangeStream.pipe(debounceTime(0));

        merge(scroll$, scrollSettled$, rangeChange$)
            .pipe(
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
        const itemsRemaining = items.length - lastRenderedIndex;

        return itemsRemaining <= threshold;
    }
}
