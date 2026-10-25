import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SKIP_ERROR_NOTIFICATION } from '@drevo-web/core';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { JevChoiceQuestion, JevResponse } from './jev.model';
import { JEV_MODEL, JevApiService, OPENROUTER_SYSTEM_ONE_URL } from './jev-api.service';

const QUESTIONS: Readonly<Record<string, JevChoiceQuestion>> = {
    spelling: { type: 'choice', instructions: 'Есть ли ошибки?', criteria: { none: 'Нет', typo: 'Опечатка' } },
};

describe('JevApiService', () => {
    let spectator: SpectatorService<JevApiService>;
    let httpController: HttpTestingController;

    const createService = createServiceFactory({
        service: JevApiService,
        providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    beforeEach(() => {
        spectator = createService();
        httpController = spectator.inject(HttpTestingController);
    });

    afterEach(() => {
        httpController.verify();
    });

    it('should post the state and the questions to OpenRouter with the bearer key', () => {
        const response: JevResponse = {
            model: JEV_MODEL,
            answers: {
                spelling: {
                    type: 'choice',
                    choice: 'none',
                    confidence: 0.9,
                    probabilities: { none: 0.95, typo: 0.05 },
                },
            },
        };
        let received: JevResponse | undefined;

        spectator.service.systemOne('sk-or-key', 'Абзац.', QUESTIONS).subscribe(value => (received = value));

        const req = httpController.expectOne(OPENROUTER_SYSTEM_ONE_URL);
        expect(req.request.method).toBe('POST');
        expect(req.request.headers.get('Authorization')).toBe('Bearer sk-or-key');
        expect(req.request.withCredentials).toBe(false);
        expect(req.request.body).toEqual({ model: JEV_MODEL, state: 'Абзац.', questions: QUESTIONS });
        expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
        req.flush(response);

        expect(received).toEqual(response);
    });
});
