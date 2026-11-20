import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  env: vi.fn(), client: vi.fn(), redirect: vi.fn(),
  auth: { signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), resetPasswordForEmail: vi.fn(), getUser: vi.fn(), updateUser: vi.fn() },
}));
vi.mock('../../src/lib/config/server-environment', () => ({ publicEnvironment: mocks.env }));
vi.mock('../../src/lib/supabase/server', () => ({ createSupabaseServer: mocks.client }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
import { submitAuth } from '../../src/features/auth/actions';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.env.mockReturnValue({ configured: true, appUrl: 'https://brushquote.example' });
  mocks.client.mockResolvedValue({ auth: mocks.auth });
  mocks.redirect.mockImplementation(path => { throw new Error(`redirect:${path}`); });
});
const credentials = { email: 'fixture@example.invalid', password: 'a long test passphrase' };
test('rejects malformed direct action calls before contacting Supabase', async () => {
  expect((await submitAuth('delete-user', credentials)).error).toBeTruthy();
  expect((await submitAuth('register', { ...credentials, password: 'short' })).error).toBeTruthy();
  expect(mocks.client).not.toHaveBeenCalled();
});
test('missing configuration never attempts provider calls', async () => {
  mocks.env.mockReturnValue({ configured: false, message: 'Setup required' });
  expect(await submitAuth('login', credentials)).toEqual({ error: 'Setup required' });
  expect(mocks.client).not.toHaveBeenCalled();
});
test('unverified login is signed out and denied a workspace redirect', async () => {
  mocks.auth.signInWithPassword.mockResolvedValue({ data: { user: { email_confirmed_at: null } }, error: null });
  mocks.auth.signOut.mockResolvedValue({ error: null });
  expect((await submitAuth('login', credentials)).error).toContain('Verify');
  expect(mocks.auth.signOut).toHaveBeenCalledOnce();
  expect(mocks.redirect).not.toHaveBeenCalled();
});
test('verified login redirects after authentication, outside the error handler', async () => {
  mocks.auth.signInWithPassword.mockResolvedValue({ data: { user: { email_confirmed_at: '2026-01-01' } }, error: null });
  await expect(submitAuth('login', credentials)).rejects.toThrow('redirect:/dashboard');
});
test('password updates recheck identity and reject invalid sessions', async () => {
  mocks.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid session' } });
  expect((await submitAuth('reset-password', { email: '', password: credentials.password })).error).toContain('valid password reset link');
  expect(mocks.auth.updateUser).not.toHaveBeenCalled();
});
test('provider error details are not reflected into the UI', async () => {
  mocks.auth.signInWithPassword.mockRejectedValue(new Error('private provider detail'));
  const result = await submitAuth('login', credentials);
  expect(result.error).toContain('unavailable');
  expect(JSON.stringify(result)).not.toContain('private provider detail');
});
test('failed recovery is not reported as a sent email', async () => {
  mocks.auth.resetPasswordForEmail.mockResolvedValue({ error: { message: 'Provider unavailable' } });
  const result = await submitAuth('forgot-password', { email: credentials.email, password: '' });
  expect(result.error).toContain('unavailable');
  expect(result.message).toBeUndefined();
});
