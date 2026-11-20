import { describe, it, expect } from 'vitest';
import { appointmentSchema, localDateTime } from '../../src/features/scheduling/schema';
describe('scheduling boundaries', () => {
  it('rejects malformed dates, reverse ranges, unknown zones and injected tenant IDs', () => {
    const values = { customer_id: 'b5bfcaec-2016-4ee4-a80a-171dd87e1af2', job_id: '', assigned_user_id: 'bd9d9c9a-2589-4769-bd36-979dc099e8d7', title: 'Inspection', status: 'scheduled', starts_local: '2030-05-10T09:00', ends_local: '2030-05-10T10:00', timezone: 'Europe/London', notes: '' };
    expect(appointmentSchema.safeParse(values).success).toBe(true);
    for (const changes of [{ starts_local: '2030-02-30T09:00' }, { ends_local: values.starts_local }, { timezone: 'Imaginary/City' }, { business_id: 'injected' }]) expect(appointmentSchema.safeParse({ ...values, ...changes }).success).toBe(false);
  });
  it('formats editing values in the saved zone across summer and winter', () => {
    expect(localDateTime('2030-05-10T09:00:00Z', 'Europe/London')).toBe('2030-05-10T10:00');
    expect(localDateTime('2030-01-10T09:00:00Z', 'Europe/London')).toBe('2030-01-10T09:00');
  });
});
