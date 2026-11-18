import { expect, test } from '@playwright/test';
import { CHECKOUT_SCENARIOS } from '../../src/data/checkout';
import { expectedSubtotal } from '../../src/data/pricing';
import { ALL_PRODUCTS, PRODUCTS, productsFor } from '../../src/data/products';
import { productSlug } from '../../src/utils/test-id';

/**
 * Guards on the test data itself. A data table that drifts out of agreement
 * with itself produces failures that look like application defects; catching
 * that here, without a browser, is much cheaper than diagnosing it later.
 */
test.describe('checkout scenario table', () => {
  for (const scenario of CHECKOUT_SCENARIOS) {
    test(`hand-calculated subtotal agrees with the catalogue: ${scenario.title}`, () => {
      const prices = productsFor(scenario.items).map((product) => product.price);
      expect(expectedSubtotal(prices)).toBe(scenario.expectedSubtotal);
    });
  }

  test('scenario titles are unique, so generated test names are too', () => {
    const titles = CHECKOUT_SCENARIOS.map((scenario) => scenario.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  test('no scenario repeats a product (the storefront has no quantity control)', () => {
    for (const scenario of CHECKOUT_SCENARIOS) {
      expect(new Set(scenario.items).size, scenario.title).toBe(scenario.items.length);
    }
  });
});

test.describe('product catalogue table', () => {
  test('product ids and names are unique', () => {
    expect(new Set(ALL_PRODUCTS.map((p) => p.id)).size).toBe(ALL_PRODUCTS.length);
    expect(new Set(ALL_PRODUCTS.map((p) => p.name)).size).toBe(ALL_PRODUCTS.length);
  });

  test('every price is a positive whole number of cents', () => {
    for (const product of ALL_PRODUCTS) {
      expect(product.price, product.name).toBeGreaterThan(0);
      expect(Number.isInteger(Math.round(product.price * 100)), product.name).toBe(true);
    }
  });
});

test.describe('productSlug', () => {
  test('lower-cases and hyphenates whitespace', () => {
    expect(productSlug(PRODUCTS.backpack.name)).toBe('sauce-labs-backpack');
  });

  test('keeps punctuation verbatim, matching the storefront', () => {
    expect(productSlug(PRODUCTS.redTShirt.name)).toBe('test.allthethings()-t-shirt-(red)');
  });

  test('collapses runs of whitespace', () => {
    expect(productSlug('  Sauce   Labs\tOnesie ')).toBe('sauce-labs-onesie');
  });
});
