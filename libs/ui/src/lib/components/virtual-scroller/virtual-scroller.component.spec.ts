import { ScrollingModule } from '@angular/cdk/scrolling';
import { fakeAsync, tick } from '@angular/core/testing';
import { SpectatorHost, createHostFactory } from '@ngneat/spectator/jest';
import { Subject } from 'rxjs';
import { VirtualScrollerComponent } from './virtual-scroller.component';

interface TestItem {
    id: number;
    name: string;
}

describe('VirtualScrollerComponent', () => {
    let spectator: SpectatorHost<VirtualScrollerComponent<TestItem>>;
    const createHost = createHostFactory({
        component: VirtualScrollerComponent<TestItem>,
        imports: [ScrollingModule],
    });

    it('should create', () => {
        spectator = createHost(
            `<ui-virtual-scroller [items]="[]" [totalItems]="0" />`
        );
        expect(spectator.component).toBeTruthy();
    });

    it('should show loading indicator when isLoading is true and items exist', () => {
        const items: TestItem[] = [{ id: 1, name: 'Item 1' }];

        spectator = createHost(
            `<ui-virtual-scroller
                style="height: 200px; display: block"
                [items]="items"
                [totalItems]="10"
                [isLoading]="true">
                <ng-template uiVirtualScrollerItem let-item>
                    <div class="test-item">{{ item.name }}</div>
                </ng-template>
            </ui-virtual-scroller>`,
            { hostProps: { items } }
        );

        spectator.detectChanges();
        expect(spectator.query('ui-spinner')).toBeTruthy();
    });

    it('should not show loading indicator when isLoading is false', () => {
        const items: TestItem[] = [{ id: 1, name: 'Item 1' }];

        spectator = createHost(
            `<ui-virtual-scroller
                style="height: 200px; display: block"
                [items]="items"
                [totalItems]="10"
                [isLoading]="false">
                <ng-template uiVirtualScrollerItem let-item>
                    <div class="test-item">{{ item.name }}</div>
                </ng-template>
            </ui-virtual-scroller>`,
            { hostProps: { items } }
        );

        spectator.detectChanges();
        expect(spectator.query('ui-spinner')).toBeFalsy();
    });

    it('should not show loading indicator when no items exist', () => {
        spectator = createHost(
            `<ui-virtual-scroller
                style="height: 200px; display: block"
                [items]="[]"
                [totalItems]="10"
                [isLoading]="true">
                <ng-template uiVirtualScrollerItem let-item>
                    <div class="test-item">{{ item.name }}</div>
                </ng-template>
            </ui-virtual-scroller>`
        );

        spectator.detectChanges();
        expect(spectator.query('ui-spinner')).toBeFalsy();
    });

    describe('allItemsLoaded', () => {
        it('should return true when all items are loaded', () => {
            const items: TestItem[] = [
                { id: 1, name: 'Item 1' },
                { id: 2, name: 'Item 2' },
            ];

            spectator = createHost(
                `<ui-virtual-scroller
                    style="height: 200px; display: block"
                    [items]="items"
                    [totalItems]="2">
                    <ng-template uiVirtualScrollerItem let-item>
                        <div class="test-item">{{ item.name }}</div>
                    </ng-template>
                </ui-virtual-scroller>`,
                { hostProps: { items } }
            );

            spectator.detectChanges();
            expect(spectator.component.allItemsLoaded()).toBe(true);
        });

        it('should return false when more items can be loaded', () => {
            const items: TestItem[] = [{ id: 1, name: 'Item 1' }];

            spectator = createHost(
                `<ui-virtual-scroller
                    style="height: 200px; display: block"
                    [items]="items"
                    [totalItems]="10">
                    <ng-template uiVirtualScrollerItem let-item>
                        <div class="test-item">{{ item.name }}</div>
                    </ng-template>
                </ui-virtual-scroller>`,
                { hostProps: { items } }
            );

            spectator.detectChanges();
            expect(spectator.component.allItemsLoaded()).toBe(false);
        });

        it('should return false when totalItems is 0', () => {
            const items: TestItem[] = [{ id: 1, name: 'Item 1' }];

            spectator = createHost(
                `<ui-virtual-scroller
                    style="height: 200px; display: block"
                    [items]="items"
                    [totalItems]="0">
                    <ng-template uiVirtualScrollerItem let-item>
                        <div class="test-item">{{ item.name }}</div>
                    </ng-template>
                </ui-virtual-scroller>`,
                { hostProps: { items } }
            );

            spectator.detectChanges();
            expect(spectator.component.allItemsLoaded()).toBe(false);
        });
    });

    describe('shouldLoadMore', () => {
        it('should return true when remaining items are below threshold', () => {
            const items: TestItem[] = Array.from({ length: 10 }, (_, i) => ({
                id: i,
                name: `Item ${i}`,
            }));

            spectator = createHost(
                `<ui-virtual-scroller
                    style="height: 200px; display: block"
                    [items]="items"
                    [totalItems]="100"
                    [loadMoreThreshold]="5">
                    <ng-template uiVirtualScrollerItem let-item>
                        <div class="test-item">{{ item.name }}</div>
                    </ng-template>
                </ui-virtual-scroller>`,
                { hostProps: { items } }
            );

            spectator.detectChanges();

            // Mock viewport to return rendered range near end (7 of 10 rendered = 3 remaining)
            jest.spyOn(
                spectator.component.viewport(),
                'getRenderedRange'
            ).mockReturnValue({ start: 0, end: 7 });

            // Access private method for testing
            const shouldLoadMore = (
                spectator.component as any
            ).shouldLoadMore();
            expect(shouldLoadMore).toBe(true);
        });

        it('should return false when remaining items are above threshold', () => {
            const items: TestItem[] = Array.from({ length: 20 }, (_, i) => ({
                id: i,
                name: `Item ${i}`,
            }));

            spectator = createHost(
                `<ui-virtual-scroller
                    style="height: 200px; display: block"
                    [items]="items"
                    [totalItems]="100"
                    [loadMoreThreshold]="5">
                    <ng-template uiVirtualScrollerItem let-item>
                        <div class="test-item">{{ item.name }}</div>
                    </ng-template>
                </ui-virtual-scroller>`,
                { hostProps: { items } }
            );

            spectator.detectChanges();

            // Mock viewport: 5 of 20 rendered = 15 remaining > threshold 5
            jest.spyOn(
                spectator.component.viewport(),
                'getRenderedRange'
            ).mockReturnValue({ start: 0, end: 5 });

            const shouldLoadMore = (
                spectator.component as any
            ).shouldLoadMore();
            expect(shouldLoadMore).toBe(false);
        });
    });

    describe('loadMore emission guards', () => {
        it('should NOT emit loadMore when isLoading is true', fakeAsync(() => {
            const items: TestItem[] = Array.from({ length: 10 }, (_, i) => ({
                id: i,
                name: `Item ${i}`,
            }));
            const scrollSubject = new Subject<Event>();
            const loadMoreSpy = jest.fn();

            spectator = createHost(
                `<ui-virtual-scroller
                    style="height: 200px; display: block"
                    [items]="items"
                    [totalItems]="100"
                    [isLoading]="true"
                    [loadMoreThreshold]="5">
                    <ng-template uiVirtualScrollerItem let-item>
                        <div class="test-item">{{ item.name }}</div>
                    </ng-template>
                </ui-virtual-scroller>`,
                { hostProps: { items } }
            );

            spectator.detectChanges();
            spectator.output('loadMore').subscribe(loadMoreSpy);

            // Mock scroll observable and shouldLoadMore
            jest.spyOn(
                spectator.component.viewport(),
                'elementScrolled'
            ).mockReturnValue(scrollSubject.asObservable());
            jest.spyOn(
                spectator.component.viewport(),
                'getRenderedRange'
            ).mockReturnValue({ start: 0, end: 8 });

            // Re-setup listener with mocked observable
            (spectator.component as any).setupScrollListener();

            // Trigger scroll
            scrollSubject.next(new Event('scroll'));
            tick(150); // Past throttle time

            expect(loadMoreSpy).not.toHaveBeenCalled();
        }));

        it('should NOT emit loadMore when all items are loaded', fakeAsync(() => {
            const items: TestItem[] = Array.from({ length: 10 }, (_, i) => ({
                id: i,
                name: `Item ${i}`,
            }));
            const scrollSubject = new Subject<Event>();
            const loadMoreSpy = jest.fn();

            spectator = createHost(
                `<ui-virtual-scroller
                    style="height: 200px; display: block"
                    [items]="items"
                    [totalItems]="10"
                    [isLoading]="false"
                    [loadMoreThreshold]="5">
                    <ng-template uiVirtualScrollerItem let-item>
                        <div class="test-item">{{ item.name }}</div>
                    </ng-template>
                </ui-virtual-scroller>`,
                { hostProps: { items } }
            );

            spectator.detectChanges();
            spectator.output('loadMore').subscribe(loadMoreSpy);

            jest.spyOn(
                spectator.component.viewport(),
                'elementScrolled'
            ).mockReturnValue(scrollSubject.asObservable());
            jest.spyOn(
                spectator.component.viewport(),
                'getRenderedRange'
            ).mockReturnValue({ start: 0, end: 8 });

            (spectator.component as any).setupScrollListener();

            scrollSubject.next(new Event('scroll'));
            tick(150);

            expect(loadMoreSpy).not.toHaveBeenCalled();
        }));

        it('should emit loadMore when conditions are met', fakeAsync(() => {
            const items: TestItem[] = Array.from({ length: 10 }, (_, i) => ({
                id: i,
                name: `Item ${i}`,
            }));
            const scrollSubject = new Subject<Event>();
            const loadMoreSpy = jest.fn();

            spectator = createHost(
                `<ui-virtual-scroller
                    style="height: 200px; display: block"
                    [items]="items"
                    [totalItems]="100"
                    [isLoading]="false"
                    [loadMoreThreshold]="5">
                    <ng-template uiVirtualScrollerItem let-item>
                        <div class="test-item">{{ item.name }}</div>
                    </ng-template>
                </ui-virtual-scroller>`,
                { hostProps: { items } }
            );

            spectator.detectChanges();
            spectator.output('loadMore').subscribe(loadMoreSpy);

            jest.spyOn(
                spectator.component.viewport(),
                'elementScrolled'
            ).mockReturnValue(scrollSubject.asObservable());
            // 8 of 10 rendered = 2 remaining < threshold 5
            jest.spyOn(
                spectator.component.viewport(),
                'getRenderedRange'
            ).mockReturnValue({ start: 0, end: 8 });

            (spectator.component as any).setupScrollListener();

            scrollSubject.next(new Event('scroll'));
            tick(150);

            expect(loadMoreSpy).toHaveBeenCalledTimes(1);
        }));
    });
});
