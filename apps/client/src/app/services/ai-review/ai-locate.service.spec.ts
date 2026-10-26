import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { expectAny, expectObjectLike } from '@drevo-web/shared/testing';
import { createServiceFactory, mockProvider, SpectatorService, SpyObject } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';
import { AiKeyService } from './ai-key.service';
import { AiLocatedError } from './ai-locate.model';
import { AiLocateService } from './ai-locate.service';
import { OpenRouterChatRequest, OpenRouterChatResponse } from './openrouter-chat.model';
import { OpenRouterChatApiService } from './openrouter-chat-api.service';

const TEXT = 'В абзаце есть ашибка.';

function answer(content: string | null): OpenRouterChatResponse {
    return { choices: [{ message: { content } }] };
}

describe('AiLocateService', () => {
    let spectator: SpectatorService<AiLocateService>;
    let api: SpyObject<OpenRouterChatApiService>;
    let notification: SpyObject<NotificationService>;
    let key: string | undefined;

    const createService = createServiceFactory({
        service: AiLocateService,
        providers: [
            mockLoggerProvider(),
            mockProvider(OpenRouterChatApiService),
            mockProvider(NotificationService),
            mockProvider(AiKeyService, { key: () => key }),
        ],
    });

    const locate = (...args: Parameters<AiLocateService['locate']>) => {
        const result: { errors?: readonly AiLocatedError[]; error?: unknown } = {};
        spectator.service.locate(...args).subscribe({
            next: errors => (result.errors = errors),
            error: (err: unknown) => (result.error = err),
        });
        return result;
    };

    beforeEach(() => {
        key = 'sk-or-key';
        spectator = createService();
        api = spectator.inject(OpenRouterChatApiService);
        notification = spectator.inject(NotificationService);
    });

    it('should ask the model about the category and return the errors it quotes', () => {
        let sent: OpenRouterChatRequest | undefined;
        api.complete.mockImplementation((_key: string, request: OpenRouterChatRequest) => {
            sent = request;
            return of(
                answer(
                    JSON.stringify({
                        errors: [
                            { quote: 'ашибка', suggestion: 'ошибка', explanation: 'Опечатка в корне' },
                            { quote: 'есть', suggestion: '', explanation: 'Лишнее слово' },
                        ],
                    }),
                ),
            );
        });

        const result = locate('haiku', 'spelling', TEXT);

        expect(result.errors).toEqual([
            { quote: 'ашибка', suggestion: 'ошибка', explanation: 'Опечатка в корне' },
            { quote: 'есть', explanation: 'Лишнее слово' },
        ]);
        expect(api.complete).toHaveBeenCalledWith('sk-or-key', expectAny(Object));
        expect(sent?.model).toBe('anthropic/claude-haiku-5.5');
        expect(sent?.messages[0].role).toBe('system');
        expect(sent?.messages[0].content).toContain('орфографические ошибки и опечатки');
        expect(sent?.messages[1]).toEqual({ role: 'user', content: TEXT });
        expect(sent?.response_format.json_schema.strict).toBe(true);
        expect(sent?.reasoning).toEqual({ effort: 'low' });
    });

    it('should send a Luna click to Luna', () => {
        api.complete.mockReturnValue(of(answer('{"errors":[]}')));

        expect(locate('luna', 'style', TEXT).errors).toEqual([]);
        expect(api.complete).toHaveBeenCalledWith(
            'sk-or-key',
            expectObjectLike<OpenRouterChatRequest>({ model: 'openai/gpt-6-luna' }),
        );
    });

    it.each([
        ['not JSON', 'Ошибок нет.'],
        ['JSON of another shape', '{"errors":[{"quote":1}]}'],
        ['no content', null],
    ])('should fail on an answer with %s', (_, content) => {
        api.complete.mockReturnValue(of(answer(content)));

        expect(locate('haiku', 'grammar', TEXT).error).toBeInstanceOf(Error);
    });

    it('should not ask the same model the same thing twice', () => {
        api.complete.mockReturnValue(of(answer('{"errors":[]}')));

        locate('haiku', 'style', TEXT);
        locate('haiku', 'style', TEXT);
        locate('luna', 'style', TEXT);
        locate('haiku', 'grammar', TEXT);

        expect(api.complete).toHaveBeenCalledTimes(3);
    });

    it('should ask again after a failed answer', () => {
        api.complete
            .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
            .mockReturnValueOnce(of(answer('{"errors":[]}')));

        expect(locate('haiku', 'style', TEXT).error).toBeInstanceOf(HttpErrorResponse);
        expect(locate('haiku', 'style', TEXT).errors).toEqual([]);
        expect(notification.error).not.toHaveBeenCalled();
    });

    it('should say so once the key is rejected', () => {
        api.complete.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

        expect(locate('haiku', 'style', TEXT).error).toBeInstanceOf(HttpErrorResponse);
        expect(notification.error).toHaveBeenCalledWith('Ключ ИИ не подошёл');
    });

    it('should ask nothing without a key', () => {
        key = undefined;

        expect(locate('haiku', 'style', TEXT)).toEqual({});
        expect(api.complete).not.toHaveBeenCalled();
    });
});
