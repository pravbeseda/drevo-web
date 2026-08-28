import { resolveCalendarYear } from './calendar-year.resolver';
import { CalendarService } from '../../../services/calendar/calendar.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRouteSnapshot, convertToParamMap } from '@angular/router';
import { CALENDAR_MAX_YEAR, CALENDAR_MIN_YEAR, CalendarYear } from '@drevo-web/shared';
import { of, throwError } from 'rxjs';

describe('resolveCalendarYear', () => {
    const CURRENT_YEAR = 2026;

    const year: CalendarYear = {
        year: 2026,
        months: [],
        legend: '<legend>',
        disclaimer: '<disclaimer>',
    };

    let calendarService: jest.Mocked<Pick<CalendarService, 'getYear'>>;

    beforeEach(() => {
        calendarService = { getYear: jest.fn().mockReturnValue(of(year)) };
    });

    const routeWith = (yearParam?: string): ActivatedRouteSnapshot =>
        ({
            paramMap: convertToParamMap(yearParam === undefined ? {} : { year: yearParam }),
        }) as ActivatedRouteSnapshot;

    const resolve = (yearParam?: string): unknown => {
        let result: unknown;
        resolveCalendarYear(
            calendarService as unknown as CalendarService,
            routeWith(yearParam),
            CURRENT_YEAR,
        ).subscribe(value => (result = value));
        return result;
    };

    it('loads the year named in the route', () => {
        expect(resolve('2030')).toBe(year);
        expect(calendarService.getYear).toHaveBeenCalledWith(2030);
    });

    it('falls back to the current year when the route names none', () => {
        resolve();

        expect(calendarService.getYear).toHaveBeenCalledWith(CURRENT_YEAR);
    });

    it.each([
        ['below the range', String(CALENDAR_MIN_YEAR - 1)],
        ['above the range', String(CALENDAR_MAX_YEAR + 1)],
        ['not a number', 'позапрошлый'],
        ['fractional', '2026.5'],
    ])('answers not-found for a year %s, without asking the API', (_case, yearParam) => {
        expect(resolve(yearParam)).toBe('not-found');
        expect(calendarService.getYear).not.toHaveBeenCalled();
    });

    it('answers not-found when the API rejects the year as out of range', () => {
        calendarService.getYear.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 400, statusText: 'Bad Request' })),
        );

        expect(resolve('2030')).toBe('not-found');
    });

    it('answers load-error when the request fails for any other reason', () => {
        calendarService.getYear.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
        );

        expect(resolve('2030')).toBe('load-error');
    });
});
