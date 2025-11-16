import { test, expect } from '@playwright/test';

test.describe('Angular-First Architecture', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load Angular main page', async ({ page }) => {
    await expect(page.locator('app-root')).toBeVisible();
    await expect(page).toHaveTitle(/Drevo/i);
  });

  test('should load Angular editor page', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('app-shared-editor')).toBeVisible();
    expect(page.url()).toContain('/editor');
  });

  test('should load Yii page in iframe for unknown routes', async ({ page }) => {
    await page.goto('/articles');
    await expect(page.locator('app-yii-iframe')).toBeVisible();
    
    const iframe = page.locator('iframe.yii-iframe');
    await expect(iframe).toBeVisible();
    
    const iframeSrc = await iframe.getAttribute('src');
    expect(iframeSrc).toContain('/legacy/');
  });

  test('should show loading indicator while iframe loads', async ({ page }) => {
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 500);
    });
    
    const navigation = page.goto('/articles');
    await expect(page.locator('.loading-overlay')).toBeVisible();
    await navigation;
    await expect(page.locator('.loading-overlay')).toBeHidden();
  });

  test('should handle iframe errors gracefully', async ({ page }) => {
    await page.route('**/legacy/**', route => {
      route.fulfill({
        status: 404,
        body: 'Not Found'
      });
    });
    
    await page.goto('/non-existent-page');
    await expect(page.locator('.error-container')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText(/error/i);
    await expect(page.locator('.retry-button')).toBeVisible();
  });

  test('should preserve Angular routes during navigation', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('app-shared-editor')).toBeVisible();
    
    await page.goto('/articles');
    await expect(page.locator('app-yii-iframe')).toBeVisible();
    
    await page.goBack();
    await expect(page.locator('app-shared-editor')).toBeVisible();
    expect(page.url()).toContain('/editor');
  });

  test('should handle query parameters in iframe routes', async ({ page }) => {
    await page.goto('/articles?page=2&sort=date');
    
    const iframe = page.locator('iframe.yii-iframe');
    const iframeSrc = await iframe.getAttribute('src');
    
    expect(iframeSrc).toContain('page=2');
    expect(iframeSrc).toContain('sort=date');
  });

  test('should handle hash fragments in iframe routes', async ({ page }) => {
    await page.goto('/articles/123#comments');
    
    const iframe = page.locator('iframe.yii-iframe');
    const iframeSrc = await iframe.getAttribute('src');
    
    expect(iframeSrc).toContain('#comments');
  });
});

test.describe('Accessibility', () => {
  test('should have proper ARIA labels on iframe', async ({ page }) => {
    await page.goto('/articles');
    
    const iframe = page.locator('iframe.yii-iframe');
    await expect(iframe).toHaveAttribute('title', /Content/i);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});
