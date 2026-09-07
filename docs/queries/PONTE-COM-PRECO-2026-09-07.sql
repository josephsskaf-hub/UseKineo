-- ═══ PONTE COM PREÇO — tela de filme pronto · gpt-loja #13, 07/09/2026 ═════
--
-- POR QUE ESTE ARQUIVO: em 7 dias, 131 pessoas receberam um filme, 56 fizeram
-- um SEGUNDO filme e 19 viram um preço alguma vez. O degrau de oferta MAIS
-- LARGO daquela tela (`trial_balance_bridge`, 76 pessoas contra 7 do degrau de
-- assinatura) dizia "No card. No purchase." e não tinha caminho para /pricing.
-- A #13 pôs lá a mesma linha secundária que o degrau irmão já tinha.
--
-- ⚠ CORTE OBRIGATÓRIO NO DEPLOY. `trial_bridge_subscription_clicked` não
-- existe antes de 07/09 ~04:10 BRT (07:10Z) e `plans_link` não existe no
-- payload da impressão antes disso. Contar "últimos N dias" mistura a ponte
-- muda com a ponte com preço e não prova nada
-- (memória `zero-falhas-sem-denominador-nao-prova-conserto`).
-- Trocar a constante abaixo pelo horário real do deploy confirmado.

-- (1) A VERSÃO NOVA ESTÁ NO AR? `plans_link` é o marcador de deploy. Enquanto
--     `com_marcador` for 0 e `sem_marcador` subir, o que está servindo ainda é
--     o bundle antigo — e QUALQUER leitura de adoção abaixo é inválida.
select
  count(*) filter (where metadata->>'plans_link' = 'true')  com_marcador,
  count(*) filter (where metadata->>'plans_link' is null)   sem_marcador,
  count(distinct user_id) pessoas,
  min(created_at) primeira, max(created_at) ultima
from events
where name = 'trial_balance_bridge_viewed'
  and created_at > timestamptz '2026-09-07 07:10:00+00';

-- (2) A ADOÇÃO, com o denominador certo. O link é INCONDICIONAL dentro do
--     bloco, então quem viu a ponte na versão nova é exatamente quem teve a
--     oportunidade de clicar. Comparar impressão com impressão, nunca com
--     montagem (memória `peca-escrita-para-muitos-vista-por-poucos`).
with viu as (
  select distinct user_id from events
  where name = 'trial_balance_bridge_viewed'
    and metadata->>'plans_link' = 'true'
    and created_at > timestamptz '2026-09-07 07:10:00+00'
), clicou as (
  select distinct user_id from events
  where name = 'trial_bridge_subscription_clicked'
    and created_at > timestamptz '2026-09-07 07:10:00+00'
)
select count(*) viram_a_ponte_com_preco,
       count(*) filter (where clicou.user_id is not null) clicaram_em_ver_planos
from viu left join clicou on clicou.user_id = viu.user_id;

-- (3) O DEGRAU SECO INTEIRO, por pessoa. É o número que motivou a mudança e é
--     como se sabe se ela mexeu em alguma coisa. Rodar sobre a MESMA janela de
--     relógio de antes e depois, nunca "7 dias" contra "3 horas"
--     (memória `queda-de-trafego-medida-contra-hora-inflada`).
with vr as (select distinct user_id from events where name='video_ready_viewed' and created_at > now()-interval '7 days'),
     dl as (select distinct user_id from events where name='video_downloaded' and created_at > now()-interval '7 days'),
     seg as (select user_id from events where name='generate_started' and created_at > now()-interval '7 days' group by 1 having count(*) >= 2),
     pv as (select distinct user_id from events where name='pricing_view' and created_at > now()-interval '7 days'),
     ck as (select distinct user_id from events where name='checkout_started' and created_at > now()-interval '7 days'),
     pg as (select distinct user_id from events where name='payment_success' and created_at > now()-interval '7 days')
select count(*) recebeu_filme,
       count(*) filter (where dl.user_id is not null) baixou,
       count(*) filter (where seg.user_id is not null) fez_2o_filme,
       count(*) filter (where pv.user_id is not null) viu_preco,
       count(*) filter (where ck.user_id is not null) checkout,
       count(*) filter (where pg.user_id is not null) pagou
from vr left join dl on dl.user_id=vr.user_id left join seg on seg.user_id=vr.user_id
        left join pv on pv.user_id=vr.user_id left join ck on ck.user_id=vr.user_id
        left join pg on pg.user_id=vr.user_id;

-- (4) OS TRÊS DEGRAUS, lado a lado. Se a ponte encolher e o degrau de
--     assinatura crescer, alguém mexeu na escada — a leitura de (2) muda de
--     denominador junto e precisa ser refeita.
select name, count(distinct user_id) pessoas, max(created_at) ultimo
from events
where name in ('trial_balance_bridge_viewed','trial_repeat_episode_viewed','trial_post_video_offer_viewed',
               'trial_bridge_subscription_clicked','trial_repeat_subscription_clicked')
  and created_at > now() - interval '7 days'
group by 1 order by pessoas desc;

-- (5) A SEGUNDA CHANCE NÃO EXISTE — o número que justifica dizer o preço na
--     PRIMEIRA sessão. Medido em 07/09: 170 trials encerrados, 6 voltaram.
with d as (select user_id, min(created_at) t_down from events
           where name='trial_downgraded' and created_at > now()-interval '7 days' group by 1),
depois as (select distinct d.user_id from d join events e on e.user_id=d.user_id and e.created_at > d.t_down
           where e.name in ('generate_page_view','video_ready_viewed','pricing_view','homepage_view',
                            'studio_tiles_shown','landing_session_started','analyze_idea_clicked',
                            'generate_started','upgrade_modal_opened'))
select count(*) trial_encerrado,
       count(*) filter (where depois.user_id is not null) voltou_ao_site_depois
from d left join depois on depois.user_id = d.user_id;
