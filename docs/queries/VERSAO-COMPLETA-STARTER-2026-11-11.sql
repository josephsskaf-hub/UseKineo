-- KINEO-VERSAO-COMPLETA-STARTER-1111 — a "versão completa do seu filme" aponta para o Starter (US$ 9/mês) com o Creator como
-- 2ª opção (interruptor KINEO_VERSAO_COMPLETA_STARTER_1111 em lib/growth/filmComplete.ts). Leitura em 7 dias.
-- Corte antes/depois = film15_full_offer_viewed.metadata.offer_version = 'versao_completa_starter_1111' (ausente = antes,
-- quando só existia o Creator). offer_tier = o plano MOSTRADO no botão principal. NUNCA o relógio.
-- Base (27/10 → 11/11, todos no Creator): 45 viram · 10 clicaram · 10 abriram checkout · 1 pagou (US$ 15,92, cancelou;
-- e o filme completo dele terminou em state 'failed' — ver a nota da Divisão 4 de 11/11).
with vistos as (
  select e.user_id, min(e.created_at) as t0,
         coalesce(max(e.metadata->>'offer_tier') filter (where e.metadata->>'offer_version' = 'versao_completa_starter_1111'), 'basic (antes)') as plano_mostrado
  from events e
  join auth.users u on u.id = e.user_id
  where e.name = 'film15_full_offer_viewed'
    and e.created_at > now() - interval '30 days'
    and u.email !~* '(josephs?skaf|usekineo\.com|shortsforgeai|kineo)'
  group by e.user_id
)
select v.plano_mostrado,
       count(*) as viram,
       count(*) filter (where exists (select 1 from events c where c.user_id = v.user_id and c.name = 'film15_full_offer_clicked' and c.created_at >= v.t0)) as clicaram,
       count(*) filter (where exists (select 1 from events c where c.user_id = v.user_id and c.name = 'film15_full_offer_clicked' and c.metadata->>'offer_tier' = 'basic' and c.metadata->>'offer_version' = 'versao_completa_starter_1111' and c.created_at >= v.t0)) as clicaram_creator,
       count(*) filter (where exists (select 1 from events c where c.user_id = v.user_id and c.name = 'checkout_started' and c.metadata->>'intent_campaign' = 'film15_full_version' and c.created_at >= v.t0)) as abriram_checkout,
       count(*) filter (where exists (select 1 from events s where s.user_id = v.user_id and s.name = 'payment_success' and s.metadata->>'intent_campaign' = 'film15_full_version' and s.created_at >= v.t0)) as pagaram,
       string_agg(distinct (select s.metadata->>'tier' from events s where s.user_id = v.user_id and s.name = 'payment_success' and s.metadata->>'intent_campaign' = 'film15_full_version' limit 1), ',') as planos_pagos,
       count(*) filter (where exists (select 1 from events i where i.user_id = v.user_id and i.name = 'film15_full_intent' and i.metadata->>'paid_session_id' is not null and i.metadata->>'state' = 'completed')) as filme_completo_entregue,
       count(*) filter (where exists (select 1 from events i where i.user_id = v.user_id and i.name = 'film15_full_intent' and i.metadata->>'paid_session_id' is not null and i.metadata->>'state' in ('failed', 'waiting_entitlement'))) as filme_completo_preso_ou_falhou
from vistos v
group by v.plano_mostrado
order by v.plano_mostrado;

-- Régua (escrita antes do 1º dado): em 7 dias, Starter com ≥ 1 pago E o filme completo entregue = mantém. 0 pagos com
-- ≥ 15 pessoas vendo = volta ao Creator ('off'). Um pago com o filme 'failed' ou 'waiting_entitlement' é DEFEITO, não venda:
-- avisa a CEO no mesmo dia (a pessoa pagou pelo filme).
