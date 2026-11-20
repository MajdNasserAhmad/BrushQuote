import { expect, test } from 'vitest';
import { authInputSchema, authMode } from '../../src/features/auth/schema';
test('new passwords require at least 12 characters', () => {
  expect(authInputSchema('register').safeParse({ email: 'test@example.invalid', password: 'short' }).success).toBe(false);
  expect(authInputSchema('reset-password').safeParse({ email: '', password: 'long test passphrase' }).success).toBe(true);
});
test('login permits existing shorter passwords without weakening registration', () => {
  expect(authInputSchema('login').safeParse({ email: 'test@example.invalid', password: 'legacy' }).success).toBe(true);
});
test('email validation and input limits apply at the action boundary', () => {
  expect(authInputSchema('forgot-password').safeParse({ email: 'invalid', password: '' }).success).toBe(false);
  expect(authInputSchema('login').safeParse({ email: 'test@example.invalid', password: 'x'.repeat(129) }).success).toBe(false);
  expect(authMode.safeParse('delete-user').success).toBe(false);
});
