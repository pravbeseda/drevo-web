import { MonthTableComponent } from './month-table.component';
import { provideRouter } from '@angular/router';
import { CalendarDay, CalendarMonth } from '@drevo-web/shared';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

describe('MonthTableComponent', () => {
    let spectator: Spectator<MonthTableComponent>;

    const createComponent = createComponentFactory({
        component: MonthTableComponent,
        providers: [provideRouter([])],
    });

    const day = (dayOfMonth: number, overrides: Partial<CalendarDay> = {}): CalendarDay => ({
        dayOfMonth,
        isoDate: `2026-01-${String(dayOfMonth).padStart(2, '0')}`,
        articleTitle: `${dayOfMonth} ДЕКАБРЯ`,
        articleId: 100 + dayOfMonth,
        fast: false,
        weekend: false,
        ...overrides,
    });

    const month = (days: readonly (CalendarDay | undefined)[]): CalendarMonth => ({
        number: 1,
        name: 'Январь',
        weeks: [days],
    });

    const render = (value: CalendarMonth, today?: string): void => {
        spectator = createComponent({ props: { month: value, today } });
    };

    const cells = (): HTMLElement[] => spectator.queryAll('[data-testid="calendar-day"]');
    const emptyCells = (): HTMLElement[] => spectator.queryAll('[data-testid="calendar-empty"]');
    const firstLink = (): HTMLElement | null => spectator.query('[data-testid="day-link"]');

    it('names the month and heads the columns with the seven weekdays', () => {
        render(month([day(1)]));

        expect(spectator.query('[data-testid="month-name"]')).toHaveText('Январь');
        expect(spectator.queryAll('[data-testid="weekday"]').map(el => el.textContent?.trim())).toEqual([
            'П',
            'В',
            'С',
            'Ч',
            'П',
            'С',
            'В',
        ]);
    });

    it('renders an empty cell for a padding slot', () => {
        render(month([undefined, undefined, day(1)]));

        expect(cells()).toHaveLength(1);
        // The padding slots still occupy the row: a week that loses them shifts
        // every date in the month by as many columns.
        expect(emptyCells()).toHaveLength(2);
    });

    it('links a written article by id', () => {
        render(month([day(1, { articleId: 42 })]));

        const link = firstLink();
        expect(link).toHaveAttribute('href', '/articles/42');
        expect(link).toHaveText('1');
        expect(link).toHaveAttribute('aria-label', '1 ДЕКАБРЯ');
    });

    it('links a missing article by title and marks it as new', () => {
        render(month([day(1, { articleId: undefined, articleTitle: '19 ДЕКАБРЯ' })]));

        const link = firstLink();
        expect(link).toHaveAttribute('href', '/articles/find/19%20%D0%94%D0%95%D0%9A%D0%90%D0%91%D0%A0%D0%AF');
        expect(link).toHaveClass('newlink');
    });

    it.each([
        ['pascha', ['holyday', 'bold']],
        ['twelve', ['holyday', 'bold']],
        ['great', ['holyday']],
    ] as const)('marks a %s feast', (feast, expected) => {
        render(month([day(1, { feast, weekend: true })]));

        for (const className of expected) {
            expect(cells()[0]).toHaveClass(className);
        }
        // A feast outranks the weekend, as it always has.
        expect(cells()[0]).not.toHaveClass('weekend');
    });

    it('marks a weekend that carries no feast', () => {
        render(month([day(1, { weekend: true })]));

        expect(cells()[0]).toHaveClass('weekend');
    });

    it('marks a fast day independently of everything else', () => {
        render(month([day(1, { fast: true, feast: 'twelve' })]));

        expect(cells()[0]).toHaveClass('fast');
        expect(cells()[0]).toHaveClass('holyday');
    });

    it('marks today, and only when the date matches', () => {
        render(month([day(1), day(2)]), '2026-01-02');

        expect(cells()[0]).not.toHaveClass('today');
        expect(cells()[1]).toHaveClass('today');
    });

    it('marks no cell when no date is given', () => {
        render(month([day(1), day(2)]));

        expect(cells().some(cell => cell.classList.contains('today'))).toBe(false);
    });
});
