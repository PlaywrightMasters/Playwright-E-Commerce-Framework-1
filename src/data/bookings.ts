import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';

/** Payload shapes for the restful-booker API under test. */
export type BookingDates = {
  checkin: string;
  checkout: string;
};

/*
 * Declared as type aliases rather than interfaces: a type alias is assignable to
 * Record<string, unknown>, which is what expect().toMatchObject() accepts.
 */
export type BookingPayload = {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: BookingDates;
  additionalneeds?: string;
};

export type BookingResponse = {
  bookingid: number;
  booking: BookingPayload;
};

export type BookingFilter = Partial<{
  firstname: string;
  lastname: string;
  checkin: string;
  checkout: string;
}>;

/**
 * Builds a valid booking with a unique surname, so tests running in parallel
 * against the shared public instance never find each other's data.
 */
export function buildBooking(overrides: Partial<BookingPayload> = {}): BookingPayload {
  return {
    firstname: 'Alexa',
    lastname: `Qa-${randomUUID().slice(0, 8)}`,
    totalprice: 150,
    depositpaid: true,
    bookingdates: { checkin: '2027-03-01', checkout: '2027-03-05' },
    additionalneeds: 'Breakfast',
    ...overrides,
  };
}

/** Structural contract for a booking as the service returns it. */
export const BOOKING_SHAPE = {
  firstname: expect.any(String),
  lastname: expect.any(String),
  totalprice: expect.any(Number),
  depositpaid: expect.any(Boolean),
  bookingdates: {
    checkin: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    checkout: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
  },
};

/** Integer boundary values for totalprice that must round-trip exactly. */
export const PRICE_BOUNDARIES = [
  { title: 'zero', totalprice: 0 },
  { title: 'single unit', totalprice: 1 },
  { title: 'large value', totalprice: 999_999 },
] as const;
