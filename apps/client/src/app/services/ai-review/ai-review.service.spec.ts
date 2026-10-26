import { HttpErrorResponse } from '@angular/common/http';
import { createServiceFactory, mockProvider, SpectatorService, SpyObject } from '@ngneat/spectator/jest';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { MockLoggerService, mockLoggerProvider } from '@drevo-web/core/testing';
import { expectObjectLike } from '@drevo-web/shared/testing';
import { defer, Observable, of, Subject, throwError } from 'rxjs';
import { AiThresholds, ProseLine } from './ai-review.model';
import { AiKeyService } from './ai-key.service';
import { AI_RETRY_DELAY_MS } from './ai-request';
import { AI_REVIEW_CONCURRENCY, AiReviewProgress, AiReviewService } from './ai-review.service';
import { JevResponse } from './jev.model';
import { JevApiService } from './jev-api.service';
import { AiThresholdsService } from './ai-thresholds.service';
import { DEFAULT_AI_THRESHOLDS } from './jev-questionnaire';

const CLEAN: JevResponse = {
    model: 'typesafe/jev-1.14',
    answers: {
        spelling: { type: 'choice', choice: 'none', confidence: 0.9, probabilities: { none: 0.95, typo: 0.05 } },
    },
};
const TYPO: JevResponse = {
    model: 'typesafe/jev-1.14',
    answers: { spelling: { type: 'choice', choice: 'typo', confidence: 0.9, probabilities: { none: 0.1, typo: 0.9 } } },
};

function proseLine(line: number, text: string): ProseLine {
    return { line, from: line * 100, to: line * 100 + text.length, text };
}

function httpError(status: number): HttpErrorResponse {
    return new HttpErrorResponse({ status, url: 'https://openrouter.ai/api/v1/systemone' });
}

describe('AiReviewService', () => {
    let spectator: SpectatorService<AiReviewService>;
    let api: SpyObject<JevApiService>;
    let notification: SpyObject<NotificationService>;
    let key: string | undefined;
    let thresholds: AiThresholds;

    const createService = createServiceFactory({
        service: AiReviewService,
        providers: [
            mockLoggerProvider(),
            mockProvider(JevApiService),
            mockProvider(NotificationService),
            mockProvider(AiKeyService, { key: () => key }),
            mockProvider(AiThresholdsService, { thresholds: () => thresholds }),
        ],
    });

    const run = (lines: readonly ProseLine[]): AiReviewProgress[] => {
        const progress: AiReviewProgress[] = [];
        spectator.service.review(lines).subscribe(value => progress.push(value));
        return progress;
    };

    beforeEach(() => {
        key = 'sk-or-key';
        thresholds = DEFAULT_AI_THRESHOLDS;
        spectator = createService();
        api = spectator.inject(JevApiService);
        notification = spectator.inject(NotificationService);
    });

    it('should ask about every line with text and report the findings as they arrive', () => {
        api.systemOne.mockReturnValueOnce(of(TYPO)).mockReturnValueOnce(of(CLEAN));

        const progress = run([proseLine(1, 'Апзац.'), proseLine(2, ''), proseLine(3, 'Абзац.')]);

        expect(api.systemOne).toHaveBeenCalledTimes(2);
        expect(api.systemOne).toHaveBeenCalledWith('sk-or-key', 'Апзац.', expect.anything());
        expect(progress.map(({ done, total }) => `${done}/${total}`)).toEqual(['0/2', '1/2', '2/2']);
        expect(progress.at(-1)?.findings).toEqual([
            expect.objectContaining({ ruleId: 'ai-spelling', from: 100, to: 106, level: 'serious' }),
        ]);
        expect(notification.error).not.toHaveBeenCalled();
    });

    it('should not ask again about a text it already has an answer for', () => {
        api.systemOne.mockReturnValue(of(TYPO));
        run([proseLine(1, 'Апзац.')]);

        const progress = run([proseLine(7, 'Апзац.')]);

        expect(api.systemOne).toHaveBeenCalledTimes(1);
        expect(progress.at(-1)?.findings).toEqual([expect.objectContaining({ from: 700, to: 706 })]);
    });

    it('should ask once about a text repeated within one run', () => {
        const pending = new Subject<JevResponse>();
        api.systemOne.mockReturnValue(pending);

        const progress = run([proseLine(1, 'Апзац.'), proseLine(2, 'Апзац.')]);
        pending.next(TYPO);
        pending.complete();

        expect(api.systemOne).toHaveBeenCalledTimes(1);
        expect(progress.at(-1)?.findings.map(finding => finding.from)).toEqual([100, 200]);
    });

    it('should ask again about a text whose request failed', () => {
        api.systemOne.mockReturnValueOnce(throwError(() => httpError(500))).mockReturnValueOnce(of(TYPO));
        run([proseLine(1, 'Апзац.')]);

        const progress = run([proseLine(1, 'Апзац.')]);

        expect(api.systemOne).toHaveBeenCalledTimes(2);
        expect(progress.at(-1)).toMatchObject({ failed: 0 });
    });

    it('should keep at most a few requests in flight', () => {
        const pending: Subject<JevResponse>[] = [];
        api.systemOne.mockImplementation(() => {
            const subject = new Subject<JevResponse>();
            pending.push(subject);
            return subject;
        });

        run(Array.from({ length: AI_REVIEW_CONCURRENCY + 2 }, (_, i) => proseLine(i + 1, `Абзац ${i}.`)));
        expect(api.systemOne).toHaveBeenCalledTimes(AI_REVIEW_CONCURRENCY);

        pending[0].next(CLEAN);
        pending[0].complete();
        expect(api.systemOne).toHaveBeenCalledTimes(AI_REVIEW_CONCURRENCY + 1);
    });

    it('should retry a rate-limited request once after a delay', () => {
        jest.useFakeTimers();
        // Like HttpClient's, the request is cold: each subscription sends it again.
        let attempts = 0;
        api.systemOne.mockReturnValue(defer(() => (++attempts === 1 ? throwError(() => httpError(429)) : of(TYPO))));

        const progress = run([proseLine(1, 'Апзац.')]);
        expect(attempts).toBe(1);

        jest.advanceTimersByTime(AI_RETRY_DELAY_MS);

        expect(attempts).toBe(2);
        expect(progress.at(-1)).toMatchObject({ done: 1, failed: 0 });
        jest.useRealTimers();
    });

    it('should stop the whole run on a rejected key, with one notification', () => {
        const queued = new Subject<JevResponse>();
        api.systemOne
            .mockReturnValueOnce(throwError(() => httpError(401)))
            .mockImplementation((): Observable<JevResponse> => queued);

        let completed = false;
        spectator.service
            .review([proseLine(1, 'Один.'), proseLine(2, 'Два.'), proseLine(3, 'Три.')])
            .subscribe({ complete: () => (completed = true) });

        expect(queued.observed).toBe(false);
        expect(completed).toBe(true);
        expect(notification.error).toHaveBeenCalledTimes(1);
        expect(notification.error).toHaveBeenCalledWith('Ключ ИИ не подошёл');
    });

    it('should skip a failed paragraph and sum the failures up in one notification', () => {
        api.systemOne
            .mockReturnValueOnce(throwError(() => httpError(500)))
            .mockReturnValueOnce(of(TYPO))
            .mockReturnValueOnce(throwError(() => httpError(0)));

        const progress = run([proseLine(1, 'Один.'), proseLine(2, 'Апзац.'), proseLine(3, 'Три.')]);

        expect(progress.at(-1)).toMatchObject({ done: 3, total: 3, failed: 2 });
        expect(progress.at(-1)?.findings).toHaveLength(1);
        expect(notification.error).toHaveBeenCalledTimes(1);
        expect(notification.error).toHaveBeenCalledWith('ИИ: не удалось проверить абзацев — 2 из 3');
    });

    it('should log the cause of the first failed paragraph', () => {
        const logger = (spectator.inject(LoggerService) as unknown as MockLoggerService).mockLogger;
        api.systemOne.mockReturnValueOnce(throwError(() => httpError(400))).mockReturnValueOnce(of(CLEAN));

        run([proseLine(1, 'Один.'), proseLine(2, 'Два.')]);

        expect(logger.error).toHaveBeenCalledWith(
            'AI review: paragraphs failed',
            expect.objectContaining({ failed: 1, total: 2, firstError: expectObjectLike({ status: 400 }) }),
        );
    });

    it('should rate the answers by the saved thresholds', () => {
        thresholds = { finding: 0.95, hint: 0.5 };
        api.systemOne.mockReturnValue(of(TYPO));

        const progress = run([proseLine(1, 'Апзац.')]);

        expect(progress.at(-1)?.findings).toEqual([expect.objectContaining({ ruleId: 'ai-spelling', level: 'hint' })]);
    });

    it('should ask nothing without a key', () => {
        key = undefined;

        expect(run([proseLine(1, 'Абзац.')])).toEqual([]);
        expect(api.systemOne).not.toHaveBeenCalled();
    });
});
