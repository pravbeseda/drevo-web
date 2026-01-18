export const environment = {
    production: false,
    version: 'dev',
    // Use empty string for same-origin requests through Angular proxy
    // Proxy is configured in proxy.conf.json to forward /api/* to drevo-local.ru
    apiUrl: '',
    // Sentry DSN - empty in development to disable
    sentryDsn: '',
};
