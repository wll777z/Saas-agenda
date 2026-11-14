begin;
create or replace function public.unblock_time(p_id uuid) returns void language plpgsql security definer set search_path=public as $$declare t uuid;begin
 select tenant_id into t from appointments where id=p_id and status='blocked' for update;
 if t is null or not can_admin(t) then raise exception 'Acesso negado';end if;
 delete from appointments where id=p_id and status='blocked';
 insert into audit_log(tenant_id,actor,event,record_id) values(t,auth.uid(),'schedule.unblocked',p_id);
end$$;
revoke execute on function public.unblock_time(uuid) from public,anon;
grant execute on function public.unblock_time(uuid) to authenticated,service_role;
grant all on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;
-- Explicitly remove inherited Supabase default write grants. RLS remains defense in depth.
revoke insert,update,delete,truncate,references,trigger on all tables in schema public from authenticated;
commit;
