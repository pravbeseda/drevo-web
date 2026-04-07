import { ScrollingModule } from '@angular/cdk/scrolling';
import { fakeAsync, tick } from '@angular/core/testing';
import { SpectatorHost, createHostFactory } from '@ngneat/spectator/jest';
import { VirtualScrollerComponent } from './virtual-scroller.component';

interface TestItem {
    id: number;
    name: string;
}

interface ScrollerHostOptions {
    readonly itemCount?: number;
    readonly totalItems?: number;
    readonly isLoading?: boolean;
    readonly threshold?: number;
}

const createHost = createHostFactory({
    component: VirtualScrollerComponent<TestItem>,
    imports: [ScrollingModule],
});

describe('VirtualScrollerComponent', () => {
    let spectator: SpectatorHost<VirtualScrollerComponent<TestItem>>;

    it('should create', () => {
        spectator = createScrollerHost({ itemCount: 0, totalItems: 0 });
        expect(spectator.component).toBeTruthy();
    });

    it('should show loading indicator when isLoading is true and items exist', () => {
        spectator = createScrollerHost({ itemCount: 1, totalItems: 10, isLoading: true });
        spectator.detectChanges();
        expect(spectator.query('ui-spinner')).toBeTruthy();
    });

    it('should not show loading indicator when isLoading is false', () => {
        spectator = createScrollerHost({ itemCount: 1, totalItems: 10 });
        spectator.detectChanges();
        expect(spectator.query('ui-spinner')).toBeFalsy();
    });

    it('should not show loading indicator when no items exist', () => {
        spectator = createScrollerHost({ itemCount: 0, totalItems: 10, isLoading: true });
        spectator.detectChanges();
        expect(spectator.query('ui-spinner')).toBeFalsy();
    });

    describe('allItemsLoaded', () => {
        it('should return true when all items are loaded', () => {
            spectator = createScrollerHost({ itemCount: 2, totalItems: 2 });
            spectator.detectChanges();
            expect(spectator.component.allItemsLoaded()).toBe(true);
        });

        it('should return false when more items can be loaded', () => {
            spectator = createScrollerHost({ itemCount: 1, totalItems: 10 });
            spectator.detectChanges();
            expect(spectator.component.allItemsLoaded()).toBe(false);
        });

        it('should return false when totalItems is 0', () => {
            spectator = createScrollerHost({ itemCount: 1, totalItems: 0 });
            spectator.detectChanges();
            expect(spectator.component.allItemsLoaded()).toBe(false);
        });
    });

    describe('loadMore emission guards', () => {
        // These tests exercise the scroll$ path (native scroll events → throttleTime).
        // The rangeChange$ path (viewport.renderedRangeStream → debounceTime(0)), which fixes
        // the wide-screen case where all items fit without scrolling, is not unit-testable here:
        // JSDOM has no layout engine, so renderedRangeStream never emits in Jest.
        // Wide-screen auto-load is covered by the Playwright test
        // "auto-loads more pictures on wide viewport when all fit without scrolling".

        it('should NOT emit loadMore when isLoading is true', fakeAsync(() => {
            const loadMoreSpy = jest.fn();

            spectator = createScrollerHost({ isLoading: true });
            spectator.detectChanges();
            spectator.output('loadMore').subscribe(loadMoreSpy);

            jest.spyOn(spectator.component.viewport(), 'getRenderedRange').mockReturnValue({ start: 0, end: 8 });
            triggerScroll(spectator);
            tick(150);

            expect(loadMoreSpy).not.toHaveBeenCalled();
        }));

        it('should NOT emit loadMore when all items are loaded', fakeAsync(() => {
            const loadMoreSpy = jest.fn();

            // itemCount === totalItems → allItemsLoaded() returns true
            spectator = createScrollerHost({ totalItems: 10 });
            spectator.detectChanges();
            spectator.output('loadMore').subscribe(loadMoreSpy);

            jest.spyOn(spectator.component.viewport(), 'getRenderedRange').mockReturnValue({ start: 0, end: 8 });
            triggerScroll(spectator);
            tick(150);

            expect(loadMoreSpy).not.toHaveBeenCalled();
        }));

        it('should NOT emit loadMore when far from the end', fakeAsync(() => {
            const loadMoreSpy = jest.fn();

            spectator = createScrollerHost({ itemCount: 20 });
            spectator.detectChanges();
            spectator.output('loadMore').subscribe(loadMoreSpy);

            // 5 of 20 rendered = 15 remaining > threshold 5
            jest.spyOn(spectator.component.viewport(), 'getRenderedRange').mockReturnValue({ start: 0, end: 5 });
            triggerScroll(spectator);
            tick(150);

            expect(loadMoreSpy).not.toHaveBeenCalled();
        }));

        it('should emit loadMore when scrolling near the end', fakeAsync(() => {
            const loadMoreSpy = jest.fn();

            spectator = createScrollerHost();
            spectator.detectChanges();
            spectator.output('loadMore').subscribe(loadMoreSpy);

            // 8 of 10 rendered = 2 remaining < threshold 5
            jest.spyOn(spectator.component.viewport(), 'getRenderedRange').mockReturnValue({ start: 0, end: 8 });
            triggerScroll(spectator);
            tick(150); // past throttleTime(100)

            // both scroll$ (leading+trailing) and rangeChange$ may fire — at least one emission is expected
            expect(loadMoreSpy).toHaveBeenCalled();
        }));
    });
});

function createScrollerHost(options: ScrollerHostOptions = {}): SpectatorHost<VirtualScrollerComponent<TestItem>> {
    const { itemCount = 10, totalItems = 100, isLoading = false, threshold = 5 } = options;
    const items = Array.from({ length: itemCount }, (_, i) => ({ id: i, name: `Item ${i}` }));

    return createHost(
        `<ui-virtual-scroller
            style="height: 200px; display: block"
            [items]="items"
            [totalItems]="totalItems"
            [isLoading]="isLoading"
            [loadMoreThreshold]="threshold">
            <ng-template uiVirtualScrollerItem let-item>
                <div class="test-item">{{ item.name }}</div>
            </ng-template>
        </ui-virtual-scroller>`,
        { hostProps: { items, totalItems, isLoading, threshold } },
    );
}

function triggerScroll(s: SpectatorHost<VirtualScrollerComponent<TestItem>>): void {
    const viewportEl = s.query('cdk-virtual-scroll-viewport');
    viewportEl?.dispatchEvent(new Event('scroll'));
}
