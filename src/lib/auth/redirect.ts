/**
 * Explicit auth destinations prevent untrusted return URLs from becoming open
 * redirects. Recovery always goes to password reset after token verification.
 * This helper does not verify tokens or grant access to the destination.
 */
export function authDestination(
  requested: string | null | undefined,
  flow: 'sign-in' | 'recovery' = 'sign-in',
): '/dashboard' | '/onboarding' | '/reset-password' {
  if (flow === 'recovery') return '/reset-password';
  if (requested === '/onboarding') return '/onboarding';
  return '/dashboard';
}
