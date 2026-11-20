-- Run only against an isolated test Supabase database after applying migrations.
-- Assertions raise exceptions on failure; all fixture data is rolled back.
begin;
insert into auth.users(id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
insert into public.profiles(id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
insert into public.businesses(id,name,slug,email,phone,address,currency) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Test company A','test-company-a','a@example.invalid','12345','Test address A','GBP'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Test company B','test-company-b','b@example.invalid','12345','Test address B','GBP');
insert into public.business_memberships(business_id,user_id,role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','owner');
insert into public.business_services(id,business_id,name) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Test painting');

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
do $$
declare changed integer;
begin
  if (select count(*) from public.businesses) <> 1 then raise exception 'Tenant SELECT isolation failed'; end if;
  if (select count(*) from public.business_memberships) <> 1 then raise exception 'Membership isolation failed'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'Profile isolation failed'; end if;
  if exists(select 1 from public.business_services) then raise exception 'Service isolation failed'; end if;

  update public.businesses set name = 'Unauthorized edit' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Tenant UPDATE isolation failed'; end if;

  begin
    insert into public.business_memberships(business_id,user_id,role)
      values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','admin');
    raise exception 'Membership escalation succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.business_pricing_rules(business_id,service_id,unit,unit_price)
      values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','hour',10);
    raise exception 'Cross-tenant foreign key accepted';
  exception when foreign_key_violation then null;
  end;

  begin
    perform public.onboard_business('{}'::jsonb,'[]'::jsonb);
    raise exception 'Empty service list accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
reset role;
rollback;
