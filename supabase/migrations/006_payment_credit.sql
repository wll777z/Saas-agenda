begin;
alter table payment_events add column credited_at timestamptz;
create or replace function public.apply_payment(p_payment text,p_status text,p_updated timestamptz) returns void language plpgsql security definer set search_path=public as $$declare e payment_events;begin
 select * into e from payment_events where payment_id=p_payment for update;
 if e.id is null then raise exception 'Cobrança não encontrada';end if;
 if e.provider_updated_at is not null and p_updated<=e.provider_updated_at then return;end if;
 perform 1 from tenants where id=e.tenant_id for update;
 if p_status in ('refunded','charged_back') and e.credited_at is not null then
 update subscriptions set status='past_due',valid_until=least(valid_until,now()) where tenant_id=e.tenant_id;
 elsif p_status='approved' and e.credited_at is null then
 update subscriptions set plan=e.plan,status='active',cycle_start=now(),valid_until=greatest(now(),case when status='trial' then now() else valid_until end)+interval '1 month' where tenant_id=e.tenant_id;
 update payment_events set credited_at=now() where id=e.id;
 end if;
 update payment_events set status=p_status,provider_updated_at=p_updated where id=e.id;
end$$;
revoke execute on function public.apply_payment(text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.apply_payment(text,text,timestamptz) to service_role;
commit;
