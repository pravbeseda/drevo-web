import {
    CdkVirtualScrollViewport,
    FixedSizeVirtualScrollStrategy,
    VirtualScrollStrategy,
} from '@angular/cdk/scrolling';
import { AutoSizeVirtualScrollStrategy } from '@angular/cdk-experimental/scrolling';
import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';

const MIN_BUFFER_PX = 200;
const MAX_BUFFER_PX = 400;

/**
 * Delegating scroll strategy that switches between fixed-size and autosize
 * based on configuration. Must be configured before the viewport's ngOnInit.
 */
@Injectable()
export class FlexibleVirtualScrollStrategy implements VirtualScrollStrategy {
    private delegate!: VirtualScrollStrategy;

    get scrolledIndexChange(): Observable<number> {
        return this.delegate?.scrolledIndexChange ?? EMPTY;
    }

    configure(itemSize: number | undefined): void {
        if (itemSize !== undefined) {
            this.delegate = new FixedSizeVirtualScrollStrategy(itemSize, MIN_BUFFER_PX, MAX_BUFFER_PX);
        } else {
            this.delegate = new AutoSizeVirtualScrollStrategy(MIN_BUFFER_PX, MAX_BUFFER_PX);
        }
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
