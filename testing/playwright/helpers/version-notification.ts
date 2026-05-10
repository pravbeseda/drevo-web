import { Locator, Page } from '@playwright/test';

export function getVersionNotification(page: Page, version: string): Locator {
    return page.getByText(`Доступна новая версия ${version}`);
}

export function getVersionNotificationPattern(page: Page): Locator {
    return page.getByText(/Доступна новая версия/);
}

export function getVersionUpdateButton(page: Page): Locator {
    return page.getByRole('button', { name: 'Обновить' });
}
