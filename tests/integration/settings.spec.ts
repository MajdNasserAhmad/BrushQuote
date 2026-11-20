import { test, expect } from '@playwright/test';
import { localWorkspace } from './helpers/local-workspace';
const details = { name: 'Updated Painting', email: 'updated@example.invalid', phone: '0123456789', address: 'Fictional Updated Street', currency: 'GBP', tax_registered: false, tax_rate: '0', tax_number: '', description: 'Fictional business.', service_areas: ['Bristol'], default_terms: 'Written approval is required before work starts.' };
test('business settings and service pricing are atomic, scoped and preserve references', async () => {
  const a = await localWorkspace(); const b = await localWorkspace();
  try {
    expect((await a.client.rpc('save_business_settings', { target_business: b.businessId, details, currency_confirmed: true })).error).not.toBeNull();
    expect((await a.client.rpc('save_business_settings', { target_business: a.businessId, details: { ...details, currency: 'EUR' }, currency_confirmed: false })).error).not.toBeNull();
    expect((await a.client.rpc('save_business_settings', { target_business: a.businessId, details, currency_confirmed: false })).error).toBeNull();
    const own = (await a.client.from('business_pricing_rules').select('id,service_id').single()).data!;
    const foreign = (await b.client.from('business_pricing_rules').select('id,service_id').single()).data!;
    const service = { name: 'Updated Painting Service', description: '', unit: 'hour', unit_price: '31.125', enabled: true };
    expect((await a.client.rpc('save_service_pricing', { target_business: a.businessId, service: own.service_id, pricing: foreign.id, details: service })).error).not.toBeNull();
    expect((await a.client.from('business_services').select('name').eq('id', own.service_id).single()).data?.name).toBe('Painting');
    expect((await a.client.rpc('save_service_pricing', { target_business: a.businessId, service: foreign.service_id, pricing: foreign.id, details: service })).error).not.toBeNull();
    expect((await a.client.rpc('save_service_pricing', { target_business: a.businessId, service: own.service_id, pricing: own.id, details: service })).error).toBeNull();
    expect((await a.client.from('business_pricing_rules').select('unit_price').eq('id', own.id).single()).data?.unit_price).toBe(31.125);
    const user = (await a.client.auth.getUser()).data.user!.id; const other = (await b.client.auth.getUser()).data.user!.id;
    expect((await a.client.from('notification_preferences').insert({ business_id: a.businessId, user_id: other, email_notifications: true })).error).not.toBeNull();
    expect((await a.client.from('notification_preferences').insert({ business_id: a.businessId, user_id: user, email_notifications: true })).error).toBeNull();
    expect((await b.client.from('notification_preferences').select('user_id').eq('business_id', a.businessId)).data).toEqual([]);
  } finally { await a.cleanup(); await b.cleanup(); }
});
test('settings edits persist, default terms apply, disabled services disappear, and notifications are readable', async ({ page }) => {
  const fixture = await localWorkspace();
  try {
    const actor = (await fixture.client.auth.getUser()).data.user!.id;
    expect((await fixture.admin.from('notifications').insert({ business_id: fixture.businessId, user_id: actor, event_type: 'test', message: 'Fictional settings notification', destination_path: '/dashboard' })).error).toBeNull();
    expect((await fixture.client.rpc('save_customer', { target_business: fixture.businessId, customer: null!, details: { full_name: 'Settings Customer', email: 'settings@example.invalid', addresses: [], internal_notes: '' } })).error).toBeNull();
    await fixture.login(page); await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await page.getByLabel('Company name', { exact: true }).fill('Updated Browser Painting');
    await page.getByLabel('Default quotation terms').fill(details.default_terms); await page.getByRole('button', { name: 'Save business settings' }).click();
    await expect(page.getByText('Business settings saved.')).toBeVisible(); await page.reload(); await expect(page.getByLabel('Company name', { exact: true })).toHaveValue('Updated Browser Painting');
    await page.getByLabel('Your display name').fill('Fictional Owner'); await page.getByRole('button', { name: 'Save account preferences' }).click(); await expect(page.getByText('Account preferences saved.')).toBeVisible();
    await page.getByLabel('Allow reviewed email copies', { exact: false }).check(); await page.getByRole('button', { name: 'Save account preferences' }).click();
    await page.getByLabel('Available for new quotations').first().uncheck(); await page.getByRole('button', { name: 'Save service', exact: true }).click(); await expect(page.getByText('Service pricing saved.')).toBeVisible();
    await page.goto('/dashboard/quotations/new'); await expect(page.getByLabel('Terms and conditions')).toHaveValue(details.default_terms); await expect(page.getByLabel('Saved service').locator('option')).toHaveCount(1);
    await page.goto('/dashboard/settings'); await expect(page.getByLabel('Your display name')).toHaveValue('Fictional Owner'); await expect(page.getByLabel('Allow reviewed email copies', { exact: false })).toBeChecked();
    await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/dashboard/notifications'); await expect(page.getByText('Fictional settings notification')).toBeVisible(); await page.getByRole('button', { name: 'Mark read' }).click(); await expect(page.getByRole('button', { name: 'Mark read' })).toHaveCount(0);
  } finally { await fixture.cleanup(); }
});
