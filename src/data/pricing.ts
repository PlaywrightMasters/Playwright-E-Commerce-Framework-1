import { roundCurrency, sumCurrency } from '../utils/currency';

/**
 * The storefront's pricing rules, expressed independently of the UI so the
 * checkout figures can be reconciled against an oracle rather than eyeballed.
 */

/** SauceDemo applies a flat 8% sales tax to the item subtotal. */
export const TAX_RATE = 0.08;

export function expectedSubtotal(prices: readonly number[]): number {
  return sumCurrency(prices);
}

export function expectedTax(subtotal: number): number {
  return roundCurrency(subtotal * TAX_RATE);
}

export function expectedTotal(subtotal: number): number {
  return roundCurrency(subtotal + expectedTax(subtotal));
}
