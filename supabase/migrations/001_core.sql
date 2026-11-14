begin;
create extension if not exists btree_gist;
create extension if not exists pgcrypto;
create table public.tenants (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100), slug text unique not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), segment text not null default 'Serviços', address text not null default '', timezone text not null default 'America/Sao_Paulo', published boolean not null default false, min_notice integer not null default 120 check(min_notice between 0 and 43200), horizon integer not null default 60 check(horizon between 1 and 365), cancel_hours integer not null default 24 check(cancel_hours between 0 and 168), created_at timestamptz not null default now()
);
create table public.memberships(tenant_id uuid references tenants on delete cascade, user_id uuid references auth.users on delete cascade, role text not null check(role in ('owner','admin','professional')), primary key(tenant_id,user_id));
create table public.professionals(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants, user_id uuid references auth.users, name text not null check(length(name) between 2 and 100), active boolean not null default true,unique(tenant_id,id));
create table public.services(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants, name text not null check(length(name) between 2 and 100),duration integer not null check(duration between 5 and 480),price integer not null check(price between 0 and 10000000),buffer_before integer not null default 0 check(buffer_before between 0 and 120),buffer_after integer not null default 0 check(buffer_after between 0 and 120),active boolean not null default true,unique(tenant_id,id));
create table public.professional_services(tenant_id uuid not null,professional_id uuid not null,service_id uuid not null,primary key(professional_id,service_id),foreign key(tenant_id,professional_id) references professionals(tenant_id,id),foreign key(tenant_id,service_id) references services(tenant_id,id));
create table public.availability(id uuid primary key default gen_random_uuid(),tenant_id uuid not null,professional_id uuid not null,weekday integer not null check(weekday between 0 and 6),starts time not null,ends time not null,check(ends>starts),foreign key(tenant_id,professional_id) references professionals(tenant_id,id));
create table public.exceptions(id uuid primary key default gen_random_uuid(),tenant_id uuid not null,professional_id uuid not null,day date not null,reason text not null default 'Indisponível',unique(professional_id,day),foreign key(tenant_id,professional_id) references professionals(tenant_id,id));
create table public.customers(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants,name text not null,email text not null,phone text,unique(tenant_id,email),unique(tenant_id,id));
create table public.subscriptions(tenant_id uuid primary key references tenants,plan text not null default 'trial' check(plan in ('trial','solo','team')),status text not null default 'trial' check(status in ('trial','active','expired','cancelled','past_due')),valid_until timestamptz not null default now()+interval '14 days',cycle_start timestamptz not null default now(),provider_id text unique);
create table public.appointments(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants,professional_id uuid not null,service_id uuid,customer_id uuid,starts_at timestamptz not null,ends_at timestamptz not null,occupied tstzrange not null,status text not null default 'confirmed' check(status in ('confirmed','completed','cancelled','no_show','blocked')),service_name text not null,duration integer not null,price integer not null,manage_hash text unique,idempotency_key uuid not null,created_at timestamptz not null default now(),unique(tenant_id,idempotency_key),foreign key(tenant_id,professional_id) references professionals(tenant_id,id),foreign key(tenant_id,service_id) references services(tenant_id,id),foreign key(tenant_id,customer_id) references customers(tenant_id,id),check(ends_at>starts_at),exclude using gist(professional_id with =, occupied with &&) where(status in ('confirmed','completed','no_show','blocked')));
create index appointments_tenant_start on appointments(tenant_id,starts_at);
create index customers_tenant on customers(tenant_id);
create table public.notification_jobs(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants,appointment_id uuid not null references appointments,kind text not null check(kind in ('confirmation','reminder','cancellation')),recipient text not null,payload jsonb not null,available_at timestamptz not null default now(),attempts integer not null default 0,state text not null default 'pending' check(state in ('pending','sending','sent','cancelled','failed')),locked_until timestamptz,unique(appointment_id,kind,available_at));
create table public.audit_log(id bigint generated always as identity primary key,tenant_id uuid references tenants,actor uuid,event text not null,record_id uuid,created_at timestamptz not null default now());
create table public.payment_events(id text primary key,tenant_id uuid not null references tenants,payment_id text not null unique,plan text not null check(plan in ('solo','team')),amount integer not null,status text not null default 'pending',provider_updated_at timestamptz,created_at timestamptz not null default now());
create table public.invites(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants,email text not null,role text not null check(role in ('admin','professional')),token_hash text unique not null,expires_at timestamptz not null default now()+interval '7 days',accepted_at timestamptz);
create table public.rate_limits(key text primary key,count integer not null,window_at timestamptz not null);
create or replace function public.is_member(t uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from memberships where tenant_id=t and user_id=auth.uid())$$;
create or replace function public.can_admin(t uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from memberships where tenant_id=t and user_id=auth.uid() and role in ('owner','admin'))$$;
create or replace function public.is_owner(t uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from memberships where tenant_id=t and user_id=auth.uid() and role='owner')$$;
create or replace function public.own_professional(t uuid,p uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from professionals where tenant_id=t and id=p and user_id=auth.uid())$$;
do $$declare tbl text;begin foreach tbl in array array['tenants','memberships','professionals','services','professional_services','availability','exceptions','customers','subscriptions','appointments','notification_jobs','audit_log','payment_events','invites','rate_limits'] loop execute format('alter table public.%I enable row level security',tbl); end loop;end$$;
create policy tenant_read on tenants for select using(is_member(id));
create policy member_read on memberships for select using(is_member(tenant_id));
create policy professional_read on professionals for select using(is_member(tenant_id));
create policy service_read on services for select using(is_member(tenant_id));
create policy ps_read on professional_services for select using(is_member(tenant_id));
create policy availability_read on availability for select using(is_member(tenant_id));
create policy exception_read on exceptions for select using(is_member(tenant_id));
create policy appointment_read on appointments for select using(can_admin(tenant_id) or own_professional(tenant_id,professional_id));
create policy customer_read on customers for select using(can_admin(tenant_id) or exists(select 1 from appointments a where a.customer_id=customers.id and own_professional(a.tenant_id,a.professional_id)));
create policy subscription_read on subscriptions for select using(is_owner(tenant_id));
create policy payment_read on payment_events for select using(is_owner(tenant_id));
create policy audit_read on audit_log for select using(is_owner(tenant_id));
-- Mutations are only exposed by scoped, validated RPCs. No direct table write policies.
create or replace function public.create_business(p_name text,p_slug text,p_segment text,p_address text,p_timezone text,p_service text,p_duration integer,p_price integer,p_start time,p_end time) returns uuid language plpgsql security definer set search_path=public as $$
declare t uuid; p uuid; s uuid;begin
 if auth.uid() is null then raise exception 'Entre na sua conta'; end if;
 if not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'Fuso inválido';end if;
 if p_end<=p_start then raise exception 'Expediente inválido';end if;
 if (select count(*) from memberships where user_id=auth.uid() and role='owner')>=5 then raise exception 'Limite de empresas atingido';end if;
 insert into tenants(name,slug,segment,address,timezone) values(p_name,p_slug,p_segment,p_address,p_timezone) returning id into t;
 insert into memberships values(t,auth.uid(),'owner');
 insert into professionals(tenant_id,user_id,name) values(t,auth.uid(),p_name) returning id into p;
 insert into services(tenant_id,name,duration,price) values(t,p_service,p_duration,p_price) returning id into s;
 insert into professional_services values(t,p,s);
 insert into availability(tenant_id,professional_id,weekday,starts,ends) select t,p,d,p_start,p_end from generate_series(1,5) d;
 insert into subscriptions(tenant_id) values(t);
 return t;
end$$;
create or replace function public.publish_business(p_tenant uuid,p_published boolean) returns void language plpgsql security definer set search_path=public as $$begin
 if not is_owner(p_tenant) then raise exception 'Acesso negado';end if;
 if p_published and not exists(select 1 from professional_services ps join services s on s.id=ps.service_id join professionals p on p.id=ps.professional_id join availability a on a.professional_id=p.id where ps.tenant_id=p_tenant and s.active and p.active and (a.ends-a.starts)>=make_interval(mins=>s.duration+s.buffer_before+s.buffer_after)) then raise exception 'Cadastre serviço, profissional e disponibilidade';end if;
 update tenants set published=p_published where id=p_tenant;
end$$;
create or replace function public.public_business(p_slug text) returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object('id',t.id,'name',t.name,'slug',t.slug,'address',t.address,'timezone',t.timezone,'cancel_hours',t.cancel_hours,'horizon',t.horizon,'services',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'duration',s.duration,'price',s.price)) from services s where s.tenant_id=t.id and s.active),'[]'::jsonb),'professionals',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'services',(select jsonb_agg(service_id) from professional_services where professional_id=p.id))) from professionals p where p.tenant_id=t.id and p.active),'[]'::jsonb)) from tenants t where t.slug=p_slug and t.published
$$;
create or replace function public.available_slots(p_slug text,p_service uuid,p_professional uuid,p_day date) returns table(starts_at timestamptz,professional_id uuid) language sql stable security definer set search_path=public as $$
 select distinct x.slot,p.id from tenants t join services s on s.tenant_id=t.id and s.id=p_service and s.active join professional_services ps on ps.service_id=s.id join professionals p on p.id=ps.professional_id and p.active join availability a on a.professional_id=p.id and a.weekday=extract(dow from p_day) cross join lateral generate_series((p_day+a.starts) at time zone t.timezone, (p_day+a.ends) at time zone t.timezone-make_interval(mins=>s.duration+s.buffer_after),interval '15 minutes') x(slot)
 where t.slug=p_slug and t.published and (p_professional is null or p.id=p_professional) and p_day between (now() at time zone t.timezone)::date and (now() at time zone t.timezone)::date+t.horizon and x.slot>=now()+make_interval(mins=>t.min_notice) and (x.slot-make_interval(mins=>s.buffer_before)) at time zone t.timezone >= p_day+a.starts
 and not exists(select 1 from exceptions e where e.professional_id=p.id and e.day=p_day)
 and not exists(select 1 from appointments b where b.professional_id=p.id and b.status<>'cancelled' and b.occupied && tstzrange(x.slot-make_interval(mins=>s.buffer_before),x.slot+make_interval(mins=>s.duration+s.buffer_after),'[)')) order by x.slot,p.id limit 500
$$;
-- Invoked only by the server: token plaintext never enters SQL storage.
create or replace function public.reserve(p_slug text,p_service uuid,p_professional uuid,p_start timestamptz,p_name text,p_email text,p_phone text,p_key uuid,p_hash text,p_manual boolean default false,p_actor uuid default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare t tenants; s services; sub subscriptions; c uuid; b appointments; lim integer; cycle timestamptz;begin
 select * into t from tenants where slug=p_slug for update;
 if t.id is null or (not p_manual and not t.published) then raise exception 'Agenda indisponível';end if;
 if p_manual and not exists(select 1 from memberships where tenant_id=t.id and user_id=p_actor and role in ('owner','admin')) then raise exception 'Acesso negado';end if;
 select * into b from appointments where tenant_id=t.id and idempotency_key=p_key;
 if b.id is not null then
 if b.manage_hash<>p_hash then raise exception 'Solicitação já utilizada';end if;
 return jsonb_build_object('id',b.id,'starts_at',b.starts_at,'status',b.status);end if;
 if length(trim(p_name)) not between 2 and 100 or length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Nome ou e-mail inválido';end if;
 select * into sub from subscriptions where tenant_id=t.id;
 if sub.valid_until<=now() or sub.status not in ('trial','active','cancelled') then raise exception 'Agenda temporariamente sem novas reservas';end if;
 cycle:=greatest(sub.cycle_start, date_trunc('month',now()));
 lim:=case when sub.plan='solo' then 100 else 500 end;
 if (select count(*) from appointments where tenant_id=t.id and status<>'blocked' and created_at>=cycle)>=lim then raise exception 'Limite mensal de agendamentos atingido';end if;
 select * into s from services where id=p_service and tenant_id=t.id and active;
 if s.id is null or not exists(select 1 from available_slots(p_slug,p_service,p_professional,(p_start at time zone t.timezone)::date) z where z.starts_at=p_start and z.professional_id=p_professional) then raise exception 'Horário indisponível. Escolha outro horário';end if;
 insert into customers(tenant_id,name,email,phone) values(t.id,trim(p_name),lower(trim(p_email)),left(p_phone,30)) on conflict(tenant_id,email) do update set name=excluded.name,phone=excluded.phone returning id into c;
 insert into appointments(tenant_id,professional_id,service_id,customer_id,starts_at,ends_at,occupied,service_name,duration,price,manage_hash,idempotency_key) values(t.id,p_professional,s.id,c,p_start,p_start+make_interval(mins=>s.duration),tstzrange(p_start-make_interval(mins=>s.buffer_before),p_start+make_interval(mins=>s.duration+s.buffer_after),'[)'),s.name,s.duration,s.price,p_hash,p_key) returning * into b;
 insert into audit_log(tenant_id,actor,event,record_id) values(t.id,p_actor,'appointment.created',b.id);
 return jsonb_build_object('id',b.id,'starts_at',b.starts_at,'status',b.status);
exception when exclusion_violation then raise exception 'Horário acabou de ser ocupado. Escolha outro horário';
end$$;
create or replace function public.manage_booking(p_hash text,p_action text,p_start timestamptz default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare b appointments;t tenants;s services;c customers;begin
 select * into b from appointments where manage_hash=p_hash for update;
 if b.id is null then raise exception 'Link inválido';end if;
 select * into t from tenants where id=b.tenant_id;
 select * into c from customers where id=b.customer_id;
 if p_action='read' then return jsonb_build_object('id',b.id,'service_name',b.service_name,'starts_at',b.starts_at,'ends_at',b.ends_at,'status',b.status,'price',b.price,'duration',b.duration,'business',t.name,'slug',t.slug,'address',t.address,'timezone',t.timezone,'cancel_hours',t.cancel_hours,'professional_id',b.professional_id,'service_id',b.service_id);end if;
 if b.status<>'confirmed' or b.starts_at<now()+make_interval(hours=>t.cancel_hours) then raise exception 'Prazo de alteração encerrado. Entre em contato com o estabelecimento';end if;
 if p_action='cancel' then update appointments set status='cancelled' where id=b.id;
 elsif p_action='reschedule' then
 select * into s from services where id=b.service_id and active;
 -- Uses historical duration/price; permit only compatible service rules.
 if s.id is null or s.duration<>b.duration then raise exception 'Entre em contato para reagendar este serviço';end if;
 if not exists(select 1 from available_slots(t.slug,s.id,b.professional_id,(p_start at time zone t.timezone)::date) z where z.starts_at=p_start) then raise exception 'Horário indisponível';end if;
 update appointments set starts_at=p_start,ends_at=p_start+make_interval(mins=>b.duration),occupied=tstzrange(p_start-make_interval(mins=>s.buffer_before),p_start+make_interval(mins=>b.duration+s.buffer_after),'[)') where id=b.id;
 else raise exception 'Ação inválida';end if;
 insert into audit_log(tenant_id,event,record_id) values(b.tenant_id,'appointment.'||p_action,b.id);
 return jsonb_build_object('id',b.id,'status',case when p_action='cancel' then 'cancelled' else 'confirmed' end);
exception when exclusion_violation then raise exception 'Horário ocupado; reserva original preservada';end$$;
create or replace function public.set_appointment_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$declare b appointments;begin
 select * into b from appointments where id=p_id for update;
 if not(can_admin(b.tenant_id) or own_professional(b.tenant_id,b.professional_id)) then raise exception 'Acesso negado';end if;
 if p_status not in ('completed','cancelled','no_show') or b.status<>'confirmed' then raise exception 'Alteração inválida';end if;
 update appointments set status=p_status where id=p_id;
 insert into audit_log(tenant_id,actor,event,record_id) values(b.tenant_id,auth.uid(),'appointment.'||p_status,p_id);
end$$;
create or replace function public.save_service(p_tenant uuid,p_id uuid,p_name text,p_duration integer,p_price integer,p_before integer,p_after integer,p_active boolean) returns uuid language plpgsql security definer set search_path=public as $$declare sid uuid; sub subscriptions;begin
 if not can_admin(p_tenant) then raise exception 'Acesso negado';end if;
 perform 1 from tenants where id=p_tenant for update;
 select * into sub from subscriptions where tenant_id=p_tenant;
 if p_active and (p_id is null or exists(select 1 from services where id=p_id and not active)) and (select count(*) from services where tenant_id=p_tenant and active)>=(case when sub.plan='solo' then 10 else 50 end) then raise exception 'Limite de serviços ativos';end if;
 if p_id is null then insert into services(tenant_id,name,duration,price,buffer_before,buffer_after,active) values(p_tenant,p_name,p_duration,p_price,p_before,p_after,p_active) returning id into sid;
 insert into professional_services select p_tenant,p.id,sid from professionals p where p.tenant_id=p_tenant and p.active;
 else update services set name=p_name,duration=p_duration,price=p_price,buffer_before=p_before,buffer_after=p_after,active=p_active where id=p_id and tenant_id=p_tenant returning id into sid;end if;
 if sid is null then raise exception 'Serviço não encontrado';end if;return sid;
end$$;
create or replace function public.save_availability(p_professional uuid,p_rules jsonb) returns void language plpgsql security definer set search_path=public as $$declare t uuid;begin
 select tenant_id into t from professionals where id=p_professional;
 if not can_admin(t) then raise exception 'Acesso negado';end if;
 if jsonb_array_length(p_rules)>21 then raise exception 'Máximo de 21 intervalos';end if;
 delete from availability where professional_id=p_professional;
 insert into availability(tenant_id,professional_id,weekday,starts,ends) select t,p_professional,(r->>'weekday')::integer,(r->>'starts')::time,(r->>'ends')::time from jsonb_array_elements(p_rules) r;
end$$;
create or replace function public.block_time(p_professional uuid,p_start timestamptz,p_end timestamptz) returns void language plpgsql security definer set search_path=public as $$declare t uuid;begin
 select tenant_id into t from professionals where id=p_professional;
 if not can_admin(t) then raise exception 'Acesso negado';end if;
 if p_end<=p_start or p_end>p_start+interval '90 days' then raise exception 'Intervalo inválido';end if;
 insert into appointments(tenant_id,professional_id,starts_at,ends_at,occupied,status,service_name,duration,price,idempotency_key) values(t,p_professional,p_start,p_end,tstzrange(p_start,p_end,'[)'),'blocked','Bloqueio',extract(epoch from p_end-p_start)/60,0,gen_random_uuid());
end$$;
create or replace function public.rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path=public as $$declare n integer;begin
 insert into rate_limits values(p_key,1,now()) on conflict(key) do update set count=case when rate_limits.window_at<now()-make_interval(secs=>p_seconds) then 1 else rate_limits.count+1 end,window_at=case when rate_limits.window_at<now()-make_interval(secs=>p_seconds) then now() else rate_limits.window_at end returning count into n;
 return n<=p_limit;end$$;
-- Payment state is reconciled from provider API; event replay cannot extend access twice.
create or replace function public.apply_payment(p_payment text,p_status text,p_updated timestamptz) returns void language plpgsql security definer set search_path=public as $$declare e payment_events;begin
 select * into e from payment_events where payment_id=p_payment for update;
 if e.id is null then raise exception 'Cobrança não encontrada';end if;
 if e.provider_updated_at is not null and p_updated<=e.provider_updated_at then return;end if;
 if e.status='approved' then
 if p_status in ('refunded','charged_back') then update subscriptions set status='past_due',valid_until=least(valid_until,now()) where tenant_id=e.tenant_id;end if;
 elsif p_status='approved' then
 perform 1 from tenants where id=e.tenant_id for update;
 -- Initial version: plan changes only after current prepaid term ends.
 update subscriptions set plan=e.plan,status='active',cycle_start=now(),valid_until=greatest(now(),case when status='trial' then now() else valid_until end)+interval '1 month' where tenant_id=e.tenant_id;
 end if;
 update payment_events set status=p_status,provider_updated_at=p_updated where id=e.id;
end$$;
create or replace function public.claim_jobs() returns setof notification_jobs language sql security definer set search_path=public as $$
 update notification_jobs set state='sending',locked_until=now()+interval '5 minutes',attempts=attempts+1 where id in(select id from notification_jobs where ((state='pending' and available_at<=now()) or(state='sending' and locked_until<now())) and attempts<5 order by available_at for update skip locked limit 30) returning *
$$;
-- Deny execution by default, then grant only intended RPCs.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_member(uuid),public.can_admin(uuid),public.is_owner(uuid),public.own_professional(uuid,uuid) to authenticated;
grant execute on function public.public_business(text),public.available_slots(text,uuid,uuid,date) to anon,authenticated;
grant execute on function public.create_business(text,text,text,text,text,text,integer,integer,time,time),public.publish_business(uuid,boolean),public.set_appointment_status(uuid,text),public.save_service(uuid,uuid,text,integer,integer,integer,integer,boolean),public.save_availability(uuid,jsonb),public.block_time(uuid,timestamptz,timestamptz) to authenticated;
grant execute on all functions in schema public to service_role;
commit;
