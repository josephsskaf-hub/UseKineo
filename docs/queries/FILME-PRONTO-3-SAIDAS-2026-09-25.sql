-- KINEO-FLUXO-NOVO-2026-09-25 — Peça A: as 3 saídas do filme pronto (próximo filme · mais créditos · assinar).
-- Eventos: film_ready_exits_shown (bloco ≥50% visível, 1x por filme) · film_ready_exit_clicked {exit, destination}
--          · film_ready_next_film_arrived (pousou no /studio com ?focus=idea; focused = o cursor entrou na caixa).
-- CORTE: pelo carimbo do bundle novo (metadata->>'version' = 'film_ready_exits_v1'), NUNCA pelo relógio.
-- Contas internas fora (padrão da casa). Contar PESSOAS, não eventos.

-- 1) Exposição → clique, por saída e por ramo da saída de créditos (topup = barra; plans = /pricing)
with vistos as (
  select e.user_id, min(e.created_at) t0,
         max(e.metadata->>'credits_exit') credits_exit, max(e.metadata->>'plan_state') plan_state
  from events e join profiles p on p.id = e.user_id
  where e.name = 'film_ready_exits_shown' and e.metadata->>'version' = 'film_ready_exits_v1'
    and coalesce(p.email, '') not ilike '%josephsskaf%'
  group by e.user_id)
select v.credits_exit, v.plan_state, count(*) pessoas_expostas,
  count(*) filter (where exists (select 1 from events c where c.user_id = v.user_id and c.name = 'film_ready_exit_clicked'
    and c.metadata->>'version' = 'film_ready_exits_v1' and c.metadata->>'exit' = 'next_film')) clicou_proximo_filme,
  count(*) filter (where exists (select 1 from events c where c.user_id = v.user_id and c.name = 'film_ready_exit_clicked'
    and c.metadata->>'version' = 'film_ready_exits_v1' and c.metadata->>'exit' = 'more_credits')) clicou_mais_creditos,
  count(*) filter (where exists (select 1 from events c where c.user_id = v.user_id and c.name = 'film_ready_exit_clicked'
    and c.metadata->>'version' = 'film_ready_exits_v1' and c.metadata->>'exit' = 'subscribe')) clicou_assinar,
  count(*) filter (where not exists (select 1 from events c where c.user_id = v.user_id and c.name = 'film_ready_exit_clicked'
    and c.metadata->>'version' = 'film_ready_exits_v1')) nenhuma_saida
from vistos v group by 1, 2 order by 3 desc;

-- 2) Próximo filme: clicou → pousou no /studio (foco entrou?) → saiu OUTRO filme depois do clique
with cliques as (
  select e.user_id, min(e.created_at) t0
  from events e join profiles p on p.id = e.user_id
  where e.name = 'film_ready_exit_clicked' and e.metadata->>'version' = 'film_ready_exits_v1'
    and e.metadata->>'exit' = 'next_film' and coalesce(p.email, '') not ilike '%josephsskaf%'
  group by e.user_id)
select count(*) clicaram,
  count(*) filter (where exists (select 1 from events a where a.user_id = k.user_id and a.name = 'film_ready_next_film_arrived'
    and a.created_at >= k.t0)) pousaram,
  count(*) filter (where exists (select 1 from events a where a.user_id = k.user_id and a.name = 'film_ready_next_film_arrived'
    and a.created_at >= k.t0 and (a.metadata->>'focused')::boolean)) cursor_na_caixa,
  count(*) filter (where exists (select 1 from events a where a.user_id = k.user_id and a.name = 'film_ready_next_film_arrived'
    and a.created_at >= k.t0 and not (a.metadata->>'pointer_fine')::boolean)) celular,
  count(*) filter (where exists (select 1 from events r where r.user_id = k.user_id and r.name = 'video_ready_viewed'
    and r.created_at > k.t0)) fizeram_outro_filme
from cliques k;

-- 3) Mais créditos pela BARRA (quem o checkout aceita): clique → compra na barra com surface film_ready → pagou pack
--    A barra grava checkout_cta_clicked com surface 'credits_topup_modal_film_ready'; o checkout_started do pack não
--    carrega surface, então o elo é a pessoa + ordem no tempo (sku credits_custom depois do clique).
with cliques as (
  select e.user_id, min(e.created_at) t0
  from events e join profiles p on p.id = e.user_id
  where e.name = 'film_ready_exit_clicked' and e.metadata->>'version' = 'film_ready_exits_v1'
    and e.metadata->>'destination' = 'topup_modal' and coalesce(p.email, '') not ilike '%josephsskaf%'
  group by e.user_id)
select count(*) abriram_a_barra,
  count(*) filter (where exists (select 1 from events c where c.user_id = k.user_id and c.name = 'checkout_cta_clicked'
    and c.metadata->>'surface' = 'credits_topup_modal_film_ready' and c.created_at >= k.t0)) apertaram_comprar,
  count(*) filter (where exists (select 1 from events c where c.user_id = k.user_id and c.name = 'checkout_started'
    and c.metadata->>'sku' = 'credits_custom' and c.created_at >= k.t0)) checkout_do_pack,
  count(*) filter (where exists (select 1 from events c where c.user_id = k.user_id and c.name = 'payment_success'
    and c.metadata->>'pack' = 'credits_custom' and c.created_at >= k.t0)) pagaram_pack
from cliques k;

-- 4) Planos (assinar, e "mais créditos" de quem não pode recarregar): clique → /pricing com a campanha → checkout → pagou
with cliques as (
  select e.user_id, min(e.created_at) t0, bool_or(e.metadata->>'exit' = 'subscribe') via_assinar,
         bool_or(e.metadata->>'exit' = 'more_credits') via_creditos
  from events e join profiles p on p.id = e.user_id
  where e.name = 'film_ready_exit_clicked' and e.metadata->>'version' = 'film_ready_exits_v1'
    and e.metadata->>'destination' = 'pricing' and coalesce(p.email, '') not ilike '%josephsskaf%'
  group by e.user_id)
select via_assinar, via_creditos, count(*) pessoas,
  count(*) filter (where exists (select 1 from events c where c.user_id = k.user_id and c.name = 'pricing_view'
    and c.metadata->>'source' = 'film_ready_v1' and c.created_at >= k.t0)) viram_pricing,
  count(*) filter (where exists (select 1 from events c where c.user_id = k.user_id and c.name = 'checkout_started'
    and c.metadata->>'intent_campaign' = 'film_ready_v1')) checkout_da_campanha,
  count(*) filter (where exists (select 1 from events c where c.user_id = k.user_id and c.name = 'payment_success'
    and c.created_at >= k.t0)) pagaram_qualquer_coisa,
  count(*) filter (where exists (select 1 from events c where c.user_id = k.user_id and c.name = 'payment_success'
    and c.metadata->>'intent_campaign' = 'film_ready_v1')) pagaram_pela_campanha
from cliques k group by 1, 2 order by 3 desc;

-- 5) Sonda do deploy: o bundle novo chegou? (primeira e última impressão, e quantas pessoas)
select name, min(created_at) primeira, max(created_at) ultima, count(*) eventos, count(distinct user_id) pessoas
from events
where name in ('film_ready_exits_shown', 'film_ready_exit_clicked', 'film_ready_next_film_arrived')
  and metadata->>'version' = 'film_ready_exits_v1'
group by 1 order by 1;
