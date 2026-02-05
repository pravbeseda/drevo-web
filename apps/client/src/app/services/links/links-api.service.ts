import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiResponse, assertIsDefined } from '@drevo-web/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface LinksCheckResponse {
    [key: string]: { isExist: boolean };
}

/**
 * Low-level API service for links-related HTTP requests.
 *
 * @internal Use LinksService instead
 */
@Injectable({
    providedIn: 'root',
})
export class LinksApiService {
    private readonly apiUrl = environment.apiUrl;
    private readonly http = inject(HttpClient);

    /**
     * Check if links exist
     *
     * @param links - Array of link keys to check
     * @returns Observable with record of link existence statuses
     */
    checkLinks(links: string[]): Observable<Record<string, boolean>> {
        return this.http
            .post<
                ApiResponse<LinksCheckResponse>
            >(`${this.apiUrl}/api/wiki-links/check`, { links }, { withCredentials: true })
            .pipe(
                map(response => {
                    assertIsDefined(
                        response.data,
                        'Response data is undefined'
                    );
                    const result: Record<string, boolean> = {};
                    Object.entries(response.data).forEach(([key, value]) => {
                        result[key] = value.isExist;
                    });
                    return result;
                })
            );
    }
}
