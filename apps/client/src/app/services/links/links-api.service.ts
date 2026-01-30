import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
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
        let body = new HttpParams();
        links.forEach(link => {
            body = body.append('links[]', link);
        });

        return this.http
            .post<LinksCheckResponse>(
                `${this.apiUrl}/api/links/check`,
                body.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                }
            )
            .pipe(
                map(raw => {
                    const result: Record<string, boolean> = {};
                    Object.entries(raw).forEach(([key, value]) => {
                        result[key] = value.isExist;
                    });
                    return result;
                })
            );
    }
}
