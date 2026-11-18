import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { LineItems } from '../components/LineItems';
import { parseCurrency } from '../utils/currency';

export interface OrderSummary {
  subtotal: number;
  tax: number;
  total: number;
}

/** Checkout step two: order overview with the price breakdown. */
export class CheckoutOverviewPage extends BasePage {
  protected readonly urlPattern = /\/checkout-step-two\.html$/;
  protected readonly titleText = 'Checkout: Overview';

  readonly lines: LineItems;
  readonly paymentInfo: Locator;
  readonly shippingInfo: Locator;
  readonly subtotalLabel: Locator;
  readonly taxLabel: Locator;
  readonly totalLabel: Locator;
  readonly finishButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.lines = new LineItems(page);
    this.paymentInfo = page.getByTestId('payment-info-value');
    this.shippingInfo = page.getByTestId('shipping-info-value');
    this.subtotalLabel = page.getByTestId('subtotal-label');
    this.taxLabel = page.getByTestId('tax-label');
    this.totalLabel = page.getByTestId('total-label');
    this.finishButton = page.getByTestId('finish');
    this.cancelButton = page.getByTestId('cancel');
  }

  /**
   * The three figures the overview claims, parsed once. Every calculation
   * assertion in the suite is made against this rather than scraped strings.
   */
  async summary(): Promise<OrderSummary> {
    await expect(this.totalLabel).toBeVisible();
    const [subtotal, tax, total] = await Promise.all([
      this.subtotalLabel.innerText(),
      this.taxLabel.innerText(),
      this.totalLabel.innerText(),
    ]);
    return {
      subtotal: parseCurrency(subtotal),
      tax: parseCurrency(tax),
      total: parseCurrency(total),
    };
  }

  async finish(): Promise<void> {
    await this.finishButton.click();
    await expect(this.page).toHaveURL(/\/checkout-complete\.html$/);
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.page).toHaveURL(/\/inventory\.html$/);
  }
}
