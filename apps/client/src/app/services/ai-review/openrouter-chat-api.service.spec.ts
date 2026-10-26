import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SKIP_ERROR_NOTIFICATION } from '@drevo-web/core';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { OpenRouterChatRequest, OpenRouterChatResponse } from './openrouter-chat.model';
import { OPENROUTER_CHAT_URL, OpenRouterChatApiService } from './openrouter-chat-api.service';

const REQUEST: OpenRouterChatRequest = {
    model: 'anthropic/claude-haiku-5.5',
    messages: [{ role: 'user', content: 'Абзац.' }],
    response_format: { type: 'json_schema', json_schema: { name: 'errors', strict: true, schema: {} } },
    reasoning: { effort: 'low' },
};

describe('OpenRouterChatApiService', () => {
    let spectator: SpectatorService<OpenRouterChatApiService>;
    let httpController: HttpTestingController;

    const createService = createServiceFactory({
        service: OpenRouterChatApiService,
        providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    beforeEach(() => {
        spectator = createService();
        httpController = spectator.inject(HttpTestingController);
    });

    afterEach(() => {
        httpController.verify();
    });

    it('should post the request to OpenRouter with the bearer key and no credentials', () => {
        const response: OpenRouterChatResponse = { choices: [{ message: { content: '{"errors":[]}' } }] };
        let received: OpenRouterChatResponse | undefined;

        spectator.service.complete('sk-or-key', REQUEST).subscribe(value => (received = value));

        const req = httpController.expectOne(OPENROUTER_CHAT_URL);
        expect(req.request.method).toBe('POST');
        expect(req.request.headers.get('Authorization')).toBe('Bearer sk-or-key');
        expect(req.request.withCredentials).toBe(false);
        expect(req.request.body).toEqual(REQUEST);
        expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
        req.flush(response);

        expect(received).toEqual(response);
    });
});
