// tests/employees.spec.js
const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/auth');

// employee_id column is VARCHAR(20) — keep ID short
const ts = Date.now().toString().slice(-8); // last 8 digits
const emp = {
  employee_id: `EE-${ts}`,   // max 11 chars, fits VARCHAR(20)
  first_name:  'Budi',
  last_name:   'Santoso',
  email:       `budi_e2e_${ts}@company.com`,
  phone:       '08123456789',
  department:  'Engineering',
  position:    'QA Engineer',
  hire_date:   '2024-01-15',
};

test.describe('Employees - List', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });

  test('should display employees list with table', async ({ page }) => {
    await page.goto('/employees');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should have create employee link', async ({ page }) => {
    await page.goto('/employees');
    await expect(page.locator('a[href="/employees/create"]')).toBeVisible();
  });

  test('search form should be present', async ({ page }) => {
    await page.goto('/employees');
    await expect(page.locator('input[name="search"], #search')).toBeVisible();
  });
});

test.describe('Employees - Create', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });

  test('should show all form sections on create page', async ({ page }) => {
    await page.goto('/employees/create');
    await expect(page.locator('input[name="employee_id"]')).toBeVisible();
    await expect(page.locator('input[name="first_name"]')).toBeVisible();
    await expect(page.locator('input[name="department"]')).toBeVisible();
    await expect(page.locator('input[name="hire_date"]')).toBeVisible();
  });

  test('should create a new employee successfully', async ({ page }) => {
    await page.goto('/employees/create');

    await page.fill('input[name="employee_id"]', emp.employee_id);
    await page.fill('input[name="first_name"]',  emp.first_name);
    await page.fill('input[name="last_name"]',   emp.last_name);
    await page.fill('input[name="email"]',        emp.email);
    await page.fill('input[name="phone"]',        emp.phone);
    await page.fill('input[name="department"]',   emp.department);
    await page.fill('input[name="position"]',     emp.position);
    await page.fill('input[name="hire_date"]',    emp.hire_date);

    await page.locator('select[name="gender"]').selectOption('male');
    await page.locator('select[name="employment_status"]').selectOption('permanent');
    await page.locator('select[name="employment_type"]').selectOption('full-time');
    await page.locator('select[name="status"]').selectOption('active');

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/employees');
    await expect(page.locator('.alert-success')).toBeVisible();
    await expect(page.locator('table')).toContainText(emp.first_name);
  });
});

test.describe('Employees - Detail', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });

  test('should open employee detail page', async ({ page }) => {
    await page.goto('/employees');
    // Find row with our test employee
    const row = page.locator('tr', { hasText: emp.first_name });
    if (await row.count() > 0) {
      // Eye/view button — href like /employees/3 (no /edit)
      const viewBtn = row.locator('a[href*="/employees/"]:not([href*="edit"])').first();
      await viewBtn.click();
      await expect(page.locator('body')).toContainText(emp.first_name);
      await expect(page.locator('body')).toContainText(emp.department);
    }
  });
});

test.describe('Employees - Edit', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });

  test('should open edit form with pre-filled employee_id', async ({ page }) => {
    await page.goto('/employees');
    const row = page.locator('tr', { hasText: emp.first_name });
    if (await row.count() > 0) {
      const editBtn = row.locator('a[href*="/employees/"][href*="edit"]').first();
      await editBtn.click();
      const val = await page.locator('input[name="employee_id"]').inputValue();
      expect(val).toBe(emp.employee_id);
    }
  });

  test('should update employee position', async ({ page }) => {
    await page.goto('/employees');
    const row = page.locator('tr', { hasText: emp.first_name });
    if (await row.count() > 0) {
      const editBtn = row.locator('a[href*="/employees/"][href*="edit"]').first();
      const href = await editBtn.getAttribute('href');
      await page.goto(href);
      await page.fill('input[name="position"]', 'Senior QA Engineer');
      await page.click('button[type="submit"]');
      // Update redirects to the employee detail page (/employees/:id)
      await expect(page).toHaveURL(/\/employees\/\d+/);
      await expect(page.locator('.alert-success')).toBeVisible();
    }
  });
});

test.describe('Employees - Delete', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });

  test('should delete a test employee', async ({ page }) => {
    const delTs = Date.now().toString().slice(-8);
    const delEmail = `hapus_${delTs}@test.com`;

    // Create employee to delete
    await page.goto('/employees/create');
    await page.fill('input[name="employee_id"]', `DL-${delTs}`);  // max 11 chars
    await page.fill('input[name="first_name"]',  'Hapus');
    await page.fill('input[name="last_name"]',   'Data');
    await page.fill('input[name="email"]',        delEmail);
    await page.fill('input[name="department"]',   'Temp');
    await page.fill('input[name="position"]',     'Temp');
    await page.locator('select[name="gender"]').selectOption('male');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/employees');

    // Delete it — button has no explicit type attr
    const row = page.locator('tr', { hasText: delEmail });
    await expect(row).toBeVisible();
    page.once('dialog', d => d.accept());
    await row.locator('button[title="Hapus"]').click();

    await expect(page).toHaveURL('/employees');
    await expect(page.locator('table')).not.toContainText(delEmail);
  });
});
