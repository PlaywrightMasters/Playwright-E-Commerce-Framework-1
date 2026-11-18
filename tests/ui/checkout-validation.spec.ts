import { expect, test } from '../../src/fixtures/ui';
import { DEFAULT_CUSTOMER, REQUIRED_FIELD_CASES } from '../../src/data/checkout';
import { expectedTotal } from '../../src/data/pricing';
import { PRODUCTS } from '../../src/data/products';

test.describe('Checkout form validation', () => {
  for (const testCase of REQUIRED_FIELD_CASES) {
    test(`customer information is rejected: ${testCase.title}`, async ({ checkoutFlow }) => {
      const information = await checkoutFlow.startCheckout([PRODUCTS.backpack.name]);

      await information.submit(testCase.customer);
      await information.expectError(testCase.expectedError);
    });
  }

  test('fixing the error lets the shopper continue', async ({ checkoutFlow, checkoutOverviewPage }) => {
    const information = await checkoutFlow.startCheckout([PRODUCTS.backpack.name]);

    await information.submit({ ...DEFAULT_CUSTOMER, postalCode: '' });
    await information.expectError(/Postal Code is required/);

    await information.submit(DEFAULT_CUSTOMER);
    await checkoutOverviewPage.expectLoaded();
  });

  test('over-length input degrades safely and leaves the totals intact', async ({ checkoutFlow }) => {
    // No documented maximum length: very long input must still not break the order.
    const overview = await checkoutFlow.reviewOrder([PRODUCTS.bikeLight.name], {
      firstName: 'A'.repeat(256),
      lastName: 'B'.repeat(256),
      postalCode: '9'.repeat(64),
    });

    expect((await overview.summary()).total).toBe(expectedTotal(PRODUCTS.bikeLight.price));
  });

  test('non-Latin and accented names are accepted', async ({ checkoutFlow }) => {
    const overview = await checkoutFlow.reviewOrder([PRODUCTS.onesie.name], {
      firstName: 'Zoë',
      lastName: 'Åström-Núñez 李',
      postalCode: 'SW1A 1AA',
    });
    await overview.expectLoaded();
  });

  test('whitespace-only details pass validation - documented defect', { tag: '@known-defect' }, async ({ checkoutFlow, checkoutOverviewPage }) => {
    /* A name made of spaces is still an empty name. The form only checks for
       the empty string, so blank-looking details reach the order overview. */
    const information = await checkoutFlow.startCheckout([PRODUCTS.onesie.name]);

    await information.submit({ firstName: '   ', lastName: '   ', postalCode: '   ' });
    await checkoutOverviewPage.expectLoaded();
  });
});

test.describe('Checkout navigation', () => {
  test('cancelling the information step returns to the cart with items intact', async ({ checkoutFlow, cartPage }) => {
    const information = await checkoutFlow.startCheckout([PRODUCTS.backpack.name, PRODUCTS.onesie.name]);

    await information.cancel();
    await cartPage.expectLoaded();
    await expect(cartPage.lines.rows).toHaveCount(2);
  });

  test('cancelling the overview returns to the catalogue with the cart intact', async ({ loggedIn, checkoutFlow }) => {
    const overview = await checkoutFlow.reviewOrder([PRODUCTS.fleeceJacket.name]);

    await overview.cancel();
    await loggedIn.expectLoaded();
    await loggedIn.header.expectCartCount(1);
  });
});
