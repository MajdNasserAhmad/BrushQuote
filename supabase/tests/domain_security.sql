-- Requires all migrations; isolated disposable Supabase database only.
-- Execute with psql -v ON_ERROR_STOP=1. No fixture data survives success.
begin;

-- Assert actual catalog permissions and RLS, rather than matching SQL source text.
do $$
declare relation text;
begin
  foreach relation in array array['profiles','businesses','business_memberships','business_services',
    'business_pricing_rules','customers','customer_addresses','leads','lead_photos','quotations',
    'quotation_items','quotation_access_tokens','jobs','appointments','job_assignments','activity_logs',
    'email_logs','ai_usage','ai_conversations','ai_messages','business_chatbot_settings','business_faqs','notifications'] loop
    if not exists(select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = relation and c.relrowsecurity) then
      raise exception 'RLS missing on %',relation;
    end if;
    if has_table_privilege('anon','public.' || relation,'SELECT,INSERT,UPDATE,DELETE') then
      raise exception 'Anonymous access granted on %',relation;
    end if;
  end loop;
  foreach relation in array array['quotations','quotation_items','quotation_access_tokens','ai_usage','activity_logs','email_logs'] loop
    if has_table_privilege('authenticated','public.' || relation,'INSERT,UPDATE,DELETE') then
      raise exception 'Sensitive table allows direct client writes: %',relation;
    end if;
  end loop;
  if has_table_privilege('authenticated','public.quotation_access_tokens','SELECT') then
    raise exception 'Portal token hashes exposed';
  end if;
  if exists(select 1 from storage.buckets where id in ('lead-photos','quotation-pdfs','business-logos') and public) then
    raise exception 'Private bucket exposed';
  end if;
end;
$$;

insert into auth.users(id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333');
insert into public.profiles(id) select id from auth.users where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333');
insert into public.businesses(id,name,slug,email,phone,address,currency) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Test company A','test-company-a','a@example.invalid','12345','Test address A','GBP'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Test company B','test-company-b','b@example.invalid','12345','Test address B','GBP');
insert into public.business_memberships(business_id,user_id,role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333','member');
insert into public.customers(id,business_id,full_name) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Customer A'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Customer B');
insert into public.ai_conversations(id,business_id,user_id,title) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333','Private member conversation');
insert into public.ai_messages(business_id,conversation_id,role,content) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','user','Private fixture message');
insert into public.notifications(business_id,user_id,event_type,message) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','test','Owner notice'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333','test','Member notice');

-- Even privileged writers must satisfy composite tenant relationships.
do $$
begin
  begin
    insert into public.customer_addresses(business_id,customer_id,address)
      values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','dddddddd-dddd-4ddd-8ddd-dddddddddddd','Cross tenant address');
    raise exception 'Cross-tenant customer address accepted';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.ai_messages(business_id,conversation_id,role,content)
      values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','user','Cross tenant message');
    raise exception 'Cross-tenant message accepted';
  exception when foreign_key_violation then null;
  end;
  begin
    update public.customers set business_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    raise exception 'Tenant move accepted';
  exception when check_violation then null;
  end;
  begin
    delete from auth.users where id = '11111111-1111-4111-8111-111111111111';
    raise exception 'Owner account deletion orphaned business';
  exception when foreign_key_violation then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
do $$
declare changed integer;
begin
  if (select count(*) from public.customers) <> 1 then raise exception 'Customer tenant isolation failed'; end if;
  if exists(select 1 from public.ai_conversations) then raise exception 'Owner can read another member conversation'; end if;
  if exists(select 1 from public.ai_messages) then raise exception 'Owner can read another member messages'; end if;
  if (select count(*) from public.notifications) <> 1 then raise exception 'Notification recipient isolation failed'; end if;
  update public.notifications set read_at = now();
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'Mark-read affected wrong recipients'; end if;
  begin
    update public.notifications set message = 'Forged message';
    raise exception 'Notification content editable by client';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.quotation_access_tokens;
    raise exception 'Token table readable by client';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
do $$
declare changed integer;
begin
  if (select count(*) from public.customers) <> 1 then raise exception 'Ordinary member read denied'; end if;
  if (select count(*) from public.ai_conversations) <> 1 then raise exception 'Own conversation hidden'; end if;
  if (select count(*) from public.ai_messages) <> 1 then raise exception 'Own messages hidden'; end if;
  update public.businesses set name = 'Member escalation';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Ordinary member changed business settings'; end if;
end;
$$;
reset role;
rollback;
