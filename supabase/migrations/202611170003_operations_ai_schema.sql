-- Milestone 1 schema only; no job/AI/email feature implementation is claimed.
-- Draft: execute and validate on an isolated Supabase database before use.
begin;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  customer_id uuid not null,
  quotation_id uuid,
  title text not null check (length(trim(title)) between 2 and 200),
  property_address text not null check (length(trim(property_address)) between 3 and 1000),
  description text not null default '' check (length(description) <= 20000),
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  completed_at timestamptz,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  budget numeric(16,4) not null check (budget >= 0 and budget < 'Infinity'::numeric),
  internal_notes text not null default '' check (length(internal_notes) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id),
  unique (business_id,quotation_id),
  foreign key (business_id,customer_id) references public.customers(business_id,id),
  foreign key (business_id,quotation_id) references public.quotations(business_id,id),
  check (ends_at > starts_at),
  check ((status = 'completed') = (completed_at is not null)),
  check (completed_at is null or completed_at >= starts_at)
);
create index jobs_status_schedule_idx on public.jobs(business_id,status,starts_at,id);
create index jobs_customer_idx on public.jobs(business_id,customer_id);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  customer_id uuid not null,
  job_id uuid,
  assigned_user_id uuid not null,
  title text not null check (length(trim(title)) between 2 and 200),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null check (length(timezone) between 1 and 100),
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  notes text not null default '' check (length(notes) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id),
  foreign key (business_id,customer_id) references public.customers(business_id,id),
  foreign key (business_id,job_id) references public.jobs(business_id,id),
  foreign key (business_id,assigned_user_id) references public.business_memberships(business_id,user_id),
  check (ends_at > starts_at)
);
create index appointments_schedule_idx on public.appointments(business_id,assigned_user_id,starts_at,ends_at);
create index appointments_customer_idx on public.appointments(business_id,customer_id);
create index appointments_job_idx on public.appointments(business_id,job_id);
-- Milestone 2 adds concurrency-safe worker reservations/exclusion constraints
-- before any scheduling mutation becomes available.

create table public.job_assignments (
  business_id uuid not null references public.businesses(id),
  job_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id,job_id,user_id),
  foreign key (business_id,job_id) references public.jobs(business_id,id),
  foreign key (business_id,user_id) references public.business_memberships(business_id,user_id)
);
create index job_assignments_member_idx on public.job_assignments(business_id,user_id);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  actor_user_id uuid,
  actor_type text not null check (actor_type in ('member','customer','system')),
  event_type text not null check (length(event_type) between 1 and 100),
  entity_type text not null check (entity_type in ('business','customer','lead','quotation','job','appointment','ai','email')),
  entity_id uuid not null,
  -- Minimized, server-validated metadata; never passwords/tokens/message bodies.
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((actor_type = 'member') = (actor_user_id is not null)),
  foreign key (business_id,actor_user_id) references public.business_memberships(business_id,user_id)
);
create index activity_business_entity_idx on public.activity_logs(business_id,entity_type,entity_id,created_at desc);
create index activity_business_date_idx on public.activity_logs(business_id,created_at desc,id);
create index activity_actor_idx on public.activity_logs(actor_user_id);

create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  customer_id uuid,
  quotation_id uuid,
  job_id uuid,
  provider_id text unique,
  idempotency_key uuid not null unique default gen_random_uuid(),
  template text not null check (length(template) between 1 and 100),
  recipient text not null check (length(recipient) between 3 and 254),
  subject text not null check (length(subject) between 1 and 300),
  status text not null default 'queued' check (status in ('queued','submitted','delivered','bounced','complained','failed')),
  failure_code text check (length(failure_code) <= 100),
  submitted_at timestamptz,
  delivered_at timestamptz,
  provider_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id),
  foreign key (business_id,customer_id) references public.customers(business_id,id),
  foreign key (business_id,quotation_id) references public.quotations(business_id,id),
  foreign key (business_id,job_id) references public.jobs(business_id,id),
  check (status not in ('submitted','delivered') or (provider_id is not null and submitted_at is not null)),
  check (status <> 'delivered' or delivered_at is not null)
);
create index email_business_date_idx on public.email_logs(business_id,created_at desc,id);
create index email_customer_idx on public.email_logs(business_id,customer_id);
create index email_quotation_idx on public.email_logs(business_id,quotation_id);
create index email_job_idx on public.email_logs(business_id,job_id);

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  user_id uuid,
  request_id uuid not null unique,
  provider text not null default 'groq' check (provider = 'groq'),
  model text not null check (length(model) between 1 and 160),
  task text not null check (task in ('quote_generator','photo_analyzer','email_assistant','business_analyst','customer_chatbot','job_planner','business_assistant')),
  status text not null check (status in ('reserved','succeeded','failed','cancelled')),
  input_tokens bigint check (input_tokens >= 0),
  output_tokens bigint check (output_tokens >= 0),
  estimated_cost_usd numeric(18,8) check (estimated_cost_usd >= 0 and estimated_cost_usd < 'Infinity'::numeric),
  pricing_version text check (length(pricing_version) between 1 and 100),
  error_code text check (length(error_code) <= 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id),
  check ((estimated_cost_usd is null) = (pricing_version is null)),
  foreign key (business_id,user_id) references public.business_memberships(business_id,user_id),
  check ((status = 'reserved') = (completed_at is null))
);
create index ai_usage_period_idx on public.ai_usage(business_id,created_at desc,status);
create index ai_usage_user_idx on public.ai_usage(user_id);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  user_id uuid not null,
  title text not null check (length(title) between 1 and 200),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id),
  foreign key (business_id,user_id) references public.business_memberships(business_id,user_id)
);
create index ai_conversations_user_idx on public.ai_conversations(business_id,user_id,created_at desc);
create index ai_conversations_profile_idx on public.ai_conversations(user_id);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  conversation_id uuid not null,
  usage_id uuid,
  role text not null check (role in ('user','assistant')),
  content text not null check (length(content) between 1 and 50000),
  structured_content jsonb check (jsonb_typeof(structured_content) = 'object' and octet_length(structured_content::text) <= 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id,conversation_id) references public.ai_conversations(business_id,id),
  foreign key (business_id,usage_id) references public.ai_usage(business_id,id)
);
create index ai_messages_conversation_idx on public.ai_messages(business_id,conversation_id,created_at,id);
create index ai_messages_usage_idx on public.ai_messages(business_id,usage_id);

create table public.business_chatbot_settings (
  business_id uuid primary key references public.businesses(id),
  enabled boolean not null default false,
  approved_business_info text not null default '' check (length(approved_business_info) <= 20000),
  pricing_policy text not null default '' check (length(pricing_policy) <= 5000),
  business_hours text not null default '' check (length(business_hours) <= 2000),
  fallback_message text not null default 'Please contact us or request a quotation.' check (length(fallback_message) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_faqs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  question text not null check (length(trim(question)) between 1 and 500),
  answer text not null check (length(trim(answer)) between 1 and 5000),
  published boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id)
);
create index business_faqs_published_idx on public.business_faqs(business_id,published,position);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  user_id uuid not null,
  event_type text not null check (length(event_type) between 1 and 100),
  message text not null check (length(message) between 1 and 1000),
  destination_path text check (destination_path ~ '^/dashboard(/|$)' and length(destination_path) <= 1000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id),
  foreign key (business_id,user_id) references public.business_memberships(business_id,user_id)
);
create index notifications_inbox_idx on public.notifications(business_id,user_id,read_at,created_at desc);
create index notifications_profile_idx on public.notifications(user_id);

do $$
declare relation text;
begin
  foreach relation in array array['jobs','appointments','job_assignments','activity_logs','email_logs',
    'ai_usage','ai_conversations','ai_messages','business_chatbot_settings','business_faqs','notifications'] loop
    execute format('alter table public.%I enable row level security',relation);
    execute format('revoke all on public.%I from public, anon, authenticated',relation);
    execute format('grant all on public.%I to service_role',relation);
    execute format('grant select on public.%I to authenticated',relation);
    execute format('create trigger keep_tenant before update on public.%I for each row execute function private.prevent_tenant_move()',relation);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',relation);
    if relation not in ('ai_conversations','ai_messages','notifications') then
      execute format('create policy tenant_read on public.%I for select to authenticated using (private.is_business_member(business_id))',relation);
    end if;
  end loop;
end;
$$;

create policy conversation_owner_read on public.ai_conversations for select to authenticated
  using (user_id = (select auth.uid()) and private.is_business_member(business_id));
create policy conversation_message_read on public.ai_messages for select to authenticated using (
  private.is_business_member(business_id) and exists (
    select 1 from public.ai_conversations c
    where c.business_id = ai_messages.business_id and c.id = ai_messages.conversation_id
      and c.user_id = (select auth.uid())
  )
);
create policy notification_recipient_read on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) and private.is_business_member(business_id));
grant update(read_at) on public.notifications to authenticated;
create policy notification_recipient_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid()) and private.is_business_member(business_id))
  with check (user_id = (select auth.uid()) and private.is_business_member(business_id));

commit;
