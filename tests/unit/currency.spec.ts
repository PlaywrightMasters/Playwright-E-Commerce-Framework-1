import { expect, test } from '@playwright/test';
import { parseCurrency, roundCurrency, sumCurrency } from '../../src/utils/currency';
import { expectedTax, expectedTotal, TAX_RATE } from '../../src/data/pricing';

/**
 * The checkout suite is only as trustworthy as the arithmetic it compares
 * against. These tests pin that arithmetic down, so a wrong expectation can
 * never masquerade as a storefront defect (or hide one).
 */
test.describe('roundCurrency', () => {
  const CASES = [
    { input: 0.6392, expected: 0.64, why: 'rounds down below the half cent' },
    { input: 0.7992, expected: 0.8, why: 'rounds up across a tenth' },
    { input: 3.9992, expected: 4, why: 'rounds up across a whole dollar' },
    { input: 10.3952, expected: 10.4, why: 'multi-digit aggregate' },
    { input: 1.005, expected: 1.01, why: 'half cent stored as 1.00499999… in binary' },
    { input: 10.075, expected: 10.08, why: 'half cent where the Number.EPSILON idiom fails' },
    { input: 1.045, expected: 1.05, why: 'half cent stored below the true value' },
    { input: 1.004, expected: 1, why: 'just under the half cent' },
    { input: 1234.565, expected: 1234.57, why: 'half cent on a four-digit amount' },
    { input: 0, expected: 0, why: 'zero' },
    { input: -2.675, expected: -2.68, why: 'negative values round half away from zero' },
  ] as const;

  for (const { input, expected, why } of CASES) {
    test(`${input} → ${expected} (${why})`, () => {
      expect(roundCurrency(input)).toBe(expected);
    });
  }

  test('does not return negative zero', () => {
    expect(Object.is(roundCurrency(-0.001), 0)).toBe(true);
  });

  test('rejects non-finite input instead of propagating NaN', () => {
    expect(() => roundCurrency(Number.NaN)).toThrow(RangeError);
    expect(() => roundCurrency(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  test('documents why toFixed() is not used for money', () => {
    // If this ever starts passing as "1.01", the runtime changed — worth knowing.
    expect((1.005).toFixed(2)).toBe('1.00');
    expect(roundCurrency(1.005)).toBe(1.01);
  });
});

test.describe('sumCurrency', () => {
  test('absorbs floating-point drift in the sum', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumCurrency([0.1, 0.2])).toBe(0.3);
  });

  test('sums the full catalogue exactly', () => {
    expect(sumCurrency([29.99, 9.99, 15.99, 49.99, 7.99, 15.99])).toBe(129.94);
  });

  test('an empty list sums to zero', () => {
    expect(sumCurrency([])).toBe(0);
  });
});

test.describe('parseCurrency', () => {
  const CASES = [
    { text: '$29.99', expected: 29.99 },
    { text: 'Item total: $29.99', expected: 29.99 },
    { text: 'Tax: $2.40', expected: 2.4 },
    { text: 'Total: $1,234.56', expected: 1234.56 },
    { text: 'Total: $1234.56', expected: 1234.56 },
    { text: '$ 7.99', expected: 7.99 },
    { text: '$7', expected: 7 },
  ] as const;

  for (const { text, expected } of CASES) {
    test(`parses ${JSON.stringify(text)}`, () => {
      expect(parseCurrency(text)).toBe(expected);
    });
  }

  for (const text of ['Total: free', '$√-1', '', null, undefined]) {
    test(`throws on ${JSON.stringify(text) ?? 'undefined'}`, () => {
      expect(() => parseCurrency(text)).toThrow(/No dollar amount/);
    });
  }
});

test.describe('pricing rules', () => {
  test('tax rate is the published 8%', () => {
    expect(TAX_RATE).toBe(0.08);
  });

  test('tax and total for the full-catalogue subtotal', () => {
    expect(expectedTax(129.94)).toBe(10.4);
    expect(expectedTotal(129.94)).toBe(140.34);
  });

  test('total is subtotal plus the rounded tax, not the rounded product', () => {
    // 49.99 × 1.08 = 53.9892 → 53.99, which happens to agree; the definition matters
    // for any rate where rounding the tax first and rounding the total differ.
    expect(expectedTotal(49.99)).toBe(roundCurrency(49.99 + expectedTax(49.99)));
  });
});
