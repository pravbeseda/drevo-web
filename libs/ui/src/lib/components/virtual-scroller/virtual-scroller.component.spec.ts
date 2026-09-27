import { ScrollingModule } from '@angular/cdk/scrolling';
import { fakeAsync, tick } from '@angular/core/testing';
import { SpectatorHost, createHostFactory } from '@ngneat/spectator/jest';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { VirtualScrollerComponent } from './virtual-scroller.component';

jest.mock('overlayscrollbars', () => ({ OverlayScrollbars: jest.fn(() => ({ destroy: jest.fn() })) }));

interface TestItem {
    id: number;
    name: string;
}

interface ScrollerHostOptions {
    readonly itemCount?: number;
    readonly totalItems?: number;
    readonly isLoading?: boolean;
    readonly threshold?: number;
    readonly itemSize?: number;
    readonly footer?: string;
}

const createHost = createHostFactory({
    component: VirtualScrollerComponent<TestItem>,
    imports: [ScrollingModule],
    providers: [mockLoggerProvider()],
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

    it('should scroll its own host and draw the app scrollbar over it', () => {
        spectator = createScrollerHost();

        expect(spectator.element).toHaveClass('cdk-virtual-scrollable');
        expect(spectator.element).toHaveAttribute('data-overlayscrollbars-initialize');
    });

    it('should render the projected content after the rows, inside the scrolled area', () => {
        spectator = createScrollerHost({ footer: '<p data-testid="footer">Конец</p>' });

        const viewport = spectator.query('cdk-virtual-scroll-viewport');
        const footer = spectator.query('[data-testid="footer"]');

        expect(footer).toBeTruthy();
        expect(spectator.element.contains(footer)).toBe(true);
        expect(viewport?.compareDocumentPosition(footer as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    describe('list semantics', () => {
        /** The viewport renders its first range once the host has settled. */
        const renderRows = async (): Promise<void> => {
            await spectator.fixture.whenStable();
            spectator.detectChanges();
        };

        it('should expose the rendered rows as items of the whole collection', async () => {
            spectator = createScrollerHost({ itemSize: 40 });
            await renderRows();

            const rows = spectator.queryAll('[role="listitem"]');

            expect(spectator.query('cdk-virtual-scroll-viewport')).toHaveAttribute('role', 'list');
            expect(rows.length).toBeGreaterThan(0);
            expect(rows[0]).toHaveAttribute('aria-posinset', '1');
            expect(rows[0]).toHaveAttribute('aria-setsize', '100');
        });

        it('should count the loaded rows while the total is unknown', async () => {
            spectator = createScrollerHost({ itemSize: 40, totalItems: 0 });
            await renderRows();

            expect(spectator.query('[role="listitem"]')).toHaveAttribute('aria-setsize', '10');
        });
    });

    describe('resizing', () => {
        const originalResizeObserver = globalThis.ResizeObserver;
        let notifyResize: (() => void) | undefined;

        beforeEach(() => {
            globalThis.ResizeObserver = class {
                constructor(callback: ResizeObserverCallback) {
                    notifyResize = () => callback([], this);
                }
                observe(): void {
                    // Resizes are reported by hand through notifyResize.
                }
                unobserve(): void {
                    // Nothing observed.
                }
                disconnect(): void {
                    notifyResize = undefined;
                }
            };
        });

        afterEach(() => {
            globalThis.ResizeObserver = originalResizeObserver;
        });

        /** A list hidden with `display: none` and shown again reports no window resize, only its own. */
        it('should re-measure the viewport when its own size changes', () => {
            spectator = createScrollerHost();
            const checkViewportSize = jest.spyOn(spectator.component.viewport(), 'checkViewportSize');

            notifyResize?.();

            expect(checkViewportSize).toHaveBeenCalled();
        });

        it('should stop watching its size once destroyed', () => {
            spectator = createScrollerHost();

            spectator.fixture.destroy();

            expect(notifyResize).toBeUndefined();
        });
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
    const { itemCount = 10, totalItems = 100, isLoading = false, threshold = 5, itemSize, footer = '' } = options;
    const items = Array.from({ length: itemCount }, (_, i) => ({ id: i, name: `Item ${i}` }));

    return createHost(
        `<ui-virtual-scroller
            style="height: 200px; display: block"
            [items]="items"
            [totalItems]="totalItems"
            [isLoading]="isLoading"
            [loadMoreThreshold]="threshold"
            [itemSize]="itemSize">
            <ng-template uiVirtualScrollerItem let-item>
                <div class="test-item">{{ item.name }}</div>
            </ng-template>
            ${footer}
        </ui-virtual-scroller>`,
        { hostProps: { items, totalItems, isLoading, threshold, itemSize } },
    );
}

/** The host is what scrolls; the viewport inside only lays the rows out. */
function triggerScroll(s: SpectatorHost<VirtualScrollerComponent<TestItem>>): void {
    s.element.dispatchEvent(new Event('scroll'));
}
