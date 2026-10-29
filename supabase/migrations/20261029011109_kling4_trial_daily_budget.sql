-- KINEO-KLING4-TRIAL-2810. Prepared locally; apply before the trial deploy.
-- Exact milliUSD: 15 * $0.157 = $2.355. A reservation is NEVER refunded, including ambiguous fal failures.
-- Independent of Ads allowances, credits, country eligibility and paid engines.
begin;
create table public.kling4_trial_days (
  request_day date primary key,
  reserved_milliusd integer not null default 0 check (reserved_milliusd between 0 and 60000)
);
create table public.kling4_trial_films (
  user_id uuid not null,
  job_id text not null check (length(btrim(job_id)) between 1 and 200),
  request_day date not null,
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  reserved_milliusd integer not null check (reserved_milliusd in (0, 2355)),
  reserved_at timestamptz not null default now(),
  engine_used text check (engine_used in ('kling4', 'seedance15_fallback', 'seedance15_cap')),
  cost_milliusd integer check (cost_milliusd in (0, 2355) and cost_milliusd <= reserved_milliusd),
  recorded_at timestamptz,
  primary key (user_id, job_id)
);
-- No cascades: deleting an account or generation must not replenish the allowance.
alter table public.kling4_trial_days enable row level security;
alter table public.kling4_trial_films enable row level security;
revoke all on public.kling4_trial_days, public.kling4_trial_films from public, anon, authenticated, service_role;
grant select, insert, update on public.kling4_trial_days, public.kling4_trial_films to service_role;

create function public.reserve_kling4_trial(p_job_id text, p_user_id uuid, p_country text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_day date := (now() at time zone 'UTC')::date;
  v_reserved integer;
  v_country text := case when p_country ~ '^[A-Za-z]{2}$' then upper(p_country) else null end;
begin
  if p_user_id is null or p_job_id is null or length(btrim(p_job_id)) not between 1 and 200 then
    return jsonb_build_object('code', 'unavailable');
  end if;
  -- Lock order: film identity, then the shared UTC-day row. No network call holds a DB lock.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-trial:' || p_user_id::text || ':' || p_job_id, 0));
  if exists(select 1 from public.kling4_trial_films where user_id = p_user_id and job_id = p_job_id) then
    return jsonb_build_object('code', 'duplicate');
  end if;
  insert into public.kling4_trial_days(request_day) values(v_day) on conflict (request_day) do nothing;
  select reserved_milliusd into v_reserved from public.kling4_trial_days where request_day = v_day for update;
  if v_reserved + 2355 > 60000 then
    insert into public.kling4_trial_films(user_id, job_id, request_day, country, reserved_milliusd)
      values(p_user_id, p_job_id, v_day, v_country, 0);
    return jsonb_build_object('code', 'cap');
  end if;
  insert into public.kling4_trial_films(user_id, job_id, request_day, country, reserved_milliusd)
    values(p_user_id, p_job_id, v_day, v_country, 2355);
  update public.kling4_trial_days set reserved_milliusd = reserved_milliusd + 2355 where request_day = v_day;
  return jsonb_build_object('code', 'ok', 'reserved_milliusd', 2355);
end;
$$;

create function public.record_kling4_trial_film(p_job_id text, p_user_id uuid, p_country text, p_engine_used text, p_cost_milliusd integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_film public.kling4_trial_films%rowtype;
  v_country text := case when p_country ~ '^[A-Za-z]{2}$' then upper(p_country) else null end;
begin
  if p_user_id is null or p_job_id is null or length(btrim(p_job_id)) not between 1 and 200
    or p_engine_used is null or p_engine_used not in ('kling4', 'seedance15_fallback', 'seedance15_cap')
    or p_cost_milliusd is null or p_cost_milliusd not in (0, 2355) then
    return jsonb_build_object('code', 'unavailable');
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-trial:' || p_user_id::text || ':' || p_job_id, 0));
  select * into v_film from public.kling4_trial_films where user_id = p_user_id and job_id = p_job_id for update;
  if found and v_film.recorded_at is not null then return jsonb_build_object('code', 'unchanged'); end if;
  if (p_engine_used = 'kling4' and (v_film.reserved_milliusd is distinct from 2355 or p_cost_milliusd <> 2355))
    or (p_engine_used = 'seedance15_cap' and p_cost_milliusd <> 0)
    or p_cost_milliusd > coalesce(v_film.reserved_milliusd, 0) then
    return jsonb_build_object('code', 'unavailable');
  end if;
  -- Also records a zero-cost Seedance result after a failed reservation RPC; no Kling call was authorized.
  insert into public.kling4_trial_films(user_id, job_id, request_day, country, reserved_milliusd)
    values(p_user_id, p_job_id, (now() at time zone 'UTC')::date, v_country, 0)
    on conflict (user_id, job_id) do nothing;
  update public.kling4_trial_films set engine_used = p_engine_used, cost_milliusd = p_cost_milliusd,
      country = coalesce(country, v_country), recorded_at = now()
    where user_id = p_user_id and job_id = p_job_id returning * into v_film;
  insert into public.events(id, name, user_id, path, metadata)
    values(md5('free_film_engine_used:' || p_user_id::text || ':' || p_job_id)::uuid, 'free_film_engine_used', p_user_id,
      '/api/generate-video-cinematic', jsonb_build_object(
        'film_id', p_job_id, 'generation_id', p_job_id, 'engine_used', p_engine_used,
        'cost_usd', p_cost_milliusd::numeric / 1000, 'cost_basis', 'reserved_upper_bound',
        'country', v_film.country, 'seconds', 15, 'trial_version', 'kling4-2810'))
    on conflict (id) do nothing;
  return jsonb_build_object('code', 'ok');
end;
$$;
revoke all on function public.reserve_kling4_trial(text,uuid,text), public.record_kling4_trial_film(text,uuid,text,text,integer) from public, anon, authenticated;
grant execute on function public.reserve_kling4_trial(text,uuid,text), public.record_kling4_trial_film(text,uuid,text,text,integer) to service_role;
commit;
