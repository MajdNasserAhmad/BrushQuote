-- Draft. Apply only to an isolated test database until the milestone gates pass.
begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
-- Internal authorization helpers should not be exposed as Data API RPCs.
alter function public.is_business_member(uuid,text[]) set schema private;

-- Account removal must explicitly resolve workspace membership first. Otherwise
-- deleting an auth user could silently remove a company's only owner.
alter table public.business_memberships drop constraint business_memberships_user_id_fkey;
alter table public.business_memberships add constraint business_memberships_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete restrict;

create function private.prevent_tenant_move() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.business_id is distinct from old.business_id then
    raise exception 'Records cannot be moved between businesses' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.prevent_tenant_move() from public, anon, authenticated;
create trigger services_keep_tenant before update on public.business_services
  for each row execute function private.prevent_tenant_move();
create trigger pricing_keep_tenant before update on public.business_pricing_rules
  for each row execute function private.prevent_tenant_move();
create trigger memberships_keep_tenant before update on public.business_memberships
  for each row execute function private.prevent_tenant_move();

-- Clients may edit business settings but not identifiers or audit timestamps.
revoke update on public.profiles, public.businesses from authenticated;
grant update(display_name) on public.profiles to authenticated;
grant update(name,slug,email,phone,address,currency,tax_rate,tax_registered,
  tax_number,description,service_areas,logo_path,default_terms) on public.businesses to authenticated;

-- PostgreSQL numeric NaN sorts above finite numbers, so >= 0 alone is insufficient.
alter table public.business_pricing_rules add constraint pricing_finite
  check (unit_price < 'Infinity'::numeric);

commit;
