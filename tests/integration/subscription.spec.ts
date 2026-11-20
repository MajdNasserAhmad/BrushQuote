import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { localWorkspace, localSql } from './helpers/local-workspace';
test('expired trials enforce Free limits atomically and plan requests cannot self-upgrade', async () => {
  const fixture = await localWorkspace(); const other = await localWorkspace();
  try {
    const actor = (await fixture.client.auth.getUser()).data.user!.id;
    expect((await fixture.client.from('business_subscriptions').update({ plan_id: 'professional', status: 'active' }).eq('business_id', fixture.businessId)).error).not.toBeNull();
    expect((await fixture.admin.from('business_subscriptions').update({ trial_ends_at: new Date(Date.now() - 1000).toISOString() }).eq('business_id', fixture.businessId)).error).toBeNull();
    expect((await fixture.client.rpc('subscription_summary', { target_business: fixture.businessId })).data).toMatchObject({ plan: { id: 'free', daily_ai: 5, monthly_ai: 20, monthly_quotes: 10 } });
    const params = { target_business: fixture.businessId, actor, request: randomUUID(), task_name: 'photo_analyzer', model_name: 'fixture' };
    expect((await fixture.admin.rpc('reserve_ai_request', params)).error?.message).toContain('AI_PLAN_FEATURE');
    expect((await fixture.client.rpc('request_plan_change', { target_business: fixture.businessId, requested_plan: 'professional', confirmed: false })).error).not.toBeNull();
    expect((await other.client.rpc('request_plan_change', { target_business: fixture.businessId, requested_plan: 'professional', confirmed: true })).error).not.toBeNull();
    expect((await fixture.client.rpc('request_plan_change', { target_business: fixture.businessId, requested_plan: 'professional', confirmed: true })).error).toBeNull();
    expect((await fixture.client.rpc('subscription_summary', { target_business: fixture.businessId })).data).toMatchObject({ plan: { id: 'free' } });
    // Populate five earlier completed calls to test the daily plan ceiling independently of the minute limit.
    for (let i = 0; i < 5; i++) expect((await fixture.admin.from('ai_usage').insert({ business_id: fixture.businessId, user_id: actor, request_id: randomUUID(), model: 'fictional', task: 'business_assistant', status: 'succeeded', completed_at: new Date().toISOString() })).error).toBeNull();
    await localSql(`update public.ai_usage set created_at=now()-interval '2 minutes' where business_id='${fixture.businessId}'`);
    expect((await fixture.admin.rpc('reserve_ai_request', { ...params, task_name: 'business_assistant', request: randomUUID() })).error?.message).toContain('AI_USAGE_LIMIT');
    const customer = await fixture.client.rpc('save_customer', { target_business: fixture.businessId, customer: null!, details: { full_name: 'Plan Fixture', addresses: [], internal_notes: '' } }); expect(customer.error).toBeNull();
    const quote = { customer_id: customer.data!, lead_id: '', expires_on: new Date(Date.now() + 86400000).toISOString().slice(0, 10), items: [{ service_id: '', description: 'Plan test', unit: 'item', quantity: '1', unit_price: '1' }], discount_amount: '0', additional_charges: '0', tax_rate: '0', terms: '', customer_notes: '', internal_notes: '' };
    for (let i = 0; i < 9; i++) expect((await fixture.client.rpc('save_quotation', { target_business: fixture.businessId, quotation: null!, expected_version: 0, details: quote })).error).toBeNull();
    const attempts = await Promise.all([fixture.client.rpc('save_quotation', { target_business: fixture.businessId, quotation: null!, expected_version: 0, details: quote }), fixture.client.rpc('save_quotation', { target_business: fixture.businessId, quotation: null!, expected_version: 0, details: quote })]);
    expect(attempts.filter(a => !a.error)).toHaveLength(1); expect(attempts.find(a => a.error)?.error?.message).toContain('QUOTATION_PLAN_LIMIT');
  } finally { await fixture.cleanup(); await other.cleanup(); }
});
test('plan page shows actual usage and confirms a recorded non-billing request', async ({ page }) => {
  const fixture = await localWorkspace();
  try {
    await fixture.login(page); await page.goto('/dashboard/settings/plan'); await expect(page.getByRole('heading', { name: 'Current access: Professional' })).toBeVisible();
    page.once('dialog', d => d.dismiss()); await page.getByRole('button', { name: 'Request Starter' }).click(); expect((await fixture.client.from('plan_change_requests').select('id').eq('business_id', fixture.businessId)).data).toHaveLength(0);
    page.once('dialog', d => d.accept()); await page.getByRole('button', { name: 'Request Starter' }).click(); await expect(page.getByText('Plan request recorded. No payment was taken.')).toBeVisible();
    expect((await fixture.client.from('plan_change_requests').select('plan_id,status').eq('business_id', fixture.businessId)).data).toEqual([{ plan_id: 'starter', status: 'pending' }]);
    await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await fixture.cleanup(); }
});
