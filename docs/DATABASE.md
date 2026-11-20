# Database design

Use UUID primary keys, `created_at`/`updated_at` timestamps, explicit constraints and indexes. All business-owned records have `business_id`. Parent records have `(business_id, id)` unique keys and children use composite foreign keys to prevent cross-tenant references even for a user belonging to multiple businesses.

| Tables | Relationships and important data |
| --- | --- |
| profiles | User ID references auth.users; display name |
| businesses | Unique request slug, company/contact/address/logo path, currency, tax, description, service areas, default terms |
| business_memberships | Business/user composite primary key; owner/admin/member roles |
| business_services | Business, service name, description, enabled |
| business_pricing_rules | Business/service, unit, fixed-precision unit price, effective status |
| customers | Business, contact details; related customer_addresses and customer_notes tables as needed |
| leads | Business/customer, property details, requirements, preferred date, specified lead status, archive timestamp |
| lead_photos | Business/lead, private object path, verified MIME/size, AI consent timestamp |
| quotations | Business/customer/lead, unique per-business reference, currency, expiry, terms, deterministic monetary snapshots, status |
| quotation_items | Business/quotation/service, description, quantity, unit price and computed totals; quotation-level tax and discount |
| quotation_access_tokens | Business/quotation, unique token hash, expiry, revocation; deny ordinary client reads/writes |
| jobs | Business/customer/quotation, property, schedule, budget, specified job status |
| appointments | Business/job, start/end with end > start, timezone; database conflict safeguards |
| job_assignments | Business/job/member, composite membership FK |
| activity_logs | Business, actor, entity/type, minimal audit metadata; append via trusted operations |
| email_logs | Business, provider ID, delivery state, template/entity references; trusted writes |
| ai_usage | Business/user, task/model, tokens, nullable configured cost, request/period identifiers; trusted writes |
| ai_conversations | Business/user, title, context; private to authorized conversation participants |
| ai_messages | Business/conversation, role, validated content and metadata |
| business_chatbot_settings | Business, enabled, approved public context only |
| business_faqs | Business, question/answer, published flag |
| notifications | Business/user, event, safe message, read timestamp |

Supplementary tables will support customer addresses/notes, communication history, public request throttling, AI usage reservations/cache, subscriptions/entitlements and quote numbering when those workflows are implemented. Avoid dumping relational entities into a single JSON document. JSON is reserved for bounded structured settings or snapshots.

## Migration drafts

The specification lists 22 required tables, not the previously stated 23. Four drafts cover these plus `customer_addresses` (23 total):

- `202611150001_identity_foundation.sql`: identity, company, memberships, services/pricing, private logos and onboarding RPC.
- `202611170001_identity_hardening.sql`: private membership helper, immutable tenant IDs, column permissions, account deletion restriction and finite pricing values.
- `202611170002_customer_quotation_schema.sql`: customers/addresses, leads/photos, quotations/items/tokens, private photo/PDF buckets and tenant reads.
- `202611170003_operations_ai_schema.sql`: jobs/appointments/assignments, logs, AI usage/conversations/messages, chatbot settings/FAQs and notifications.

All are **drafts pending execution/security tests**. No migration has been applied. Schema coverage does not mean scheduling, financial calculations or other workflows are implemented.

Onboarding derives the owner from `auth.uid()`, not a submitted user ID. The function transaction creates company, owner membership, services and prices together. Lock the authenticated profile row to prevent duplicate onboarding. Direct membership writes are denied. Membership role changes and invitations need dedicated owner-authorized operations later.

Authenticated members can read their tenant; owners/admins can edit its services/prices/profile. Anonymous users cannot select private tables. Public request and chatbot projections will be introduced as narrow operations, not blanket anonymous SELECT policies. Sensitive audit, financial, usage and token mutations will use controlled transactions rather than general member write policies.

New domain tables grant no client writes except updating the recipient's own notification `read_at`. Token hashes have no authenticated SELECT permission. Conversations/messages are private to their originating member, including against other members/owners in the same business. Storage photo/PDF reads require an accessible matching database record. Bucket MIME restrictions do not replace server-side byte validation.

Tenant IDs cannot be reassigned. Memberships cannot be removed while records reference them; account offboarding needs an explicit ownership/retention/deactivation workflow. Any future soft-deactivation must update all authorization helpers before use. Polymorphic activity entity references require server-side validation because one entity UUID cannot reference several tables through a single foreign key.

Money uses numeric values with documented rounding; do not use floating point or model-generated totals. Currency must be a supported ISO code validated in the application. Index business scopes and foreign keys, with additional status/date/search indexes as query patterns are added.

## Migration verification required

Use a fresh local Supabase database (Docker required), apply all migrations in filename order, generate database TypeScript types, then execute both `supabase/tests/identity_security.sql` and `supabase/tests/domain_security.sql`. Add real Auth/Storage API tests. Never run fixtures against production.

Guidance consulted through Context7 and official sources:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://www.postgresql.org/docs/current/ddl-constraints.html

## Implemented AI runtime

Additional tenant tables business_ai_settings and ai_results have RLS; results are private to their originating user. Service-only quota reservations serialize on the business row and enforce UTC daily/monthly budgets, short-window limits and concurrency limits. Private chatbot_client_limits applies public client limits. ai_messages has a monotonic sequence for deterministic conversation ordering. Authorized RPCs approve public knowledge, persist private exchanges and retrieve aggregate business metrics. Migrations through 202611190005 are applied locally; generated TypeScript types match the schema.
