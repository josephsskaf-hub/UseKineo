-- ═══ TEMPORADA NA TELA DE FILME PRONTO — gpt-loja #12, 07/09/2026 ═══════════
--
-- POR QUE ESTE ARQUIVO: na tela de filme pronto (a mais movimentada da casa,
-- 131 pessoas em 7 dias) a faixa da temporada foi VISTA por 3. O meio era
-- ilegivel porque `season_written` e evento de ESCRITA, nao de entrega: quem ja
-- tem temporada gravada recebe a faixa e nao escreve nada. A rotacao #12
-- acrescentou `season_served` (a faixa recebeu temporada e renderizou) e
-- `season_absent` (a rota respondeu e nao havia faixa, com motivo e status).
--
-- COMO LER: a consulta (2) e a que decide qual conserto e o certo.
--   season_absent alto  → o problema e SERVIDOR (a rota nao devolve temporada).
--   season_served alto e season_shown baixo → o problema e ROLAGEM (a faixa
--   carrega e ninguem chega ate ela); o conserto e de POSICAO, nao de rota.
-- Antes do deploy de 07/09 ~03:00 BRT os dois eventos nao existem: contar
-- apenas a janela DEPOIS do deploy, nunca "ultimos N dias" (memoria
-- `zero-falhas-sem-denominador-nao-prova-conserto`).

-- (1) O degrau completo da tela, por pessoa. `next_shorts_*` e o CONTROLE:
--     mesma tela, mesmo IntersectionObserver, entao rolagem compara com
--     rolagem (memoria `peca-escrita-para-muitos-vista-por-poucos`).
select name, count(*) n, count(distinct user_id) pessoas, max(created_at) ultimo
from events
where created_at > now() - interval '7 days'
  and name in ('video_ready_viewed',
               'next_shorts_shown','next_shorts_seen','next_shorts_picked',
               'season_written','season_served','season_absent',
               'season_shown','season_plan_clicked')
group by 1
order by pessoas desc;

-- (2) A BIFURCACAO. So faz sentido depois do deploy da #12.
with tela as (select distinct user_id from events
              where name='video_ready_viewed' and created_at > timestamptz '2026-09-07 06:00:00+00'),
serv as (select distinct user_id from events
         where name='season_served' and created_at > timestamptz '2026-09-07 06:00:00+00'),
aus  as (select distinct user_id from events
         where name='season_absent' and created_at > timestamptz '2026-09-07 06:00:00+00'),
vis  as (select distinct user_id from events
         where name='season_shown' and created_at > timestamptz '2026-09-07 06:00:00+00')
select count(*) na_tela,
       count(*) filter (where serv.user_id is not null) faixa_carregou,
       count(*) filter (where aus.user_id  is not null) faixa_ausente,
       count(*) filter (where vis.user_id  is not null) faixa_vista
from tela
left join serv on serv.user_id = tela.user_id
left join aus  on aus.user_id  = tela.user_id
left join vis  on vis.user_id  = tela.user_id;

-- (3) Se for servidor: POR QUE a rota nao devolveu temporada.
select metadata->>'reason' motivo, metadata->>'http_status' http,
       count(*) n, count(distinct user_id) pessoas
from events
where name='season_absent' and created_at > timestamptz '2026-09-07 06:00:00+00'
group by 1,2 order by n desc;

-- (4) O `videoId` chega inteiro? `asked_video_id` e o id que a TELA pediu.
--     Nulo em massa = a tela nao sabe o id do filme; divergente do filme que a
--     temporada gravou = a rota ainda esta ignorando o pedido (PEDIDO aberto
--     para claude-aquisicao em docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md).
select count(*) servidas,
       count(*) filter (where metadata->>'asked_video_id' is not null) com_id,
       count(*) filter (where metadata->>'asked_video_id' is null) sem_id
from events
where name='season_served' and created_at > timestamptz '2026-09-07 06:00:00+00';

-- (5) O funil de dinheiro, para ancorar qualquer numero acima (7 dias).
--     Medido 07/09 04:50 UTC: 239 → 159 → 40 → 23 → 1.
with p as (select id from profiles where created_at > now() - interval '7 days'),
v as (select user_id, count(*) filmes from videos where status='completed' group by 1),
ev as (select user_id,
         max((name='checkout_started')::int) apertou_pagar,
         max((name='payment_success')::int)  pagou
       from events where user_id is not null and created_at > now() - interval '7 days' group by 1)
select count(*) cadastros,
       count(*) filter (where coalesce(v.filmes,0) >= 1) com_1_filme,
       count(*) filter (where coalesce(v.filmes,0) >= 2) com_2_filmes,
       count(*) filter (where ev.apertou_pagar = 1) apertou_pagar,
       count(*) filter (where ev.pagou = 1) pagou
from p left join v on v.user_id = p.id left join ev on ev.user_id = p.id;
