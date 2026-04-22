import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { browserConfig } from './app/app.config.browser';
import { BUILD_INFO } from './app/shared/build-info';
import { environment } from './environments/environment';
import { mergeApplicationConfig } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';

// Initialize Sentry as early as possible for global error catching
if (environment.sentryDsn && environment.production) {
    Sentry.init({
        dsn: environment.sentryDsn,
        environment: 'production',
        release: BUILD_INFO.version,
        integrations: [
            // Automatically capture unhandled errors and promise rejections
            Sentry.browserTracingIntegration(),
            // Capture console errors as breadcrumbs
            Sentry.breadcrumbsIntegration({
                console: true,
                dom: true,
                fetch: true,
                history: true,
                xhr: true,
            }),
        ],
        // Performance monitoring sample rate (adjust as needed)
        tracesSampleRate: 0.1,
        // Only send errors from production domain
        allowUrls: [/drevo-info\.ru/],
    });
}

// Merge base config with browser-specific providers (Sentry ErrorHandler, TraceService)
const config = mergeApplicationConfig(appConfig, browserConfig);

bootstrapApplication(AppComponent, config).catch(err => console.error(err));
