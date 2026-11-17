-- KINEO-K4-TETO-FILME-LONGO-1711 (Div. 2, 17/11). Escrita localmente; a CEO aplica. NÃO aplicar de novo depois de registrada.
-- O teto diário do Kling 4 grátis (US$ 60) passa a contar o preço do clipe: 15 s = 2355 milésimos (igual a hoje); 16 a 20 s =
-- US$ 0,157/s = 2512 a 3140. A rota mede a voz ANTES da reserva, então o código reserva o preço exato do clipe e o acerto grava esse valor.
-- Compatível com o código que está no ar (chama sem p_reserve_milliusd, grava custo 2355): tudo idêntico a hoje.
-- Compatível com o código novo (p_reserve_milliusd só quando o clipe passa de 15 s). Grants: só service_role, como hoje.
begin;

-- 1. Faixas: reserva 0 ou 2355..3140; custo 0 ou 2355..3140 e nunca acima da reserva (linhas antigas são 0/2355: continuam válidas).
alter table public.kling4_trial_films drop constraint kling4_trial_films_reserved_milliusd_check;
alter table public.kling4_trial_films add constraint kling4_trial_films_reserved_milliusd_check
  check (reserved_milliusd = 0 or reserved_milliusd between 2355 and 3140);
alter table public.kling4_trial_films drop constraint kling4_trial_films_check;
alter table public.kling4_trial_films add constraint kling4_trial_films_check
  check ((cost_milliusd = 0 or cost_milliusd between 2355 and 3140) and cost_milliusd <= reserved_milliusd);

-- 2. Reserva: parâmetro novo com padrão. A assinatura antiga (4 argumentos) sai na MESMA transação, sem sobrecarga ambígua;
--    a chamada antiga (3 ou 4 argumentos nomeados) resolve para esta, com p_reserve_milliusd = 2355.
drop function public.reserve_kling4_trial(text, uuid, text, boolean);
create function public.reserve_kling4_trial(p_job_id text, p_user_id uuid, p_country text, p_cap_24h boolean default true,
  p_reserve_milliusd integer default 2355)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_day date := (now() at time zone 'UTC')::date;
  v_reserved integer;
  v_country text := case when p_country ~ '^[A-Za-z]{2}$' then upper(p_country) else null end;
  v_since timestamptz := now() - interval '24 hours';
  v_amount integer := p_reserve_milliusd;
begin
  if p_user_id is null or p_job_id is null or length(btrim(p_job_id)) not between 1 and 200
    or v_amount is null or v_amount not between 2355 and 3140 then
    return jsonb_build_object('code', 'unavailable');
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-trial:' || p_user_id::text || ':' || p_job_id, 0));
  if exists(select 1 from public.kling4_trial_films where user_id = p_user_id and job_id = p_job_id) then
    return jsonb_build_object('code', 'duplicate');
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-trial-user:' || p_user_id::text, 0));
  insert into public.kling4_trial_days(request_day) values(v_day) on conflict (request_day) do nothing;
  select reserved_milliusd into v_reserved from public.kling4_trial_days where request_day = v_day for update;
  if coalesce(p_cap_24h, true) and (
       exists(select 1 from public.kling4_trial_films f
               where f.user_id = p_user_id and f.reserved_milliusd > 0 and f.reserved_at >= v_since)
    or exists(select 1 from public.trial_signup_fingerprints mine
                join public.trial_signup_fingerprints other
                  on other.fingerprint_hash = mine.fingerprint_hash and other.user_id is not null and other.user_id <> p_user_id
                join public.kling4_trial_films f
                  on f.user_id = other.user_id and f.reserved_milliusd > 0 and f.reserved_at >= v_since
               where mine.user_id = p_user_id)
  ) then
    insert into public.kling4_trial_films(user_id, job_id, request_day, country, reserved_milliusd)
      values(p_user_id, p_job_id, v_day, v_country, 0);
    return jsonb_build_object('code', 'teto_24h');
  end if;
  if v_reserved + v_amount > 60000 then
    insert into public.kling4_trial_films(user_id, job_id, request_day, country, reserved_milliusd)
      values(p_user_id, p_job_id, v_day, v_country, 0);
    return jsonb_build_object('code', 'cap');
  end if;
  insert into public.kling4_trial_films(user_id, job_id, request_day, country, reserved_milliusd)
    values(p_user_id, p_job_id, v_day, v_country, v_amount);
  update public.kling4_trial_days set reserved_milliusd = reserved_milliusd + v_amount where request_day = v_day;
  return jsonb_build_object('code', 'ok', 'reserved_milliusd', v_amount);
end;
$$;
revoke all on function public.reserve_kling4_trial(text, uuid, text, boolean, integer) from public, anon, authenticated;
grant execute on function public.reserve_kling4_trial(text, uuid, text, boolean, integer) to service_role;

-- 3. Acerto: custo > 0 (Kling enviado ou ambíguo) grava a reserva do filme, que é o preço exato do clipe. O código manda 2355
--    (constante de hoje); nunca grava acima da reserva; reserva 0 continua sem aceitar custo.
create or replace function public.record_kling4_trial_film(p_job_id text, p_user_id uuid, p_country text, p_engine_used text, p_cost_milliusd integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_film public.kling4_trial_films%rowtype;
  v_country text := case when p_country ~ '^[A-Za-z]{2}$' then upper(p_country) else null end;
  v_cost integer;
begin
  if p_user_id is null or p_job_id is null or length(btrim(p_job_id)) not between 1 and 200
    or p_engine_used is null or p_engine_used not in ('kling4', 'seedance15_fallback', 'seedance15_cap')
    or p_cost_milliusd is null or not (p_cost_milliusd = 0 or p_cost_milliusd between 2355 and 3140) then
    return jsonb_build_object('code', 'unavailable');
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-trial:' || p_user_id::text || ':' || p_job_id, 0));
  select * into v_film from public.kling4_trial_films where user_id = p_user_id and job_id = p_job_id for update;
  if found and v_film.recorded_at is not null then return jsonb_build_object('code', 'unchanged'); end if;
  if (p_engine_used = 'kling4' and (coalesce(v_film.reserved_milliusd, 0) < 2355 or p_cost_milliusd < 2355))
    or (p_engine_used = 'seedance15_cap' and p_cost_milliusd <> 0)
    or (p_cost_milliusd > 0 and v_film.released_at is not null)
    or p_cost_milliusd > coalesce(v_film.reserved_milliusd, 0) then
    return jsonb_build_object('code', 'unavailable');
  end if;
  v_cost := case when p_cost_milliusd > 0 then v_film.reserved_milliusd else 0 end;
  insert into public.kling4_trial_films(user_id, job_id, request_day, country, reserved_milliusd)
    values(p_user_id, p_job_id, (now() at time zone 'UTC')::date, v_country, 0)
    on conflict (user_id, job_id) do nothing;
  update public.kling4_trial_films set engine_used = p_engine_used, cost_milliusd = v_cost,
      country = coalesce(country, v_country), recorded_at = now()
    where user_id = p_user_id and job_id = p_job_id returning * into v_film;
  insert into public.events(id, name, user_id, path, metadata)
    values(md5('free_film_engine_used:' || p_user_id::text || ':' || p_job_id)::uuid, 'free_film_engine_used', p_user_id,
      '/api/generate-video-cinematic', jsonb_build_object(
        'film_id', p_job_id, 'generation_id', p_job_id, 'engine_used', p_engine_used,
        'cost_usd', v_cost::numeric / 1000, 'cost_basis', 'reserved_upper_bound',
        'country', v_film.country, 'seconds', case when v_cost > 0 then v_cost / 157 else 15 end, 'trial_version', 'kling4-2810'))
    on conflict (id) do nothing;
  return jsonb_build_object('code', 'ok');
end;
$$;

-- 4. Troca assíncrona Kling → Seedance: aceita a faixa; o custo já gravado não muda.
create or replace function public.transition_kling4_trial_fallback(p_job_id text, p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_film public.kling4_trial_films%rowtype; v_event_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-trial:'||p_user_id::text||':'||p_job_id,0));
  select * into v_film from public.kling4_trial_films where user_id=p_user_id and job_id=p_job_id for update;
  if not found or v_film.reserved_milliusd < 2355 then return jsonb_build_object('code','unavailable'); end if;
  if v_film.recorded_at is null then
    return public.record_kling4_trial_film(p_job_id,p_user_id,v_film.country,'seedance15_fallback',v_film.reserved_milliusd);
  end if;
  if v_film.engine_used not in ('kling4','seedance15_fallback') then return jsonb_build_object('code','unavailable'); end if;
  update public.kling4_trial_films set engine_used='seedance15_fallback' where user_id=p_user_id and job_id=p_job_id;
  v_event_id := md5('free_film_engine_used:'||p_user_id::text||':'||p_job_id)::uuid;
  insert into public.events(id,name,user_id,path,metadata) values(v_event_id,'free_film_engine_used',p_user_id,'/api/generate-video-cinematic',
    jsonb_build_object('film_id',p_job_id,'generation_id',p_job_id,'engine_used','seedance15_fallback','cost_usd',v_film.cost_milliusd::numeric/1000,
      'cost_basis','reserved_upper_bound','country',v_film.country,
      'seconds',case when v_film.cost_milliusd > 0 then v_film.cost_milliusd / 157 else 15 end,'trial_version','kling4-2810'))
    on conflict(id) do update set metadata=jsonb_set(public.events.metadata,'{engine_used}','"seedance15_fallback"'::jsonb)
      where public.events.user_id=p_user_id and public.events.name='free_film_engine_used'
        and public.events.metadata->>'engine_used' in ('kling4','seedance15_fallback');
  return jsonb_build_object('code','ok');
end;
$$;

-- 5. Devolução (fal recusou com 4xx, nada cobrado): devolve ao dia a reserva inteira do filme, qualquer que seja a faixa.
create or replace function public.release_kling4_trial(p_job_id text, p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_film public.kling4_trial_films%rowtype;
begin
  if p_user_id is null or p_job_id is null or length(btrim(p_job_id)) not between 1 and 200 then
    return jsonb_build_object('code', 'unavailable');
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-trial:' || p_user_id::text || ':' || p_job_id, 0));
  select * into v_film from public.kling4_trial_films where user_id = p_user_id and job_id = p_job_id for update;
  if not found or v_film.reserved_milliusd < 2355 then return jsonb_build_object('code', 'unavailable'); end if;
  if v_film.released_at is not null then return jsonb_build_object('code', 'unchanged'); end if;
  if v_film.engine_used = 'kling4' or coalesce(v_film.cost_milliusd, 0) > 0 then return jsonb_build_object('code', 'unavailable'); end if;
  update public.kling4_trial_films set released_at = now() where user_id = p_user_id and job_id = p_job_id;
  update public.kling4_trial_days set reserved_milliusd = greatest(reserved_milliusd - v_film.reserved_milliusd, 0)
    where request_day = v_film.request_day;
  return jsonb_build_object('code', 'ok', 'released_milliusd', v_film.reserved_milliusd, 'request_day', v_film.request_day);
end;
$$;

revoke all on function public.record_kling4_trial_film(text, uuid, text, text, integer), public.transition_kling4_trial_fallback(text, uuid),
  public.release_kling4_trial(text, uuid) from public, anon, authenticated;
grant execute on function public.record_kling4_trial_film(text, uuid, text, text, integer), public.transition_kling4_trial_fallback(text, uuid),
  public.release_kling4_trial(text, uuid) to service_role;
commit;
notify pgrst, 'reload schema';
