import { expect, test } from '../../src/fixtures/ui';
import { ALL_PRODUCTS, PRODUCTS } from '../../src/data/products';
import { USERS } from '../../src/data/users';

/**
 * SauceDemo ships accounts with deliberately injected defects. Pointing the
 * same checks used for the standard account at `problem_user` demonstrates
 * that the suite actually detects those defects — evidence the assertions have
 * teeth, not just that the happy path is green.
 *
 * Each test asserts the defect is *present*, so the suite stays green while
 * the account behaves as designed, and goes red if it ever stops reproducing.
 */
test.describe('problem_user - injected defects are detected', { tag: '@known-defect' }, () => {
  test.beforeEach(async ({ loginPage, inventoryPage }) => {
    await loginPage.goto();
    await loginPage.loginAs(USERS.problem);
    await inventoryPage.expectLoaded();
  });

  test('every product shows the same broken image', async ({ inventoryPage }) => {
    const images = await inventoryPage.displayedImageFiles();

    expect(images).toHaveLength(ALL_PRODUCTS.length);
    expect(new Set(images).size, 'distinct product images').toBe(1);
  });

  test('sorting by price has no effect on the order', async ({ inventoryPage }) => {
    const before = await inventoryPage.displayedPrices();
    await inventoryPage.sortSelect.selectOption('lohi');

    const after = await inventoryPage.displayedPrices();
    expect(after).toEqual(before);
    expect(after).not.toEqual([...after].sort((a, b) => a - b));
  });

  test('some products cannot be added to the cart', async ({ inventoryPage }) => {
    await inventoryPage.addToCart(PRODUCTS.backpack.name);
    // The click on this product is swallowed: the button never flips to Remove.
    await inventoryPage.addToCartButton(PRODUCTS.boltTShirt.name).click();

    await expect(inventoryPage.removeButton(PRODUCTS.boltTShirt.name)).toHaveCount(0);
    await inventoryPage.header.expectCartCount(1);
  });
});
