import { environment } from '../environments/environment';
import { DELEGATE_ERROR_HANDLER } from './services/app-update/chunk-error-handler';
import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { Router } from '@angular/router';
import * as Sentry from '@sentry/angular';

/**
 * Browser-specific configuration that should NOT be included in SSR.
 * Sentry Angular SDK uses browser-only APIs and must not run on the server.
 */
export const browserConfig: ApplicationConfig = {
    providers: [
        // Sentry's ErrorHandler reports to Sentry and logs to the console; ChunkErrorHandler hands
        // every error to it. Only enabled when Sentry DSN is configured
        ...(environment.sentryDsn
            ? [
                  {
                      provide: DELEGATE_ERROR_HANDLER,
                      useValue: Sentry.createErrorHandler(),
                  },
                  { provide: Sentry.TraceService, deps: [Router] },
                  provideAppInitializer(() => {
                      inject(Sentry.TraceService);
                  }),
              ]
            : []),
    ],
};
