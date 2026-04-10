import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig } from '@playwright/test';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

// API Base URL for API tests (can be different from UI base URL)
const apiBaseURL = process.env['API_BASE_URL'] || 'http://drevo-local.ru';

// API tests are enabled locally by default, disabled in CI
// Set ENABLE_API_TESTS=true to force enable, ENABLE_API_TESTS=false to force disable
const isCI = !!process.env.CI;
const enableApiTests =
    process.env['ENABLE_API_TESTS'] !== undefined ? process.env['ENABLE_API_TESTS'] === 'true' : !isCI; // Default: enabled locally, disabled in CI

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
// API tests don't need a web server — they run against a real backend directly
const apiProjects = enableApiTests
    ? [
          {
              name: 'api',
              testMatch: /api\/.*\.spec\.ts/,
              use: {
                  baseURL: apiBaseURL,
              },
          },
      ]
    : [];

export default defineConfig({
    ...nxE2EPreset(__filename, { testDir: './src' }),
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        baseURL,
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
    },
    // UI integration tests have been moved to testing/playwright/
    // This project now only contains API contract tests against real backend
    // No webServer needed — API tests hit the real backend directly
    projects: apiProjects,
});
