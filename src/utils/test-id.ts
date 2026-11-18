/**
 * Converts a product name into the fragment SauceDemo uses in its per-product
 * `data-test` ids (e.g. `add-to-cart-<slug>`, `remove-<slug>`).
 *
 * The storefront only lower-cases the name and turns whitespace into hyphens;
 * punctuation is kept verbatim:
 *
 *   "Test.allTheThings() T-Shirt (Red)" → "test.allthethings()-t-shirt-(red)"
 *
 * "Tidying" the slug by stripping dots or parentheses would silently break
 * that one product and nothing else, which is why this is unit tested.
 */
export function productSlug(productName: string): string {
  return productName.trim().toLowerCase().replace(/\s+/g, '-');
}
