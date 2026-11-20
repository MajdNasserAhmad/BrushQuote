import { test, expect } from '@playwright/test';
import { localWorkspace } from './helpers/local-workspace';
const customer = { full_name: 'Alex Example', email: 'alex@example.invalid', phone: '+44 1234 567890', addresses: [{ label: 'Home', address: '18 Orchard Road' }], internal_notes: 'Arrange an inspection.' };
const lead = { property_address: '18 Orchard Road', property_type: 'house', room_count: '3', painting_areas: ['Walls'], room_measurements: [{ notes: 'Lounge 4m by 5m' }], wall_condition: 'Good', work_type: 'Interior painting', status: 'new', internal_notes: '' };

test('CRM RPCs isolate tenants, reject cross-business relationships, and roll back failed edits', async () => {
  const first = await localWorkspace(); const second = await localWorkspace();
  try {
    const own = await first.client.rpc('save_customer', { target_business: first.businessId, customer: null!, details: customer }); expect(own.error).toBeNull();
    const foreign = await second.client.rpc('save_customer', { target_business: second.businessId, customer: null!, details: { ...customer, full_name: 'Other Business Customer' } }); expect(foreign.error).toBeNull();
    expect((await first.client.rpc('save_customer', { target_business: second.businessId, customer: foreign.data!, details: customer })).error?.code).toBe('42501');
    expect((await first.client.rpc('save_customer', { target_business: first.businessId, customer: foreign.data!, details: customer })).error?.code).toBe('42501');
    expect((await first.client.from('customers').select('id').eq('id', foreign.data!)).data).toEqual([]);
    expect((await first.client.from('customers').insert({ business_id: first.businessId, full_name: 'Bypass audit' })).error).not.toBeNull();
    const invalid = await first.client.rpc('save_customer', { target_business: first.businessId, customer: own.data!, details: { ...customer, full_name: 'Should roll back', addresses: [{ label: 'Bad', address: 'x' }] } }); expect(invalid.error).not.toBeNull();
    expect((await first.client.from('customers').select('full_name').eq('id', own.data!).single()).data?.full_name).toBe(customer.full_name);
    expect((await first.client.from('customer_addresses').select('address').eq('customer_id', own.data!)).data).toEqual([{ address: '18 Orchard Road' }]);
    expect((await first.client.rpc('save_lead', { target_business: first.businessId, lead: null!, details: { ...lead, customer_id: foreign.data } })).error?.code).toBe('42501');
    const created = await first.client.rpc('save_lead', { target_business: first.businessId, lead: null!, details: { ...lead, customer_id: own.data } }); expect(created.error).toBeNull();
    expect((await second.client.rpc('set_crm_archived', { target_business: first.businessId, record_kind: 'lead', record_id: created.data!, archived: true })).error?.code).toBe('42501');
    expect((await first.client.rpc('save_lead', { target_business: first.businessId, lead: created.data!, details: { ...lead, customer_id: own.data, status: 'won' } })).error).toBeNull();
    const log = await first.client.from('activity_logs').select('metadata').eq('entity_id', created.data!).eq('event_type', 'lead.updated').single();
    expect(log.data?.metadata).toEqual({ previous_status: 'new', status: 'won' });
    expect((await first.client.rpc('set_crm_archived', { target_business: first.businessId, record_kind: 'customer', record_id: own.data!, archived: true })).error).toBeNull();
    expect((await first.client.rpc('save_lead', { target_business: first.businessId, lead: null!, details: { ...lead, customer_id: own.data } })).error?.code).toBe('42501');
  } finally { await first.cleanup(); await second.cleanup(); }
});

test('customers and leads can be created, edited, searched, paginated, archived and restored', async ({ page }) => {
  const fixture = await localWorkspace(); const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  try {
    await fixture.login(page);
    await page.getByRole('link', { name: 'Customers', exact: true }).click(); await page.getByRole('link', { name: 'Add customer', exact: true }).click();
    await page.getByLabel('Full name', { exact: true }).fill(customer.full_name); await page.getByLabel('Email (optional)').fill(customer.email); await page.getByLabel('Phone (optional)').fill(customer.phone); await page.getByLabel('Property addresses').fill('18 Orchard Road\n24 Oak Lane'); await page.getByLabel('Internal notes').fill(customer.internal_notes); await page.getByRole('button', { name: 'Save customer' }).click();
    await expect(page.getByRole('heading', { name: customer.full_name, exact: true })).toBeVisible(); const customerUrl = page.url();
    await page.getByRole('link', { name: 'Edit customer' }).click(); await page.getByLabel('Full name', { exact: true }).fill('Alex Updated'); await page.getByRole('button', { name: 'Save customer' }).click(); await expect(page.getByRole('heading', { name: 'Alex Updated', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Add lead' }).click(); await page.getByLabel('Property address', { exact: true }).fill(lead.property_address); await page.getByLabel('Type of painting work').fill(lead.work_type); await page.getByLabel('Number of rooms').fill('3'); await page.getByLabel('Approximate room dimensions').fill('Lounge 4m by 5m'); await page.getByRole('button', { name: 'Save lead' }).click();
    await expect(page.getByRole('heading', { name: lead.property_address, exact: true })).toBeVisible(); const leadUrl = page.url();
    await page.getByRole('link', { name: 'Edit lead' }).click(); await page.getByLabel('Status', { exact: true }).selectOption('contacted'); await page.getByRole('button', { name: 'Save lead' }).click(); await expect(page.getByText('Contacted', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Archive lead', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await expect(page.getByText('Archived lead', { exact: true })).not.toBeVisible();
    await page.getByRole('button', { name: 'Archive lead', exact: true }).click(); await page.getByRole('button', { name: 'Confirm archive' }).click(); await expect(page.getByText('Archived lead', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Restore lead', exact: true }).click(); await page.getByRole('button', { name: 'Confirm restore' }).click(); await expect(page.getByRole('link', { name: 'Edit lead' })).toBeVisible();
    await page.getByRole('link', { name: 'All leads' }).click(); await page.getByLabel('Search leads').fill('Orchard'); await page.getByLabel('Status', { exact: true }).selectOption('contacted'); await page.getByRole('button', { name: 'Apply filters' }).click(); await expect(page.getByRole('link', { name: lead.property_address })).toBeVisible();
    await page.getByLabel('Status', { exact: true }).selectOption('lost'); await page.getByRole('button', { name: 'Apply filters' }).click(); await expect(page.getByRole('heading', { name: 'No leads found' })).toBeVisible();
    for (let i = 0; i < 10; i++) expect((await fixture.client.rpc('save_customer', { target_business: fixture.businessId, customer: null!, details: { ...customer, full_name: `Pagination Person ${i}` } })).error).toBeNull();
    await page.goto('/dashboard/customers?sort=name'); await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(10); await page.getByRole('link', { name: 'Next', exact: true }).click(); await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
    await page.getByLabel('Search customers').fill('Alex'); await page.getByRole('button', { name: 'Apply filters' }).click(); await expect(page.getByRole('link', { name: 'Alex Updated', exact: true })).toBeVisible();
    await page.goto(customerUrl); await page.getByRole('button', { name: 'Archive customer', exact: true }).click(); await page.getByRole('button', { name: 'Confirm archive' }).click(); await expect(page.getByText('Archived customer', { exact: true })).toBeVisible();
    await page.goto('/dashboard/customers?view=archived'); await expect(page.getByRole('link', { name: 'Alex Updated', exact: true })).toBeVisible();
    await page.goto(leadUrl); await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  } finally { await fixture.cleanup(); }
});
