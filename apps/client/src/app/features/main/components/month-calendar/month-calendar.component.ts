import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-month-calendar',
    templateUrl: './month-calendar.component.html',
    styleUrl: './month-calendar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthCalendarComponent {}
