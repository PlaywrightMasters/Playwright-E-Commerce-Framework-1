import { defineConfig, devices } from '@playwright/test';
import { JSON_HEADERS } from './src/api/BookingClient';
import { env } from './src/config/env';

/**
 * Three independent layers, each its own project:
 *
 *   unit      → pure functions the suite relies on (currency maths, test data
 *               consistency). No browser, no network; runs in milliseconds.
 *   api       → HTTP tests against restful-booker via Playwright's request
 *               context. No browser is launched.
 *   chromium / firefox / webkit
 *             → browser tests against the SauceDemo storefront.
 *
 * Splitting them means the API and unit suites never pay for a browser, and CI
 * can fan the UI suite out across engines without multiplying the other runs.
 */
export default defineConfig({
  testDir: './tests',

  /* A committed test.only must fail the build on CI. */
  forbidOnly: env.isCI,

  /* Retry on CI only. Locally a flaky test should be visible, not smoothed over. */
  retries: env.isCI ? 2 : 0,

  fullyParallel: true,
  workers: env.isCI ? 2 : undefined,

  timeout: 30_000,
  expect: { timeout: 7_000 },

  reporter: env.isCI
    ? [['html', { open: 'never' }], ['github'], ['list']]
    : [['html', { open: 'never' }], ['list']],

  use: {
    /* SauceDemo exposes stable `data-test` attributes; getByTestId() targets them. */
    testIdAttribute: 'data-test',

    /* Collect diagnostics only when something actually goes wrong. */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  projects: [
    {
      name: 'unit',
      testDir: './tests/unit',
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: env.apiBaseUrl,
        extraHTTPHeaders: JSON_HEADERS,
      },
    },
    {
      name: 'chromium',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'], baseURL: env.uiBaseUrl },
    },
    {
      name: 'firefox',
      testDir: './tests/ui',
      use: { ...devices['Desktop Firefox'], baseURL: env.uiBaseUrl },
      /*
       * Firefox is the heaviest engine here, and the storefront's third-party
       * error-reporting SDK was measured stalling its main thread (Firefox's
       * slow-script watchdog fired) when 4 Firefox workers shared an 8 GB machine.
       * Capping this project alone keeps Chromium and WebKit at full parallelism.
       * See "Reliability notes" in the README.
       */
      workers: 2,
    },
    {
      name: 'webkit',
      testDir: './tests/ui',
      use: { ...devices['Desktop Safari'], baseURL: env.uiBaseUrl },
    },
  ],
});
