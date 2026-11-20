begin;
alter table public.business_chatbot_settings add column approved_at timestamptz;
create or replace function public.reserve_ai_request(target_business uuid, actor uuid, request uuid, task_name text, model_name text, reasoning boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare config public.business_ai_settings; usage_id uuid; current_day timestamptz; current_month timestamptz;
begin
  if actor is null then
    if task_name<>'customer_chatbot' or not exists(select 1 from public.business_chatbot_settings where business_id=target_business and enabled and approved_at is not null) then raise exception 'Access denied' using errcode='42501'; end if;
  elsif not exists(select 1 from public.business_memberships where business_id=target_business and user_id=actor) then raise exception 'Access denied' using errcode='42501'; end if;
  perform 1 from public.businesses where id=target_business for update;
  insert into public.business_ai_settings(business_id) values(target_business) on conflict do nothing;
  select * into strict config from public.business_ai_settings where business_id=target_business;
  if not config.enabled or (task_name='photo_analyzer' and not config.vision_enabled) or (reasoning and not config.reasoning_enabled) then raise exception 'AI_DISABLED' using errcode='P0001'; end if;
  if exists(select 1 from public.ai_usage where request_id=request) then raise exception 'Request already reserved' using errcode='23505'; end if;
  current_day:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
  current_month:=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
  -- Failed/time-out reservations also consume a request; retries cannot bypass quotas.
  if (select count(*) from public.ai_usage where business_id=target_business and created_at>=current_day)>=config.daily_limit
    or (select count(*) from public.ai_usage where business_id=target_business and created_at>=current_month)>=config.monthly_limit
    or (select count(*) from public.ai_usage where business_id=target_business and created_at>now()-interval '1 minute')>=3
    or (select count(*) from public.ai_usage where business_id=target_business and status='reserved' and created_at>now()-interval '5 minutes')>=2 then
    raise exception 'AI_USAGE_LIMIT' using errcode='P0001';
  end if;
  update public.ai_usage set status='failed',completed_at=now(),error_code='interrupted' where business_id=target_business and status='reserved' and created_at<=now()-interval '5 minutes';
  insert into public.ai_usage(business_id,user_id,request_id,model,task,status) values(target_business,actor,request,model_name,task_name,'reserved') returning id into usage_id;
  return usage_id;
end;
$$;
revoke all on function public.reserve_ai_request(uuid,uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.reserve_ai_request(uuid,uuid,uuid,text,text,boolean) to service_role;

create function public.save_chatbot_settings(target_business uuid, settings jsonb, faqs jsonb, confirmed boolean) returns void
language plpgsql security definer set search_path='' as $$
declare entry jsonb; position integer:=0;
begin
  if confirmed is distinct from true or not exists(select 1 from public.business_memberships where business_id=target_business and user_id=auth.uid() and role in ('owner','admin')) then raise exception 'Approval required' using errcode='42501'; end if;
  if jsonb_typeof(faqs)<>'array' or jsonb_array_length(faqs)>20 then raise exception 'Invalid FAQs'; end if;
  perform 1 from public.businesses where id=target_business for update;
  insert into public.business_chatbot_settings(business_id,enabled,approved_business_info,pricing_policy,business_hours,fallback_message,approved_at)
    values(target_business,(settings->>'enabled')::boolean,settings->>'approved_business_info',settings->>'pricing_policy',settings->>'business_hours',settings->>'fallback_message',now())
    on conflict(business_id) do update set enabled=excluded.enabled,approved_business_info=excluded.approved_business_info,pricing_policy=excluded.pricing_policy,business_hours=excluded.business_hours,fallback_message=excluded.fallback_message,approved_at=now();
  delete from public.business_faqs where business_id=target_business;
  for entry in select value from jsonb_array_elements(faqs) loop
    insert into public.business_faqs(business_id,question,answer,published,position) values(target_business,entry->>'question',entry->>'answer',true,position);
    position:=position+1;
  end loop;
  insert into public.activity_logs(business_id,actor_user_id,actor_type,event_type,entity_type,entity_id) values(target_business,auth.uid(),'member','chatbot.knowledge_approved','business',target_business);
end;
$$;
revoke all on function public.save_chatbot_settings(uuid,jsonb,jsonb,boolean) from public,anon;
grant execute on function public.save_chatbot_settings(uuid,jsonb,jsonb,boolean) to authenticated;

create table private.chatbot_client_limits (
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_digest text not null check(client_digest ~ '^[a-f0-9]{64}$'),
  bucket timestamptz not null,
  requests integer not null check(requests between 1 and 20),
  primary key(business_id,client_digest,bucket)
);
revoke all on private.chatbot_client_limits from public,anon,authenticated;
create function public.reserve_chat_request(target_business uuid, client_digest text, request uuid, model_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare used integer; usage uuid; hour_bucket timestamptz:=date_trunc('hour',now());
begin
  perform 1 from public.businesses where id=target_business for update;
  select requests into used from private.chatbot_client_limits c where c.business_id=target_business and c.client_digest=reserve_chat_request.client_digest and c.bucket=hour_bucket;
  if coalesce(used,0)>=20 then raise exception 'AI_USAGE_LIMIT' using errcode='P0001'; end if;
  usage:=public.reserve_ai_request(target_business,null,request,'customer_chatbot',model_name,false);
  delete from private.chatbot_client_limits where business_id=target_business and bucket<now()-interval '1 day';
  insert into private.chatbot_client_limits values(target_business,client_digest,hour_bucket,1)
    on conflict(business_id,client_digest,bucket) do update set requests=private.chatbot_client_limits.requests+1;
  return usage;
end;
$$;
revoke all on function public.reserve_chat_request(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_chat_request(uuid,text,uuid,text) to service_role;
commit;

