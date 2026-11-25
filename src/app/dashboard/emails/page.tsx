import Link from 'next/link';
import { workspaceData } from '@/features/crm/data';
import { Button } from '@/components/ui/button';
import { emailConfiguration } from '@/lib/email/provider';
export default async function EmailsPage() {
  const { supabase, businessId } = await workspaceData(); const emails = await supabase.from('email_logs').select('id,subject,recipient,status,created_at').eq('business_id', businessId).order('created_at', { ascending: false }).limit(50);
  if (emails.error) throw new Error('Email history could not be loaded.');
  return <><div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-bold">Email</h1><Button asChild><Link prefetch={false} href="/dashboard/emails/new">Compose email</Link></Button></div><p className="mt-3 text-muted-foreground">Review drafts before sending. Submitted means accepted by Resend; delivered requires provider confirmation.</p>{!emailConfiguration() && <p role="status" className="panel mt-5">Email delivery is not configured. Set RESEND_API_KEY and a verified RESEND_FROM_EMAIL on the server. Drafts can be reviewed; no email will be sent.</p>}<div className="mt-6 space-y-3">{emails.data.map(e => <Link prefetch={false} className="panel block break-words" key={e.id} href={`/dashboard/emails/${e.id}`}><h2 className="font-semibold">{e.subject}</h2><p className="mt-2 text-sm">{e.recipient} · {e.status}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(e.created_at).toISOString().slice(0, 16).replace('T', ' ')} UTC</p></Link>)}{!emails.data.length && <p className="panel">No email drafts yet.</p>}</div></>;
}
