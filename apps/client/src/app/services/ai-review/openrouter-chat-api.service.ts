import { OpenRouterChatRequest, OpenRouterChatResponse } from './openrouter-chat.model';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SKIP_ERROR_NOTIFICATION } from '@drevo-web/core';
import { Observable } from 'rxjs';

export const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

@Injectable({
    providedIn: 'root',
})
export class OpenRouterChatApiService {
    private readonly http = inject(HttpClient);

    // No `withCredentials`: OpenRouter answers `access-control-allow-origin: *`, which credentials fail.
    complete(key: string, request: OpenRouterChatRequest): Observable<OpenRouterChatResponse> {
        return this.http.post<OpenRouterChatResponse>(OPENROUTER_CHAT_URL, request, {
            headers: { Authorization: `Bearer ${key}` },
            context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
        });
    }
}
