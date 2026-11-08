import { environment } from '../../../environments/environment';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SKIP_ERROR_NOTIFICATION } from '@drevo-web/core';
import { ApiResponse, HistoryCountsDto, assertIsDefined } from '@drevo-web/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CountsApiService {
    private readonly apiUrl = environment.apiUrl;
    private readonly http = inject(HttpClient);

    getHistoryCounts(): Observable<HistoryCountsDto> {
        return this.http
            .get<ApiResponse<HistoryCountsDto>>(`${this.apiUrl}/api/counts`, {
                withCredentials: true,
                context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
            })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }
}
