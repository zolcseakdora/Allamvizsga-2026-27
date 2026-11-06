const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.cjs',
  timeout: 60000,
  expect: { timeout: 30000 },
  workers: 2,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: 'https://mmdszapp-regi--cfdlq5tqr6.expo.app',
    locale: 'hu-HU',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'Chrome - Web', use: { ...devices['Desktop Chrome'] } },
    { name: 'Firefox - Web', use: { ...devices['Desktop Firefox'] } },
    { name: 'Safari - Web', use: { ...devices['Desktop Safari'] } },
    { name: 'Android - Web', use: { ...devices['Pixel 5'] } },
    { name: 'iPhone - Web', use: { ...devices['iPhone 12'] } }
  ]
});