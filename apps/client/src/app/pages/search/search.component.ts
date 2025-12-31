import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-search',
    imports: [],
    templateUrl: './search.component.html',
    styleUrl: './search.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {}
