import { FilterEntry } from '../../../models/filter.model';
import { SidebarActionComponent } from '../../sidebar-action/sidebar-action.component';
import { FiltersComponent } from '../filters.component';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidePanelComponent, ToggleComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-filters-side-panel',
    imports: [FiltersComponent, FormsModule, SidebarActionComponent, SidePanelComponent, ToggleComponent],
    templateUrl: './filters-side-panel.component.html',
    styleUrl: './filters-side-panel.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltersSidePanelComponent<T extends string = string> {
    readonly filters = input.required<readonly FilterEntry<T>[]>();
    readonly activeFilter = input.required<T>();
    readonly hideCancelled = input(false);
    readonly filterChange = output<T>();
    readonly hideCancelledChange = output<boolean>();

    readonly isSidePanelOpen = signal(false);

    openFilters(): void {
        this.isSidePanelOpen.update(v => !v);
    }

    onFilterChange(filter: T): void {
        this.filterChange.emit(filter);
        this.isSidePanelOpen.set(false);
    }

    onHideCancelledChange(value: boolean): void {
        this.hideCancelledChange.emit(value);
    }
}
