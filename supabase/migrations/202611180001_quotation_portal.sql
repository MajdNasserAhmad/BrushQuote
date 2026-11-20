begin;
create table public.quotation_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  quotation_id uuid not null,
  sender_type text not null check(sender_type in ('customer','member')),
  body text not null check(length(trim(body)) between 1 and 2000),
  request_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key(business_id,quotation_id) references public.quotations(business_id,id),
  unique(quotation_id,request_id)
);
create index quotation_messages_quote_idx on public.quotation_messages(business_id,quotation_id,created_at);
alter table public.quotation_messages enable row level security;
revoke all on public.quotation_messages from public,anon,authenticated;
grant select on public.quotation_messages to authenticated;
grant all on public.quotation_messages to service_role;
create policy tenant_read on public.quotation_messages for select to authenticated using(private.is_business_member(business_id));
create trigger keep_tenant before update on public.quotation_messages for each row execute function private.prevent_tenant_move();
create table private.quotation_portal_limits (
  token_id uuid primary key references public.quotation_access_tokens(id) on delete cascade,
  window_start timestamptz not null,
  count integer not null
);
alter table private.quotation_portal_limits enable row level security;
revoke all on private.quotation_portal_limits from public,anon,authenticated;

create function public.publish_quotation(target_business uuid, quotation uuid, expected_version integer, pdf_object text, access_digest text) returns void
language plpgsql security definer set search_path='' as $$
declare q public.quotations;
begin
  if not private.is_business_member(target_business) then raise exception 'Access denied' using errcode='42501'; end if;
  select * into q from public.quotations where business_id=target_business and id=quotation for update;
  if q.id is null then raise exception 'Quotation unavailable' using errcode='42501'; end if;
  if q.version is distinct from expected_version or q.status='cancelled' then raise exception 'Quotation changed' using errcode='40001'; end if;
  if q.status='draft' and q.expires_on<current_date then raise exception 'Quotation expired' using errcode='22023'; end if;
  if pdf_object is null or pdf_object not like target_business::text || '/' || quotation::text || '/%'
    or not exists(select 1 from storage.objects where bucket_id='quotation-pdfs' and name=pdf_object)
    or (q.status<>'draft' and pdf_object is distinct from q.pdf_path) then raise exception 'Invalid PDF snapshot' using errcode='22023'; end if;
  update public.quotations set status=case when status='draft' then 'sent' else status end,
    approved_by=coalesce(approved_by,auth.uid()),approved_at=coalesce(approved_at,now()),sent_at=coalesce(sent_at,now()),pdf_path=pdf_object,version=version+1
    where id=quotation and business_id=target_business;
  update public.quotation_access_tokens set revoked_at=now() where business_id=target_business and quotation_id=quotation and revoked_at is null;
  insert into public.quotation_access_tokens(business_id,quotation_id,token_hash,expires_at)
    values(target_business,quotation,access_digest,now()+interval '90 days');
  if q.lead_id is not null and q.status='draft' then
    update public.leads set status='quote_sent' where business_id=target_business and id=q.lead_id and status not in ('won','lost');
  end if;
  insert into public.activity_logs(business_id,actor_user_id,actor_type,event_type,entity_type,entity_id)
    values(target_business,auth.uid(),'member',case when q.status='draft' then 'quotation.published' else 'quotation.link_rotated' end,'quotation',quotation);
end;
$$;
revoke all on function public.publish_quotation(uuid,uuid,integer,text,text) from public,anon;
grant execute on function public.publish_quotation(uuid,uuid,integer,text,text) to authenticated;

-- Only server-side service credentials can resolve token hashes. No arbitrary ID lookup.
create function public.portal_quotation(access_digest text) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'quote',jsonb_build_object('reference',q.reference,'status',case when q.status='sent' and q.expires_on<current_date then 'expired' else q.status end,
      'currency',q.currency,'issued_on',q.issued_on,'expires_on',q.expires_on,'decided_at',q.decided_at,
      'sender_snapshot',q.sender_snapshot - 'logo_path','customer_snapshot',q.customer_snapshot,
      'subtotal',q.subtotal::text,'discount_amount',q.discount_amount::text,'additional_charges',q.additional_charges::text,
      'tax_rate',q.tax_rate::text,'tax_amount',q.tax_amount::text,'total',q.total::text,'terms',q.terms,'customer_notes',q.customer_notes),
    'items',(select coalesce(jsonb_agg(jsonb_build_object('description',i.description,'unit',i.unit,'quantity',i.quantity::text,'unit_price',i.unit_price::text,'line_total',i.line_total::text) order by i.position),'[]'::jsonb)
      from public.quotation_items i where i.business_id=q.business_id and i.quotation_id=q.id),
    'messages',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'sender_type',m.sender_type,'body',m.body,'created_at',m.created_at) order by m.created_at),'[]'::jsonb)
      from (select * from public.quotation_messages where business_id=q.business_id and quotation_id=q.id order by created_at desc limit 100) m),
    'pdf_path',q.pdf_path)
  from public.quotation_access_tokens t join public.quotations q on q.business_id=t.business_id and q.id=t.quotation_id
  where t.token_hash=access_digest and t.revoked_at is null and t.expires_at>now() and q.status in ('sent','accepted','rejected','expired');
$$;
revoke all on function public.portal_quotation(text) from public,anon,authenticated;
grant execute on function public.portal_quotation(text) to service_role;

create function public.respond_to_quotation(access_digest text, decision text, message text, message_request uuid) returns text
language plpgsql security definer set search_path='' as $$
declare token public.quotation_access_tokens; q public.quotations; attempts integer; existing_decision boolean;
begin
  if decision is null or decision not in ('accepted','rejected','message') or message is null or length(message)>2000 or (decision='message' and length(trim(message))=0) or message_request is null then
    raise exception 'Invalid response' using errcode='22023';
  end if;
  select * into token from public.quotation_access_tokens where token_hash=access_digest and revoked_at is null and expires_at>now();
  if token.id is null then raise exception 'Link unavailable' using errcode='42501'; end if;
  -- Lock order matches publication: quotation first, token second. Recheck after waiting.
  select * into q from public.quotations where business_id=token.business_id and id=token.quotation_id for update;
  perform 1 from public.quotation_access_tokens where id=token.id and revoked_at is null and expires_at>now() for share;
  if not found or q.status not in ('sent','accepted','rejected','expired') then raise exception 'Link unavailable' using errcode='42501'; end if;
  existing_decision:=(q.status=decision);
  if decision<>'message' and not existing_decision and (q.status<>'sent' or q.expires_on<current_date) then raise exception 'Decision unavailable' using errcode='40001'; end if;
  -- Network retries are idempotent. They cannot duplicate the decision or message.
  if exists(select 1 from public.quotation_messages where quotation_id=q.id and request_id=message_request) then return q.status; end if;
  if existing_decision then return q.status; end if;
  insert into private.quotation_portal_limits(token_id,window_start,count) values(token.id,now(),1)
    on conflict(token_id) do update set count=case when private.quotation_portal_limits.window_start<now()-interval '1 minute' then 1 else private.quotation_portal_limits.count+1 end,
      window_start=case when private.quotation_portal_limits.window_start<now()-interval '1 minute' then now() else private.quotation_portal_limits.window_start end returning count into attempts;
  if attempts>10 then raise exception 'Too many responses; try again later' using errcode='P0001'; end if;
  if decision<>'message' then
    update public.quotations set status=decision,decided_at=now(),version=version+1 where business_id=q.business_id and id=q.id;
    if q.lead_id is not null then update public.leads set status=case when decision='accepted' then 'won' else 'lost' end where business_id=q.business_id and id=q.lead_id; end if;
    insert into public.activity_logs(business_id,actor_type,event_type,entity_type,entity_id)
      values(q.business_id,'customer','quotation.'||decision,'quotation',q.id);
  end if;
  if length(trim(message))>0 then
    insert into public.quotation_messages(business_id,quotation_id,sender_type,body,request_id) values(q.business_id,q.id,'customer',trim(message),message_request);
    insert into public.activity_logs(business_id,actor_type,event_type,entity_type,entity_id) values(q.business_id,'customer','quotation.message_received','quotation',q.id);
  end if;
  return case when decision='message' then q.status else decision end;
end;
$$;
revoke all on function public.respond_to_quotation(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.respond_to_quotation(text,text,text,uuid) to service_role;
commit;
