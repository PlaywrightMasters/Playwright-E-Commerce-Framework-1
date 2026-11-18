import { expect, type Locator, type Page } from '@playwright/test';
import { Header } from '../components/Header';

/**
 * Shared shape of every signed-in storefront page.
 *
 * Page objects expose intent ("add this to the cart", "what does the order
 * summary say") rather than selectors, so specs never contain a locator and a
 * markup change is fixed in one file instead of across the suite.
 */
export abstract class BasePage {
  readonly header: Header;
  readonly title: Locator;

  /** Matches the URL of this page; used by expectLoaded(). */
  protected abstract readonly urlPattern: RegExp;
  /** The text shown in the secondary header title on this page. */
  protected abstract readonly titleText: string | null;

  protected constructor(readonly page: Page) {
    this.header = new Header(page);
    this.title = page.getByTestId('title');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(this.urlPattern);
    if (this.titleText !== null) {
      await expect(this.title).toHaveText(this.titleText);
    }
  }
}
