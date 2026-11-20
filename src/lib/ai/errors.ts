export const aiErrors = {
  disabled: 'AI is disabled for this workspace.',
  configuration: 'AI is not configured. Ask the administrator to configure Groq on the server.',
  model_unavailable: 'The configured model is unavailable to this Groq account. No alternative model was used.',
  unsupported_model: 'This model has no verified capability configuration in BrushQuote.',
  vision_disabled: 'Photo analysis is disabled.',
  invalid_input: 'Check the request length, image consent and selected inputs.',
  rate_limit: 'Groq is busy or its request limit was reached. Please try again later.',
  provider_unavailable: 'Groq could not complete this request. Please try again later.',
  invalid_output: 'Groq did not return a valid complete response. Nothing was applied.',
  usage_limit: 'The workspace AI request limit has been reached.',
  plan_feature: 'This AI feature is not included in the current plan. Review your plan in Settings.',
  storage: 'AI usage could not be recorded safely. Please try again later.',
} as const;
export type AIErrorCode = keyof typeof aiErrors;
export class AIError extends Error {
  constructor(public readonly code: AIErrorCode) { super(aiErrors[code]); this.name = 'AIError'; }
}
