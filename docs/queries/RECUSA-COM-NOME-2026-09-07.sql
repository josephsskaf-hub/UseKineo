-- ═══════════════════════════════════════════════════════════════════════════
-- RECUSA COM NOME — consultas do ciclo de pagamentos de 07/09/2026
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ O CORTE ANTES/DEPOIS É O CAMPO NOVO, NUNCA O RELÓGIO.
-- `metadata ? 'identity_source'` só existe em evento escrito pelo código de
-- 07/09 (SHA 8f7c1084). Filtrar por `created_at > '...'` inventa defeito: um
-- webhook re-tentado pela Stripe pode gravar depois do corte com código velho,
-- e um evento do código novo pode chegar antes de o deploy propagar em todas as
-- regiões. O campo é o carimbo; a hora não é.

-- ───────────────────────────────────────────────────────────────────────────
-- (1) A PERGUNTA DO CICLO: a recusa passou a ter dono?
--     Alvo: `sem_dono` = 0 na linha `initial` do bloco DEPOIS.
--     Estado no marco (07/09 15:38Z): antes = 3 recusas, 1 inicial sem dono.
-- ───────────────────────────────────────────────────────────────────────────
select
  case when metadata ? 'identity_source' then 'depois (codigo novo)'
       else 'antes (codigo de 03/09)' end as codigo,
  coalesce(metadata->>'stage', 'sem_stage')               as estagio,
  count(*)                                                as recusas,
  count(*) filter (where user_id is null)                 as sem_dono,
  count(*) filter (where metadata->>'owner_resolved' = 'false') as marcado_sem_dono,
  count(distinct user_id)                                 as pessoas
from events
where name = 'checkout_payment_failed'
group by 1, 2
order by 1 desc, 2;

-- ───────────────────────────────────────────────────────────────────────────
-- (2) POR ONDE O NOME APARECEU. `customer_email` é INFERÊNCIA (dois cadastros
--     com o mesmo e-mail) — os outros degraus são fato, porque o id é a
--     etiqueta que NÓS carimbamos na criação. Quem for mandar carta trata os
--     dois casos diferente.
-- ───────────────────────────────────────────────────────────────────────────
select
  metadata->>'identity_source'  as fonte_do_nome,
  metadata->>'stage'            as estagio,
  count(*)                      as recusas,
  count(*) filter (where user_id is not null) as com_user_id
from events
where name = 'checkout_payment_failed' and metadata ? 'identity_source'
group by 1, 2
order by 3 desc;

-- ───────────────────────────────────────────────────────────────────────────
-- (3) RECUSA POR PAÍS E POR MOTIVO — o número que decide trilho de pagamento.
--     `ip_country` (de onde a pessoa acessou) e `card_country` (onde o cartão
--     foi emitido) ficam LADO A LADO de propósito: eles discordam exatamente
--     no caso que interessa, cartão estrangeiro usado de dentro da Índia.
-- ───────────────────────────────────────────────────────────────────────────
select
  coalesce(metadata->>'ip_country', '?')   as pais_do_acesso,
  coalesce(metadata->>'card_country', '?') as pais_do_cartao,
  metadata->>'card_funding'                as tipo_de_cartao,
  metadata->>'reason_category'             as motivo,
  metadata->>'stage'                       as estagio,
  count(*)                                 as recusas
from events
where name = 'checkout_payment_failed'
group by 1, 2, 3, 4, 5
order by 6 desc;

-- ───────────────────────────────────────────────────────────────────────────
-- (4) A COORTE DA CARTA: recusa de COMPRA INICIAL, com dono, que nunca pagou.
--     Renovação NÃO entra — quem já é cliente com cartão vencendo recebe a
--     régua de cobrança da Stripe, não uma carta de "tente outro cartão".
-- ───────────────────────────────────────────────────────────────────────────
select f.created_at, p.email, p.plan, p.video_credits,
  f.metadata->>'reason_category' as motivo,
  f.metadata->>'card_funding'    as tipo_de_cartao,
  f.metadata->>'ip_country'      as pais,
  f.metadata->>'tier'            as plano_tentado,
  (f.metadata->>'amount_minor')::numeric / 100 as valor,
  f.metadata->>'identity_source' as fonte_do_nome,
  (select count(*) from videos v where v.user_id = p.id and v.status = 'completed') as filmes,
  (select count(*) from events x
     where x.user_id = p.id and x.name = 'card_declined_emailed_v1') as ja_recebeu_carta
from events f
join profiles p on p.id = f.user_id
where f.name = 'checkout_payment_failed'
  and f.metadata->>'stage' = 'initial'
  and not exists (select 1 from events s where s.user_id = p.id and s.name = 'payment_success')
order by f.created_at desc;

-- ───────────────────────────────────────────────────────────────────────────
-- (5) A RECUSA ANÔNIMA DE 07/09, ACHADA POR CORRELAÇÃO — e o método, para
--     quando o campo novo ainda não existia. Só serve com UMA tentativa na
--     janela: duas pessoas no mesmo minuto tornam a correlação um chute.
-- ───────────────────────────────────────────────────────────────────────────
select e.created_at, e.name, e.user_id, p.email, e.metadata->>'tier' as tier
from events e
left join profiles p on p.id = e.user_id
where e.created_at between '2026-09-07 04:40+00' and '2026-09-07 06:30+00'
  and e.name like 'checkout%'
order by e.created_at;
-- Resultado em 07/09: um único checkout na janela — egotisticalfr@gmail.com
-- (938c682b), conta criada 05:32:09, checkout 2 SEGUNDOS depois, recusa
-- 05:35:06, zero filmes, 25 créditos intactos, nenhum evento desde então.

-- ───────────────────────────────────────────────────────────────────────────
-- (6) PLACAR POR PAÍS DO CICLO: chegou ao checkout × pagou, por pessoa.
--     Por PESSOA e não por evento: uma pessoa que tenta 3 vezes é 1 no
--     numerador, não 3 — e a #22 de 06/09 já mostrou que o funil agregado
--     esconde o degrau seco.
-- ───────────────────────────────────────────────────────────────────────────
with pais_por_pessoa as (
  select user_id, mode() within group (order by metadata->>'ip_country') as pais
  from events
  where created_at > now() - interval '30 days'
    and user_id is not null and metadata->>'ip_country' is not null
  group by user_id
)
select pp.pais,
  count(distinct pp.user_id) as pessoas,
  count(distinct pp.user_id) filter (
    where exists (select 1 from videos v where v.user_id = pp.user_id and v.status = 'completed')
  ) as com_filme,
  count(distinct pp.user_id) filter (
    where exists (select 1 from events x where x.user_id = pp.user_id
                    and x.name in ('checkout_started', 'checkout_attempted')
                    and x.created_at > now() - interval '30 days')
  ) as chegou_ao_checkout,
  count(distinct pp.user_id) filter (
    where exists (select 1 from events x where x.user_id = pp.user_id and x.name = 'payment_success')
  ) as pagou
from pais_por_pessoa pp
group by pp.pais
having count(distinct pp.user_id) >= 3
order by chegou_ao_checkout desc;
