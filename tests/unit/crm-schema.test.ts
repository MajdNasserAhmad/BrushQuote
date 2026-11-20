import { describe, it, expect } from 'vitest';
import { customerSchema, leadSchema, listQuery } from '../../src/features/crm/schema';
describe('CRM input boundaries', () => {
  const customer = { full_name: 'Jane Example', email: '', phone: '', addresses: '', internal_notes: '' };
  it('permits optional contact details and trims names', () => { expect(customerSchema.parse({ ...customer, full_name: ' Jane Example ' }).full_name).toBe('Jane Example'); });
  it('rejects excessive addresses, malformed contact and injected business IDs', () => {
    for (const fields of [{ addresses: Array(11).fill('123 Test Road').join('\n') }, { phone: '<script>' }, { email: 'not-an-email' }, { business_id: 'untrusted' }]) expect(customerSchema.safeParse({ ...customer, ...fields }).success).toBe(false);
  });
  it('bounds query size, pagination and filter values', () => { expect(listQuery({ page: '-4', q: ['foo'], sort: 'sql', view: 'deleted', status: 'whatever' })).toEqual({ q: '', page: 1, sort: 'newest', view: 'active', status: 'all' }); });
  it('rejects invalid room counts and impossible dates', () => {
    const lead = { customer_id: 'e1706500-52cf-43e5-9152-67c14c4cfa3b', status: 'new', property_address: '3 Test Road', property_type: 'house', room_count: '2', painting_areas: 'Walls', room_measurements: '', wall_condition: '', work_type: 'Interior', preferred_start_date: '', additional_information: '', internal_notes: '' };
    expect(leadSchema.safeParse(lead).success).toBe(true);
    for (const room_count of ['-1', '0', '1.2', '1001']) expect(leadSchema.safeParse({ ...lead, room_count }).success).toBe(false);
    expect(leadSchema.safeParse({ ...lead, preferred_start_date: '2026-02-30' }).success).toBe(false);
  });
});
