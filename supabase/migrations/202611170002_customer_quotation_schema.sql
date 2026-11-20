-- Milestone 1 schema only. Domain mutation RPCs are introduced with Milestone 2.
-- Draft: not yet executed on PostgreSQL.
begin;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  full_name text not null check (length(trim(full_name)) between 2 and 160),
  email text check (length(email) between 3 and 254),
  phone text check (length(phone) between 3 and 40),
  internal_notes text not null default '' check (length(internal_notes) <= 20000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id)
);
create index customers_business_name_idx on public.customers(business_id,full_name,id);
create index customers_business_email_idx on public.customers(business_id,lower(email));

-- Multiple addresses are relational rather than an unvalidated customer JSON blob.
create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  customer_id uuid not null,
  label text not null default 'Property' check (length(label) between 1 and 80),
  address text not null check (length(trim(address)) between 3 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id),
  foreign key (business_id,customer_id) references public.customers(business_id,id)
);
create index customer_addresses_customer_idx on public.customer_addresses(business_id,customer_id);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  customer_id uuid not null,
  status text not null default 'new' check (status in ('new','contacted','inspection_required','quote_sent','won','lost')),
  property_address text not null check (length(trim(property_address)) between 3 and 1000),
  property_type text not null check (length(property_type) between 1 and 100),
  room_count integer check (room_count between 1 and 1000),
  painting_areas text[] not null default '{}' check (cardinality(painting_areas) <= 100),
  -- Bounded measurement snapshot; application Zod schema will validate each room.
  room_measurements jsonb not null default '[]'::jsonb
    check (jsonb_typeof(room_measurements) = 'array' and octet_length(room_measurements::text) <= 50000),
  wall_condition text not null default '' check (length(wall_condition) <= 2000),
  work_type text not null check (length(work_type) between 1 and 200),
  preferred_start_date date,
  additional_information text not null default '' check (length(additional_information) <= 10000),
  internal_notes text not null default '' check (length(internal_notes) <= 20000),
  source text not null default 'manual' check (source in ('manual','public_request','import')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id),
  foreign key (business_id,customer_id) references public.customers(business_id,id)
);
create index leads_business_status_date_idx on public.leads(business_id,status,created_at desc,id);
create index leads_customer_idx on public.leads(business_id,customer_id);

create table public.lead_photos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  lead_id uuid not null,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  byte_size bigint not null check (byte_size between 1 and 10485760),
  ai_consent_at timestamptz,
  ai_consent_version text check (length(ai_consent_version) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id),
  foreign key (business_id,lead_id) references public.leads(business_id,id),
  check (storage_path like business_id::text || '/' || lead_id::text || '/%'),
  check ((ai_consent_at is null) = (ai_consent_version is null))
);
create index lead_photos_lead_idx on public.lead_photos(business_id,lead_id);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  customer_id uuid not null,
  lead_id uuid,
  reference text not null check (length(reference) between 1 and 80),
  status text not null default 'draft' check (status in ('draft','sent','accepted','rejected','expired','cancelled')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  issued_on date not null default current_date,
  expires_on date not null,
  subtotal numeric(16,4) not null check (subtotal >= 0 and subtotal < 'Infinity'::numeric),
  discount_amount numeric(16,4) not null default 0 check (discount_amount >= 0 and discount_amount <= subtotal),
  additional_charges numeric(16,4) not null default 0 check (additional_charges >= 0 and additional_charges < 'Infinity'::numeric),
  tax_rate numeric(5,2) not null default 0 check (tax_rate between 0 and 100),
  tax_amount numeric(16,4) not null check (tax_amount >= 0 and tax_amount < 'Infinity'::numeric),
  total numeric(16,4) not null check (total >= 0 and total < 'Infinity'::numeric),
  terms text not null default '' check (length(terms) <= 20000),
  customer_notes text not null default '' check (length(customer_notes) <= 10000),
  internal_notes text not null default '' check (length(internal_notes) <= 20000),
  -- Snapshot identity for historical PDFs even after company/customer edits.
  sender_snapshot jsonb not null check (jsonb_typeof(sender_snapshot) = 'object' and octet_length(sender_snapshot::text) <= 20000),
  customer_snapshot jsonb not null check (jsonb_typeof(customer_snapshot) = 'object' and octet_length(customer_snapshot::text) <= 20000),
  approved_by uuid,
  approved_at timestamptz,
  sent_at timestamptz,
  decided_at timestamptz,
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id),
  unique (business_id,reference),
  foreign key (business_id,customer_id) references public.customers(business_id,id),
  foreign key (business_id,lead_id) references public.leads(business_id,id),
  foreign key (business_id,approved_by) references public.business_memberships(business_id,user_id),
  check (expires_on >= issued_on),
  check (total = subtotal - discount_amount + additional_charges + tax_amount),
  check ((approved_at is null) = (approved_by is null)),
  check (status not in ('sent','accepted','rejected') or (approved_at is not null and sent_at is not null)),
  check ((status in ('accepted','rejected')) = (decided_at is not null)),
  check (pdf_path is null or pdf_path like business_id::text || '/' || id::text || '/%')
);
create index quotations_status_date_idx on public.quotations(business_id,status,created_at desc,id);
create index quotations_customer_idx on public.quotations(business_id,customer_id);
create index quotations_lead_idx on public.quotations(business_id,lead_id);
create index quotations_approver_idx on public.quotations(approved_by);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  quotation_id uuid not null,
  service_id uuid,
  position integer not null check (position >= 0),
  description text not null check (length(trim(description)) between 1 and 4000),
  unit text not null check (length(unit) between 1 and 40),
  quantity numeric(14,4) not null check (quantity > 0 and quantity < 'Infinity'::numeric),
  unit_price numeric(14,4) not null check (unit_price >= 0 and unit_price < 'Infinity'::numeric),
  line_total numeric(16,4) not null check (line_total >= 0 and line_total < 'Infinity'::numeric),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id),
  unique (business_id,quotation_id,position),
  foreign key (business_id,quotation_id) references public.quotations(business_id,id),
  foreign key (business_id,service_id) references public.business_services(business_id,id)
);
create index quotation_items_service_idx on public.quotation_items(business_id,service_id);

create table public.quotation_access_tokens (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  quotation_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id,quotation_id) references public.quotations(business_id,id),
  check (expires_at > created_at)
);
create index quotation_tokens_quote_idx on public.quotation_access_tokens(business_id,quotation_id);

-- No domain writes are granted yet. Mutations must atomically validate totals,
-- consent, audit entries and decisions through the upcoming authorized services.
do $$
declare relation text;
begin
  foreach relation in array array['customers','customer_addresses','leads','lead_photos',
    'quotations','quotation_items','quotation_access_tokens'] loop
    execute format('alter table public.%I enable row level security',relation);
    execute format('revoke all on public.%I from public, anon, authenticated',relation);
    execute format('grant all on public.%I to service_role',relation);
    execute format('create trigger keep_tenant before update on public.%I for each row execute function private.prevent_tenant_move()',relation);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',relation);
    if relation <> 'quotation_access_tokens' then
      execute format('grant select on public.%I to authenticated',relation);
      execute format('create policy tenant_read on public.%I for select to authenticated using (private.is_business_member(business_id))',relation);
    end if;
  end loop;
end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('lead-photos','lead-photos',false,10485760,array['image/png','image/jpeg','image/webp']),
      ('quotation-pdfs','quotation-pdfs',false,20971520,array['application/pdf']);

-- Uploads are server-managed after byte validation. Public requesters have no
-- direct Storage grants. Public portal downloads use a validated expiring token.
create policy lead_photo_member_read on storage.objects for select to authenticated using (
  bucket_id = 'lead-photos' and exists (
    select 1 from public.lead_photos p where p.storage_path = name
      and private.is_business_member(p.business_id)
  )
);
create policy quotation_pdf_member_read on storage.objects for select to authenticated using (
  bucket_id = 'quotation-pdfs' and exists (
    select 1 from public.quotations q where q.pdf_path = name
      and private.is_business_member(q.business_id)
  )
);
commit;
