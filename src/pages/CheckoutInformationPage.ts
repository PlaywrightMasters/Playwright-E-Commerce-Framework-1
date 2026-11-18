import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import type { Customer } from '../data/checkout';
import { fillVerified } from '../utils/forms';

/** Checkout step one: customer information. */
export class CheckoutInformationPage extends BasePage {
  protected readonly urlPattern = /\/checkout-step-one\.html$/;
  protected readonly titleText = 'Checkout: Your Information';

  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly cancelButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.firstNameInput = page.getByTestId('firstName');
    this.lastNameInput = page.getByTestId('lastName');
    this.postalCodeInput = page.getByTestId('postalCode');
    this.continueButton = page.getByTestId('continue');
    this.cancelButton = page.getByTestId('cancel');
    this.errorMessage = page.getByTestId('error');
  }

  /**
   * Fills the form and presses Continue. Makes no claim about the outcome, so
   * it serves negative cases too — but it does guarantee the form held exactly
   * these values when Continue was pressed.
   */
  async submit(customer: Customer): Promise<void> {
    await fillVerified([
      [this.firstNameInput, customer.firstName],
      [this.lastNameInput, customer.lastName],
      [this.postalCodeInput, customer.postalCode],
    ]);
    await this.continueButton.click();
  }

  async expectError(expected: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(expected);
    // A rejected form must hold the shopper on this step.
    await expect(this.page).toHaveURL(this.urlPattern);
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.page).toHaveURL(/\/cart\.html$/);
  }
}
