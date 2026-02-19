import { FilterEntry } from '../../../models/filter.model';
import { FiltersComponent } from '../filters.component';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { SidebarActionComponent, SidePanelComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-filters-side-panel',
    imports: [FiltersComponent, SidebarActionComponent, SidePanelComponent],
    templateUrl: './filters-side-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltersSidePanelComponent<T extends string = string> {
    readonly filters = input.required<readonly FilterEntry<T>[]>();
    readonly activeFilter = input.required<T>();
    readonly filterChange = output<T>();

    readonly isSidePanelOpen = signal(false);

    openFilters(): void {
        this.isSidePanelOpen.update(v => !v);
    }

    onFilterChange(filter: T): void {
        this.filterChange.emit(filter);
    }
}
