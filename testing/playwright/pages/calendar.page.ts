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
}
