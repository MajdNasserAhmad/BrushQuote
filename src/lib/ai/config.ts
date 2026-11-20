import 'server-only';
import { z } from 'zod';
import { AIError } from './errors';

// Capabilities are reviewed against Groq's official model/structured-output/vision docs.
// Account availability is checked separately through models.list before generation.
export const modelCapabilities = {
  'openai/gpt-oss-20b': { strict: true, vision: false },
  'openai/gpt-oss-120b': { strict: true, vision: false },
  'qwen/qwen3.8-27b': { strict: true, vision: true },
  'llama-3.3-70b-versatile': { strict: false, vision: false },
} as const;
export const aiTasks = ['quote_generator', 'photo_analyzer', 'email_assistant', 'business_analyst', 'customer_chatbot', 'job_planner', 'business_assistant'] as const;
export type AITask = typeof aiTasks[number];
const flag = z.enum(['true', 'false']).transform(v => v === 'true');
const environmentSchema = z.object({
  AI_PROVIDER: z.literal('groq').default('groq'),
  AI_ENABLED: flag.default(true), AI_VISION_ENABLED: flag.default(true),
  GROQ_API_KEY: z.string().trim().default(''),
  GROQ_TEXT_MODEL: z.string().default('openai/gpt-oss-20b'),
  GROQ_REASONING_MODEL: z.string().default('openai/gpt-oss-120b'),
  GROQ_VISION_MODEL: z.string().default('qwen/qwen3.8-27b'),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(256).max(8192).default(2048),
  AI_MAX_INPUT_CHARACTERS: z.coerce.number().int().min(1000).max(60000).default(24000),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(45000).default(20000),
});
export function aiConfig(environment: Record<string, string | undefined> = process.env) {
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) throw new AIError('configuration');
  return parsed.data;
}
export type AIConfig = ReturnType<typeof aiConfig>;
export function routeModel(task: AITask, config: AIConfig, useReasoning = false) {
  if (!config.AI_ENABLED) throw new AIError('disabled');
  if (!config.GROQ_API_KEY) throw new AIError('configuration');
  if (task === 'photo_analyzer' && !config.AI_VISION_ENABLED) throw new AIError('vision_disabled');
  const model = task === 'photo_analyzer' ? config.GROQ_VISION_MODEL : useReasoning ? config.GROQ_REASONING_MODEL : config.GROQ_TEXT_MODEL;
  if (!Object.hasOwn(modelCapabilities, model)) throw new AIError('unsupported_model');
  const capabilities = modelCapabilities[model as keyof typeof modelCapabilities];
  if (task === 'photo_analyzer' && !capabilities.vision) throw new AIError('unsupported_model');
  return { model, ...capabilities };
}
