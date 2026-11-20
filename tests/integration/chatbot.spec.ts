import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { localWorkspace } from './helpers/local-workspace';
test('chatbot requires public approval, isolates knowledge and reserves the shared AI budget', async () => {
  const a = await localWorkspace(); const b = await localWorkspace();
  try {
    const settings = { enabled: true, approved_business_info: 'Fictional painting business.', pricing_policy: 'Prices are confirmed after review.', business_hours: 'Monday to Friday.', fallback_message: 'Use our request form.' };
    const args = { target_business: a.businessId, settings, faqs: [{ question: 'Do you paint rooms?', answer: 'We offer room painting.' }], confirmed: false };
    expect((await a.client.rpc('save_chatbot_settings', args)).error).not.toBeNull();
    expect((await b.client.rpc('save_chatbot_settings', { ...args, confirmed: true })).error).not.toBeNull();
    expect((await a.client.rpc('save_chatbot_settings', { ...args, confirmed: true })).error).toBeNull();
    const params = { target_business: a.businessId, client_digest: 'a'.repeat(64), request: randomUUID(), model_name: 'fixture-not-live-model' };
    expect((await a.client.rpc('reserve_chat_request', params)).error).not.toBeNull();
    const result = await a.admin.rpc('reserve_chat_request', params); expect(result.error).toBeNull();
    expect((await a.admin.from('ai_usage').select('task,user_id').eq('id', result.data!).single()).data).toEqual({ task: 'customer_chatbot', user_id: null });
    expect((await a.admin.rpc('reserve_chat_request', params)).error).not.toBeNull();
    expect((await a.admin.rpc('reserve_chat_request', { ...params, target_business: b.businessId, request: randomUUID() })).error).not.toBeNull();
    expect((await a.client.rpc('save_chatbot_settings', { ...args, settings: { ...settings, enabled: false }, confirmed: true })).error).toBeNull();
    expect((await a.admin.rpc('reserve_chat_request', { ...params, request: randomUUID() })).error).not.toBeNull();
  } finally { await a.cleanup(); await b.cleanup(); }
});
test('public chatbot approval UI, CSRF, request limits and honest missing-provider fallback', async ({ page, request }) => {
  const fixture = await localWorkspace();
  try {
    const business = await fixture.client.from('businesses').select('slug').eq('id', fixture.businessId).single(); const slug = business.data!.slug;
    await fixture.login(page); await page.goto('/dashboard/ai/customer_chatbot');
    await page.getByLabel('Enable the public customer chatbot').check();
    await page.getByLabel('Approved business information', { exact: true }).fill('Fictional company serving Bristol.');
    await page.getByLabel('Public pricing policy (no private quotes)').fill('All prices require a written quotation.');
    await page.getByLabel('Business hours', { exact: true }).fill('Monday to Friday, 09:00–17:00.');
    await page.getByLabel('Message when AI is unavailable').fill('Please use our request form for help.');
    await page.getByLabel('I approve publishing', { exact: false }).check();
    await page.getByRole('button', { name: 'Approve and save chatbot' }).click(); await expect(page.getByText('Approved chatbot information saved.')).toBeVisible();
    await page.reload(); await page.getByLabel('Business hours', { exact: true }).fill('Monday to Friday, 10:00–17:00.');
    await page.getByLabel('I approve publishing', { exact: false }).check(); await page.getByRole('button', { name: 'Approve and save chatbot' }).click();
    await expect(page.getByText('Approved chatbot information saved.')).toBeVisible();
    await page.goto(`/chat/${slug}`); await expect(page.getByRole('heading', { name: 'Ask CRM Fixture Painting' })).toBeVisible();
    const denied = await request.post(`/api/chat/${slug}`, { headers: { origin: 'https://untrusted.invalid' }, data: {} }); expect(denied.status()).toBe(403);
    const invalid = await request.post(`/api/chat/${slug}`, { headers: { origin: 'http://localhost:3000' }, data: { question: 'Hours?', challenge: 'forged', confirmed: true, website: '' } }); expect(invalid.status()).toBe(400);
    const large = await request.post(`/api/chat/${slug}`, { headers: { origin: 'http://localhost:3000' }, data: { question: 'x'.repeat(6000) } }); expect(large.status()).toBe(400);
    if (!process.env.GROQ_API_KEY) {
      await page.getByLabel('Your question').fill('When are you open?'); await page.getByLabel('I agree to share').check();
      // Deliberate two-second anti-bot minimum age, not an application readiness wait.
      await page.waitForTimeout(2100); await page.getByRole('button', { name: 'Ask the assistant' }).click();
      await expect(page.getByRole('heading', { name: 'AI is unavailable' })).toBeVisible(); await expect(page.getByText('Please use our request form for help.')).toBeVisible();
    }
    await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto(`/request/${slug}`); await expect(page.getByRole('link', { name: 'Questions about our services? Ask our customer assistant.' })).toBeVisible();
  } finally { await fixture.cleanup(); }
});
