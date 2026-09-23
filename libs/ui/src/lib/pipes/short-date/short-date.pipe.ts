import { Pipe, PipeTransform } from '@angular/core';

const LOCALE = 'ru-RU';
const YESTERDAY = 1;
const DAYS_SHOWN_AS_WEEKDAY = 6;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * A timestamp as short as a chat list shows it: the time today, «вчера»,
 * the weekday within the last week, day and month this year, the numeric
 * date before that. Days are calendar days in the viewer's time zone.
 */
@Pipe({
    name: 'shortDate',
})
export class ShortDatePipe implements PipeTransform {
    transform(value: Date | undefined): string {
        if (!value) return '';
        const now = new Date();
        const daysAgo = calendarDaysBetween(value, now);
        if (daysAgo === 0) {
            return value.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
        }
        if (daysAgo === YESTERDAY) return 'вчера';
        if (daysAgo > YESTERDAY && daysAgo <= DAYS_SHOWN_AS_WEEKDAY) {
            return value.toLocaleDateString(LOCALE, { weekday: 'short' });
        }
        if (value.getFullYear() === now.getFullYear()) {
            return value.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' }).replace('.', '');
        }
        return value.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
}

function calendarDaysBetween(from: Date, to: Date): number {
    const fromDay = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const toDay = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((toDay - fromDay) / MS_PER_DAY);
}
