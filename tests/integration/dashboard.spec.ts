import { test, expect } from '@playwright/test';
import { localSql, localWorkspace } from './helpers/local-workspace';
test('dashboard aggregates real tenant data, separates currencies, and exposes customer history', async ({ page }) => {
  const fixture = await localWorkspace(); const other = await localWorkspace();
  try {
    const empty = await fixture.client.rpc('dashboard_metrics', { target_business: fixture.businessId }); expect(empty.data).toMatchObject({ customers: 0, active_jobs: 0, accepted_quotations: 0, revenue: [] });
    expect((await other.client.rpc('dashboard_metrics', { target_business: fixture.businessId })).error?.code).toBe('42501');
    const customer = await fixture.client.rpc('save_customer', { target_business: fixture.businessId, customer: null!, details: { full_name: 'Dashboard Customer', email: '', phone: '', addresses: [] } }); expect(customer.error).toBeNull();
    const user = (await fixture.client.auth.getUser()).data.user!.id;
    for (const [currency, price, accepted] of [['GBP', '100', true], ['JOD', '1.235', true], ['JOD', '10000', false]] as const) {
      await localSql(`update public.businesses set currency='${currency}' where id='${fixture.businessId}'`);
      const quote = await fixture.client.rpc('save_quotation', { target_business: fixture.businessId, quotation: null!, expected_version: 0, details: { customer_id: customer.data, lead_id: '', expires_on: '2030-12-31', items: [{ service_id: '', description: 'Painting', unit: 'item', quantity: '1', unit_price: price }], discount_amount: '0', additional_charges: '0', tax_rate: '0', terms: '', customer_notes: '', internal_notes: '' } }); expect(quote.error).toBeNull();
      if (accepted) await localSql(`update public.quotations set status='accepted',approved_by='${user}',approved_at=now(),sent_at=now(),decided_at=now() where id='${quote.data}'`);
    }
    const job = await fixture.client.rpc('save_job', { target_business: fixture.businessId, job: null!, expected_version: 0, details: { customer_id: customer.data, quotation_id: '', title: 'Completed fixture work', property_address: '1 Test Street', description: '', status: 'completed', starts_local: '2026-01-01T09:00', ends_local: '2026-01-02T17:00', timezone: 'UTC', budget: '100', workers: [user], internal_notes: '' } }); expect(job.error).toBeNull();
    const metrics = await fixture.client.rpc('dashboard_metrics', { target_business: fixture.businessId });
    expect(metrics.data).toMatchObject({ customers: 1, accepted_quotations: 2, pending_quotations: 0, completed_jobs: 1, active_jobs: 0, revenue: [{ currency: 'GBP', quoted: '100.0000', accepted: '100.0000' }, { currency: 'JOD', quoted: '1.2350', accepted: '1.2350' }] });
    await fixture.login(page); await expect(page.locator('[data-metric="customers"]')).toHaveText('1'); await expect(page.locator('[data-metric="accepted_quotations"]')).toHaveText('2'); await expect(page.locator('[data-metric="completed_jobs"]')).toHaveText('1'); await expect(page.getByText('Quotation value · GBP', { exact: true })).toBeVisible(); await expect(page.getByText('Quotation value · JOD', { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto(`/dashboard/customers/${customer.data}`); await expect(page.getByRole('link', { name: 'Completed fixture work', exact: true })).toBeVisible(); await expect(page.getByRole('link', { name: /BQ-000001/ })).toBeVisible();
  } finally { await fixture.cleanup(); await other.cleanup(); }
});
