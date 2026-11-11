-- KINEO-TETO-K4-GRATIS-1111 (b) + teto de 24 h no banco — NÃO APLICADA. Escrita pela Div. 4; a CEO revisa e aplica
-- (CEO 11/11: "deixe a (b) escrita (migration com desfazer e a conferência)" + "ponha a regra das 24 h dentro do
-- reserve_kling4_trial na MESMA migration (fecha os 2 cliques no mesmo segundo)").
--
-- O QUE FAZ, EM DUAS PARTES:
--  1. reserve_kling4_trial ganha a regra das 24 h DENTRO da reserva: no máximo 1 reserva de US$ 2,355 por conta E por digital
--     de aparelho (trial_signup_fingerprints) em 24 h. A contagem acontece depois da trava da linha do dia (que já serializa
--     todas as reservas do dia) e de uma trava nova por CONTA (que cobre a virada da meia-noite UTC): dois cliques no mesmo
--     segundo esperam um pelo outro e o segundo recebe 'teto_24h'. Parâmetro novo p_cap_24h (padrão TRUE = vale já ao
--     aplicar); o código passa FALSE só para a conta da casa (2º passo de código). Quem recebe 'teto_24h' ganha o MESMO filme
--     grátis no motor barato — o código de hoje lê qualquer código desconhecido como 'unavailable' → motor barato.
--     ATÉ O 2º PASSO SAIR: a conta da casa também fica no teto de 24 h (sem impacto para cliente).
--  2. release_kling4_trial (nova): um envio que a fal RECUSOU (HTTP 4xx explícito — ex.: sem saldo; nada cobrado) devolve os
--     US$ 2,355 ao teto do DIA. A linha FICA com reserved_milliusd = 2355 e ganha released_at: a regra das 24 h continua
--     contando a tentativa. NÃO devolve timeout, rede, 5xx, "sem id" (a fal pode ter aceitado e cobrado). Só é chamada pelo
--     2º passo de código; antes dele, ninguém a chama.
-- POR QUÊ: 08/11 (fal sem saldo), 2 pessoas reais, 51 pedidos, 20 reservas que custaram ≈ US$ 0 encheram o teto do dia
-- (58,88 de 60). O teto em código (e0977e300) já para o robô e o 2º envio; esta migration fecha a corrida de dois cliques
-- simultâneos e devolve ao dia o dinheiro que nunca saiu.
--
-- ONDE: projeto cqqukkvjjrguayiyjvhh. Ao aplicar, copiar para supabase/migrations/ com o carimbo do dia.
-- ORDEM: (1) aplicar esta migration → (2) rodar a CONFERÊNCIA → (3) publicar o 2º passo de código (passa p_cap_24h e chama a
-- devolução). Publicar o código ANTES da migration quebraria toda reserva (parâmetro desconhecido = 'unavailable' = ninguém
-- ganha Kling 4 grátis) — o guardião do 2º passo avisa isso.

-- ═══════════════════════════════ APLICAR ═══════════════════════════════
begin;

alter table public.kling4_trial_films add column if not exists released_at timestamptz;
create index if not exists kling4_trial_films_reserved_at_idx on public.kling4_trial_films (reserved_at) where reserved_milliusd = 2355;
create index if not exists trial_signup_fingerprints_user_idx on public.trial_signup_fingerprints (user_id);

-- A assinatura muda (4º parâmetro com padrão): a de 3 parâmetros sai na MESMA transação, senão a chamada de 3 argumentos
-- ficaria ambígua. O código de hoje (3 argumentos nomeados) cai na nova, com p_cap_24h = true.
drop function if exists public.reserve_kling4_trial(text, uuid, text);

create function public.reserve_kling4_trial(p_job_id text, p_user_id uuid, p_country text, p_cap_24h boolean default true)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_day date := (now() at time zone 'UTC')::date;
  v_reserved integer;
  v_country text := case when p_country ~ '^[A-Za-z]{2}$' then upper(p_country) else null end;
  v_since timestamptz := now() - interval '24 hours';
begin
  if p_user_id is null or p_job_id is null or length(btrim(p_job_id)) not between 1 and 200 then
    return jsonb_build_object('code', 'unavailable');
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-trial:' || p_user_id::text || ':' || p_job_id, 0));
  if exists(select 1 from public.kling4_trial_films where user_id = p_user_id and job_id = p_job_id) then
    return jsonb_build_object('code', 'duplicate');
  end if;
  -- trava por CONTA (nova): dois pedidos da mesma conta, com ids diferentes, esperam um pelo outro (inclusive na meia-noite UTC)
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-trial-user:' || p_user_id::text, 0));
  insert into public.kling4_trial_days(request_day) values(v_day) on conflict (request_day) do nothing;
  select reserved_milliusd into v_reserved from public.kling4_trial_days where request_day = v_day for update;
  -- a regra das 24 h, depois das travas: conta e digital de aparelho (reserva de US$ 2,355, devolvida ou não)
  if coalesce(p_cap_24h, true) and (
       exists(select 1 from public.kling4_trial_films f
               where f.user_id = p_user_id and f.reserved_milliusd = 2355 and f.reserved_at >= v_since)
    or exists(select 1 from public.trial_signup_fingerprints mine
                join public.trial_signup_fingerprints other
                  on other.fingerprint_hash = mine.fingerprint_hash and other.user_id is not null and other.user_id <> p_user_id
                join public.kling4_trial_films f
                  on f.user_id = other.user_id and f.reserved_milliusd = 2355 and f.reserved_at >= v_since
               where mine.user_id = p_user_id)
  ) then
    insert into public.kling4_trial_films(user_id, job_id, request_day, country, reserved_milliusd)
      values(p_user_id, p_job_id, v_day, v_country, 0);
    return jsonb_build_object('code', 'teto_24h');
  end if;
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

create or replace function public.release_kling4_trial(p_job_id text, p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_film public.kling4_trial_films%rowtype;
begin
  if p_user_id is null or p_job_id is null or length(btrim(p_job_id)) not between 1 and 200 then
    return jsonb_build_object('code', 'unavailable');
  end if;
  -- a MESMA chave de trava da reserva e do registro (reserve_kling4_trial / record_kling4_trial_film)
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-trial:' || p_user_id::text || ':' || p_job_id, 0));
  select * into v_film from public.kling4_trial_films where user_id = p_user_id and job_id = p_job_id for update;
  if not found or v_film.reserved_milliusd <> 2355 then return jsonb_build_object('code', 'unavailable'); end if;
  if v_film.released_at is not null then return jsonb_build_object('code', 'unchanged'); end if;
  if v_film.engine_used = 'kling4' then return jsonb_build_object('code', 'unavailable'); end if; -- filme entregue no Kling 4: custou
  update public.kling4_trial_films set released_at = now() where user_id = p_user_id and job_id = p_job_id;
  update public.kling4_trial_days set reserved_milliusd = greatest(reserved_milliusd - 2355, 0) where request_day = v_film.request_day;
  return jsonb_build_object('code', 'ok', 'released_milliusd', 2355, 'request_day', v_film.request_day);
end;
$$;

revoke all on function public.reserve_kling4_trial(text, uuid, text, boolean), public.release_kling4_trial(text, uuid) from public, anon, authenticated;
grant execute on function public.reserve_kling4_trial(text, uuid, text, boolean), public.release_kling4_trial(text, uuid) to service_role;

commit;

-- ═══════════════════════════════ CONFERÊNCIA (logo depois; tudo volta com o rollback) ═══════════════════════════════
-- 1) uma só reserve_kling4_trial (a de 4 parâmetros), as duas security invoker, só a service_role executa:
select p.oid::regprocedure::text as funcao, p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'execute') as anon_exec,
       has_function_privilege('authenticated', p.oid, 'execute') as auth_exec,
       has_function_privilege('service_role', p.oid, 'execute') as service_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('reserve_kling4_trial', 'release_kling4_trial') order by 1;
-- esperado: 2 linhas — release_kling4_trial(text,uuid) e reserve_kling4_trial(text,uuid,text,boolean) · false · false · false · true

-- 2) ensaio completo numa transação DESFEITA. Termina com NOTICE 'CONFERENCIA OK'; qualquer desvio levanta EXCEPTION.
--    Conta: um id falso (kling4_trial_films não tem chave estrangeira). Aparelho: um PAR REAL de contas que dividem uma digital
--    (só leitura; a reserva de mentira criada para o par some no rollback). Se o dia já estiver perto do teto de US$ 60, o
--    passo "a" devolve 'cap' e o ensaio avisa em vez de falhar.
begin;
do $$
declare
  u uuid := '00000000-0000-4000-8000-00000000c0fe';
  r jsonb; dia0 integer; dia1 integer; a uuid; b uuid;
begin
  select coalesce((select reserved_milliusd from public.kling4_trial_days where request_day = (now() at time zone 'UTC')::date), 0) into dia0;
  r := public.reserve_kling4_trial('conf-1111-a', u, 'BR');
  if r->>'code' = 'cap' then raise notice 'dia perto do teto de US$ 60: ensaio da conta pulado (rode de novo amanhã cedo)';
  else
    if r->>'code' <> 'ok' then raise exception 'a) 1ª reserva deveria ser ok: %', r; end if;
    r := public.reserve_kling4_trial('conf-1111-b', u, 'BR');
    if r->>'code' <> 'teto_24h' then raise exception 'b) 2ª reserva em 24 h deveria ser teto_24h: %', r; end if;
    r := public.reserve_kling4_trial('conf-1111-c', u, 'BR', false);
    if r->>'code' <> 'ok' then raise exception 'c) com p_cap_24h=false (casa) deveria passar: %', r; end if;
    r := public.release_kling4_trial('conf-1111-a', u);
    if r->>'code' <> 'ok' then raise exception 'd) devolução deveria ser ok: %', r; end if;
    r := public.release_kling4_trial('conf-1111-a', u);
    if r->>'code' <> 'unchanged' then raise exception 'e) devolução repetida deveria ser unchanged: %', r; end if;
    r := public.reserve_kling4_trial('conf-1111-d', u, 'BR');
    if r->>'code' <> 'teto_24h' then raise exception 'f) devolvida ainda conta nas 24 h: %', r; end if;
    r := public.reserve_kling4_trial('conf-1111-a', u, 'BR');
    if r->>'code' <> 'duplicate' then raise exception 'g) mesmo pedido de novo deveria ser duplicate: %', r; end if;
    select reserved_milliusd into dia1 from public.kling4_trial_days where request_day = (now() at time zone 'UTC')::date;
    if dia1 <> dia0 + 2355 then raise exception 'h) o dia deveria ter +2355 (só a reserva c; a e foi devolvida): antes % depois %', dia0, dia1; end if;
  end if;
  -- aparelho: um par real de contas na mesma digital
  select x.user_id, y.user_id into a, b from public.trial_signup_fingerprints x
    join public.trial_signup_fingerprints y on y.fingerprint_hash = x.fingerprint_hash and y.user_id <> x.user_id
   where x.user_id is not null and y.user_id is not null limit 1;
  if a is null then raise notice 'nenhum par de contas na mesma digital: ensaio do aparelho pulado';
  else
    insert into public.kling4_trial_films(user_id, job_id, request_day, reserved_milliusd, reserved_at)
      values(a, 'conf-1111-aparelho', (now() at time zone 'UTC')::date, 2355, now() - interval '1 hour');
    r := public.reserve_kling4_trial('conf-1111-aparelho-b', b, 'BR');
    if r->>'code' <> 'teto_24h' then raise exception 'i) outra conta no mesmo aparelho em 24 h deveria ser teto_24h: %', r; end if;
  end if;
  raise notice 'CONFERENCIA OK';
end $$;
rollback;

-- ═══════════════════════════════ DESFAZER ═══════════════════════════════
-- Volta a reserva de 3 parâmetros (idêntica à de 20261029011109), tira a devolução, a coluna e os índices. ATENÇÃO: o que já
-- foi devolvido ao teto do dia NÃO volta a ser descontado (só afeta o dia em curso). Se o 2º passo de código já estiver no ar,
-- tire-o ANTES (ele passa p_cap_24h, que a função de 3 parâmetros não conhece → toda reserva viraria 'unavailable').
-- begin;
-- drop function if exists public.reserve_kling4_trial(text, uuid, text, boolean);
-- drop function if exists public.release_kling4_trial(text, uuid);
-- create function public.reserve_kling4_trial(p_job_id text, p_user_id uuid, p_country text)
-- returns jsonb language plpgsql security invoker set search_path = '' as $$
-- declare
--   v_day date := (now() at time zone 'UTC')::date;
--   v_reserved integer;
--   v_country text := case when p_country ~ '^[A-Za-z]{2}$' then upper(p_country) else null end;
-- begin
--   if p_user_id is null or p_job_id is null or length(btrim(p_job_id)) not between 1 and 200 then
--     return jsonb_build_object('code', 'unavailable');
--   end if;
--   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kling4-trial:' || p_user_id::text || ':' || p_job_id, 0));
--   if exists(select 1 from public.kling4_trial_films where user_id = p_user_id and job_id = p_job_id) then
--     return jsonb_build_object('code', 'duplicate');
--   end if;
--   insert into public.kling4_trial_days(request_day) values(v_day) on conflict (request_day) do nothing;
--   select reserved_milliusd into v_reserved from public.kling4_trial_days where request_day = v_day for update;
--   if v_reserved + 2355 > 60000 then
--     insert into public.kling4_trial_films(user_id, job_id, request_day, country, reserved_milliusd)
--       values(p_user_id, p_job_id, v_day, v_country, 0);
--     return jsonb_build_object('code', 'cap');
--   end if;
--   insert into public.kling4_trial_films(user_id, job_id, request_day, country, reserved_milliusd)
--     values(p_user_id, p_job_id, v_day, v_country, 2355);
--   update public.kling4_trial_days set reserved_milliusd = reserved_milliusd + 2355 where request_day = v_day;
--   return jsonb_build_object('code', 'ok', 'reserved_milliusd', 2355);
-- end;
-- $$;
-- revoke all on function public.reserve_kling4_trial(text, uuid, text) from public, anon, authenticated;
-- grant execute on function public.reserve_kling4_trial(text, uuid, text) to service_role;
-- drop index if exists public.kling4_trial_films_reserved_at_idx;
-- drop index if exists public.trial_signup_fingerprints_user_idx;
-- alter table public.kling4_trial_films drop column if exists released_at;
-- commit;
