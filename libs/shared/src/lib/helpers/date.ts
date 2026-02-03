const RUSSIAN_LOCALE = 'ru-RU';

export function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getDate() === b.getDate() &&
        a.getMonth() === b.getMonth() &&
        a.getFullYear() === b.getFullYear()
    );
}

export function formatTime(date: Date): string {
    return date.toLocaleTimeString(RUSSIAN_LOCALE, {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatDateHeader(
    date: Date,
    referenceDate = new Date()
): string {
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
        year:
            date.getFullYear() !== referenceDate.getFullYear()
                ? 'numeric'
                : undefined,
    });
}
