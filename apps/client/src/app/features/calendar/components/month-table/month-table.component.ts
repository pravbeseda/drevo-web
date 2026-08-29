import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CalendarDay, CalendarMonth } from '@drevo-web/shared';

/** Monday first, as the calendar has always printed it. */
const WEEKDAYS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'] as const;

@Component({
    selector: 'app-month-table',
    imports: [NgClass, RouterLink],
    templateUrl: './month-table.component.html',
    styleUrl: './month-table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthTableComponent {
    readonly month = input.required<CalendarMonth>();
    /** New-style ISO date to mark, or nothing outside the current year. */
    readonly today = input<string | undefined>(undefined);

    readonly weekdays = WEEKDAYS;

    /**
     * The cell's classes, in the precedence the calendar has always used: a
     * feast outranks the weekend, the fast is independent of both, and today is
     * a property of the reader rather than of the day.
     */
    dayClasses(day: CalendarDay): Record<string, boolean> {
        const majorFeast = day.feast === 'pascha' || day.feast === 'twelve';

        return {
            holyday: day.feast !== undefined,
            bold: majorFeast,
            weekend: day.feast === undefined && day.weekend,
            fast: day.fast,
            today: day.isoDate === this.today(),
        };
    }

    /** The day article: by id when it exists, by title when it does not. */
    dayLink(day: CalendarDay): readonly (string | number)[] {
        return day.articleId === undefined ? ['/articles/find', day.articleTitle] : ['/articles', day.articleId];
    }
}
