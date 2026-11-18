import { expect, test } from '../../src/fixtures/ui';
import { CHECKOUT_SCENARIOS, DEFAULT_CUSTOMER } from '../../src/data/checkout';
import { expectedSubtotal, expectedTax, expectedTotal, TAX_RATE } from '../../src/data/pricing';
import { namesOf, PRODUCTS, productsFor } from '../../src/data/products';
import { roundCurrency } from '../../src/utils/currency';

/**
 * Checkout arithmetic.
 *
 * The expensive storefront defects are rarely "the button does nothing". They
 * are a subtotal that is right, a tax figure that is right, and a total that
 * is not their sum — invisible in the interface, and only caught by reconciling
 * the displayed figures against an independently calculated expectation.
 */
test.describe('Checkout calculations', () => {
  for (const scenario of CHECKOUT_SCENARIOS) {
    test(`subtotal, tax and total reconcile: ${scenario.title}`, { tag: '@calc' }, async ({ checkoutFlow }) => {
      const overview = await checkoutFlow.reviewOrder(namesOf(productsFor(scenario.items)));
      const summary = await overview.summary();

      // Four separate assertions, so a failure names *which* figure is wrong.
      expect(summary.subtotal, 'subtotal = sum of catalogue prices').toBe(scenario.expectedSubtotal);
      expect(summary.tax, `tax = ${TAX_RATE * 100}% of subtotal, rounded to cents`).toBe(
        expectedTax(scenario.expectedSubtotal),
      );
      expect(summary.total, 'total = subtotal + tax').toBe(expectedTotal(scenario.expectedSubtotal));

      // Internal consistency, independent of the oracle above: catches figures
      // that are each plausible but do not agree with each other.
      expect(roundCurrency(summary.subtotal + summary.tax), 'displayed figures reconcile').toBe(summary.total);
    });
  }

  test('the subtotal equals the sum of the lines shown on the overview', { tag: '@calc' }, async ({ checkoutFlow }) => {
    const overview = await checkoutFlow.reviewOrder([
      PRODUCTS.backpack.name,
      PRODUCTS.boltTShirt.name,
      PRODUCTS.bikeLight.name,
    ]);

    const lines = await overview.lines.read();
    const summary = await overview.summary();

    // Reconciled against what the page itself displays, not the catalogue.
    expect(summary.subtotal).toBe(expectedSubtotal(lines.map((line) => line.price * line.quantity)));
  });

  test('the overview lists exactly the lines that were in the cart', async ({ loggedIn, cartPage, checkoutInformationPage, checkoutOverviewPage }) => {
    await loggedIn.addAllToCart([PRODUCTS.fleeceJacket.name, PRODUCTS.onesie.name]);
    await loggedIn.header.openCart();
    await cartPage.expectLoaded();
    const inCart = await cartPage.lines.read();
    expect(inCart, 'guard against comparing two empty lists').toHaveLength(2);

    await cartPage.proceedToCheckout();
    await checkoutInformationPage.submit(DEFAULT_CUSTOMER);
    await checkoutOverviewPage.expectLoaded();

    expect(await checkoutOverviewPage.lines.read()).toEqual(inCart);
  });

  test('adding then removing an item leaves no residue in the total', { tag: '@calc' }, async ({ loggedIn, checkoutFlow }) => {
    /* A reversed action must not leave a phantom line counted in the subtotal. */
    await loggedIn.addToCart(PRODUCTS.backpack.name);
    await loggedIn.addToCart(PRODUCTS.fleeceJacket.name);
    await loggedIn.removeFromCart(PRODUCTS.fleeceJacket.name);

    const overview = await checkoutFlow.reviewOrder([]);
    const summary = await overview.summary();

    expect(summary.subtotal).toBe(PRODUCTS.backpack.price);
    expect(summary.total).toBe(expectedTotal(PRODUCTS.backpack.price));
  });

  test('payment and shipping details are shown on the overview', async ({ checkoutFlow }) => {
    const overview = await checkoutFlow.reviewOrder([PRODUCTS.onesie.name]);

    await expect(overview.paymentInfo).not.toBeEmpty();
    await expect(overview.shippingInfo).not.toBeEmpty();
  });
});
