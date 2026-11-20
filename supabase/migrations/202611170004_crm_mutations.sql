begin;

alter table public.customers add column search_document tsvector generated always as
  (to_tsvector('simple', coalesce(full_name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(phone,''))) stored;
create index customers_search_idx on public.customers using gin(search_document);
alter table public.leads add column search_document tsvector generated always as
  (to_tsvector('simple', property_address || ' ' || work_type || ' ' || property_type)) stored;
create index leads_search_idx on public.leads using gin(search_document);
alter table public.customers add constraint customer_email_format
  check (email is null or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

create function public.save_customer(target_business uuid, customer uuid, details jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare saved uuid; address_item jsonb;
begin
  if not private.is_business_member(target_business) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if jsonb_typeof(details) is distinct from 'object' or jsonb_typeof(details->'addresses') is distinct from 'array' then
    raise exception 'Invalid customer details' using errcode = '22023';
  end if;
  if jsonb_array_length(details->'addresses') > 10 then raise exception 'Too many addresses' using errcode = '22023'; end if;
  if customer is null then
    insert into public.customers(business_id,full_name,email,phone,internal_notes)
    values(target_business,trim(details->>'full_name'),nullif(trim(details->>'email'),''),nullif(trim(details->>'phone'),''),coalesce(details->>'internal_notes',''))
    returning id into saved;
  else
    update public.customers set full_name=trim(details->>'full_name'),email=nullif(trim(details->>'email'),''),
      phone=nullif(trim(details->>'phone'),''),internal_notes=coalesce(details->>'internal_notes','')
    where business_id=target_business and id=customer and archived_at is null returning id into saved;
    if saved is null then raise exception 'Customer unavailable' using errcode = '42501'; end if;
    delete from public.customer_addresses where business_id=target_business and customer_id=saved;
  end if;
  for address_item in select value from jsonb_array_elements(details->'addresses') loop
    insert into public.customer_addresses(business_id,customer_id,label,address)
    values(target_business,saved,coalesce(address_item->>'label','Property'),trim(address_item->>'address'));
  end loop;
  insert into public.activity_logs(business_id,actor_user_id,actor_type,event_type,entity_type,entity_id)
  values(target_business,auth.uid(),'member',case when customer is null then 'customer.created' else 'customer.updated' end,'customer',saved);
  return saved;
end;
$$;
revoke all on function public.save_customer(uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_customer(uuid,uuid,jsonb) to authenticated;

create function public.save_lead(target_business uuid, lead uuid, details jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare saved uuid; previous_status text; customer uuid; new_status text;
begin
  if not private.is_business_member(target_business) then raise exception 'Access denied' using errcode = '42501'; end if;
  if jsonb_typeof(details) is distinct from 'object' then raise exception 'Invalid lead details' using errcode = '22023'; end if;
  customer := (details->>'customer_id')::uuid;
  if not exists(select 1 from public.customers where business_id=target_business and id=customer and archived_at is null) then
    raise exception 'Customer unavailable' using errcode = '42501';
  end if;
  new_status := coalesce(details->>'status','new');
  if lead is null then
    insert into public.leads(business_id,customer_id,status,property_address,property_type,room_count,painting_areas,
      room_measurements,wall_condition,work_type,preferred_start_date,additional_information,internal_notes)
    values(target_business,customer,new_status,trim(details->>'property_address'),details->>'property_type',
      nullif(details->>'room_count','')::integer,
      array(select jsonb_array_elements_text(coalesce(details->'painting_areas','[]'::jsonb))),
      coalesce(details->'room_measurements','[]'::jsonb),coalesce(details->>'wall_condition',''),
      details->>'work_type',nullif(details->>'preferred_start_date','')::date,
      coalesce(details->>'additional_information',''),coalesce(details->>'internal_notes','')) returning id into saved;
  else
    select status into previous_status from public.leads where id=lead and business_id=target_business and archived_at is null for update;
    if previous_status is null then raise exception 'Lead unavailable' using errcode = '42501'; end if;
    update public.leads set customer_id=customer,status=new_status,property_address=trim(details->>'property_address'),
      property_type=details->>'property_type',room_count=nullif(details->>'room_count','')::integer,
      painting_areas=array(select jsonb_array_elements_text(coalesce(details->'painting_areas','[]'::jsonb))),
      room_measurements=coalesce(details->'room_measurements','[]'::jsonb),wall_condition=coalesce(details->>'wall_condition',''),
      work_type=details->>'work_type',preferred_start_date=nullif(details->>'preferred_start_date','')::date,
      additional_information=coalesce(details->>'additional_information',''),internal_notes=coalesce(details->>'internal_notes','')
    where business_id=target_business and id=lead returning id into saved;
  end if;
  insert into public.activity_logs(business_id,actor_user_id,actor_type,event_type,entity_type,entity_id,metadata)
  values(target_business,auth.uid(),'member',case when lead is null then 'lead.created' else 'lead.updated' end,'lead',saved,
    jsonb_build_object('previous_status',previous_status,'status',new_status));
  return saved;
end;
$$;
revoke all on function public.save_lead(uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_lead(uuid,uuid,jsonb) to authenticated;

create function public.set_crm_archived(target_business uuid, record_kind text, record_id uuid, archived boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare changed uuid;
begin
  if not private.is_business_member(target_business) or archived is null then raise exception 'Access denied' using errcode = '42501'; end if;
  if record_kind = 'customer' then
    update public.customers set archived_at=case when archived then now() else null end
    where business_id=target_business and id=record_id returning id into changed;
  elsif record_kind = 'lead' then
    update public.leads set archived_at=case when archived then now() else null end
    where business_id=target_business and id=record_id returning id into changed;
  else raise exception 'Invalid record type' using errcode = '22023';
  end if;
  if changed is null then raise exception 'Record unavailable' using errcode = '42501'; end if;
  insert into public.activity_logs(business_id,actor_user_id,actor_type,event_type,entity_type,entity_id)
  values(target_business,auth.uid(),'member',record_kind || case when archived then '.archived' else '.restored' end,record_kind,record_id);
end;
$$;
revoke all on function public.set_crm_archived(uuid,text,uuid,boolean) from public,anon;
grant execute on function public.set_crm_archived(uuid,text,uuid,boolean) to authenticated;

commit;
