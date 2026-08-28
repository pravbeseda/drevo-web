import { CalendarService } from '../../../services/calendar/calendar.service';
import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
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
    route: ActivatedRouteSnapshot,
    currentYear: number,
): Observable<CalendarYearResolveResult> {
    // paramMap.get() answers with null for a missing param; the codebase speaks
    // in undefined, so the absence is normalised on the way in.
    const yearParam = route.paramMap.get('year') ?? undefined;
    if (yearParam === undefined) {
        return loadYear(calendarService, currentYear);
    }

    const year = Number(yearParam);
    if (!Number.isInteger(year) || year < CALENDAR_MIN_YEAR || year > CALENDAR_MAX_YEAR) {
        return of('not-found' as const);
    }

    return loadYear(calendarService, year);
}

function loadYear(calendarService: CalendarService, year: number): Observable<CalendarYearResolveResult> {
    return calendarService.getYear(year).pipe(
        catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === OUT_OF_RANGE_STATUS) {
                return of('not-found' as const);
            }
            return of('load-error' as const);
        }),
    );
}

export const calendarYearResolver: ResolveFn<CalendarYearResolveResult> = route =>
    resolveCalendarYear(inject(CalendarService), route, new Date().getFullYear());
