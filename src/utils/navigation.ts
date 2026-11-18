import type { Page } from '@playwright/test';

/**
 * Navigates to a storefront path without waiting for the `load` event.
 *
 * `load` waits for every product image (1200×1500 JPEGs), web fonts and the
 * site's own `load` handlers — including a third-party error-reporting SDK that
 * was measured stalling Firefox's main thread long enough to trip the browser's
 * slow-script watchdog. None of that is the application under test. Page
 * objects already wait for the specific elements they need, which is both
 * faster and a more meaningful readiness signal.
 */
export async function openPath(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}
