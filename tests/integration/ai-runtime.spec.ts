import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { localWorkspace } from './helpers/local-workspace';
test('AI reservations enforce quotas, membership, private results and privileged writes', async () => {
  const a = await localWorkspace(); const b = await localWorkspace();
  try {
    const actor = (await a.client.auth.getUser()).data.user!.id;
    const other = (await b.client.auth.getUser()).data.user!.id;
    const settings = { enabled: true, vision_enabled: true, reasoning_enabled: false, daily_limit: 1, monthly_limit: 2 };
    expect((await a.client.rpc('save_ai_settings', { target_business: b.businessId, settings })).error).not.toBeNull();
    expect((await a.client.rpc('save_ai_settings', { target_business: a.businessId, settings })).error).toBeNull();
    const params = { target_business: a.businessId, actor, request: randomUUID(), task_name: 'email_assistant', model_name: 'unit-test-model' };
    expect((await a.client.rpc('reserve_ai_request', params)).error).not.toBeNull();
    expect((await a.admin.rpc('reserve_ai_request', { ...params, actor: other })).error).not.toBeNull();
    expect((await a.admin.rpc('reserve_ai_request', { ...params, reasoning: true })).error?.message).toContain('AI_DISABLED');
    const races = await Promise.all([a.admin.rpc('reserve_ai_request', params), a.admin.rpc('reserve_ai_request', { ...params, request: randomUUID() })]);
    expect(races.filter(r => !r.error)).toHaveLength(1); expect(races.find(r => r.error)?.error?.message).toContain('AI_USAGE_LIMIT');
    const usage = races.find(r => r.data)!.data!;
    expect((await b.client.from('ai_usage').select('id').eq('business_id', a.businessId)).data).toEqual([]);
    expect((await a.client.from('ai_usage').update({ status: 'succeeded' }).eq('id', usage)).error).not.toBeNull();
    const completion = { target_business: a.businessId, actor, usage, output: { fixture: 'isolated integration test; not a real AI response' }, fingerprint: 'a'.repeat(64) };
    expect((await a.client.rpc('complete_ai_request', completion)).error).not.toBeNull();
    expect((await a.admin.rpc('complete_ai_request', { ...completion, target_business: b.businessId, actor: other })).error).not.toBeNull();
    const completed = await a.admin.rpc('complete_ai_request', completion); expect(completed.error).toBeNull();
    expect((await a.client.from('ai_results').select('id').eq('id', completed.data!)).data).toHaveLength(1);
    expect((await b.client.from('ai_results').select('id').eq('id', completed.data!)).data).toEqual([]);
    expect((await a.admin.rpc('complete_ai_request', completion)).error).not.toBeNull();
    expect((await a.admin.rpc('reserve_ai_request', { ...params, request: randomUUID() })).error?.message).toContain('AI_USAGE_LIMIT');
    expect((await a.client.rpc('save_ai_settings', { target_business: a.businessId, settings: { ...settings, daily_limit: 101 } })).error).not.toBeNull();
    expect((await a.client.rpc('save_ai_settings', { target_business: a.businessId, settings: { ...settings, enabled: false } })).error).toBeNull();
    expect((await a.admin.rpc('reserve_ai_request', { ...params, request: randomUUID() })).error?.message).toContain('AI_DISABLED');
  } finally { await a.cleanup(); await b.cleanup(); }
});
test('private conversation history uses authorized results and cannot cross users or businesses', async () => {
  const a = await localWorkspace(); const b = await localWorkspace(); let shared = false;
  const actor = (await a.client.auth.getUser()).data.user!.id; const other = (await b.client.auth.getUser()).data.user!.id;
  try {
    const reserved = await a.admin.rpc('reserve_ai_request', { target_business: a.businessId, actor, request: randomUUID(), task_name: 'business_assistant', model_name: 'fictional-test-model' }); expect(reserved.error).toBeNull();
    const completed = await a.admin.rpc('complete_ai_request', { target_business: a.businessId, actor, usage: reserved.data!, fingerprint: 'b'.repeat(64), output: { summary: 'Fictional integration fixture, not an AI response.' } }); expect(completed.error).toBeNull();
    const args = { target_business: a.businessId, target_conversation: null!, result: completed.data!, question: 'A fictional test question.' };
    const exchange = await a.client.rpc('save_ai_exchange', args); expect(exchange.error).toBeNull();
    expect((await a.client.rpc('save_ai_exchange', { ...args, target_conversation: exchange.data! })).error).toBeNull();
    const messages = await a.client.from('ai_messages').select('role,sequence').eq('conversation_id', exchange.data!).order('sequence'); expect(messages.data?.map(m => m.role)).toEqual(['user', 'assistant']);
    expect((await b.client.rpc('save_ai_exchange', args)).error).not.toBeNull();
    expect((await b.client.from('ai_messages').select('id').eq('conversation_id', exchange.data!)).data).toEqual([]);
    expect((await a.admin.from('business_memberships').insert({ business_id: a.businessId, user_id: other, role: 'member' })).error).toBeNull(); shared = true;
    expect((await b.client.from('ai_results').select('id').eq('id', completed.data!)).data).toEqual([]);
    expect((await b.client.from('ai_messages').select('id').eq('conversation_id', exchange.data!)).data).toEqual([]);
    expect((await b.client.rpc('save_ai_exchange', { ...args, target_conversation: exchange.data! })).error).not.toBeNull();
    expect((await b.client.rpc('save_ai_settings', { target_business: a.businessId, settings: { enabled: false, vision_enabled: false, reasoning_enabled: false, daily_limit: 0, monthly_limit: 0 } })).error).not.toBeNull();
    expect((await a.client.rpc('ai_business_metrics', { target_business: b.businessId })).error).not.toBeNull();
    const metrics = await a.client.rpc('ai_business_metrics', { target_business: a.businessId }); expect(metrics.error).toBeNull(); expect(metrics.data).toMatchObject({ acceptance_rate_percent: null, service_line_values: [] });
  } finally { if (shared) await a.admin.from('business_memberships').delete().eq('business_id', a.businessId).eq('user_id', other); await a.cleanup(); await b.cleanup(); }
});
test('AI workspace exposes configuration honestly, supports settings and fits mobile', async ({ page }) => {
  const fixture = await localWorkspace();
  try {
    await fixture.login(page); await page.getByRole('link', { name: 'AI workspace', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'AI workspace', exact: true })).toBeVisible();
    await expect(page.getByText('Not available', { exact: true })).toBeVisible();
    await page.getByText('AI settings and model information', { exact: true }).click();
    await page.getByLabel('Daily request limit').fill('7'); await page.getByRole('button', { name: 'Save AI settings' }).click();
    await expect(page.getByText('AI settings saved.')).toBeVisible(); await page.reload();
    await expect(page.getByText('0 / 7', { exact: true })).toBeVisible();
    await page.getByText('AI settings and model information', { exact: true }).click();
    await page.getByLabel('Daily request limit').fill('8'); await page.getByRole('button', { name: 'Save AI settings' }).click();
    await expect(page.getByText('AI settings saved.')).toBeVisible(); await expect(page.getByText('0 / 8', { exact: true })).toBeVisible();
    await page.getByLabel('Allow higher-capability reasoning model').check(); await page.getByLabel('Default model', { exact: true }).selectOption('reasoning'); await page.getByRole('button', { name: 'Save AI settings' }).click();
    await expect(page.getByText('AI settings saved.')).toBeVisible(); await page.reload(); await page.getByText('AI settings and model information', { exact: true }).click(); await expect(page.getByLabel('Default model', { exact: true })).toHaveValue('reasoning');
    await page.getByRole('link', { name: /Email Assistant Write/ }).click();
    await expect(page.getByRole('heading', { name: 'Email Assistant', exact: true }).first()).toBeVisible();
    if (!process.env.GROQ_API_KEY) { await expect(page.getByRole('button', { name: 'Generate suggestion' })).toBeDisabled(); await expect(page.getByText('AI is unavailable.', { exact: false })).toBeVisible(); }
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const count = await fixture.admin.from('ai_usage').select('id', { count: 'exact' }).eq('business_id', fixture.businessId); expect(count.count).toBe(0);
  } finally { await fixture.cleanup(); }
});
