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
