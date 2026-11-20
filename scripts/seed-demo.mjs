import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// A local-only, separate auth account prevents mixing sample and real tenants.
process.loadEnvFile('.env.local');
if (process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:54321') throw new Error('Demo seeding is restricted to the local Supabase stack.');
const credentialsFile = '.local-demo/credentials.json';
if (existsSync(credentialsFile)) throw new Error('A demo account is already recorded in .local-demo/credentials.json. Existing demo data was not changed.');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const suffix = randomUUID().slice(0, 8);
const credentials = { email: `demo-${suffix}@example.invalid`, password: randomBytes(24).toString('base64url'), userId: null, businessId: null, state: 'creating', loginUrl: 'http://localhost:3000/login' };
mkdirSync('.local-demo', { recursive: true });
function checkpoint() { writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2)); }
function requireResult(result, operation) { if (result.error) throw new Error(`${operation} failed (${result.error.code ?? 'service_error'}).`); return result.data; }
function dateAfter(days) { return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10); }
try {
  const user = requireResult(await admin.auth.admin.createUser({ email: credentials.email, password: credentials.password, email_confirm: true }), 'Create isolated demo user');
  credentials.userId = user.user.id; checkpoint();
  requireResult(await client.auth.signInWithPassword({ email: credentials.email, password: credentials.password }), 'Sign into demo');
  const businessId = requireResult(await client.rpc('onboard_business', { details: { name: 'Willow & Brush — Sample Company', slug: `demo-willow-${suffix}`, email: 'office@willow.example.invalid', phone: '0123456789', address: '12 Fictional Willow Lane, Bristol', currency: 'GBP', tax_rate: 20, service_areas: ['Bristol', 'Bath'], description: 'Fictional painting company for demonstrations only. No real customers.' }, services: [{ name: 'Interior walls', unit: 'square_metre', unit_price: '12.50' }, { name: 'Preparation labour', unit: 'hour', unit_price: '35.00' }, { name: 'Door and trim painting', unit: 'item', unit_price: '85.00' }] }), 'Create demo workspace');
  credentials.businessId = businessId; checkpoint();
  requireResult(await admin.from('businesses').update({ is_demo: true }).eq('id', businessId), 'Label demo');
  requireResult(await client.rpc('save_ai_settings', { target_business: businessId, settings: { enabled: false, vision_enabled: false, reasoning_enabled: false, daily_limit: 5, monthly_limit: 20 } }), 'Disable demo AI by default');
  const services = requireResult(await client.from('business_services').select('id,name').eq('business_id', businessId), 'Load services');
  const wallService = services.find(s => s.name === 'Interior walls').id;
  const people = [
    { name: 'Sam Parker (sample)', address: '8 Fictional Orchard Close', scope: 'Living room and hallway', area: '48', status: 'new' },
    { name: 'Alex Morgan (sample)', address: '21 Fictional Meadow Road', scope: 'Two bedrooms and landing', area: '62', status: 'inspection_required' },
    { name: 'Taylor Reed (sample)', address: '3 Fictional Studio Walk', scope: 'Small office refresh', area: '95', status: 'contacted' },
  ];
  const customerIds = [];
  for (const [index, person] of people.entries()) {
    const customer = requireResult(await client.rpc('save_customer', { target_business: businessId, customer: null, details: { full_name: person.name, email: `sample-${index}@example.invalid`, phone: '', addresses: [{ label: 'Sample property', address: person.address }], internal_notes: 'SAMPLE DATA — fictional customer. Do not enter real contact information.' } }), 'Seed customer'); customerIds.push(customer);
    const lead = requireResult(await client.rpc('save_lead', { target_business: businessId, lead: null, details: { customer_id: customer, property_address: person.address, property_type: index === 2 ? 'commercial' : 'house', room_count: String(index + 2), painting_areas: ['Walls', 'Ceilings'], room_measurements: [{ notes: `${person.area} square metres, fictional measured wall area.` }], wall_condition: 'Sample: minor filling and sanding required.', work_type: person.scope, status: person.status, internal_notes: 'Fictional demonstration request.' } }), 'Seed lead');
    requireResult(await client.rpc('save_quotation', { target_business: businessId, quotation: null, expected_version: 0, details: { customer_id: customer, lead_id: lead, expires_on: dateAfter(30), items: [{ service_id: wallService, description: `${person.scope} — sample scope`, unit: 'square_metre', quantity: person.area, unit_price: '12.50' }], discount_amount: '0', additional_charges: '0', tax_rate: '20', terms: 'SAMPLE QUOTATION — not a real offer. Confirm scope and access before starting work.', customer_notes: 'Fictional quote for demonstration.', internal_notes: 'Totals calculated by the normal quotation RPC.' } }), 'Seed quotation');
  }
  const day = dateAfter(3);
  requireResult(await client.rpc('save_job', { target_business: businessId, job: null, expected_version: 0, details: { customer_id: customerIds[0], quotation_id: '', title: 'Sample living room refresh', property_address: people[0].address, description: 'Fictional job: protect floors, prepare walls and apply two coats.', status: 'scheduled', starts_local: `${day}T09:00`, ends_local: `${day}T16:00`, timezone: 'Europe/London', budget: '950.00', workers: [credentials.userId], internal_notes: 'SAMPLE DATA — no real booking.' } }), 'Seed job');
  requireResult(await client.rpc('save_appointment', { target_business: businessId, appointment: null, expected_version: 0, details: { customer_id: customerIds[1], job_id: '', assigned_user_id: credentials.userId, title: 'Sample bedroom site visit', status: 'scheduled', starts_local: `${dateAfter(2)}T10:00`, ends_local: `${dateAfter(2)}T11:00`, timezone: 'Europe/London', notes: 'Fictional inspection. No customer has been contacted.' } }), 'Seed appointment');
  credentials.state = 'ready'; checkpoint();
  console.log('Isolated demo ready: 3 customers, 3 leads, 3 draft quotations, 1 job and 1 appointment.');
  console.log('Open .local-demo/credentials.json for the login details. No credentials were printed.');
} catch (error) {
  credentials.state = 'incomplete'; checkpoint();
  console.error(error instanceof Error ? error.message : 'Demo setup failed.');
  console.error('Only the dedicated demo account was affected. Its IDs are recorded locally for diagnosis; no existing workspace was changed.');
  process.exitCode = 1;
}
