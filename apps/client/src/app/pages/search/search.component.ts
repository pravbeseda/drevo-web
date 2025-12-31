import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TextInputComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-search',
    imports: [TextInputComponent],
    templateUrl: './search.component.html',
    styleUrl: './search.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
    readonly searchQuery = signal('');

    onSearchChange(value: string): void {
        this.searchQuery.set(value);
    }
}
