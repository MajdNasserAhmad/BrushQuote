-- Milestone 1, step 1. Draft: validate on an isolated Supabase database before use.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 80),
  email text not null check (length(email) between 3 and 254),
  phone text not null check (length(phone) between 3 and 40),
  address text not null check (length(address) between 3 and 1000),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  tax_rate numeric(5,2) not null default 0 check (tax_rate between 0 and 100),
  tax_registered boolean not null default false,
  tax_number text check (length(tax_number) <= 80),
  description text not null default '' check (length(description) <= 4000),
  service_areas text[] not null default '{}' check (cardinality(service_areas) <= 100),
  logo_path text,
  default_terms text not null default '' check (length(default_terms) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (logo_path is null or logo_path like id::text || '/%')
);

create table public.business_memberships (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index memberships_user_idx on public.business_memberships(user_id, business_id);
create unique index one_owner_per_business on public.business_memberships(business_id) where role = 'owner';

create table public.business_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 160),
  description text not null default '' check (length(description) <= 2000),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, name)
);

create table public.business_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid not null,
  unit text not null check (unit in ('square_metre', 'square_foot', 'hour', 'day', 'item')),
  unit_price numeric(14,4) not null check (unit_price >= 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id, service_id) references public.business_services(business_id, id) on delete cascade,
  unique (business_id, id),
  unique (business_id, service_id, unit)
);

-- SECURITY DEFINER avoids recursive membership RLS. Fixed search_path prevents shadowing.
create function public.is_business_member(target_business uuid, allowed_roles text[] default array['owner','admin','member'])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.business_memberships m
    where m.business_id = target_business and m.user_id = (select auth.uid())
      and m.role = any(allowed_roles)
  );
$$;
revoke all on function public.is_business_member(uuid,text[]) from public, anon;
grant execute on function public.is_business_member(uuid,text[]) to authenticated;

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;
alter table public.business_services enable row level security;
alter table public.business_pricing_rules enable row level security;

revoke all on public.profiles, public.businesses, public.business_memberships,
  public.business_services, public.business_pricing_rules from anon, authenticated;
grant select, update on public.profiles, public.businesses to authenticated;
grant select on public.business_memberships to authenticated;
grant select, insert, update, delete on public.business_services, public.business_pricing_rules to authenticated;

create policy profiles_read_self on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy businesses_read_member on public.businesses for select to authenticated using (public.is_business_member(id));
create policy businesses_update_manager on public.businesses for update to authenticated
  using (public.is_business_member(id, array['owner','admin']))
  with check (public.is_business_member(id, array['owner','admin']));
create policy memberships_read_member on public.business_memberships for select to authenticated
  using (public.is_business_member(business_id));

create policy services_read_member on public.business_services for select to authenticated
  using (public.is_business_member(business_id));
create policy services_manage on public.business_services for all to authenticated
  using (public.is_business_member(business_id, array['owner','admin']))
  with check (public.is_business_member(business_id, array['owner','admin']));
create policy pricing_read_member on public.business_pricing_rules for select to authenticated
  using (public.is_business_member(business_id));
create policy pricing_manage on public.business_pricing_rules for all to authenticated
  using (public.is_business_member(business_id, array['owner','admin']))
  with check (public.is_business_member(business_id, array['owner','admin']));

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger businesses_updated before update on public.businesses for each row execute function public.set_updated_at();
create trigger memberships_updated before update on public.business_memberships for each row execute function public.set_updated_at();
create trigger services_updated before update on public.business_services for each row execute function public.set_updated_at();
create trigger pricing_updated before update on public.business_pricing_rules for each row execute function public.set_updated_at();

-- Client supplies business details only. User and owner role are derived here.
create function public.onboard_business(details jsonb, services jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  company uuid;
  service uuid;
  item jsonb;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(details) is distinct from 'object'
    or jsonb_typeof(services) is distinct from 'array' then
    raise exception 'Invalid onboarding input' using errcode = '22023';
  end if;
  if jsonb_array_length(services) not between 1 and 50 then
    raise exception 'Provide between 1 and 50 services' using errcode = '22023';
  end if;
  insert into public.profiles(id) values (actor) on conflict (id) do nothing;
  perform 1 from public.profiles where id = actor for update;
  if exists (select 1 from public.business_memberships where user_id = actor) then
    raise exception 'Workspace already configured' using errcode = '23505';
  end if;
  insert into public.businesses(name,slug,email,phone,address,currency,tax_rate,tax_registered,tax_number,description,service_areas)
  values (
    trim(details->>'name'), details->>'slug', details->>'email', details->>'phone',
    details->>'address', details->>'currency', coalesce((details->>'tax_rate')::numeric,0),
    coalesce((details->>'tax_registered')::boolean,false), details->>'tax_number',
    coalesce(details->>'description',''),
    array(select jsonb_array_elements_text(coalesce(details->'service_areas','[]'::jsonb)))
  ) returning id into company;
  insert into public.business_memberships(business_id,user_id,role) values(company,actor,'owner');
  for item in select value from jsonb_array_elements(services) loop
    insert into public.business_services(business_id,name) values(company,trim(item->>'name')) returning id into service;
    insert into public.business_pricing_rules(business_id,service_id,unit,unit_price)
      values(company,service,item->>'unit',(item->>'unit_price')::numeric);
  end loop;
  return company;
end;
$$;
revoke all on function public.onboard_business(jsonb,jsonb) from public, anon;
grant execute on function public.onboard_business(jsonb,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('business-logos','business-logos',false,2097152,array['image/png','image/jpeg','image/webp']);

-- Compare UUID text rather than casting an untrusted object path to UUID.
create policy logos_read_member on storage.objects for select to authenticated using (
  bucket_id = 'business-logos' and exists (
    select 1 from public.business_memberships m
    where m.user_id = (select auth.uid()) and m.business_id::text = (storage.foldername(name))[1]
  )
);
create policy logos_insert_manager on storage.objects for insert to authenticated with check (
  bucket_id = 'business-logos' and exists (
    select 1 from public.business_memberships m
    where m.user_id = (select auth.uid()) and m.role in ('owner','admin')
      and m.business_id::text = (storage.foldername(name))[1]
  )
);
create policy logos_delete_manager on storage.objects for delete to authenticated using (
  bucket_id = 'business-logos' and exists (
    select 1 from public.business_memberships m
    where m.user_id = (select auth.uid()) and m.role in ('owner','admin')
      and m.business_id::text = (storage.foldername(name))[1]
  )
);
-- Logo replacements use a new random path, followed by deletion of the old object.
commit;
