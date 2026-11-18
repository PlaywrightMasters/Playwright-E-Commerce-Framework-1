/**
 * Single source of environment configuration.
 *
 * Both targets are public demo services whose credentials are published by the
 * sites themselves, so every value has a working default. Override any of them
 * through environment variables to point the suite somewhere else — nothing
 * real ever needs to be committed.
 */
function read(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

export const env = {
  uiBaseUrl: read('UI_BASE_URL', 'https://www.saucedemo.com'),
  apiBaseUrl: read('API_BASE_URL', 'https://restful-booker.herokuapp.com'),
  saucePassword: read('SAUCE_PASSWORD', 'secret_sauce'),
  bookerUser: read('BOOKER_USER', 'admin'),
  bookerPassword: read('BOOKER_PASS', 'password123'),
  isCI: Boolean(process.env.CI),
} as const;
