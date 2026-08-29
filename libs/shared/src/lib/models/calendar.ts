import { FeastTierDto } from './dto/calendar.dto';

export type FeastTier = FeastTierDto;

/** The years the calendar covers, matching `YearCalendar` on the backend. */
export const CALENDAR_MIN_YEAR = 1920;
export const CALENDAR_MAX_YEAR = 2037;

export interface CalendarDay {
    readonly dayOfMonth: number;
    /** New-style ISO date, `YYYY-MM-DD` — what marking *today* compares against. */
    readonly isoDate: string;
    readonly articleTitle: string;
    readonly articleId?: number;
    readonly fast: boolean;
    readonly feast?: FeastTier;
    /** Derived from the slot index, so no component has to do that arithmetic. */
    readonly weekend: boolean;
}

/** Seven slots, Monday first; `undefined` where the slot falls outside the month. */
export type CalendarWeek = readonly (CalendarDay | undefined)[];

export interface CalendarMonth {
    readonly number: number;
    readonly name: string;
    readonly weeks: readonly CalendarWeek[];
}

export interface CalendarYear {
    readonly year: number;
    readonly prev?: number;
    readonly next?: number;
    readonly months: readonly CalendarMonth[];
    readonly legend: string;
    readonly disclaimer: string;
}
