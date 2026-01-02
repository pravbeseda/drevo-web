import { SpectatorHost, createHostFactory } from '@ngneat/spectator/jest';
import { ScrollingModule } from '@angular/cdk/scrolling';

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

    const trackById = (_index: number, item: TestItem): number => item.id;

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
});
