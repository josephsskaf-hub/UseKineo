-- KINEO-FAL-SALDO-ALERTA-2026-09-28
--
-- POR QUE ESTA FUNÇÃO EXISTE.
--
-- Em 30 dias (até 27/09) a fal recusou 36 cenas por saldo em 12 despachos
-- (11/09, 16/09, 21/09). O único sinal era um e-mail sem rastro, com throttle
-- na memória da lambda: nenhuma tela respondia "quando foi a última vez, quantas
-- cenas, quem pagou por isso?". O alarme novo (lib/falAlert.ts) grava uma linha
-- `fal_balance_exhausted` por ocorrência; o card do topo de
-- /admin/supplier-health lê ESTA função.
--
-- CONTAR NO BANCO, NUNCA NO NODE: o PostgREST deste projeto corta em 1000
-- linhas SEM ERRO (db.max_rows) — foi assim que o painel mostrou 435 visitantes
-- quando eram 1.820 (admin_live_counters, 27/08). Esta função devolve UM jsonb
-- já agregado; o painel não lê linha crua nenhuma.
--
-- A LISTA DE CONTAS INTERNAS NÃO MORA AQUI: chega por parâmetro, vinda de
-- lib/internalAccounts.ts (mesmo desenho de admin_live_counters).
--
-- O QUE DEVOLVE:
--   latest   — o último alarme (vaga reservada, alerted=true), sem janela, com
--              o estado do envio (sent/failed/timeout/reserved).
--   last_refusal_at — a ÚLTIMA recusa registrada na janela: qualquer linha
--              fal_balance_exhausted (reserva ou contagem) ou despacho com saldo.
--              É ela que pinta o card de vermelho, não a reserva: a reserva
--              nasce na 1ª recusa da janela fixa de 6 h (revisão de 28/09 —
--              reserva às 00:10, recusas até 05:50, card às 06:30 dizia verde).
--   by_day   — por dia (UTC) e fonte: ocorrências, e-mails ENTREGUES
--              (state=sent; uma re-tentativa que falhou não conta), cenas
--              recusadas, pessoas e pessoas externas.
--   dispatch — cinematic_dispatch_result com saldo na janela: despachos, cenas
--              recusadas, pessoas, créditos estornados, créditos cobrados de
--              filme ENTREGUE (compose_submission_claim status=done) e créditos
--              cobrados SEM estorno e SEM entrega — este último é dinheiro de
--              cliente parado e deveria ser sempre 0.
-- Conferido em 27/09 (SELECT idêntico, só leitura): 12 despachos, 36 cenas,
-- 2 pessoas (1 externa), 450 cr estornados, 44 cr cobrados de filme entregue,
-- 0 cr cobrados sem entrega.
--
-- FIX-REVISAO-2 (28/09) — EVENTO_DO_SERVIDOR: `alarmes` e `ultimo` só leem
-- linha escrita pelo servidor. O sink público /api/events carimba ip_hash e
-- is_bot em TODA linha dele (depois do metadata do cliente); o alarme
-- (lib/falAlert, service role) nunca. Antes, um POST anônimo com
-- fal_balance_exhausted {alerted:true, state:sent} virava "último alarme" e
-- pintava o card de vermelho. O nome também entrou em SERVER_ONLY_EVENTS.
-- (`->` devolve SQL NULL só com a chave AUSENTE; espelho em
-- lib/supplier/falBalancePanel.ts FAL_PANEL_CLIENT_STAMP_KEYS.)

create or replace function public.admin_fal_balance_panel(
  p_exact_emails text[],
  p_like_patterns text[],
  p_days integer default 30
)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with internos as (
    select p.id
    from profiles p
    where lower(p.email) = any (select lower(x) from unnest(p_exact_emails) x)
       or exists (select 1 from unnest(p_like_patterns) pat where lower(p.email) like lower(pat))
  ),
  janela as (
    select now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 90))) as desde
  ),
  alarmes as (
    select e.created_at, coalesce(e.user_id::text, e.metadata->>'user_id') as pessoa, e.metadata
    from events e, janela j
    where e.name = 'fal_balance_exhausted' and e.created_at > j.desde
      and (e.metadata->'ip_hash') is null and (e.metadata->'is_bot') is null -- EVENTO_DO_SERVIDOR
  ),
  ultimo as (
    select e.created_at, e.metadata
    from events e
    where e.name = 'fal_balance_exhausted' and e.metadata->>'alerted' = 'true'
      and (e.metadata->'ip_hash') is null and (e.metadata->'is_bot') is null -- EVENTO_DO_SERVIDOR
    order by e.created_at desc
    limit 1
  ),
  por_dia as (
    select (a.created_at at time zone 'UTC')::date as dia,
      coalesce(a.metadata->>'source', 'unknown') as fonte,
      count(*) as eventos,
      count(*) filter (where a.metadata->>'alerted' = 'true' and a.metadata->>'state' = 'sent') as alertas,
      coalesce(sum(case when (a.metadata->>'scenes_refused') ~ '^\d{1,6}$'
        then (a.metadata->>'scenes_refused')::int else 0 end), 0) as cenas,
      count(distinct a.pessoa) as pessoas,
      count(distinct a.pessoa) filter (where a.pessoa is not null
        and not exists (select 1 from internos i where i.id::text = a.pessoa)) as externas
    from alarmes a
    group by 1, 2
  ),
  despachos as (
    select e.user_id,
      e.created_at,
      e.metadata->>'generation_id' as gid,
      e.metadata->>'billing_reference' as br,
      case when (e.metadata->'reason_histogram'->>'balance_quota') ~ '^\d{1,6}$'
        then (e.metadata->'reason_histogram'->>'balance_quota')::int else 0 end as cenas
    from events e, janela j
    where e.name = 'cinematic_dispatch_result' and e.created_at > j.desde
      and (e.metadata->>'balance_exhausted' = 'true'
        or (e.metadata->'reason_histogram'->>'balance_quota') ~ '^[1-9]\d{0,5}$')
  ),
  debitos as (
    select d.user_id, cd.amount, cd.refunded_at,
      exists (
        select 1 from events c
        where c.name = 'compose_submission_claim' and c.session_id = d.gid and c.metadata->>'status' = 'done'
      ) as entregue
    from despachos d
    join credit_debits cd on cd.render_id = d.br
  )
  select jsonb_build_object(
    'latest', (select jsonb_build_object(
        'created_at', u.created_at,
        'source', u.metadata->>'source',
        'engine', u.metadata->>'engine',
        'state', u.metadata->>'state',
        'scenes_refused', u.metadata->>'scenes_refused')
      from ultimo u),
    -- greatest ignora NULL: basta uma das duas fontes ter recusa na janela.
    'last_refusal_at', greatest(
      (select max(a.created_at) from alarmes a),
      (select max(d.created_at) from despachos d)),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object(
        'day', pd.dia, 'source', pd.fonte, 'events', pd.eventos, 'alerts', pd.alertas,
        'scenes_refused', pd.cenas, 'people', pd.pessoas, 'external_people', pd.externas)
        order by pd.dia desc, pd.fonte)
      from por_dia pd), '[]'::jsonb),
    'dispatch', jsonb_build_object(
      'dispatches', (select count(*) from despachos),
      'scenes_refused', (select coalesce(sum(d.cenas), 0) from despachos d),
      'people', (select count(distinct d.user_id) from despachos d),
      'external_people', (select count(distinct d.user_id) from despachos d
        where d.user_id is not null and not exists (select 1 from internos i where i.id = d.user_id)),
      'refunded_credits', (select coalesce(sum(b.amount), 0) from debitos b where b.refunded_at is not null),
      'delivered_charged_credits', (select coalesce(sum(b.amount), 0) from debitos b where b.refunded_at is null and b.entregue),
      'unrefunded_undelivered_credits', (select coalesce(sum(b.amount), 0) from debitos b where b.refunded_at is null and not b.entregue),
      'unrefunded_undelivered_debits', (select count(*) from debitos b where b.refunded_at is null and not b.entregue),
      'unrefunded_undelivered_external', (select count(*) from debitos b where b.refunded_at is null and not b.entregue
        and b.user_id is not null and not exists (select 1 from internos i where i.id = b.user_id))
    ),
    'days', greatest(1, least(coalesce(p_days, 30), 90))
  );
$$;

-- Só o service_role chama. SECURITY DEFINER lendo `events` (fechada desde
-- events_lockdown_service_role_only): aberta para `authenticated`, reabriria
-- por RPC a porta que aquelas migrations fecharam.
revoke all on function public.admin_fal_balance_panel(text[], text[], integer) from public, anon, authenticated;
grant execute on function public.admin_fal_balance_panel(text[], text[], integer) to service_role;
