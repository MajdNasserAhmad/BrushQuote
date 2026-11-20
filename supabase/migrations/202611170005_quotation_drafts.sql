begin;
alter table public.quotations add column version integer not null default 1 check(version > 0);
create table private.quotation_counters (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  last_number bigint not null check(last_number > 0)
);
alter table private.quotation_counters enable row level security;
revoke all on private.quotation_counters from public,anon,authenticated;

-- This is the single authoritative calculation path, shared by preview and save.
-- Monetary values leave SQL as decimal strings, never floating-point JSON numbers.
create function private.quote_amounts(items jsonb, discount text, charges text, tax text, currency text) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare item jsonb; q numeric; p numeric; line numeric; subtotal numeric:=0; d numeric; c numeric; t numeric; vat numeric; total numeric;
  digits integer; lines jsonb:='[]'::jsonb;
begin
  if currency not in ('GBP','USD','EUR','JOD','AED','SAR','CAD','AUD','NZD','CHF') then raise exception 'Unsupported currency' using errcode='22023'; end if;
  digits:=case when currency='JOD' then 3 else 2 end;
  if jsonb_typeof(items) is distinct from 'array' then raise exception 'Invalid line items' using errcode='22023'; end if;
  if jsonb_array_length(items) not between 1 and 100 then raise exception 'Use between 1 and 100 items' using errcode='22023'; end if;
  if discount is null or discount !~ '^\d{1,10}(\.\d{1,4})?$' or charges is null or charges !~ '^\d{1,10}(\.\d{1,4})?$'
    or tax is null or tax !~ '^\d{1,3}(\.\d{1,2})?$' then raise exception 'Invalid amounts' using errcode='22023'; end if;
  d:=discount::numeric; c:=charges::numeric; t:=tax::numeric;
  if t>100 or d<>round(d,digits) or c<>round(c,digits) then raise exception 'Invalid discount, charges or tax' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) is distinct from 'object' or coalesce(item->>'quantity','') !~ '^\d{1,10}(\.\d{1,4})?$'
      or coalesce(item->>'unit_price','') !~ '^\d{1,10}(\.\d{1,4})?$' then raise exception 'Invalid quantity or price' using errcode='22023'; end if;
    q:=(item->>'quantity')::numeric; p:=(item->>'unit_price')::numeric;
    if q<=0 then raise exception 'Quantity must be positive' using errcode='22023'; end if;
    line:=round(q*p,digits); subtotal:=subtotal+line;
    lines:=lines || jsonb_build_array(line::text);
  end loop;
  if d>subtotal then raise exception 'Discount exceeds subtotal' using errcode='22023'; end if;
  vat:=round((subtotal-d+c)*t/100,digits); total:=subtotal-d+c+vat;
  if total>=1000000000000 or subtotal>=1000000000000 then raise exception 'Quotation exceeds supported amount' using errcode='22023'; end if;
  return jsonb_build_object('line_totals',lines,'subtotal',subtotal::text,'discount_amount',d::text,'additional_charges',c::text,'tax_rate',t::text,'tax_amount',vat::text,'total',total::text,'currency',currency);
end;
$$;
revoke all on function private.quote_amounts(jsonb,text,text,text,text) from public,anon,authenticated;

create function public.preview_quotation(target_business uuid, details jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare currency text;
begin
  if not private.is_business_member(target_business) then raise exception 'Access denied' using errcode='42501'; end if;
  select b.currency into currency from public.businesses b where id=target_business;
  return private.quote_amounts(details->'items',details->>'discount_amount',details->>'additional_charges',details->>'tax_rate',currency);
end;
$$;
revoke all on function public.preview_quotation(uuid,jsonb) from public,anon;
grant execute on function public.preview_quotation(uuid,jsonb) to authenticated;

create function public.save_quotation(target_business uuid, quotation uuid, expected_version integer, details jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare biz public.businesses; contact public.customers; existing public.quotations; amounts jsonb; item jsonb; saved uuid;
  chosen_lead uuid; next_number bigint; item_position integer:=0; issued date;
begin
  if not private.is_business_member(target_business) then raise exception 'Access denied' using errcode='42501'; end if;
  select * into biz from public.businesses where id=target_business;
  select * into contact from public.customers where id=(details->>'customer_id')::uuid and business_id=target_business and archived_at is null for share;
  if contact.id is null then raise exception 'Customer unavailable' using errcode='42501'; end if;
  chosen_lead:=nullif(details->>'lead_id','')::uuid;
  if chosen_lead is not null then
    perform 1 from public.leads where id=chosen_lead and business_id=target_business and customer_id=contact.id and archived_at is null for share;
    if not found then raise exception 'Lead unavailable or customer mismatch' using errcode='42501'; end if;
  end if;
  amounts:=private.quote_amounts(details->'items',details->>'discount_amount',details->>'additional_charges',details->>'tax_rate',biz.currency);
  if quotation is not null then
    select * into existing from public.quotations where id=quotation and business_id=target_business for update;
    if existing.id is null then raise exception 'Quotation unavailable' using errcode='42501'; end if;
    if existing.status<>'draft' or existing.version is distinct from expected_version then raise exception 'Quotation changed; reload before editing' using errcode='40001'; end if;
  end if;
  issued:=coalesce(existing.issued_on,current_date);
  if nullif(details->>'expires_on','') is null or (details->>'expires_on')::date < greatest(current_date,issued) then raise exception 'Expiration must be today or later' using errcode='22023'; end if;
  if quotation is null then
    insert into private.quotation_counters(business_id,last_number) values(target_business,1)
      on conflict(business_id) do update set last_number=private.quotation_counters.last_number+1 returning last_number into next_number;
    insert into public.quotations(business_id,customer_id,lead_id,reference,currency,issued_on,expires_on,subtotal,discount_amount,additional_charges,tax_rate,tax_amount,total,terms,customer_notes,internal_notes,sender_snapshot,customer_snapshot)
    values(target_business,contact.id,chosen_lead,'BQ-'||lpad(next_number::text,greatest(6,length(next_number::text)), '0'),biz.currency,issued,(details->>'expires_on')::date,
      (amounts->>'subtotal')::numeric,(amounts->>'discount_amount')::numeric,(amounts->>'additional_charges')::numeric,(amounts->>'tax_rate')::numeric,(amounts->>'tax_amount')::numeric,(amounts->>'total')::numeric,
      coalesce(details->>'terms',''),coalesce(details->>'customer_notes',''),coalesce(details->>'internal_notes',''),
      jsonb_build_object('name',biz.name,'email',biz.email,'phone',biz.phone,'address',biz.address,'tax_number',biz.tax_number,'logo_path',biz.logo_path),
      jsonb_build_object('name',contact.full_name,'email',contact.email,'phone',contact.phone,'addresses',(select coalesce(jsonb_agg(address),'[]'::jsonb) from public.customer_addresses where business_id=target_business and customer_id=contact.id))) returning id into saved;
  else
    update public.quotations set customer_id=contact.id,lead_id=chosen_lead,currency=biz.currency,expires_on=(details->>'expires_on')::date,
      subtotal=(amounts->>'subtotal')::numeric,discount_amount=(amounts->>'discount_amount')::numeric,additional_charges=(amounts->>'additional_charges')::numeric,
      tax_rate=(amounts->>'tax_rate')::numeric,tax_amount=(amounts->>'tax_amount')::numeric,total=(amounts->>'total')::numeric,
      terms=coalesce(details->>'terms',''),customer_notes=coalesce(details->>'customer_notes',''),internal_notes=coalesce(details->>'internal_notes',''),
      sender_snapshot=jsonb_build_object('name',biz.name,'email',biz.email,'phone',biz.phone,'address',biz.address,'tax_number',biz.tax_number,'logo_path',biz.logo_path),
      customer_snapshot=jsonb_build_object('name',contact.full_name,'email',contact.email,'phone',contact.phone,'addresses',(select coalesce(jsonb_agg(address),'[]'::jsonb) from public.customer_addresses where business_id=target_business and customer_id=contact.id)),
      version=version+1 where business_id=target_business and id=quotation returning id into saved;
    delete from public.quotation_items where business_id=target_business and quotation_id=saved;
  end if;
  for item in select value from jsonb_array_elements(details->'items') loop
    insert into public.quotation_items(business_id,quotation_id,service_id,position,description,unit,quantity,unit_price,line_total)
    values(target_business,saved,nullif(item->>'service_id','')::uuid,item_position,trim(item->>'description'),item->>'unit',(item->>'quantity')::numeric,(item->>'unit_price')::numeric,(amounts->'line_totals'->>item_position)::numeric);
    item_position:=item_position+1;
  end loop;
  insert into public.activity_logs(business_id,actor_user_id,actor_type,event_type,entity_type,entity_id)
    values(target_business,auth.uid(),'member',case when quotation is null then 'quotation.created' else 'quotation.updated' end,'quotation',saved);
  return saved;
end;
$$;
revoke all on function public.save_quotation(uuid,uuid,integer,jsonb) from public,anon;
grant execute on function public.save_quotation(uuid,uuid,integer,jsonb) to authenticated;
commit;
