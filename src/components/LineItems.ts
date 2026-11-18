import { expect, type Locator, type Page } from '@playwright/test';
import { parseCurrency } from '../utils/currency';

export interface LineItem {
  name: string;
  price: number;
  quantity: number;
}

/**
 * The list of order lines shared by the cart and the checkout overview. Both
 * screens render identical markup, so they share one reader — and a comparison
 * between the two screens compares like with like.
 */
export class LineItems {
  readonly list: Locator;
  readonly rows: Locator;

  constructor(private readonly page: Page) {
    /*
     * Scoped to the cart list on purpose. The catalogue uses the same
     * `inventory-item` test id, and straight after a client-side navigation the
     * outgoing catalogue can still be in the DOM. An unscoped locator then counts
     * six catalogue rows on a two-line cart — a race that showed up on WebKit.
     */
    this.list = page.getByTestId('cart-list');
    this.rows = this.list.getByTestId('inventory-item');
  }

  row(productName: string): Locator {
    return this.rows.filter({
      has: this.page.getByTestId('inventory-item-name').and(this.page.getByText(productName, { exact: true })),
    });
  }

  /**
   * Snapshot of every line. `rows.all()` does not wait, so the list container
   * is awaited first; React renders the list and its rows in the same pass.
   */
  async read(): Promise<LineItem[]> {
    await expect(this.list).toBeVisible();
    const rows = await this.rows.all();
    return Promise.all(
      rows.map(async (row) => ({
        name: (await row.getByTestId('inventory-item-name').innerText()).trim(),
        price: parseCurrency(await row.getByTestId('inventory-item-price').innerText()),
        quantity: Number.parseInt((await row.getByTestId('item-quantity').innerText()).trim(), 10),
      })),
    );
  }

  async names(): Promise<string[]> {
    return (await this.read()).map((line) => line.name);
  }
}
