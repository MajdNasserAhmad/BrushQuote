import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { workspaceData } from '@/features/crm/data';
import { emailConfiguration, type OutgoingEmail } from '@/lib/email/provider';
import { EmailSendButton } from '@/features/email/form';
export default async function EmailDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!z.uuid().safeParse(id).success) notFound(); const { supabase, businessId } = await workspaceData();
  const result = await supabase.from('email_logs').select('id,recipient,subject,status,payload,confirmed_at,failure_code').eq('business_id', businessId).eq('id', id).maybeSingle();
  if (result.error) throw new Error('Email could not be loaded.'); if (!result.data) notFound();
  const item = result.data; const payload = item.payload as unknown as OutgoingEmail | null; const configured = !!emailConfiguration();
  return <><Link prefetch={false} href="/dashboard/emails" className="text-sm text-primary">Back to email history</Link><h1 className="mt-4 text-3xl font-bold">Review email</h1><section className="panel mt-6 space-y-4 break-words"><p><strong>To:</strong> {item.recipient}</p><p><strong>Subject:</strong> {item.subject}</p><p><strong>Status:</strong> {item.status}</p><p><strong>Reply to:</strong> {payload?.replyTo ?? 'Sender address'}</p><p className="whitespace-pre-wrap border-t pt-5">{payload?.text ?? 'Message content unavailable.'}</p>{payload?.attachments?.map(a => <p key={a.filename} className="text-sm">Attachment: {a.filename}</p>)}</section>{!configured && <p role="status" className="panel mt-5">Email delivery is not configured. Add RESEND_API_KEY and a verified RESEND_FROM_EMAIL on the server. Nothing will be sent.</p>}{item.status === 'queued' && <p className="mt-5 text-sm">Submission is pending or uncertain. Retry this same draft after two minutes, within 23 hours of first confirmation. After that, check Resend delivery records before any new send.</p>}{['draft', 'queued'].includes(item.status) && <EmailSendButton id={id} recipient={item.recipient} enabled={configured} />}{item.status === 'submitted' && <p className="mt-5">Resend accepted this email. Delivery is not yet confirmed.</p>}</>;
}
