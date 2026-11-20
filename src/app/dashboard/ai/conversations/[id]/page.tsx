import { z } from 'zod';
import { notFound } from 'next/navigation';
import { workspaceData } from '@/features/crm/data';
import { PageHeading } from '@/features/crm/presentation';
import { aiWorkspace } from '@/features/ai/data';
import { AIForm } from '@/features/ai/form';
export default async function Conversation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, businessId, user } = await workspaceData();
  const conversation = await supabase.from('ai_conversations').select('id,title').eq('business_id', businessId).eq('user_id', user.id).eq('id', id).is('archived_at', null).maybeSingle();
  if (conversation.error) throw new Error('Conversation could not be loaded.'); if (!conversation.data) notFound();
  const messages = await supabase.from('ai_messages').select('id,role,content').eq('business_id', businessId).eq('conversation_id', id).order('sequence', { ascending: false }).limit(40);
  if (messages.error) throw new Error('Conversation messages could not be loaded.'); const data = await aiWorkspace();
  return <><PageHeading title={conversation.data.title} description="Your private business conversation. Previous AI interpretations may be out of date." /><ol className="mt-7 max-w-3xl space-y-4">{messages.data.reverse().map(message => <li key={message.id} className={`panel ${message.role === 'user' ? 'ml-6' : 'mr-6'}`}><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">{message.role === 'user' ? 'You' : 'Groq · AI suggestion'}</p><p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p></li>)}</ol><p className="mt-5 text-xs text-muted-foreground">Showing the most recent 40 messages. Each new request uses up to six recent messages, limited to 1,500 characters each, plus current authorized business context.</p><AIForm task="business_assistant" conversationId={id} options={data} available={data.configured && data.enabled && data.settings.enabled} /></>;
}
