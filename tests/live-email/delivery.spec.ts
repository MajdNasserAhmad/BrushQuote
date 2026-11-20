import { test, expect } from '@playwright/test';
import { localWorkspace } from '../integration/helpers/local-workspace';
test('explicit review submits one real Resend test message and records provider acceptance', async ({ page }) => {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) throw new Error('Live email verification requires RESEND_API_KEY and RESEND_FROM_EMAIL. No provider call was made.');
  const fixture = await localWorkspace();
  try {
    // This is Resend's documented test recipient, never a customer's mailbox.
    const customer = await fixture.client.rpc('save_customer', { target_business: fixture.businessId, customer: null!, details: { full_name: 'Resend Test Recipient', email: 'delivered@resend.dev', addresses: [], internal_notes: '' } }); expect(customer.error).toBeNull();
    await fixture.login(page); await page.goto(`/dashboard/emails/new?customer=${customer.data}`);
    await page.getByLabel('Subject', { exact: true }).fill('BrushQuote provider acceptance test'); await page.getByLabel('Message', { exact: true }).fill('Fictional BrushQuote integration test. This message contains no customer data.');
    await page.getByRole('button', { name: 'Save draft for review' }).click(); await expect(page.getByRole('heading', { name: 'Review email' })).toBeVisible();
    page.once('dialog', d => d.dismiss()); await page.getByRole('button', { name: 'Confirm and send email' }).click();
    expect((await fixture.client.from('email_logs').select('status,provider_id').eq('business_id', fixture.businessId).single()).data).toEqual({ status: 'draft', provider_id: null });
    page.once('dialog', d => d.accept()); await page.getByRole('button', { name: 'Confirm and send email' }).click();
    await expect.poll(async () => (await fixture.client.from('email_logs').select('status').eq('business_id', fixture.businessId).single()).data?.status, { timeout: 30000 }).toMatch(/^(submitted|delivered)$/);
    await expect(page.getByRole('button', { name: 'Confirm and send email' })).toHaveCount(0);
    const log = await fixture.client.from('email_logs').select('status,provider_id,attempts,confirmed_at').eq('business_id', fixture.businessId).single();
    expect(['submitted', 'delivered']).toContain(log.data?.status); expect(log.data?.attempts).toBe(1); expect(log.data?.provider_id).toBeTruthy(); expect(log.data?.confirmed_at).toBeTruthy();
    if (process.env.RESEND_VERIFY_WEBHOOK === 'true') {
      if (!process.env.RESEND_WEBHOOK_SECRET) throw new Error('Signed delivery verification requires the configured webhook secret.');
      await expect.poll(async () => (await fixture.client.from('email_logs').select('status').eq('business_id', fixture.businessId).single()).data?.status, { timeout: 90000, intervals: [1000, 2000, 5000] }).toBe('delivered');
      const delivered = await fixture.client.from('email_logs').select('delivered_at,provider_event_at').eq('business_id', fixture.businessId).single();
      expect(delivered.data?.delivered_at).toBeTruthy(); expect(delivered.data?.provider_event_at).toBeTruthy();
    }
    await page.reload(); await expect(page.getByRole('button', { name: 'Confirm and send email' })).toHaveCount(0);
  } finally { await fixture.cleanup(); }
});
