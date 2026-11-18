import { env } from '../config/env';

export interface TestUser {
  username: string;
  password: string;
  description: string;
}

/** Accounts published on the SauceDemo login page, each with a known personality. */
export const USERS = {
  standard: {
    username: 'standard_user',
    password: env.saucePassword,
    description: 'baseline account with no injected defects',
  },
  lockedOut: {
    username: 'locked_out_user',
    password: env.saucePassword,
    description: 'account disabled server-side',
  },
  problem: {
    username: 'problem_user',
    password: env.saucePassword,
    description: 'account with deliberately injected UI defects',
  },
  performanceGlitch: {
    username: 'performance_glitch_user',
    password: env.saucePassword,
    description: 'account with artificially delayed responses',
  },
} as const satisfies Record<string, TestUser>;

export interface InvalidLoginCase {
  title: string;
  username: string;
  password: string;
  expectedError: RegExp;
}

const NO_MATCH = /Username and password do not match any user in this service/;

/** Negative login cases: wrong credentials and empty-field validation. */
export const INVALID_LOGINS: readonly InvalidLoginCase[] = [
  { title: 'unknown username', username: 'no_such_user', password: env.saucePassword, expectedError: NO_MATCH },
  { title: 'valid username with wrong password', username: USERS.standard.username, password: 'wrong_password', expectedError: NO_MATCH },
  { title: 'username with different letter case', username: 'STANDARD_USER', password: env.saucePassword, expectedError: NO_MATCH },
  { title: 'username padded with whitespace is not trimmed', username: `  ${USERS.standard.username}  `, password: env.saucePassword, expectedError: NO_MATCH },
  { title: 'empty username', username: '', password: env.saucePassword, expectedError: /Username is required/ },
  { title: 'empty password', username: USERS.standard.username, password: '', expectedError: /Password is required/ },
  { title: 'both fields empty', username: '', password: '', expectedError: /Username is required/ },
];

export interface ProtectedRoute {
  url: string;
  /** The path SauceDemo quotes in its "you can only access ..." message. */
  reportedPath: string;
}

/** Every page that must refuse a visitor without a session. */
export const PROTECTED_ROUTES: readonly ProtectedRoute[] = [
  { url: '/inventory.html', reportedPath: '/inventory.html' },
  { url: '/inventory-item.html?id=4', reportedPath: '/inventory-item.html' },
  { url: '/cart.html', reportedPath: '/cart.html' },
  { url: '/checkout-step-one.html', reportedPath: '/checkout-step-one.html' },
  { url: '/checkout-step-two.html', reportedPath: '/checkout-step-two.html' },
  { url: '/checkout-complete.html', reportedPath: '/checkout-complete.html' },
];
