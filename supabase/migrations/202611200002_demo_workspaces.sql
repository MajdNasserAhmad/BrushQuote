begin;
alter table public.businesses add column is_demo boolean not null default false;
-- Existing column-specific update grants deliberately exclude this operator-only flag.
create function private.prevent_demo_email() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='queued' and exists(select 1 from public.businesses where id=new.business_id and is_demo) then raise exception 'DEMO_EMAIL_DISABLED'; end if;
  return new;
end;
$$;
revoke all on function private.prevent_demo_email() from public,anon,authenticated;
create trigger demo_email_guard before insert or update on public.email_logs for each row execute function private.prevent_demo_email();
commit;
