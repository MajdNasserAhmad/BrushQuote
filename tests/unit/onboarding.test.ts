import { describe, expect, test } from 'vitest';
import { onboardingPayload, onboardingSchema } from '../../src/features/onboarding/schema';

const valid = {
  name: 'Fictional Painting Co', slug: 'fictional-painting', email: 'test@example.invalid',
  phone: '+44 1234 567890', address: '1 Fictional Street', currency: 'GBP', tax_registered: true,
  tax_number: '', tax_rate: '20', description: 'Test fixture only', service_areas: 'Bristol, Bath',
  services: [{ name: 'Interior painting', unit: 'square_metre', unit_price: '12.3456' }],
};
describe('onboarding input boundary', () => {
  test('retains decimal prices as strings until PostgreSQL parses them', () => {
    const value = onboardingSchema.parse(valid);
    expect(onboardingPayload(value).services[0].unit_price).toBe('12.3456');
    expect(onboardingPayload(value).details.service_areas).toEqual(['Bristol', 'Bath']);
  });
  test.each(['NaN', 'Infinity', '-1', '1e4', '1.00001', '10000000000', ''])('rejects unsafe or out-of-range prices: %s', unit_price => {
    expect(onboardingSchema.safeParse({ ...valid, services: [{ ...valid.services[0], unit_price }] }).success).toBe(false);
  });
  test.each(['-1', '101', 'NaN', '20.001'])('rejects invalid tax rates: %s', tax_rate => {
    expect(onboardingSchema.safeParse({ ...valid, tax_rate }).success).toBe(false);
  });
  test('requires zero tax for an unregistered business', () => {
    expect(onboardingSchema.safeParse({ ...valid, tax_registered: false }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, tax_registered: false, tax_rate: '0' }).success).toBe(true);
  });
  test('rejects empty service lists and case-insensitive duplicates', () => {
    expect(onboardingSchema.safeParse({ ...valid, services: [] }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, services: [valid.services[0], { ...valid.services[0], name: 'INTERIOR PAINTING' }] }).success).toBe(false);
  });
  test.each(['other/business', '../admin', 'Uppercase', 'two--dashes'])('rejects unsafe public slugs: %s', slug => {
    expect(onboardingSchema.safeParse({ ...valid, slug }).success).toBe(false);
  });
  test('strips client-supplied authorization fields', () => {
    const input = onboardingSchema.parse({ ...valid, business_id: 'attacker', user_id: 'attacker', role: 'owner' });
    expect(input).not.toHaveProperty('business_id');
    expect(input).not.toHaveProperty('user_id');
    expect(input).not.toHaveProperty('role');
  });
  test('rejects blank service areas and unsupported currency', () => {
    expect(onboardingSchema.safeParse({ ...valid, service_areas: ', ,' }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, currency: 'XXX' }).success).toBe(false);
  });
});
