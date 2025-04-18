import { Injectable } from '@angular/core';
import { debounceTime, filter, map, Observable, of, switchMap } from 'rxjs';
import { IframeService } from '../iframe/iframe.service';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

interface RawResponse {
    [key: string]: { isExist: boolean };
}

@Injectable()
export class LinksService {
    constructor(
        private readonly http: HttpClient,
        private readonly iframeService: IframeService
    ) {}

    getLinkStatuses(links: string[]): Observable<Record<string, boolean>> {
        if (links.length === 0) {
            return of({});
        }

        return this.iframeService.csrfToken$.pipe(
            filter(token => !!token),
            debounceTime(300),
            switchMap(token => {
                let body = new HttpParams();
                links.forEach(link => {
                    body = body.append('links[]', link);
                });
                if (token) {
                    body = body.set('YII_CSRF_TOKEN', token);
                }
                return this.http.post<RawResponse>(
                    '/api/links/check',
                    body.toString(),
                    {
                        headers: new HttpHeaders({
                            'Content-Type':
                                'application/x-www-form-urlencoded;charset=UTF-8',
                            'X-Requested-With': 'XMLHttpRequest',
                        }),
                        withCredentials: true, // если нужны cookie‑сессии
                    }
                );
            }),
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
