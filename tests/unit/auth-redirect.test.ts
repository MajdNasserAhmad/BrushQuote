import { expect, test } from 'vitest';
import { authDestination } from '../../src/lib/auth/redirect';

test('retains supported sign-in destinations', () => {
  expect(authDestination('/onboarding')).toBe('/onboarding');
  expect(authDestination('/dashboard')).toBe('/dashboard');
});

test('missing destinations fall back to the protected dashboard', () => {
  expect(authDestination(undefined)).toBe('/dashboard');
  expect(authDestination(null)).toBe('/dashboard');
});

for (const destination of [
  'https://attacker.invalid', '//attacker.invalid', '/\\attacker.invalid',
  '%2f%2fattacker.invalid', '/onboarding?next=https://attacker.invalid',
  '/onboarding/../auth/confirm', 'javascript:alert(1)', '/reset-password',
]) {
  test(`rejects unapproved return path ${destination}`, () => {
    expect(authDestination(destination)).toBe('/dashboard');
  });
}

test('verified recovery flow cannot be diverted by a return parameter', () => {
  expect(authDestination('/dashboard', 'recovery')).toBe('/reset-password');
  expect(authDestination('https://attacker.invalid', 'recovery')).toBe('/reset-password');
});

