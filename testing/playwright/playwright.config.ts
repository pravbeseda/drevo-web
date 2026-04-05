import { workspaceRoot } from '@nx/devkit';
import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 2 : 0,
    workers: isCI ? '50%' : undefined,
    outputDir: './test-results',
    reporter: [['html', { outputFolder: './playwright-report', open: 'never' }], ['list']],

    use: {
        baseURL: 'http://localhost:4200',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    webServer: {
        command: 'yarn nx run client:serve --no-hmr',
        url: 'http://localhost:4200',
        reuseExistingServer: !isCI,
        cwd: workspaceRoot,
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
