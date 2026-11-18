import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { parseCurrency } from '../utils/currency';
import { openPath } from '../utils/navigation';
import { productSlug } from '../utils/test-id';

/** Sort option values mapped to the label the storefront displays for each. */
export const SORT_OPTIONS = {
  az: 'Name (A to Z)',
  za: 'Name (Z to A)',
  lohi: 'Price (low to high)',
  hilo: 'Price (high to low)',
} as const;

export type SortOption = keyof typeof SORT_OPTIONS;

export interface CatalogueEntry {
  name: string;
  price: number;
}

export class InventoryPage extends BasePage {
  protected readonly urlPattern = /\/inventory\.html$/;
  protected readonly titleText = 'Products';

  readonly items: Locator;
  readonly itemNames: Locator;
  readonly itemPrices: Locator;
  readonly itemImages: Locator;
  readonly sortSelect: Locator;
  readonly activeSortLabel: Locator;

  constructor(page: Page) {
    super(page);
    this.items = page.getByTestId('inventory-item');
    this.itemNames = page.getByTestId('inventory-item-name');
    this.itemPrices = page.getByTestId('inventory-item-price');
    this.itemImages = page.locator('img.inventory_item_img');
    this.sortSelect = page.getByTestId('product-sort-container');
    this.activeSortLabel = page.getByTestId('active-option');
  }

  async goto(): Promise<void> {
    await openPath(this.page, '/inventory.html');
  }

  override async expectLoaded(): Promise<void> {
    await super.expectLoaded();
    await expect(this.items.first()).toBeVisible();
  }

  addToCartButton(productName: string): Locator {
    return this.page.getByTestId(`add-to-cart-${productSlug(productName)}`);
  }

  removeButton(productName: string): Locator {
    return this.page.getByTestId(`remove-${productSlug(productName)}`);
  }

  async addToCart(productName: string): Promise<void> {
    await this.addToCartButton(productName).click();
    // The button flipping to "Remove" is the proof the state change registered.
    await expect(this.removeButton(productName)).toBeVisible();
  }

  async removeFromCart(productName: string): Promise<void> {
    await this.removeButton(productName).click();
    await expect(this.addToCartButton(productName)).toBeVisible();
  }

  async addAllToCart(productNames: readonly string[]): Promise<void> {
    for (const name of productNames) {
      await this.addToCart(name);
    }
  }

  async sortBy(option: SortOption): Promise<void> {
    await this.sortSelect.selectOption(option);
    await expect(this.activeSortLabel).toHaveText(SORT_OPTIONS[option]);
  }

  async openProduct(productName: string): Promise<void> {
    await this.itemNames.and(this.page.getByText(productName, { exact: true })).click();
    await expect(this.page).toHaveURL(/\/inventory-item\.html\?id=\d+$/);
  }

  async displayedNames(): Promise<string[]> {
    return (await this.itemNames.allInnerTexts()).map((text) => text.trim());
  }

  /** Prices as numbers, in display order. */
  async displayedPrices(): Promise<number[]> {
    return (await this.itemPrices.allInnerTexts()).map(parseCurrency);
  }

  async displayedCatalogue(): Promise<CatalogueEntry[]> {
    const [names, prices] = await Promise.all([this.displayedNames(), this.displayedPrices()]);
    return names.map((name, index) => ({ name, price: prices[index] ?? Number.NaN }));
  }

  /** The image file names, without hashes or paths, in display order. */
  async displayedImageFiles(): Promise<string[]> {
    const sources = await this.itemImages.evaluateAll((images) =>
      images.map((image) => image.getAttribute('src') ?? ''),
    );
    return sources.map((src) => src.split('/').pop() ?? src);
  }
}
