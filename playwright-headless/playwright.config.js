// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * BASE_URL  – URL of the application under test
 *   Local dev : http://localhost:3000
 *   Docker    : http://host.docker.internal:3000
 *
 * BROWSERLESS_WS – WebSocket endpoint of the running Browserless container
 *   Default: ws://localhost:3001
 *   Start the container with:
 *     docker run -d -p 3001:3000 --name always-running-chromium --shm-size="2g" \
 *       -e "MAX_CONCURRENT_SESSIONS=10" ghcr.io/browserless/chromium:latest
 */
const BASE_URL       = process.env.BASE_URL       || 'http://localhost:3000';
const BROWSERLESS_WS = process.env.BROWSERLESS_WS || 'ws://localhost:3001';

module.exports = defineConfig({
  testDir: './tests',

  // Run tests sequentially to avoid shared DB state issues
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: BASE_URL,

    // ── Connect to Browserless instead of launching a local browser ──────────
    // Browserless v2 exposes a Playwright-compatible WebSocket server at its
    // root endpoint. Playwright will connect to it using its own remoting
    // protocol (same as `playwright.connect()`).
    browserWSEndpoint: BROWSERLESS_WS,

    trace:      'on',
    screenshot: 'on',
    video:      'on',

    ignoreHTTPSErrors: true,
    actionTimeout:     15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium-browserless',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
