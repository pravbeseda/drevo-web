import { test as base } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';

const isCoverage = !!process.env['COVERAGE'];

/**
 * Auto-fixture that collects V8 JS coverage per test.
 * Active only when COVERAGE=true. Chromium only (V8 API limitation).
 * Coverage data is passed to monocart-reporter via addCoverageReport().
 */
export const test = base.extend({
    autoCollectCoverage: [
        async ({ page }, use) => {
            const isChromium = test.info().project.name === 'chromium';

            if (isCoverage && isChromium) {
                await page.coverage.startJSCoverage({ resetOnNavigation: false });
            }

            await use('autoCollectCoverage');

            if (isCoverage && isChromium) {
                const jsCoverage = await page.coverage.stopJSCoverage();
                await addCoverageReport(jsCoverage, test.info());
            }
        },
        { scope: 'test', auto: true },
    ],
});
