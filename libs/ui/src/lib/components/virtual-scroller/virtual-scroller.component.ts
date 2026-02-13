import { VirtualScrollerItemDirective } from './virtual-scroller-item.directive';
import { SpinnerComponent } from '../spinner/spinner.component';
import { CdkVirtualForOf, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { CdkAutoSizeVirtualScroll } from '@angular/cdk-experimental/scrolling';
import { NgTemplateOutlet } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    computed,
    contentChild,
    DestroyRef,
    inject,
    input,
    output,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, throttleTime } from 'rxjs';

export { VirtualScrollerItemDirective } from './virtual-scroller-item.directive';

/** Default number of items from the end to trigger loading more */
const DEFAULT_LOAD_MORE_THRESHOLD = 5;

/**
 * Context provided to the item template
 */
export interface VirtualScrollerItemContext<T> {
    /** The item data */
    $implicit: T;
    /** Index of the item in the list */
    index: number;
}

@Component({
    selector: 'ui-virtual-scroller',
    imports: [NgTemplateOutlet, CdkVirtualScrollViewport, CdkVirtualForOf, CdkAutoSizeVirtualScroll, SpinnerComponent],
    templateUrl: './virtual-scroller.component.html',
    styleUrl: './virtual-scroller.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VirtualScrollerComponent<T> implements AfterViewInit {
    private readonly destroyRef = inject(DestroyRef);

    /** Items to display in the virtual scroll */
    readonly items = input.required<readonly T[]>();

    /** Number of items from the end to trigger loadMore event */
    readonly loadMoreThreshold = input<number>(DEFAULT_LOAD_MORE_THRESHOLD);

    /** Total number of items available (for determining if more can be loaded) */
    readonly totalItems = input<number>(0);

    /** Whether more items are currently being loaded */
    readonly isLoading = input<boolean>(false);

    /** Track by function for cdkVirtualFor */
    readonly trackByFn = input<(index: number, item: T) => unknown>((index: number) => index);

    /** Emitted when more items should be loaded */
    readonly loadMore = output<void>();

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

    /** Whether the loading indicator should be shown */
    readonly showLoadingIndicator = computed(() => this.isLoading() && this.items().length > 0);

    ngAfterViewInit(): void {
        this.setupScrollListener();
    }

    private setupScrollListener(): void {
        const viewport = this.viewport();

        // Use elementScrolled() instead of scrolledIndexChange for autosize strategy
        viewport
            .elementScrolled()
            .pipe(
                throttleTime(100, undefined, { leading: true, trailing: true }),
                filter(() => !this.isLoading() && !this.allItemsLoaded()),
                filter(() => this.shouldLoadMore()),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => {
                this.loadMore.emit();
            });
    }

    private shouldLoadMore(): boolean {
        const viewport = this.viewport();
        const items = this.items();
        const threshold = this.loadMoreThreshold();

        // Get rendered range from CDK - this is accurate for autosize
        const renderedRange = viewport.getRenderedRange();
        const lastRenderedIndex = renderedRange.end;
        const itemsRemaining = items.length - lastRenderedIndex;

        return itemsRemaining <= threshold;
    }
}
