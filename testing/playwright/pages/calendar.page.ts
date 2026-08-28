import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

export class CalendarPage extends BasePage {
    readonly grid: Locator = this.page.getByTestId('calendar-grid');
    readonly months: Locator = this.page.locator('app-month-table');
    readonly days: Locator = this.page.getByTestId('calendar-day');
    readonly currentYear: Locator = this.page.getByTestId('year-current');
    readonly prevYear: Locator = this.page.getByTestId('year-prev');
    readonly nextYear: Locator = this.page.getByTestId('year-next');
    readonly notFound: Locator = this.page.getByTestId('calendar-not-found');
    readonly loadError: Locator = this.page.getByTestId('calendar-load-error');
    /** The page names itself in the header, so its body carries no heading of its own. */
    readonly pageHeadings: Locator = this.page.locator('h1');
    readonly legendHeading: Locator = this.page.getByRole('heading', {
        name: 'Церковные праздники в 2026 году',
    });
    readonly disclaimer: Locator = this.page.getByText('может содержать неточности');

    async waitForReady(): Promise<void> {
        await this.grid.waitFor({ state: 'visible' });
    }

    /** A day cell of the month named, addressed by the number it shows. */
    day(monthName: string, dayOfMonth: number): Locator {
        return this.page
            .locator('app-month-table')
            .filter({ has: this.page.getByTestId('month-name').filter({ hasText: monthName }) })
            .getByTestId('calendar-day')
            .filter({ hasText: new RegExp(`^\\s*${dayOfMonth}\\s*$`) });
    }

    /** The link a day cell carries — to the article, written or not. */
    dayLink(monthName: string, dayOfMonth: number): Locator {
        return this.day(monthName, dayOfMonth).getByRole('link');
    }
}
