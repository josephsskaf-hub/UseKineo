-- READ ONLY. Prepared for CEO review on 10/11/2026. Not executed against production by this session.
-- Confirm the intended production project in the existing approved connection before running.
-- If either Recreate table already exists, inspect it; do not rerun CREATE TABLE blindly.
select to_regclass('public.clips') as clips,
       to_regclass('public.recreate_likes') as recreate_likes,
       to_regclass('public.recreate_reports') as recreate_reports;

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('recreate_likes', 'recreate_reports')
order by table_name, ordinal_position;

select c.relname as table_name, c.relrowsecurity as rls_enabled,
       con.conname, pg_get_constraintdef(con.oid) as constraint_definition
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_constraint con on con.conrelid = c.oid
where n.nspname = 'public'
  and (c.relname in ('recreate_likes', 'recreate_reports')
       or (c.relname = 'clips' and con.conname = 'clips_credits_check'))
order by c.relname, con.conname;

select c.relname as table_name, r.rolname,
       has_table_privilege(r.oid, c.oid, 'SELECT') as can_select,
       has_table_privilege(r.oid, c.oid, 'INSERT') as can_insert,
       has_table_privilege(r.oid, c.oid, 'UPDATE') as can_update,
       has_table_privilege(r.oid, c.oid, 'DELETE') as can_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join pg_roles r
where n.nspname = 'public'
  and c.relname in ('recreate_likes', 'recreate_reports')
  and r.rolname in ('anon', 'authenticated', 'service_role')
order by c.relname, r.rolname;
