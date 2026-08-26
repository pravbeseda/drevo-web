import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-site-numbers',
    templateUrl: './site-numbers.component.html',
    styleUrl: './site-numbers.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteNumbersComponent {}
