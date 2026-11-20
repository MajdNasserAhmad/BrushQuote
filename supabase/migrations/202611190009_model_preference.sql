begin;
alter table public.business_ai_settings add column default_model_role text not null default 'text' check(default_model_role in ('text','reasoning'));
alter table public.business_ai_settings add constraint reasoning_default_enabled check(default_model_role<>'reasoning' or reasoning_enabled);
create or replace function public.save_ai_settings(target_business uuid, settings jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.is_business_member(target_business,array['owner','admin']) then raise exception 'Access denied' using errcode='42501'; end if;
  perform 1 from public.businesses where id=target_business for update;
  insert into public.business_ai_settings(business_id,enabled,vision_enabled,reasoning_enabled,daily_limit,monthly_limit,default_model_role)
  values(target_business,(settings->>'enabled')::boolean,(settings->>'vision_enabled')::boolean,(settings->>'reasoning_enabled')::boolean,(settings->>'daily_limit')::integer,(settings->>'monthly_limit')::integer,coalesce(settings->>'default_model_role','text'))
  on conflict(business_id) do update set enabled=excluded.enabled,vision_enabled=excluded.vision_enabled,reasoning_enabled=excluded.reasoning_enabled,daily_limit=excluded.daily_limit,monthly_limit=excluded.monthly_limit,default_model_role=excluded.default_model_role;
  insert into public.activity_logs(business_id,actor_user_id,actor_type,event_type,entity_type,entity_id) values(target_business,auth.uid(),'member','ai.settings_updated','business',target_business);
end;
$$;
commit;
