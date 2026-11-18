import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The persistent header shown on every signed-in page: cart link and badge,
 * plus the burger menu (logout, reset app state).
 *
 * Modelled as a component composed into each page rather than as methods on a
 * base class, so it can be reused anywhere the header appears without dragging
 * an inheritance chain along.
 */
export class Header {
  readonly cartLink: Locator;
  readonly cartBadge: Locator;
  readonly menuButton: Locator;
  readonly closeMenuButton: Locator;
  readonly allItemsLink: Locator;
  readonly logoutLink: Locator;
  readonly resetAppStateLink: Locator;

  constructor(private readonly page: Page) {
    this.cartLink = page.getByTestId('shopping-cart-link');
    this.cartBadge = page.getByTestId('shopping-cart-badge');
    this.menuButton = page.getByRole('button', { name: 'Open Menu' });
    this.closeMenuButton = page.getByRole('button', { name: 'Close Menu' });
    this.allItemsLink = page.getByTestId('inventory-sidebar-link');
    this.logoutLink = page.getByTestId('logout-sidebar-link');
    this.resetAppStateLink = page.getByTestId('reset-sidebar-link');
  }

  /**
   * Point-in-time read of the badge. The badge element is *absent* (not "0")
   * when the cart is empty, so a plain textContent read would throw instead of
   * returning zero.
   */
  async cartCount(): Promise<number> {
    if ((await this.cartBadge.count()) === 0) return 0;
    return Number.parseInt((await this.cartBadge.innerText()).trim(), 10);
  }

  /**
   * Retrying assertion on the badge. Prefer this over comparing cartCount()
   * straight after an action: it waits for the re-render instead of racing it.
   */
  async expectCartCount(expected: number): Promise<void> {
    if (expected === 0) {
      await expect(this.cartBadge).toHaveCount(0);
    } else {
      await expect(this.cartBadge).toHaveText(String(expected));
    }
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
    await expect(this.page).toHaveURL(/\/cart\.html$/);
  }

  async openMenu(): Promise<void> {
    await this.menuButton.click();
    await expect(this.logoutLink).toBeVisible();
  }

  async closeMenu(): Promise<void> {
    await this.closeMenuButton.click();
    await expect(this.logoutLink).toBeHidden();
  }

  async logout(): Promise<void> {
    await this.openMenu();
    await this.logoutLink.click();
    await expect(this.page).toHaveURL((url) => url.pathname === '/');
  }

  async resetAppState(): Promise<void> {
    await this.openMenu();
    await this.resetAppStateLink.click();
    await this.closeMenu();
  }
}
