import { environment } from '../../../environments/environment';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SKIP_ERROR_NOTIFICATION } from '@drevo-web/core';
import { ApiResponse, InworkCheckResponseDto, InworkItemDto } from '@drevo-web/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class InworkApiService {
    private readonly apiUrl = environment.apiUrl;
    private readonly http = inject(HttpClient);
    private readonly skipErrorContext = new HttpContext().set(SKIP_ERROR_NOTIFICATION, true);

    check(module: string, title: string): Observable<InworkCheckResponseDto> {
        const params = new HttpParams().set('module', module).set('title', title);

        return this.http
            .get<ApiResponse<InworkCheckResponseDto>>(`${this.apiUrl}/api/inwork/check`, {
                params,
                withCredentials: true,
                context: this.skipErrorContext,
            })
            .pipe(
                map(response => {
                    return response.data ?? { editor: undefined };
                }),
            );
    }

    getList(): Observable<InworkItemDto[]> {
        return this.http
            .get<ApiResponse<InworkItemDto[]>>(`${this.apiUrl}/api/inwork/list`, {
                withCredentials: true,
                context: this.skipErrorContext,
            })
            .pipe(
                map(response => {
                    return response.data ?? [];
                }),
            );
    }

    markEditing(module: string, title: string, versionId: number): Observable<void> {
        return this.http
            .post<ApiResponse<undefined>>(
                `${this.apiUrl}/api/inwork/mark`,
                { module, title, versionId },
                {
                    withCredentials: true,
                    context: this.skipErrorContext,
                },
            )
            .pipe(map(() => undefined));
    }

    clearEditing(module: string, title: string): Observable<void> {
        return this.http
            .post<ApiResponse<undefined>>(
                `${this.apiUrl}/api/inwork/clear`,
                { module, title },
                {
                    withCredentials: true,
                    context: this.skipErrorContext,
                },
            )
            .pipe(map(() => undefined));
    }
}
