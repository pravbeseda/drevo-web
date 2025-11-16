const PROXY_CONFIG = (() => {
  // Определяем target на основе переменной окружения
  const target = process.env['YII_BACKEND_URL'] || 'http://drevo-local.ru';
  const isSecure = target.startsWith('https://');

  console.log(`[Proxy] Using backend URL: ${target}`);

  const config = {
    '/api': {
      target,
      secure: isSecure,
      changeOrigin: true,
      logLevel: 'debug',
    },
    '/legacy': {
      target,
      secure: isSecure,
      changeOrigin: true,
      logLevel: 'debug',
      pathRewrite: {
        '^/legacy': '',
      },
    },
    '/css': {
      target,
      secure: isSecure,
      changeOrigin: true,
      logLevel: 'info',
    },
    '/js': {
      target,
      secure: isSecure,
      changeOrigin: true,
      logLevel: 'info',
    },
    '/images': {
      target,
      secure: isSecure,
      changeOrigin: true,
      logLevel: 'info',
    },
    '/pictures': {
      target,
      secure: isSecure,
      changeOrigin: true,
      logLevel: 'info',
    },
    '/fonts': {
      target,
      secure: isSecure,
      changeOrigin: true,
      logLevel: 'info',
    },
    '/assets': {
      target,
      secure: isSecure,
      changeOrigin: true,
      logLevel: 'info',
    },
  };

  return config;
})();

module.exports = PROXY_CONFIG;
