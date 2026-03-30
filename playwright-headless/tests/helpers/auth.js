// tests/helpers/auth.js
const { expect } = require('@playwright/test');

const ADMIN = {
  email: 'admin@example.com',
  password: 'admin123',
};

/** Login as admin and assert we land on /dashboard */
async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', ADMIN.email);
  await page.fill('input[name="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
}

/** Logout — opens the user dropdown first then clicks logout */
async function logout(page) {
  await page.click('.navbar .dropdown-toggle');
  await page.locator('.dropdown-menu').waitFor({ state: 'visible' });
  await page.click('a[href="/logout"]');
  await expect(page).toHaveURL('/login');
}

module.exports = { loginAsAdmin, logout, ADMIN };
