begin;
create or replace function public.queue_appointment_email() returns trigger language plpgsql security definer set search_path=public as $$declare recipient text;begin
 if new.status='blocked' then return new;end if;
 select email into recipient from customers where id=new.customer_id;
 if recipient is null then return new;end if;
 if tg_op='UPDATE' then
 if new.starts_at=old.starts_at and new.status=old.status then return new;end if;
 update notification_jobs set state='cancelled' where appointment_id=new.id and state in ('pending','sending');end if;
 if new.status='confirmed' then
 insert into notification_jobs(tenant_id,appointment_id,kind,recipient,payload,available_at) values(new.tenant_id,new.id,'confirmation',recipient,'{}',clock_timestamp());
 if new.starts_at>now()+interval '24 hours' then insert into notification_jobs(tenant_id,appointment_id,kind,recipient,payload,available_at) values(new.tenant_id,new.id,'reminder',recipient,'{}',new.starts_at-interval '24 hours') on conflict do nothing;end if;
 elsif new.status='cancelled' then insert into notification_jobs(tenant_id,appointment_id,kind,recipient,payload,available_at) values(new.tenant_id,new.id,'cancellation',recipient,'{}',clock_timestamp());end if;
 return new;
end$$;
create trigger appointment_email after insert or update on appointments for each row execute function queue_appointment_email();
create or replace function public.accept_invitation(p_hash text,p_user uuid,p_email text,p_name text) returns uuid language plpgsql security definer set search_path=public as $$declare i invites;sub subscriptions;n integer;begin
 select * into i from invites where token_hash=p_hash for update;
 if i.id is null or i.expires_at<now() or i.accepted_at is not null or lower(i.email)<>lower(p_email) then raise exception 'Convite inválido ou expirado';end if;
 perform 1 from tenants where id=i.tenant_id for update;
 if exists(select 1 from memberships where tenant_id=i.tenant_id and user_id=p_user) then raise exception 'Você já participa deste negócio';end if;
 select * into sub from subscriptions where tenant_id=i.tenant_id;
 if i.role='professional' then
 select count(*) into n from professionals where tenant_id=i.tenant_id and active;
 if n>=(case when sub.plan='solo' then 1 else 5 end) then raise exception 'Limite de profissionais do plano';end if;
 end if;
 insert into memberships values(i.tenant_id,p_user,i.role);
 if i.role='professional' then
 with p as(insert into professionals(tenant_id,user_id,name) values(i.tenant_id,p_user,p_name) returning id)
 insert into professional_services select i.tenant_id,p.id,s.id from p cross join services s where s.tenant_id=i.tenant_id and s.active;
 end if;
 update invites set accepted_at=now() where id=i.id;
 return i.tenant_id;
end$$;
create or replace function public.save_settings(p_tenant uuid,p_name text,p_address text,p_notice integer,p_horizon integer,p_cancel integer) returns void language plpgsql security definer set search_path=public as $$begin
 if not is_owner(p_tenant) then raise exception 'Acesso negado';end if;
 update tenants set name=p_name,address=p_address,min_notice=p_notice,horizon=p_horizon,cancel_hours=p_cancel where id=p_tenant;
end$$;
create or replace function public.add_exception(p_professional uuid,p_day date,p_reason text) returns void language plpgsql security definer set search_path=public as $$declare t uuid;begin
 select tenant_id into t from professionals where id=p_professional;
 if not can_admin(t) then raise exception 'Acesso negado';end if;
 insert into exceptions(tenant_id,professional_id,day,reason) values(t,p_professional,p_day,left(p_reason,200)) on conflict(professional_id,day) do update set reason=excluded.reason;
end$$;
create or replace function public.deactivate_professional(p_professional uuid) returns void language plpgsql security definer set search_path=public as $$declare t uuid;begin
 select tenant_id into t from professionals where id=p_professional;
 if not is_owner(t) then raise exception 'Acesso negado';end if;
 update professionals set active=false where id=p_professional;
end$$;
create or replace function public.cancel_subscription(p_tenant uuid) returns void language plpgsql security definer set search_path=public as $$begin
 if not is_owner(p_tenant) then raise exception 'Acesso negado';end if;
 update subscriptions set status='cancelled' where tenant_id=p_tenant;
end$$;
revoke execute on function public.queue_appointment_email(),public.accept_invitation(text,uuid,text,text),public.save_settings(uuid,text,text,integer,integer,integer),public.add_exception(uuid,date,text),public.deactivate_professional(uuid),public.cancel_subscription(uuid) from public,anon,authenticated;
grant execute on function public.save_settings(uuid,text,text,integer,integer,integer),public.add_exception(uuid,date,text),public.deactivate_professional(uuid),public.cancel_subscription(uuid) to authenticated;
grant execute on function public.accept_invitation(text,uuid,text,text) to service_role;
commit;
