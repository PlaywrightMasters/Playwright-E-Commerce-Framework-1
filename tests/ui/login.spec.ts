import { expect, test } from '../../src/fixtures/ui';
import { ALL_PRODUCTS } from '../../src/data/products';
import { INVALID_LOGINS, PROTECTED_ROUTES, USERS } from '../../src/data/users';
import { openPath } from '../../src/utils/navigation';

test.describe('Authentication', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('valid credentials sign the user in to the catalogue', { tag: '@smoke' }, async ({ loginPage, inventoryPage }) => {
    await loginPage.loginAs(USERS.standard);
    await inventoryPage.expectLoaded();
    await expect(inventoryPage.items).toHaveCount(ALL_PRODUCTS.length);
  });

  test('a disabled account is refused with an explanation', async ({ loginPage }) => {
    await loginPage.loginAs(USERS.lockedOut);
    await loginPage.expectError('Sorry, this user has been locked out.');
  });

  /* One generated test per row: a failure names the exact input that broke. */
  for (const scenario of INVALID_LOGINS) {
    test(`sign-in is refused: ${scenario.title}`, async ({ loginPage }) => {
      await loginPage.login(scenario.username, scenario.password);
      await loginPage.expectError(scenario.expectedError);
    });
  }

  test('an error can be dismissed and the form retried', async ({ loginPage, inventoryPage }) => {
    await loginPage.login('', '');
    await loginPage.expectError(/Username is required/);
    await loginPage.dismissError();

    await loginPage.loginAs(USERS.standard);
    await inventoryPage.expectLoaded();
  });

  test('the password field masks its input', async ({ loginPage }) => {
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });
});

test.describe('Session enforcement', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route.url} cannot be reached without a session`, async ({ page, loginPage }) => {
      await openPath(page, route.url);

      await loginPage.expectLoaded();
      await expect(loginPage.errorMessage).toContainText(
        `You can only access '${route.reportedPath}' when you are logged in.`,
      );
    });
  }

  test('signing out ends the session and Back does not restore it', async ({ loggedIn, page, loginPage }) => {
    await loggedIn.header.logout();
    await loginPage.expectLoaded();

    // Ending a session must not be undoable with the browser's Back button.
    await page.goBack();
    await expect(loginPage.errorMessage).toContainText(/You can only access .* when you are logged in/);
    await expect(page).not.toHaveURL(/inventory\.html/);
  });
});
