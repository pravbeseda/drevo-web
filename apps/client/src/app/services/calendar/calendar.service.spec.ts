import { CalendarApiService } from './calendar-api.service';
import { CalendarService } from './calendar.service';
import { CalendarDayDto, CalendarWeekDto, CalendarYear, CalendarYearDto } from '@drevo-web/shared';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { of } from 'rxjs';

describe('CalendarService', () => {
    let spectator: SpectatorService<CalendarService>;
    let apiService: jest.Mocked<CalendarApiService>;

    const createService = createServiceFactory({
        service: CalendarService,
        mocks: [CalendarApiService],
    });

    beforeEach(() => {
        spectator = createService();
        apiService = spectator.inject(CalendarApiService);
    });

    const day = (dayOfMonth: number, overrides: Partial<CalendarDayDto> = {}): CalendarDayDto => ({
        dayOfMonth,
        articleTitle: `${dayOfMonth} ДЕКАБРЯ`,
        articleId: 100 + dayOfMonth,
        fast: false,
        feast: null,
        ...overrides,
    });

    // January 2026 opens on a Thursday, so the first week has three empty slots.
    const firstWeek: CalendarWeekDto = [null, null, null, day(1), day(2), day(3), day(4)];

    const yearDto = (weeks: readonly CalendarWeekDto[] = [firstWeek]): CalendarYearDto => ({
        year: 2026,
        prev: 2025,
        next: 2027,
        months: [{ number: 1, name: 'Январь', weeks }],
        legend: '<legend>',
        disclaimer: '<disclaimer>',
    });

    const resolveYear = (dto: CalendarYearDto): CalendarYear => {
        apiService.getYear.mockReturnValue(of(dto));
        let result: CalendarYear | undefined;
        spectator.service.getYear(dto.year).subscribe(value => (result = value));
        if (!result) {
            throw new Error('the year did not resolve');
        }
        return result;
    };

    it('asks the API for the requested year', () => {
        resolveYear(yearDto());

        expect(apiService.getYear).toHaveBeenCalledWith(2026);
    });

    it('gives every day the ISO date of its own month', () => {
        const january = resolveYear(yearDto()).months[0];

        expect(january.weeks[0][3]?.isoDate).toBe('2026-01-01');
        expect(january.weeks[0][6]?.isoDate).toBe('2026-01-04');
    });

    it('derives the weekend from the slot index rather than from a flag', () => {
        const week = resolveYear(yearDto()).months[0].weeks[0];

        expect(week[4]?.weekend).toBe(false);
        expect(week[5]?.weekend).toBe(true);
        expect(week[6]?.weekend).toBe(true);
    });

    it('leaves the padding slots empty', () => {
        const week = resolveYear(yearDto()).months[0].weeks[0];

        expect(week[0]).toBeUndefined();
        expect(week[2]).toBeUndefined();
        expect(week[3]).toBeDefined();
    });

    it('turns a missing article and a missing feast into absence', () => {
        const week: CalendarWeekDto = [day(5, { articleId: null, feast: null, fast: true })];

        const mapped = resolveYear(yearDto([week])).months[0].weeks[0][0];

        expect(mapped?.articleId).toBeUndefined();
        expect(mapped?.feast).toBeUndefined();
        expect(mapped?.fast).toBe(true);
        expect(mapped?.articleTitle).toBe('5 ДЕКАБРЯ');
    });

    it('keeps a feast tier as it comes', () => {
        const week: CalendarWeekDto = [day(7, { feast: 'twelve' })];

        expect(resolveYear(yearDto([week])).months[0].weeks[0][0]?.feast).toBe('twelve');
    });

    it('turns the neighbouring years into absence at the ends of the range', () => {
        const result = resolveYear({ ...yearDto(), prev: null, next: null });

        expect(result.prev).toBeUndefined();
        expect(result.next).toBeUndefined();
    });

    it('passes the legend and the disclaimer through untouched', () => {
        const result = resolveYear(yearDto());

        expect(result.legend).toBe('<legend>');
        expect(result.disclaimer).toBe('<disclaimer>');
        expect(result.months[0].name).toBe('Январь');
    });
});
