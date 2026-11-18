import { test as base, expect } from '@playwright/test';
import { USERS } from '../data/users';
import { CheckoutFlow } from '../flows/CheckoutFlow';
import { CartPage } from '../pages/CartPage';
import { CheckoutCompletePage } from '../pages/CheckoutCompletePage';
import { CheckoutInformationPage } from '../pages/CheckoutInformationPage';
import { CheckoutOverviewPage } from '../pages/CheckoutOverviewPage';
import { InventoryPage } from '../pages/InventoryPage';
import { LoginPage } from '../pages/LoginPage';
import { ProductDetailsPage } from '../pages/ProductDetailsPage';

interface UiFixtures {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  productPage: ProductDetailsPage;
  cartPage: CartPage;
  checkoutInformationPage: CheckoutInformationPage;
  checkoutOverviewPage: CheckoutOverviewPage;
  checkoutCompletePage: CheckoutCompletePage;
  /** Checkout journeys for a signed-in standard user (implies `loggedIn`). */
  checkoutFlow: CheckoutFlow;
  /** A signed-in standard user, already on the inventory page. */
  loggedIn: InventoryPage;
}

/**
 * Page objects are injected rather than constructed in every spec, so a spec
 * declares only what it uses and carries no framework setup code.
 *
 * Isolation: Playwright gives every test a fresh browser context, and the
 * storefront keeps its cart in that context's localStorage, so no test can see
 * another's cart. No teardown is needed to achieve that.
 */
export const test = base.extend<UiFixtures>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  inventoryPage: async ({ page }, use) => use(new InventoryPage(page)),
  productPage: async ({ page }, use) => use(new ProductDetailsPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutInformationPage: async ({ page }, use) => use(new CheckoutInformationPage(page)),
  checkoutOverviewPage: async ({ page }, use) => use(new CheckoutOverviewPage(page)),
  checkoutCompletePage: async ({ page }, use) => use(new CheckoutCompletePage(page)),

  checkoutFlow: async (
    { loggedIn, cartPage, checkoutInformationPage, checkoutOverviewPage },
    use,
  ) => {
    // Every checkout journey starts signed in, so the flow depends on `loggedIn`.
    await use(new CheckoutFlow(loggedIn, cartPage, checkoutInformationPage, checkoutOverviewPage));
  },

  loggedIn: async ({ context, baseURL, inventoryPage }, use) => {
    if (!baseURL) throw new Error('UI projects must configure use.baseURL');
    /*
     * SauceDemo's session is a client-side cookie holding the username. Setting
     * it directly skips the login form: for most specs authentication is a
     * precondition, not the thing under test. The form itself is covered —
     * through the real UI — by login.spec.ts and the purchase-flow smoke test.
     */
    await context.addCookies([
      { name: 'session-username', value: USERS.standard.username, url: baseURL },
    ]);
    await inventoryPage.goto();
    await inventoryPage.expectLoaded();
    await use(inventoryPage);
  },
});

export { expect };
