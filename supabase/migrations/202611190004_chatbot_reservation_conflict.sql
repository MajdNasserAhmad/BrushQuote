begin;
-- Disambiguate the client_digest parameter from the unique index column.
create or replace function public.reserve_chat_request(target_business uuid, client_digest text, request uuid, model_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare used integer; usage uuid; hour_bucket timestamptz:=date_trunc('hour',now());
begin
  perform 1 from public.businesses where id=target_business for update;
  select requests into used from private.chatbot_client_limits c where c.business_id=target_business and c.client_digest=reserve_chat_request.client_digest and c.bucket=hour_bucket;
  if coalesce(used,0)>=20 then raise exception 'AI_USAGE_LIMIT' using errcode='P0001'; end if;
  usage:=public.reserve_ai_request(target_business,null,request,'customer_chatbot',model_name,false);
  delete from private.chatbot_client_limits where business_id=target_business and bucket<now()-interval '1 day';
  insert into private.chatbot_client_limits values(target_business,client_digest,hour_bucket,1)
    on conflict on constraint chatbot_client_limits_pkey do update set requests=private.chatbot_client_limits.requests+1;
  return usage;
end;
$$;
revoke all on function public.reserve_chat_request(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_chat_request(uuid,text,uuid,text) to service_role;
commit;
