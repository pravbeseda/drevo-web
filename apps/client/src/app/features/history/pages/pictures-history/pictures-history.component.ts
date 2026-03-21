import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-pictures-history',
    templateUrl: './pictures-history.component.html',
    styleUrl: './pictures-history.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PicturesHistoryComponent {}
