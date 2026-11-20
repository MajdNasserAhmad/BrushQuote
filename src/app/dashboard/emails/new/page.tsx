import { workspaceData } from '@/features/crm/data';
import { EmailForm } from '@/features/email/form';
import { suggestionSchema } from '@/features/ai/schema';
import { z } from 'zod';
export default async function NewEmailPage({ searchParams }: { searchParams: Promise<{ suggestion?: string; customer?: string; quotation?: string }> }) {
  const query = await searchParams; const { supabase, businessId, user } = await workspaceData();
  const [customers, quotes, jobs] = await Promise.all([
    supabase.from('customers').select('id,full_name,email').eq('business_id', businessId).is('archived_at', null).order('full_name').limit(1000),
    supabase.from('quotations').select('id,reference,customer_id').eq('business_id', businessId).in('status', ['sent', 'accepted', 'rejected']).not('pdf_path', 'is', null).limit(1000),
    supabase.from('jobs').select('id,title,customer_id').eq('business_id', businessId).order('created_at', { ascending: false }).limit(1000),
  ]);
  if (customers.error || quotes.error || jobs.error) throw new Error('Email options could not be loaded.');
  let email: { subject: string; body: string } | null = null;
  if (query.suggestion && z.uuid().safeParse(query.suggestion).success) {
    const result = await supabase.from('ai_results').select('content').eq('business_id', businessId).eq('user_id', user.id).eq('id', query.suggestion).maybeSingle();
    const parsed = suggestionSchema.safeParse(result.data?.content); if (parsed.success) email = parsed.data.email;
  }
  return <><h1 className="text-3xl font-bold">Compose email</h1><p className="mt-3 text-muted-foreground">Write or edit your message. Customer contact details come from your workspace.</p><EmailForm customers={customers.data} quotes={quotes.data} jobs={jobs.data} initial={{ ...(email ?? {}), ...(customers.data.some(c => c.id === query.customer) ? { customer_id: query.customer } : {}), ...(quotes.data.some(q => q.id === query.quotation) ? { quotation_id: query.quotation } : {}) }} /></>;
}
