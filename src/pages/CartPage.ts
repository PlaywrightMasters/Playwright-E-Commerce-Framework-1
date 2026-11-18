import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { LineItems } from '../components/LineItems';
import { openPath } from '../utils/navigation';
import { productSlug } from '../utils/test-id';

export class CartPage extends BasePage {
  protected readonly urlPattern = /\/cart\.html$/;
  protected readonly titleText = 'Your Cart';

  readonly lines: LineItems;
  readonly checkoutButton: Locator;
  readonly continueShoppingButton: Locator;

  constructor(page: Page) {
    super(page);
    this.lines = new LineItems(page);
    this.checkoutButton = page.getByTestId('checkout');
    this.continueShoppingButton = page.getByTestId('continue-shopping');
  }

  async goto(): Promise<void> {
    await openPath(this.page, '/cart.html');
  }

  async removeItem(productName: string): Promise<void> {
    await this.page.getByTestId(`remove-${productSlug(productName)}`).click();
    await expect(this.lines.row(productName)).toHaveCount(0);
  }

  async continueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
    await expect(this.page).toHaveURL(/\/inventory\.html$/);
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
    await expect(this.page).toHaveURL(/\/checkout-step-one\.html$/);
  }
}
