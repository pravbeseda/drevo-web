import { KnownSizeVirtualScrollStrategy } from './known-size-virtual-scroll-strategy';
import { CdkVirtualScrollViewport, VirtualScrollStrategy } from '@angular/cdk/scrolling';
import { AutoSizeVirtualScrollStrategy } from '@angular/cdk-experimental/scrolling';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

const MIN_BUFFER_PX = 200;
const MAX_BUFFER_PX = 400;

/**
 * Delegating scroll strategy: measures the items as they render, or places
 * them by heights it is given. The choice must be made before the viewport's
 * ngOnInit.
 */
@Injectable()
export class FlexibleVirtualScrollStrategy implements VirtualScrollStrategy {
    // Always there, so heights handed over before the switch are not lost.
    private readonly knownSizes = new KnownSizeVirtualScrollStrategy(MAX_BUFFER_PX);
    private delegate: VirtualScrollStrategy = new AutoSizeVirtualScrollStrategy(MIN_BUFFER_PX, MAX_BUFFER_PX);

    get scrolledIndexChange(): Observable<number> {
        return this.delegate.scrolledIndexChange;
    }

    /** Places the items by the heights `setItemSizes` hands over instead of measuring them. */
    useKnownSizes(): void {
        this.delegate = this.knownSizes;
    }

    setItemSizes(sizes: readonly number[]): void {
        this.knownSizes.setSizes(sizes);
    }

    attach(viewport: CdkVirtualScrollViewport): void {
        this.delegate.attach(viewport);
    }

    detach(): void {
        this.delegate.detach();
    }

    onContentScrolled(): void {
        this.delegate.onContentScrolled();
    }

    onDataLengthChanged(): void {
        this.delegate.onDataLengthChanged();
    }

    onContentRendered(): void {
        this.delegate.onContentRendered();
    }

    onRenderedOffsetChanged(): void {
        this.delegate.onRenderedOffsetChanged();
    }

    scrollToIndex(index: number, behavior: ScrollBehavior): void {
        this.delegate.scrollToIndex(index, behavior);
    }
}
