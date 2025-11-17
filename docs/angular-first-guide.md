# Angular-First Architecture - Complete Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Local Development](#local-development)
5. [Adding New Features](#adding-new-features)
6. [Authentication & Authorization](#authentication--authorization)
7. [Deployment](#deployment)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

Angular-First architecture positions Angular as the main application with Yii running in iframes. This allows gradual migration from Yii to Angular without rewriting everything at once.

### Key Benefits

✅ **Gradual Migration** - Migrate page by page without breaking existing functionality  
✅ **SEO Friendly** - Bots get direct Yii content, users get Angular experience  
✅ **Shared Authentication** - Single session across Angular and Yii  
✅ **Developer Experience** - Modern Angular tooling with hot reload  

---

## Architecture

### Request Flow

```
User Request
    ↓
Nginx (staging.drevo-info.ru)
    ↓
┌─────────────┬────────────────────────────────┐
│   Is Bot?   │                                │
├─────────────┤                                │
│    Yes →    │  Serve Yii directly (SEO)     │
│    No  →    │  Proxy to Angular SSR (4001)  │
└─────────────┴────────────────────────────────┘
                        ↓
              Angular Application
                        ↓
         ┌──────────────┴──────────────┐
         │                             │
    Known Route?                  Unknown Route?
         │                             │
    Angular Component            YiiIframeComponent
                                       ↓
                                  Yii in iframe
```

### Dual Routing for SEO

Nginx uses User-Agent detection to serve different content:

- **Search Engine Bots** (Google, Yandex, Bing) → Direct Yii pages
- **Regular Users** → Angular application with iframe

This is a legitimate approach (Google's Dynamic Rendering) as long as content is the same.

### File Structure

```
drevo-web/
├── .nginx-conf-for-ai/
│   └── staging-angular-first.drevo-info.ru.conf  # Nginx config
├── apps/
│   └── client/
│       ├── proxy.conf.js                          # Dev/SSR proxy config
│       └── src/
│           └── app/
│               ├── components/
│               │   └── yii-iframe/                # Iframe wrapper
│               ├── services/
│               │   ├── iframe/                    # CSRF handling
│               │   └── yii-navigation/            # Navigation sync
│               └── app.routes.ts                  # Routes
├── docs/
│   └── angular-first-guide.md                    # This file
└── scripts/
    └── ecosystem.config.js                       # PM2 config
```

### Key Components

#### 1. YiiIframeComponent

Displays Yii pages in iframe with loading states and error handling.

```typescript
// Automatically loaded via wildcard route
// Example: /articles/123 → loads /legacy/articles/123 in iframe
```

**Features**:
- Dynamic iframe src based on route
- Loading indicator
- Error handling with retry
- PostMessage communication
- URL synchronization

#### 2. YiiNavigationService

Manages navigation between Angular and Yii, tracks route types.

```typescript
constructor(private yiiNav: YiiNavigationService) {}

// Check if Angular route
if (this.yiiNav.isAngularRoute('/editor')) {
  // Handle in Angular
}

// Register new Angular route
this.yiiNav.registerAngularRoute('/new-feature');

// Get Yii URL for iframe
const yiiUrl = this.yiiNav.getYiiUrl('/articles/123');
// Returns: '/legacy/articles/123'
```

#### 3. IframeService

Handles postMessage communication and CSRF tokens.

```typescript
constructor(private iframe: IframeService) {}

ngOnInit() {
  // Get CSRF token from Yii
  this.iframe.csrfToken$.subscribe(token => {
    this.csrfToken = token;
  });
}
```

---

## Getting Started

### Prerequisites

- **Node.js 20+** and **Yarn**
- **Docker** (optional, for local Yii)
- **SSH access** to server (for deployment)

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd drevo-web

# Install dependencies
yarn install

# Configure local hosts (if using Docker)
sudo nano /etc/hosts
# Add: 127.0.0.1 drevo-local.ru
```

---

## Local Development

### Architecture

```
Browser (localhost:4200)
    ↓
Angular Dev Server (nx serve)
    ↓
proxy.conf.js
    ↓
drevo-local.ru (Docker) or localhost:80
    ↓
Yii Application
```

### Proxy Configuration

Located at `apps/client/proxy.conf.js` (shared by both Angular CLI and SSR server):

```ts
const PROXY_CONFIG = (() => {
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
```

### Development Workflows

#### Option 1: Dev Server with Hot Reload (Recommended)

**Best for**: Active development

```bash
nx serve client
# or
yarn nx serve client
```

**Features**:
- Angular dev server on `http://localhost:4200`
- Requests proxied to `drevo-local.ru`
- Hot reload enabled
- Source maps for debugging

#### Option 2: Built SSR Server

**Best for**: Testing production behavior

```bash
yarn dev
# or explicitly:
yarn dev:local
```

**Features**:
- Production build
- Node.js SSR server on `http://localhost:4200`
- No hot reload
- Closer to production

### Verify Setup

```bash
# Check Docker is running (if using Docker)
curl http://drevo-local.ru

# Check Angular dev server
curl http://localhost:4200

# Check proxy works
curl http://localhost:4200/legacy/articles
```

### Testing Scenarios

#### 1. Angular Main Page
```
http://localhost:4200/
→ Should see Angular component (no iframe)
```

#### 2. Angular Editor
```
http://localhost:4200/editor
→ Should see Angular editor component
```

#### 3. Yii Page in Iframe
```
http://localhost:4200/articles
→ Should see Yii page in iframe
→ Check Network tab: /legacy/articles
```

#### 4. Static Assets
```
Open DevTools → Network tab
Navigate to: http://localhost:4200/articles
→ Should see: /css/*, /js/*, /images/* (proxied)
```

#### 5. API Calls
```javascript
// In browser console
fetch('/api/user/current')
  .then(r => r.json())
  .then(console.log)
// → Should proxy to drevo-local.ru/api/user/current
```

### Debugging

#### Enable Verbose Proxy Logging

In `apps/client/proxy.conf.js` temporarily bump the `logLevel` for the paths you need to inspect inside the `paths.reduce(...)` block:

```ts
// proxy.conf.js
config[path] = {
  target,
  secure: isSecure,
  changeOrigin: true,
  logLevel: path === '/api' ? 'debug' : 'info',
  ...(pathRewrite && { pathRewrite }),
};
```

Restart dev server to see all proxied requests in terminal.

#### Common Issues

**Issue**: `ENOTFOUND drevo-local.ru`

**Solution**:
```bash
# Add to /etc/hosts
sudo nano /etc/hosts
127.0.0.1 drevo-local.ru

# Or check Docker IP
docker inspect <container> | grep IPAddress
```

**Issue**: CORS errors

**Solution**: Verify `changeOrigin: true` in proxy.conf.js

**Issue**: Static assets 404

**Solution**: Check proxy.conf.js includes `/css`, `/js`, `/images` routes

**Issue**: Iframe shows 404

**Solution**: Test direct Yii URL: `curl http://drevo-local.ru/your-path`

**Issue**: Hot reload not working

**Solution**:
```bash
rm -rf .angular/cache
yarn nx serve client
```

---

## Adding New Features

### Adding New Angular Routes

#### Step 1: Create Component

```bash
nx g component pages/my-new-page --project=client --standalone
```

#### Step 2: Add Route

```typescript
// apps/client/src/app/app.routes.ts
export const appRoutes: Route[] = [
    { path: '', loadComponent: () => import('./pages/main/main.component') },
    { path: 'editor', loadComponent: () => import('./pages/shared-editor/...') },
    
    // Add NEW route HERE (before wildcard)
    { path: 'my-new-page', loadComponent: () => import('./pages/my-new-page/...') },
    
    // Wildcard MUST be last
    { path: '**', loadComponent: () => import('./components/yii-iframe/...') },
];
```

#### Step 3: Register in YiiNavigationService (Optional)

Only needed for programmatic route checking:

```typescript
constructor(private yiiNav: YiiNavigationService) {
  this.yiiNav.registerAngularRoute('/my-new-page');
}
```

### Development Tips

#### Test Checklist

```bash
# Angular routes (no iframe)
✓ http://localhost:4200/
✓ http://localhost:4200/editor
✓ http://localhost:4200/my-new-page

# Yii routes (in iframe)
✓ http://localhost:4200/articles
✓ http://localhost:4200/user/profile
```

#### Mock API (Optional)

For frontend-only development:

```bash
# Install json-server
npm install -g json-server

# Create db.json with mock data
json-server --watch db.json --port 3000

# Update proxy.conf.js
{ "/api": { "target": "http://localhost:3000" } }
```

---

## Authentication & Authorization

### Overview

Authorization remains on Yii side. Angular checks auth status via API but doesn't manage sessions directly.

### Authentication Flow

```
User → Angular → Yii iframe → Login Form (Yii)
                               ↓
                        Set Cookie (session)
                               ↓
                        Redirect after login
```

### Session Cookies

Yii uses standard PHP session cookies:
- **Cookie Name**: `PHPSESSID` (or custom)
- **Domain**: `.drevo-info.ru` (with leading dot for sharing)
- **Path**: `/`
- **Secure**: `true` (HTTPS)
- **HttpOnly**: `true` (XSS protection)
- **SameSite**: `Lax`

### Cookie Sharing Requirements

Both Angular and Yii must:
1. Be on same domain (`staging.drevo-info.ru`)
2. Use compatible cookie settings

#### Yii Configuration

```php
// protected/config/main.php
'components' => [
    'request' => [
        'csrfCookie' => [
            'domain' => '.drevo-info.ru',  // Note leading dot
            'path' => '/',
            'secure' => true,
            'httpOnly' => true,
            'sameSite' => 'Lax'
        ]
    ],
    'session' => [
        'cookieParams' => [
            'domain' => '.drevo-info.ru',
            'path' => '/',
            'secure' => true,
            'httpOnly' => true,
            'sameSite' => 'Lax'
        ]
    ]
]
```

### CSRF Protection

#### Token Flow

1. **Yii sends CSRF token to Angular**:
```javascript
// In Yii template
window.parent.postMessage({
  action: 'loadContent',
  content: '...',
  csrf: '<?= Yii::app()->request->csrfToken ?>'
}, window.location.origin);
```

2. **Angular receives and uses token**:
```typescript
constructor(private iframeService: IframeService) {}

ngOnInit() {
  this.iframeService.csrfToken$.subscribe(token => {
    this.csrfToken = token;
  });
}

submitForm() {
  this.http.post('/api/endpoint', data, {
    headers: { 'X-CSRF-Token': this.csrfToken }
  });
}
```

### API Requests with Credentials

```typescript
// Include cookies in requests
this.http.get('/api/user/profile', {
  withCredentials: true
});
```

#### Global Configuration

```typescript
// apps/client/src/app/app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([
        (req, next) => {
          const csrfToken = getCsrfToken();
          if (csrfToken) {
            req = req.clone({
              setHeaders: { 'X-CSRF-Token': csrfToken },
              withCredentials: true
            });
          }
          return next(req);
        }
      ])
    )
  ]
};
```

### Protected Routes (Optional)

```typescript
// apps/client/src/app/guards/auth.guard.ts
export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.checkAuth().pipe(
    map(result => {
      if (result.authenticated) return true;
      router.navigate(['/login']);
      return false;
    })
  );
};

// Usage
{
  path: 'editor',
  canActivate: [authGuard],
  loadComponent: () => import('./pages/shared-editor/...')
}
```

### Testing Authentication

1. **Login Flow**:
   - Navigate to `/login`
   - Login via Yii form
   - Check cookies in DevTools (Application → Cookies)

2. **Cookie Sharing**:
   ```javascript
   // In console
   fetch('/api/user/current', { credentials: 'include' })
     .then(r => r.json())
     .then(console.log)
   // Should return user data
   ```

3. **CSRF Protection**:
   - Check token via IframeService
   - Make POST request with token
   - Should succeed

---

## Deployment

### Staging Deployment

#### Automatic via GitHub Actions

```bash
git push origin main
```

**What happens**:
1. GitHub Actions builds Angular (`--base-href=/`)
2. Deploys to `/home/github-deploy/releases/staging-{version}`
3. Creates symlink to `staging-current`
4. PM2 restarts with `BASE_PATH=/`
5. Nginx serves on `staging.drevo-info.ru`

#### Manual Deployment

```bash
# On server
cd /home/github-deploy/releases

# Create release directory
mkdir staging-20240109-1430
cd staging-20240109-1430

# Copy files (from CI or manual rsync)
# ...

# Update symlink
ln -sfn staging-20240109-1430 ../staging-current

# Restart PM2
pm2 restart drevo-staging
```

### Nginx Configuration

#### Update to Angular-First

```bash
# On server
sudo cp .nginx-conf-for-ai/staging-angular-first.drevo-info.ru.conf \
        /etc/nginx/sites-available/staging.drevo-info.ru.conf

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

#### Rollback

```bash
# Restore backup
sudo cp staging.drevo-info.ru.conf.backup staging.drevo-info.ru.conf
sudo nginx -t
sudo systemctl reload nginx

# Rollback app
cd /home/github-deploy/releases
ln -sfn staging-previous-version staging-current
pm2 restart drevo-staging
```

### Verification

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs drevo-staging --lines 50

# Test application
curl -I https://staging.drevo-info.ru

# Test Angular route
curl https://staging.drevo-info.ru/ | grep "app-root"

# Test bot detection (should return Yii directly)
curl -A "Googlebot" https://staging.drevo-info.ru/articles | grep -v "app-root"
```

### Monitoring

#### Logs

```bash
# Nginx
tail -f /var/log/nginx/staging-drevo-access.log
tail -f /var/log/nginx/staging-drevo-error.log

# PM2
pm2 logs drevo-staging --raw

# Application
tail -f /home/github-deploy/logs/staging-combined.log
```

#### Metrics

- **Response time**: < 3 seconds
- **Error rate**: < 1%
- **Memory usage**: < 512MB per instance
- **CPU usage**: < 80%

#### Alerts

Configure alerts for:
- 5xx errors from nginx
- PM2 process restarts
- High memory usage
- Slow response times

---

## Testing

### Manual Testing

#### 1. Angular Routes
```bash
# Navigate to /
→ Should show Angular main page

# Navigate to /editor
→ Should show Angular editor
```

#### 2. Yii Routes
```bash
# Navigate to /articles/123
→ Should show Yii page in iframe
→ Check loading indicator
→ Check content loads
```

#### 3. SEO (Bot Detection)
```bash
# Simulate bot
curl -A "Googlebot" https://staging.drevo-info.ru/articles/123
# Should NOT contain "app-root"
```

#### 4. Authentication
```bash
# Login via /login (Yii iframe)
# Navigate to protected route
# Should remain logged in
```

#### 5. Navigation
```bash
# Use back/forward buttons
# Check URL updates
# Check iframe content updates
```

### E2E Tests

```bash
# Run Playwright tests
nx e2e client-e2e
```

See `apps/client-e2e/src/angular-first.spec.ts` for scenarios.

### Unit Tests

```bash
# Run unit tests
nx test client

# With coverage
nx test client --coverage
```

---

## Troubleshooting

### Iframe Not Loading

**Symptoms**: Blank iframe, loading forever, 404

**Solutions**:
1. Check nginx proxying `/legacy/*` correctly
2. Check Yii is running
3. Check console for CORS errors
4. Check iframe src in DevTools

### Infinite Redirect Loop

**Symptoms**: "Too many redirects"

**Solutions**:
1. Verify wildcard route is **last** in `app.routes.ts`
2. Check no conflicting redirects in Yii
3. Check nginx config for duplicate redirects

### Cookies Not Shared

**Symptoms**: Login doesn't persist, session lost

**Solutions**:
1. Check same domain for Angular and Yii
2. Check cookie domain: `.drevo-info.ru` (with dot)
3. Check `SameSite`: `Lax` or `None` (not `Strict`)
4. Check HTTPS for `Secure` cookies

### SEO Not Working

**Symptoms**: Pages not indexed

**Solutions**:
1. Check nginx bot detection (`map $http_user_agent $is_bot`)
2. Test with curl: `curl -A "Googlebot" <url>`
3. Check Google Search Console
4. Verify Yii returns proper HTML (not Angular shell)

### Performance Issues

**Symptoms**: Slow loads, high memory

**Solutions**:
1. Enable static asset caching in nginx
2. Add lazy loading for iframe
3. Implement Service Worker
4. Optimize Angular bundle size
5. Enable gzip in nginx

### Docker/Proxy Issues

**Symptoms**: Cannot connect to drevo-local.ru

**Solutions**:
```bash
# Check hosts file
cat /etc/hosts | grep drevo-local

# Check Docker container
docker ps
docker logs <container>

# Test direct connection
curl http://drevo-local.ru

# Check proxy config
cat apps/client/proxy.conf.js
```

---

## Best Practices

### General

1. ✅ Always add Angular routes **before** wildcard route
2. ✅ Test locally before deploying
3. ✅ Keep nginx config in version control
4. ✅ Document all custom routes
5. ✅ Monitor SEO metrics post-deployment

### Code Quality

6. ✅ Use semantic versioning for releases
7. ✅ Keep dependencies updated
8. ✅ Write E2E tests for critical paths
9. ✅ Use TypeScript strict mode
10. ✅ Follow Angular style guide

### Security

11. ✅ Validate CSRF tokens
12. ✅ Use HTTPS in production
13. ✅ Sanitize iframe content
14. ✅ Check postMessage origins
15. ✅ Set proper CORS headers

### Performance

16. ✅ Enable static asset caching
17. ✅ Use lazy loading
18. ✅ Optimize bundle size
19. ✅ Enable compression
20. ✅ Monitor Core Web Vitals

---

## Migration Roadmap

### Phase 1: Angular-First (Current)
- ✅ Angular serves all routes
- ✅ Yii pages in iframe
- ✅ Shared authentication
- ✅ SEO via bot detection

### Phase 2: Component Migration
1. Identify high-traffic pages
2. Create Angular equivalents
3. Migrate API to REST/GraphQL
4. Update routes
5. Test thoroughly

### Phase 3: Complete Migration
1. Move all pages to Angular
2. Refactor Yii to API-only backend
3. Remove iframe component
4. Remove Yii views/controllers
5. Keep Yii for business logic

---

## Environment Variables

### Development
```bash
NODE_ENV=development
PORT=4200
BASE_PATH=/
```

### Staging
```bash
NODE_ENV=staging
PORT=4001
BASE_PATH=/
```

### Production
```bash
NODE_ENV=production
PORT=4001
BASE_PATH=/
```

---

## Resources

- [Angular Documentation](https://angular.io/docs)
- [Nx Documentation](https://nx.dev)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Google Dynamic Rendering](https://developers.google.com/search/docs/advanced/javascript/dynamic-rendering)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)

---

## Support

For questions or issues:
1. Check this documentation
2. Review GitHub Issues
3. Ask team in Slack/Discord
4. Escalate to tech lead

---

**Last Updated**: January 2024  
**Version**: 1.0  
**Maintainer**: Development Team
