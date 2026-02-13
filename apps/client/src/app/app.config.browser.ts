import { environment } from '../environments/environment';
import { ApplicationConfig, ErrorHandler, inject, provideAppInitializer } from '@angular/core';
import { Router } from '@angular/router';
import * as Sentry from '@sentry/angular';

/**
 * Browser-specific configuration that should NOT be included in SSR.
 * Sentry Angular SDK uses browser-only APIs and must not run on the server.
 */
export const browserConfig: ApplicationConfig = {
    providers: [
        // Sentry ErrorHandler and Tracing for catching unhandled Angular errors
        // Only enabled when Sentry DSN is configured
        ...(environment.sentryDsn
            ? [
                  {
                      provide: ErrorHandler,
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
