-- SONDA DO PROGRAMA DE AFILIADOS — clique → cookie → cadastro → pagamento → comissão no painel
-- (AF-09, 09/09/2026). Leitura só. Rodar depois do clique de teste do fundador.
-- Código do afiliado de teste = o do próprio fundador (5ENEDG6F, ativo, 30%).
-- A conta que CLICA e PAGA tem de ser NOVA (autoindicação é recusada por user_id).

-- 1) O clique: uma linha em affiliate_clicks para o código, no horário do teste.
select 'clique' etapa, c.id::text prova, c.created_at, c.landing_path, left(c.ip_hash, 8) ip
from affiliate_clicks c join affiliates a on a.id = c.affiliate_id
where a.code = '5ENEDG6F' and c.created_at > now() - interval '6 hours'
order by c.created_at desc limit 5;

-- 2) O cadastro atribuído: uma linha em affiliate_referrals (status 'signup' → 'paid' depois do pagamento)
--    e o carimbo profiles.affiliate_id na conta nova.
select 'referral' etapa, r.id::text prova, r.status, r.first_touch_at, r.converted_at, r.email,
       (p.affiliate_id = r.affiliate_id) perfil_carimbado, p.created_at conta_criada
from affiliate_referrals r join affiliates a on a.id = r.affiliate_id
left join profiles p on p.id = r.referred_user_id
where a.code = '5ENEDG6F' and r.first_touch_at > now() - interval '6 hours';

-- 3) O pagamento: payment_success da conta nova.
select 'pagamento' etapa, e.created_at, e.metadata->>'tier' tier, e.metadata->>'amount' valor, e.metadata->>'kind' tipo
from events e
where e.name = 'payment_success' and e.created_at > now() - interval '6 hours'
  and e.user_id in (select referred_user_id from affiliate_referrals r join affiliates a on a.id = r.affiliate_id where a.code = '5ENEDG6F');

-- 4) A comissão: uma linha em affiliate_commissions (pending, 30% do bruto; Starter $9,90 → 297 centavos).
select 'comissao' etapa, m.id::text prova, m.type, m.amount_gross, m.commission_amount, m.status, m.period, m.created_at
from affiliate_commissions m join affiliates a on a.id = m.affiliate_id
where a.code = '5ENEDG6F' and m.created_at > now() - interval '6 hours';

-- 5) O painel: o que /api/affiliate/me devolve ao fundador (mesma conta das tabelas acima).
select 'painel' etapa,
  (select count(*) from affiliate_clicks c join affiliates a on a.id = c.affiliate_id where a.code = '5ENEDG6F') cliques,
  (select count(*) from affiliate_referrals r join affiliates a on a.id = r.affiliate_id where a.code = '5ENEDG6F') cadastros,
  (select count(*) from affiliate_referrals r join affiliates a on a.id = r.affiliate_id where a.code = '5ENEDG6F' and r.status = 'paid') pagantes,
  (select coalesce(sum(commission_amount), 0) from affiliate_commissions m join affiliates a on a.id = m.affiliate_id where a.code = '5ENEDG6F' and m.status = 'pending') pendente_centavos;

-- Se a etapa 2 vier vazia com a etapa 1 cheia: o cookie sf_aff_click não chegou ao cadastro
-- (navegador bloqueou cookie, ou o cadastro foi feito noutro navegador/aba anônima diferente).
-- Se a etapa 4 vier vazia com a 3 cheia: o webhook não achou profiles.affiliate_id — defeito de código.
