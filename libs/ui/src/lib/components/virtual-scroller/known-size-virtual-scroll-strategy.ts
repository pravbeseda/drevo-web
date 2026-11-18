import { CdkVirtualScrollViewport, VirtualScrollStrategy } from '@angular/cdk/scrolling';
import { distinctUntilChanged, Observable, Subject } from 'rxjs';

/**
 * Lays out items whose heights are known before they render: each sits at the
 * sum of the heights above it, so nothing is measured and the rows on screen
 * stay put when the rendered range moves.
 */
export class KnownSizeVirtualScrollStrategy implements VirtualScrollStrategy {
    private readonly scrolledIndexSubject = new Subject<number>();
    readonly scrolledIndexChange: Observable<number> = this.scrolledIndexSubject.pipe(distinctUntilChanged());

    private viewport: CdkVirtualScrollViewport | undefined;
    /** Where each item starts, with one entry more for where the last one ends. */
    private offsets: readonly number[] = [0];

    constructor(private readonly bufferPx: number) {}

    setSizes(sizes: readonly number[]): void {
        const offsets = [0];
        for (const size of sizes) {
            offsets.push(offsets[offsets.length - 1] + size);
        }
        this.offsets = offsets;
        this.update();
    }

    attach(viewport: CdkVirtualScrollViewport): void {
        this.viewport = viewport;
        this.update();
    }

    detach(): void {
        this.scrolledIndexSubject.complete();
        this.viewport = undefined;
    }

    onContentScrolled(): void {
        this.updateRenderedRange();
    }

    onDataLengthChanged(): void {
        this.update();
    }

    onContentRendered(): void {
        // The heights are known up front, so there is nothing to measure.
    }

    onRenderedOffsetChanged(): void {
        // The offset is set here and nowhere else.
    }

    scrollToIndex(index: number, behavior: ScrollBehavior): void {
        if (this.viewport) {
            this.viewport.scrollToOffset(this.offsets[Math.min(index, this.itemCount(this.viewport))], behavior);
        }
    }

    private update(): void {
        if (this.viewport) {
            this.viewport.setTotalContentSize(this.offsets[this.itemCount(this.viewport)]);
            this.updateRenderedRange();
        }
    }

    private updateRenderedRange(): void {
        const viewport = this.viewport;
        if (!viewport) {
            return;
        }
        const count = this.itemCount(viewport);
        const scrollOffset = viewport.measureScrollOffset();
        const start = this.indexAt(scrollOffset - this.bufferPx, count);
        const end = Math.min(count, this.indexAt(scrollOffset + viewport.getViewportSize() + this.bufferPx, count) + 1);
        viewport.setRenderedRange({ start, end });
        viewport.setRenderedContentOffset(this.offsets[start]);
        this.scrolledIndexSubject.next(this.indexAt(scrollOffset, count));
    }

    /** The items both sides know: new items reach the viewport and their heights arrive here in either order. */
    private itemCount(viewport: CdkVirtualScrollViewport): number {
        return Math.min(viewport.getDataLength(), this.offsets.length - 1);
    }

    /** The last of the first `count` items starting at or above the offset. */
    private indexAt(offset: number, count: number): number {
        let low = 0;
        let high = Math.max(0, count - 1);
        while (low < high) {
            const middle = Math.ceil((low + high) / 2);
            if (this.offsets[middle] <= offset) {
                low = middle;
            } else {
                high = middle - 1;
            }
        }
        return low;
    }
}
