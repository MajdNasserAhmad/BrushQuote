import { notFound } from 'next/navigation';
import { z } from 'zod';
import { workspaceData } from '@/features/crm/data';
import { PageHeading } from '@/features/crm/presentation';
import { suggestionSchema } from '@/features/ai/schema';
import { Suggestion } from '@/features/ai/form';
export default async function AIResult({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!z.uuid().safeParse(id).success) notFound(); const { supabase, businessId, user } = await workspaceData();
  const result = await supabase.from('ai_results').select('content,ai_usage!inner(model)').eq('business_id', businessId).eq('user_id', user.id).eq('id', id).maybeSingle();
  if (result.error) throw new Error('AI result could not be loaded.'); if (!result.data) notFound();
  const parsed = suggestionSchema.safeParse(result.data.content); if (!parsed.success) throw new Error('This AI result is not compatible with the current format.');
  return <><PageHeading title="Saved AI suggestion" description="Review generated content against current business information before using it." /><div className="mt-7 max-w-3xl"><Suggestion id={id} data={parsed.data} model={result.data.ai_usage.model} cached /></div></>;
}
