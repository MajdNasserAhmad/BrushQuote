'use server';
import { redirect } from 'next/navigation';
import { publicEnvironment } from '@/lib/config/server-environment';
import { createSupabaseServer } from '@/lib/supabase/server';
import { authInputSchema, authMode, type ActionResult } from './schema';

export async function submitAuth(modeInput: unknown, values: unknown): Promise<ActionResult> {
  const mode = authMode.safeParse(modeInput);
  if (!mode.success) return { error: 'This authentication action is unavailable.' };
  const input = authInputSchema(mode.data).safeParse(values);
  if (!input.success) return { error: input.error.issues[0]?.message ?? 'Check your details.' };
  const env = publicEnvironment();
  if (!env.configured) return { error: env.message };
  const supabase = await createSupabaseServer(true);
  let destination: string | undefined;
  try {
    if (mode.data === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword(input.data);
      if (error) return { error: 'Unable to sign in. Check your details and verify your email, or try again later.' };
      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        return { error: 'Verify your email before signing in.' };
      }
      destination = '/dashboard';
    } else if (mode.data === 'register') {
      const { data, error } = await supabase.auth.signUp({ ...input.data, options: { emailRedirectTo: `${env.appUrl}/auth/callback?next=/onboarding` } });
      if (error) return { error: 'Registration is unavailable. Check your details or try again later.' };
      if (data.session && data.user?.email_confirmed_at) destination = '/onboarding';
      else return { message: 'If this address can be registered, you’ll receive a verification email. Check your inbox, or sign in if you already have an account.' };
    } else if (mode.data === 'forgot-password') {
      const { error } = await supabase.auth.resetPasswordForEmail(input.data.email, { redirectTo: `${env.appUrl}/auth/callback?flow=recovery` });
      if (error) return { error: 'Password recovery is temporarily unavailable. Please try again later.' };
      return { message: 'If an account exists for this address, you’ll receive a password reset link.' };
    } else {
      const { data: identity, error: identityError } = await supabase.auth.getUser();
      if (identityError || !identity.user?.email_confirmed_at) return { error: 'Open a valid password reset link before choosing a new password.' };
      const { error } = await supabase.auth.updateUser({ password: input.data.password });
      if (error) return { error: 'Your password could not be updated. Use a different password or request a new link.' };
      return { message: 'Your password has been updated. You can return to your workspace.' };
    }
  } catch {
    return { error: 'The authentication service is unavailable. Please try again shortly.' };
  }
  if (destination) redirect(destination);
  return {};
}

export async function logout() {
  const supabase = await createSupabaseServer(true);
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error('Sign out failed. Please try again.');
  redirect('/login');
}
