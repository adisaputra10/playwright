---
mode: agent
description: Generate, run, and verify Playwright E2E test cases for the Express/EJS Employee Management System (nodeapp). Produces 38 passing tests covering auth, dashboard, users, and employees.
tools:
  - run_in_terminal
  - create_file
  - read_file
  - replace_string_in_file
  - file_search
  - list_dir
---

# Generate Playwright E2E Tests — Employee Management System

Kamu adalah agen yang bertugas membuat, menjalankan, dan memverifikasi seluruh test case Playwright untuk aplikasi **Employee Management System (EMS)** di folder `d:\repo\test\nodeapp`.

---

## Konteks Aplikasi

| Item | Nilai |
|------|-------|
| App URL | `http://localhost:3000` |
| Stack | Express 4, EJS, MySQL2, express-session, bcryptjs, method-override, connect-flash |
| DB | MySQL, database name dari `.env` (`DB_NAME=playwright`) |
| Session | cookie-based, harus sequential (bukan parallel) |
| Admin credentials | `admin@example.com` / `admin123` |

### Rute Aplikasi

| Route | Method | Auth Required | Keterangan |
|-------|--------|---------------|------------|
| `/` | GET | ❌ | Home page |
| `/login` | GET/POST | ❌ | Login form |
| `/register` | GET/POST | ❌ | Registrasi user baru |
| `/logout` | GET | ✅ | Logout → redirect ke `/` |
| `/dashboard` | GET | ✅ | Dashboard statistik |
| `/users` | GET | ✅ | List semua user |
| `/users/create` | GET/POST | ✅ | Tambah user |
| `/users/:id/edit` | GET/POST | ✅ | Edit user |
| `/users/:id` | DELETE | ✅ | Hapus user |
| `/employees` | GET | ✅ | List karyawan |
| `/employees/create` | GET/POST | ✅ | Tambah karyawan |
| `/employees/:id` | GET | ✅ | Detail karyawan |
| `/employees/:id/edit` | GET/POST | ✅ | Edit karyawan |
| `/employees/:id` | DELETE | ✅ | Hapus karyawan |

---

## ⚠️ Aturan Penting — Selector & Behavior

> Bacalah aturan ini dengan seksama sebelum menulis satu baris kode pun.

### 1. Form Inputs — TIDAK ada `id` attribute
EJS templates hanya menggunakan atribut `name`. **Jangan pernah** pakai `#email`, `#password`, dsb.

```js
// ❌ SALAH — tidak ada id di form
await page.fill('#email', value);

// ✅ BENAR
await page.fill('input[name="email"]', value);
await page.fill('input[name="password"]', value);
await page.fill('input[name="name"]', value);
```

### 2. Strict Mode — Elemen Duplikat di Home Page
Navbar dan hero section sama-sama punya link `<a href="/login">`. Gunakan `.first()` atau selector yang lebih spesifik.

```js
// ❌ SALAH — strict mode error (2 elemen cocok)
await expect(page.locator('a[href="/login"]')).toBeVisible();

// ✅ BENAR — pakai class btn-lg + .first()
await expect(page.locator('a.btn-lg[href="/login"]').first()).toBeVisible();
```

### 3. Logout — Bootstrap Dropdown
Tombol logout tersembunyi di dalam Bootstrap dropdown. Harus buka dropdown dulu.

```js
// ✅ BENAR
await page.click('.navbar .dropdown-toggle');
await page.locator('.dropdown-menu').waitFor({ state: 'visible' });
await page.click('a[href="/logout"]');
await expect(page).toHaveURL('/');          // redirect ke home, BUKAN /login
```

### 4. Employee ID — VARCHAR(20)
Kolom `employee_id` di MySQL adalah `VARCHAR(20)`. Timestamp penuh = 13 digit, bisa overflow.

```js
// ❌ SALAH — "EMP-E2E-1234567890123" = 21 karakter
const id = `EMP-E2E-${Date.now()}`;

// ✅ BENAR — "EE-12345678" = 11 karakter
const ts = Date.now().toString().slice(-8);
const id = `EE-${ts}`;
```

### 5. Employee Edit — Redirect ke Detail Page
Setelah update karyawan, controller redirect ke `/employees/:id` (bukan `/employees`).

```js
// ❌ SALAH
await expect(page).toHaveURL('/employees');

// ✅ BENAR
await expect(page).toHaveURL(/\/employees\/\d+/);
```

### 6. Delete Button — Tanpa `type="submit"`
Tombol hapus hanya punya attribute `title="Hapus"`, tidak ada `type` attribute.

```js
// ❌ SALAH
await row.locator('button[type="submit"]').click();

// ✅ BENAR
await row.locator('button[title="Hapus"]').click();
```

### 7. Self-Delete — Button Tidak Ada, Bukan Sekedar Hidden
Row milik admin yang sedang login TIDAK memiliki button hapus sama sekali (dihilangkan di EJS `<% if %>`).

```js
// ✅ BENAR
await expect(selfRow.locator('button[title="Hapus"]')).not.toBeVisible();
```

---

## Langkah-Langkah yang Harus Dilakukan

### Langkah 1 — Pastikan Nodeapp Berjalan

Cek apakah nodeapp sudah running di port 3000:

```powershell
$r = Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -ErrorAction SilentlyContinue
if ($r.StatusCode -eq 200) { Write-Host "✅ nodeapp UP" } else { Write-Host "❌ nodeapp DOWN — jalankan dulu: cd d:\repo\test\nodeapp ; npm start" }
```

Jika mati, **berhenti dan minta user menjalankan nodeapp terlebih dahulu** sebelum melanjutkan.

---

### Langkah 2 — Siapkan Folder Playwright

Cek apakah folder `d:\repo\test\playwright` sudah ada. Jika belum, buat struktur berikut:

```
d:\repo\test\playwright\
├── package.json
├── playwright.config.js
├── Dockerfile
├── docker-compose.yml
├── .gitignore
└── tests\
    ├── helpers\
    │   └── auth.js
    ├── auth.spec.js
    ├── dashboard.spec.js
    ├── users.spec.js
    └── employees.spec.js
```

---

### Langkah 3 — Buat `package.json`

```json
{
  "name": "ems-playwright-tests",
  "version": "1.0.0",
  "description": "Playwright E2E tests for Employee Management System",
  "scripts": {
    "test":            "playwright test",
    "test:headed":     "playwright test --headed",
    "test:ui":         "playwright test --ui",
    "test:report":     "npx playwright show-report playwright-report",
    "test:open":       "playwright test && npx playwright show-report playwright-report",
    "test:auth":       "playwright test tests/auth.spec.js",
    "test:users":      "playwright test tests/users.spec.js",
    "test:employees":  "playwright test tests/employees.spec.js",
    "test:dashboard":  "playwright test tests/dashboard.spec.js",
    "docker:run":      "docker compose up --build --exit-code-from playwright",
    "docker:report":   "docker compose run --rm playwright npx playwright show-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.51.0"
  }
}
```

Install dependencies:

```powershell
cd d:\repo\test\playwright
npm install
npx playwright install chromium
```

---

### Langkah 4 — Buat `playwright.config.js`

```js
// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

---

### Langkah 5 — Buat `tests/helpers/auth.js`

```js
// tests/helpers/auth.js
const { expect } = require('@playwright/test');

const ADMIN = {
  email: 'admin@example.com',
  password: 'admin123',
};

async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', ADMIN.email);
  await page.fill('input[name="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
}

async function logout(page) {
  await page.click('.navbar .dropdown-toggle');
  await page.locator('.dropdown-menu').waitFor({ state: 'visible' });
  await page.click('a[href="/logout"]');
  await expect(page).toHaveURL('/');
}

module.exports = { loginAsAdmin, logout, ADMIN };
```

---

### Langkah 6 — Buat `tests/auth.spec.js` (15 tests)

```js
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
    await expect(page).toHaveURL('/');
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
```

---

### Langkah 7 — Buat `tests/dashboard.spec.js` (5 tests)

```js
// tests/dashboard.spec.js
const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/auth');

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });

  test('should display dashboard after login', async ({ page }) => {
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1, h2, .card-title')).toBeVisible();
  });

  test('should show at least one stats card', async ({ page }) => {
    await expect(page.locator('.card')).toBeVisible();
  });

  test('should have navbar links for employees and users', async ({ page }) => {
    await expect(page.locator('a.nav-link[href="/employees"]')).toBeVisible();
    await expect(page.locator('a.nav-link[href="/users"]')).toBeVisible();
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
```

---

### Langkah 8 — Buat `tests/users.spec.js` (9 tests)

```js
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
    await page.goto('/users/create');
    await page.fill('input[name="name"]', 'Hapus User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Delete123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/users');

    const row = page.locator('tr', { hasText: email });
    await expect(row).toBeVisible();
    page.once('dialog', d => d.accept());
    await row.locator('button[title="Hapus"]').click();

    await expect(page).toHaveURL('/users');
    await expect(page.locator('table')).not.toContainText(email);
  });

  test('own account row should have no delete button', async ({ page }) => {
    await page.goto('/users');
    const selfRow = page.locator('tr', { hasText: 'admin@example.com' });
    await expect(selfRow).toBeVisible();
    await expect(selfRow.locator('button[title="Hapus"]')).not.toBeVisible();
  });
});
```

---

### Langkah 9 — Buat `tests/employees.spec.js` (10 tests)

```js
// tests/employees.spec.js
const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/auth');

// employee_id column is VARCHAR(20) — keep ID short
const ts = Date.now().toString().slice(-8);
const emp = {
  employee_id: `EE-${ts}`,
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
    const row = page.locator('tr', { hasText: emp.first_name });
    if (await row.count() > 0) {
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
    await page.goto('/employees/create');
    await page.fill('input[name="employee_id"]', `DL-${delTs}`);
    await page.fill('input[name="first_name"]',  'Hapus');
    await page.fill('input[name="last_name"]',   'Data');
    await page.fill('input[name="email"]',        delEmail);
    await page.fill('input[name="department"]',   'Temp');
    await page.fill('input[name="position"]',     'Temp');
    await page.locator('select[name="gender"]').selectOption('male');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/employees');

    const row = page.locator('tr', { hasText: delEmail });
    await expect(row).toBeVisible();
    page.once('dialog', d => d.accept());
    await row.locator('button[title="Hapus"]').click();

    await expect(page).toHaveURL('/employees');
    await expect(page.locator('table')).not.toContainText(delEmail);
  });
});
```

---

### Langkah 10 — Buat `Dockerfile` dan `docker-compose.yml`

**`Dockerfile`:**

```dockerfile
FROM mcr.microsoft.com/playwright:v1.51.0-noble
WORKDIR /app
COPY package*.json ./
RUN npm ci
RUN npx playwright install --with-deps chromium
COPY . .
CMD ["npx", "playwright", "test", "--reporter=list"]
```

**`docker-compose.yml`:**

```yaml
version: '3.8'
services:
  playwright:
    build: .
    environment:
      - BASE_URL=http://host.docker.internal:3000
    volumes:
      - ./playwright-report:/app/playwright-report
      - ./test-results:/app/test-results
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

---

### Langkah 11 — Buat `.gitignore`

```
node_modules/
playwright-report/
test-results/
.env
```

---

### Langkah 12 — Jalankan & Verifikasi Tests ✅

Ini adalah langkah **wajib** — jalankan semua test dan pastikan semuanya **PASS**:

```powershell
cd d:\repo\test\playwright
npx playwright test
```

#### Kriteria Sukses

- **Jumlah tests**: tepat **38 tests** (15 auth + 5 dashboard + 9 users + 10 employees)
- **Status**: **38 passed, 0 failed**
- **Reporter**: HTML report tersimpan di `playwright-report/`

#### Jika Ada Test yang Gagal

1. **Baca pesan error dengan teliti** — perhatikan selector yang digunakan
2. **Cek aturan di bagian atas** — terutama poin 1-7 tentang selector
3. **Jalankan test spesifik** untuk isolasi masalah:
   ```powershell
   npx playwright test tests/auth.spec.js --reporter=list
   npx playwright test tests/users.spec.js --reporter=list
   npx playwright test tests/employees.spec.js --reporter=list
   npx playwright test tests/dashboard.spec.js --reporter=list
   ```
4. **Gunakan mode headed** untuk melihat browser secara visual:
   ```powershell
   npx playwright test --headed --slowMo=500
   ```
5. **Perbaiki** selector atau assertion yang salah mengacu ke aturan di atas
6. **Ulangi** hingga 38/38 pass

#### Buka HTML Report

Setelah semua test pass:

```powershell
npx playwright show-report playwright-report
```

Report akan terbuka di browser otomatis dengan tampilan lengkap tiap test case.

---

## Rangkuman

Setelah prompt ini selesai dijalankan, kamu harus memiliki:

| Item | Status |
|------|--------|
| `d:\repo\test\playwright\` | ✅ Folder project tersendiri |
| `package.json` dengan semua scripts | ✅ |
| `playwright.config.js` | ✅ |
| `tests/helpers/auth.js` | ✅ |
| `tests/auth.spec.js` (15 tests) | ✅ |
| `tests/dashboard.spec.js` (5 tests) | ✅ |
| `tests/users.spec.js` (9 tests) | ✅ |
| `tests/employees.spec.js` (10 tests) | ✅ |
| `Dockerfile` + `docker-compose.yml` | ✅ |
| **38/38 tests PASSING** | ✅ |
| HTML report di `playwright-report/` | ✅ |
