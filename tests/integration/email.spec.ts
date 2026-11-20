import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { localWorkspace } from './helpers/local-workspace';
test('email snapshots enforce tenant ownership, confirmation, concurrency and delivery ordering', async () => {
  const fixture = await localWorkspace(); const other = await localWorkspace();
  try {
    const actor = (await fixture.client.auth.getUser()).data.user!.id;
    const customer = await fixture.client.rpc('save_customer', { target_business: fixture.businessId, customer: null!, details: { full_name: 'Email Fixture', email: 'delivery@example.invalid', addresses: [], internal_notes: '' } }); expect(customer.error).toBeNull();
    const args = { target_business: fixture.businessId, actor, customer: customer.data!, quotation: null!, job: null!, kind: 'customer_message', envelope: { from: 'sender@example.invalid', to: ['delivery@example.invalid'], subject: 'Fictional delivery test', text: 'Fixture only', html: '<p>Fixture only</p>' } };
    expect((await fixture.client.rpc('create_email_draft', args)).error).not.toBeNull();
    expect((await fixture.admin.rpc('create_email_draft', { ...args, target_business: other.businessId })).error).not.toBeNull();
    expect((await fixture.admin.rpc('create_email_draft', { ...args, envelope: { ...args.envelope, to: ['forged@example.invalid'] } })).error).not.toBeNull();
    const draft = await fixture.admin.rpc('create_email_draft', args); expect(draft.error).toBeNull();
    expect((await other.client.from('email_logs').select('id').eq('id', draft.data!)).data).toHaveLength(0);
    expect((await fixture.client.from('email_logs').update({ recipient: 'forged@example.invalid' }).eq('id', draft.data!)).error).not.toBeNull();
    const claim = { target_business: fixture.businessId, actor, email: draft.data!, confirmed: true };
    expect((await fixture.admin.rpc('claim_email_send', { ...claim, confirmed: false })).error).not.toBeNull();
    const concurrent = await Promise.all([fixture.admin.rpc('claim_email_send', claim), fixture.admin.rpc('claim_email_send', claim)]);
    expect(concurrent.filter(r => !r.error)).toHaveLength(1);
    const provider = randomUUID(); const now = new Date().toISOString();
    expect((await fixture.admin.from('email_logs').update({ provider_id: provider, status: 'submitted', submitted_at: now }).eq('id', draft.data!)).error).toBeNull();
    expect((await fixture.client.rpc('record_email_event', { provider, event_status: 'delivered', event_time: now })).error).not.toBeNull();
    expect((await fixture.admin.rpc('record_email_event', { provider, event_status: 'delivered', event_time: now })).data).toBe(true);
    expect((await fixture.admin.rpc('record_email_event', { provider, event_status: 'submitted', event_time: new Date(Date.now() + 1000).toISOString() })).data).toBe(true);
    expect((await fixture.client.from('email_logs').select('status').eq('id', draft.data!).single()).data?.status).toBe('delivered');
    expect((await fixture.admin.rpc('claim_email_send', claim)).error).not.toBeNull();
    const notification = await fixture.admin.from('notifications').insert({ business_id: fixture.businessId, user_id: actor, event_type: 'quotation.accepted', message: 'A fictional quotation was accepted.', destination_path: '/dashboard/quotations' }).select('id').single(); expect(notification.error).toBeNull();
    const accountEmail = (await fixture.client.auth.getUser()).data.user!.email!;
    const copy = { target_business: fixture.businessId, actor, notification: notification.data!.id, envelope: { ...args.envelope, to: [accountEmail] } };
    expect((await fixture.admin.rpc('create_notification_email', copy)).error).not.toBeNull();
    expect((await fixture.client.from('notification_preferences').insert({ business_id: fixture.businessId, user_id: actor, email_notifications: true })).error).toBeNull();
    expect((await fixture.admin.rpc('create_notification_email', { ...copy, envelope: args.envelope })).error).not.toBeNull();
    expect((await fixture.admin.rpc('create_notification_email', copy)).error).toBeNull();
  } finally { await fixture.cleanup(); await other.cleanup(); }
});
test('email composer saves reviewed content without sending and displays real configuration', async ({ page }) => {
  const fixture = await localWorkspace();
  try {
    const customer = await fixture.client.rpc('save_customer', { target_business: fixture.businessId, customer: null!, details: { full_name: 'Composer Fixture', email: 'composer@example.invalid', addresses: [], internal_notes: '' } }); expect(customer.error).toBeNull();
    await fixture.login(page); await page.goto(`/dashboard/emails/new?customer=${customer.data}`);
    await page.getByLabel('Subject', { exact: true }).fill('A reviewed test draft'); await page.getByLabel('Message', { exact: true }).fill('This fictional message must remain unsent.');
    await page.getByRole('button', { name: 'Save draft for review' }).click(); await expect(page.getByRole('heading', { name: 'Review email' })).toBeVisible();
    await expect(page.getByText('This fictional message must remain unsent.')).toBeVisible();
    const records = await fixture.client.from('email_logs').select('status,recipient,confirmed_at,provider_id').eq('business_id', fixture.businessId);
    expect(records.data).toEqual([{ status: 'draft', recipient: 'composer@example.invalid', confirmed_at: null, provider_id: null }]);
    await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const button = page.getByRole('button', { name: 'Confirm and send email' });
    if (await button.isEnabled()) { page.once('dialog', d => d.dismiss()); await button.click(); } else await expect(page.getByRole('status').filter({ hasText: 'Email delivery is not configured' })).toBeVisible();
    expect((await fixture.client.from('email_logs').select('status').eq('business_id', fixture.businessId).single()).data?.status).toBe('draft');
    const actor = (await fixture.client.auth.getUser()).data.user!.id;
    expect((await fixture.client.from('notification_preferences').insert({ business_id: fixture.businessId, user_id: actor, email_notifications: true })).error).toBeNull();
    expect((await fixture.admin.from('notifications').insert({ business_id: fixture.businessId, user_id: actor, event_type: 'quotation.accepted', message: 'Fictional acceptance notification.', destination_path: '/dashboard/quotations' })).error).toBeNull();
    await page.goto('/dashboard/notifications'); await page.getByRole('button', { name: 'Review email copy' }).click(); await expect(page.getByRole('heading', { name: 'Review email' })).toBeVisible(); await expect(page.getByText('Fictional acceptance notification.', { exact: false })).toBeVisible();
    const copies = await fixture.client.from('email_logs').select('status,template').eq('business_id', fixture.businessId).eq('template', 'quotation_accepted'); expect(copies.data).toEqual([{ status: 'draft', template: 'quotation_accepted' }]);
  } finally { await fixture.cleanup(); }
});
