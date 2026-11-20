begin;
create function private.notify_business_event() returns trigger language plpgsql security definer set search_path='' as $$
declare event_name text; description text; destination text;
begin
  if tg_table_name='quotations' then
    if old.status=new.status or new.status not in ('sent','accepted','rejected') then return new; end if;
    event_name:='quotation.'||new.status; description:='Quotation '||new.reference||' is '||new.status||'.'; destination:='/dashboard/quotations/'||new.id;
  elsif tg_table_name='jobs' then
    if tg_op='UPDATE' and old.status=new.status and old.starts_at is not distinct from new.starts_at and old.ends_at is not distinct from new.ends_at then return new; end if;
    event_name:='job.updated'; description:='Job updated: '||left(new.title,300)||'. Status: '||new.status||'.'; destination:='/dashboard/jobs/'||new.id;
  else
    if tg_op='UPDATE' and old.status=new.status and old.starts_at is not distinct from new.starts_at and old.ends_at is not distinct from new.ends_at then return new; end if;
    event_name:='appointment.updated'; description:='Appointment updated: '||left(new.title,300)||'. Status: '||new.status||'.'; destination:='/dashboard/appointments/'||new.id;
  end if;
  insert into public.notifications(business_id,user_id,event_type,message,destination_path)
    select new.business_id,user_id,event_name,description,destination from public.business_memberships where business_id=new.business_id;
  return new;
end;
$$;
revoke all on function private.notify_business_event() from public,anon,authenticated;
create trigger business_event after update on public.quotations for each row execute function private.notify_business_event();
create trigger business_event after insert or update on public.jobs for each row execute function private.notify_business_event();
create trigger business_event after insert or update on public.appointments for each row execute function private.notify_business_event();

create function public.create_notification_email(target_business uuid, actor uuid, notification uuid, envelope jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; destination text; item public.notifications; kind text;
begin
  if not exists(select 1 from public.business_memberships where business_id=target_business and user_id=actor) or not exists(select 1 from public.notification_preferences where business_id=target_business and user_id=actor and email_notifications) then raise exception 'Notification preference required' using errcode='42501'; end if;
  perform 1 from public.businesses where id=target_business for update;
  select * into item from public.notifications where business_id=target_business and user_id=actor and id=notification;
  if not found then raise exception 'Notification unavailable'; end if;
  select email into destination from auth.users where id=actor;
  if destination is null or envelope->'to'<>jsonb_build_array(destination) or length(envelope->>'text') not between 1 and 10000 or octet_length(envelope::text)>100000 then raise exception 'Invalid notification envelope'; end if;
  if (select count(*) from public.email_logs where business_id=target_business and created_at>now()-interval '1 hour')>=50 then raise exception 'EMAIL_RATE_LIMIT'; end if;
  kind:=case item.event_type when 'quotation.sent' then 'quotation_sent' when 'quotation.accepted' then 'quotation_accepted' when 'quotation.rejected' then 'quotation_rejected' when 'job.updated' then 'job_update' when 'appointment.updated' then 'appointment_confirmation' else 'new_quote_request' end;
  insert into public.email_logs(business_id,template,recipient,subject,status,created_by,payload)
    values(target_business,kind,destination,envelope->>'subject','draft',actor,envelope) returning id into result;
  return result;
end;
$$;
revoke all on function public.create_notification_email(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_notification_email(uuid,uuid,uuid,jsonb) to service_role;
commit;
