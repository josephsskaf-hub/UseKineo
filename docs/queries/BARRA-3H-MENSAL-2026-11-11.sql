-- KINEO-BARRA-3H-MENSAL-1111 — a barra das 3 h anuncia os 30% do 1º mês do MENSAL e leva ao /pricing sem billing (interruptor
-- KINEO_BARRA_3H_MENSAL_1111 em lib/billing/barra3hMensal1111.ts). Leitura em 7 dias.
-- Corte antes/depois = annual_welcome_bar_shown/_clicked.metadata.offer_version = 'barra_3h_mensal_1111' (ausente = a barra do anual,
-- de 04/11). NUNCA o relógio. Base (05/11 → 11/11, barra do anual): 136 viram · 4 clicaram · 2 checkouts com a oferta · 0 pagos.
with barra as (
  select e.user_id, min(e.created_at) as t0,
         coalesce(max(e.metadata->>'offer') filter (where e.metadata->>'offer_version' = 'barra_3h_mensal_1111'), 'annual_welcome_3h (antes)') as oferta
  from events e
  join auth.users u on u.id = e.user_id
  where e.name = 'annual_welcome_bar_shown'
    and e.created_at > now() - interval '14 days'
    and u.email !~* '(josephs?skaf|usekineo\.com|shortsforgeai|kineo)'
  group by e.user_id
)
select b.oferta,
       count(*) as viram,
       count(*) filter (where exists (select 1 from events c where c.user_id = b.user_id and c.name = 'annual_welcome_bar_clicked' and c.created_at >= b.t0)) as clicaram,
       count(*) filter (where exists (select 1 from events c where c.user_id = b.user_id and c.name = 'checkout_started' and c.created_at >= b.t0
                                      and (c.metadata->>'monthly_first_month_3h_applied' = 'true' or c.metadata ? 'annual_offer'))) as checkout_com_oferta,
       count(*) filter (where exists (select 1 from events c where c.user_id = b.user_id and c.name = 'checkout_started' and c.created_at >= b.t0
                                      and c.metadata->>'monthly_first_month_3h_applied' = 'true')) as checkout_mensal_30,
       count(*) filter (where exists (select 1 from events s where s.user_id = b.user_id and s.name = 'payment_success' and s.created_at >= b.t0)) as pagaram
from barra b
group by b.oferta
order by b.oferta;

-- Na parede (modal): quem estava nas 3 h e abriu checkout mensal com os 30% vindo da parede (intent_campaign mrr0610_v1_upgrade_*).
select count(distinct c.user_id) as checkout_mensal_30_da_parede,
       count(distinct s.user_id) as pagos_da_parede
from events c
left join events s on s.user_id = c.user_id and s.name = 'payment_success' and s.created_at >= c.created_at
where c.name = 'checkout_started' and c.created_at > now() - interval '14 days'
  and c.metadata->>'monthly_first_month_3h_applied' = 'true' and c.metadata->>'intent_campaign' like 'mrr0610_v1_upgrade_%';

-- Régua (escrita antes do 1º dado): em 7 dias, ≥ 1 pago vindo da barra no mensal = mantém. 0 pagos com ≥ 100 pessoas vendo a
-- barra nova = volta ao anual ('off') — e a pergunta passa a ser o preço, não a barra.
