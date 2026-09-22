import { createPipeFactory, SpectatorPipe } from '@ngneat/spectator/jest';
import { ShortDatePipe } from './short-date.pipe';

describe('ShortDatePipe', () => {
    let spectator: SpectatorPipe<ShortDatePipe>;
    const createPipe = createPipeFactory(ShortDatePipe);

    // Wednesday
    const now = new Date(2026, 8, 23, 10, 0);

    function render(date: Date | undefined): string | undefined {
        spectator = createPipe(`<span>{{ date | shortDate }}</span>`, {
            hostProps: { date },
        });
        return spectator.element.textContent?.trim();
    }

    beforeEach(() => {
        jest.useFakeTimers({ now });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('shows the time for today', () => {
        expect(render(new Date(2026, 8, 23, 0, 0))).toBe('00:00');
    });

    it('shows the time for a moment later today', () => {
        expect(render(new Date(2026, 8, 23, 23, 59))).toBe('23:59');
    });

    it('says «вчера» for yesterday, up to its last minute', () => {
        expect(render(new Date(2026, 8, 22, 23, 59))).toBe('вчера');
    });

    it('says «вчера» for the first minute of yesterday', () => {
        expect(render(new Date(2026, 8, 22, 0, 0))).toBe('вчера');
    });

    it('shows the weekday two days back', () => {
        expect(render(new Date(2026, 8, 21, 12, 0))).toBe('пн');
    });

    it('shows the weekday six days back', () => {
        expect(render(new Date(2026, 8, 17, 12, 0))).toBe('чт');
    });

    it('shows day and month seven days back', () => {
        expect(render(new Date(2026, 8, 16, 12, 0))).toBe('16 сент');
    });

    it('shows day and month on 1 January of this year', () => {
        expect(render(new Date(2026, 0, 1, 0, 0))).toBe('1 янв');
    });

    it('shows the numeric date for the last day of the previous year', () => {
        expect(render(new Date(2025, 11, 31, 23, 59))).toBe('31.12.25');
    });

    it('shows the numeric date for a date in the future beyond today', () => {
        expect(render(new Date(2026, 8, 24, 9, 0))).toBe('24 сент');
    });

    it('returns an empty string for undefined', () => {
        expect(render(undefined)).toBe('');
    });
});
