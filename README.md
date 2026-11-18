# Playwright E-commerce Test Framework

A TypeScript test framework built on [Playwright](https://playwright.dev) that tests three layers:

| Layer | Target | Project(s) |
| --- | --- | --- |
| **Unit** | The suite's own maths and test data (no browser, no network) | `unit` |
| **API** | [restful-booker](https://restful-booker.herokuapp.com) REST API | `api` |
| **UI** | [SauceDemo](https://www.saucedemo.com) storefront | `chromium`, `firefox`, `webkit` |

**153 tests**: 46 unit, 35 API and 72 UI, with the UI tests running on all three browser engines (297 executions in total).

The goal is coverage that finds real defects, not a high test count. That means boundary values, reversed
actions, authorisation gaps, and checkout arithmetic reconciled against an independent oracle.
It found **13 genuine defects** in the two targets, and verifies **3 more** that SauceDemo deliberately injects into
`problem_user`. Each one is pinned by an `@known-defect` test (see below).

---

## Quick start

```bash
npm ci
npx playwright install --with-deps   # or: npm run browsers

npm test                 # everything: unit + api + 3 browser engines
npm run test:unit        # pure-function tests, runs in ~1s
npm run test:api         # API only, no browser launched
npm run test:ui          # UI on chromium, firefox and webkit
npm run test:chromium    # UI on chromium only (fastest UI feedback)
npm run test:smoke       # @smoke: the critical path on api + chromium
npm run test:defects     # @known-defect: list/verify every documented defect
npm run test:calc        # checkout-calculation suite
npm run test:headed      # watch it run
npm run report           # open the last HTML report
npm run typecheck        # tsc --noEmit (strict), independent of the tests
```

All configuration has working defaults. To point the suite somewhere else, see [`.env.example`](.env.example).

---

## Structure

```
src/
  config/      env.ts: the single source of URLs and credentials
  api/         BookingClient: typed REST client that cleans up after itself
  components/  Header, LineItems: UI parts shared by several pages
  pages/       One page object per screen; behaviour, not selectors
  flows/       CheckoutFlow: multi-page journeys used as preconditions
  fixtures/    ui.ts / api.ts: injected page objects, login, auth token
  data/        Catalogue, pricing rules, scenario tables, builders
  utils/       currency maths, form filling, navigation, test-id slugs
tests/
  unit/        Tests for the framework's own logic
  api/         HTTP tests using Playwright's request context
  ui/          Browser tests
.github/workflows/e2e.yml   CI pipeline
```

### Design decisions

**Page objects expose intent.** Methods like `addToCart(name)`, `summary()` and `proceedToCheckout()` hide the
selectors, so specs never contain a locator and a markup change is a one-file fix. Selectors use
`getByTestId()` against SauceDemo's stable `data-test` attributes (configured with `testIdAttribute`).

**Composition over inheritance.** The header (cart badge, burger menu) is a `Header` component held by every
page, and the order-line list is a `LineItems` component shared by the cart and the checkout overview.
`BasePage` only holds what every page has: a header, a title and a load check.

**Flows for preconditions.** `CheckoutFlow.reviewOrder(products)` drives add → cart → checkout → form →
overview. Calculation tests then contain only the part being tested: the assertions.

**Login is a precondition, not the subject.** The `loggedIn` fixture sets SauceDemo's session cookie directly
instead of filling the form for every test. The form itself is still tested through the real UI in
`login.spec.ts` and in the `purchase-flow` smoke test.

**Isolation without teardown.** Every test gets a fresh browser context, and the storefront keeps the cart in
that context's `localStorage` (verified, not assumed), so no test can see another's cart.

**API tests clean up.** `BookingClient` records every booking it creates, and the `bookings` fixture deletes
them after each test, so the suite doesn't leave data on a shared public instance. The admin token is a
**worker-scoped** fixture, fetched once per worker rather than once per test.

**Data-driven, one test per row.** Scenario tables in `src/data/` generate one named test per row, so a
failure names the exact input that broke instead of a loop iteration.

**The suite tests itself.** `tests/unit` checks the currency maths and the consistency of the data tables
without a browser. If an oracle is wrong, the problem shows up there, not as a confusing storefront failure.

---

## What the tests cover

### Checkout calculations: `tests/ui/checkout-calculations.spec.ts`

A storefront's costly defects are rarely "the button does nothing". More often the subtotal is right and the
tax is right, but the total isn't their sum. That isn't visible on screen. You only catch it by reconciling
the displayed figures against an independently calculated expectation. Each scenario asserts four things
separately, so a failure names *which* figure is wrong:

1. Subtotal = sum of catalogue prices (hand-calculated oracle)
2. Tax = subtotal × 8%, rounded to cents
3. Total = subtotal + tax
4. The three *displayed* figures reconcile with each other, independently of 1–3

Scenarios are chosen for rounding behaviour. Each lands the tax on a different fraction of a cent:

| Basket | Subtotal | Raw tax | Displayed |
| --- | ---: | ---: | ---: |
| Onesie | 7.99 | 0.6392 | 0.64 (down) |
| Bike Light | 9.99 | 0.7992 | 0.80 (up across a tenth) |
| Fleece Jacket | 49.99 | 3.9992 | 4.00 (up to a whole dollar) |
| Two $15.99 shirts | 31.98 | 2.5584 | 2.56 |
| Three mixed lines | 47.97 | 3.8376 | 3.84 |
| Two most expensive | 79.98 | 6.3984 | 6.40 |
| Full catalogue | 129.94 | 10.3952 | 10.40 |

Also covered:
- The subtotal reconciled against the line prices the overview itself shows.
- The overview lists exactly what was in the cart.
- An add-then-remove leaves no residue in the total.

**About the rounding helper.** `roundCurrency()` rescales through `toPrecision(12)` before rounding. It avoids
two common traps: `toFixed()`, which turns `1.005` into `"1.00"`, and the popular
`Math.round((v + Number.EPSILON) * 100)` idiom. `EPSILON` only helps near 1.0, so that idiom turns `10.075` into
`10.07`. Both cases are pinned in `tests/unit/currency.spec.ts`.

### Authentication and sessions: `tests/ui/login.spec.ts`
- Valid sign-in, plus a server-side locked account.
- Seven data-driven rejections: unknown user, wrong password, case-changed username, untrimmed whitespace, and empty fields.
- Dismissing the error and retrying, and a masked password field.
- Every protected route (6) refuses a visitor without a session.
- After sign-out, the browser's Back button doesn't restore the session.

### Catalogue and sorting: `tests/ui/inventory.spec.ts`
- **Parity check:** the live catalogue must match the data table that every other spec relies on, so a price change is reported once, plainly.
- All four sort orders, plus a stable order for equal prices.
- Re-sorting never drops or duplicates products.
- Sorting preserves cart state, where two individually correct features meet.

### Product details: `tests/ui/product-details.spec.ts`
- Every product's details page agrees with the catalogue.
- Adding on one page is reflected on the other, in both directions.

### Cart: `tests/ui/cart.spec.ts`
- Badge absence versus "0".
- Add/remove round trips and line contents at catalogue prices.
- Persistence across navigation and a full reload.
- Removing from the cart page, holding the full catalogue at once, and Reset App State.

### Checkout form and navigation: `tests/ui/checkout-validation.spec.ts`
- Required-field rules and recovering from an error.
- Over-length and non-Latin input.
- Cancel from either checkout step lands on the right page with the cart intact.

### End-to-end: `tests/ui/purchase-flow.spec.ts` (`@smoke`)
One full purchase driven entirely through the UI (real login form, totals verified, order completed, cart
emptied), structured with `test.step` so the report reads as a narrative.

### API: `tests/api/*.spec.ts`
- **Lifecycle:** create / read / PUT / PATCH / DELETE, every write verified by **reading it back** rather than trusting the write's own response. Also covers filtering the list by guest name, basic auth as an alternative to a token, and a response-shape contract.
- **Authorisation:** every write verb (PUT, PATCH, DELETE) × three bad credentials (none, forged token, wrong basic-auth password) must be refused with 403, **and** a read-back must prove that nothing changed. An endpoint that works when authenticated tells you nothing about whether it is protected.
- **Validation:** price boundaries, not-found handling, and malformed JSON.

---

## Documented defects (`@known-defect`)

Tests tagged `@known-defect` assert what the application **does today** where that differs from what it
**should** do, with a comment explaining the correct behaviour. They pass while the defect exists and fail
if it's fixed, so the expectation gets updated on purpose. A known defect that no test covers can regress
without anyone noticing. Run `npm run test:defects`.

**restful-booker API (9)**

| Behaviour | Should be |
| --- | --- |
| Wrong credentials → `200 {"reason":"Bad credentials"}` | 401 |
| Missing required fields → `500` | 400 with field errors |
| DELETE of a non-existent booking → `405` | 404 |
| `totalprice: 99.99` silently stored as `99` | stored exactly, or rejected |
| Negative `totalprice` accepted | rejected |
| Checkout date before checkin accepted | rejected |
| Unparseable date stored as `"0NaN-aN-aN"` | rejected |
| `totalprice: "abc"` accepted, stored as `null` | rejected |
| PUT omitting `additionalneeds` keeps the old value | PUT replaces the resource |

(Also noted, but not counted as a defect: a successful DELETE returns `201 Created`.)

**SauceDemo storefront (7)**

| Behaviour | Should be |
| --- | --- |
| Checkout can start with an empty cart | blocked |
| Whitespace-only name/postcode passes validation | rejected |
| `inventory-item.html?id=999` renders "ITEM NOT FOUND" at `$√-1` with a working Add to cart | not-found page |
| After Reset App State, buttons still say "Remove" until reload | buttons reset |
| `problem_user`: every product image is the same broken image | distinct images |
| `problem_user`: sorting by price does nothing | sorted |
| `problem_user`: some products can't be added to the cart | all addable |

The `problem_user` tests run the standard account's checks against an account with deliberately injected
defects. They show the assertions actually catch defects, not just that the happy path passes.

---

## Reliability notes

Problems found while stabilising the suite across three engines, and how each was fixed:

- **Stale DOM after client-side navigation (WebKit).** Right after opening the cart, the outgoing catalogue's
  `inventory-item` rows could still be in the DOM, so a two-line cart read as six rows. **Fix:** `LineItems`
  is scoped to the `cart-list` container and waits for it before taking a snapshot.
- **Typed values silently dropped (WebKit, Firefox).** SauceDemo's React-controlled inputs can be reset by a
  re-render straight after mounting, so a field filled at test speed came back empty. **Fix:**
  `fillVerified()` checks every value before submitting and refills if one was lost.
- **Slow `load` event.** Navigation waits for `domcontentloaded`, not `load`. `load` also waits for large
  product images and a third-party error-reporting SDK (Backtrace), none of which is under test. Page objects
  wait for the specific elements they need instead.

- **Firefox main-thread stalls (environment, partly open).** In Playwright's Firefox build on Windows,
  SauceDemo's bundled Backtrace SDK (from its `load`/`unload` breadcrumb listeners) was caught by Firefox's
  slow-script watchdog. While the main thread is blocked, Playwright can't even resolve a locator, so the
  result is a timeout on an element that is clearly on the page. Measured on the 8 GB development machine with
  4 Firefox workers: **140/144** passed in one run and **134/144** in another. Every failure was a timeout or a
  Firefox context-teardown protocol error, and none was an assertion mismatch. Chromium and WebKit don't
  reproduce it. **Mitigation:** the Firefox project is capped at 2 workers, and CI retries twice. The capped
  configuration has **not** been measured yet: the verification run was stopped because the machine ran low
  on memory, which is itself a likely contributor. A stubbed telemetry endpoint was tried and **rejected**.
  Request routing disables the HTTP cache, and failures rose to 14/144.

---

## CI

`.github/workflows/e2e.yml` runs on push, pull request, a nightly schedule and manual dispatch:

- **Static gate:** `npm run typecheck` and the unit project. No browser download, and it runs first.
- **API job:** runs on its own and never downloads a browser.
- **UI matrix:** one job per engine with `fail-fast: false`, so one browser failing doesn't hide the others.
- HTML reports upload on every run; traces upload only on failure.
- Retries are 2 on CI and **0 locally**, so a flaky test is visible while you work rather than hidden.
- The nightly run catches breakage caused by the third-party sites changing, which is a different problem
  from a breaking commit and needs a different fix.

---

## Notes

- Both targets are free public demo services, and restful-booker in particular can be slow or briefly
  unavailable. A failure there may be environmental rather than a framework bug.
- All credentials are public demo credentials published by the sites themselves. They are read from
  environment variables with defaults, so nothing secret is committed.
- Stack: Playwright 1.65, TypeScript 7 (strict, `noUncheckedIndexedAccess`), Node ≥ 20 (CI uses 24).
- Inspired by the structure of
  [alexgeha/playwright-ecommerce-framework](https://github.com/alexgeha/playwright-ecommerce-framework), but
  written from scratch and extended with: unit tests, a typed API client with cleanup, component objects,
  flows, a credential × verb authorisation matrix, read-back verification, product details coverage, and 16
  `@known-defect` tests (13 genuine defects + 3 injected `problem_user` defects) verified against the live targets.
