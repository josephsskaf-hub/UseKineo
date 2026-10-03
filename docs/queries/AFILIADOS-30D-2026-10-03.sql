-- KINEO-AFILIADOS-ATRIBUICAO-2026-10-03 — placar de afiliados dos últimos 30 dias (só SELECT).
-- Conta da casa fora pelo e-mail do afiliado (domínios do fundador). Robôs fora pela mesma forma de
-- lib/affiliateDestinations.ts isAffiliatePreviewBot (os cliques antigos de robô ainda estão na tabela).
-- Medido em 03/10 12h UTC: 22 afiliados ativos · 9 novos · 9 com ≥1 clique · 60 cliques (18 de robô, 42 humanos,
-- 20 deles de um único afiliado) · 0 cadastros atribuídos · 0 pagamentos atribuídos · 0 perfis carimbados ·
-- 0 checkouts com affiliate_system=custom. A única comissão da história é o teste da casa (09-10/09, BRL, anulada).

with a as (
  select * from affiliates
  where not (email ilike '%josephsskaf%' or email ilike '%usekineo%' or email ilike '%shortsforge%')
),
c as (
  select c.* from affiliate_clicks c join a on a.id = c.affiliate_id
  where c.created_at > now() - interval '30 days'
)
select
  (select count(*) from a where status = 'active')                                             as afiliados_ativos,
  (select count(*) from a where created_at > now() - interval '30 days')                       as afiliados_novos_30d,
  (select count(distinct affiliate_id) from c)                                                 as afiliados_com_clique_30d,
  (select count(*) from c)                                                                     as cliques_30d,
  (select count(*) from c where user_agent ~* '([a-z]bot[/;)0-9]|bytespider|crawler|spider|headlesschrome)') as cliques_robo_30d,
  (select count(*) from affiliate_referrals r join a on a.id = r.affiliate_id
     where r.first_touch_at > now() - interval '30 days')                                      as cadastros_atribuidos_30d,
  (select count(*) from affiliate_commissions m join a on a.id = m.affiliate_id
     where m.created_at > now() - interval '30 days')                                          as pagamentos_atribuidos_30d,
  (select count(*) from profiles p where p.affiliate_id in (select id from a))                 as perfis_carimbados,
  (select count(*) from events where name = 'affiliate_signup_attribution_result'
     and created_at > now() - interval '30 days')                                              as finalizacoes_cadastro_30d;

-- Prova de que não há cadastro perdido no meio: sessões que abriram até 20 s depois de um clique humano
-- e que algum dia tiveram usuário logado — todas eram o PRÓPRIO dono do link ou conta antiga (resultado 03/10: 5 = 4 donos + 1 antiga).
with c as (
  select c.created_at t, a.user_id owner from affiliate_clicks c join affiliates a on a.id = c.affiliate_id
  where not (a.email ilike '%josephsskaf%' or a.email ilike '%usekineo%' or a.email ilike '%shortsforge%')
    and c.created_at > now() - interval '30 days'
    and c.user_agent !~* '([a-z]bot[/;)0-9]|bytespider|crawler|spider|headlesschrome)'
),
fs as (
  select session_id, min(created_at) f, max(user_id::text) uid from events
  where created_at > now() - interval '31 days' and session_id is not null
  group by 1 having bool_or(user_id is not null)
)
select (fs.uid = c.owner::text) as e_o_dono, round(extract(epoch from (u.created_at - c.t)) / 3600) as horas_conta_menos_clique
from c join fs on fs.f between c.t and c.t + interval '20 s' join auth.users u on u.id::text = fs.uid;
