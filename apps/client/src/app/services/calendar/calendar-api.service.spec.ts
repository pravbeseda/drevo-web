import { CalendarApiService } from './calendar-api.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { SKIP_ERROR_FOR_STATUSES } from '@drevo-web/core';
import { CalendarYearDto } from '@drevo-web/shared';

describe('CalendarApiService', () => {
    let spectator: SpectatorService<CalendarApiService>;
    let httpController: HttpTestingController;

    const createService = createServiceFactory({
        service: CalendarApiService,
        providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    const yearDto: CalendarYearDto = {
        year: 2026,
        prev: 2025,
        next: 2027,
        months: [],
        legend: '<legend>',
        disclaimer: '<disclaimer>',
    };

    beforeEach(() => {
        spectator = createService();
        httpController = spectator.inject(HttpTestingController);
    });

    afterEach(() => {
        httpController.verify();
    });

    it('should call GET /api/calendar/year/<year> and return data', () => {
        let result: CalendarYearDto | undefined;
        spectator.service.getYear(2026).subscribe(dto => (result = dto));

        const req = httpController.expectOne('/api/calendar/year/2026');
        expect(req.request.method).toBe('GET');
        expect(req.request.withCredentials).toBe(true);
        req.flush({ success: true, data: yearDto });

        expect(result).toEqual(yearDto);
    });

    it('should let a 400 through without a global error notification', () => {
        // An out-of-range year is a routing outcome, not a failure worth a toast:
        // the page answers it with the error component.
        let status: number | undefined;
        spectator.service
            .getYear(1800)
            .subscribe({ error: (err: unknown) => (status = (err as { status: number }).status) });

        const req = httpController.expectOne('/api/calendar/year/1800');
        expect(req.request.context.get(SKIP_ERROR_FOR_STATUSES)).toContain(400);
        req.flush({ success: false }, { status: 400, statusText: 'Bad Request' });

        expect(status).toBe(400);
    });
});
