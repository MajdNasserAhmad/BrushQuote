begin;
alter table public.ai_messages add column sequence bigint generated always as identity;
create index ai_messages_sequence_idx on public.ai_messages(business_id,conversation_id,sequence);
create function public.save_ai_exchange(target_business uuid, target_conversation uuid, result uuid, question text) returns uuid
language plpgsql security definer set search_path='' as $$
declare saved public.ai_results; conversation uuid;
begin
  if not private.is_business_member(target_business) or length(trim(question)) not between 3 and 6000 then raise exception 'Access denied' using errcode='42501'; end if;
  select r.* into saved from public.ai_results r join public.ai_usage u on u.business_id=r.business_id and u.id=r.usage_id
    where r.business_id=target_business and r.id=result and r.user_id=auth.uid() and u.status='succeeded' and u.task='business_assistant';
  if not found then raise exception 'Result unavailable' using errcode='42501'; end if;
  if target_conversation is null then
    insert into public.ai_conversations(business_id,user_id,title) values(target_business,auth.uid(),left(question,120)) returning id into conversation;
  else
    select id into conversation from public.ai_conversations where business_id=target_business and id=target_conversation and user_id=auth.uid() and archived_at is null for update;
    if not found then raise exception 'Conversation unavailable' using errcode='42501'; end if;
  end if;
  if not exists(select 1 from public.ai_messages where business_id=target_business and conversation_id=conversation and usage_id=saved.usage_id) then
    insert into public.ai_messages(business_id,conversation_id,usage_id,role,content) values(target_business,conversation,saved.usage_id,'user',question);
    insert into public.ai_messages(business_id,conversation_id,usage_id,role,content,structured_content) values(target_business,conversation,saved.usage_id,'assistant',saved.content->>'summary',saved.content);
  end if;
  return conversation;
end;
$$;
revoke all on function public.save_ai_exchange(uuid,uuid,uuid,text) from public,anon;
grant execute on function public.save_ai_exchange(uuid,uuid,uuid,text) to authenticated;

create function public.ai_business_metrics(target_business uuid) returns jsonb
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
    'definitions','Quotation value is not collected revenue. Acceptance rate: accepted divided by all issued quotations, excluding drafts/cancelled. Service values are rounded line values before quotation discounts, charges and tax. Top 20 currency/service groups only.'
  );
end;
$$;
revoke all on function public.ai_business_metrics(uuid) from public,anon;
grant execute on function public.ai_business_metrics(uuid) to authenticated;
commit;
