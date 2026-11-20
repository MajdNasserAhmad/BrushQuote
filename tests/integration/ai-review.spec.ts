import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { localWorkspace } from './helpers/local-workspace';
import type { AISuggestion } from '../../src/features/ai/schema';
const empty: AISuggestion = { summary: 'Fictional integration fixture, not a real AI response.', suggestions: [], questions: [], email: null, quote_items: null, schedule: null, observations: null, actions: [] };
test('AI quotation/job handoff requires review, uses current rates and never saves automatically', async ({ page }) => {
  const fixture = await localWorkspace();
  try {
    const actor = (await fixture.client.auth.getUser()).data.user!.id;
    const service = (await fixture.client.from('business_pricing_rules').select('service_id,unit_price').eq('business_id', fixture.businessId).single()).data!;
    const customer = await fixture.client.rpc('save_customer', { target_business: fixture.businessId, customer: null!, details: { full_name: 'AI Review Customer', email: 'review@example.invalid', addresses: [], internal_notes: '' } }); expect(customer.error).toBeNull();
    async function result(task: string, content: AISuggestion) {
      const reserved = await fixture.admin.rpc('reserve_ai_request', { target_business: fixture.businessId, actor, request: randomUUID(), task_name: task, model_name: 'fictional-integration-fixture' }); expect(reserved.error).toBeNull();
      const complete = await fixture.admin.rpc('complete_ai_request', { target_business: fixture.businessId, actor, usage: reserved.data!, fingerprint: 'c'.repeat(64), output: content }); expect(complete.error).toBeNull(); return complete.data!;
    }
    const quoteId = await result('quote_generator', { ...empty, quote_items: [{ service_id: service.service_id, description: 'Fictional proposed painting work', quantity: null, measurement_evidence: null }] });
    const jobId = await result('job_planner', { ...empty, schedule: { title: 'Fictional proposed job', starts_local: '2034-04-10T09:00', ends_local: '2034-04-10T17:00', timezone: 'UTC', worker_ids: [actor], notes: 'Review before reserving this time.' } });
    const chatResult = await result('business_assistant', empty);
    const conversation = await fixture.client.rpc('save_ai_exchange', { target_business: fixture.businessId, target_conversation: null!, result: chatResult, question: 'Fictional conversation review.' }); expect(conversation.error).toBeNull();
    await fixture.login(page); await page.goto(`/dashboard/ai/results/${quoteId}`);
    await expect(page.getByText('Fictional integration fixture, not a real AI response.')).toBeVisible();
    page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('link', { name: 'Review in quotation builder' }).click(); await expect(page).toHaveURL(new RegExp(`/results/${quoteId}$`));
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('link', { name: 'Review in quotation builder' }).click(); await expect(page).toHaveURL(/quotations\/new\?suggestion=/);
    await expect(page.getByLabel('Quantity', { exact: true })).toHaveValue(''); await expect(page.getByLabel('Unit price', { exact: true })).toHaveValue(String(service.unit_price));
    expect((await fixture.client.from('quotations').select('id').eq('business_id', fixture.businessId)).data).toHaveLength(0);
    await page.getByLabel('Customer', { exact: true }).selectOption(customer.data!); await page.getByLabel('Quantity', { exact: true }).fill('2');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click(); await expect(page).toHaveURL(/quotations\/[0-9a-f-]{36}$/);
    const saved = await fixture.client.from('quotations').select('status,total').eq('business_id', fixture.businessId).single(); expect(saved.data).toMatchObject({ status: 'draft', total: Number(service.unit_price) * 2 });
    await page.goto(`/dashboard/ai/results/${jobId}`); page.once('dialog', dialog => dialog.accept()); await page.getByRole('link', { name: 'Owner: review schedule' }).click();
    await expect(page).toHaveURL(/jobs\/new\?suggestion=/); await expect(page.getByLabel('Job title', { exact: true })).toHaveValue('Fictional proposed job');
    expect((await fixture.client.from('jobs').select('id').eq('business_id', fixture.businessId)).data).toHaveLength(0);
    await page.getByLabel('Customer', { exact: true }).selectOption(customer.data!); await page.getByLabel('Property address', { exact: true }).fill('Fictional Review Street');
    await page.getByRole('button', { name: 'Save job', exact: true }).click(); await expect(page).toHaveURL(/jobs\/[0-9a-f-]{36}$/);
    expect((await fixture.client.from('jobs').select('status').eq('business_id', fixture.businessId)).data).toEqual([{ status: 'scheduled' }]);
    await page.goto('/dashboard/ai'); await page.getByRole('link', { name: 'Fictional conversation review.' }).click();
    await expect(page).toHaveURL(new RegExp(`/conversations/${conversation.data}$`));
    await expect(page.getByText('Fictional integration fixture, not a real AI response.')).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await fixture.cleanup(); }
});
