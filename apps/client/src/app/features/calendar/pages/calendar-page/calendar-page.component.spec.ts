import { CalendarYearResolveResult } from '../../resolvers/calendar-year.resolver';
import { CalendarPageComponent } from './calendar-page.component';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { CalendarMonth, CalendarYear } from '@drevo-web/shared';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { of } from 'rxjs';

describe('CalendarPageComponent', () => {
    let spectator: Spectator<CalendarPageComponent>;

    const month = (number: number, name: string): CalendarMonth => ({
        number,
        name,
        weeks: [
            [
                {
                    dayOfMonth: 1,
                    isoDate: `2026-${String(number).padStart(2, '0')}-01`,
                    articleTitle: 'ТЕСТ',
                    articleId: 1,
                    fast: false,
                    weekend: false,
                },
            ],
        ],
    });

    const year: CalendarYear = {
        year: 2026,
        prev: 2025,
        next: 2027,
        months: [month(1, 'Январь'), month(2, 'Февраль')],
        legend: '<p class="legend-body">Пасха</p>',
        disclaimer: '<p class="disclaimer-body">Внимание!</p>',
    };

    const render = (calendar: CalendarYearResolveResult, yearParam?: string): void => {
        spectator = createComponent({
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        data: of({ calendar }),
                        paramMap: of(convertToParamMap(yearParam === undefined ? {} : { year: yearParam })),
                    },
                },
            ],
        });
    };

    const createComponent = createComponentFactory({
        component: CalendarPageComponent,
        shallow: true,
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('renders one table per month, with the year tabs', () => {
        render(year, '2026');

        expect(spectator.queryAll('app-month-table')).toHaveLength(2);
        expect(spectator.query('ui-tabs')).toBeTruthy();
    });

    it('leaves the page heading to the header, which shows the route title', () => {
        render(year, '2026');

        expect(spectator.query('h1')).toBeNull();
    });

    it('offers the year and its neighbours as tabs', () => {
        render(year, '2026');

        expect(spectator.component.tabs()).toEqual([
            { label: '2025', route: '/calendar/2025', testId: 'year-prev' },
            { label: '2026', route: '/calendar/2026', testId: 'year-current' },
            { label: '2027', route: '/calendar/2027', testId: 'year-next' },
        ]);
    });

    /**
     * ui-tabs marks the active tab by matching its route against the URL, and
     * /calendar/2026 does not match /calendar. The current year therefore keeps
     * whichever of the two addresses the reader arrived by.
     */
    it('keeps the short address on the current tab when the route names no year', () => {
        render(year);

        expect(spectator.component.tabs()[1]).toEqual({
            label: '2026',
            route: '/calendar',
            testId: 'year-current',
        });
    });

    it('drops a neighbour the range does not have', () => {
        render({ ...year, prev: undefined }, '2026');

        expect(spectator.component.tabs().map(tab => tab.testId)).toEqual(['year-current', 'year-next']);
    });

    it('renders the legend and the disclaimer as server-formatted content', () => {
        render(year);

        const contents = spectator.queryAll('app-wiki-content');
        expect(contents).toHaveLength(2);
    });

    it('marks today when the page shows the current year', () => {
        jest.useFakeTimers().setSystemTime(new Date('2026-02-01T10:00:00Z'));
        render(year);

        expect(spectator.component.today()).toBe('2026-02-01');
    });

    it('marks nothing when the page shows another year', () => {
        jest.useFakeTimers().setSystemTime(new Date('2030-02-01T10:00:00Z'));
        render(year);

        expect(spectator.component.today()).toBeUndefined();
    });

    it('shows the not-found error for a year the calendar does not cover', () => {
        render('not-found');

        expect(spectator.query('[data-testid="calendar-not-found"]')).toBeTruthy();
        expect(spectator.queryAll('app-month-table')).toHaveLength(0);
    });

    it('shows the load error when the request failed', () => {
        render('load-error');

        expect(spectator.query('[data-testid="calendar-load-error"]')).toBeTruthy();
        expect(spectator.queryAll('app-month-table')).toHaveLength(0);
    });
});
