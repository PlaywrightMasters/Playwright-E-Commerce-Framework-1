import { ADMIN, expect, test } from '../../src/fixtures/api';
import { BOOKING_SHAPE, buildBooking } from '../../src/data/bookings';

/**
 * CRUD lifecycle. Every write is verified by reading it back, rather than by
 * trusting the write's own response: a service that echoes the request body
 * but stores something else would pass a test that only checks the echo.
 */
test.describe('Booking API - lifecycle', () => {
  test('a created booking is stored exactly as sent', { tag: '@smoke' }, async ({ bookings }) => {
    const payload = buildBooking();

    const created = await bookings.createOk(payload);
    expect(created.bookingid).toBeGreaterThan(0);
    expect(created.booking).toEqual(payload);

    const stored = await bookings.getOk(created.bookingid);
    expect(stored).toEqual(payload);
    expect(stored).toMatchObject(BOOKING_SHAPE);
  });

  test('a full update (PUT) is persisted', async ({ bookings, adminToken }) => {
    const { bookingid } = await bookings.createOk(buildBooking());
    const replacement = buildBooking({ firstname: 'Updated', totalprice: 275, depositpaid: false });

    const response = await bookings.update(bookingid, replacement, { token: adminToken });
    expect(response.status()).toBe(200);

    expect(await bookings.getOk(bookingid)).toEqual(replacement);
  });

  test('a partial update (PATCH) changes only the supplied field', async ({ bookings, adminToken }) => {
    const original = buildBooking();
    const { bookingid } = await bookings.createOk(original);

    const response = await bookings.partialUpdate(bookingid, { firstname: 'Patched' }, { token: adminToken });
    expect(response.status()).toBe(200);

    // Read back rather than trusting the PATCH response body.
    expect(await bookings.getOk(bookingid)).toEqual({ ...original, firstname: 'Patched' });
  });

  test('basic auth is accepted as an alternative to a token', async ({ bookings }) => {
    const { bookingid } = await bookings.createOk(buildBooking());

    const response = await bookings.partialUpdate(bookingid, { totalprice: 42 }, { basic: ADMIN });
    expect(response.status()).toBe(200);
    expect((await bookings.getOk(bookingid)).totalprice).toBe(42);
  });

  test('a deleted booking is no longer retrievable', async ({ bookings, adminToken }) => {
    const { bookingid } = await bookings.createOk(buildBooking());

    const deletion = await bookings.remove(bookingid, { token: adminToken });
    // The service answers a successful DELETE with "201 Created" — odd, but documented.
    expect(deletion.status()).toBe(201);

    const read = await bookings.get(bookingid);
    expect(read.status(), 'deleted booking should be gone').toBe(404);
  });

  test('the list can be filtered by guest name', async ({ bookings }) => {
    const payload = buildBooking();
    const { bookingid } = await bookings.createOk(payload);

    const response = await bookings.list({ firstname: payload.firstname, lastname: payload.lastname });
    expect(response.status()).toBe(200);

    // The surname is unique per test, so the match must be exactly this booking.
    expect(await response.json()).toEqual([{ bookingid }]);
  });

  test('the unfiltered list is an array of booking ids', async ({ bookings }) => {
    await bookings.createOk(buildBooking());

    const response = await bookings.list();
    expect(response.status()).toBe(200);

    const body = (await response.json()) as unknown[];
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toEqual({ bookingid: expect.any(Number) });
  });

  test('the health check reports the service is up', { tag: '@smoke' }, async ({ bookings }) => {
    const response = await bookings.ping();
    expect(response.status()).toBe(201);
  });
});
