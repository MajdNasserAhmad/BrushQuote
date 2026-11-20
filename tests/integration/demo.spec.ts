import { test, expect } from '@playwright/test';
import { localWorkspace } from './helpers/local-workspace';
test('sample workspaces stay labelled, cannot remove their demo flag or send email', async ({ page }) => {
  const fixture = await localWorkspace();
  try {
    expect((await fixture.admin.from('businesses').update({ is_demo: true }).eq('id', fixture.businessId)).error).toBeNull();
    expect((await fixture.client.from('businesses').update({ is_demo: false }).eq('id', fixture.businessId)).error).not.toBeNull();
    const customer = await fixture.client.rpc('save_customer', { target_business: fixture.businessId, customer: null!, details: { full_name: 'Sample Customer', email: 'sample@example.invalid', addresses: [], internal_notes: 'Fictional data' } }); expect(customer.error).toBeNull();
    const actor = (await fixture.client.auth.getUser()).data.user!.id;
    const draft = await fixture.admin.rpc('create_email_draft', { target_business: fixture.businessId, actor, customer: customer.data!, quotation: null!, job: null!, kind: 'customer_message', envelope: { from: 'sample@example.invalid', to: ['sample@example.invalid'], subject: 'Sample email', text: 'Not a real message', html: '<p>Sample</p>' } }); expect(draft.error).toBeNull();
    expect((await fixture.admin.rpc('claim_email_send', { target_business: fixture.businessId, actor, email: draft.data!, confirmed: true })).error?.message).toContain('DEMO_EMAIL_DISABLED');
    expect((await fixture.client.from('email_logs').select('status').eq('id', draft.data!).single()).data?.status).toBe('draft');
    await fixture.login(page); await expect(page.getByRole('complementary', { name: 'Sample workspace' })).toContainText('fictional');
    await page.goto('/dashboard/customers'); await expect(page.getByRole('complementary', { name: 'Sample workspace' })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await fixture.cleanup(); }
});
