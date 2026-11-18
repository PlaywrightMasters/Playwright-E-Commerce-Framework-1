import { ADMIN, expect, test } from '../../src/fixtures/api';
import { buildBooking } from '../../src/data/bookings';
import type { Auth, BookingClient } from '../../src/api/BookingClient';

/**
 * Authorisation as its own concern. An endpoint that works when authenticated
 * says nothing about whether it is protected, so every write operation is tried
 * with no credentials and with forged ones — and each refusal is followed by a
 * read-back proving the refused write left nothing behind.
 */
type WriteOperation = {
  name: string;
  run: (client: BookingClient, id: number, auth?: Auth) => ReturnType<BookingClient['remove']>;
};

const WRITE_OPERATIONS: readonly WriteOperation[] = [
  { name: 'PUT', run: (client, id, auth) => client.update(id, buildBooking({ firstname: 'Intruder' }), auth) },
  { name: 'PATCH', run: (client, id, auth) => client.partialUpdate(id, { firstname: 'Intruder' }, auth) },
  { name: 'DELETE', run: (client, id, auth) => client.remove(id, auth) },
];

const BAD_CREDENTIALS: readonly { name: string; auth: Auth | undefined }[] = [
  { name: 'no credentials', auth: undefined },
  { name: 'a forged token', auth: { token: 'not-a-real-token' } },
  { name: 'basic auth with a wrong password', auth: { basic: { username: ADMIN.username, password: 'wrong' } } },
];

test.describe('Booking API - authorisation', () => {
  for (const operation of WRITE_OPERATIONS) {
    for (const credentials of BAD_CREDENTIALS) {
      test(`${operation.name} with ${credentials.name} is refused and changes nothing`, async ({ bookings }) => {
        const original = buildBooking();
        const { bookingid } = await bookings.createOk(original);

        const response = await operation.run(bookings, bookingid, credentials.auth);
        expect(response.status(), `${operation.name} must be forbidden`).toBe(403);

        // The refusal must be total: no partial write slips through.
        expect(await bookings.getOk(bookingid)).toEqual(original);
      });
    }
  }

  test('a token is issued for valid credentials', { tag: '@smoke' }, async ({ bookings }) => {
    const token = await bookings.token(ADMIN);
    expect(token).toMatch(/^\w{8,}$/);
  });

  test('wrong credentials do not yield a token - documented quirk: status 200', { tag: '@known-defect' }, async ({ bookings }) => {
    const response = await bookings.authenticate({ username: ADMIN.username, password: 'wrong-password' });

    /* A refused login should be 401. The service answers 200 with a "reason"
       instead, so a client that only checks the status would believe it had
       signed in. Pinned as current behaviour: if it is fixed, this fails and
       the expectation is updated on purpose. */
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ reason: 'Bad credentials' });
  });

  test('an empty auth request does not yield a token', async ({ bookings }) => {
    const response = await bookings.authenticate({});
    const body = (await response.json()) as { token?: string };
    expect(body.token).toBeUndefined();
  });
});
