import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-day-card',
    templateUrl: './day-card.component.html',
    styleUrl: './day-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayCardComponent {}
