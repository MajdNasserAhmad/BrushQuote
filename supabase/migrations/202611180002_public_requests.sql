begin;
create table private.public_request_receipts (
  business_id uuid not null references public.businesses(id) on delete cascade,
  nonce uuid not null,
  state text not null check(state in ('pending','completed','failed')),
  lead_id uuid,
  created_at timestamptz not null default now(),
  primary key(business_id,nonce),
  foreign key(business_id,lead_id) references public.leads(business_id,id)
);
create table private.public_request_limits (
  business_id uuid not null references public.businesses(id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  count integer not null,
  primary key(business_id,bucket,window_start)
);
alter table private.public_request_receipts enable row level security;
alter table private.public_request_limits enable row level security;
revoke all on private.public_request_receipts,private.public_request_limits from public,anon,authenticated;
create function public.reserve_public_request(target_business uuid, request_nonce uuid, client_digest text, email_digest text) returns text
language plpgsql security definer set search_path='' as $$
declare previous text; counter integer; rule record;
begin
  if request_nonce is null or client_digest !~ '^[0-9a-f]{64}$' or email_digest !~ '^[0-9a-f]{64}$' then raise exception 'Invalid request' using errcode='22023'; end if;
  perform 1 from public.businesses where id=target_business for update;
  if not found then raise exception 'Business unavailable' using errcode='22023'; end if;
  select state into previous from private.public_request_receipts where business_id=target_business and nonce=request_nonce;
  if previous is not null then return previous; end if;
  delete from private.public_request_limits where business_id=target_business and window_start<now()-interval '2 days';
  for rule in select * from (values
    ('business',date_trunc('hour',now()),60),
    ('client:'||client_digest,date_trunc('hour',now()),5),
    ('email:'||email_digest,date_trunc('day',now()),3)) as limits(bucket,start_at,maximum) loop
    insert into private.public_request_limits(business_id,bucket,window_start,count) values(target_business,rule.bucket,rule.start_at,1)
      on conflict(business_id,bucket,window_start) do update set count=private.public_request_limits.count+1 returning count into counter;
    if counter>rule.maximum then raise exception 'Submission limit reached' using errcode='P0001'; end if;
  end loop;
  insert into private.public_request_receipts(business_id,nonce,state) values(target_business,request_nonce,'pending');
  return 'reserved';
end;
$$;
revoke all on function public.reserve_public_request(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_public_request(uuid,uuid,text,text) to service_role;

create function public.complete_public_request(target_business uuid, request_nonce uuid, new_lead uuid, details jsonb, photos jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare receipt private.public_request_receipts; contact uuid; photo jsonb;
begin
  select * into receipt from private.public_request_receipts where business_id=target_business and nonce=request_nonce for update;
  if receipt.state='completed' then return; end if;
  if receipt.state is distinct from 'pending' or receipt.created_at<now()-interval '10 minutes' then raise exception 'Request unavailable' using errcode='22023'; end if;
  if jsonb_typeof(photos) is distinct from 'array' or jsonb_array_length(photos)>5 then raise exception 'Invalid photos' using errcode='22023'; end if;
  -- Email is unverified: never attach to or overwrite an existing customer by email.
  insert into public.customers(business_id,full_name,email,phone) values(target_business,details->>'full_name',details->>'email',details->>'phone') returning id into contact;
  insert into public.customer_addresses(business_id,customer_id,address) values(target_business,contact,details->>'property_address');
  insert into public.leads(id,business_id,customer_id,source,property_address,property_type,room_count,painting_areas,room_measurements,wall_condition,work_type,preferred_start_date,additional_information)
    values(new_lead,target_business,contact,'public_request',details->>'property_address',details->>'property_type',(details->>'room_count')::integer,
      array(select jsonb_array_elements_text(details->'painting_areas')),details->'room_measurements',details->>'wall_condition',details->>'work_type',nullif(details->>'preferred_start_date','')::date,details->>'additional_information');
  for photo in select value from jsonb_array_elements(photos) loop
    if photo->>'storage_path' not like target_business::text||'/'||new_lead::text||'/%'
      or not exists(select 1 from storage.objects where bucket_id='lead-photos' and name=photo->>'storage_path') then raise exception 'Invalid photo object' using errcode='22023'; end if;
    insert into public.lead_photos(business_id,lead_id,storage_path,mime_type,byte_size,ai_consent_at,ai_consent_version)
      values(target_business,new_lead,photo->>'storage_path','image/webp',(photo->>'byte_size')::bigint,
        case when (details->>'ai_photo_consent')::boolean then now() else null end,
        case when (details->>'ai_photo_consent')::boolean then 'photo-analysis-v1' else null end);
  end loop;
  insert into public.activity_logs(business_id,actor_type,event_type,entity_type,entity_id) values(target_business,'customer','lead.request_received','lead',new_lead);
  insert into public.notifications(business_id,user_id,event_type,message,destination_path)
    select target_business,user_id,'lead.request_received','A new quotation request has arrived.','/dashboard/leads/'||new_lead::text from public.business_memberships where business_id=target_business;
  update private.public_request_receipts set state='completed',lead_id=new_lead where business_id=target_business and nonce=request_nonce;
end;
$$;
revoke all on function public.complete_public_request(uuid,uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.complete_public_request(uuid,uuid,uuid,jsonb,jsonb) to service_role;

create function public.public_request_state(target_business uuid, request_nonce uuid, mark_failed boolean default false) returns text
language plpgsql security definer set search_path='' as $$
declare result text;
begin
  if mark_failed then update private.public_request_receipts set state='failed' where business_id=target_business and nonce=request_nonce and state='pending'; end if;
  select state into result from private.public_request_receipts where business_id=target_business and nonce=request_nonce;
  return result;
end;
$$;
revoke all on function public.public_request_state(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.public_request_state(uuid,uuid,boolean) to service_role;
commit;
