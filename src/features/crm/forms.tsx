'use client';
import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { customerSchema, leadSchema, leadStatuses, statusLabel, type CustomerInput, type LeadInput } from './schema';
import { saveCustomer, saveLead, setArchived } from './actions';

function Field({ name, label, error, children }: { name: string; label: string; error?: string; children: React.ReactNode }) {
  return <div><label htmlFor={name} className="label">{label}</label>{children}{error && <p id={`${name}-error`} className="mt-2 text-sm text-red-700">{error}</p>}</div>;
}
export function CustomerForm({ id, initial }: { id?: string; initial?: CustomerInput }) {
  const [error, setError] = useState(''); const [pending, start] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<CustomerInput>({ resolver: zodResolver(customerSchema), defaultValues: initial ?? { full_name: '', email: '', phone: '', addresses: '', internal_notes: '' } });
  const field = (name: keyof CustomerInput, label: string, multiline = false) => {
    const props = { id: name, className: 'field', 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `${name}-error` : undefined, ...register(name) };
    return <Field name={name} label={label} error={errors[name]?.message}>{multiline ? <textarea {...props} rows={4} /> : <input {...props} type={name === 'email' ? 'email' : name === 'phone' ? 'tel' : 'text'} />}</Field>;
  };
  return <form noValidate onSubmit={handleSubmit(values => start(async () => { setError(''); const result = await saveCustomer(values, id); if (result.error) setError(result.error); }))} className="panel mt-7 space-y-6"><fieldset disabled={pending} className="grid gap-6 sm:grid-cols-2">{field('full_name', 'Full name')}{field('email', 'Email (optional)')}{field('phone', 'Phone (optional)')}<div className="sm:col-span-2">{field('addresses', 'Property addresses (one per line)', true)}</div><div className="sm:col-span-2">{field('internal_notes', 'Internal notes', true)}</div></fieldset>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex gap-3"><Button disabled={pending}>{pending ? 'Saving…' : 'Save customer'}</Button><Button asChild variant="outline"><Link href={id ? `/dashboard/customers/${id}` : '/dashboard/customers'}>Cancel</Link></Button></div></form>;
}
export function LeadForm({ id, initial, customers }: { id?: string; initial?: Partial<LeadInput>; customers: { id: string; full_name: string }[] }) {
  const [error, setError] = useState(''); const [pending, start] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<LeadInput>({ resolver: zodResolver(leadSchema), defaultValues: { customer_id: '', status: 'new', property_address: '', property_type: 'house', room_count: '', painting_areas: '', room_measurements: '', wall_condition: '', work_type: '', preferred_start_date: '', additional_information: '', internal_notes: '', ...initial } });
  const field = (name: keyof LeadInput, label: string, kind = 'text', options?: { value: string; label: string }[]) => {
    const props = { id: name, className: 'field', 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `${name}-error` : undefined, ...register(name) };
    return <Field name={name} label={label} error={errors[name]?.message}>{options ? <select {...props}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : kind === 'textarea' ? <textarea {...props} rows={3} /> : <input {...props} type={kind} />}</Field>;
  };
  return <form noValidate onSubmit={handleSubmit(values => start(async () => { setError(''); const result = await saveLead(values, id); if (result.error) setError(result.error); }))} className="panel mt-7 space-y-6"><fieldset disabled={pending} className="grid gap-6 sm:grid-cols-2">{field('customer_id', 'Customer', 'select', [{ value: '', label: 'Choose a customer' }, ...customers.map(customer => ({ value: customer.id, label: customer.full_name }))])}{field('status', 'Status', 'select', leadStatuses.map(value => ({ value, label: statusLabel(value) })))}{field('property_address', 'Property address')}{field('property_type', 'Property type', 'select', ['house', 'flat', 'commercial', 'other'].map(value => ({ value, label: statusLabel(value) })))}{field('work_type', 'Type of painting work')}{field('room_count', 'Number of rooms (optional)', 'number')}{field('painting_areas', 'Areas requiring painting (comma separated)')}{field('preferred_start_date', 'Preferred start date (optional)', 'date')}{field('room_measurements', 'Approximate room dimensions', 'textarea')}{field('wall_condition', 'Wall condition', 'textarea')}{field('additional_information', 'Additional information', 'textarea')}{field('internal_notes', 'Internal notes', 'textarea')}</fieldset>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex gap-3"><Button disabled={pending}>{pending ? 'Saving…' : 'Save lead'}</Button><Button asChild variant="outline"><Link href={id ? `/dashboard/leads/${id}` : '/dashboard/leads'}>Cancel</Link></Button></div></form>;
}
export function ArchiveControl({ kind, id, archived }: { kind: 'customer' | 'lead'; id: string; archived: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null); const [pending, start] = useTransition(); const [error, setError] = useState('');
  const verb = archived ? 'Restore' : 'Archive';
  return <><Button variant="outline" onClick={() => { setError(''); dialog.current?.showModal(); }}>{verb} {kind}</Button><dialog ref={dialog} aria-labelledby="archive-heading" className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border p-7 backdrop:bg-black/40"><h2 id="archive-heading" className="text-xl font-semibold">{verb} this {kind}?</h2><p className="my-4 text-sm text-muted-foreground">{archived ? 'This record will return to your active list.' : 'This record will leave your active list. Its history is retained and you can restore it later.'}</p>{error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}<div className="flex gap-3"><Button disabled={pending} onClick={() => start(async () => { const result = await setArchived(kind, id, !archived); if (result.error) setError(result.error); })}>{pending ? 'Saving…' : `Confirm ${verb.toLowerCase()}`}</Button><Button disabled={pending} variant="outline" onClick={() => dialog.current?.close()}>Cancel</Button></div></dialog></>;
}
