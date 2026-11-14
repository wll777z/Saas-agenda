begin;
-- Private availability shares the same implementation; only service_role may bypass publication.
create or replace function public.core_slots(p_slug text,p_service uuid,p_professional uuid,p_day date,p_private boolean) returns table(starts_at timestamptz,professional_id uuid) language sql stable security definer set search_path=public as $$
 select distinct x.slot,p.id from tenants t join services s on s.tenant_id=t.id and s.id=p_service and s.active join professional_services ps on ps.service_id=s.id join professionals p on p.id=ps.professional_id and p.active join availability a on a.professional_id=p.id and a.weekday=extract(dow from p_day) cross join lateral generate_series((p_day+a.starts) at time zone t.timezone, (p_day+a.ends) at time zone t.timezone-make_interval(mins=>s.duration+s.buffer_after),interval '15 minutes') x(slot)
 where t.slug=p_slug and (t.published or p_private) and (p_professional is null or p.id=p_professional) and p_day between (now() at time zone t.timezone)::date and (now() at time zone t.timezone)::date+t.horizon and x.slot>=now()+make_interval(mins=>t.min_notice) and (x.slot-make_interval(mins=>s.buffer_before)) at time zone t.timezone >= p_day+a.starts
 and not exists(select 1 from exceptions e where e.professional_id=p.id and e.day=p_day)
 and not exists(select 1 from appointments b where b.professional_id=p.id and b.status<>'cancelled' and b.occupied && tstzrange(x.slot-make_interval(mins=>s.buffer_before),x.slot+make_interval(mins=>s.duration+s.buffer_after),'[)')) order by x.slot,p.id limit 500
$$;
create or replace function public.available_slots(p_slug text,p_service uuid,p_professional uuid,p_day date) returns table(starts_at timestamptz,professional_id uuid) language sql stable security definer set search_path=public as $$select * from core_slots(p_slug,p_service,p_professional,p_day,false)$$;
-- Replace reserve's availability call to support unpublished manual bookings only after authorization.
do $$declare definition text;begin select pg_get_functiondef('public.reserve(text,uuid,uuid,timestamptz,text,text,text,uuid,text,boolean,uuid)'::regprocedure) into definition;definition:=replace(definition,'available_slots(p_slug,p_service,p_professional,(p_start at time zone t.timezone)::date)','core_slots(p_slug,p_service,p_professional,(p_start at time zone t.timezone)::date,p_manual)');execute definition;end$$;
create or replace function public.staff_reschedule(p_id uuid,p_start timestamptz,p_actor uuid) returns void language plpgsql security definer set search_path=public as $$declare b appointments;s services;t tenants;begin
 select * into b from appointments where id=p_id for update;
 if not exists(select 1 from memberships where tenant_id=b.tenant_id and user_id=p_actor and role in ('owner','admin')) then raise exception 'Acesso negado';end if;
 if b.status<>'confirmed' then raise exception 'Reserva não está confirmada';end if;
 select * into s from services where id=b.service_id and active;
 select * into t from tenants where id=b.tenant_id;
 if s.id is null or s.duration<>b.duration then raise exception 'O serviço mudou de duração. Cancele e crie uma nova reserva com o cliente';end if;
 if not exists(select 1 from core_slots(t.slug,s.id,b.professional_id,(p_start at time zone t.timezone)::date,true) a where a.starts_at=p_start) then raise exception 'Horário indisponível';end if;
 update appointments set starts_at=p_start,ends_at=p_start+make_interval(mins=>b.duration),occupied=tstzrange(p_start-make_interval(mins=>s.buffer_before),p_start+make_interval(mins=>b.duration+s.buffer_after),'[)') where id=p_id;
 insert into audit_log(tenant_id,actor,event,record_id) values(b.tenant_id,p_actor,'appointment.staff_reschedule',p_id);
exception when exclusion_violation then raise exception 'Horário ocupado. A reserva original foi preservada';end$$;
create table public.platform_operators(user_id uuid primary key references auth.users);
alter table public.platform_operators enable row level security;
-- Operational access is scoped on the server; never exposes customers or private bookings.
revoke execute on function public.core_slots(text,uuid,uuid,date,boolean),public.staff_reschedule(uuid,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.core_slots(text,uuid,uuid,date,boolean),public.staff_reschedule(uuid,timestamptz,uuid) to service_role;
-- RLS is authoritative for all application tables; public has no direct access.
revoke all on all tables in schema public from anon;
grant select on tenants,memberships,professionals,services,professional_services,availability,exceptions,customers,subscriptions,appointments,payment_events,audit_log to authenticated;
commit;
