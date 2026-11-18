import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import type { CatalogueEntry } from './InventoryPage';
import { parseCurrency } from '../utils/currency';
import { openPath } from '../utils/navigation';

export class ProductDetailsPage extends BasePage {
  protected readonly urlPattern = /\/inventory-item\.html\?id=\d+$/;
  // The details page has no title, only a "Back to products" link.
  protected readonly titleText = null;

  readonly name: Locator;
  readonly description: Locator;
  readonly price: Locator;
  readonly addToCartButton: Locator;
  readonly removeButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    super(page);
    this.name = page.getByTestId('inventory-item-name');
    this.description = page.getByTestId('inventory-item-desc');
    this.price = page.getByTestId('inventory-item-price');
    this.addToCartButton = page.getByTestId('add-to-cart');
    this.removeButton = page.getByTestId('remove');
    this.backButton = page.getByTestId('back-to-products');
  }

  async goto(productId: number): Promise<void> {
    await openPath(this.page, `/inventory-item.html?id=${productId}`);
  }

  override async expectLoaded(): Promise<void> {
    await super.expectLoaded();
    await expect(this.backButton).toBeVisible();
  }

  async details(): Promise<CatalogueEntry> {
    await expect(this.name).toBeVisible();
    return {
      name: (await this.name.innerText()).trim(),
      price: parseCurrency(await this.price.innerText()),
    };
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
    await expect(this.removeButton).toBeVisible();
  }

  async removeFromCart(): Promise<void> {
    await this.removeButton.click();
    await expect(this.addToCartButton).toBeVisible();
  }

  async backToProducts(): Promise<void> {
    await this.backButton.click();
    await expect(this.page).toHaveURL(/\/inventory\.html$/);
  }
}
