-- Paid film badge comes from a verified provider claim, never the nominal billing quality.
alter table public.videos add column if not exists engine_used text;
comment on column public.videos.engine_used is 'Actual renderer from the verified cinematic birth; null for historic/unknown engines.';

create function public.guard_video_engine_used() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user not in ('postgres', 'service_role') and
    ((TG_OP = 'INSERT' and NEW.engine_used is not null) or
     (TG_OP = 'UPDATE' and NEW.engine_used is distinct from OLD.engine_used)) then
    raise exception 'engine_used is assigned by the verified render pipeline' using errcode = '42501';
  end if;
  return NEW;
end;
$$;
revoke all on function public.guard_video_engine_used() from public, anon, authenticated;
create trigger videos_engine_used_server_only before insert or update of engine_used on public.videos
for each row execute function public.guard_video_engine_used();
