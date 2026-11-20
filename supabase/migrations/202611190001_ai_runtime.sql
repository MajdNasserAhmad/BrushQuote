begin;
create table public.business_ai_settings (
  business_id uuid primary key references public.businesses(id),
  enabled boolean not null default true,
  vision_enabled boolean not null default true,
  reasoning_enabled boolean not null default false,
  daily_limit integer not null default 20 check (daily_limit between 0 and 100),
  monthly_limit integer not null default 200 check (monthly_limit between 0 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.business_ai_settings enable row level security;
revoke all on public.business_ai_settings from public,anon,authenticated;
grant select on public.business_ai_settings to authenticated;
grant all on public.business_ai_settings to service_role;
create policy tenant_read on public.business_ai_settings for select to authenticated using (private.is_business_member(business_id));
create trigger keep_tenant before update on public.business_ai_settings for each row execute function private.prevent_tenant_move();
create trigger set_updated_at before update on public.business_ai_settings for each row execute function public.set_updated_at();

alter table public.ai_usage add column attempts integer not null default 0 check (attempts between 0 and 3);
create table public.ai_results (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  user_id uuid not null,
  usage_id uuid not null,
  cache_key text not null check (cache_key ~ '^[a-f0-9]{64}$'),
  content jsonb not null check (jsonb_typeof(content)='object' and octet_length(content::text)<=100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id,id),
  unique(usage_id),
  foreign key(business_id,user_id) references public.business_memberships(business_id,user_id),
  foreign key(business_id,usage_id) references public.ai_usage(business_id,id)
);
create index ai_results_cache_idx on public.ai_results(business_id,user_id,cache_key,created_at desc);
alter table public.ai_results enable row level security;
revoke all on public.ai_results from public,anon,authenticated;
grant select on public.ai_results to authenticated;
grant all on public.ai_results to service_role;
create policy result_owner_read on public.ai_results for select to authenticated using (user_id=(select auth.uid()) and private.is_business_member(business_id));
create trigger keep_tenant before update on public.ai_results for each row execute function private.prevent_tenant_move();
create trigger set_updated_at before update on public.ai_results for each row execute function public.set_updated_at();

create function public.save_ai_settings(target_business uuid, settings jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.business_memberships where business_id=target_business and user_id=auth.uid() and role in ('owner','admin')) then raise exception 'Access denied' using errcode='42501'; end if;
  perform 1 from public.businesses where id=target_business for update;
  insert into public.business_ai_settings(business_id,enabled,vision_enabled,reasoning_enabled,daily_limit,monthly_limit)
  values(target_business,(settings->>'enabled')::boolean,(settings->>'vision_enabled')::boolean,(settings->>'reasoning_enabled')::boolean,(settings->>'daily_limit')::integer,(settings->>'monthly_limit')::integer)
  on conflict(business_id) do update set enabled=excluded.enabled,vision_enabled=excluded.vision_enabled,reasoning_enabled=excluded.reasoning_enabled,daily_limit=excluded.daily_limit,monthly_limit=excluded.monthly_limit;
  insert into public.activity_logs(business_id,actor_user_id,actor_type,event_type,entity_type,entity_id) values(target_business,auth.uid(),'member','ai.settings_updated','business',target_business);
end;
$$;
revoke all on function public.save_ai_settings(uuid,jsonb) from public,anon;
grant execute on function public.save_ai_settings(uuid,jsonb) to authenticated;

-- Only the server may reserve generation. The server derives actor from getUser,
-- and this function rechecks the actor's current membership inside the transaction.
create function public.reserve_ai_request(target_business uuid, actor uuid, request uuid, task_name text, model_name text, reasoning boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare config public.business_ai_settings; usage_id uuid; current_day timestamptz; current_month timestamptz;
begin
  if not exists(select 1 from public.business_memberships where business_id=target_business and user_id=actor) then raise exception 'Access denied' using errcode='42501'; end if;
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

create function public.complete_ai_request(target_business uuid, actor uuid, usage uuid, output jsonb, fingerprint text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result_id uuid;
begin
  if not exists(select 1 from public.business_memberships where business_id=target_business and user_id=actor) then raise exception 'Access denied' using errcode='42501'; end if;
  perform 1 from public.ai_usage where business_id=target_business and user_id=actor and id=usage and status='reserved' for update;
  if not found then raise exception 'Reservation unavailable' using errcode='40001'; end if;
  insert into public.ai_results(business_id,user_id,usage_id,cache_key,content) values(target_business,actor,usage,fingerprint,output) returning id into result_id;
  update public.ai_usage set status='succeeded',completed_at=now() where business_id=target_business and id=usage;
  return result_id;
end;
$$;
revoke all on function public.complete_ai_request(uuid,uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.complete_ai_request(uuid,uuid,uuid,jsonb,text) to service_role;
commit;
