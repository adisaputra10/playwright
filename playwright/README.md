# Playwright E2E — Employee Management System

End-to-end test suite for the Node.js EMS application.
38 test cases · Chromium · Sequential execution

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Node.js 18+ | For running tests locally |
| Docker Desktop | For running tests in Docker |
| EMS nodeapp | Must be running on `http://localhost:3000` before tests start |
| Admin account | `admin@example.com` / `admin123` |

---

## Running Locally

### 1. Install dependencies (first time only)

```powershell
cd d:\repo\test\playwright
npm install
npx playwright install chromium
```

### 2. Start the nodeapp (separate terminal)

```powershell
cd d:\repo\test\nodeapp
npm start
```

### 3. Run all tests

```powershell
npm test
```

### 4. Open HTML report

```powershell
npm run test:report
```

---

## Running with Docker

### Build the image

```powershell
cd d:\repo\test\playwright
docker build -t ems-playwright .
```

### Run tests (--rm removes container after finish)

```powershell
docker run --rm `
  --add-host=host.docker.internal:host-gateway `
  -e BASE_URL=http://host.docker.internal:3000 `
  -v "${PWD}/playwright-report:/app/playwright-report" `
  -v "${PWD}/test-results:/app/test-results" `
  ems-playwright
```

> Report will be saved to `playwright-report/` on your host machine.

### Open report after Docker run

```powershell
npm run test:report
```

---

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all 38 tests (headless) |
| `npm run test:headed` | Run with visible browser window |
| `npm run test:ui` | Open Playwright interactive UI |
| `npm run test:report` | Open saved HTML report in browser |
| `npm run test:open` | Run tests then open HTML report |
| `npm run test:auth` | Run only auth.spec.js (15 tests) |
| `npm run test:dashboard` | Run only dashboard.spec.js (5 tests) |
| `npm run test:users` | Run only users.spec.js (9 tests) |
| `npm run test:employees` | Run only employees.spec.js (10 tests) |

---

## Project Structure

```
playwright/
├── Dockerfile                  # Docker image (mcr.microsoft.com/playwright:v1.51.0-noble)
├── docker-compose.yml          # Docker Compose (optional, for full-stack Docker setup)
├── playwright.config.js        # Config: baseURL, reporters, workers=1
├── package.json
├── TEST-CASES.md               # Full list of all 38 test cases
├── playwright-report/          # HTML report (generated after each run)
├── test-results/               # Trace files, screenshots on failure
└── tests/
    ├── helpers/
    │   └── auth.js             # loginAsAdmin(), logout() helpers
    ├── auth.spec.js            # 15 tests — home, login, register, logout
    ├── dashboard.spec.js       # 5 tests  — dashboard, navbar
    ├── users.spec.js           # 9 tests  — user CRUD
    └── employees.spec.js       # 10 tests — employee CRUD
```

---

## Configuration

Edit `playwright.config.js` or pass environment variables:

| Env Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | App URL to test against |

---

## HTML Report

After every test run a report is written to `playwright-report/index.html`.

Open it:
```powershell
npx playwright show-report playwright-report
```

The report shows per-test status, duration, screenshots on failure, and trace files.

---

## Debugging a Failing Test

```powershell
# Run one file with headed browser (slow motion 500ms)
npx playwright test tests/auth.spec.js --headed --slowMo=500

# Open interactive Playwright UI
npm run test:ui

# Show trace for last failure
npx playwright show-trace test-results/**/trace.zip
```
