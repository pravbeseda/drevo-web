import { ListRange } from '@angular/cdk/collections';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { KnownSizeVirtualScrollStrategy } from './known-size-virtual-scroll-strategy';

const BUFFER_PX = 100;
const VIEWPORT_PX = 300;

interface FakeViewport {
    readonly viewport: CdkVirtualScrollViewport;
    readonly renderedRange: () => ListRange | undefined;
    readonly contentOffset: () => number | undefined;
    readonly totalSize: () => number | undefined;
    readonly scrollTo: (offset: number) => void;
    readonly setDataLength: (length: number) => void;
    readonly scrollToOffset: jest.Mock<void, [number, ScrollBehavior]>;
}

function createViewport(dataLength: number): FakeViewport {
    let scrollOffset = 0;
    let length = dataLength;
    let range: ListRange = { start: 0, end: 0 };
    const setRenderedRange = jest.fn((next: ListRange) => {
        range = next;
    });
    const setRenderedContentOffset = jest.fn<void, [number]>();
    const setTotalContentSize = jest.fn<void, [number]>();
    const scrollToOffset = jest.fn<void, [number, ScrollBehavior]>();
    const viewport = {
        getViewportSize: () => VIEWPORT_PX,
        getDataLength: () => length,
        measureScrollOffset: () => scrollOffset,
        getRenderedRange: () => range,
        setRenderedRange,
        setRenderedContentOffset,
        setTotalContentSize,
        scrollToOffset,
    } as unknown as CdkVirtualScrollViewport;

    return {
        viewport,
        renderedRange: () => setRenderedRange.mock.lastCall?.[0],
        contentOffset: () => setRenderedContentOffset.mock.lastCall?.[0],
        totalSize: () => setTotalContentSize.mock.lastCall?.[0],
        scrollTo: offset => (scrollOffset = offset),
        setDataLength: next => (length = next),
        scrollToOffset,
    };
}

describe('KnownSizeVirtualScrollStrategy', () => {
    // Items start at 0, 100, 150, 350, 450, 470, 570, 770, 870 and the last one ends at 1000.
    const SIZES = [100, 50, 200, 100, 20, 100, 200, 100, 130];

    let strategy: KnownSizeVirtualScrollStrategy;
    let fake: FakeViewport;

    beforeEach(() => {
        strategy = new KnownSizeVirtualScrollStrategy(BUFFER_PX);
        fake = createViewport(SIZES.length);
        strategy.setSizes(SIZES);
        strategy.attach(fake.viewport);
    });

    it('should size the scrolled area by the sum of the heights', () => {
        expect(fake.totalSize()).toBe(1000);
    });

    it('should render from the first item down to the buffer below the visible area', () => {
        expect(fake.renderedRange()).toEqual({ start: 0, end: 4 });
        expect(fake.contentOffset()).toBe(0);
    });

    it('should place the rendered items at the sum of the heights above the first of them', () => {
        fake.scrollTo(480);
        strategy.onContentScrolled();

        // The buffer reaches from 380 to 880: items 3 (350–450) to 8 (870–1000).
        expect(fake.renderedRange()).toEqual({ start: 3, end: 9 });
        expect(fake.contentOffset()).toBe(350);
    });

    it('should report the item at the top of the visible area', () => {
        const indices: number[] = [];
        strategy.scrolledIndexChange.subscribe(index => indices.push(index));

        fake.scrollTo(460);
        strategy.onContentScrolled();
        fake.scrollTo(470);
        strategy.onContentScrolled();

        expect(indices).toEqual([4, 5]);
    });

    it('should lay out new heights for the same items', () => {
        strategy.setSizes(SIZES.map(size => size * 2));

        expect(fake.totalSize()).toBe(2000);
        expect(fake.renderedRange()).toEqual({ start: 0, end: 3 });
    });

    it('should keep to the items the viewport has while their heights catch up with them', () => {
        fake.setDataLength(3);
        strategy.onDataLengthChanged();

        expect(fake.totalSize()).toBe(350);
        expect(fake.renderedRange()).toEqual({ start: 0, end: 3 });

        strategy.setSizes([100, 50]);

        expect(fake.totalSize()).toBe(150);
        expect(fake.renderedRange()).toEqual({ start: 0, end: 2 });
    });

    it('should scroll to where an item starts', () => {
        strategy.scrollToIndex(3, 'smooth');

        expect(fake.scrollToOffset).toHaveBeenCalledWith(350, 'smooth');
    });

    it('should wait for a viewport before laying anything out', () => {
        const unattached = new KnownSizeVirtualScrollStrategy(BUFFER_PX);

        expect(() => {
            unattached.setSizes(SIZES);
            unattached.onDataLengthChanged();
            unattached.onContentScrolled();
            unattached.scrollToIndex(1, 'auto');
        }).not.toThrow();
    });

    it('should stop following the scroll once detached', () => {
        const completed = jest.fn();
        strategy.scrolledIndexChange.subscribe({ complete: completed });

        strategy.detach();
        fake.scrollTo(480);
        strategy.onContentScrolled();

        expect(completed).toHaveBeenCalled();
        expect(fake.renderedRange()).toEqual({ start: 0, end: 4 });
    });
});
