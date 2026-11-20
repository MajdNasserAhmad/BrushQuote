import { test, expect } from '@playwright/test';
import { localSql, localWorkspace } from './helpers/local-workspace';
async function inputs(fixture: Awaited<ReturnType<typeof localWorkspace>>) {
  const customer = await fixture.client.rpc('save_customer', { target_business: fixture.businessId, customer: null!, details: { full_name: 'Scheduling Customer', email: '', phone: '', addresses: [], internal_notes: '' } }); expect(customer.error).toBeNull();
  const user = (await fixture.client.auth.getUser()).data.user!.id;
  const job = { customer_id: customer.data!, quotation_id: '', title: 'Living room painting', property_address: '16 Test Street', description: 'Prepare and paint.', status: 'scheduled', starts_local: '2030-05-10T09:00', ends_local: '2030-05-10T12:00', timezone: 'UTC', budget: '500.00', workers: [user], internal_notes: '' };
  const appointment = { customer_id: customer.data!, job_id: '', assigned_user_id: user, title: 'Painting inspection', status: 'scheduled', starts_local: job.starts_local, ends_local: job.ends_local, timezone: 'UTC', notes: '' };
  return { job, appointment, user };
}
test('database reservations serialize collisions, release cancelled time, and enforce tenant relationships', async () => {
  const fixture = await localWorkspace(); const other = await localWorkspace();
  try {
    const { job, appointment } = await inputs(fixture); const foreign = await inputs(other);
    const concurrent = await Promise.all([0, 1].map(() => fixture.client.rpc('save_appointment', { target_business: fixture.businessId, appointment: null!, expected_version: 0, details: appointment })));
    expect(concurrent.filter(r => !r.error)).toHaveLength(1); expect(concurrent.filter(r => r.error?.code === '23P01')).toHaveLength(1);
    const id = concurrent.find(r => !r.error)!.data!;
    expect((await fixture.client.rpc('save_job', { target_business: fixture.businessId, job: null!, expected_version: 0, details: job })).error?.code).toBe('23P01');
    expect((await fixture.client.from('jobs').select('id')).data).toEqual([]);
    const adjacent = await fixture.client.rpc('save_appointment', { target_business: fixture.businessId, appointment: null!, expected_version: 0, details: { ...appointment, starts_local: '2030-05-10T12:00', ends_local: '2030-05-10T13:00' } }); expect(adjacent.error).toBeNull();
    expect((await other.client.rpc('save_appointment', { target_business: fixture.businessId, appointment: id, expected_version: 1, details: foreign.appointment })).error?.code).toBe('42501');
    expect((await fixture.client.rpc('save_appointment', { target_business: fixture.businessId, appointment: null!, expected_version: 0, details: { ...appointment, assigned_user_id: foreign.user } })).error?.code).toBe('42501');
    expect((await fixture.client.rpc('save_appointment', { target_business: fixture.businessId, appointment: id, expected_version: 1, details: { ...appointment, status: 'cancelled' } })).error).toBeNull();
    const saved = await fixture.client.rpc('save_job', { target_business: fixture.businessId, job: null!, expected_version: 0, details: job }); expect(saved.error).toBeNull();
    expect((await fixture.client.rpc('save_appointment', { target_business: fixture.businessId, appointment: id, expected_version: 1, details: appointment })).error?.code).toBe('40001');
    const conflict = await fixture.client.rpc('save_job', { target_business: fixture.businessId, job: saved.data!, expected_version: 1, details: { ...job, ends_local: '2030-05-10T12:30' } }); expect(conflict.error?.code).toBe('23P01');
    expect((await fixture.client.from('jobs').select('version,ends_at').eq('id', saved.data!).single()).data).toMatchObject({ version: 1, ends_at: '2030-05-10T12:00:00+00:00' });
    expect((await other.client.from('jobs').select('id')).data).toEqual([]);
    for (const starts_local of ['2027-03-28T01:30', '2027-10-31T01:30']) expect((await fixture.client.rpc('save_appointment', { target_business: fixture.businessId, appointment: null!, expected_version: 0, details: { ...appointment, starts_local, ends_local: starts_local.slice(0, 11) + '03:30', timezone: 'Europe/London' } })).error?.code).toBe('22023');
    const timezone = await fixture.client.rpc('save_appointment', { target_business: fixture.businessId, appointment: null!, expected_version: 0, details: { ...appointment, starts_local: '2030-05-11T09:00', ends_local: '2030-05-11T10:00', timezone: 'Asia/Amman' } }); expect(timezone.error).toBeNull();
    expect((await fixture.client.from('appointments').select('starts_at').eq('id', timezone.data!).single()).data?.starts_at).toBe('2030-05-11T06:00:00+00:00');
  } finally { await fixture.cleanup(); await other.cleanup(); }
});
test('accepted quote conversion uses the exact quoted budget and preserves customer relationships', async ({ page }) => {
  const fixture = await localWorkspace();
  try {
    const { job, appointment, user } = await inputs(fixture);
    const quote = await fixture.client.rpc('save_quotation', { target_business: fixture.businessId, quotation: null!, expected_version: 0, details: { customer_id: job.customer_id, lead_id: '', expires_on: '2030-05-10', items: [{ service_id: '', description: 'Painting', unit: 'item', quantity: '1', unit_price: '123.45' }], discount_amount: '0', additional_charges: '0', tax_rate: '20', terms: '', customer_notes: '', internal_notes: '' } }); expect(quote.error).toBeNull();
    expect((await fixture.client.rpc('save_job', { target_business: fixture.businessId, job: null!, expected_version: 0, details: { ...job, quotation_id: quote.data } })).error?.code).toBe('42501');
    await localSql(`update public.quotations set status='accepted',approved_by='${user}',approved_at=now(),sent_at=now(),decided_at=now() where id='${quote.data}'`);
    const saved = await fixture.client.rpc('save_job', { target_business: fixture.businessId, job: null!, expected_version: 0, details: { ...job, quotation_id: quote.data, budget: '999' } }); expect(saved.error).toBeNull();
    expect((await fixture.client.from('jobs').select('budget').eq('id', saved.data!).single()).data?.budget).toBe(148.14);
    await fixture.login(page); await page.goto(`/dashboard/jobs/${saved.data}/edit`); await page.getByLabel('Job description').fill('Updated scope notes.'); await page.getByRole('button', { name: 'Save job' }).click(); await expect(page.getByRole('heading', { name: job.title, exact: true })).toBeVisible();
    expect((await fixture.client.rpc('save_job', { target_business: fixture.businessId, job: null!, expected_version: 0, details: { ...job, quotation_id: quote.data } })).error?.code).toBe('23505');
    const otherCustomer = await fixture.client.rpc('save_customer', { target_business: fixture.businessId, customer: null!, details: { full_name: 'Different Customer', email: '', phone: '', addresses: [] } });
    expect((await fixture.client.rpc('save_appointment', { target_business: fixture.businessId, appointment: null!, expected_version: 0, details: { ...appointment, job_id: saved.data, customer_id: otherCustomer.data, starts_local: '2030-05-12T09:00', ends_local: '2030-05-12T10:00' } })).error?.code).toBe('42501');
  } finally { await fixture.cleanup(); }
});
test('job and appointment screens save bookings, show conflicts, confirm cancellation and populate calendar', async ({ page }) => {
  const fixture = await localWorkspace();
  try {
    const { job } = await inputs(fixture); await fixture.login(page); await page.getByRole('link', { name: 'Jobs', exact: true }).click(); await page.getByRole('link', { name: 'New job', exact: true }).click();
    await page.getByLabel('Customer', { exact: true }).selectOption(job.customer_id); await page.getByLabel('Job title').fill(job.title); await page.getByLabel('Property address').fill(job.property_address); await page.getByLabel('Budget (GBP)').fill('500'); await page.getByLabel('Start date and time').fill(job.starts_local); await page.getByLabel('End date and time').fill(job.ends_local); await page.getByRole('button', { name: 'Save job' }).click();
    await expect(page.getByRole('heading', { name: job.title, exact: true })).toBeVisible(); const url = page.url();
    await page.getByRole('link', { name: 'Add appointment', exact: true }).click(); await page.getByLabel('Appointment title').fill('Inspection'); await page.getByLabel('Start date and time').fill(job.starts_local); await page.getByLabel('End date and time').fill(job.ends_local); await page.getByRole('button', { name: 'Save appointment' }).click(); await expect(page.locator('main').getByRole('alert')).toContainText('already has a job or appointment');
    await page.getByLabel('Start date and time').fill('2030-05-10T12:00'); await page.getByLabel('End date and time').fill('2030-05-10T13:00'); await page.getByRole('button', { name: 'Save appointment' }).click(); await expect(page.getByRole('heading', { name: 'Inspection', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Edit appointment' }).click(); await page.getByLabel('Status', { exact: true }).selectOption('cancelled'); await page.getByRole('button', { name: 'Save appointment' }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.getByRole('button', { name: 'Confirm cancellation' }).click(); await expect(page.getByText('Cancelled', { exact: true })).toBeVisible();
    await page.goto(url); await page.getByRole('link', { name: 'Edit job' }).click(); await page.getByLabel('Status', { exact: true }).selectOption('in_progress'); await page.getByRole('button', { name: 'Save job' }).click(); await expect(page.getByText('In progress', { exact: true })).toBeVisible();
    await page.goto('/dashboard/calendar?month=2030-05&view=list'); await expect(page.getByRole('link', { name: job.title, exact: true })).toBeVisible(); await expect(page.getByRole('link', { name: 'Inspection', exact: true })).toHaveCount(0); await page.getByRole('link', { name: 'Calendar view' }).click(); await expect(page.getByRole('link', { name: job.title, exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await fixture.cleanup(); }
});
