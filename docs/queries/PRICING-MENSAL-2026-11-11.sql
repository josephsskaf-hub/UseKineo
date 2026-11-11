-- KINEO-PRICING-MENSAL-1111 — o /pricing sem parâmetro abre no MENSAL (interruptor KINEO_PRICING_MENSAL_1111 em
-- lib/growth/pricingPlanChoiceAttribution.ts; separado do da parede). Leitura em 7 dias.
-- Corte antes/depois = pricing_view.metadata.billing_default_version = 'pricing_mensal_1111' (ausente = antes). NUNCA o relógio.
-- billing_default diz a aba que ABRIU naquela visita ('monthly' sem parâmetro com o interruptor ligado; 'annual' só com
-- ?billing=annual explícito ou com o interruptor 'off').
-- Base (medida 11/11, 30 dias, externos): 17 pessoas abriram o pagamento vindo do /pricing e não pagaram; 11 delas no anual
-- cobrado de uma vez (US$ 54 a US$ 460); os 2 pagantes que vieram do /pricing pagaram MENSAL; 0 anuais no checkout em 60 dias.
with v as (
  select e.user_id,
         min(e.created_at) as t0,
         case when bool_or(e.metadata->>'billing_default_version' = 'pricing_mensal_1111' and e.metadata->>'billing_default' = 'monthly') then 'mensal (novo)'
              when bool_or(e.metadata->>'billing_default_version' = 'pricing_mensal_1111') then 'anual (pedido na URL ou interruptor off)'
              else 'anual (antes)' end as regime
  from events e
  join auth.users u on u.id = e.user_id
  where e.name = 'pricing_view'
    and e.created_at > now() - interval '14 days'
    and coalesce(e.metadata->>'is_bot', 'false') <> 'true'
    and u.email !~* '(josephs?skaf|usekineo\.com|shortsforgeai|kineo)'
  group by e.user_id
)
select v.regime,
       count(*) as pessoas_no_pricing,
       count(*) filter (where exists (select 1 from events c where c.user_id = v.user_id and c.name = 'checkout_started'
                                      and c.metadata->>'intent_campaign' like 'mrr0610_v1_pricing_%' and c.metadata->>'billing' = 'monthly' and c.created_at >= v.t0)) as checkout_mensal,
       count(*) filter (where exists (select 1 from events c where c.user_id = v.user_id and c.name = 'checkout_started'
                                      and c.metadata->>'intent_campaign' like 'mrr0610_v1_pricing_%' and c.metadata->>'billing' = 'annual' and c.created_at >= v.t0)) as checkout_anual,
       count(*) filter (where exists (select 1 from events s where s.user_id = v.user_id and s.name = 'payment_success'
                                      and s.metadata->>'intent_campaign' like 'mrr0610_v1_pricing_%' and s.created_at >= v.t0)) as pagos_do_pricing,
       count(*) filter (where exists (select 1 from events s where s.user_id = v.user_id and s.name = 'payment_success' and s.created_at >= v.t0)) as pagos_qualquer_caminho
from v
group by v.regime
order by v.regime;

-- Régua (escrita antes do 1º dado; a mesma da parede): em 7 dias, 'mensal (novo)' com ≥ 1 pago (qualquer caminho) depois do
-- /pricing = mantém. 0 pagos com ≥ 15 pessoas no regime novo = volta ao anual ('off').
-- Visitante SEM conta não entra aqui (pricing_view sem user_id): a página é pública; a conversão só se mede em quem tem conta.
