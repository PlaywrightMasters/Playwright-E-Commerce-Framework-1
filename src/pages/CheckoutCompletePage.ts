import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CheckoutCompletePage extends BasePage {
  protected readonly urlPattern = /\/checkout-complete\.html$/;
  protected readonly titleText = 'Checkout: Complete!';

  readonly confirmationHeader: Locator;
  readonly confirmationText: Locator;
  readonly backHomeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.confirmationHeader = page.getByTestId('complete-header');
    this.confirmationText = page.getByTestId('complete-text');
    this.backHomeButton = page.getByTestId('back-to-products');
  }

  override async expectLoaded(): Promise<void> {
    await super.expectLoaded();
    await expect(this.confirmationHeader).toHaveText('Thank you for your order!');
  }

  async backHome(): Promise<void> {
    await this.backHomeButton.click();
    await expect(this.page).toHaveURL(/\/inventory\.html$/);
  }
}
