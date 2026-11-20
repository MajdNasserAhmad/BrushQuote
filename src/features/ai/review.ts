import 'server-only';
import { z } from 'zod';
import { notFound } from 'next/navigation';
import { workspaceData } from '@/features/crm/data';
import { suggestionSchema } from './schema';
export async function reviewedSuggestion(id: string, task: 'quote_generator' | 'job_planner') {
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, businessId, user, membership } = await workspaceData();
  if (task === 'job_planner' && membership?.role !== 'owner') notFound();
  const result = await supabase.from('ai_results').select('content,ai_usage!inner(task,status)').eq('business_id', businessId).eq('user_id', user.id).eq('id', id).maybeSingle();
  if (result.error) throw new Error('Suggestion could not be loaded.');
  if (!result.data || result.data.ai_usage.task !== task || result.data.ai_usage.status !== 'succeeded') notFound();
  const parsed = suggestionSchema.safeParse(result.data.content); if (!parsed.success) notFound(); return parsed.data;
}
