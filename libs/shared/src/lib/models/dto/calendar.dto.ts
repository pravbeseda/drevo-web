/**
 * The Orthodox calendar as `/api/calendar/*` returns it.
 *
 * The grid travels as data: a day is the five facts a cell needs. There is no
 * `weekend` flag — the weeks are Monday-first and seven slots wide, so the
 * weekend is the slot index.
 */

/** Pascha ranks above the twelve feasts, which rank above the great ones. */
export type FeastTierDto = 'pascha' | 'twelve' | 'great';

export interface CalendarDayDto {
    readonly dayOfMonth: number;
    /** Title of the day article — the old-style date, e.g. `25 ДЕКАБРЯ`. */
    readonly articleTitle: string;
    /** `null` when that article has not been written yet. */
    readonly articleId: number | null;
    readonly fast: boolean;
    readonly feast: FeastTierDto | null;
}

/** Seven slots, Monday first, `null` where the slot falls outside the month. */
export type CalendarWeekDto = readonly (CalendarDayDto | null)[];

export interface CalendarMonthDto {
    readonly number: number;
    readonly name: string;
    readonly weeks: readonly CalendarWeekDto[];
}

export interface CalendarYearDto {
    readonly year: number;
    /** `null` at the ends of the supported range. */
    readonly prev: number | null;
    readonly next: number | null;
    readonly months: readonly CalendarMonthDto[];
    /** Wiki prose, server-rendered — the one part of the calendar that is. */
    readonly legend: string;
    readonly disclaimer: string;
}
