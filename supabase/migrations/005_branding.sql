begin;
alter table tenants add column accent text not null default '#0071e3' check(accent in ('#0071e3','#267355','#7251a1','#954f24'));
alter table tenants add column logo_path text;
alter table tenants add column cover_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('business-branding','business-branding',true,2097152,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create policy branding_read on storage.objects for select to anon,authenticated using(bucket_id='business-branding');
create policy branding_upload on storage.objects for insert to authenticated with check(bucket_id='business-branding' and exists(select 1 from public.memberships m where m.tenant_id::text=(storage.foldername(name))[1] and m.user_id=auth.uid() and m.role='owner'));
create policy branding_update on storage.objects for update to authenticated using(bucket_id='business-branding' and exists(select 1 from public.memberships m where m.tenant_id::text=(storage.foldername(name))[1] and m.user_id=auth.uid() and m.role='owner')) with check(bucket_id='business-branding' and exists(select 1 from public.memberships m where m.tenant_id::text=(storage.foldername(name))[1] and m.user_id=auth.uid() and m.role='owner'));
create policy branding_delete on storage.objects for delete to authenticated using(bucket_id='business-branding' and exists(select 1 from public.memberships m where m.tenant_id::text=(storage.foldername(name))[1] and m.user_id=auth.uid() and m.role='owner'));
create or replace function public.save_branding(p_tenant uuid,p_accent text,p_logo text,p_cover text) returns void language plpgsql security definer set search_path=public as $$begin
 if not is_owner(p_tenant) then raise exception 'Acesso negado';end if;
 if (p_logo is not null and p_logo not like p_tenant::text||'/%') or (p_cover is not null and p_cover not like p_tenant::text||'/%') then raise exception 'Arquivo pertence a outra empresa';end if;
 update tenants set accent=p_accent,logo_path=p_logo,cover_path=p_cover where id=p_tenant;
end$$;
do $$declare definition text;begin select pg_get_functiondef('public.public_business(text)'::regprocedure) into definition;definition:=replace(definition,'''cancel_hours'', t.cancel_hours','''cancel_hours'', t.cancel_hours, ''accent'',t.accent,''logo_path'',t.logo_path,''cover_path'',t.cover_path');-- pg_get_functiondef preserves original SQL text spacing.
 definition:=replace(definition,'''cancel_hours'',t.cancel_hours','''cancel_hours'',t.cancel_hours,''accent'',t.accent,''logo_path'',t.logo_path,''cover_path'',t.cover_path');execute definition;end$$;
revoke execute on function public.save_branding(uuid,text,text,text) from public,anon;
grant execute on function public.save_branding(uuid,text,text,text) to authenticated,service_role;
commit;
