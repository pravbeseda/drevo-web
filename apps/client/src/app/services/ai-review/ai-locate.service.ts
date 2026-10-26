import { AiKeyService } from './ai-key.service';
import { AI_LOCATE_MODELS, AiLocatedError, AiLocateModel } from './ai-locate.model';
import { cachedRequest, describeError, hasStatus } from './ai-request';
import { AiCheckCategory } from './ai-review.model';
import { OpenRouterChatApiService } from './openrouter-chat-api.service';
import { OpenRouterChatRequest, OpenRouterChatResponse } from './openrouter-chat.model';
import { HttpStatusCode } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { CheckCategory } from '@drevo-web/editor';
import { EMPTY, Observable, catchError, map, throwError } from 'rxjs';

/** Bumped whenever the prompt or the schema changes, so cached answers to the old wording are not reused. */
const AI_LOCATE_PROMPT_VERSION = 1;
// A click should answer in seconds, so the models think as little as they can.
const AI_LOCATE_REASONING_EFFORT = 'low';

const CATEGORY_TASKS: Readonly<Record<AiCheckCategory, string>> = {
    spelling: 'орфографические ошибки и опечатки',
    grammar: 'грамматические ошибки: нарушенное согласование, неверное управление или предлог, пунктуационные ошибки',
    style: 'нарушения энциклопедического стиля: разговорные обороты, канцелярит, оценочные или эмоциональные слова',
};

const ERRORS_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['errors'],
    properties: {
        errors: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['quote', 'suggestion', 'explanation'],
                properties: {
                    quote: { type: 'string' },
                    suggestion: { type: 'string' },
                    explanation: { type: 'string' },
                },
            },
        },
    },
};

export function isAiCheckCategory(category: CheckCategory): category is AiCheckCategory {
    return category in CATEGORY_TASKS;
}

function systemPrompt(category: AiCheckCategory): string {
    return [
        'Ты — корректор православной энциклопедии на русском языке. Тебе дан один абзац статьи.',
        `Найди в нём только ${CATEGORY_TASKS[category]}. Ошибки других видов не называй.`,
        'Стиль цитат не оценивай. Церковнославянский богослужебный текст (молитвы, песнопения) не исправляй: его написание, грамматика и стиль — не ошибка.',
        'Для каждой ошибки верни: quote — фрагмент абзаца, скопированный символ в символ, самый короткий, по которому ошибку видно однозначно; ' +
            'suggestion — исправленный фрагмент или пустую строку, если исправление не очевидно; explanation — коротко, по-русски, в чём ошибка.',
        'Если ошибок нет, верни пустой список.',
    ].join('\n');
}

function toRequest(model: string, category: AiCheckCategory, text: string): OpenRouterChatRequest {
    return {
        model,
        messages: [
            { role: 'system', content: systemPrompt(category) },
            { role: 'user', content: text },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'errors', strict: true, schema: ERRORS_SCHEMA } },
        reasoning: { effort: AI_LOCATE_REASONING_EFFORT },
    };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === 'object' && !!value;
}

function toLocatedError(value: unknown): AiLocatedError | undefined {
    if (!isRecord(value)) return undefined;
    const { quote, suggestion, explanation } = value;
    if (typeof quote !== 'string' || typeof suggestion !== 'string' || typeof explanation !== 'string') {
        return undefined;
    }
    return suggestion ? { quote, suggestion, explanation } : { quote, explanation };
}

// The model's answer crosses a trust boundary: anything but the schema's shape is a failed answer, not an empty one.
function toLocatedErrors(response: OpenRouterChatResponse): readonly AiLocatedError[] {
    const items = parseErrorsField(response.choices[0]?.message.content);
    const errors = Array.isArray(items) ? items.map(toLocatedError) : undefined;
    if (!errors || errors.some(error => error === undefined)) throw new Error('AI locate: malformed answer');
    return errors.filter(error => error !== undefined);
}

function parseErrorsField(content: unknown): unknown {
    if (typeof content !== 'string') return undefined;
    try {
        const parsed: unknown = JSON.parse(content);
        return isRecord(parsed) ? parsed['errors'] : undefined;
    } catch {
        return undefined;
    }
}

/** Asks Haiku or Luna where exactly in a paragraph the problems of one category are. */
@Injectable({
    providedIn: 'root',
})
export class AiLocateService {
    private readonly api = inject(OpenRouterChatApiService);
    private readonly aiKey = inject(AiKeyService);
    private readonly notification = inject(NotificationService);
    private readonly logger = inject(LoggerService).withContext('AiLocateService');

    private readonly cache = new Map<string, Observable<readonly AiLocatedError[]>>();

    locate(model: AiLocateModel, category: AiCheckCategory, text: string): Observable<readonly AiLocatedError[]> {
        const key = this.aiKey.key();
        if (!key) return EMPTY;

        const { id } = AI_LOCATE_MODELS[model];
        return cachedRequest(this.cache, `${id}|${AI_LOCATE_PROMPT_VERSION}|${category}|${text}`, () =>
            this.api.complete(key, toRequest(id, category, text)).pipe(map(toLocatedErrors)),
        ).pipe(
            catchError((err: unknown) => {
                if (hasStatus(err, HttpStatusCode.Unauthorized)) this.notification.error('Ключ ИИ не подошёл');
                this.logger.error('AI locate: failed', { model, category, error: describeError(err) });
                return throwError(() => err);
            }),
        );
    }
}
