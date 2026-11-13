-- KINEO-IDEIA-VIAJA-1311 [CEO 13/11, dono 16:42: "as notas dos filmes que a gente dá de trial subam"]
-- Por dia (BRT), filmes grátis do Kling 4: quantos nasceram com a ideia do cliente e a nota do revisor neles.
--   · origem (evento film_idea_status, desde a publicação do KINEO-IDEIA-VIAJA-1311): tela = a tela mandou a ideia; recuperada = o servidor
--     a achou pelo começo do roteiro do escritor; ausente = sem ideia (roteiro colado, conector, "escrever o roteiro inteiro"…);
--     ideia_e_o_roteiro = a tela mandou o próprio roteiro como ideia (defeito de tela).
--   · par_do_escritor (vale também para os dias ANTES do evento): o roteiro despachado começa com o script_head de um script_written da pessoa
--     nas 6 h anteriores = o roteiro nasceu de uma ideia que a casa conhece.
--   · nota = film_review_notes (revisor), casada pelo render_id no link do vídeo.
-- Filme grátis do Kling 4 = juiz_plano_verdict com caminho 'kling4_gratis' (um por filme). Contas da casa não entram nesse caminho.
with k4 as (
  select user_id, metadata->>'generation_id' as g, created_at
  from events
  where name = 'juiz_plano_verdict' and metadata->>'caminho' = 'kling4_gratis' and metadata->>'dry_run' is distinct from 'true'
    and created_at > now() - interval '14 days'
),
claim as (
  select metadata->>'generation_id' as g, btrim(metadata->'response'->>'prompt') as p
  from events where name = 'cinematic_submission_claim' and created_at > now() - interval '15 days'
),
status as (
  select distinct on (metadata->>'generation_id') metadata->>'generation_id' as g, metadata->>'origem' as origem,
         (metadata->>'ideia_e_o_roteiro')::boolean as ideia_e_o_roteiro
  from events where name = 'film_idea_status' and created_at > now() - interval '15 days'
  order by metadata->>'generation_id', created_at desc
),
render as (
  select metadata->>'generation_id' as g, metadata->>'render_id' as render_id
  from events where name = 'compose_submission_claim' and created_at > now() - interval '15 days'
),
filme as (
  select k4.g, (k4.created_at at time zone 'America/Sao_Paulo')::date as dia, s.origem, s.ideia_e_o_roteiro,
    exists (
      select 1 from events w
      where w.user_id = k4.user_id and w.name = 'script_written'
        and w.created_at between k4.created_at - interval '6 hours' and k4.created_at
        and length(btrim(w.metadata->>'script_head')) >= 40
        and case when length(w.metadata->>'script_head') < 200 then btrim(w.metadata->>'script_head') = c.p
                 else left(c.p, length(btrim(w.metadata->>'script_head'))) = btrim(w.metadata->>'script_head') end
    ) as par_do_escritor,
    (select max(n.nota) from film_review_notes n where r.render_id is not null and n.link like '%' || r.render_id || '%') as nota
  from k4
  left join claim c on c.g = k4.g
  left join status s on s.g = k4.g
  left join render r on r.g = k4.g
)
select dia,
  count(*) as filmes,
  count(*) filter (where origem = 'tela') as ideia_da_tela,
  count(*) filter (where origem = 'recuperada') as ideia_recuperada,
  count(*) filter (where origem = 'ausente') as sem_ideia,
  count(*) filter (where origem is null) as sem_registro,          -- antes da publicação do evento
  count(*) filter (where ideia_e_o_roteiro) as tela_mandou_o_roteiro,
  count(*) filter (where par_do_escritor) as par_do_escritor,
  count(nota) as com_nota,
  round(avg(nota) filter (where origem in ('tela', 'recuperada')), 1) as nota_com_ideia,
  round(avg(nota) filter (where origem = 'ausente'), 1) as nota_sem_ideia,
  round(avg(nota), 1) as nota_media,
  count(*) filter (where nota >= 8) as nota_8_ou_mais
from filme
group by dia
order by dia desc;
