import { expect, test } from '../../src/fixtures/api';
import { buildBooking, PRICE_BOUNDARIES } from '../../src/data/bookings';

/**
 * Input validation and error handling.
 *
 * Several tests here are tagged @known-defect: they pin down what the service
 * *does* today where that differs from what it *should* do. Each one says what
 * correct behaviour would be. If the service is fixed, the test fails and the
 * expectation is updated deliberately — a known defect without a test is one
 * that regresses silently. Run `npm run test:defects` to list them.
 */
test.describe('Booking API - boundaries', () => {
  for (const boundary of PRICE_BOUNDARIES) {
    test(`totalprice round-trips exactly: ${boundary.title} (${boundary.totalprice})`, async ({ bookings }) => {
      const { bookingid } = await bookings.createOk(buildBooking({ totalprice: boundary.totalprice }));
      expect((await bookings.getOk(bookingid)).totalprice).toBe(boundary.totalprice);
    });
  }

  test('optional additionalneeds may be omitted', async ({ bookings }) => {
    const { additionalneeds: _omitted, ...withoutNeeds } = buildBooking();
    const { bookingid } = await bookings.createOk(withoutNeeds);
    expect(await bookings.getOk(bookingid)).toEqual(withoutNeeds);
  });
});

test.describe('Booking API - not found', () => {
  test('a non-existent booking id returns 404', async ({ bookings }) => {
    expect((await bookings.get(99_999_999)).status()).toBe(404);
  });

  test('a non-numeric booking id returns 404', async ({ bookings }) => {
    expect((await bookings.get('not-a-number')).status()).toBe(404);
  });

  test('deleting a non-existent booking - documented quirk: 405 instead of 404', { tag: '@known-defect' }, async ({ bookings, adminToken }) => {
    const response = await bookings.remove(99_999_999, { token: adminToken });
    expect(response.status()).toBe(405);
  });
});

test.describe('Booking API - malformed requests', () => {
  test('malformed JSON is rejected with 400', async ({ bookings }) => {
    const response = await bookings.createRaw('{"firstname": ');
    expect(response.status()).toBe(400);
  });

  test('missing required fields - documented defect: 500 instead of 400', { tag: '@known-defect' }, async ({ bookings }) => {
    /* An incomplete payload is a client error and should get a 400 naming the
       missing fields. The service crashes with a 500 instead. */
    const response = await bookings.create({ firstname: 'Incomplete' });
    expect(response.status()).toBe(500);
  });
});

test.describe('Booking API - accepted invalid data (known defects)', { tag: '@known-defect' }, () => {
  test('a decimal totalprice is silently truncated', async ({ bookings }) => {
    /* Should be stored as 99.99 or rejected. It is stored as 99: silent data loss. */
    const { bookingid } = await bookings.createOk(buildBooking({ totalprice: 99.99 }));
    expect((await bookings.getOk(bookingid)).totalprice).toBe(99);
  });

  test('a negative totalprice is accepted', async ({ bookings }) => {
    const { bookingid } = await bookings.createOk(buildBooking({ totalprice: -1 }));
    expect((await bookings.getOk(bookingid)).totalprice).toBe(-1);
  });

  test('a checkout date before the checkin date is accepted', async ({ bookings }) => {
    const reversed = { checkin: '2027-03-05', checkout: '2027-03-01' };
    const { bookingid } = await bookings.createOk(buildBooking({ bookingdates: reversed }));
    expect((await bookings.getOk(bookingid)).bookingdates).toEqual(reversed);
  });

  test('an unparseable date is stored as a corrupt value', async ({ bookings }) => {
    const response = await bookings.create(
      buildBooking({ bookingdates: { checkin: 'not-a-date', checkout: '2027-03-05' } }),
    );
    expect(response.status()).toBe(200);
    const { booking } = (await response.json()) as { booking: { bookingdates: { checkin: string } } };
    expect(booking.bookingdates.checkin).toBe('0NaN-aN-aN');
  });

  test('a non-numeric totalprice is accepted and stored as null', async ({ bookings }) => {
    const response = await bookings.create({ ...buildBooking(), totalprice: 'abc' });
    expect(response.status()).toBe(200);
    const { booking } = (await response.json()) as { booking: { totalprice: unknown } };
    expect(booking.totalprice).toBeNull();
  });

  test('PUT without an optional field keeps the old value instead of replacing it', async ({ bookings, adminToken }) => {
    /* PUT is a full replacement: omitting additionalneeds should clear it.
       The service merges instead, keeping the previous value. */
    const { bookingid } = await bookings.createOk(buildBooking({ additionalneeds: 'Late checkout' }));
    const { additionalneeds: _omitted, ...replacement } = buildBooking({ firstname: 'Replaced' });

    const response = await bookings.update(bookingid, replacement, { token: adminToken });
    expect(response.status()).toBe(200);

    const stored = await bookings.getOk(bookingid);
    expect(stored.firstname).toBe('Replaced');
    expect(stored.additionalneeds).toBe('Late checkout');
  });
});
