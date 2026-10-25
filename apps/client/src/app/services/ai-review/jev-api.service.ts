import { JevChoiceQuestion, JevRequest, JevResponse } from './jev.model';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SKIP_ERROR_NOTIFICATION } from '@drevo-web/core';
import { Observable } from 'rxjs';

// OpenRouter, not api.typesafe.ai: TypeSafe refuses browser origins on the CORS preflight.
export const OPENROUTER_SYSTEM_ONE_URL = 'https://openrouter.ai/api/v1/systemone';
// Pinned: the thresholds are calibrated against one model.
export const JEV_MODEL = 'typesafe/jev-1.14';

@Injectable({
    providedIn: 'root',
})
export class JevApiService {
    private readonly http = inject(HttpClient);

    // No `withCredentials`: OpenRouter answers `access-control-allow-origin: *`, which credentials fail.
    systemOne(
        key: string,
        state: string,
        questions: Readonly<Record<string, JevChoiceQuestion>>,
    ): Observable<JevResponse> {
        const body: JevRequest = { model: JEV_MODEL, state, questions };
        return this.http.post<JevResponse>(OPENROUTER_SYSTEM_ONE_URL, body, {
            headers: { Authorization: `Bearer ${key}` },
            context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
        });
    }
}
