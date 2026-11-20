import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { test, expect } from '@playwright/test';
import { localWorkspace } from '../integration/helpers/local-workspace';
import { suggestionSchema } from '../../src/features/ai/schema';

// This suite is intentionally separate: it makes real Groq calls using fictional
// records and a synthetic image. Never run it against a production database.
for (const task of ['email_assistant', 'quote_generator', 'photo_analyzer', 'business_analyst', 'job_planner', 'business_assistant'] as const) {
  test(`live ${task}: consent, validated generation, persistence and token accounting`, async ({ page }) => {
    expect(!!process.env.GROQ_API_KEY?.trim(), 'Configure the server Groq key before live tests.').toBe(true);
    const fixture = await localWorkspace();
    try {
      const customer = await fixture.client.rpc('save_customer', { target_business: fixture.businessId, customer: null!, details: { full_name: 'Fictional Live AI Customer', email: 'fictional@example.invalid', addresses: [], internal_notes: 'PRIVATE INTERNAL CANARY - never include in provider context' } }); expect(customer.error).toBeNull();
      const lead = await fixture.client.rpc('save_lead', { target_business: fixture.businessId, lead: null!, details: { customer_id: customer.data!, property_address: 'Fictional Test Street', property_type: 'house', room_count: '1', painting_areas: ['Walls'], room_measurements: [{ notes: 'Room length 4 metres, width 3 metres, height 2.4 metres. Labour hours are unknown.' }], wall_condition: 'Requires on-site assessment.', work_type: 'Interior painting', status: 'new', internal_notes: '' } }); expect(lead.error).toBeNull();
      if (task === 'photo_analyzer') {
        const buffer = await sharp({ create: { width: 160, height: 160, channels: 3, background: '#ddddcc' } }).jpeg().toBuffer();
        const path = `${fixture.businessId}/${lead.data}/${randomUUID()}.jpg`;
        expect((await fixture.admin.storage.from('lead-photos').upload(path, buffer, { contentType: 'image/jpeg' })).error).toBeNull();
        expect((await fixture.admin.from('lead_photos').insert({ business_id: fixture.businessId, lead_id: lead.data!, storage_path: path, mime_type: 'image/jpeg', byte_size: buffer.length, ai_consent_at: new Date().toISOString(), ai_consent_version: 'synthetic-test-consent-v1' })).error).toBeNull();
      }
      if (task === 'business_analyst') expect((await fixture.client.rpc('save_ai_settings', { target_business: fixture.businessId, settings: { enabled: true, vision_enabled: true, reasoning_enabled: true, daily_limit: 20, monthly_limit: 200 } })).error).toBeNull();
      await fixture.login(page); await page.goto(`/dashboard/ai/${task}`);
      if (['email_assistant', 'quote_generator', 'photo_analyzer', 'job_planner'].includes(task)) {
        await page.locator('#ai-customer').selectOption(customer.data!); await page.locator('#ai-lead').selectOption(lead.data!);
      }
      if (task === 'photo_analyzer') await page.getByLabel('Photo 1', { exact: true }).check();
      if (task === 'business_analyst') await page.getByLabel('Use the higher-capability reasoning model').check();
      const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const prompts = {
        email_assistant: 'Draft a short friendly reply thanking this fictional customer for their bedroom painting inquiry. Ask for a convenient inspection time. Do not send anything.',
        quote_generator: 'Suggest preparation and one painting line using our saved Painting service. Its unit is hour and labour hours are unknown: use quantity null and measurement_evidence null. Ask what is needed to estimate labour. Do not calculate any totals.',
        photo_analyzer: 'This is an artificial plain-colour image for testing, not a real property photograph. Describe only the visible surface/colour and state that real conditions and measurements cannot be determined. Return at least one observation with limitations.',
        business_analyst: 'Summarise the verified current quotation counts, acceptance rate and revenue. If there are no issued quotations, explain that without inventing figures.',
        job_planner: `Suggest a single job on ${date}, from 09:00 to 17:00 UTC for the provided worker. Describe basic preparation and painting phases. Return a schedule for owner review, not a confirmed booking.`,
        business_assistant: 'Summarise my current active jobs and pending quotations from the supplied facts. Suggest a useful next step, but do not create any records.',
      };
      await page.getByLabel('What would you like help with?').fill(prompts[task]);
      await page.getByLabel('I confirm sharing this request').check(); await page.getByRole('button', { name: 'Generate suggestion', exact: true }).click();
      await expect(page.getByText('AI suggestion · review required', { exact: false })).toBeVisible();
      const records = await fixture.client.from('ai_results').select('id,content,usage_id').eq('business_id', fixture.businessId); expect(records.error).toBeNull(); expect(records.data).toHaveLength(1);
      const parsed = suggestionSchema.safeParse(records.data![0].content); expect(parsed.success).toBe(true);
      const usage = await fixture.client.from('ai_usage').select('status,model,input_tokens,output_tokens').eq('id', records.data![0].usage_id).single(); expect(usage.error).toBeNull();
      expect(usage.data?.status).toBe('succeeded'); expect(usage.data?.input_tokens).toBeGreaterThan(0); expect(usage.data?.output_tokens).toBeGreaterThan(0);
      expect(usage.data?.model).toBe(task === 'photo_analyzer' ? process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b' : task === 'business_analyst' ? process.env.GROQ_REASONING_MODEL || 'openai/gpt-oss-120b' : process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-20b');
      if (task === 'email_assistant') { await page.getByLabel('Subject', { exact: true }).fill('Reviewed fictional subject'); expect((await fixture.client.from('email_logs').select('id').eq('business_id', fixture.businessId)).data).toHaveLength(0); }
      if (task === 'quote_generator') { expect(parsed.success && parsed.data.quote_items?.length).toBeGreaterThan(0); expect((await fixture.client.from('quotations').select('id').eq('business_id', fixture.businessId)).data).toHaveLength(0); }
      if (task === 'job_planner') { expect(parsed.success && parsed.data.schedule).toBeTruthy(); expect((await fixture.client.from('jobs').select('id').eq('business_id', fixture.businessId)).data).toHaveLength(0); }
      if (task === 'business_assistant') {
        const conversations = await fixture.client.from('ai_conversations').select('id').eq('business_id', fixture.businessId); expect(conversations.data).toHaveLength(1);
        await page.goto(`/dashboard/ai/conversations/${conversations.data![0].id}`); await page.getByLabel('What would you like help with?').fill('What did I just ask you about? Use this conversation history.');
        await page.getByLabel('I confirm sharing this request').check(); await page.getByRole('button', { name: 'Generate suggestion', exact: true }).click(); await expect(page.getByText('AI suggestion · review required', { exact: false })).toBeVisible();
        expect((await fixture.client.from('ai_messages').select('id').eq('conversation_id', conversations.data![0].id)).data).toHaveLength(4);
      }
      await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { await fixture.cleanup(); }
  });
}
test('live public chatbot selects approved facts and records actual usage', async ({ page }) => {
  const fixture = await localWorkspace();
  try {
    const business = await fixture.client.from('businesses').select('slug').eq('id', fixture.businessId).single();
    expect((await fixture.client.rpc('save_chatbot_settings', { target_business: fixture.businessId, settings: { enabled: true, approved_business_info: 'Fictional painting company.', pricing_policy: 'Written quotations after inspection.', business_hours: 'Monday to Friday, 09:00 to 17:00.', fallback_message: 'Use our quotation request form.' }, faqs: [], confirmed: true })).error).toBeNull();
    await page.goto(`/chat/${business.data!.slug}`); await page.getByLabel('Your question').fill('What are your business hours?'); await page.getByLabel('I agree to share').check();
    await page.waitForTimeout(2100); // Intentional anti-bot challenge minimum age.
    await page.getByRole('button', { name: 'Ask the assistant' }).click();
    await expect(page.getByRole('heading', { name: 'AI-selected business information' })).toBeVisible();
    await expect(page.getByText('Monday to Friday, 09:00 to 17:00.', { exact: true })).toBeVisible();
    const usage = await fixture.client.from('ai_usage').select('status,task,input_tokens,output_tokens,user_id,attempts,estimated_cost_usd').eq('business_id', fixture.businessId).single();
    expect(usage.data).toMatchObject({ status: 'succeeded', task: 'customer_chatbot', user_id: null });
    if (usage.data!.input_tokens === null) {
      // A rejected/retried attempt may have unreported usage; do not invent zero cost.
      expect(usage.data!.attempts).toBeGreaterThan(1); expect(usage.data!.estimated_cost_usd).toBeNull();
    } else expect(usage.data!.input_tokens).toBeGreaterThan(0);
  } finally { await fixture.cleanup(); }
});
