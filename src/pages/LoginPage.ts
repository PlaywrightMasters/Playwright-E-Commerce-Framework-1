import { expect, type Locator, type Page } from '@playwright/test';
import type { TestUser } from '../data/users';
import { fillVerified } from '../utils/forms';
import { openPath } from '../utils/navigation';

export class LoginPage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly dismissErrorButton: Locator;

  constructor(readonly page: Page) {
    this.usernameInput = page.getByTestId('username');
    this.passwordInput = page.getByTestId('password');
    this.loginButton = page.getByTestId('login-button');
    this.errorMessage = page.getByTestId('error');
    this.dismissErrorButton = page.getByTestId('error-button');
  }

  async goto(): Promise<void> {
    await openPath(this.page, '/');
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.loginButton).toBeVisible();
  }

  async login(username: string, password: string): Promise<void> {
    await fillVerified([
      [this.usernameInput, username],
      [this.passwordInput, password],
    ]);
    await this.loginButton.click();
  }

  async loginAs(user: TestUser): Promise<void> {
    await this.login(user.username, user.password);
  }

  async expectError(expected: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(expected);
    // A refused sign-in must not leak the visitor into the application.
    await expect(this.page).not.toHaveURL(/inventory\.html/);
  }

  async dismissError(): Promise<void> {
    await this.dismissErrorButton.click();
    await expect(this.errorMessage).toHaveCount(0);
  }
}
