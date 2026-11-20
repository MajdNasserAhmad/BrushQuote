'use server';
import { revalidatePath } from 'next/cache';
import { workspaceData } from '@/features/crm/data';
import { chatbotSettingsSchema } from './chatbot-schema';
export async function saveChatbot(raw: unknown) {
  const { supabase, businessId } = await workspaceData(); const parsed = chatbotSettingsSchema.safeParse(raw);
  if (!parsed.success) return { error: 'Check the approved information, FAQ lengths and public-sharing confirmation.' };
  const { faqs, confirmed, ...settings } = parsed.data;
  const result = await supabase.rpc('save_chatbot_settings', { target_business: businessId, settings, faqs, confirmed });
  if (result.error) return { error: 'Only a workspace owner or administrator can approve chatbot information.' };
  revalidatePath('/dashboard/ai/customer_chatbot'); return { success: true };
}
