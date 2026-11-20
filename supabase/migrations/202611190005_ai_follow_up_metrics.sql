begin;
create or replace function public.ai_business_metrics(target_business uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_business_member(target_business) then raise exception 'Access denied' using errcode='42501'; end if;
  return jsonb_build_object(
    'dashboard',public.dashboard_metrics(target_business),
    'acceptance_rate_percent',(select case when count(*)=0 then null else round(100.0*count(*) filter(where status='accepted')/count(*),2)::text end from public.quotations where business_id=target_business and status in ('sent','accepted','rejected','expired')),
    'service_line_values',(select coalesce(jsonb_agg(row_to_json(t)),'[]'::jsonb) from (
      select coalesce(s.name,'Custom items') as service,q.currency,sum(i.line_total)::text as quoted_line_value,
        coalesce(sum(i.line_total) filter(where q.status='accepted'),0)::text as accepted_line_value
      from public.quotation_items i join public.quotations q on q.business_id=i.business_id and q.id=i.quotation_id
      left join public.business_services s on s.business_id=i.business_id and s.id=i.service_id
      where i.business_id=target_business and q.status in ('sent','accepted','rejected','expired') group by s.name,q.currency order by sum(i.line_total) desc limit 20
    ) t),
    'follow_up_candidates',(select coalesce(jsonb_agg(row_to_json(t)),'[]'::jsonb) from (
      select c.id as customer_id,c.full_name,q.id as quotation_id,q.reference,q.expires_on,
        (select max(e.submitted_at) from public.email_logs e where e.business_id=target_business and e.customer_id=c.id and e.status in ('submitted','delivered')) as last_recorded_email
      from public.quotations q join public.customers c on c.business_id=q.business_id and c.id=q.customer_id
      where q.business_id=target_business and q.status='sent' and c.archived_at is null
        and not exists(select 1 from public.email_logs e where e.business_id=target_business and e.customer_id=c.id and e.status in ('submitted','delivered') and e.submitted_at>now()-interval '7 days')
      order by q.expires_on,q.id limit 20
    ) t),
    'definitions','Quotation value is not collected revenue. Acceptance rate: accepted divided by all issued quotations, excluding drafts/cancelled. Service values are rounded line values before quotation discounts, charges and tax. Top 20 currency/service groups only. Follow-up candidates: first 20 sent quotations with no recorded submitted/delivered email to the customer in seven days; external emails and phone calls are unknown.'
  );
end;
$$;
revoke all on function public.ai_business_metrics(uuid) from public,anon;
grant execute on function public.ai_business_metrics(uuid) to authenticated;
commit;
