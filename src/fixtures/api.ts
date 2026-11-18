import { test as base, expect } from '@playwright/test';
import { BookingClient, JSON_HEADERS, type Credentials } from '../api/BookingClient';
import { env } from '../config/env';

export const ADMIN: Credentials = {
  username: env.bookerUser,
  password: env.bookerPassword,
};

interface ApiFixtures {
  /** A booking client bound to this test's request context; cleans up after itself. */
  bookings: BookingClient;
}

interface ApiWorkerFixtures {
  /** An admin token fetched once per worker rather than once per test. */
  adminToken: string;
}

export const test = base.extend<ApiFixtures, ApiWorkerFixtures>({
  adminToken: [
    async ({ playwright }, use) => {
      const context = await playwright.request.newContext({
        baseURL: env.apiBaseUrl,
        extraHTTPHeaders: JSON_HEADERS,
      });
      try {
        await use(await new BookingClient(context).token(ADMIN));
      } finally {
        await context.dispose();
      }
    },
    { scope: 'worker' },
  ],

  bookings: async ({ request, adminToken }, use) => {
    const client = new BookingClient(request);
    await use(client);
    // Teardown: delete whatever the test created on the shared public instance.
    await client.cleanup({ token: adminToken });
  },
});

export { expect };
