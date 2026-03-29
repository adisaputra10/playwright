// tests/users.spec.js
const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/auth');

test.describe('Users - List', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });

  test('should display users list with table', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should show admin account in list', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('table')).toContainText('admin@example.com');
  });

  test('should have create user link', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('a[href="/users/create"]')).toBeVisible();
  });
});

test.describe('Users - Create', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });

  test('should show create user form', async ({ page }) => {
    await page.goto('/users/create');
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should create a new user and show success message', async ({ page }) => {
    const email = `user_e2e_${Date.now()}@test.com`;
    await page.goto('/users/create');
    await page.fill('input[name="name"]', 'User E2E');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Password123!');
    await page.locator('select[name="role"]').selectOption('user');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/users');
    await expect(page.locator('.alert-success')).toBeVisible();
    await expect(page.locator('table')).toContainText(email);
  });
});

test.describe('Users - Edit', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });

  test('should open edit form with pre-filled name', async ({ page }) => {
    await page.goto('/users');
    const editBtn = page.locator('a[href*="/users/"][href*="/edit"]').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    const value = await page.locator('input[name="name"]').inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test('should update user name successfully', async ({ page }) => {
    await page.goto('/users');
    const editBtn = page.locator('a[href*="/users/"][href*="/edit"]').first();
    const href = await editBtn.getAttribute('href');
    await page.goto(href);
    await page.fill('input[name="name"]', 'Admin Updated');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/users');
    await expect(page.locator('.alert-success')).toBeVisible();
  });
});

test.describe('Users - Delete', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });

  test('should delete a newly created user', async ({ page }) => {
    const email = `del_user_${Date.now()}@test.com`;

    // Create the user first
    await page.goto('/users/create');
    await page.fill('input[name="name"]', 'Hapus User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Delete123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/users');

    // Delete the user — button has no explicit type attr, use title selector
    const row = page.locator('tr', { hasText: email });
    await expect(row).toBeVisible();
    page.once('dialog', d => d.accept());
    await row.locator('button[title="Hapus"]').click();

    await expect(page).toHaveURL('/users');
    await expect(page.locator('table')).not.toContainText(email);
  });

  test('own account row should have no delete button', async ({ page }) => {
    await page.goto('/users');
    // The app hides the delete button entirely for the logged-in user's row
    const selfRow = page.locator('tr', { hasText: 'admin@example.com' });
    await expect(selfRow).toBeVisible();
    await expect(selfRow.locator('button[title="Hapus"]')).not.toBeVisible();
  });
});
