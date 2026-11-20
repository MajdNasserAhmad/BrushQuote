# Groq AI integration ? Milestone 3

## Configuration and live verification

Groq is the only implemented AI provider. Obtain an account API key at https://console.groq.com/keys and set GROQ_API_KEY in the ignored .env.local file (or the deployment secret store). Never paste keys in chat, commit them, log them, or use NEXT_PUBLIC_ variables for secrets. Restart the server after changing configuration. No OpenAI API key is used.

The local environment now has a Groq key. Live text and synthetic-image provider contracts passed; all seven live workflow scenarios have passed after the photo/planner fixes and honest retry-usage assertion. Unit transport doubles and synthetic integration records are clearly labeled fixtures, not live AI responses. Live account/model capability verification passed for the configured models; later model changes require re-verification. Run npm.cmd run test:ai:live after configuring the key: it uses fictional email text and a generated green image, checks the account model list, validates real outputs and requires reported usage. It fails explicitly if the key is absent. This deliberately separate command makes two or more billable provider requests; normal unit/integration suites do not call Groq. Also exercise each task in the authenticated UI to verify end-to-end provider persistence after configuring a key.

## Environment variables

| Variable | Default / meaning |
| --- | --- |
| AI_PROVIDER | groq; all other providers rejected |
| GROQ_API_KEY | Required server secret |
| GROQ_TEXT_MODEL | openai/gpt-oss-20b |
| GROQ_REASONING_MODEL | openai/gpt-oss-120b; explicit request plus workspace admin enablement |
| GROQ_VISION_MODEL | qwen/qwen3.8-27b |
| AI_ENABLED | true; global kill switch |
| AI_VISION_ENABLED | true; global image switch |
| AI_MAX_OUTPUT_TOKENS | 2048; valid 256?8192 |
| AI_MAX_INPUT_CHARACTERS | 24000; valid 1000?60000, includes task instructions |
| AI_TIMEOUT_MS | 20000 per attempt; valid 1000?45000 |
| AI_MODEL_PRICING_JSON | Optional model map with decimal-string input_per_million, output_per_million and version; blank means unknown cost |

The server capability registry supports the three default models with strict structured output, and llama-3.3-70b-versatile with JSON mode plus validation. Configuring an arbitrary model does not imply compatible capabilities. Before generation, the SDK checks the account model list; unavailable models fail without silent substitution. Documentation review is distinct from account availability and actual generation verification.

## Provider and failure behavior

Code lives in src/lib/ai: provider interface, config/router, Groq adapter, typed safe errors, decimal cost estimates and workspace execution/usage tracking. All provider/network modules are server-only. SDK retries are disabled; the adapter caps the combined transient-retry/output-repair budget at three attempts. Short Retry-After values are honored; values over five seconds return a retry-later error rather than retrying too early. Network timeouts are not replayed automatically because billing may be ambiguous. One schema repair is allowed. Truncation, unexpected model substitutions and invalid outputs fail closed.

Every output passes Zod and task-specific semantic checks. The provider schema uses required nullable fields and rejects unknown properties. Schema formats/length/range constraints are enforced locally, even when stripped from the provider schema for compatibility. No model tools, SQL execution, web browsing, email sending or mutation calls are exposed.

## Tenant isolation and usage

Authenticated actions resolve getUser and current membership independently. Context retrieval scopes every query to that business and selected records. Conversations and results are private to the individual user, including other members of the same business. Public chatbot code has a separate approved-knowledge loader that never reads customers, private pricing, quotations, schedules, notes or conversations.

A service-only transaction rechecks membership and reserves a request before generation. Defaults: 20/day, 200/month, at most three requests/minute and two active requests; owners/admins can lower limits or raise them within the current 100/day, 1000/month ceilings. UTC periods apply. Failed calls and interrupted reservations count toward quotas. Reserved calls older than five minutes are marked interrupted when a new reservation is accepted. Plan-based commercial ceilings are Milestone 4 work.

Each completion reports actual prompt/output tokens, including repair calls. Unreported usage stays unknown, not zero; configured prices produce a versioned estimate only when usage is complete. Price arithmetic uses scaled integers before storing a bounded numeric estimate. No guessed provider rates are built in. Exact matching text requests may reuse a private result for 24 hours with fresh authorization/semantic checks; image results are never automatically cached. Provider prompt-prefix caching may operate automatically; the app does not claim measured cache savings.

## Features and approval

- Quote Copilot receives selected customer/lead requirements and current service rates, optionally a reviewed prior photo analysis. It returns no authoritative prices/totals. Unknown quantities stay blank; a proposed quantity requires quoted numerical evidence from the input. Review opens the normal quotation editor with current prices; the user verifies measurements and explicitly saves. PostgreSQL NUMERIC computes all final totals.
- Photo Analyzer requires both recorded customer photo consent and the member's generation confirmation. At most three tenant-authorized images are downloaded, bounded, stripped/recompressed to JPEG at no more than 1 MB each, then sent inline. Private Storage URLs are not published or sent to the browser as part of analysis. The full provider request stays below 19 MB, under the documented 20 MB limit. Results disclose confidence/limitations and cannot establish hidden defects, hazardous materials or exact dimensions.
- Email Assistant supports the seven specified purposes and four tones. Drafts are editable and never sent automatically. Resend delivery and final send confirmation belong to Milestone 4.
- Business Analyst uses authorized database aggregates: quoted/accepted values by currency/month, acceptance rate, service line values, pending quotations, active jobs and bounded follow-up candidates. It distinguishes quotation values from collected payments. The UI also displays verified figures directly. Follow-up candidates have no recorded submitted/delivered email in seven days; external communications are unknown.
- Business Assistant uses current authorized facts and up to six recent private messages (1500 characters each). Conversations are saved and can be reopened. Action buttons are fixed authorized navigation destinations, never model-created URLs.
- Job Planner receives actual worker memberships and bounded active reservations over 90 days. The owner reviews before opening the job form. Saving explicitly approves the schedule; the existing database exclusion constraints and DST checks enforce final availability. Missing working-hours/leave data is disclosed.
- Customer Chatbot is opt-in. Owners/admins approve information, FAQs, services and areas. Groq selects fact IDs; final text comes exclusively from those approved facts, preventing invented prices/appointments. Public requests require origin checks, bounded JSON, an aged HMAC challenge, consent and quota reservation. A client bucket allows at most 20/hour in addition to shared business AI limits. Without a trusted proxy IP header all visitors share the business bucket. Missing/unavailable AI displays an explicitly non-AI fallback.

## Official references reviewed

- https://console.groq.com/docs/models
- https://console.groq.com/docs/structured-outputs
- https://console.groq.com/docs/vision
- https://console.groq.com/docs/rate-limits
- https://github.com/groq/groq-typescript (also queried through Context7)

Documented capabilities were checked on 2026-11-19. Recheck provider documentation and run live contract checks when changing models.
