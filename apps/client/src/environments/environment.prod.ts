export const environment = {
    production: true,
    apiUrl: 'https://drevo-info.ru',
    // Sentry DSN for error tracking - set via CI/CD or manually
    sentryDsn: '__SENTRY_DSN_PLACEHOLDER__',
    versionCheckIntervalMs: 5 * 60 * 1000,
};
