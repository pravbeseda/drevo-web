module.exports = {
  apps: [
    {
      name: 'drevo-staging',
      script: './server/server.mjs',
      cwd: '/home/github-deploy/current-staging',
      env: {
        NODE_ENV: 'staging',
        PORT: 4001
      },
      instances: 'max',
      exec_mode: 'cluster',
      // Logging
      log_file: '/home/github-deploy/logs/staging-combined.log',
      out_file: '/home/github-deploy/logs/staging-out.log',
      error_file: '/home/github-deploy/logs/staging-error.log',
      // Graceful restart settings
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      // Performance settings
      max_restarts: 5,
      min_uptime: '10s',
      max_memory_restart: '512M',
      // Auto-restart settings
      autorestart: true,
      // Process monitoring
      pmx: true,
      // File watching (disabled in production)
      ignore_watch: ['node_modules', 'logs', '.git'],
      // Node.js arguments
      node_args: '--max-old-space-size=512'
    },
    {
      name: 'drevo-production',
      script: './server/server.mjs', 
      cwd: '/home/github-deploy/current-production',
      env: {
        NODE_ENV: 'production',
        PORT: 4002
      },
      instances: 'max',
      exec_mode: 'cluster',
      // Logging
      log_file: '/home/github-deploy/logs/production-combined.log',
      out_file: '/home/github-deploy/logs/production-out.log',
      error_file: '/home/github-deploy/logs/production-error.log',
      // Graceful restart settings
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      // Performance settings (higher limits for production)
      max_restarts: 3,
      min_uptime: '30s',
      max_memory_restart: '1G',
      // Auto-restart settings
      autorestart: true,
      // Process monitoring
      pmx: true,
      // File watching (disabled in production)
      ignore_watch: ['node_modules', 'logs', '.git'],
      // Node.js arguments
      node_args: '--max-old-space-size=1024'
    }
  ]
};