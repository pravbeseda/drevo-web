import { resolveCalendarYear } from './calendar-year.resolver';
import { CalendarService } from '../../../services/calendar/calendar.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRouteSnapshot, convertToParamMap, UrlSegment } from '@angular/router';
import { Logger } from '@drevo-web/core';
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
    let logger: jest.Mocked<Pick<Logger, 'error'>>;

    beforeEach(() => {
        calendarService = { getYear: jest.fn().mockReturnValue(of(year)) };
        logger = { error: jest.fn() };
    });

    const routeWith = (
        yearParam?: string,
        // A matched path with no matrix params is the default, so that only the
        // cases about them have to spell their segments out.
        segments: UrlSegment[] = yearParam === undefined ? [] : [new UrlSegment(yearParam, {})],
    ): ActivatedRouteSnapshot =>
        ({
            paramMap: convertToParamMap(yearParam === undefined ? {} : { year: yearParam }),
            pathFromRoot: [{ url: segments } as ActivatedRouteSnapshot],
        }) as ActivatedRouteSnapshot;

    const resolve = (yearParam?: string, segments?: UrlSegment[]): unknown => {
        let result: unknown;
        resolveCalendarYear(
            calendarService as unknown as CalendarService,
            logger as unknown as Logger,
            routeWith(yearParam, segments),
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
        // Number() reads every JavaScript literal form, and none of them is a
        // year the URL pattern or the backend names.
        ['hexadecimal', '0x7ea'],
        ['exponential', '2e3'],
        ['signed', '+2026'],
        ['padded with spaces', ' 2026 '],
        ['padded with a leading zero', '02026'],
    ])('answers not-found for a year %s, without asking the API', (_case, yearParam) => {
        expect(resolve(yearParam)).toBe('not-found');
        expect(calendarService.getYear).not.toHaveBeenCalled();
    });

    it('answers not-found when a segment carries matrix params, without asking the API', () => {
        // `/calendar/2020;year=1990` — Angular merges `;year=1990` over the
        // positional `2020`. The route still names a year, so the fallback to
        // the current year must not swallow it: the address is rejected.
        expect(resolve('1990', [new UrlSegment('2020', { year: '1990' })])).toBe('not-found');
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

    it('reports the failure that produced the load-error', () => {
        const failure = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
        calendarService.getYear.mockReturnValue(throwError(() => failure));

        resolve('2030');

        // The error itself is the payload, so its stack reaches Sentry intact;
        // the year rides in the message.
        expect(logger.error).toHaveBeenCalledWith('Failed to load the calendar year 2030', failure);
    });

    /**
     * A year the calendar does not cover is a stale link, not a fault: the
     * backend answers 400 by design, and logging it would fill the log with
     * mistyped URLs.
     */
    it('reports nothing when the year is simply out of range', () => {
        calendarService.getYear.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 400, statusText: 'Bad Request' })),
        );

        resolve('2030');

        expect(logger.error).not.toHaveBeenCalled();
    });
});
