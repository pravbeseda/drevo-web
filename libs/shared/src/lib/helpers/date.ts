const RUSSIAN_LOCALE = 'ru-RU';

/**
 * Parse a datetime string into a Date.
 *
 * The backend returns `YYYY-MM-DD HH:mm:ss` (space separator, no `T`), which
 * Safari/WebKit and Node (SSR) parse inconsistently — often as `Invalid Date`.
 * Normalizing the space to `T` yields a valid local-time ISO string parsed
 * consistently across browsers and the server. ISO and date-only strings pass
 * through unchanged.
 */
export function parseDate(value: string): Date {
    return new Date(value.replace(' ', 'T'));
}

export function isSameDay(a: Date, b: Date): boolean {
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

export function formatTime(date: Date): string {
    return date.toLocaleTimeString(RUSSIAN_LOCALE, {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatDateHeader(date: Date, referenceDate = new Date()): string {
    const yesterday = new Date(referenceDate);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, referenceDate)) {
        return 'Сегодня';
    }
    if (isSameDay(date, yesterday)) {
        return 'Вчера';
    }

    return date.toLocaleDateString(RUSSIAN_LOCALE, {
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== referenceDate.getFullYear() ? 'numeric' : undefined,
    });
}

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const DAYS_SHOWN_AS_RELATIVE = 6;

const relativeTimeFormat = new Intl.RelativeTimeFormat(RUSSIAN_LOCALE, { numeric: 'auto', style: 'short' });

/** Calendar days in the local time zone from `from` to `to`, immune to daylight-saving shifts. */
export function calendarDaysBetween(from: Date, to: Date): number {
    const fromDay = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const toDay = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());

    return Math.round((toDay - fromDay) / MS_PER_DAY);
}

/**
 * How long ago `date` was: «только что», minutes and hours by elapsed time,
 * «вчера», «позавчера» and days up to a week by calendar days, the date
 * after that. A moment ahead of `now` reads as «только что».
 */
export function formatRelativeTime(date: Date, now: Date): string {
    const elapsed = now.getTime() - date.getTime();
    if (elapsed < MS_PER_MINUTE) {
        return 'только что';
    }
    if (elapsed < MS_PER_HOUR) {
        return relativeTimeFormat.format(-Math.floor(elapsed / MS_PER_MINUTE), 'minute');
    }
    if (elapsed < MS_PER_DAY) {
        return relativeTimeFormat.format(-Math.floor(elapsed / MS_PER_HOUR), 'hour');
    }
    const days = calendarDaysBetween(date, now);
    if (days <= DAYS_SHOWN_AS_RELATIVE) {
        return relativeTimeFormat.format(-days, 'day');
    }

    return date
        .toLocaleDateString(RUSSIAN_LOCALE, {
            day: 'numeric',
            month: 'long',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        })
        .replace(' г.', '');
}
