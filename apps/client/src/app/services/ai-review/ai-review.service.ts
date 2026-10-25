import { AiKeyService } from './ai-key.service';
import { ProseLine } from './ai-review.model';
import { JEV_MODEL, JevApiService } from './jev-api.service';
import { JEV_QUESTIONNAIRE_VERSION, JEV_QUESTIONS, toFindings } from './jev-questionnaire';
import { JevChoiceAnswer } from './jev.model';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { CheckFinding } from '@drevo-web/editor';
import {
    EMPTY,
    Observable,
    catchError,
    defer,
    from,
    map,
    mergeMap,
    of,
    retry,
    scan,
    shareReplay,
    startWith,
    tap,
    throwError,
    timer,
} from 'rxjs';

export const AI_REVIEW_CONCURRENCY = 4;
// OpenRouter does not expose `Retry-After` to the page, so a rate-limited request waits a fixed time.
export const AI_REVIEW_RETRY_DELAY_MS = 2000;

export interface AiReviewProgress {
    readonly done: number;
    readonly total: number;
    readonly failed: number;
    readonly findings: readonly CheckFinding[];
}

type Answers = Readonly<Partial<Record<string, JevChoiceAnswer>>>;

interface LineOutcome {
    readonly findings: readonly CheckFinding[];
    readonly failed: boolean;
    readonly error?: unknown;
}

function hasStatus(err: unknown, status: number): boolean {
    return err instanceof HttpErrorResponse && err.status === status;
}

// What tells a wrong request from an outage; an HttpErrorResponse carries no request headers, so no key.
function describeError(err: unknown): unknown {
    if (err instanceof HttpErrorResponse) {
        const body: unknown = err.error;
        return { status: err.status, message: err.message, body };
    }
    return err instanceof Error ? { message: err.message } : err;
}

/** Asks Jev about each line, a few at a time; one outcome per run, never one per paragraph. */
@Injectable({
    providedIn: 'root',
})
export class AiReviewService {
    private readonly api = inject(JevApiService);
    private readonly aiKey = inject(AiKeyService);
    private readonly notification = inject(NotificationService);
    private readonly logger = inject(LoggerService).withContext('AiReviewService');

    // Keyed by the text, so a paragraph unchanged across versions is asked once per tab; holding the request
    // itself, so a text repeated within one run shares the request still in flight.
    private readonly cache = new Map<string, Observable<Answers>>();

    review(lines: readonly ProseLine[]): Observable<AiReviewProgress> {
        const key = this.aiKey.key();
        const asked = lines.filter(line => line.text !== '');
        if (!key || asked.length === 0) return EMPTY;

        return defer(() => {
            const initial: AiReviewProgress = { done: 0, total: asked.length, failed: 0, findings: [] };
            let last = initial;
            let firstError: unknown;

            return from(asked).pipe(
                mergeMap(line => this.ask(key, line), AI_REVIEW_CONCURRENCY),
                tap(outcome => (firstError ??= outcome.error)),
                scan(
                    (progress, outcome): AiReviewProgress => ({
                        ...progress,
                        done: progress.done + 1,
                        failed: progress.failed + (outcome.failed ? 1 : 0),
                        findings: [...progress.findings, ...outcome.findings],
                    }),
                    initial,
                ),
                startWith(initial),
                tap({ next: progress => (last = progress), complete: () => this.reportDone(last, firstError) }),
                catchError((err: unknown) => {
                    if (!hasStatus(err, HttpStatusCode.Unauthorized)) return throwError(() => err);
                    this.notification.error('Ключ ИИ не подошёл');
                    this.logger.error('AI review: key rejected', { status: HttpStatusCode.Unauthorized });
                    return EMPTY;
                }),
            );
        });
    }

    private ask(key: string, line: ProseLine): Observable<LineOutcome> {
        return this.answers(key, line.text).pipe(
            map((answers): LineOutcome => ({ findings: toFindings(answers, line), failed: false })),
            catchError((err: unknown) =>
                hasStatus(err, HttpStatusCode.Unauthorized)
                    ? throwError(() => err)
                    : of<LineOutcome>({ findings: [], failed: true, error: err }),
            ),
        );
    }

    private answers(key: string, text: string): Observable<Answers> {
        const cacheKey = `${JEV_MODEL}|${JEV_QUESTIONNAIRE_VERSION}|${text}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        const request = this.api.systemOne(key, text, JEV_QUESTIONS).pipe(
            retry({
                count: 1,
                delay: (err: unknown) =>
                    hasStatus(err, HttpStatusCode.TooManyRequests)
                        ? timer(AI_REVIEW_RETRY_DELAY_MS)
                        : throwError(() => err),
            }),
            map(response => response.answers),
            catchError((err: unknown) => {
                this.cache.delete(cacheKey);
                return throwError(() => err);
            }),
            shareReplay(1),
        );
        this.cache.set(cacheKey, request);
        return request;
    }

    private reportDone({ total, failed }: AiReviewProgress, firstError: unknown): void {
        this.logger.info('AI review: done', { total, failed });
        if (failed === 0) return;
        this.notification.error(`ИИ: не удалось проверить абзацев — ${failed} из ${total}`);
        this.logger.error('AI review: paragraphs failed', { failed, total, firstError: describeError(firstError) });
    }
}
