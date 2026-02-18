import { FilterEntry, isFilterGroup } from '../../models/filter.model';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
    selector: 'app-filters',
    templateUrl: './filters.component.html',
    styleUrl: './filters.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltersComponent<T extends string = string> {
    readonly filters = input.required<readonly FilterEntry<T>[]>();
    readonly activeFilter = input.required<T>();
    readonly filterChange = output<T>();

    readonly isFilterGroup = isFilterGroup;

    onSelect(filter: T): void {
        this.filterChange.emit(filter);
    }
}
