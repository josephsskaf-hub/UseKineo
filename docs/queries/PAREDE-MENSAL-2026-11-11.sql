-- KINEO-PAREDE-MENSAL-1111 — a parede de crédito abre no MENSAL (interruptor lib/offers/paredeMensal1111.ts). Leitura em 7 dias.
-- Corte antes/depois = a impressão 'menu' do modal: metadata.billing_default ('monthly' depois; ausente = antes, quando abria no anual).
-- NUNCA o relógio. Externos só (contas da casa fora pelo padrão de e-mail usado nas medições da Divisão 4).
-- Base (medida 11/11, 14 dias, todos no anual): 29 pessoas na parede · 26 viram preço anual · 6 viram preço mensal ·
-- 4 checkouts (3 mensais + 1 passe; 0 anual) · 0 pagos. Dos 6 que viram o mensal, 1 abriu checkout mensal.
-- ATENÇÃO: 2 dos 3 checkouts mensais saíram com intent_campaign NULO (conversionCheckoutHref só marca quando notPaidProven);
-- por isso o funil conta o checkout pela aba (metadata.billing do checkout_started) depois da parede, e a campanha fica de apoio.
--
-- Funil por regime: abriu a parede → viu preço mensal / anual → checkout mensal / anual vindo da parede → pago vindo da parede.
-- checkout_mensal/anual = checkout_started com metadata.billing depois da 1ª parede. pagos_da_parede = intent_campaign
-- mrr0610_v1_upgrade_% (subconta: ver a nota acima); pagos_qualquer_caminho = payment_success depois da 1ª parede.
with abriu as (
  select e.user_id,
         min(e.created_at) as t0,
         case when bool_or(e.metadata->>'billing_default' = 'monthly') then 'mensal (novo)'
              when bool_or(e.metadata->>'billing_default' = 'annual') then 'anual (interruptor off)'
              else 'anual (antes)' end as regime
  from events e
  join auth.users u on u.id = e.user_id
  where e.name = 'conversion_offer_viewed'
    and e.metadata->>'offer_id' = 'menu'
    and e.metadata->>'offer_surface' = 'upgrade'
    and e.created_at > now() - interval '14 days'
    and u.email !~* '(josephs?skaf|usekineo\.com|shortsforgeai|kineo)'
  group by e.user_id
)
select a.regime,
       count(*) as pessoas_na_parede,
       count(*) filter (where exists (select 1 from events o where o.user_id = a.user_id and o.name = 'conversion_offer_viewed'
                                      and o.metadata->>'offer_id' like '%\_monthly' and o.created_at >= a.t0)) as viram_mensal,
       count(*) filter (where exists (select 1 from events o where o.user_id = a.user_id and o.name = 'conversion_offer_viewed'
                                      and o.metadata->>'offer_id' like '%\_annual' and o.created_at >= a.t0)) as viram_anual,
       count(*) filter (where exists (select 1 from events c where c.user_id = a.user_id and c.name = 'checkout_started'
                                      and c.metadata->>'billing' = 'monthly' and c.created_at >= a.t0)) as checkout_mensal,
       count(*) filter (where exists (select 1 from events c where c.user_id = a.user_id and c.name = 'checkout_started'
                                      and c.metadata->>'billing' = 'annual' and c.created_at >= a.t0)) as checkout_anual,
       count(*) filter (where exists (select 1 from events s where s.user_id = a.user_id and s.name = 'payment_success'
                                      and s.metadata->>'intent_campaign' like 'mrr0610_v1_upgrade_%' and s.created_at >= a.t0)) as pagos_da_parede,
       count(*) filter (where exists (select 1 from events s where s.user_id = a.user_id and s.name = 'payment_success' and s.created_at >= a.t0)) as pagos_qualquer_caminho
from abriu a
group by a.regime
order by a.regime;

-- Régua (escrita antes do 1º dado): em 7 dias, mensal (novo) com ≥ 1 pago (qualquer caminho) depois da parede = mantém. 0 pagos com ≥ 15 pessoas na
-- parede = volta ao anual ('off') e o degrau passa a ser checkout → pago, não a aba.
