import { test, expect } from '@playwright/test';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { localSql, localWorkspace } from './helpers/local-workspace';

async function draft(fixture: Awaited<ReturnType<typeof localWorkspace>>) {
  const customer = await fixture.client.rpc('save_customer', { target_business: fixture.businessId, customer: null!, details: { full_name: 'Portal Customer', email: 'portal@example.invalid', addresses: [], internal_notes: 'PRIVATE CUSTOMER NOTE' } }); expect(customer.error).toBeNull();
  const details = { customer_id: customer.data, lead_id: '', expires_on: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), items: [{ service_id: '', description: 'Paint living room', unit: 'item', quantity: '1', unit_price: '250' }], discount_amount: '0', additional_charges: '0', tax_rate: '20', terms: 'Payment on completion', customer_notes: 'We will protect your furniture.', internal_notes: 'PRIVATE QUOTATION NOTE' };
  const quote = await fixture.client.rpc('save_quotation', { target_business: fixture.businessId, quotation: null!, expected_version: 0, details }); expect(quote.error).toBeNull();
  return { id: quote.data!, details };
}
async function publishFixture(fixture: Awaited<ReturnType<typeof localWorkspace>>, id: string, version = 1, existingPath?: string) {
  const path = existingPath ?? `${fixture.businessId}/${id}/${randomUUID()}.pdf`;
  // RPC security fixture only. The separate browser test renders a genuine PDF.
  if (!existingPath) expect((await fixture.admin.storage.from('quotation-pdfs').upload(path, Buffer.from('%PDF-1.7\nfixture'), { contentType: 'application/pdf' })).error).toBeNull();
  const token = randomBytes(32).toString('base64url'); const hash = createHash('sha256').update(token).digest('hex');
  expect((await fixture.client.rpc('publish_quotation', { target_business: fixture.businessId, quotation: id, expected_version: version, pdf_object: path, access_digest: hash })).error).toBeNull();
  return { token, hash, path };
}

test('portal tokens enforce expiry, revocation, private fields, decision serialization and message limits', async () => {
  const fixture = await localWorkspace(); const other = await localWorkspace();
  try {
    const quote = await draft(fixture); const first = await publishFixture(fixture, quote.id);
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    expect((await anon.rpc('portal_quotation', { access_digest: first.hash })).error).not.toBeNull();
    expect((await fixture.client.rpc('portal_quotation', { access_digest: first.hash })).error).not.toBeNull();
    expect((await fixture.client.from('quotation_access_tokens').select('*')).error).not.toBeNull();
    expect((await other.client.rpc('publish_quotation', { target_business: fixture.businessId, quotation: quote.id, expected_version: 2, pdf_object: first.path, access_digest: first.hash })).error?.code).toBe('42501');
    const document = await fixture.admin.rpc('portal_quotation', { access_digest: first.hash }); expect(document.error).toBeNull();
    const serialized = JSON.stringify(document.data); expect(serialized).not.toContain('PRIVATE'); expect(serialized).not.toContain('internal_notes'); expect(serialized).not.toContain('token_hash'); expect(serialized).not.toContain('logo_path');
    expect((await fixture.client.rpc('save_quotation', { target_business: fixture.businessId, quotation: quote.id, expected_version: 2, details: quote.details })).error?.code).toBe('40001');
    const rotated = await publishFixture(fixture, quote.id, 2, first.path);
    expect((await fixture.admin.rpc('portal_quotation', { access_digest: first.hash })).data).toBeNull();
    expect((await fixture.admin.rpc('respond_to_quotation', { access_digest: first.hash, decision: 'accepted', message: '', message_request: randomUUID() })).error?.code).toBe('42501');
    const decisions = await Promise.all(['accepted', 'rejected'].map(decision => fixture.admin.rpc('respond_to_quotation', { access_digest: rotated.hash, decision, message: '', message_request: randomUUID() })));
    expect(decisions.filter(r => !r.error)).toHaveLength(1); expect(decisions.filter(r => r.error?.code === '40001')).toHaveLength(1);
    const winning = decisions.find(r => !r.error)!.data!;
    expect((await fixture.admin.rpc('respond_to_quotation', { access_digest: rotated.hash, decision: winning, message: '', message_request: randomUUID() })).error).toBeNull();
    expect((await fixture.client.from('activity_logs').select('id').eq('entity_id', quote.id).in('event_type', ['quotation.accepted', 'quotation.rejected'])).data).toHaveLength(1);
    const request = randomUUID(); const message = { access_digest: rotated.hash, decision: 'message', message: 'Please contact me.', message_request: request };
    expect((await fixture.admin.rpc('respond_to_quotation', message)).error).toBeNull(); expect((await fixture.admin.rpc('respond_to_quotation', message)).error).toBeNull();
    expect((await fixture.client.from('quotation_messages').select('id').eq('quotation_id', quote.id)).data).toHaveLength(1);
    expect((await other.client.from('quotation_messages').select('id').eq('quotation_id', quote.id)).data).toEqual([]);
    for (let i = 0; i < 8; i++) expect((await fixture.admin.rpc('respond_to_quotation', { ...message, message_request: randomUUID() })).error).toBeNull();
    expect((await fixture.admin.rpc('respond_to_quotation', { ...message, message_request: randomUUID() })).error?.code).toBe('P0001');
    await localSql(`update public.quotation_access_tokens set created_at=now()-interval '2 days',expires_at=now()-interval '1 day' where quotation_id='${quote.id}'`);
    expect((await fixture.admin.rpc('portal_quotation', { access_digest: rotated.hash })).data).toBeNull();
    const expired = await draft(fixture); const expiredToken = await publishFixture(fixture, expired.id);
    await localSql(`update public.quotations set issued_on=current_date-2,expires_on=current_date-1 where id='${expired.id}'`);
    expect((await fixture.admin.rpc('portal_quotation', { access_digest: expiredToken.hash })).data).toMatchObject({ quote: { status: 'expired' } });
    expect((await fixture.admin.rpc('respond_to_quotation', { access_digest: expiredToken.hash, decision: 'accepted', message: '', message_request: randomUUID() })).error?.code).toBe('40001');
  } finally { await fixture.cleanup(); await other.cleanup(); }
});

test('confirmed publication exposes a private portal, frozen PDF and customer decision without login', async ({ page, browser }) => {
  const fixture = await localWorkspace(); const publicContext = await browser.newContext();
  try {
    const quote = await draft(fixture); await fixture.login(page); await page.goto(`/dashboard/quotations/${quote.id}`);
    await page.getByRole('button', { name: 'Issue quotation', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await fixture.client.from('quotations').select('status').eq('id', quote.id).single()).data?.status).toBe('draft');
    await page.getByRole('button', { name: 'Issue quotation', exact: true }).click(); await page.getByRole('button', { name: 'Confirm and issue' }).click();
    await expect(page.getByLabel('Customer quotation link')).toBeVisible(); const url = await page.getByLabel('Customer quotation link').inputValue();
    expect(new URL(url).pathname.split('/').pop()?.length).toBe(43);
    const portal = await publicContext.newPage(); const response = await portal.goto(url); expect(response?.status()).toBe(200); expect(response?.headers()['referrer-policy']).toBe('no-referrer'); expect(response?.headers()['cache-control']).toContain('no-store');
    await expect(portal.getByRole('heading', { name: 'Quotation BQ-000001', exact: true })).toBeVisible(); await expect(portal.locator('main')).not.toContainText('PRIVATE');
    const pdf = await portal.request.get(`${url}/pdf`); expect(pdf.status()).toBe(200); const before = await pdf.body(); expect(before.subarray(0, 5).toString()).toBe('%PDF-');
    expect((await fixture.client.from('businesses').update({ name: 'Updated Business Name' }).eq('id', fixture.businessId)).error).toBeNull();
    const after = await (await portal.request.get(`${url}/pdf`)).body(); expect(after.equals(before)).toBe(true);
    await portal.getByLabel('Message for the business').fill('Please confirm the arrival time.'); await portal.getByRole('button', { name: 'Send message', exact: true }).click(); await expect(portal.getByRole('status')).toContainText('message was sent');
    await portal.getByRole('button', { name: 'Accept quotation', exact: true }).click(); await portal.getByRole('button', { name: 'Confirm acceptance' }).click(); await expect(portal.getByRole('status')).toContainText('accepted');
    expect((await fixture.client.from('quotations').select('status,decided_at').eq('id', quote.id).single()).data).toMatchObject({ status: 'accepted', decided_at: expect.any(String) });
    await portal.reload(); await expect(portal.getByRole('button', { name: 'Accept quotation', exact: true })).toHaveCount(0); await expect(portal.getByText('Please confirm the arrival time.', { exact: true })).toBeVisible();
    await portal.setViewportSize({ width: 390, height: 844 }); expect(await portal.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.reload(); await page.getByRole('button', { name: 'Replace customer link' }).click(); await page.getByRole('button', { name: 'Confirm replacement' }).click(); await expect(page.getByLabel('Customer quotation link')).toBeVisible();
    expect((await portal.request.get(`${url}/pdf`)).status()).toBe(404); expect((await portal.request.get('http://localhost:3000/quote/invalid-token/pdf')).status()).toBe(404);
    expect((await portal.request.get('http://localhost:3000/quote/' + 'x'.repeat(43) + '/pdf')).status()).toBe(404);
  } finally { await publicContext.close(); await fixture.cleanup(); }
});
