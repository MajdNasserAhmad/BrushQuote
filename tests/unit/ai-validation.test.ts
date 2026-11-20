import { expect, it } from 'vitest';
import { validateSuggestion } from '@/features/ai/validate';
import type { AISuggestion } from '@/features/ai/schema';
const empty: AISuggestion = { summary: 'Test suggestion', suggestions: [], questions: [], email: null, quote_items: null, schedule: null, observations: null, actions: [] };
it('rejects unauthorized service references and invented or non-numeric measurement evidence', () => {
  const quote = { ...empty, quote_items: [{ service_id: 'known', description: 'Painting', quantity: '20', measurement_evidence: '20 square metres' }] };
  expect(() => validateSuggestion(quote, 'quote_generator', { measurement: '20 square metres' }, ['known'], [])).not.toThrow();
  expect(() => validateSuggestion(quote, 'quote_generator', {}, ['known'], [])).toThrow();
  expect(() => validateSuggestion(quote, 'quote_generator', { measurement: '20 square metres' }, [], [])).toThrow();
  expect(() => validateSuggestion({ ...empty, quote_items: [{ ...quote.quote_items[0], measurement_evidence: 'No measurements' }] }, 'quote_generator', { note: 'No measurements' }, ['known'], [])).toThrow();
  expect(() => validateSuggestion({ ...empty, quote_items: [{ ...quote.quote_items[0], quantity: null, measurement_evidence: null }] }, 'quote_generator', {}, ['known'], [])).not.toThrow();
});
it('rejects unknown workers, invalid zones, reversed intervals and output from the wrong task', () => {
  const plan = { ...empty, schedule: { title: 'Test', starts_local: '2034-01-01T09:00', ends_local: '2034-01-01T17:00', timezone: 'UTC', worker_ids: ['member'], notes: '' } };
  expect(() => validateSuggestion(plan, 'job_planner', {}, [], ['member'])).not.toThrow();
  expect(() => validateSuggestion(plan, 'job_planner', {}, [], [])).toThrow();
  expect(() => validateSuggestion(plan, 'email_assistant', {}, [], ['member'])).toThrow();
  expect(() => validateSuggestion({ ...plan, schedule: { ...plan.schedule, timezone: 'Not/AZone' } }, 'job_planner', {}, [], ['member'])).toThrow();
  expect(() => validateSuggestion({ ...plan, schedule: { ...plan.schedule, ends_local: plan.schedule.starts_local } }, 'job_planner', {}, [], ['member'])).toThrow();
});
it('requires an actual email or photo observation for those tasks', () => {
  expect(() => validateSuggestion(empty, 'email_assistant', {}, [], [])).toThrow();
  expect(() => validateSuggestion(empty, 'photo_analyzer', {}, [], [])).toThrow();
});
