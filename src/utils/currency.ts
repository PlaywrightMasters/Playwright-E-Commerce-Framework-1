/**
 * Currency helpers. Every money assertion in the suite goes through these, so
 * the rounding and parsing rules live in exactly one place — and are unit
 * tested in tests/unit/currency.spec.ts.
 */

/**
 * Rounds to cents, half away from zero.
 *
 * Neither `toFixed(2)` nor the common `Math.round((v + Number.EPSILON) * 100)`
 * idiom is safe here, because both operate on the binary approximation of the
 * value:
 *
 *   (1.005).toFixed(2)                          → "1.00"   (should be 1.01)
 *   Math.round((10.075 + Number.EPSILON) * 100) → 1007     (should be 1008)
 *
 * `Number.EPSILON` only nudges values near 1.0; at 10.075 it is smaller than
 * the gap between adjacent doubles and does nothing. Instead, the scaled value
 * is re-read at 12 significant digits, which discards the representation noise
 * (1007.4999999999999 → 1007.5) before rounding. Twelve digits leave ample
 * headroom for any realistic order total.
 */
export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Cannot round a non-finite currency value: ${value}`);
  }
  const cents = Number((Math.abs(value) * 100).toPrecision(12));
  const rounded = (Math.sign(value) * Math.round(cents)) / 100;
  // Avoid returning -0 so that strict equality assertions behave intuitively.
  return rounded === 0 ? 0 : rounded;
}

/** Sums money values and rounds the result once, at the end. */
export function sumCurrency(values: readonly number[]): number {
  return roundCurrency(values.reduce((total, value) => total + value, 0));
}

/**
 * Extracts a dollar amount from display text such as "Item total: $29.99",
 * "Total: $1,234.56" or "$7". Throws rather than returning NaN, so a markup
 * change fails loudly at the parse instead of producing a confusing assertion.
 */
export function parseCurrency(text: string | null | undefined): number {
  const match = text?.match(/\$\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d{1,2})?/);
  if (!match?.[1]) {
    throw new Error(`No dollar amount found in text: ${JSON.stringify(text)}`);
  }
  const whole = match[1].replace(/,/g, '');
  return Number.parseFloat(`${whole}${match[2] ?? ''}`);
}
