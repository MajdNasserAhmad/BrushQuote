import { randomBytes, randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/lib/supabase/database';

export async function localSql(query: string) {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:54321') throw new Error('Fixture operations require local Supabase.');
  const response = await fetch('http://127.0.0.1:54323/api/platform/pg-meta/default/query', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
  if (!response.ok) throw new Error('Local fixture query failed.');
  return response.json();
}
export async function localWorkspace() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:54321') throw new Error('Fixture operations require local Supabase.');
  const settings = await (await fetch('http://127.0.0.1:54323/api/platform/projects/default/settings')).json();
  const admin = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, settings.service_api_keys.find((key: { name: string }) => key.name === 'service_role key').api_key, { auth: { persistSession: false } });
  const suffix = randomUUID(); const email = `workspace-${suffix}@example.invalid`; const password = randomBytes(24).toString('base64url');
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull(); const userId = created.data.user!.id;
  const client = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  let businessId: string | undefined;
  async function cleanup() {
    if (businessId) {
      const quotes = await admin.from('quotations').select('pdf_path').eq('business_id', businessId);
      const paths = quotes.data?.map(q => q.pdf_path).filter((p): p is string => !!p) ?? [];
      if (paths.length) expect((await admin.storage.from('quotation-pdfs').remove(paths)).error).toBeNull();
      const photos = await admin.from('lead_photos').select('storage_path').eq('business_id', businessId);
      if (photos.data?.length) expect((await admin.storage.from('lead-photos').remove(photos.data.map(p => p.storage_path))).error).toBeNull();
      await localSql(`delete from private.public_request_receipts where business_id='${businessId}'`);
      // UUIDs originate from the database; only this fixture's business is affected.
      for (const table of ['email_logs', 'ai_results', 'ai_messages', 'ai_conversations', 'ai_usage', 'business_ai_settings', 'business_faqs', 'business_chatbot_settings', 'notifications', 'activity_logs', 'appointments', 'job_assignments', 'jobs', 'quotation_messages', 'quotation_access_tokens', 'quotation_items', 'quotations', 'lead_photos', 'leads', 'customer_addresses', 'customers']) await localSql(`delete from public.${table} where business_id='${businessId}'`);
      await localSql(`delete from public.plan_change_requests where business_id='${businessId}'`);
      await localSql(`delete from public.businesses where id='${businessId}'`);
    }
    expect((await admin.auth.admin.deleteUser(userId)).error).toBeNull();
  }
  try {
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
    const result = await client.rpc('onboard_business', { details: { name: 'CRM Fixture Painting', slug: `crm-${suffix}`, email, phone: '0123456789', address: 'Fictional Test Street', currency: 'GBP', tax_rate: 0, service_areas: ['Bristol'] }, services: [{ name: 'Painting', unit: 'hour', unit_price: '25' }] });
    expect(result.error).toBeNull(); businessId = result.data!;
    return { client, admin, businessId, cleanup, async login(page: Page) { await page.goto('/login'); await page.getByLabel('Email address').fill(email); await page.getByLabel('Password', { exact: true }).fill(password); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await expect(page).toHaveURL(/\/dashboard$/); } };
  } catch (error) { await cleanup(); throw error; }
}
