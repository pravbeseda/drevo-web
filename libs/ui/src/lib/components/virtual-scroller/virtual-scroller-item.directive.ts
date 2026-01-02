import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Directive to mark a template as the item template for VirtualScrollerComponent.
 *
 * @example
 * ```html
 * <ui-virtual-scroller [items]="items">
 *     <ng-template uiVirtualScrollerItem let-item>
 *         <div>{{ item.name }}</div>
 *     </ng-template>
 * </ui-virtual-scroller>
 * ```
 */
@Directive({
    selector: '[uiVirtualScrollerItem]',
})
export class VirtualScrollerItemDirective {
    readonly template = inject(TemplateRef);
}
