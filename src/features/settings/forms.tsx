'use client';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { currencies, pricingUnits } from '@/features/onboarding/schema';
import { saveAccountSettings, saveBusinessSettings, saveServiceSettings, markNotificationRead, requestPlanChange } from './actions';
import type { BusinessSettings, ServiceSettings } from './schema';
export function PlanRequest({ id, name, disabled }: { id: string; name: string; disabled: boolean }) {
  const [pending, start] = useTransition(); const [message, setMessage] = useState('');
  return <div className="mt-5"><Button disabled={pending || disabled} variant="outline" onClick={() => { if (window.confirm(`Request the ${name} plan? This replaces any pending request. It does not activate billing or change your current access until reviewed.`)) start(async () => { const result = await requestPlanChange(id, true); setMessage(result.error ?? 'Plan request recorded. No payment was taken.'); }); }}>Request {name}</Button><p role="status" className="mt-3 text-sm">{message}</p></div>;
}
export function BusinessSettingsForm({ initial, canManage }: { initial: BusinessSettings; canManage: boolean }) {
  const { register, handleSubmit } = useForm({ defaultValues: initial }); const [pending, start] = useTransition(); const [message, setMessage] = useState('');
  return <form className="mt-5 space-y-5" onSubmit={handleSubmit(values => start(async () => { const result = await saveBusinessSettings(values); setMessage(result.error ?? 'Business settings saved.'); }))}><fieldset disabled={pending || !canManage} className="grid gap-5 sm:grid-cols-2">
    {(['name', 'email', 'phone', 'address', 'tax_number', 'tax_rate', 'service_areas'] as const).map((name, i) => <label className="label" key={name}>{['Company name', 'Business email', 'Business phone', 'Business address', 'VAT / tax number', 'VAT / tax rate (%)', 'Service areas (comma-separated)'][i]}<input className="field mt-2" {...register(name)} /></label>)}
    <label className="label">Currency<select className="field mt-2" {...register('currency')}>{currencies.map(c => <option key={c}>{c}</option>)}</select></label>
    <label className="flex items-center gap-3 text-sm"><input type="checkbox" {...register('tax_registered')} />Registered for VAT / tax</label>
    <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" {...register('currency_confirmed')} />I confirm any currency change. Existing records keep their currency; service rates are not converted. I will review rates before creating new quotations.</label>
    <label className="label sm:col-span-2">Company description<textarea className="field mt-2" rows={4} maxLength={4000} {...register('description')} /></label>
    <label className="label sm:col-span-2">Default quotation terms<textarea className="field mt-2" rows={5} maxLength={10000} {...register('default_terms')} /></label>
    <Button disabled={pending || !canManage} className="justify-self-start">Save business settings</Button>
  </fieldset><p className="text-sm" role="status">{message}</p>{!canManage && <p className="text-sm">Only an owner or administrator can change these settings.</p>}</form>;
}
export function ServiceSettingsForm({ initial, service, pricing, canManage }: { initial: ServiceSettings; service?: string; pricing?: string; canManage: boolean }) {
  const { register, handleSubmit, reset } = useForm({ defaultValues: initial }); const [pending, start] = useTransition(); const [message, setMessage] = useState('');
  return <form className="mt-4 space-y-4 rounded-lg border border-border p-4" onSubmit={handleSubmit(values => start(async () => { const result = await saveServiceSettings(values, service, pricing); setMessage(result.error ?? 'Service pricing saved.'); if (result.success && !service) reset(initial); }))}><fieldset disabled={pending || !canManage} className="grid gap-4 sm:grid-cols-2"><label className="label">Service name<input className="field mt-2" {...register('name')} /></label><label className="label">Pricing unit<select className="field mt-2" {...register('unit')}>{pricingUnits.map(u => <option key={u} value={u}>{u.replaceAll('_', ' ')}</option>)}</select></label><label className="label">Unit price<input className="field mt-2" inputMode="decimal" {...register('unit_price')} /></label><label className="flex items-center gap-3 text-sm"><input type="checkbox" {...register('enabled')} />Available for new quotations</label><label className="label sm:col-span-2">Service description<textarea className="field mt-2" rows={2} maxLength={2000} {...register('description')} /></label><Button disabled={pending || !canManage} className="justify-self-start">{service ? 'Save service' : 'Add service'}</Button></fieldset><p role="status" className="text-sm">{message}</p></form>;
}
export function AccountSettingsForm({ displayName, emailNotifications }: { displayName: string; emailNotifications: boolean }) {
  const { register, handleSubmit } = useForm({ defaultValues: { display_name: displayName, email_notifications: emailNotifications } }); const [pending, start] = useTransition(); const [message, setMessage] = useState('');
  return <form className="mt-5 space-y-5" onSubmit={handleSubmit(values => start(async () => { const result = await saveAccountSettings(values); setMessage(result.error ?? 'Account preferences saved.'); }))}><fieldset disabled={pending} className="space-y-5"><label className="label">Your display name<input className="field mt-2" maxLength={120} {...register('display_name')} /></label><label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" {...register('email_notifications')} />Allow reviewed email copies of my business notifications. Each copy requires confirmation in Notifications; no automatic emails.</label><Button disabled={pending}>Save account preferences</Button></fieldset><p className="text-sm" role="status">{message}</p></form>;
}
export function NotificationReadButton({ id }: { id: string }) {
  const [pending, start] = useTransition(); const [error, setError] = useState('');
  return <div><Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => { const result = await markNotificationRead(id); setError(result.error ?? ''); })}>Mark read</Button>{error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}</div>;
}
