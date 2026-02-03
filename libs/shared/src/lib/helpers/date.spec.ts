import { isSameDay, formatTime, formatDateHeader } from './date';

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
        const todayMorning = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            8,
            0
        );
        expect(formatDateHeader(todayMorning)).toBe('Сегодня');
    });
});
