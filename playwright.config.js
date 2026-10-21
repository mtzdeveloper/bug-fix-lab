const { defineConfig, devices } = require('@playwright/test');

const target = process.env.TARGET || 'fixed';

// Browser used for the tests.
// Playwright's own browser download is not available in some regions (it returns "not available in your location").
// On Windows we use Microsoft Edge, which is already installed, so `npx playwright install` is not needed.
// Override with PW_CHANNEL=chrome (installed Google Chrome) or PW_CHANNEL=chromium (Playwright's download).
const requested = process.env.PW_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium');
const channel = requested === 'chromium' ? undefined : requested;

module.exports = defineConfig({
  testDir: './tests',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:4173', screenshot: 'only-on-failure', channel },
  webServer: {
    command: `npx http-server ${target} -p 4173 -c-1 -s`,
    port: 4173,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 5'], channel } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
  ],
});
