import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiResponse, HistoryCountsDto, assertIsDefined } from '@drevo-web/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CountsApiService {
    private readonly apiUrl = environment.apiUrl;
    private readonly http = inject(HttpClient);

    getHistoryCounts(): Observable<HistoryCountsDto> {
        return this.http
            .get<ApiResponse<HistoryCountsDto>>(`${this.apiUrl}/api/counts`, { withCredentials: true })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                })
            );
    }
}
