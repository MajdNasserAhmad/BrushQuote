import Link from 'next/link';
import { PageHeading } from '@/features/crm/presentation';
import { workspaceData } from '@/features/crm/data';
import { NotificationReadButton } from '@/features/settings/forms';
import { NotificationEmailButton } from '@/features/email/form';
export const metadata = { title: 'Notifications' };
export default async function Notifications() {
  const { supabase, businessId, user } = await workspaceData();
  const result = await supabase.from('notifications').select('id,event_type,message,destination_path,read_at,created_at').eq('business_id', businessId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
  if (result.error) throw new Error('Notifications could not be loaded.');
  return <><PageHeading title="Notifications" description="Your 50 most recent workspace notifications." /><section className="panel mt-7">{result.data.length ? <ul className="divide-y divide-border">{result.data.map(n => <li key={n.id} className="flex flex-wrap items-start justify-between gap-4 py-5 first:pt-0"><div className="min-w-0 flex-1"><p className={`break-words text-sm ${n.read_at ? 'text-muted-foreground' : 'font-semibold'}`}>{n.message}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC · {n.read_at ? 'Read' : 'Unread'}</p>{n.destination_path && <Link prefetch={false} className="mt-3 inline-block text-sm text-primary underline" href={n.destination_path}>View details</Link>}</div><div className="flex flex-wrap gap-3">{!n.read_at && <NotificationReadButton id={n.id} />}<NotificationEmailButton id={n.id} /></div></li>)}</ul> : <p className="text-sm text-muted-foreground">You have no notifications yet.</p>}</section></>;
}
