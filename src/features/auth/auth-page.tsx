import { PaintRoller, ShieldCheck } from 'lucide-react';
import { Brand } from '@/components/brand';
import { publicEnvironment } from '@/lib/config/server-environment';
import { AuthForm } from './auth-form';
import type { AuthMode } from './schema';

const content: Record<AuthMode, [string, string]> = {
  login: ['Welcome back.', 'Sign in to your business workspace.'],
  register: ['Make room for better work.', 'Create your account, then tell us about your business.'],
  'forgot-password': ['Let’s get you back in.', 'Enter your email and we’ll help you reset your password.'],
  'reset-password': ['A fresh start.', 'Choose a strong new password for your account.'],
};
export function AuthPage({ mode, verificationError = false }: { mode: AuthMode; verificationError?: boolean }) {
  const env = publicEnvironment();
  const localTestInbox = env.configured && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.supabaseUrl).hostname) && new URL(env.supabaseUrl).port === '54321';
  const [title, description] = content[mode];
  return <div className="min-h-screen lg:grid lg:grid-cols-[.95fr_1.05fr]">
    <aside className="paper-grid hidden flex-col justify-between border-r border-border bg-[#eaf0e8] p-12 lg:flex"><Brand /><div className="max-w-md py-16"><PaintRoller size={48} strokeWidth={1.3} className="mb-9 text-primary" /><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Your craft. Your company.</p><h2 className="mt-5 text-5xl leading-[1.13] font-semibold tracking-tight">A solid foundation<br />for a beautiful finish.</h2><p className="mt-6 text-base leading-relaxed text-muted-foreground">A dedicated space for the business you’re building, one project at a time.</p></div><div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck size={17} /> Separate workspaces. Thoughtful defaults.</div></aside>
    <main id="main" className="flex min-h-screen flex-col px-6 py-8 sm:px-12"><div className="lg:hidden"><Brand /></div><div className="m-auto w-full max-w-md py-14"><p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">{mode === 'register' ? 'Start with BrushQuote' : 'Your BrushQuote account'}</p><h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{title}</h1><p className="mt-4 mb-8 text-sm leading-relaxed text-muted-foreground">{description}</p>
      {!env.configured && <div role="status" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">Authentication needs configuration</p><p className="mt-2 break-words leading-relaxed">{env.message}</p></div>}
      {localTestInbox && mode !== 'reset-password' && <aside aria-label="Local test email" className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950"><p className="font-semibold">Testing on this computer</p><p className="mt-2 leading-relaxed">Registration and password-reset emails go to the local test inbox, not your personal email inbox. Open the email there and follow its confirmation link; there is no code to enter.</p><a className="mt-3 inline-block font-semibold underline" href="http://127.0.0.1:54324" target="_blank" rel="noreferrer">Open local test inbox</a><p className="mt-2 text-xs">Use the same computer and browser where you registered. This inbox is only for local development.</p></aside>}
      {verificationError && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-800">This verification link is invalid or expired. Try signing in or request a new password reset link.</p>}
      <AuthForm mode={mode} configured={env.configured} /></div><p className="text-center text-xs text-muted-foreground">BrushQuote · Built for painting and decorating businesses</p></main>
  </div>;
}
