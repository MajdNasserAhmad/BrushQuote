begin;
create extension if not exists btree_gist with schema extensions;
alter table public.jobs add column timezone text not null default 'UTC';
alter table public.jobs add column version integer not null default 1;
alter table public.appointments add column version integer not null default 1;
create table private.worker_reservations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  user_id uuid not null,
  job_id uuid,
  appointment_id uuid,
  duration tstzrange not null,
  check ((job_id is null) <> (appointment_id is null)),
  check(not isempty(duration) and not lower_inf(duration) and not upper_inf(duration)),
  foreign key(business_id,user_id) references public.business_memberships(business_id,user_id),
  foreign key(business_id,job_id) references public.jobs(business_id,id) on delete cascade,
  foreign key(business_id,appointment_id) references public.appointments(business_id,id) on delete cascade,
  unique(business_id,job_id,user_id), unique(business_id,appointment_id),
  exclude using gist (business_id extensions.gist_uuid_ops with =, user_id extensions.gist_uuid_ops with =, duration with &&)
);
alter table private.worker_reservations enable row level security;
revoke all on private.worker_reservations from public,anon,authenticated;

create function private.booking_time(local_time text, zone text) returns timestamptz
language plpgsql stable set search_path='' as $$
declare wall timestamp; instant timestamptz;
begin
  if local_time is null or local_time !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$' or zone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=zone) then raise exception 'Invalid time or timezone' using errcode='22023'; end if;
  wall:=local_time::timestamp;
  if wall<'2000-01-01'::timestamp or wall>'2200-01-01'::timestamp then raise exception 'Unsupported date' using errcode='22023'; end if;
  instant:=wall at time zone zone;
  if (instant at time zone zone)<>wall then raise exception 'This local time does not exist because of a clock change' using errcode='22023'; end if;
  if exists(select 1 from generate_series(-180,180,15) offset_minutes where offset_minutes<>0 and (instant+offset_minutes*interval '1 minute') at time zone zone=wall) then
    raise exception 'This local time is ambiguous; choose UTC or a time outside the clock change' using errcode='22023';
  end if;
  return instant;
end;
$$;
revoke all on function private.booking_time(text,text) from public,anon,authenticated;

create function public.save_job(target_business uuid, job uuid, expected_version integer, details jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare saved uuid; contact uuid; quote_id uuid; q public.quotations; old public.jobs; start_time timestamptz; finish_time timestamptz; budget_value numeric; currency_value text; workers uuid[]; worker uuid; new_status text;
begin
  if not private.is_business_member(target_business) then raise exception 'Access denied' using errcode='42501'; end if;
  -- Serialize business scheduling mutations before taking other locks.
  perform 1 from public.businesses where id=target_business for update;
  if job is not null then
    select * into old from public.jobs where id=job and business_id=target_business for update;
    if old.id is null then raise exception 'Job unavailable' using errcode='42501'; end if;
    if old.version is distinct from expected_version then raise exception 'Job changed' using errcode='40001'; end if;
  end if;
  contact:=(details->>'customer_id')::uuid; quote_id:=nullif(details->>'quotation_id','')::uuid; new_status:=details->>'status';
  if not exists(select 1 from public.customers where business_id=target_business and id=contact and archived_at is null) then raise exception 'Customer unavailable' using errcode='42501'; end if;
  if old.id is not null and old.quotation_id is distinct from quote_id then raise exception 'Cannot change the source quotation' using errcode='22023'; end if;
  select currency into currency_value from public.businesses where id=target_business;
  if quote_id is not null then
    select * into q from public.quotations where business_id=target_business and id=quote_id and customer_id=contact and status='accepted';
    if q.id is null then raise exception 'Accepted quotation unavailable' using errcode='42501'; end if;
    budget_value:=q.total; currency_value:=q.currency;
  else
    if coalesce(details->>'budget','') !~ '^\d{1,10}(\.\d{1,4})?$' then raise exception 'Invalid budget' using errcode='22023'; end if;
    budget_value:=(details->>'budget')::numeric;
    if budget_value<>round(budget_value,case when currency_value='JOD' then 3 else 2 end) then raise exception 'Invalid budget precision' using errcode='22023'; end if;
  end if;
  start_time:=private.booking_time(details->>'starts_local',details->>'timezone'); finish_time:=private.booking_time(details->>'ends_local',details->>'timezone');
  if finish_time<=start_time then raise exception 'End must follow start' using errcode='22023'; end if;
  if jsonb_typeof(details->'workers') is distinct from 'array' then raise exception 'Choose workers' using errcode='22023'; end if;
  workers:=array(select distinct value::uuid from jsonb_array_elements_text(details->'workers'));
  if cardinality(workers) not between 1 and 50 then raise exception 'Choose between 1 and 50 workers' using errcode='22023'; end if;
  foreach worker in array workers loop
    if not exists(select 1 from public.business_memberships where business_id=target_business and user_id=worker) then raise exception 'Worker unavailable' using errcode='42501'; end if;
  end loop;
  if job is null then
    insert into public.jobs(business_id,customer_id,quotation_id,title,property_address,description,status,starts_at,ends_at,completed_at,currency,budget,internal_notes,timezone)
      values(target_business,contact,quote_id,trim(details->>'title'),trim(details->>'property_address'),coalesce(details->>'description',''),new_status,start_time,finish_time,
        case when new_status='completed' then now() else null end,currency_value,budget_value,coalesce(details->>'internal_notes',''),details->>'timezone') returning id into saved;
  else
    update public.jobs set customer_id=contact,title=trim(details->>'title'),property_address=trim(details->>'property_address'),description=coalesce(details->>'description',''),status=new_status,
      starts_at=start_time,ends_at=finish_time,completed_at=case when new_status='completed' then coalesce(completed_at,now()) else null end,currency=currency_value,budget=budget_value,
      internal_notes=coalesce(details->>'internal_notes',''),timezone=details->>'timezone',version=version+1 where business_id=target_business and id=job returning id into saved;
    delete from private.worker_reservations where business_id=target_business and job_id=saved;
    delete from public.job_assignments where business_id=target_business and job_id=saved;
  end if;
  foreach worker in array workers loop
    insert into public.job_assignments(business_id,job_id,user_id) values(target_business,saved,worker);
    if new_status in ('scheduled','in_progress') then insert into private.worker_reservations(business_id,user_id,job_id,duration) values(target_business,worker,saved,tstzrange(start_time,finish_time,'[)')); end if;
  end loop;
  insert into public.activity_logs(business_id,actor_user_id,actor_type,event_type,entity_type,entity_id,metadata)
    values(target_business,auth.uid(),'member',case when job is null then 'job.created' else 'job.updated' end,'job',saved,jsonb_build_object('previous_status',old.status,'status',new_status));
  return saved;
end;
$$;
revoke all on function public.save_job(uuid,uuid,integer,jsonb) from public,anon;
grant execute on function public.save_job(uuid,uuid,integer,jsonb) to authenticated;

create function public.save_appointment(target_business uuid, appointment uuid, expected_version integer, details jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare saved uuid; contact uuid; related_job uuid; worker uuid; old public.appointments; start_time timestamptz; finish_time timestamptz; new_status text;
begin
  if not private.is_business_member(target_business) then raise exception 'Access denied' using errcode='42501'; end if;
  perform 1 from public.businesses where id=target_business for update;
  if appointment is not null then
    select * into old from public.appointments where id=appointment and business_id=target_business for update;
    if old.id is null then raise exception 'Appointment unavailable' using errcode='42501'; end if;
    if old.version is distinct from expected_version then raise exception 'Appointment changed' using errcode='40001'; end if;
  end if;
  contact:=(details->>'customer_id')::uuid; related_job:=nullif(details->>'job_id','')::uuid; worker:=(details->>'assigned_user_id')::uuid; new_status:=details->>'status';
  if not exists(select 1 from public.customers where business_id=target_business and id=contact and archived_at is null)
    or not exists(select 1 from public.business_memberships where business_id=target_business and user_id=worker) then raise exception 'Customer or worker unavailable' using errcode='42501'; end if;
  if related_job is not null and not exists(select 1 from public.jobs where business_id=target_business and id=related_job and customer_id=contact and status<>'cancelled') then raise exception 'Job unavailable' using errcode='42501'; end if;
  start_time:=private.booking_time(details->>'starts_local',details->>'timezone'); finish_time:=private.booking_time(details->>'ends_local',details->>'timezone');
  if finish_time<=start_time then raise exception 'End must follow start' using errcode='22023'; end if;
  if appointment is null then
    insert into public.appointments(business_id,customer_id,job_id,assigned_user_id,title,starts_at,ends_at,timezone,status,notes)
      values(target_business,contact,related_job,worker,trim(details->>'title'),start_time,finish_time,details->>'timezone',new_status,coalesce(details->>'notes','')) returning id into saved;
  else
    update public.appointments set customer_id=contact,job_id=related_job,assigned_user_id=worker,title=trim(details->>'title'),starts_at=start_time,ends_at=finish_time,timezone=details->>'timezone',status=new_status,notes=coalesce(details->>'notes',''),version=version+1
      where business_id=target_business and id=appointment returning id into saved;
    delete from private.worker_reservations where business_id=target_business and appointment_id=saved;
  end if;
  if new_status='scheduled' then insert into private.worker_reservations(business_id,user_id,appointment_id,duration) values(target_business,worker,saved,tstzrange(start_time,finish_time,'[)')); end if;
  insert into public.activity_logs(business_id,actor_user_id,actor_type,event_type,entity_type,entity_id,metadata)
    values(target_business,auth.uid(),'member',case when appointment is null then 'appointment.created' else 'appointment.updated' end,'appointment',saved,jsonb_build_object('previous_status',old.status,'status',new_status));
  return saved;
end;
$$;
revoke all on function public.save_appointment(uuid,uuid,integer,jsonb) from public,anon;
grant execute on function public.save_appointment(uuid,uuid,integer,jsonb) to authenticated;
commit;
