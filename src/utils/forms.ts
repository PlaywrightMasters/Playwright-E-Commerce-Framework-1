import { expect, type Locator } from '@playwright/test';

/**
 * Fills a set of inputs and confirms every value stuck before returning.
 *
 * SauceDemo's inputs are React-controlled, and a re-render straight after the
 * page mounts can reset them. A value typed in that window is dropped without
 * any error — observed on WebKit and Firefox, where the form was then submitted
 * with an empty First Name. No human types that fast, so it is a test-speed
 * artefact rather than a product defect, but it made the suite flaky.
 *
 * Checking each value before submitting turns that silent drop into a retry.
 */
export async function fillVerified(fields: ReadonlyArray<readonly [Locator, string]>): Promise<void> {
  await expect(async () => {
    for (const [input, value] of fields) {
      await input.fill(value);
    }
    for (const [input, value] of fields) {
      await expect(input).toHaveValue(value, { timeout: 1_000 });
    }
  }).toPass({ timeout: 10_000 });
}
