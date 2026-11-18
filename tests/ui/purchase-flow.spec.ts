import { expect, test } from '../../src/fixtures/ui';
import { DEFAULT_CUSTOMER } from '../../src/data/checkout';
import { expectedSubtotal, expectedTotal } from '../../src/data/pricing';
import { PRODUCTS } from '../../src/data/products';
import { USERS } from '../../src/data/users';

/**
 * The one journey that must always work, driven entirely through the UI —
 * including the real login form rather than the session shortcut the other
 * specs use. If only one test runs before a release, it should be this one.
 */
test('a shopper can buy two products end to end', { tag: '@smoke' }, async ({
  loginPage,
  inventoryPage,
  cartPage,
  checkoutInformationPage,
  checkoutOverviewPage,
  checkoutCompletePage,
}) => {
  const basket = [PRODUCTS.backpack, PRODUCTS.bikeLight];
  const subtotal = expectedSubtotal(basket.map((product) => product.price));

  await test.step('sign in', async () => {
    await loginPage.goto();
    await loginPage.loginAs(USERS.standard);
    await inventoryPage.expectLoaded();
  });

  await test.step('fill the cart', async () => {
    for (const product of basket) {
      await inventoryPage.addToCart(product.name);
    }
    await inventoryPage.header.expectCartCount(basket.length);
  });

  await test.step('review the cart', async () => {
    await inventoryPage.header.openCart();
    await cartPage.expectLoaded();
    await expect(cartPage.lines.rows).toHaveCount(basket.length);
    await cartPage.proceedToCheckout();
  });

  await test.step('enter customer details', async () => {
    await checkoutInformationPage.expectLoaded();
    await checkoutInformationPage.submit(DEFAULT_CUSTOMER);
  });

  await test.step('confirm the order total', async () => {
    await checkoutOverviewPage.expectLoaded();
    const summary = await checkoutOverviewPage.summary();
    expect(summary.subtotal).toBe(subtotal);
    expect(summary.total).toBe(expectedTotal(subtotal));
    await checkoutOverviewPage.finish();
  });

  await test.step('see the confirmation and an emptied cart', async () => {
    await checkoutCompletePage.expectLoaded();
    await checkoutCompletePage.header.expectCartCount(0);

    await checkoutCompletePage.backHome();
    await inventoryPage.expectLoaded();
    await inventoryPage.header.expectCartCount(0);
    for (const product of basket) {
      await expect(inventoryPage.addToCartButton(product.name)).toBeVisible();
    }
  });
});
