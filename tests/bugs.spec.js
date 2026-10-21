// Each test proves one bug: it fails on broken/ and passes on fixed/.
// Run: npm test (fixed)  |  npm run test:broken (expected to fail)
const { test, expect } = require('@playwright/test');

let pageErrors;

test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto('/');
});

test('B02a no JavaScript errors on load', async () => {
  expect(pageErrors).toEqual([]);
});

test('B01 no horizontal scroll', async ({ page }) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('B02b mobile menu opens', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.click('[data-test=nav-toggle]');
  await expect(page.locator('[data-test=nav-menu]')).toBeVisible();
});

test('B03 partly filled form is not submitted', async ({ page }) => {
  await page.fill('#name', 'علی رضایی');
  await page.click('[data-test=submit]');
  await expect(page.locator('[data-test=error-email]')).toBeVisible();
  await page.waitForTimeout(800); // longer than the demo send delay
  await expect(page.locator('[data-test=success]')).toBeHidden();
});

test('B06 booking button is clickable and opens the booking window', async ({ page }) => {
  await page.click('[data-test=cta]', { timeout: 3000 });
  await expect(page.locator('[data-test=modal]')).toBeVisible();
});

test('B10 viewport meta tag is present', async ({ page }) => {
  const count = await page.locator('meta[name=viewport]').count();
  expect(count).toBe(1);
  const content = await page.getAttribute('meta[name=viewport]', 'content');
  expect(content).toContain('width=device-width');
});
