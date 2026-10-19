import { browserConfig } from './app.config.browser';
import { DELEGATE_ERROR_HANDLER } from './services/app-update/chunk-error-handler';
import { ErrorHandler, Provider } from '@angular/core';

jest.mock('../environments/environment', () => ({
    environment: { production: true, sentryDsn: 'https://key@sentry.example/1' },
}));

const providedTokens = (): unknown[] =>
    (browserConfig.providers as Provider[]).flatMap((provider): unknown[] => {
        if (typeof provider !== 'object' || !('provide' in provider)) {
            return [];
        }
        // Provider['provide'] is `any` in Angular's typings.
        const token: unknown = provider.provide;
        return [token];
    });

describe('browserConfig with a Sentry DSN', () => {
    it('does not replace the ErrorHandler, so ChunkErrorHandler from appConfig stays in charge', () => {
        expect(providedTokens()).not.toContain(ErrorHandler);
    });

    it('hands errors to Sentry through the delegate ChunkErrorHandler calls', () => {
        expect(providedTokens()).toContain(DELEGATE_ERROR_HANDLER);
    });
});
