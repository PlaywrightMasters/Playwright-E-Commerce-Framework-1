import { expect, test } from '../../src/fixtures/ui';
import { ALL_PRODUCTS, PRODUCTS } from '../../src/data/products';

test.describe('Product details', () => {
  for (const product of ALL_PRODUCTS) {
    test(`details agree with the catalogue: ${product.name}`, async ({ loggedIn, productPage }) => {
      await loggedIn.openProduct(product.name);
      await productPage.expectLoaded();

      expect(await productPage.details()).toEqual({ name: product.name, price: product.price });
      await expect(productPage.page).toHaveURL(new RegExp(`id=${product.id}$`));
      await expect(productPage.description).not.toBeEmpty();
    });
  }

  test('adding from the details page is reflected back in the catalogue', async ({ loggedIn, productPage }) => {
    await loggedIn.openProduct(PRODUCTS.bikeLight.name);
    await productPage.addToCart();
    await productPage.header.expectCartCount(1);

    await productPage.backToProducts();
    await expect(loggedIn.removeButton(PRODUCTS.bikeLight.name)).toBeVisible();
    await loggedIn.header.expectCartCount(1);
  });

  test('removing on the details page undoes an add made in the catalogue', async ({ loggedIn, productPage }) => {
    await loggedIn.addToCart(PRODUCTS.onesie.name);
    await loggedIn.openProduct(PRODUCTS.onesie.name);

    await expect(productPage.removeButton).toBeVisible();
    await productPage.removeFromCart();
    await productPage.header.expectCartCount(0);
  });

  test('an unknown product id - documented defect: renders a buyable placeholder', { tag: '@known-defect' }, async ({ loggedIn, productPage }) => {
    /* A missing product should produce a not-found page with nothing to buy.
       Instead the storefront renders "ITEM NOT FOUND" priced at "$√-1" with a
       working Add to cart button. */
    await loggedIn.header.expectCartCount(0);
    await productPage.goto(999);

    await expect(productPage.name).toHaveText('ITEM NOT FOUND');
    await expect(productPage.price).toHaveText('$√-1');
    await expect(productPage.addToCartButton).toBeEnabled();
  });
});
