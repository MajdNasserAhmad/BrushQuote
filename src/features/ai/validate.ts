import type { AISuggestion, GenerateInput } from './schema';
import { AIError } from '@/lib/ai/errors';
export function validateSuggestion(data: AISuggestion, task: GenerateInput['task'], facts: Record<string, unknown>, serviceIds: string[], workerIds: string[]) {
  if (data.quote_items !== null) {
    if (task !== 'quote_generator') throw new AIError('invalid_output');
    const source = JSON.stringify(facts);
    for (const item of data.quote_items) {
      if (!serviceIds.includes(item.service_id)) throw new AIError('invalid_output');
      if (item.quantity !== null && (!item.measurement_evidence || !source.includes(item.measurement_evidence) || !/\d/.test(item.measurement_evidence) || Number(item.quantity) <= 0)) throw new AIError('invalid_output');
    }
  }
  if (data.schedule) {
    if (task !== 'job_planner' || data.schedule.worker_ids.some(id => !workerIds.includes(id)) || new Set(data.schedule.worker_ids).size !== data.schedule.worker_ids.length || data.schedule.ends_local <= data.schedule.starts_local) throw new AIError('invalid_output');
    try { new Intl.DateTimeFormat('en', { timeZone: data.schedule.timezone }); } catch { throw new AIError('invalid_output'); }
    // The final save RPC remains responsible for DST and exact cross-table collisions.
  }
  if ((data.email && task !== 'email_assistant') || (data.observations && task !== 'photo_analyzer') || (task === 'email_assistant' && !data.email) || (task === 'photo_analyzer' && !data.observations?.length)) throw new AIError('invalid_output');
}
