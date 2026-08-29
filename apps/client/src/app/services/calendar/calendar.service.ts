import { CalendarApiService } from './calendar-api.service';
import { Injectable, inject } from '@angular/core';
import {
    CalendarDay,
    CalendarDayDto,
    CalendarMonth,
    CalendarMonthDto,
    CalendarWeek,
    CalendarYear,
    CalendarYearDto,
} from '@drevo-web/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Saturday and Sunday, in Monday-first weeks of seven slots. */
const FIRST_WEEKEND_SLOT = 5;

@Injectable({ providedIn: 'root' })
export class CalendarService {
    private readonly apiService = inject(CalendarApiService);

    getYear(year: number): Observable<CalendarYear> {
        return this.apiService.getYear(year).pipe(map(dto => this.mapYear(dto)));
    }

    private mapYear(dto: CalendarYearDto): CalendarYear {
        return {
            year: dto.year,
            prev: dto.prev ?? undefined,
            next: dto.next ?? undefined,
            months: dto.months.map(month => this.mapMonth(month, dto.year)),
            legend: dto.legend,
            disclaimer: dto.disclaimer,
        };
    }

    private mapMonth(dto: CalendarMonthDto, year: number): CalendarMonth {
        return {
            number: dto.number,
            name: dto.name,
            weeks: dto.weeks.map(week => this.mapWeek(week, year, dto.number)),
        };
    }

    private mapWeek(week: readonly (CalendarDayDto | null)[], year: number, month: number): CalendarWeek {
        return week.map((day, slot) => (day ? this.mapDay(day, year, month, slot) : undefined));
    }

    private mapDay(dto: CalendarDayDto, year: number, month: number, slot: number): CalendarDay {
        return {
            dayOfMonth: dto.dayOfMonth,
            isoDate: `${year}-${pad(month)}-${pad(dto.dayOfMonth)}`,
            articleTitle: dto.articleTitle,
            articleId: dto.articleId ?? undefined,
            fast: dto.fast,
            feast: dto.feast ?? undefined,
            weekend: slot >= FIRST_WEEKEND_SLOT,
        };
    }
}

function pad(value: number): string {
    return value.toString().padStart(2, '0');
}
