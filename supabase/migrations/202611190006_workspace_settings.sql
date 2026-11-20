begin;
create table public.notification_preferences (
  business_id uuid not null,
  user_id uuid not null,
  email_notifications boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(business_id,user_id),
  foreign key(business_id,user_id) references public.business_memberships(business_id,user_id) on delete cascade
);
alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public,anon,authenticated;
grant select,insert on public.notification_preferences to authenticated;
grant update(email_notifications) on public.notification_preferences to authenticated;
grant all on public.notification_preferences to service_role;
create policy own_preferences on public.notification_preferences for all to authenticated using (user_id=(select auth.uid()) and private.is_business_member(business_id)) with check(user_id=(select auth.uid()) and private.is_business_member(business_id));
create trigger keep_tenant before update on public.notification_preferences for each row execute function private.prevent_tenant_move();
create trigger set_updated_at before update on public.notification_preferences for each row execute function public.set_updated_at();

create function public.save_business_settings(target_business uuid, details jsonb, currency_confirmed boolean) returns void
language plpgsql security definer set search_path='' as $$
declare previous_currency text;
begin
  if not private.is_business_member(target_business,array['owner','admin']) then raise exception 'Access denied' using errcode='42501'; end if;
  select currency into strict previous_currency from public.businesses where id=target_business for update;
  if details->>'currency' is distinct from previous_currency and currency_confirmed is distinct from true then raise exception 'Confirm the currency change' using errcode='23514'; end if;
  update public.businesses set name=details->>'name',email=details->>'email',phone=details->>'phone',address=details->>'address',currency=details->>'currency',
    tax_registered=(details->>'tax_registered')::boolean,tax_rate=(details->>'tax_rate')::numeric,tax_number=details->>'tax_number',description=details->>'description',
    service_areas=array(select jsonb_array_elements_text(details->'service_areas')),default_terms=details->>'default_terms'
    where id=target_business;
  insert into public.activity_logs(business_id,actor_user_id,actor_type,event_type,entity_type,entity_id)
    values(target_business,auth.uid(),'member','business.settings_updated','business',target_business);
end;
$$;
revoke all on function public.save_business_settings(uuid,jsonb,boolean) from public,anon;
grant execute on function public.save_business_settings(uuid,jsonb,boolean) to authenticated;

create function public.save_service_pricing(target_business uuid, service uuid, pricing uuid, details jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare saved_service uuid; saved_rule uuid;
begin
  if not private.is_business_member(target_business,array['owner','admin']) then raise exception 'Access denied' using errcode='42501'; end if;
  perform 1 from public.businesses where id=target_business for update;
  if service is null then
    if pricing is not null then raise exception 'Invalid pricing reference' using errcode='23514'; end if;
    insert into public.business_services(business_id,name,description,enabled) values(target_business,details->>'name',details->>'description',(details->>'enabled')::boolean) returning id into saved_service;
  else
    update public.business_services set name=details->>'name',description=details->>'description',enabled=(details->>'enabled')::boolean where business_id=target_business and id=service returning id into saved_service;
    if not found then raise exception 'Service unavailable' using errcode='42501'; end if;
  end if;
  if pricing is null then
    insert into public.business_pricing_rules(business_id,service_id,unit,unit_price,enabled) values(target_business,saved_service,details->>'unit',(details->>'unit_price')::numeric,(details->>'enabled')::boolean) returning id into saved_rule;
  else
    update public.business_pricing_rules set unit=details->>'unit',unit_price=(details->>'unit_price')::numeric,enabled=(details->>'enabled')::boolean
      where business_id=target_business and service_id=saved_service and id=pricing returning id into saved_rule;
    if not found then raise exception 'Pricing unavailable' using errcode='42501'; end if;
  end if;
  insert into public.activity_logs(business_id,actor_user_id,actor_type,event_type,entity_type,entity_id)
    values(target_business,auth.uid(),'member','business.service_updated','business',target_business);
  return saved_service;
end;
$$;
revoke all on function public.save_service_pricing(uuid,uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_service_pricing(uuid,uuid,uuid,jsonb) to authenticated;
commit;
