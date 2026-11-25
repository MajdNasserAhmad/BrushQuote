'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { submitAuth } from './actions';
import { authInputSchema, type AuthMode, type AuthValues, type ActionResult } from './schema';

const labels: Record<AuthMode, string> = { login: 'Sign in', register: 'Create account', 'forgot-password': 'Send reset link', 'reset-password': 'Update password' };
export function AuthForm({ mode, configured }: { mode: AuthMode; configured: boolean }) {
  const [result, setResult] = useState<ActionResult>({});
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<AuthValues>({ resolver: zodResolver(authInputSchema(mode)), defaultValues: { email: '', password: '' } });
  return <form noValidate onSubmit={handleSubmit(values => startTransition(async () => { setResult({}); setResult(await submitAuth(mode, values)); }))} className="space-y-5">
    {mode !== 'reset-password' && <div><label className="label" htmlFor="email">Email address</label><Input id="email" type="email" autoComplete="email" placeholder="you@yourcompany.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} {...register('email')} />{errors.email && <p id="email-error" className="mt-2 text-sm text-red-700">{errors.email.message}</p>}</div>}
    {mode !== 'forgot-password' && <div><div className="mb-2 flex items-center justify-between"><label className="text-[13px] font-semibold" htmlFor="password">{mode === 'reset-password' ? 'New password' : 'Password'}</label>{mode === 'login' && <Link prefetch={false} href="/forgot-password" className="text-xs text-primary underline">Forgot password?</Link>}</div><Input id="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} aria-invalid={!!errors.password} aria-describedby="password-hint" {...register('password')} /><p id="password-hint" className={`mt-2 text-xs ${errors.password ? 'text-red-700' : 'text-muted-foreground'}`}>{errors.password?.message ?? (mode !== 'login' ? 'Use at least 12 characters. A passphrase works well.' : 'Use the password for your BrushQuote account.')}</p></div>}
    {result.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{result.error}</p>}
    {result.message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-900">{result.message}</p>}
    <Button className="w-full" type="submit" disabled={pending || !configured}>{pending ? <LoaderCircle className="animate-spin" /> : null}{pending ? 'Please wait…' : labels[mode]}{!pending && <ArrowRight />}</Button>
    {mode === 'reset-password' && result.message && <Link prefetch={false} href="/dashboard" className="block text-center text-sm text-primary underline">Return to workspace</Link>}
    <p className="text-center text-sm text-muted-foreground">{mode === 'login' ? <>New to BrushQuote? <Link prefetch={false} href="/register" className="font-semibold text-primary underline">Create an account</Link></> : <>Already have an account? <Link prefetch={false} href="/login" className="font-semibold text-primary underline">Sign in</Link></>}</p>
  </form>;
}
