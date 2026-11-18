import { expect, test } from '../../src/fixtures/ui';
import { ALL_PRODUCTS, PRODUCTS } from '../../src/data/products';
import { SORT_OPTIONS, type SortOption } from '../../src/pages/InventoryPage';

const byName = (a: string, b: string) => a.localeCompare(b);
const byNumber = (a: number, b: number) => a - b;

test.describe('Catalogue', () => {
  test('lists exactly the expected products at the expected prices', { tag: '@smoke' }, async ({ loggedIn }) => {
    /* Parity check between the live catalogue and the data every other spec
       relies on. If the storefront changes a price, this is the one test that
       says so plainly, instead of a dozen calculation tests failing obscurely. */
    const displayed = await loggedIn.displayedCatalogue();
    const expected = ALL_PRODUCTS.map(({ name, price }) => ({ name, price }));

    expect(displayed).toHaveLength(expected.length);
    expect(displayed).toEqual(expect.arrayContaining(expected));
  });

  test('every product shows a distinct image', async ({ loggedIn }) => {
    const images = await loggedIn.displayedImageFiles();
    expect(new Set(images).size).toBe(ALL_PRODUCTS.length);
  });
});

test.describe('Catalogue sorting', () => {
  test('defaults to name, A to Z', async ({ loggedIn }) => {
    await expect(loggedIn.activeSortLabel).toHaveText(SORT_OPTIONS.az);
    const names = await loggedIn.displayedNames();
    expect(names).toEqual([...names].sort(byName));
  });

  const ORDERINGS: readonly { option: SortOption; check: 'names' | 'prices'; direction: 1 | -1 }[] = [
    { option: 'az', check: 'names', direction: 1 },
    { option: 'za', check: 'names', direction: -1 },
    { option: 'lohi', check: 'prices', direction: 1 },
    { option: 'hilo', check: 'prices', direction: -1 },
  ];

  for (const { option, check, direction } of ORDERINGS) {
    test(`sorting by "${SORT_OPTIONS[option]}" orders the ${check} correctly`, async ({ loggedIn }) => {
      await loggedIn.sortBy(option);

      if (check === 'names') {
        const names = await loggedIn.displayedNames();
        expect(names).toEqual([...names].sort((a, b) => direction * byName(a, b)));
      } else {
        const prices = await loggedIn.displayedPrices();
        expect(prices).toEqual([...prices].sort((a, b) => direction * byNumber(a, b)));
      }
    });
  }

  test('ties in price keep a stable, name-based order', async ({ loggedIn }) => {
    // Two products share $15.99; the order between them must not be random.
    await loggedIn.sortBy('lohi');
    const catalogue = await loggedIn.displayedCatalogue();
    const tied = catalogue.filter((entry) => entry.price === PRODUCTS.boltTShirt.price).map((e) => e.name);

    expect(tied).toHaveLength(2);
    await loggedIn.sortBy('az');
    await loggedIn.sortBy('lohi');
    const again = (await loggedIn.displayedCatalogue())
      .filter((entry) => entry.price === PRODUCTS.boltTShirt.price)
      .map((e) => e.name);
    expect(again).toEqual(tied);
  });

  test('re-sorting never drops or duplicates a product', async ({ loggedIn }) => {
    // Sorting is presentation; it must not mutate the underlying collection.
    const original = (await loggedIn.displayedNames()).sort(byName);

    for (const option of ['za', 'lohi', 'hilo', 'az'] as const) {
      await loggedIn.sortBy(option);
      const current = (await loggedIn.displayedNames()).sort(byName);
      expect(current, `catalogue after sorting by ${option}`).toEqual(original);
    }
  });

  test('sorting preserves what is already in the cart', async ({ loggedIn }) => {
    // Two individually correct features meeting: cart state must survive a re-render.
    await loggedIn.addToCart(PRODUCTS.backpack.name);
    await loggedIn.sortBy('hilo');

    await loggedIn.header.expectCartCount(1);
    await expect(loggedIn.removeButton(PRODUCTS.backpack.name)).toBeVisible();
  });
});
