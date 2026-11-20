begin;
create function public.dashboard_metrics(target_business uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_business_member(target_business) then raise exception 'Access denied' using errcode='42501'; end if;
  return jsonb_build_object(
    'customers',(select count(*) from public.customers where business_id=target_business),
    'new_leads',(select count(*) from public.leads where business_id=target_business and archived_at is null and status='new'),
    'pending_quotations',(select count(*) from public.quotations where business_id=target_business and status='sent' and expires_on>=current_date),
    'accepted_quotations',(select count(*) from public.quotations where business_id=target_business and status='accepted'),
    'rejected_quotations',(select count(*) from public.quotations where business_id=target_business and status='rejected'),
    'active_jobs',(select count(*) from public.jobs where business_id=target_business and status in ('scheduled','in_progress')),
    'completed_jobs',(select count(*) from public.jobs where business_id=target_business and status='completed'),
    'revenue',(select coalesce(jsonb_agg(jsonb_build_object('currency',currency,'quoted',quoted::text,'accepted',accepted::text) order by currency),'[]'::jsonb) from (
      select currency, sum(total) as quoted, coalesce(sum(total) filter(where status='accepted'),0) as accepted
      from public.quotations where business_id=target_business and status in ('sent','accepted','rejected','expired') group by currency
    ) revenue),
    'monthly_revenue',(select coalesce(jsonb_agg(jsonb_build_object('month',to_char(month,'YYYY-MM'),'currency',currency,'quoted',quoted::text,'accepted',accepted::text) order by month,currency),'[]'::jsonb) from (
      select date_trunc('month',issued_on) as month,currency,sum(total) as quoted,coalesce(sum(total) filter(where status='accepted'),0) as accepted
      from public.quotations where business_id=target_business and status in ('sent','accepted','rejected','expired') and issued_on>=date_trunc('month',current_date)-interval '5 months' and issued_on<date_trunc('month',current_date)+interval '1 month'
      group by date_trunc('month',issued_on),currency
    ) revenue)
  );
end;
$$;
revoke all on function public.dashboard_metrics(uuid) from public,anon;
grant execute on function public.dashboard_metrics(uuid) to authenticated;
commit;
