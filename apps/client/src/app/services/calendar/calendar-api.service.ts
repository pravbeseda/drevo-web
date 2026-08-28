import { environment } from '../../../environments/environment';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SKIP_ERROR_FOR_STATUSES } from '@drevo-web/core';
import { ApiResponse, CalendarYearDto, assertIsDefined } from '@drevo-web/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Low-level API service for the Orthodox calendar.
 *
 * @internal Use CalendarService instead
 */
@Injectable({ providedIn: 'root' })
export class CalendarApiService {
    private readonly apiUrl = environment.apiUrl;
    private readonly http = inject(HttpClient);

    /**
     * The year's months, plus the legend and the disclaimer as HTML.
     *
     * A year outside the supported range answers 400, which is a routing
     * outcome rather than a failure worth a toast — the page turns it into the
     * error component.
     */
    getYear(year: number): Observable<CalendarYearDto> {
        return this.http
            .get<ApiResponse<CalendarYearDto>>(`${this.apiUrl}/api/calendar/year/${year}`, {
                withCredentials: true,
                context: new HttpContext().set(SKIP_ERROR_FOR_STATUSES, [400]),
            })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }
}
