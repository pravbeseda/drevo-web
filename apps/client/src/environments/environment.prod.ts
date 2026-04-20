export const environment = {
    production: true,
    version: '__VERSION_PLACEHOLDER__',
    apiUrl: 'https://drevo-info.ru',
    // Sentry DSN for error tracking - set via CI/CD or manually
    sentryDsn: '__SENTRY_DSN_PLACEHOLDER__',
    // Version check interval (5 minutes in production)
    versionCheckIntervalMs: 5 * 60 * 1000,
};
