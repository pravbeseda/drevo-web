import type { CalendarPageComponent } from './pages/calendar-page/calendar-page.component';
import { calendarYearResolver } from './resolvers/calendar-year.resolver';
import { Type } from '@angular/core';
import { Route } from '@angular/router';

const calendarPage = (): Promise<Type<CalendarPageComponent>> =>
    import('./pages/calendar-page/calendar-page.component').then(m => m.CalendarPageComponent);

const calendarRoute: Route = {
    title: 'Православный календарь',
    loadComponent: calendarPage,
    resolve: { calendar: calendarYearResolver },
};

export const CALENDAR_ROUTES: Route[] = [
    { path: '', ...calendarRoute },
    // No redirect from the year-less path: the resolver falls back to the
    // current year, so /calendar stays the short canonical address and a link
    // to it does not go stale on New Year's Eve.
    { path: ':year', ...calendarRoute },
];
