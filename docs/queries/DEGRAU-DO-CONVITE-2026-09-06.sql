-- ═══════════════════════════════════════════════════════════════════════════
-- O DEGRAU DO CONVITE — a métrica que define o negócio a partir de 06/09/2026
-- ═══════════════════════════════════════════════════════════════════════════
--
-- O QUE ESTA CONSULTA RESPONDE, e por que ela existe:
--
--   Em 14 dias a casa entregou **217 filmes prontos** e apenas **14 pessoas**
--   (6,5%) cruzaram uma superfície com PREÇO depois disso. Das que cruzaram,
--   **2 de 14 pagaram — 14%**. Ou seja: o checkout FECHA. O que não acontece é
--   o CONVITE. 199 de 217 pessoas receberam o produto e nunca foram
--   perguntadas.
--
--   Esse 6,5% é o degrau seco do negócio. Enquanto ele não subir, nenhum
--   trabalho de aquisição resolve: a 0,55% de conversão global, a meta de 10
--   pagantes/dia exigiria ~1.800 cadastros/dia (50× o tráfego de hoje).
--   Levando o 6,5% para 30% com os mesmos 15,4% de fechamento, seriam ~10
--   pagantes por quinzena COM O TRÁFEGO ATUAL.
--
-- ⚠️ TRÊS ARMADILHAS QUE ESTA CONSULTA JÁ EVITA — não "simplifique" nenhuma:
--
--   1. **Contar pessoa, não sessão.** A primeira versão do mapa de entrada
--      contava sessões e transformou UMA visitante com três abas em "3
--      cadastros e 3 pagamentos". Tudo aqui é `distinct` por pessoa.
--   2. **Exigir que o evento seja POSTERIOR ao filme.** Sem o `> f1`, entra
--      quem clicou em checkout ANTES de ter filme — que é 68% do tráfego de
--      checkout e converte 4,2× pior (3,7% contra 15,4%). Misturar os dois
--      esconde exatamente o que interessa.
--   3. **Superfície de preço é mais que o checkout.** Alguém pode ver a página
--      de preços e não clicar. As três (`pricing_view`, parede/modal,
--      `checkout_started`) são medidas separadas de propósito.

with pessoas as (
  select p.id
  from profiles p
  where p.created_at > now() - interval '14 days'
    and p.email not ilike '%josephsskaf%'          -- conta interna fora
),
-- Uma linha por pessoa, com a data do PRIMEIRO filme concluído dela.
com_filme as (
  select pe.id, min(v.created_at) as f1
  from pessoas pe
  join videos v on v.user_id = pe.id and v.status = 'completed'
  group by pe.id
)
select
  (select count(*) from pessoas)    as cadastros,
  (select count(*) from com_filme)  as filme_pronto,

  -- viu a página de preços DEPOIS de ter o filme
  (select count(*) from com_filme cf
    where exists (select 1 from events e
                   where e.user_id = cf.id and e.name = 'pricing_view'
                     and e.created_at > cf.f1))                     as viu_precos,

  -- bateu numa parede/modal de upgrade DEPOIS do filme
  (select count(*) from com_filme cf
    where exists (select 1 from events e
                   where e.user_id = cf.id
                     and e.name in ('upgrade_modal_opened','limit_purchase_fit_viewed','free_limit_wall_shown')
                     and e.created_at > cf.f1))                     as viu_parede,

  -- abriu checkout DEPOIS do filme  ← ESTE É O DEGRAU SECO
  (select count(*) from com_filme cf
    where exists (select 1 from events e
                   where e.user_id = cf.id and e.name = 'checkout_started'
                     and e.created_at > cf.f1))                     as checkout_apos_filme,

  (select count(*) from com_filme cf
    where exists (select 1 from events e
                   where e.user_id = cf.id and e.name = 'payment_success')) as pagou;

-- ═══════════════════════════════════════════════════════════════════════════
-- IRMÃ 1 — o checkout segmentado. Implementa a ordem do fundador de 02/09:
-- "contar separado de checkout de quem já entregou vídeo".
-- Resultado em 06/09: já tinha filme 13 pessoas → 2 pagaram (15,4%);
--                     ainda sem filme        27 pessoas → 1 pagou  (3,7%).
-- 68% do tráfego de checkout nunca viu o produto funcionar.
-- ⚠️ NÃO derive daqui "bloquear checkout de quem não tem filme": o limite K1
-- do ciclo é explícito — quem quer comprar avança sem filme. Isto é régua de
-- MEDIÇÃO, nunca de bloqueio.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- with ck as (
--   select e.user_id, min(e.created_at) primeiro_checkout
--     from events e
--    where e.name = 'checkout_started' and e.created_at > now() - interval '14 days'
--    group by e.user_id)
-- select case when exists (select 1 from videos v
--                           where v.user_id = ck.user_id and v.status = 'completed'
--                             and v.created_at < ck.primeiro_checkout)
--             then 'ja tinha filme' else 'sem filme ainda' end          segmento,
--        count(*)                                                       pessoas,
--        count(*) filter (where exists (select 1 from events e2
--                                        where e2.user_id = ck.user_id
--                                          and e2.name = 'payment_success')) pagaram
--   from ck group by 1;
--
-- ═══════════════════════════════════════════════════════════════════════════
-- IRMÃ 2 — onde o convite funciona. Medido em 7 dias (06/09):
--   e-mail (episode_link_clicked)     118 alcançados →  1 clicou =  0,8%
--   tela   (series_continue_clicked)   93 viram      → 22 clicaram = 24%
-- Trinta vezes. Por isso a fila é: caixa na TELA primeiro, e-mail novo nunca.
-- ⚠️ "recebeu" não é "viu" — não medimos abertura de e-mail. A comparação
-- honesta é resultado POR PESSOA ALCANÇADA, que é o que decide investimento.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- select
--   (select count(distinct user_id) from events
--     where name='video_ready_email_sent'   and created_at > now()-interval '7 days') email_alcancou,
--   (select count(distinct user_id) from events
--     where name='episode_link_clicked'     and created_at > now()-interval '7 days') email_clicou,
--   (select count(distinct user_id) from events
--     where name='series_continue_seen'     and created_at > now()-interval '7 days') tela_viu,
--   (select count(distinct user_id) from events
--     where name='series_continue_clicked'  and created_at > now()-interval '7 days') tela_clicou;
