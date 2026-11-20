'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateLogo } from './actions';
export function LogoForm() {
  const [result, setResult] = useState<{ error?: string; message?: string }>({});
  const [pending, startTransition] = useTransition();
  return <form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(async () => setResult(await updateLogo(data))); }} className="mt-5 space-y-3"><label className="label" htmlFor="company-logo">Update company logo</label><Input id="company-logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" required /><p className="text-xs text-muted-foreground">PNG, JPEG or WebP, up to 2 MB.</p><Button disabled={pending} variant="outline" type="submit">{pending ? 'Saving…' : 'Save logo'}</Button>{result.error && <p role="alert" className="text-sm text-red-700">{result.error}</p>}{result.message && <p role="status" className="text-sm text-primary">{result.message}</p>}</form>;
}
