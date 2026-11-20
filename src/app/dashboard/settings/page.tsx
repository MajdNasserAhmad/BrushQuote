import Link from 'next/link';
import { PageHeading } from '@/features/crm/presentation';
import { workspaceData } from '@/features/crm/data';
import { BusinessSettingsForm, ServiceSettingsForm, AccountSettingsForm } from '@/features/settings/forms';
import { LogoForm } from '@/features/onboarding/logo-form';
import type { BusinessSettings, ServiceSettings } from '@/features/settings/schema';
export const metadata = { title: 'Settings' };
export default async function Settings() {
  const { supabase, businessId, user, membership } = await workspaceData();
  const [business, pricing, profile, preference] = await Promise.all([
    supabase.from('businesses').select('*').eq('id', businessId).single(),
    supabase.from('business_pricing_rules').select('id,service_id,unit,unit_price,enabled,business_services(name,description,enabled)').eq('business_id', businessId).order('created_at'),
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    supabase.from('notification_preferences').select('email_notifications').eq('business_id', businessId).eq('user_id', user.id).maybeSingle(),
  ]);
  if (business.error || pricing.error || profile.error || preference.error) throw new Error('Workspace settings could not be loaded.');
  const b = business.data; const canManage = ['owner', 'admin'].includes(membership!.role);
  const initial: BusinessSettings = { name: b.name, email: b.email, phone: b.phone, address: b.address, currency: b.currency as BusinessSettings['currency'], tax_registered: b.tax_registered, tax_number: b.tax_number ?? '', tax_rate: String(b.tax_rate), service_areas: b.service_areas.join(', '), description: b.description, default_terms: b.default_terms, currency_confirmed: false };
  return <><PageHeading title="Settings" description="Keep your business details, pricing and account preferences up to date." /><section className="panel mt-7"><h2 className="text-lg font-semibold">Business profile</h2><p className="mt-2 text-sm text-muted-foreground">Public request address: /request/{b.slug}. Issued quotation snapshots remain unchanged.</p><BusinessSettingsForm initial={initial} canManage={canManage} />{canManage && <div className="mt-7 border-t border-border pt-5"><h3 className="mb-4 font-semibold">Company logo</h3><LogoForm /></div>}</section>
    <section className="panel mt-7"><h2 className="text-lg font-semibold">Services and pricing · {b.currency}</h2><p className="mt-2 text-sm text-muted-foreground">These rates apply when selecting services for new items. Existing quotations retain their saved prices. Disable a service to keep its history.</p>{pricing.data.map(p => <ServiceSettingsForm key={p.id} service={p.service_id} pricing={p.id} canManage={canManage} initial={{ name: p.business_services.name, description: p.business_services.description, enabled: p.enabled && p.business_services.enabled, unit: p.unit as ServiceSettings['unit'], unit_price: String(p.unit_price) }} />)}{canManage && <details className="mt-5"><summary className="cursor-pointer font-semibold">Add a service</summary><ServiceSettingsForm canManage initial={{ name: '', description: '', enabled: true, unit: 'hour', unit_price: '0' }} /></details>}</section>
    <section className="panel mt-7"><h2 className="text-lg font-semibold">Your account</h2><p className="mt-2 break-words text-sm text-muted-foreground">{user.email} · {membership!.role}</p><AccountSettingsForm displayName={profile.data.display_name} emailNotifications={preference.data?.email_notifications ?? false} /><div className="mt-5 border-t border-border pt-5"><h3 className="font-semibold">Password and security</h3><p className="mt-2 text-sm text-muted-foreground">Password changes require verification through your account email. Never share your password or provider keys.</p><Link className="mt-3 inline-block text-sm text-primary underline" href="/forgot-password">Request a password reset</Link></div></section>
    <section className="panel mt-7"><h2 className="text-lg font-semibold">AI and public assistant</h2><p className="mt-2 text-sm text-muted-foreground">Control model use, request limits, photo analysis and approved public knowledge.</p><div className="mt-4 flex flex-wrap gap-5 text-sm text-primary underline"><Link href="/dashboard/settings/plan">Plan and usage</Link><Link href="/dashboard/ai">AI settings and usage</Link><Link href="/dashboard/ai/customer_chatbot">Public chatbot settings</Link><Link href="/dashboard/notifications">Your notifications</Link></div></section></>;
}
