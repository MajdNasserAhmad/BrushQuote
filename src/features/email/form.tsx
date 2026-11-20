'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { emailLabels, emailTypes, type EmailDraft } from './schema';
import { emailCustomers, reviewNotificationEmail, saveEmailDraft, sendReviewedEmail } from './actions';
export function NotificationEmailButton({ id }: { id: string }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [error, setError] = useState('');
  return <div><Button variant="outline" disabled={pending} onClick={() => start(async () => { const result = await reviewNotificationEmail(id); if (result.id) router.push(`/dashboard/emails/${result.id}`); else setError(result.error ?? 'Draft unavailable.'); })}>Review email copy</Button>{error && <p role="alert" className="mt-2 text-sm">{error}</p>}</div>;
}
export function AIEmailDraft({ initial }: { initial: { subject: string; body: string } }) {
  const [subject, setSubject] = useState(initial.subject); const [body, setBody] = useState(initial.body);
  const [customers, setCustomers] = useState<{ id: string; full_name: string; email: string | null }[] | null>(null);
  const [pending, start] = useTransition(); const [error, setError] = useState('');
  if (customers) return <EmailForm customers={customers} quotes={[]} jobs={[]} initial={{ subject, body }} />;
  return <fieldset className="space-y-4"><legend className="mb-3 font-semibold">Editable email draft</legend><label className="label">Subject<input className="field mt-2" value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} /></label><label className="label">Message<textarea className="field mt-2" rows={12} value={body} onChange={e => setBody(e.target.value)} maxLength={10000} /></label><p className="text-sm text-muted-foreground">This draft has not been sent. Choose a customer, then save and review it before confirming delivery.</p><Button disabled={pending} onClick={() => start(async () => { const result = await emailCustomers(); if (result.customers) setCustomers(result.customers); else setError(result.error ?? 'Could not load customers.'); })}>Choose recipient and review</Button>{error && <p role="alert">{error}</p>}</fieldset>;
}
export function EmailForm({ customers, quotes, jobs, initial }: { customers: { id: string; full_name: string; email: string | null }[]; quotes: { id: string; reference: string; customer_id: string }[]; jobs: { id: string; title: string; customer_id: string }[]; initial?: Partial<EmailDraft> }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [error, setError] = useState('');
  const { register, handleSubmit } = useForm<EmailDraft>({ defaultValues: { customer_id: '', quotation_id: '', job_id: '', template: 'customer_message', subject: '', body: '', ...initial } });
  return <form className="panel mt-6 space-y-5" onSubmit={handleSubmit(values => start(async () => { setError(''); const result = await saveEmailDraft(values); if (result.id) router.push(`/dashboard/emails/${result.id}`); else setError(result.error ?? 'Draft could not be saved.'); }))}><fieldset disabled={pending} className="space-y-5">
    <label className="label">Customer<select className="field mt-2" required {...register('customer_id')}><option value="">Choose a customer</option>{customers.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.email ?? 'No email saved'}</option>)}</select></label>
    <label className="label">Email type<select className="field mt-2" {...register('template')}>{emailTypes.map(t => <option value={t} key={t}>{emailLabels[t]}</option>)}</select></label>
    <label className="label">Issued quotation PDF (optional)<select className="field mt-2" {...register('quotation_id')}><option value="">No attachment</option>{quotes.map(q => <option value={q.id} key={q.id}>{q.reference}</option>)}</select></label>
    <label className="label">Related job (optional)<select className="field mt-2" {...register('job_id')}><option value="">No related job</option>{jobs.map(j => <option value={j.id} key={j.id}>{j.title}</option>)}</select></label>
    <label className="label">Subject<input className="field mt-2" required maxLength={200} {...register('subject')} /></label>
    <label className="label">Message<textarea className="field mt-2" rows={12} required maxLength={10000} {...register('body')} /></label>
    <p className="text-sm text-muted-foreground">Review the saved recipient, message and attachments on the next screen. Saving a draft does not send email.</p><Button disabled={pending}>{pending ? 'Saving…' : 'Save draft for review'}</Button>
  </fieldset>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</form>;
}
export function EmailSendButton({ id, recipient, enabled }: { id: string; recipient: string; enabled: boolean }) {
  const [pending, start] = useTransition(); const [message, setMessage] = useState('');
  return <div className="mt-6"><Button disabled={pending || !enabled} onClick={() => { if (!window.confirm(`Send this exact reviewed email and any attached quotation PDF to ${recipient}? This is an external action.`)) return; start(async () => { const result = await sendReviewedEmail(id, true); setMessage(result.error ?? result.success ?? 'Status unavailable.'); }); }}>{pending ? 'Submitting…' : 'Confirm and send email'}</Button><p role="status" className="mt-3 text-sm">{message}</p></div>;
}
