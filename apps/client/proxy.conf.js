const PROXY_CONFIG = (() => {
  // Определяем target на основе переменной окружения
  const target = process.env['YII_BACKEND_URL'] || 'http://drevo-local.ru';
  const isSecure = target.startsWith('https://');

  const paths = [
    '/api',
    { path: '/legacy', pathRewrite: { '^/legacy': '' } },
    '/css',
    '/js',
    '/images',
    '/pictures',
    '/fonts',
    '/assets',
    '/external',
  ];

  return paths.reduce((config, item) => {
    const path = typeof item === 'string' ? item : item.path;
    const pathRewrite = typeof item === 'object' ? item.pathRewrite : undefined;
    
    config[path] = {
      target,
      secure: isSecure,
      changeOrigin: true,
      logLevel: 'info',
      ...(pathRewrite && { pathRewrite }),
    };
    return config;
  }, {});
})();

module.exports = PROXY_CONFIG;
