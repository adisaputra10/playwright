// tests/auth.spec.js
const { test, expect } = require('@playwright/test');
const { loginAsAdmin, ADMIN } = require('./helpers/auth');

test.describe('Home Page', () => {
  test('should display home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Employee|EMS/i);
    await expect(page.locator('h1, .display-4, .display-5')).toBeVisible();
  });

  test('should show Login and Daftar links when guest', async ({ page }) => {
    await page.goto('/');
    // Hero section has btn-lg class; use first() to avoid strict-mode error from navbar duplicates
    await expect(page.locator('a.btn-lg[href="/login"]').first()).toBeVisible();
    await expect(page.locator('a.btn-lg[href="/register"]').first()).toBeVisible();
  });
});

test.describe('Login', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should reject wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', ADMIN.email);
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('.alert-danger, .alert-warning')).toBeVisible();
  });

  test('should reject unknown email', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'notexist@example.com');
    await page.fill('input[name="password"]', 'anything');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('.alert-danger, .alert-warning')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginAsAdmin(page);
    // Dropdown toggle shows the logged-in user's name
    await expect(page.locator('.navbar .dropdown-toggle')).toBeVisible();
  });

  test('should redirect already-logged-in user away from /login', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/login');
    await expect(page).toHaveURL('/dashboard');
  });
});

test.describe('Register', () => {
  test('should show registration form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should register a new user successfully', async ({ page }) => {
    const email = `e2e_${Date.now()}@test.com`;
    await page.goto('/register');
    await page.fill('input[name="name"]', 'E2E Test User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Test1234!');
    await page.fill('input[name="confirm_password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('.alert-success')).toBeVisible();
  });

  test('should reject duplicate email', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="name"]', 'Duplicate');
    await page.fill('input[name="email"]', ADMIN.email);
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirm_password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/register');
    await expect(page.locator('.alert-danger, .alert-warning')).toBeVisible();
  });
});

test.describe('Protected Routes (Guest Redirect)', () => {
  for (const path of ['/dashboard', '/users', '/employees']) {
    test(`GET ${path} should redirect to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL('/login');
    });
  }
});

test.describe('Logout', () => {
  test('should logout and redirect away from dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('.navbar .dropdown-toggle');
    await page.locator('.dropdown-menu').waitFor({ state: 'visible' });
    await page.click('a[href="/logout"]');
    // app redirects to '/' after logout
    await expect(page).toHaveURL('/');
    // Confirm user is no longer authenticated (dropdown gone)
    await expect(page.locator('.navbar .dropdown-toggle')).not.toBeVisible();
  });

  test('after logout /dashboard redirects to /login', async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('.navbar .dropdown-toggle');
    await page.locator('.dropdown-menu').waitFor({ state: 'visible' });
    await page.click('a[href="/logout"]');
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});
