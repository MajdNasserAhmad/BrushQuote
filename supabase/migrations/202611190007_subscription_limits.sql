begin;
create table public.subscription_plans (
  id text primary key check(id in ('free','starter','professional')),
  name text not null,
  daily_ai integer not null check(daily_ai>=0), monthly_ai integer not null check(monthly_ai>=0), monthly_quotes integer not null check(monthly_quotes>=0),
  ai_tasks text[] not null
);
insert into public.subscription_plans values
  ('free','Free',5,20,10,array['quote_generator','business_assistant']),
  ('starter','Starter',20,200,100,array['quote_generator','email_assistant','job_planner','business_assistant']),
  ('professional','Professional',100,1000,1000,array['quote_generator','photo_analyzer','email_assistant','business_analyst','customer_chatbot','job_planner','business_assistant']);
alter table public.subscription_plans enable row level security;
revoke all on public.subscription_plans from public,anon,authenticated;
grant select on public.subscription_plans to anon,authenticated;
grant all on public.subscription_plans to service_role;
create policy public_plan_catalog on public.subscription_plans for select to anon,authenticated using(true);
create table public.business_subscriptions (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id),
  status text not null check(status in ('trial','active')),
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(status<>'trial' or trial_ends_at is not null)
);
alter table public.business_subscriptions enable row level security;
revoke all on public.business_subscriptions from public,anon,authenticated;
grant select on public.business_subscriptions to authenticated;
grant all on public.business_subscriptions to service_role;
create policy tenant_read on public.business_subscriptions for select to authenticated using(private.is_business_member(business_id));
create trigger keep_tenant before update on public.business_subscriptions for each row execute function private.prevent_tenant_move();
create trigger set_updated_at before update on public.business_subscriptions for each row execute function public.set_updated_at();
create function private.start_business_trial() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.business_subscriptions(business_id,plan_id,status,trial_ends_at) values(new.id,'professional','trial',now()+interval '14 days'); return new;
end;
$$;
revoke all on function private.start_business_trial() from public,anon,authenticated;
create trigger start_trial after insert on public.businesses for each row execute function private.start_business_trial();
insert into public.business_subscriptions(business_id,plan_id,status,trial_ends_at) select id,'professional','trial',now()+interval '14 days' from public.businesses;
create function private.effective_plan(target_business uuid) returns public.subscription_plans language sql stable security definer set search_path='' as $$
  select p.* from public.subscription_plans p where p.id=coalesce((select case when s.status='trial' and s.trial_ends_at<=now() then 'free' else s.plan_id end from public.business_subscriptions s where s.business_id=target_business),'free');
$$;
revoke all on function private.effective_plan(uuid) from public,anon,authenticated;
create function private.enforce_subscription_limit() returns trigger language plpgsql security definer set search_path='' as $$
declare plan public.subscription_plans; day_start timestamptz:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'; month_start timestamptz:=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
begin
  perform 1 from public.businesses where id=new.business_id for update;
  plan:=private.effective_plan(new.business_id);
  if tg_table_name='ai_usage' then
    if not (new.task=any(plan.ai_tasks)) then raise exception 'AI_PLAN_FEATURE' using errcode='P0001'; end if;
    if (select count(*) from public.ai_usage where business_id=new.business_id and created_at>=day_start)>=plan.daily_ai or
       (select count(*) from public.ai_usage where business_id=new.business_id and created_at>=month_start)>=plan.monthly_ai then raise exception 'AI_USAGE_LIMIT' using errcode='P0001'; end if;
  elsif tg_table_name='quotations' then
    if (select count(*) from public.quotations where business_id=new.business_id and created_at>=month_start)>=plan.monthly_quotes then raise exception 'QUOTATION_PLAN_LIMIT' using errcode='P0001'; end if;
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_subscription_limit() from public,anon,authenticated;
create trigger subscription_limit before insert on public.ai_usage for each row execute function private.enforce_subscription_limit();
create trigger subscription_limit before insert on public.quotations for each row execute function private.enforce_subscription_limit();
create table public.plan_change_requests (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null, plan_id text not null references public.subscription_plans(id),
  status text not null default 'pending' check(status in ('pending','approved','declined','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(business_id,user_id) references public.business_memberships(business_id,user_id)
);
create unique index one_pending_plan_request on public.plan_change_requests(business_id) where status='pending';
alter table public.plan_change_requests enable row level security;
revoke all on public.plan_change_requests from public,anon,authenticated;
grant select on public.plan_change_requests to authenticated;
grant all on public.plan_change_requests to service_role;
create policy tenant_read on public.plan_change_requests for select to authenticated using(private.is_business_member(business_id));
create trigger keep_tenant before update on public.plan_change_requests for each row execute function private.prevent_tenant_move();
create trigger set_updated_at before update on public.plan_change_requests for each row execute function public.set_updated_at();
create function public.request_plan_change(target_business uuid, requested_plan text, confirmed boolean) returns void language plpgsql security definer set search_path='' as $$
begin
  if confirmed is distinct from true or not private.is_business_member(target_business,array['owner']) then raise exception 'Owner confirmation required' using errcode='42501'; end if;
  perform 1 from public.businesses where id=target_business for update;
  if not exists(select 1 from public.subscription_plans where id=requested_plan) then raise exception 'Unknown plan'; end if;
  update public.plan_change_requests set status='cancelled' where business_id=target_business and status='pending';
  insert into public.plan_change_requests(business_id,user_id,plan_id) values(target_business,auth.uid(),requested_plan);
  insert into public.activity_logs(business_id,actor_user_id,actor_type,event_type,entity_type,entity_id) values(target_business,auth.uid(),'member','subscription.change_requested','business',target_business);
end;
$$;
revoke all on function public.request_plan_change(uuid,text,boolean) from public,anon;
grant execute on function public.request_plan_change(uuid,text,boolean) to authenticated;
create function public.subscription_summary(target_business uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare plan public.subscription_plans; month_start timestamptz:=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
begin
  if not private.is_business_member(target_business) then raise exception 'Access denied' using errcode='42501'; end if;
  plan:=private.effective_plan(target_business);
  return jsonb_build_object('plan',to_jsonb(plan),'subscription',(select to_jsonb(s) from public.business_subscriptions s where business_id=target_business),'ai_used',(select count(*) from public.ai_usage where business_id=target_business and created_at>=month_start),'quotes_used',(select count(*) from public.quotations where business_id=target_business and created_at>=month_start));
end;
$$;
revoke all on function public.subscription_summary(uuid) from public,anon;
grant execute on function public.subscription_summary(uuid) to authenticated;
commit;
