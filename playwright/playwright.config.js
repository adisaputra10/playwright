// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * BASE_URL:
 *  - Running locally : http://localhost:3000
 *  - Running in Docker: set BASE_URL=http://host.docker.internal:3000
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,   // share DB state — run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on',           // capture trace for every test
    screenshot: 'on',      // capture screenshot for every test
    video: 'on',           // record video for every test
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
