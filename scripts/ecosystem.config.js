module.exports = {
    apps: [
        {
            name: 'drevo-production',
            script: './server/server.mjs',
            cwd: '/home/github-deploy/releases/production-current',
            env: {
                NODE_ENV: 'production',
                PORT: 4002,
                BASE_PATH: '/',
            },
            instances: 'max',
            exec_mode: 'cluster',
            // Logging
            log_file: '/home/github-deploy/logs/production-combined.log',
            out_file: '/home/github-deploy/logs/production-out.log',
            error_file: '/home/github-deploy/logs/production-error.log',
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            // Graceful restart settings
            kill_timeout: 5000,
            wait_ready: true,
            listen_timeout: 5000,
            // Performance settings
            max_restarts: 3,
            min_uptime: '30s',
            max_memory_restart: '1G',
            // Auto-restart settings
            autorestart: true,
            // Process monitoring
            pmx: true,
            // Node.js arguments
            node_args: '--max-old-space-size=1024',
        },
        {
            name: 'drevo-beta',
            script: './server/server.mjs',
            cwd: '/home/github-deploy/releases/beta-current',
            env: {
                NODE_ENV: 'production',
                PORT: 4010,
                BASE_PATH: '/',
            },
            instances: 'max',
            exec_mode: 'cluster',
            // Logging
            log_file: '/home/github-deploy/logs/beta-combined.log',
            out_file: '/home/github-deploy/logs/beta-out.log',
            error_file: '/home/github-deploy/logs/beta-error.log',
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            // Graceful restart settings
            kill_timeout: 5000,
            wait_ready: true,
            listen_timeout: 5000,
            // Performance settings
            max_restarts: 5,
            min_uptime: '10s',
            max_memory_restart: '512M',
            // Auto-restart settings
            autorestart: true,
            // Process monitoring
            pmx: true,
            // Node.js arguments
            node_args: '--max-old-space-size=512',
        },
        {
            name: 'drevo-release',
            script: './server/server.mjs',
            cwd: '/home/github-deploy/releases/release-current',
            env: {
                NODE_ENV: 'production',
                PORT: 4011,
                BASE_PATH: '/',
            },
            instances: 'max',
            exec_mode: 'cluster',
            // Logging
            log_file: '/home/github-deploy/logs/release-combined.log',
            out_file: '/home/github-deploy/logs/release-out.log',
            error_file: '/home/github-deploy/logs/release-error.log',
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            // Graceful restart settings
            kill_timeout: 5000,
            wait_ready: true,
            listen_timeout: 5000,
            // Performance settings
            max_restarts: 5,
            min_uptime: '10s',
            max_memory_restart: '512M',
            // Auto-restart settings
            autorestart: true,
            // Process monitoring
            pmx: true,
            // Node.js arguments
            node_args: '--max-old-space-size=512',
        },
    ],
};
