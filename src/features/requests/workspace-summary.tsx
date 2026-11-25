import Link from 'next/link';
import { workspaceData } from '@/features/crm/data';
export async function RequestSummary() {
  const { supabase, businessId, user } = await workspaceData();
  const [business, notifications] = await Promise.all([
    supabase.from('businesses').select('slug').eq('id', businessId).single(),
    supabase.from('notifications').select('id,message,destination_path,created_at').eq('business_id', businessId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
  ]);
  if (business.error || notifications.error) throw new Error('Request updates could not be loaded.');
  return <section className="panel mt-7"><h2 className="text-xl font-semibold">Quotation requests</h2><p className="mt-3 text-sm text-muted-foreground">Share your public form with customers to collect project details and photos.</p><Link prefetch={false} className="mt-3 inline-block break-all text-sm font-semibold text-primary underline" href={`/request/${business.data.slug}`}>/request/{business.data.slug}</Link><h3 className="mt-6 font-semibold">Recent notifications</h3>{notifications.data.length ? <ul className="mt-3 space-y-3">{notifications.data.map(n => <li key={n.id} className="rounded-lg bg-muted p-4 text-sm">{n.destination_path ? <Link prefetch={false} className="text-primary underline" href={n.destination_path}>{n.message}</Link> : n.message}<time className="mt-1 block text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</time></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">No new notifications yet.</p>}</section>;
}
