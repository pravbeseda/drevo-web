import { calendarDaysBetween, formatDateHeader, formatRelativeTime, formatTime, isSameDay, parseDate } from './date';

describe('parseDate', () => {
    it('parses a backend "YYYY-MM-DD HH:mm:ss" string into a valid local Date', () => {
        const date = parseDate('2025-01-15 10:30:45');

        expect(Number.isNaN(date.getTime())).toBe(false);
        expect(date.getFullYear()).toBe(2025);
        expect(date.getMonth()).toBe(0);
        expect(date.getDate()).toBe(15);
        expect(date.getHours()).toBe(10);
        expect(date.getMinutes()).toBe(30);
        expect(date.getSeconds()).toBe(45);
    });

    it('parses a date-only string', () => {
        const date = parseDate('2025-06-18');

        expect(Number.isNaN(date.getTime())).toBe(false);
    });
});

describe('isSameDay', () => {
    it('should return true for the same date', () => {
        const a = new Date(2025, 0, 15, 10, 30);
        const b = new Date(2025, 0, 15, 23, 59);
        expect(isSameDay(a, b)).toBe(true);
    });

    it('should return false for different days', () => {
        const a = new Date(2025, 0, 15);
        const b = new Date(2025, 0, 16);
        expect(isSameDay(a, b)).toBe(false);
    });

    it('should return false for same day in different months', () => {
        const a = new Date(2025, 0, 15);
        const b = new Date(2025, 1, 15);
        expect(isSameDay(a, b)).toBe(false);
    });

    it('should return false for same day and month in different years', () => {
        const a = new Date(2024, 5, 10);
        const b = new Date(2025, 5, 10);
        expect(isSameDay(a, b)).toBe(false);
    });
});

describe('formatTime', () => {
    it('should format time as HH:MM', () => {
        const date = new Date(2025, 0, 15, 14, 5);
        const result = formatTime(date);
        expect(result).toMatch(/14[:\u2236]05/);
    });

    it('should format midnight', () => {
        const date = new Date(2025, 0, 15, 0, 0);
        const result = formatTime(date);
        expect(result).toMatch(/00[:\u2236]00/);
    });

    it('should pad single-digit hours and minutes', () => {
        const date = new Date(2025, 0, 15, 9, 3);
        const result = formatTime(date);
        expect(result).toMatch(/09[:\u2236]03/);
    });
});

describe('formatDateHeader', () => {
    const referenceDate = new Date(2025, 5, 15, 12, 0);

    it('should return "Сегодня" for the current day', () => {
        const date = new Date(2025, 5, 15, 8, 30);
        expect(formatDateHeader(date, referenceDate)).toBe('Сегодня');
    });

    it('should return "Вчера" for the previous day', () => {
        const date = new Date(2025, 5, 14, 20, 0);
        expect(formatDateHeader(date, referenceDate)).toBe('Вчера');
    });

    it('should return localized date for older dates in the same year', () => {
        const date = new Date(2025, 0, 10);
        const result = formatDateHeader(date, referenceDate);
        // Should contain day number and month name, no year
        expect(result).toMatch(/10/);
        expect(result).not.toMatch(/2025/);
    });

    it('should include year for dates in a different year', () => {
        const date = new Date(2024, 3, 20);
        const result = formatDateHeader(date, referenceDate);
        expect(result).toMatch(/20/);
        expect(result).toMatch(/2024/);
    });

    it('should use current date as default referenceDate', () => {
        const today = new Date();
        const todayMorning = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0);
        expect(formatDateHeader(todayMorning)).toBe('Сегодня');
    });
});

describe('calendarDaysBetween', () => {
    it('counts calendar days, not elapsed 24-hour spans', () => {
        expect(calendarDaysBetween(new Date(2025, 5, 14, 23, 59), new Date(2025, 5, 15, 0, 1))).toBe(1);
    });

    it('is zero within one day', () => {
        expect(calendarDaysBetween(new Date(2025, 5, 15, 0, 0), new Date(2025, 5, 15, 23, 59))).toBe(0);
    });

    it('is not thrown off by a daylight-saving shift', () => {
        expect(calendarDaysBetween(new Date(2025, 2, 29, 12, 0), new Date(2025, 2, 31, 12, 0))).toBe(2);
    });
});

describe('formatRelativeTime', () => {
    // Wednesday
    const now = new Date(2026, 8, 23, 10, 0);

    it('says «только что» within the first minute', () => {
        expect(formatRelativeTime(new Date(2026, 8, 23, 9, 59, 30), now)).toBe('только что');
    });

    it('says «только что» for a moment slightly ahead of the clock', () => {
        expect(formatRelativeTime(new Date(2026, 8, 23, 10, 2), now)).toBe('только что');
    });

    it('counts minutes within the first hour', () => {
        expect(formatRelativeTime(new Date(2026, 8, 23, 9, 59), now)).toBe('1 мин. назад');
        expect(formatRelativeTime(new Date(2026, 8, 23, 9, 1), now)).toBe('59 мин. назад');
    });

    it('counts hours within the first day, across midnight too', () => {
        expect(formatRelativeTime(new Date(2026, 8, 23, 9, 0), now)).toBe('1 ч назад');
        expect(formatRelativeTime(new Date(2026, 8, 22, 10, 1), now)).toBe('23 ч назад');
    });

    it('says «вчера» for the previous calendar day beyond 24 hours', () => {
        expect(formatRelativeTime(new Date(2026, 8, 22, 0, 0), now)).toBe('вчера');
    });

    it('says «позавчера» two calendar days back', () => {
        expect(formatRelativeTime(new Date(2026, 8, 21, 23, 59), now)).toBe('позавчера');
    });

    it('counts days up to six calendar days back', () => {
        expect(formatRelativeTime(new Date(2026, 8, 20, 12, 0), now)).toBe('3 дн. назад');
        expect(formatRelativeTime(new Date(2026, 8, 17, 0, 0), now)).toBe('6 дн. назад');
    });

    it('shows day and month a week back and later this year', () => {
        expect(formatRelativeTime(new Date(2026, 8, 16, 23, 59), now)).toBe('16 сентября');
        expect(formatRelativeTime(new Date(2026, 2, 12, 8, 0), now)).toBe('12 марта');
    });

    it('adds the year for an earlier year', () => {
        expect(formatRelativeTime(new Date(2025, 2, 12, 8, 0), now)).toBe('12 марта 2025');
    });
});
