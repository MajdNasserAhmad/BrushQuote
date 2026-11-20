begin;
-- Preserve customer identity across linked records, including later edits.
alter table public.leads add constraint leads_customer_identity unique(business_id,id,customer_id);
alter table public.quotations add constraint quotations_lead_customer foreign key(business_id,lead_id,customer_id) references public.leads(business_id,id,customer_id);
alter table public.quotations add constraint quotations_customer_identity unique(business_id,id,customer_id);
alter table public.jobs add constraint jobs_quotation_customer foreign key(business_id,quotation_id,customer_id) references public.quotations(business_id,id,customer_id);
alter table public.jobs add constraint jobs_customer_identity unique(business_id,id,customer_id);
alter table public.appointments add constraint appointments_job_customer foreign key(business_id,job_id,customer_id) references public.jobs(business_id,id,customer_id);
commit;
