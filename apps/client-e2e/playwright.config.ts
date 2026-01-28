import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

// API Base URL for API tests (can be different from UI base URL)
const apiBaseURL = process.env['API_BASE_URL'] || 'http://drevo-local.ru';

// API tests are enabled locally by default, disabled in CI
// Set ENABLE_API_TESTS=true to force enable, ENABLE_API_TESTS=false to force disable
const isCI = !!process.env.CI;
const enableApiTests =
    process.env['ENABLE_API_TESTS'] !== undefined
        ? process.env['ENABLE_API_TESTS'] === 'true'
        : !isCI; // Default: enabled locally, disabled in CI

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    ...nxE2EPreset(__filename, { testDir: './src' }),
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        baseURL,
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
    },
    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'yarn nx run client:serve --no-hmr',
        url: 'http://localhost:4200/editor',
        reuseExistingServer: !process.env.CI,
        cwd: workspaceRoot,
    },
    projects: [
        // API Tests - no browser required, fast execution
        // Only run when ENABLE_API_TESTS=true (requires real backend)
        ...(enableApiTests
            ? [
                  {
                      name: 'api',
                      testMatch: /api\/.*\.spec\.ts/,
                      use: {
                          baseURL: apiBaseURL,
                      },
                  },
              ]
            : []),

        // UI Tests - require browser
        {
            name: 'chromium',
            testIgnore: /api\/.*\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
        },

        {
            name: 'firefox',
            testIgnore: /api\/.*\.spec\.ts/,
            use: { ...devices['Desktop Firefox'] },
        },

        {
            name: 'webkit',
            testIgnore: /api\/.*\.spec\.ts/,
            use: { ...devices['Desktop Safari'] },
        },

        // Uncomment for mobile browsers support
        /* {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    }, */

        // Uncomment for branded browsers
        /* {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    } */
    ],
});
