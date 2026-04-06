import { workspaceRoot } from '@nx/devkit';
import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env['CI'];
const isCoverage = !!process.env['COVERAGE'];
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

const webServerConfig = isCoverage
    ? {
          command:
              'yarn nx run client:build:coverage && cp dist/apps/client/browser/index.csr.html dist/apps/client/browser/index.html && npx serve dist/apps/client/browser -l 4200 -s',
          url: 'http://localhost:4200',
          reuseExistingServer: !isCI,
          cwd: workspaceRoot,
          timeout: 120_000,
      }
    : {
          command: 'yarn nx run client:serve --no-hmr',
          url: 'http://localhost:4200',
          reuseExistingServer: !isCI,
          cwd: workspaceRoot,
      };

const reporters: Parameters<typeof defineConfig>[0]['reporter'] = [['list']];

if (isCoverage) {
    reporters.push([
        'monocart-reporter',
        {
            name: 'Playwright Coverage Report',
            outputFile: './coverage/report.html',
            coverage: {
                outputDir: './coverage/integration',
                entryFilter: (entry: { url: string }) => entry.url.includes('localhost:4200'),
                sourceFilter: (sourcePath: string) =>
                    (sourcePath.startsWith('apps/') || sourcePath.startsWith('libs/')) &&
                    !sourcePath.includes('node_modules'),
                reports: ['v8', 'console-details', 'json-summary'],
            },
        },
    ]);
} else {
    reporters.push(['html', { outputFolder: './playwright-report', open: 'never' }]);
}

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 2 : 0,
    workers: isCI ? '50%' : undefined,
    outputDir: './test-results',
    reporter: reporters,

    use: {
        baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    webServer: process.env['BASE_URL'] ? undefined : webServerConfig,

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'mobile-safari',
            use: { ...devices['iPhone 13'] },
        },
    ],
});
