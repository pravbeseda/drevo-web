import { CalendarService } from '../../../services/calendar/calendar.service';
import { parsePositiveIntParam, readRouteParam } from '../../../shared/helpers/route-params';
import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
import { CALENDAR_MAX_YEAR, CALENDAR_MIN_YEAR, CalendarYear } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const OUT_OF_RANGE_STATUS = 400;

export type CalendarYearResolveResult = CalendarYear | 'not-found' | 'load-error';

/**
 * Pure function for resolving the calendar year from route params.
 * Extracted for testability without injection context.
 *
 * The range is checked here as well as on the server: `/calendar/1800` is a
 * mistyped link, not a request worth a round trip. The 400 branch stays because
 * the two ranges are declared in two places and can drift apart.
 */
export function resolveCalendarYear(
    calendarService: CalendarService,
    logger: Logger,
    route: ActivatedRouteSnapshot,
    currentYear: number,
): Observable<CalendarYearResolveResult> {
    // `/calendar` names no year and means the current one. Whether the route
    // names one is asked of paramMap directly — a year readRouteParam rejects
    // is still a year the address asked for, and must not fall back to today.
    if (!route.paramMap.has('year')) {
        return loadYear(calendarService, logger, currentYear);
    }

    const year = parsePositiveIntParam(readRouteParam(route, 'year'));
    if (year === undefined || year < CALENDAR_MIN_YEAR || year > CALENDAR_MAX_YEAR) {
        return of('not-found' as const);
    }

    return loadYear(calendarService, logger, year);
}

function loadYear(
    calendarService: CalendarService,
    logger: Logger,
    year: number,
): Observable<CalendarYearResolveResult> {
    return calendarService.getYear(year).pipe(
        catchError((error: unknown) => {
            // A year the calendar does not cover is a stale link, not a fault,
            // so it is answered without a log entry. Anything else is reported:
            // recovering the stream here is what keeps it from reaching the
            // global error handler, and so from reaching Sentry.
            if (error instanceof HttpErrorResponse && error.status === OUT_OF_RANGE_STATUS) {
                return of('not-found' as const);
            }

            logger.error(`Failed to load the calendar year ${year}`, error);
            return of('load-error' as const);
        }),
    );
}

export const calendarYearResolver: ResolveFn<CalendarYearResolveResult> = route =>
    resolveCalendarYear(
        inject(CalendarService),
        inject(LoggerService).withContext('CalendarYearResolver'),
        route,
        new Date().getFullYear(),
    );
