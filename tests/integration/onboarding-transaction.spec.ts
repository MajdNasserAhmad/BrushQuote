import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/supabase/database';
import { randomUUID, randomBytes } from 'node:crypto';

const studio = 'http://127.0.0.1:54323';
async function query(sql: string) {
  const response = await fetch(`${studio}/api/platform/pg-meta/default/query`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: sql }) });
  if (!response.ok) throw new Error('Local fixture query failed.');
  return response.json();
}

test('onboarding rolls back invalid prices and duplicate slugs, and serializes concurrent submissions', async () => {
  test.skip(process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:54321', 'Only the dedicated local stack is supported.');
  const settings = await (await fetch(`${studio}/api/platform/projects/default/settings`)).json();
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, settings.service_api_keys.find((key: { name: string }) => key.name === 'service_role key').api_key, { auth: { persistSession: false } });
  const suffix = randomUUID();
  const users: string[] = [];
  const slug = `transaction-${suffix}`;
  const details = { name: 'Transaction Test', slug, email: 'fixture@example.invalid', phone: '0123456789', address: 'Fictional Address', currency: 'GBP', tax_rate: 0, service_areas: ['Test area'] };
  const services = [{ name: 'Painting', unit: 'hour', unit_price: '12.3456' }];
  try {
    const clients: SupabaseClient<Database>[] = [];
    for (let index = 0; index < 2; index++) {
      const email = `transaction-${suffix}-${index}@example.invalid`;
      const password = randomBytes(24).toString('base64url');
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      expect(created.error).toBeNull(); users.push(created.data.user!.id);
      const client = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
      expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull(); clients.push(client);
    }
    const invalid = await clients[0].rpc('onboard_business', { details, services: [{ ...services[0], unit_price: '-1' }] });
    expect(invalid.error).not.toBeNull();
    expect((await query(`select id from public.businesses where slug='${slug}'`))).toEqual([]);
    expect((await query(`select id from public.profiles where id='${users[0]}'`))).toEqual([]);
    const concurrent = await Promise.all([0, 1].map(() => clients[0].rpc('onboard_business', { details, services })));
    expect(concurrent.filter(result => result.error === null)).toHaveLength(1);
    expect(concurrent.filter(result => result.error?.code === '23505')).toHaveLength(1);
    expect(await query(`select id from public.businesses where slug='${slug}'`)).toHaveLength(1);
    const prices = await clients[0].from('business_pricing_rules').select('unit_price');
    expect(prices.data?.[0].unit_price).toBe(12.3456);
    const collision = await clients[1].rpc('onboard_business', { details, services });
    expect(collision.error?.code).toBe('23505');
    expect(await query(`select id from public.profiles where id='${users[1]}'`)).toEqual([]);
  } finally {
    await query(`delete from public.businesses where slug='${slug}'`);
    for (const id of users) expect((await admin.auth.admin.deleteUser(id)).error).toBeNull();
  }
});
