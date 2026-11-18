import type { ProductKey } from './products';

export interface Customer {
  firstName: string;
  lastName: string;
  postalCode: string;
}

export const DEFAULT_CUSTOMER: Customer = {
  firstName: 'Alexa',
  lastName: 'Tester',
  postalCode: '10001',
};

export interface CheckoutScenario {
  /** Used as the generated test title. */
  title: string;
  items: readonly ProductKey[];
  /**
   * Hand-calculated, deliberately not derived from the catalogue in code, so it
   * is an independent oracle. tests/unit/test-data.spec.ts checks that each
   * figure still agrees with the catalogue table.
   */
  expectedSubtotal: number;
}

/**
 * Data-driven checkout cases, chosen for rounding behaviour rather than for
 * catalogue coverage. Each subtotal lands the 8% tax on a different fraction
 * of a cent:
 *
 *    7.99 × 0.08 =  0.6392  → 0.64   rounds down
 *    9.99 × 0.08 =  0.7992  → 0.80   rounds up across a tenth
 *   49.99 × 0.08 =  3.9992  → 4.00   rounds up across a whole dollar
 *   31.98 × 0.08 =  2.5584  → 2.56   two identically priced lines
 *   47.97 × 0.08 =  3.8376  → 3.84   three-line mixed basket
 *   79.98 × 0.08 =  6.3984  → 6.40   two highest-priced lines
 *  129.94 × 0.08 = 10.3952  → 10.40  full catalogue, largest aggregate
 *
 * Note: at 8% a whole-cent subtotal can never produce an exact half cent
 * (8c ≡ 50 mod 100 has no integer solution), so these cases probe the
 * representation of the figures rather than tie-breaking between modes.
 */
export const CHECKOUT_SCENARIOS: readonly CheckoutScenario[] = [
  { title: 'single lowest-priced item, tax rounds down', items: ['onesie'], expectedSubtotal: 7.99 },
  { title: 'single item, tax rounds up across a tenth', items: ['bikeLight'], expectedSubtotal: 9.99 },
  { title: 'single highest-priced item, tax rounds up to a whole dollar', items: ['fleeceJacket'], expectedSubtotal: 49.99 },
  { title: 'two lines with identical prices', items: ['boltTShirt', 'redTShirt'], expectedSubtotal: 31.98 },
  { title: 'mixed basket of three lines', items: ['backpack', 'bikeLight', 'onesie'], expectedSubtotal: 47.97 },
  { title: 'two highest-priced lines', items: ['backpack', 'fleeceJacket'], expectedSubtotal: 79.98 },
  {
    title: 'full catalogue, largest aggregate subtotal',
    items: ['backpack', 'bikeLight', 'boltTShirt', 'fleeceJacket', 'onesie', 'redTShirt'],
    expectedSubtotal: 129.94,
  },
];

export interface RequiredFieldCase {
  title: string;
  customer: Customer;
  expectedError: RegExp;
}

/** Customer-information validation: the first missing field wins. */
export const REQUIRED_FIELD_CASES: readonly RequiredFieldCase[] = [
  { title: 'first name missing', customer: { ...DEFAULT_CUSTOMER, firstName: '' }, expectedError: /First Name is required/ },
  { title: 'last name missing', customer: { ...DEFAULT_CUSTOMER, lastName: '' }, expectedError: /Last Name is required/ },
  { title: 'postal code missing', customer: { ...DEFAULT_CUSTOMER, postalCode: '' }, expectedError: /Postal Code is required/ },
  { title: 'every field missing', customer: { firstName: '', lastName: '', postalCode: '' }, expectedError: /First Name is required/ },
];
