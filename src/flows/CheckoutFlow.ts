import { DEFAULT_CUSTOMER, type Customer } from '../data/checkout';
import type { CartPage } from '../pages/CartPage';
import type { CheckoutInformationPage } from '../pages/CheckoutInformationPage';
import type { CheckoutOverviewPage } from '../pages/CheckoutOverviewPage';
import type { InventoryPage } from '../pages/InventoryPage';

/**
 * Multi-page journeys that many specs need as a *precondition*.
 *
 * Page objects model one screen each; a flow composes them. Without this, every
 * calculation test would repeat the same add → cart → checkout → form sequence,
 * and the interesting part of the test — the assertions — would be buried.
 */
export class CheckoutFlow {
  constructor(
    private readonly inventory: InventoryPage,
    private readonly cart: CartPage,
    private readonly information: CheckoutInformationPage,
    private readonly overview: CheckoutOverviewPage,
  ) {}

  /** Adds the products, opens the cart and lands on the customer-information step. */
  async startCheckout(productNames: readonly string[]): Promise<CheckoutInformationPage> {
    await this.inventory.addAllToCart(productNames);
    await this.inventory.header.openCart();
    await this.cart.proceedToCheckout();
    await this.information.expectLoaded();
    return this.information;
  }

  /** Drives all the way to the order overview, where the totals are shown. */
  async reviewOrder(
    productNames: readonly string[],
    customer: Customer = DEFAULT_CUSTOMER,
  ): Promise<CheckoutOverviewPage> {
    const information = await this.startCheckout(productNames);
    await information.submit(customer);
    await this.overview.expectLoaded();
    return this.overview;
  }
}
