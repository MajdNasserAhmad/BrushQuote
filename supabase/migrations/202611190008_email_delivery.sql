begin;
alter table public.email_logs drop constraint email_logs_status_check;
alter table public.email_logs add constraint email_logs_status_check check(status in ('draft','queued','submitted','delivered','bounced','complained','failed'));
alter table public.email_logs add column created_by uuid references public.profiles(id);
alter table public.email_logs add column payload jsonb;
alter table public.email_logs add column confirmed_at timestamptz;
alter table public.email_logs add column attempt_at timestamptz;
alter table public.email_logs add column attempts integer not null default 0;
alter table public.email_logs add constraint email_actor_tenant foreign key(business_id,created_by) references public.business_memberships(business_id,user_id);
-- Payloads are immutable snapshots. Only the server may create drafts or advance delivery.
revoke insert,update,delete on public.email_logs from authenticated;
create function public.create_email_draft(target_business uuid, actor uuid, customer uuid, quotation uuid, job uuid, kind text, envelope jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; destination text;
begin
  if not exists(select 1 from public.business_memberships where business_id=target_business and user_id=actor and role in ('owner','admin','member')) then raise exception 'Access denied' using errcode='42501'; end if;
  perform 1 from public.businesses where id=target_business for update;
  select email into destination from public.customers where business_id=target_business and id=customer and archived_at is null;
  if destination is null or length(destination)<3 or envelope->'to'<>jsonb_build_array(destination) then raise exception 'Invalid customer recipient'; end if;
  if quotation is not null and not exists(select 1 from public.quotations where business_id=target_business and id=quotation and customer_id=customer) then raise exception 'Invalid quotation'; end if;
  if job is not null and not exists(select 1 from public.jobs where business_id=target_business and id=job and customer_id=customer) then raise exception 'Invalid job'; end if;
  if kind not in ('customer_message','new_quote_request','quotation_sent','quotation_accepted','quotation_rejected','appointment_confirmation','job_update') then raise exception 'Invalid template'; end if;
  if (select count(*) from public.email_logs where business_id=target_business and created_at>now()-interval '1 hour')>=50 then raise exception 'EMAIL_RATE_LIMIT'; end if;
  if octet_length(envelope::text)>8000000 or length(envelope->>'text') not between 1 and 10000 then raise exception 'Invalid payload'; end if;
  insert into public.email_logs(business_id,customer_id,quotation_id,job_id,template,recipient,subject,status,created_by,payload)
    values(target_business,customer,quotation,job,kind,destination,envelope->>'subject','draft',actor,envelope) returning id into result;
  return result;
end;
$$;
revoke all on function public.create_email_draft(uuid,uuid,uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_email_draft(uuid,uuid,uuid,uuid,uuid,text,jsonb) to service_role;
create function public.claim_email_send(target_business uuid, actor uuid, email uuid, confirmed boolean) returns public.email_logs
language plpgsql security definer set search_path='' as $$
declare item public.email_logs;
begin
  if confirmed is distinct from true or not exists(select 1 from public.business_memberships where business_id=target_business and user_id=actor and role in ('owner','admin','member')) then raise exception 'Confirmation and membership required' using errcode='42501'; end if;
  select * into item from public.email_logs where business_id=target_business and id=email for update;
  if not found or item.payload is null then raise exception 'Invalid email'; end if;
  if item.status not in ('draft','queued') then raise exception 'EMAIL_ALREADY_PROCESSED'; end if;
  -- Ambiguous requests can be retried with the exact envelope/key only inside Resend's 24-hour window.
  if item.status='queued' and (item.attempt_at>now()-interval '2 minutes' or item.confirmed_at<now()-interval '23 hours') then raise exception 'EMAIL_RECONCILE_REQUIRED'; end if;
  update public.email_logs set status='queued',confirmed_at=coalesce(confirmed_at,now()),attempt_at=now(),attempts=attempts+1 where id=email returning * into item;
  insert into public.activity_logs(business_id,actor_user_id,actor_type,event_type,entity_type,entity_id) values(target_business,actor,'member','email.send_confirmed','email',email);
  return item;
end;
$$;
revoke all on function public.claim_email_send(uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.claim_email_send(uuid,uuid,uuid,boolean) to service_role;
create function public.record_email_event(provider text, event_status text, event_time timestamptz) returns boolean
language plpgsql security definer set search_path='' as $$
declare item public.email_logs;
begin
  if event_status not in ('submitted','delivered','bounced','complained','failed') then raise exception 'Unsupported event'; end if;
  select * into item from public.email_logs where provider_id=provider for update;
  if not found then return false; end if;
  if item.provider_event_at is not null and item.provider_event_at>=event_time then return true; end if;
  -- A late sent event must never erase delivery/failure evidence.
  if event_status='submitted' and item.status in ('delivered','bounced','complained','failed') then return true; end if;
  if item.status in ('bounced','complained') and event_status in ('submitted','delivered') then return true; end if;
  update public.email_logs set status=event_status,provider_event_at=event_time,
    delivered_at=case when event_status='delivered' then event_time else delivered_at end where id=item.id;
  return true;
end;
$$;
revoke all on function public.record_email_event(text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_email_event(text,text,timestamptz) to service_role;
commit;
