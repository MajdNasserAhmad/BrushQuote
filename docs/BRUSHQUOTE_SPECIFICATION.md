# PROJECT: BRUSHQUOTE
## Build a Complete AI-Powered Full-Stack SaaS Platform

Act as a senior software architect, full-stack developer, AI engineer, database architect, cybersecurity engineer, and professional UI/UX designer.

Your task is to build a complete, functional, production-quality SaaS application called **BrushQuote**.

BrushQuote is an AI-powered business management platform for painting and decorating companies.

This is a real product intended to be deployed, used by real businesses, and eventually monetized through subscriptions.

Do not build a simple demo, static mockup, or tutorial project.

Build the actual application with working frontend, backend, authentication, database, AI integration, file storage, business logic, and testing.

---

# 1. TECHNOLOGY STACK

Use the following architecture:

Frontend:
- Next.js App Router.
- React.
- TypeScript with strict mode.
- Tailwind CSS.
- shadcn/ui.
- Lucide icons.
- React Hook Form.
- Zod.

Backend:
- Next.js server actions and route handlers.
- Supabase PostgreSQL.
- Supabase Authentication.
- Supabase Storage.
- Server-side authorization.

AI:
- Groq API as the primary and initially exclusive AI provider.
- Groq TypeScript SDK (groq-sdk).
- Configurable AI model routing.
- Structured Outputs.
- Vision-capable model support.

Additional services:
- Resend for emails.
- PDF generation using a reliable TypeScript-compatible library.
- Playwright for end-to-end testing.
- Vitest for unit testing.
- GitHub for version control.
- Vercel for deployment.

Use current stable compatible versions.

Before installing dependencies, inspect the existing repository and preserve any working setup.

Do not replace existing configuration files unnecessarily.

---

# 2. PRODUCT IDENTITY AND DESIGN

Brand: BrushQuote.

Product description:
AI-powered business management software for painting and decorating contractors.

Design a premium commercial SaaS interface.

Visual direction:
- Modern and professional.
- Light theme.
- White backgrounds.
- Soft neutral surfaces.
- Deep navy typography.
- Emerald green accent color.
- Subtle shadows.
- Rounded cards.
- Clean layouts.
- Beautiful typography.
- Consistent spacing.
- Smooth transitions.
- Excellent mobile responsiveness.

The application must look like a product that businesses would genuinely pay for.

Avoid generic AI dashboard designs.

Build a cohesive design system and reuse components throughout the application.

Create:
- Logo and brand identity.
- Sidebar navigation.
- Top navigation.
- Breadcrumbs.
- Reusable dashboard cards.
- Tables.
- Forms.
- Modals.
- Toast notifications.
- Loading skeletons.
- Empty states.
- Error states.

---

# 3. PUBLIC MARKETING WEBSITE

Build a complete marketing website.

Pages:

- Home.
- Features.
- How It Works.
- Pricing.
- About.
- Contact.
- Login.
- Register.

Landing page sections:

1. Professional hero section.
2. Strong headline and CTA.
3. Dashboard preview.
4. AI feature showcase.
5. Business management features.
6. How it works.
7. Pricing plans.
8. Testimonials using clearly labeled sample content.
9. FAQ.
10. Footer.

Use professional copywriting.

Make the marketing website responsive and visually impressive.

---

# 4. AUTHENTICATION AND BUSINESS ONBOARDING

Implement complete authentication using Supabase.

Features:
- Email registration.
- Login.
- Logout.
- Password reset.
- Email verification.
- Persistent sessions.
- Protected dashboard routes.
- Server-side authentication checks.

Business onboarding should collect:

- Company name.
- Company logo.
- Business email.
- Phone number.
- Address.
- Currency.
- Tax/VAT configuration.
- Services.
- Service areas.
- Business description.
- Default pricing rules.

Each registered business must have its own isolated workspace.

Support business ownership and team membership architecture, even if team invitations are implemented in a later phase.

---

# 5. BUSINESS DASHBOARD

Create a complete dashboard using actual database data.

Display:

- Total customers.
- New leads.
- Pending quotations.
- Accepted quotations.
- Rejected quotations.
- Active jobs.
- Completed jobs.
- Total quoted revenue.
- Accepted revenue.

Include:

- Revenue charts.
- Recent activity.
- Recent customers.
- Recent quote requests.
- Upcoming appointments.
- Recent quotations.
- AI business insights.
- Quick actions.

All statistics must be calculated using real database queries.

Never use random numbers or hardcoded dashboard statistics.

---

# 6. LEAD MANAGEMENT

Build a complete CRM-style lead management system.

Features:

- Create leads.
- View leads.
- Edit leads.
- Delete or archive leads with confirmation.
- Search.
- Filtering.
- Sorting.
- Pagination.
- Internal notes.
- Lead activity history.
- Customer information.
- Property information.
- Uploaded photographs.
- Convert leads into quotations.

Lead statuses:

- New.
- Contacted.
- Inspection Required.
- Quote Sent.
- Won.
- Lost.

Create a beautiful lead details page.

---

# 7. CUSTOMER QUOTATION REQUEST SYSTEM

Every business should receive a unique public URL.

Example:

/request/company-name

Customers must be able to request quotations without creating an account.

Create a beautiful multi-step form.

Collect:

- Full name.
- Email.
- Phone number.
- Property address.
- Property type.
- Number of rooms.
- Areas requiring painting.
- Approximate room dimensions.
- Wall condition.
- Type of painting work.
- Preferred start date.
- Additional information.
- Multiple photographs.

Validate all fields.

Store submissions in Supabase.

Store photographs securely in Supabase Storage.

Notify the relevant business about new requests.

Implement anti-spam protection and rate limiting.

Never expose private business records through public endpoints.

---

# 8. CUSTOMER MANAGEMENT

Create a customer management system.

Customer profiles should contain:

- Full name.
- Email.
- Phone.
- Addresses.
- Previous quotation requests.
- Quotations.
- Jobs.
- Communication history.
- Internal notes.

Implement search, filtering, sorting, and pagination.

---

# 9. QUOTATION BUILDER

Build a professional quotation creation and editing system.

Businesses can:

- Select customers.
- Select leads.
- Add quotation items.
- Edit descriptions.
- Set quantities.
- Set unit prices.
- Apply discounts.
- Configure VAT.
- Add additional charges.
- Add terms and conditions.
- Set expiration dates.
- Add custom notes.

Calculate all financial values using deterministic server-side code.

Do not allow AI to calculate authoritative financial totals.

Generate professional branded PDFs containing:

- Company logo.
- Company details.
- Customer details.
- Quotation number.
- Date.
- Expiration date.
- Line items.
- Quantities.
- Prices.
- Subtotal.
- Discounts.
- VAT.
- Final total.
- Terms and conditions.

Allow PDF downloads.

Allow quotations to be emailed through Resend.

Every quotation must have a unique reference number.

---

# 10. CUSTOMER QUOTATION PORTAL

Every quotation must have a secure public customer-facing URL.

Customers can:

- View quotations.
- Download PDFs.
- Accept quotations.
- Reject quotations.
- Leave messages.

Acceptance and rejection must update the database.

Use secure, random access tokens.

Never expose sequential database IDs as authorization tokens.

Log customer decisions with timestamps.

---

# 11. JOB MANAGEMENT

Implement a complete job management system.

Job information:

- Job title.
- Customer.
- Property address.
- Description.
- Start date.
- Completion date.
- Assigned workers.
- Budget.
- Status.
- Internal notes.

Statuses:

- Scheduled.
- In Progress.
- Completed.
- Cancelled.

Provide:

- Calendar view.
- List view.
- Job details.
- Job editing.
- Job history.
- Appointment scheduling.

When a quotation is accepted, allow the business to convert it into a job.

---

# 12. GROQ AI INTEGRATION — CRITICAL REQUIREMENT

This application must use Groq as its primary AI provider.

Do not use OpenAI API for the initial implementation.

Do not require an OpenAI API key.

Use the official Groq TypeScript SDK.

Install:

groq-sdk

Groq API base URL:

https://api.groq.com/openai/v1

Use the official Groq documentation:
https://console.groq.com/docs

Model documentation:
https://console.groq.com/docs/models

Vision documentation:
https://console.groq.com/docs/vision

Structured Outputs:
https://console.groq.com/docs/structured-outputs

Rate limits:
https://console.groq.com/docs/rate-limits

Implement a centralized AI architecture.

Create a dedicated AI service directory.

Suggested structure:

src/
  lib/
    ai/
      index.ts
      provider.ts
      groq-provider.ts
      model-router.ts
      schemas/
      prompts/
      usage-tracker.ts
      errors.ts
      tasks/
        quote-generator.ts
        photo-analyzer.ts
        email-assistant.ts
        business-analyst.ts
        customer-chatbot.ts
        job-planner.ts

Requirements:

- All Groq requests must happen server-side.
- Never expose API keys to the frontend.
- Use environment variables.
- Validate all inputs.
- Validate structured AI outputs with Zod.
- Implement timeout handling.
- Implement safe retries for transient failures.
- Handle HTTP 429 rate-limit responses.
- Respect retry information when available.
- Use exponential backoff with a maximum retry count.
- Never retry indefinitely.
- Track usage and token counts.
- Track estimated API costs when pricing information is configured.
- Add per-business usage limits.
- Cache appropriate repeated requests.
- Support configurable models.
- Provide clear error messages.
- Allow AI features to be disabled when credentials are missing.

Create an AI provider interface so another provider can be added in the future without rewriting application features.

However, implement Groq only for the initial version.

Do not create a fake fallback that pretends AI responses came from Groq.

If GROQ_API_KEY is missing, show a clear configuration message.

---

# 13. GROQ MODEL ROUTING

Use configurable environment variables.

Initial defaults:

AI_PROVIDER=groq

GROQ_API_KEY=

GROQ_TEXT_MODEL=openai/gpt-oss-20b

GROQ_REASONING_MODEL=openai/gpt-oss-120b

GROQ_VISION_MODEL=qwen/qwen3.8-27b

AI_ENABLED=true

AI_VISION_ENABLED=true

These model IDs must remain configurable.

Before using a model, verify it is available and supported by the configured Groq account.

Use:

GPT-OSS 20B:
- Default AI assistant.
- Email generation.
- Quote generation.
- Structured data extraction.
- Normal business questions.

GPT-OSS 120B:
- More complex reasoning.
- More complicated business analysis.
- Tasks where additional model capability is justified.

Qwen 3.8 27B:
- Photo analysis.
- Visual understanding.
- Image-related tasks.
- Structured visual reports.

The vision model is currently a preview model. Handle unavailability gracefully.

Do not assume that every model has identical capabilities.

Do not use an unsupported parameter simply because it exists in the OpenAI SDK.

Use Groq-supported API features and consult its current documentation.

Prefer strict Structured Outputs when supported by the selected model.

For models without strict structured-output support, use JSON mode, Zod validation, and controlled retries.

---

# 14. AI FEATURE 1 — AI QUOTE COPILOT

Build an AI quotation assistant.

The user can select a customer and provide:

- Property information.
- Room dimensions.
- Painting requirements.
- Services.
- Uploaded photographs.
- Surface conditions.
- Company pricing rules.

AI should generate a quotation draft with:

- Suggested work descriptions.
- Preparation work.
- Materials.
- Labor requirements.
- Suggested line items.
- Estimated quantities when sufficient measurements are supplied.
- Estimated project duration.
- Questions requiring clarification.

Important:

AI must never invent measurements, material prices, or labor costs.

If information is missing, explicitly request it.

Use the business's actual configured prices to generate financial estimates.

Calculate final totals with server-side business logic.

The AI-generated quotation must be editable.

The owner must explicitly approve the quotation before it is sent to the customer.

---

# 15. AI FEATURE 2 — AI PHOTO ANALYZER

Build an AI photo analysis feature.

Businesses can analyze photographs uploaded by customers.

Use the configured Groq vision model.

Analyze visible conditions such as:

- Peeling paint.
- Visible cracks.
- Damaged paintwork.
- Surface imperfections.
- Stains.
- Visible holes.
- Areas requiring preparation.

Generate a structured report:

1. General observations.
2. Visible surface conditions.
3. Suggested preparation.
4. Suggested painting work.
5. Questions for the customer.
6. Issues requiring an in-person inspection.
7. Confidence and limitations.

Do not claim to identify hidden structural issues, hazardous materials, exact dimensions, or problems that cannot reliably be determined from a photograph.

Image handling:

- Validate file type.
- Validate file size.
- Compress large images.
- Use secure temporary signed URLs for private Supabase Storage files.
- Never make customer photographs publicly accessible.
- Respect the selected model's image limits.
- For Qwen 3.8 27B, send no more than three images per request.
- Keep image requests within the documented size limits.

Require appropriate user consent before transmitting customer photographs to Groq.

Clearly label AI observations as suggestions, not professional inspections.

---

# 16. AI FEATURE 3 — AI EMAIL ASSISTANT

Create an AI email writing assistant.

It should generate:

- New customer replies.
- Quotation introductions.
- Quotation follow-ups.
- Appointment confirmations.
- Payment reminders.
- Thank-you messages.
- Professional customer responses.

Allow selection of tone:

- Professional.
- Friendly.
- Formal.
- Short and direct.

Allow users to edit generated emails.

Do not automatically send AI-generated emails.

Require explicit user confirmation before sending.

Use Resend for actual email delivery.

---

# 17. AI FEATURE 4 — AI BUSINESS ANALYST

Create a business intelligence assistant.

Users should be able to ask:

- How much revenue did I generate this month?
- How many quotations were accepted?
- Which services generate the most revenue?
- Which customers should I follow up with?
- Which quotations are still waiting?
- How does this month compare to last month?
- What is my quotation acceptance rate?

Important architecture:

AI must not invent statistics.

Implement authorized server-side data retrieval functions.

Use real database queries to calculate financial and business statistics.

Pass the resulting verified information to Groq for interpretation.

Do not allow the model to execute arbitrary SQL.

Do not send entire database tables to the model.

Enforce tenant isolation in every data retrieval function.

---

# 18. AI FEATURE 5 — AI CUSTOMER CHATBOT

Create an optional AI chatbot for every business.

Businesses can enable it on their public website.

The chatbot should answer questions using approved business information:

- Services.
- Business hours.
- Service areas.
- Pricing policies.
- Frequently asked questions.
- Quotation process.

It should direct customers to the quote request form.

Each business must have a separate knowledge context.

Never allow the chatbot to access private customer records, quotations, internal notes, or another business's data.

It must not invent prices or promise appointments.

Provide a fallback when the AI is unavailable.

---

# 19. AI FEATURE 6 — AI JOB PLANNER

Create an AI job planning assistant.

Use:

- Job size.
- Required services.
- Project requirements.
- Available workers.
- Worker availability.
- Start dates.
- Estimated duration.

Generate suggested schedules.

The AI must return structured suggestions.

The business owner must approve schedules before they are saved.

Prevent conflicting appointments through deterministic scheduling validation.

---

# 20. AI FEATURE 7 — CHAT WITH YOUR BUSINESS

Create a central AI assistant inside the dashboard.

Users should be able to ask questions in natural language.

Examples:

"Show me all quotations awaiting approval."

"How much revenue did I make this month?"

"Which customers haven't received a follow-up?"

"Summarize my active jobs."

"Create a draft email for this customer."

Support contextual conversations.

Add relevant action buttons to AI responses.

For example:

- View quotations.
- Open customer.
- Create email draft.
- View job.
- Generate report.

All actions must use properly authorized backend functions.

AI must never execute destructive or external actions without explicit user confirmation.

---

# 21. AI COMMAND CENTER

Create a dedicated AI workspace in the dashboard.

Include cards for:

- Quote Copilot.
- Photo Analyzer.
- Email Assistant.
- Business Analyst.
- Customer Chatbot.
- Job Planner.
- General Business Assistant.

Include:

- Recent AI activity.
- AI usage statistics.
- Token consumption.
- Estimated costs.
- Model information.
- Usage limits.
- AI settings.

Create a premium conversational interface.

AI responses should support structured cards, summaries, and editable generated content.

---

# 22. AI COST CONTROL

Cost efficiency is important.

Implement:

- Configurable models.
- Lower-cost default model.
- Higher-capability model only when necessary.
- Maximum output token settings.
- Input length limits.
- Image compression.
- Prompt caching where applicable.
- Reuse of existing AI results when appropriate.
- Per-business daily and monthly limits.
- Usage tracking.
- Rate-limit handling.
- Admin controls to disable expensive features.

Do not make unnecessary AI calls.

Use deterministic application logic whenever AI is not needed.

For example:
- Calculating VAT must not require AI.
- Adding quotation totals must not require AI.
- Calculating revenue must not require AI.
- Checking appointment availability must not require AI.

AI should be used for language, interpretation, suggestions, and image understanding.

Create configurable subscription limits:

Free:
- Limited AI requests.
- Limited quote generation.
- Basic dashboard.

Starter:
- Higher AI limits.
- AI email assistant.
- AI quote copilot.

Professional:
- Higher AI limits.
- Photo analysis.
- Business analyst.
- Customer chatbot.

These are initial product tiers, not a requirement to activate a paid payment gateway immediately.

---

# 23. EMAIL SYSTEM

Integrate Resend.

Use professional HTML templates.

Email types:

- New quote request.
- Quotation sent.
- Quotation accepted.
- Quotation rejected.
- Appointment confirmation.
- Job updates.

Track email delivery states where supported.

If credentials are missing, show a development configuration message.

Never claim that an email was sent if it was not.

---

# 24. SETTINGS

Create a complete settings area.

Business settings:
- Company profile.
- Logo.
- Contact details.
- Address.
- Services.
- Pricing rules.
- Currency.
- VAT.
- Default quotation terms.

AI settings:
- Enable/disable AI.
- Model selection from supported configured models.
- AI usage statistics.
- Usage limits.
- Vision settings.
- Chatbot settings.

Account settings:
- User profile.
- Password.
- Notifications.
- Security.

---

# 25. DATABASE DESIGN

Use Supabase PostgreSQL.

Create proper relational tables for:

- businesses
- profiles
- business_memberships
- business_services
- business_pricing_rules
- customers
- leads
- lead_photos
- quotations
- quotation_items
- quotation_access_tokens
- jobs
- appointments
- job_assignments
- activity_logs
- email_logs
- ai_usage
- ai_conversations
- ai_messages
- business_chatbot_settings
- business_faqs
- notifications

Requirements:

- Foreign keys.
- Appropriate indexes.
- Constraints.
- Timestamps.
- Proper relationships.
- Multi-tenant isolation.
- Row Level Security.
- Secure storage policies.

Every business-owned record must contain the correct business identifier.

Never trust a client-supplied business ID for authorization.

Derive the authenticated user's permissions on the server.

Provide database migrations.

Keep demo seed data separate from production data.

---

# 26. SECURITY

Implement:

- Server-side authorization.
- Secure authentication.
- Row Level Security.
- Input validation.
- Secure file uploads.
- Rate limiting.
- CSRF protection where applicable.
- Secure customer access tokens.
- Environment variable protection.
- Safe error handling.
- Tenant isolation.
- Secure AI endpoints.

Never expose:
- GROQ_API_KEY.
- Supabase service-role keys.
- Private storage credentials.
- Email API keys.

Do not store secrets in source code.

Do not log customer passwords, private keys, or sensitive customer information.

Use appropriate data minimization when sending information to Groq.

Make AI usage and data transmission clear in the application's privacy settings.

---

# 27. DEMO DATA

Create a realistic fictional painting company.

Seed:

- Customers.
- Leads.
- Quotations.
- Jobs.
- Appointments.
- Services.
- Pricing rules.

Provide an easy way to explore the application.

Clearly label sample data.

Never mix demo records with real customer records.

Do not generate fake AI responses and present them as actual Groq results.

---

# 28. TESTING

Use Playwright for end-to-end browser testing.

Use Vitest for unit tests.

Test:

Authentication:
- Registration.
- Login.
- Logout.
- Protected pages.

Business:
- Onboarding.
- Customer creation.
- Lead creation.
- Lead editing.
- Lead conversion.

Quotations:
- Creation.
- Editing.
- PDF generation.
- Customer acceptance.
- Customer rejection.

Jobs:
- Scheduling.
- Editing.
- Completion.

AI:
- Groq connection.
- Text generation.
- Structured output validation.
- Quote generation.
- Photo analysis.
- Email generation.
- Rate-limit handling.
- Missing API key.
- Model unavailability.
- AI usage limits.

Security:
- Cross-tenant access attempts.
- Public portal authorization.
- Private photo access.
- Unauthorized API requests.

Do not rely only on visual inspection.

Test actual user flows.

---

# 29. DEVELOPMENT PROCESS

Build the application in milestones.

Milestone 1 — Foundation:
- Project structure.
- Dependencies.
- Design system.
- Supabase.
- Database schema.
- Authentication.
- Business onboarding.

Milestone 2 — Core SaaS:
- Dashboard.
- Customers.
- Leads.
- Quote request forms.
- Quotations.
- PDF generation.
- Customer portals.
- Jobs.

Milestone 3 — Groq AI:
- Central AI provider.
- Model routing.
- Quote copilot.
- Photo analyzer.
- Email assistant.
- Business analyst.
- Customer chatbot.
- Job planner.
- Business AI assistant.

Milestone 4 — Commercial features:
- Business settings.
- Subscription architecture.
- AI usage limits.
- Notifications.
- Email integration.

Milestone 5 — Quality and launch:
- Automated tests.
- Security checks.
- Responsive design.
- Performance improvements.
- Production deployment.

Do not skip milestones.

After each milestone:
1. Run TypeScript checks.
2. Run ESLint.
3. Run relevant tests.
4. Fix errors.
5. Verify the application still works.

Do not proceed while critical errors remain.

---

# 30. PROJECT DOCUMENTATION

Create:

README.md

.env.example

AGENTS.md

Database migration files.

Testing documentation.

AI integration documentation.

Document every required environment variable.

The .env.example should include:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GROQ_API_KEY=
GROQ_TEXT_MODEL=openai/gpt-oss-20b
GROQ_REASONING_MODEL=openai/gpt-oss-120b
GROQ_VISION_MODEL=qwen/qwen3.8-27b

AI_ENABLED=true
AI_VISION_ENABLED=true

RESEND_API_KEY=
RESEND_FROM_EMAIL=

NEXT_PUBLIC_APP_URL=http://localhost:3000

Do not include real credentials in this file.

Explain how to obtain and configure the Groq API key.

---

# 31. FINAL QUALITY REQUIREMENTS

The final application must:

- Build successfully.
- Have working authentication.
- Have a real database.
- Have working CRUD operations.
- Have secure multi-tenant architecture.
- Have functioning AI integration through Groq.
- Have real AI-generated responses.
- Have working quotation generation.
- Have working PDF downloads.
- Have working customer portals.
- Have working email integration when configured.
- Have responsive layouts.
- Have automated tests.
- Have no major console errors.
- Have no dead buttons.
- Have no fake dashboard metrics.
- Have no placeholder pages presented as completed functionality.

If an external API credential is missing, finish the implementation and document the exact setup requirement.

Never pretend a feature works when it has not been implemented or tested.

---

# 32. HOW TO WORK

First inspect the entire repository.

Check:
- Existing files.
- Existing dependencies.
- Current Next.js setup.
- Existing Playwright configuration.
- Existing Git setup.
- Environment configuration.

Do not unnecessarily overwrite working files.

Use Context7 for current library documentation.

Use official Groq documentation for AI implementation.

Use Supabase documentation for authentication and database security.

Use Playwright MCP to test the running website when available.

Work independently on implementation details.

Do not stop to ask me about minor design decisions.

If a task is too large for one development session, complete the current milestone, document progress, and continue from the documented state.

Maintain a project progress document called BUILD_PROGRESS.md.

Update it after each milestone with:
- Completed features.
- Remaining features.
- Tests performed.
- Known issues.
- Next steps.

Start by inspecting the project and then build BrushQuote into a complete, polished, working AI-powered SaaS application.

The priority is a real, secure, commercially usable product — not merely generating a large amount of code.