-- KINEO-TETO-K4-GRATIS-1111 (b) — NÃO APLICADA. Escrita pela Div. 4 para a CEO revisar e aplicar (CEO 11/11: "deixe a (b)
-- escrita (migration com desfazer e a conferência) para eu revisar e aplicar").
--
-- O QUE FAZ: um envio de Kling 4 grátis que a fal RECUSOU (resposta HTTP 4xx explícita, ex.: sem saldo — nada cobrado) devolve
-- os US$ 2,355 ao teto do DIA (kling4_trial_days). A linha da tentativa FICA com reserved_milliusd = 2355 e ganha released_at:
-- o teto de 1 envio por conta/aparelho em 24 h (lib/kling4GratisTeto.ts, regra c) continua contando a tentativa.
-- POR QUÊ: em 08/11 (fal sem saldo) 20 reservas que não custaram nada encheram o teto do dia (58,88 de 60); se mais gente
-- chegasse naquele dia, perderia o Kling 4 grátis por causa de dinheiro que nunca saiu.
-- NÃO devolve: timeout, erro de rede, 5xx, "sem id" — a fal pode ter aceitado e cobrado; nesses casos a reserva fica.
--
-- ONDE APLICAR: projeto cqqukkvjjrguayiyjvhh. Ao aplicar, copiar para supabase/migrations/ com o carimbo do dia.
-- DEPOIS DE APLICAR (2º passo, código — Div. 4 faz quando a CEO disser): lib/kling4Trial.ts passa a guardar o status HTTP da
-- recusa (hoje vira só 'provider_submit_failed'); com 400–499 o orquestrador devolve reason 'provider_refused' e a rota chama
-- releaseKling4Trial (rpc release_kling4_trial) logo depois do orchestrateKling4Trial. Antes desse passo esta função não é
-- chamada por ninguém: aplicar a migration sozinha não muda nada no produto.

-- ═══════════════════════════════ APLICAR ═══════════════════════════════
begin;

alter table public.kling4_trial_films add column if not exists released_at timestamptz;

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

revoke all on function public.release_kling4_trial(text, uuid) from public, anon, authenticated;
grant execute on function public.release_kling4_trial(text, uuid) to service_role;

commit;

-- ═══════════════════════════════ CONFERÊNCIA (rodar logo depois; tudo volta com o rollback) ═══════════════════════════════
-- 1) existe, é security invoker e só a service_role executa:
select p.proname, p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'execute') as anon_exec,
       has_function_privilege('authenticated', p.oid, 'execute') as auth_exec,
       has_function_privilege('service_role', p.oid, 'execute') as service_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'release_kling4_trial';
-- esperado: 1 linha · security_definer=false · anon_exec=false · auth_exec=false · service_exec=true

-- 2) ensaio completo numa transação desfeita: reserva → devolve → devolve de novo (idempotente) → o dia volta ao que era
begin;
select reserved_milliusd as dia_antes from public.kling4_trial_days where request_day = (now() at time zone 'UTC')::date;
select public.reserve_kling4_trial('conferencia-release-1111', '00000000-0000-4000-8000-00000000c0fe', 'BR');   -- {"code":"ok",...} (ou "cap" se o dia já encheu: aí o passo seguinte dá "unavailable", o esperado)
select public.release_kling4_trial('conferencia-release-1111', '00000000-0000-4000-8000-00000000c0fe');         -- {"code":"ok","released_milliusd":2355,...}
select public.release_kling4_trial('conferencia-release-1111', '00000000-0000-4000-8000-00000000c0fe');         -- {"code":"unchanged"}
select reserved_milliusd as dia_depois from public.kling4_trial_days where request_day = (now() at time zone 'UTC')::date; -- = dia_antes
select reserved_milliusd, released_at is not null as devolvida from public.kling4_trial_films
 where job_id = 'conferencia-release-1111';                                                                      -- 2355 · true (o teto de 24 h ainda conta)
rollback;

-- ═══════════════════════════════ DESFAZER ═══════════════════════════════
-- Tira a função e a coluna. ATENÇÃO: o que já foi devolvido ao teto do dia NÃO volta a ser descontado (só afeta o dia em curso,
-- e o teto de 24 h por conta não depende desta coluna). Antes de rodar, o código do 2º passo tem de sair (senão a rota chama
-- uma função que não existe — o erro é engolido e a reserva só fica presa, como hoje).
-- begin;
-- drop function if exists public.release_kling4_trial(text, uuid);
-- alter table public.kling4_trial_films drop column if exists released_at;
-- commit;
