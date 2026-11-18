import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import type { BookingFilter, BookingPayload, BookingResponse } from '../data/bookings';

export const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const;

export interface Credentials {
  username: string;
  password: string;
}

/** How a write request proves who it is: the service accepts either form. */
export type Auth = { token: string } | { basic: Credentials };

/**
 * Typed client for restful-booker.
 *
 * Methods return the raw APIResponse so specs can assert on status codes —
 * including the wrong ones the service sometimes returns. The `...Ok` variants
 * assert success and return the parsed body for the common happy-path setup.
 *
 * Every booking the client creates is remembered, so the fixture can delete it
 * after the test; a suite pointed at a shared public instance should not leave
 * its data behind.
 */
export class BookingClient {
  private readonly createdIds = new Set<number>();

  constructor(private readonly request: APIRequestContext) {}

  ping(): Promise<APIResponse> {
    return this.request.get('/ping');
  }

  authenticate(body: Partial<Credentials>): Promise<APIResponse> {
    return this.request.post('/auth', { data: body });
  }

  async token(credentials: Credentials): Promise<string> {
    const response = await this.authenticate(credentials);
    expect(response.status(), 'POST /auth status').toBe(200);
    const body = (await response.json()) as { token?: string; reason?: string };
    if (!body.token) {
      throw new Error(`POST /auth returned no token: ${JSON.stringify(body)}`);
    }
    return body.token;
  }

  /** Accepts any object so specs can send deliberately invalid payloads. */
  async create(payload: BookingPayload | Record<string, unknown>): Promise<APIResponse> {
    const response = await this.request.post('/booking', { data: payload });
    await this.remember(response);
    return response;
  }

  /** Sends a body verbatim, for malformed-JSON cases. */
  async createRaw(body: string): Promise<APIResponse> {
    const response = await this.request.post('/booking', { data: body });
    await this.remember(response);
    return response;
  }

  async createOk(payload: BookingPayload): Promise<BookingResponse> {
    const response = await this.create(payload);
    expect(response.status(), 'POST /booking status').toBe(200);
    return (await response.json()) as BookingResponse;
  }

  get(id: number | string): Promise<APIResponse> {
    return this.request.get(`/booking/${id}`);
  }

  async getOk(id: number): Promise<BookingPayload> {
    const response = await this.get(id);
    expect(response.status(), `GET /booking/${id} status`).toBe(200);
    return (await response.json()) as BookingPayload;
  }

  list(filter: BookingFilter = {}): Promise<APIResponse> {
    const params = Object.fromEntries(
      Object.entries(filter).filter((entry): entry is [string, string] => entry[1] !== undefined),
    );
    return this.request.get('/booking', { params });
  }

  update(id: number, payload: BookingPayload, auth?: Auth): Promise<APIResponse> {
    return this.request.put(`/booking/${id}`, { data: payload, headers: authHeaders(auth) });
  }

  partialUpdate(id: number, changes: Partial<BookingPayload>, auth?: Auth): Promise<APIResponse> {
    return this.request.patch(`/booking/${id}`, { data: changes, headers: authHeaders(auth) });
  }

  remove(id: number, auth?: Auth): Promise<APIResponse> {
    return this.request.delete(`/booking/${id}`, { headers: authHeaders(auth) });
  }

  /** Deletes everything this client created. Best effort: never fails a test. */
  async cleanup(auth: Auth): Promise<void> {
    const ids = [...this.createdIds];
    this.createdIds.clear();
    await Promise.allSettled(ids.map((id) => this.remove(id, auth)));
  }

  private async remember(response: APIResponse): Promise<void> {
    if (!response.ok()) return;
    try {
      const body = (await response.json()) as Partial<BookingResponse>;
      if (typeof body.bookingid === 'number') this.createdIds.add(body.bookingid);
    } catch {
      // Not JSON; nothing was created that we can identify.
    }
  }
}

function authHeaders(auth: Auth | undefined): Record<string, string> {
  if (!auth) return {};
  if ('token' in auth) return { Cookie: `token=${auth.token}` };
  const encoded = Buffer.from(`${auth.basic.username}:${auth.basic.password}`).toString('base64');
  return { Authorization: `Basic ${encoded}` };
}
