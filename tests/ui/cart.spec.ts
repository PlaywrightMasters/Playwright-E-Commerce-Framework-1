import { expect, test } from '../../src/fixtures/ui';
import { ALL_PRODUCTS, namesOf, PRODUCTS } from '../../src/data/products';

test.describe('Cart', () => {
  test('the badge is absent, not zero, while the cart is empty', async ({ loggedIn }) => {
    await expect(loggedIn.header.cartBadge).toHaveCount(0);
    expect(await loggedIn.header.cartCount()).toBe(0);
  });

  test('adding then removing an item returns the cart to empty', async ({ loggedIn }) => {
    await loggedIn.addToCart(PRODUCTS.backpack.name);
    await loggedIn.header.expectCartCount(1);

    await loggedIn.removeFromCart(PRODUCTS.backpack.name);
    await loggedIn.header.expectCartCount(0);
  });

  test('the cart lists exactly what was added, at catalogue prices', async ({ loggedIn, cartPage }) => {
    const added = [PRODUCTS.backpack, PRODUCTS.onesie, PRODUCTS.redTShirt];
    await loggedIn.addAllToCart(namesOf(added));
    await loggedIn.header.openCart();
    await cartPage.expectLoaded();

    const lines = await cartPage.lines.read();
    expect(lines).toHaveLength(added.length);
    expect(lines).toEqual(
      expect.arrayContaining(added.map(({ name, price }) => ({ name, price, quantity: 1 }))),
    );
  });

  test('contents survive navigating away and back', async ({ loggedIn, cartPage }) => {
    await loggedIn.addToCart(PRODUCTS.fleeceJacket.name);
    await loggedIn.header.openCart();
    await cartPage.continueShopping();

    await loggedIn.header.expectCartCount(1);
    await expect(loggedIn.removeButton(PRODUCTS.fleeceJacket.name)).toBeVisible();
  });

  test('contents survive a full page reload', async ({ loggedIn, page }) => {
    // The cart lives in localStorage, so a reload must not empty it.
    await loggedIn.addAllToCart([PRODUCTS.bikeLight.name, PRODUCTS.onesie.name]);
    await page.reload();
    await loggedIn.expectLoaded();

    await loggedIn.header.expectCartCount(2);
  });

  test('removing a line on the cart page updates the list and the badge', async ({ loggedIn, cartPage }) => {
    await loggedIn.addAllToCart([PRODUCTS.backpack.name, PRODUCTS.bikeLight.name]);
    await loggedIn.header.openCart();

    await cartPage.removeItem(PRODUCTS.backpack.name);

    expect(await cartPage.lines.names()).toEqual([PRODUCTS.bikeLight.name]);
    await cartPage.header.expectCartCount(1);
  });

  test('every catalogue item can be held at once', async ({ loggedIn, cartPage }) => {
    const everything = namesOf(ALL_PRODUCTS);
    await loggedIn.addAllToCart(everything);
    await loggedIn.header.expectCartCount(everything.length);

    await loggedIn.header.openCart();
    await expect(cartPage.lines.rows).toHaveCount(everything.length);
  });

  test('Reset App State empties the cart', async ({ loggedIn, cartPage }) => {
    await loggedIn.addAllToCart([PRODUCTS.backpack.name, PRODUCTS.onesie.name]);
    await loggedIn.header.resetAppState();

    await loggedIn.header.expectCartCount(0);
    await loggedIn.header.openCart();
    await expect(cartPage.lines.rows).toHaveCount(0);
  });
});

test.describe('Cart - known defects', { tag: '@known-defect' }, () => {
  test('checkout is reachable with an empty cart', async ({ loggedIn, cartPage, checkoutInformationPage }) => {
    /* An empty cart should not be able to start a checkout. The storefront lets
       it through to the customer-information step. This records the behaviour as
       it is; if the application is fixed, the test fails and is updated on purpose. */
    await loggedIn.header.openCart();
    await expect(cartPage.lines.rows).toHaveCount(0);

    await cartPage.proceedToCheckout();
    await checkoutInformationPage.expectLoaded();
  });

  test('Reset App State leaves stale "Remove" buttons until the page reloads', async ({ loggedIn, page }) => {
    /* After a reset the badge and storage are cleared, but the product buttons
       still say "Remove" — the UI disagrees with the cart it represents. */
    await loggedIn.addToCart(PRODUCTS.backpack.name);
    await loggedIn.header.resetAppState();
    await loggedIn.header.expectCartCount(0);

    await expect(loggedIn.removeButton(PRODUCTS.backpack.name)).toBeVisible();

    await page.reload();
    await expect(loggedIn.addToCartButton(PRODUCTS.backpack.name)).toBeVisible();
  });
});
