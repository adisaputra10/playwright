// tests/dashboard.spec.js
const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/auth');

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display dashboard after login', async ({ page }) => {
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('body')).toContainText('Dashboard');
  });

  test('should show at least one stats card', async ({ page }) => {
    await expect(page.locator('.card').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Error');
  });

  test('should have navbar links for employees and users', async ({ page }) => {
    // These nav links are always visible on desktop (not inside dropdown)
    await expect(page.locator('a.nav-link[href="/employees"]')).toBeVisible();
    await expect(page.locator('a.nav-link[href="/users"]')).toBeVisible();
    // User dropdown toggle is visible (logout is inside dropdown)
    await expect(page.locator('.navbar .dropdown-toggle')).toBeVisible();
  });

  test('should navigate to /employees via navbar', async ({ page }) => {
    await page.click('a.nav-link[href="/employees"]');
    await expect(page).toHaveURL('/employees');
  });

  test('should navigate to /users via navbar', async ({ page }) => {
    await page.click('a.nav-link[href="/users"]');
    await expect(page).toHaveURL('/users');
  });
});
