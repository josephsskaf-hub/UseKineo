-- HANDOFF-CLIPS-PRIMEIRO-SQL-2026-10-05 — consultas de MEDIÇÃO da branch codex/nuvem-clips-primeiro-0510.
-- Todas são SÓ LEITURA e NENHUMA foi rodada nesta sessão (regra do CEO: nada de conector). A sessão CEO roda e cola os
-- números em docs/HANDOFF-CLIPS-PRIMEIRO-2026-10-05.md. Cada consulta diz: o que mede · qual decisão alimenta · esperado.
-- Contas da casa: excluir pelos e-mails de lib/internalAccounts.ts (INTERNAL_EMAILS). Este arquivo NÃO lista e-mail
-- nenhum (sem PII no repo): troque o array vazio de `casa` pelo conteúdo daquela lista na hora de rodar.

-- ═══ SQL #1 — Preço dos clipes: pedidos, entregas, créditos e margem realizada por motor × duração (30 dias) ══════════
-- Mede: o mix real do /clips e a margem no crédito mais barato da casa (Studio, US$ 0,183/cr).
-- Decisão: ligar CLIP_PRECO_MERCADO_PUBLIC? baixar o mínimo de 5 cr só no H3 de 5/7 s?
-- Esperado: Seedance 5 s domina os pedidos; margem no Studio > 50% em todos os motores.
select engine, seconds, count(*) pedidos, count(*) filter (where status = 'done') entregues,
  sum(credits) creditos, round(sum(fal_usd)::numeric, 2) fal_usd,
  round(1 - sum(fal_usd) / nullif(sum(credits) * 0.183, 0), 3) margem_no_studio
from public.clips where created_at > now() - interval '30 days'
group by 1, 2 order by pedidos desc;

-- ═══ SQL #2 — Funil dos efeitos de 1 clique: escolhido → pronto → clique no upsell → filme no Studio ═══════════════
-- Mede: por efeito, quantos pedidos foram aceitos, quantos ficaram prontos, quantos clicaram "Transformar em filme
-- narrado (60 s)" e quantas dessas pessoas fizeram um filme 'completed' em até 7 dias depois do clique.
-- Decisão: ligar CLIP_EFFECTS_PUBLIC; quais efeitos ficam na galeria; se o upsell merece lugar na home.
-- Esperado (hipótese "clipe é a porta do filme"): pronto/escolhido ≥ 90%; upsell/pronto ≥ 15%; filme/upsell ≥ 30%.
with casa as (select unnest(array[]::text[]) email),
ev as (
  select e.name, e.user_id, e.created_at, e.metadata->>'effect' effect, e.metadata->>'clip_id' clip_id
  from public.events e
  where e.name in ('clip_effect_chosen', 'clip_effect_ready', 'clip_effect_film_upsell_clicked')
    and e.created_at >= '2026-10-05'
    and e.user_id not in (select u.id from auth.users u where lower(u.email) in (select lower(email) from casa))
),
up as (select * from ev where name = 'clip_effect_film_upsell_clicked')
select ev.effect,
  count(distinct ev.clip_id) filter (where ev.name = 'clip_effect_chosen') escolhidos,
  count(distinct ev.clip_id) filter (where ev.name = 'clip_effect_ready') prontos,
  count(distinct ev.clip_id) filter (where ev.name = 'clip_effect_film_upsell_clicked') cliques_upsell,
  (select count(distinct up.user_id) from up where up.effect = ev.effect and exists (
     select 1 from public.videos v where v.user_id = up.user_id and v.status = 'completed'
       and v.created_at between up.created_at and up.created_at + interval '7 days')) pessoas_com_filme_7d
from ev group by ev.effect order by escolhidos desc;

-- ═══ SQL #3 — A/B da home (Q1): exposição e cadastro por variante ═════════════════════════════════════════════════════
-- Mede: visitantes únicos expostos (kineo_vid) por variante e quantos viraram conta (a linha 'user' do
-- home_variant_exposed liga o kineo_vid à conta; o carimbo home_visitor_id nos eventos de efeito também liga).
-- Decisão: HOME_CLIPS_FIRST 'ab50' → 'all' ou → 'off'.
-- Esperado: cadastro/exposto da clips_first ≥ controle. Bots ficam fora (o servidor não os sorteia).
with x as (
  select e.metadata->>'variant' variant, e.metadata->>'visitor_id' vid, e.user_id, e.created_at
  from public.events e
  where e.name = 'home_variant_exposed' and e.metadata->>'version' = 'home_clips_first_v1'
    and coalesce((e.metadata->>'rendered_match')::boolean, true)
),
vid as (select vid, min(variant) variant, count(distinct variant) n_var from x where vid is not null group by vid),
conta as (select distinct vid, user_id from x where vid is not null and user_id is not null)
select v.variant, count(*) visitantes, count(*) filter (where v.n_var > 1) trocaram_variante,
  count(distinct c.user_id) contas, round(100.0 * count(distinct c.user_id) / nullif(count(*), 0), 2) pct_cadastro
from vid v left join conta c on c.vid = v.vid
group by 1 order by 1;

-- ═══ SQL #4 — A/B da home (Q2): ativação por variante (primeiro clipe OU primeiro filme em 24 h) ═══════════════════════
-- Mede: das contas ligadas a cada variante, quantas entregaram algo em 24 h (clipe 'done' ou filme 'completed').
-- Decisão: a variante só ganha se trouxer gente que USA, não só gente que se cadastra.
-- Esperado: clips_first ≥ controle (o clipe de 5 s é mais rápido que o filme).
with x as (
  select e.metadata->>'variant' variant, e.user_id
  from public.events e
  where e.name = 'home_variant_exposed' and e.metadata->>'version' = 'home_clips_first_v1' and e.user_id is not null
),
pessoa as (select user_id, min(variant) variant from x group by user_id having count(distinct variant) = 1)
select p.variant, count(*) contas,
  count(*) filter (where exists (select 1 from public.clips c where c.user_id = p.user_id and c.status = 'done'
    and c.created_at < pr.created_at + interval '24 hours')) com_clipe_24h,
  count(*) filter (where exists (select 1 from public.videos v where v.user_id = p.user_id and v.status = 'completed'
    and v.created_at < pr.created_at + interval '24 hours')) com_filme_24h
from pessoa p join public.profiles pr on pr.id = p.user_id
group by 1 order by 1;

-- ═══ SQL #5 — A/B da home (Q3, REGRA DE PARADA): checkout e pagamento por exposto, 14 dias ════════════════════════════
-- Mede: checkout_started e payment_success por conta ligada a cada variante, 14 dias depois da 1ª exposição.
-- Decisão: regra de parada proposta — depois de 14 dias em 'ab50', se a clips_first tiver checkout/exposto MENOR que o
-- controle, volta para 'off'; se igual ou maior com ≥ 300 expostos por braço, vai para 'all'. (DECISÃO DO FUNDADOR.)
-- Esperado: pagantes/conta da clips_first ≥ controle (a métrica única da casa é pagante novo por semana).
with x as (
  select e.metadata->>'variant' variant, e.user_id, min(e.created_at) primeira
  from public.events e
  where e.name = 'home_variant_exposed' and e.metadata->>'version' = 'home_clips_first_v1' and e.user_id is not null
  group by 1, 2
)
select x.variant, count(distinct x.user_id) contas,
  count(distinct k.user_id) com_checkout_14d, count(distinct pg.user_id) pagantes_14d
from x
left join public.events k on k.user_id = x.user_id and k.name = 'checkout_started'
  and k.created_at between x.primeira and x.primeira + interval '14 days'
left join public.events pg on pg.user_id = x.user_id and pg.name = 'payment_success'
  and pg.created_at between x.primeira and x.primeira + interval '14 days'
group by 1 order by 1;
