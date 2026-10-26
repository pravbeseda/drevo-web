import { openRouterOptions } from './ai-request';
import { OpenRouterChatRequest, OpenRouterChatResponse } from './openrouter-chat.model';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

@Injectable({
    providedIn: 'root',
})
export class OpenRouterChatApiService {
    private readonly http = inject(HttpClient);

    complete(key: string, request: OpenRouterChatRequest): Observable<OpenRouterChatResponse> {
        return this.http.post<OpenRouterChatResponse>(OPENROUTER_CHAT_URL, request, openRouterOptions(key));
    }
}
