import {
    bypassSsr,
    expect,
    mockCalendarYear,
    mockCalendarYearError,
    mockCalendarYearOutOfRange,
    test,
} from '../../fixtures';
import { createCalendarYearDto } from '../../mocks/calendar';
import { CalendarPage } from '../../pages/calendar.page';
import { LayoutPage } from '../../pages/layout.page';

const YEAR = 2026;

test.describe('Calendar page', () => {
    let calendar: CalendarPage;

    test.describe('the year grid', () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            await mockCalendarYear(page, YEAR);
            calendar = new CalendarPage(page);
            await page.goto(`/calendar/${YEAR}`);
            await calendar.waitForReady();
        });

        test('renders twelve months', async () => {
            await expect(calendar.months).toHaveCount(12);
            await expect(calendar.currentYear).toHaveText(String(YEAR));
        });

        test('names the page in the header rather than on the page', async ({ authenticatedPage: page }) => {
            await expect(new LayoutPage(page).pageTitle).toHaveText('Православный календарь');
            await expect(calendar.pageHeadings).toHaveCount(0);
        });

        test('renders the legend and the disclaimer the API sent', async () => {
            await expect(calendar.legendHeading).toBeVisible();
            await expect(calendar.disclaimer).toBeVisible();
        });

        test('marks a fast day and a feast day differently', async () => {
            await expect(calendar.day('Январь', 2)).toHaveClass(/fast/);
            await expect(calendar.day('Январь', 3)).toHaveClass(/holyday/);
        });

        test('a day opens its article without a full page load', async ({ authenticatedPage: page }) => {
            await calendar.dayLink('Январь', 1).click();

            await expect(page).toHaveURL(/\/articles\/1122$/);
        });

        test('a day whose article is missing links to the find route', async () => {
            await expect(calendar.dayLink('Январь', 4)).toHaveAttribute('href', /\/articles\/find\/.+/);
        });

        test('the year tab switches the year', async ({ authenticatedPage: page }) => {
            await mockCalendarYear(page, YEAR + 1, createCalendarYearDto({ year: YEAR + 1 }));

            await calendar.nextYear.click();

            await expect(page).toHaveURL(new RegExp(`/calendar/${YEAR + 1}$`));
            await expect(calendar.currentYear).toHaveText(String(YEAR + 1));
        });
    });

    test('renders the current year when the route names none', async ({ authenticatedPage: page }) => {
        const currentYear = new Date().getFullYear();
        await mockCalendarYear(page, currentYear, createCalendarYearDto({ year: currentYear }));
        calendar = new CalendarPage(page);

        await page.goto('/calendar');
        await calendar.waitForReady();

        await expect(calendar.currentYear).toHaveText(String(currentYear));
    });

    test('answers a year outside the range with the not-found state', async ({ authenticatedPage: page }) => {
        await bypassSsr(page, '**/calendar/**');
        await mockCalendarYearOutOfRange(page, 2030);
        calendar = new CalendarPage(page);

        await page.goto('/calendar/2030');

        await expect(calendar.notFound).toBeVisible();
    });

    test('answers a failed request with the load-error state', async ({ authenticatedPage: page }) => {
        await bypassSsr(page, '**/calendar/**');
        await mockCalendarYearError(page, YEAR);
        calendar = new CalendarPage(page);

        await page.goto(`/calendar/${YEAR}`);

        await expect(calendar.loadError).toBeVisible();
    });
});
