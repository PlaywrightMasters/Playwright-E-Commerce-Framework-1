export interface Product {
  /** The id SauceDemo uses in `/inventory-item.html?id=<id>`. */
  id: number;
  name: string;
  price: number;
}

/**
 * The storefront catalogue, held as data so specs and scenario tables can refer
 * to products by key. The catalogue spec asserts the live site still matches
 * this table, so drift is reported once, in one place, instead of surfacing as
 * a scatter of unrelated failures.
 */
export const PRODUCTS = {
  backpack: { id: 4, name: 'Sauce Labs Backpack', price: 29.99 },
  bikeLight: { id: 0, name: 'Sauce Labs Bike Light', price: 9.99 },
  boltTShirt: { id: 1, name: 'Sauce Labs Bolt T-Shirt', price: 15.99 },
  fleeceJacket: { id: 5, name: 'Sauce Labs Fleece Jacket', price: 49.99 },
  onesie: { id: 2, name: 'Sauce Labs Onesie', price: 7.99 },
  redTShirt: { id: 3, name: 'Test.allTheThings() T-Shirt (Red)', price: 15.99 },
} as const satisfies Record<string, Product>;

export type ProductKey = keyof typeof PRODUCTS;

export const ALL_PRODUCTS: readonly Product[] = Object.values(PRODUCTS);

export function productsFor(keys: readonly ProductKey[]): Product[] {
  return keys.map((key) => PRODUCTS[key]);
}

export function namesOf(products: readonly Product[]): string[] {
  return products.map((product) => product.name);
}
