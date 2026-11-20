import { z } from 'zod';
export const authMode = z.enum(['login', 'register', 'forgot-password', 'reset-password']);
export type AuthMode = z.infer<typeof authMode>;
export function authInputSchema(mode: AuthMode) {
  return z.object({
    email: mode === 'reset-password' ? z.string().max(254) : z.email('Enter a valid email address.').max(254),
    password: mode === 'forgot-password' ? z.string().max(128) : z.string().min(mode === 'login' ? 1 : 12, mode === 'login' ? 'Enter your password.' : 'Use at least 12 characters.').max(128, 'Use no more than 128 characters.'),
  });
}
export type AuthValues = { email: string; password: string };
export type ActionResult = { error?: string; message?: string };
