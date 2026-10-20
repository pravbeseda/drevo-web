import { config } from './app.config.server';
import { DELEGATE_ERROR_HANDLER } from './services/app-update/chunk-error-handler';
import { ErrorHandler, Provider } from '@angular/core';

describe('server config', () => {
    it("hands unhandled errors to Angular's own ErrorHandler, which writes them to the server log", () => {
        const delegate = (config.providers as Provider[]).find(
            provider =>
                typeof provider === 'object' && 'provide' in provider && provider.provide === DELEGATE_ERROR_HANDLER,
        );

        expect(delegate).toEqual({ provide: DELEGATE_ERROR_HANDLER, useClass: ErrorHandler });
    });
});
