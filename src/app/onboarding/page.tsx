import { redirect } from 'next/navigation';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { currentMembership } from '@/lib/auth/session';
import { logout } from '@/features/auth/actions';
import { OnboardingForm } from '@/features/onboarding/onboarding-form';
export const metadata = { title: 'Set up your business' };
export const dynamic = 'force-dynamic';
export default async function Onboarding() {
  const { user, membership } = await currentMembership();
  if (membership) redirect('/dashboard');
  return <><header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-7"><Brand /><form action={logout}><Button variant="ghost" type="submit">Sign out</Button></form></header><main id="main" className="mx-auto max-w-4xl px-6 pt-10 pb-20"><p className="text-xs font-semibold uppercase tracking-widest text-primary">A fresh coat. A fresh start.</p><h1 className="mt-4 text-4xl font-semibold tracking-tight">Let’s make this your workspace.</h1><p className="mt-4 mb-9 text-muted-foreground">Tell us a little about your business. Your settings stay within your company.</p><OnboardingForm email={user.email ?? ''} /></main></>;
}
