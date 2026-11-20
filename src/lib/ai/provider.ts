import type { z } from 'zod';
import type { AITask } from './config';

export type AIImage = { url: string; bytes: number; consent: true };
export type AIRequest<T> = {
  task: AITask; instructions: string; input: string; schema: z.ZodType<T>;
  useReasoning?: boolean; images?: AIImage[];
};
export type AIUsage = { inputTokens: number | null; outputTokens: number | null; attempts: number };
export type AIResult<T> = { data: T; model: string; usage: AIUsage };
export interface AIProvider {
  verifyModel(task: AITask, useReasoning?: boolean): Promise<string>;
  generate<T>(request: AIRequest<T>, recordUsage: (usage: AIUsage) => Promise<void>): Promise<AIResult<T>>;
}
