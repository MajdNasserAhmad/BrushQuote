import { test, expect } from '@playwright/test';
import { localSql, localWorkspace } from './helpers/local-workspace';
import type { QuotationInput } from '../../src/features/quotations/schema';
async function fixtureQuote(fixture: Awaited<ReturnType<typeof localWorkspace>>): Promise<QuotationInput> {
  const customer = await fixture.client.rpc('save_customer', { target_business: fixture.businessId, customer: null!, details: { full_name: 'Taylor Customer', email: 'taylor@example.invalid', addresses: [{ label: 'Property', address: '22 Meadow Street' }], internal_notes: 'Private customer information' } }); expect(customer.error).toBeNull();
  return { customer_id: customer.data!, lead_id: '', expires_on: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10), items: [{ service_id: '', description: 'Interior walls', unit: 'square_metre', quantity: '3', unit_price: '1.005' }], discount_amount: '0.50', additional_charges: '1.00', tax_rate: '20', terms: 'Payment due within 14 days.', customer_notes: 'Protect all furniture.', internal_notes: 'PRIVATE QUOTATION NOTE' };
}
test('quotation totals are exact, enforce bounds, isolate tenants, and reject stale edits', async () => {
  const first = await localWorkspace(); const second = await localWorkspace();
  try {
    const input = await fixtureQuote(first); const otherInput = await fixtureQuote(second);
    const preview = await first.client.rpc('preview_quotation', { target_business: first.businessId, details: input });
    expect(preview.error).toBeNull(); expect(preview.data).toMatchObject({ line_totals: ['3.02'], subtotal: '3.02', tax_amount: '0.70', total: '4.22' });
    for (const fields of [{ discount_amount: '3.03' }, { tax_rate: '100.01' }, { discount_amount: '0.001' }, { additional_charges: 'NaN' }, { items: [{ ...input.items[0], quantity: '-1' }] }, { items: [{ ...input.items[0], quantity: '9999999999', unit_price: '9999999999' }] }]) {
      expect((await first.client.rpc('preview_quotation', { target_business: first.businessId, details: { ...input, ...fields } })).error).not.toBeNull();
    }
    const save = () => first.client.rpc('save_quotation', { target_business: first.businessId, quotation: null!, expected_version: 0, details: { ...input, total: '0', subtotal: '0' } });
    const concurrent = await Promise.all([save(), save()]); for (const result of concurrent) expect(result.error).toBeNull();
    const rows = await first.client.from('quotations').select('id,reference,total,version').order('reference');
    expect(rows.data?.map(q => q.reference)).toEqual(['BQ-000001', 'BQ-000002']); expect(rows.data?.map(q => q.total)).toEqual([4.22, 4.22]);
    const id = concurrent[0].data!;
    expect((await second.client.from('quotations').select('id').eq('id', id)).data).toEqual([]);
    expect((await second.client.rpc('save_quotation', { target_business: first.businessId, quotation: id, expected_version: 1, details: otherInput })).error?.code).toBe('42501');
    expect((await first.client.rpc('save_quotation', { target_business: first.businessId, quotation: null!, expected_version: 0, details: { ...input, customer_id: otherInput.customer_id } })).error?.code).toBe('42501');
    const stale = await Promise.all([0, 1].map(() => first.client.rpc('save_quotation', { target_business: first.businessId, quotation: id, expected_version: 1, details: input })));
    expect(stale.filter(r => !r.error)).toHaveLength(1); expect(stale.filter(r => r.error?.code === '40001')).toHaveLength(1);
    expect((await first.client.from('quotation_items').select('id').eq('quotation_id', id)).data).toHaveLength(1);
    const badItem = await first.client.rpc('save_quotation', { target_business: first.businessId, quotation: id, expected_version: 2, details: { ...input, items: [{ ...input.items[0], description: '' }] } }); expect(badItem.error).not.toBeNull();
    expect((await first.client.from('quotations').select('version').eq('id', id).single()).data?.version).toBe(2);
    expect((await first.client.from('quotation_items').select('description').eq('quotation_id', id).single()).data?.description).toBe('Interior walls');
    await localSql(`update public.businesses set currency='JOD' where id='${second.businessId}'`);
    const jod = await second.client.rpc('preview_quotation', { target_business: second.businessId, details: { ...otherInput, discount_amount: '0', additional_charges: '0', tax_rate: '0', items: [{ ...otherInput.items[0], quantity: '1', unit_price: '1.2345' }] } });
    expect(jod.data).toMatchObject({ total: '1.235' });
    const zero = await first.client.rpc('preview_quotation', { target_business: first.businessId, details: { ...input, discount_amount: '3.02', additional_charges: '0' } }); expect(zero.data).toMatchObject({ total: '0.00', tax_amount: '0.00' });
  } finally { await first.cleanup(); await second.cleanup(); }
});

test('quotation editor previews authoritative totals, saves drafts and downloads a real PDF', async ({ page }) => {
  const fixture = await localWorkspace();
  try {
    const input = await fixtureQuote(fixture); await fixture.login(page);
    await page.getByRole('link', { name: 'Quotations', exact: true }).click(); await page.getByRole('link', { name: 'New quotation', exact: true }).click();
    await page.getByLabel('Customer', { exact: true }).selectOption(input.customer_id); await page.getByLabel('Description', { exact: true }).fill('Interior walls'); await page.getByLabel('Quantity', { exact: true }).fill('3'); await page.getByLabel('Unit price', { exact: true }).fill('1.005'); await page.getByLabel('Discount (GBP)').fill('0.50'); await page.getByLabel('Additional charges (GBP)').fill('1'); await page.getByLabel('VAT / tax (%)').fill('20'); await page.getByLabel('Terms and conditions').fill(input.terms); await page.getByLabel('Internal notes (private)').fill(input.internal_notes);
    await page.getByRole('button', { name: 'Preview totals' }).click(); await expect(page.getByRole('region', { name: 'Calculated totals' })).toContainText('£4.22');
    await page.getByRole('button', { name: 'Save draft' }).click(); await expect(page.getByRole('heading', { name: 'BQ-000001', exact: true })).toBeVisible();
    const response = await page.request.get(`${page.url()}/pdf`); expect(response.status()).toBe(200); expect(response.headers()['content-type']).toBe('application/pdf'); expect(response.headers()['cache-control']).toContain('no-store');
    const bytes = await response.body(); expect(bytes.subarray(0, 5).toString()).toBe('%PDF-'); expect(bytes.length).toBeGreaterThan(2000);
    await page.getByRole('link', { name: 'Edit draft' }).click(); await page.getByLabel('Quantity', { exact: true }).fill('4'); await page.getByRole('button', { name: 'Save draft' }).click(); await expect(page.getByRole('heading', { name: 'BQ-000001', exact: true })).toBeVisible();
    await expect(page.locator('main')).toContainText('£5.42');
    await page.setViewportSize({ width: 390, height: 844 }); const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(el).position !== 'absolute').slice(0, 12).map(el => ({tag: el.tagName, class: el.className, width: el.getBoundingClientRect().width}))); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), JSON.stringify(overflow)).toBe(true);
  } finally { await fixture.cleanup(); }
});
