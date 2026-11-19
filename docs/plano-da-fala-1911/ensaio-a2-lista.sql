-- KINEO-DESCRITOR-FORTE-1911 · lista do ENSAIO DE TEXTO do A2 (dono 19/11: até US$ 3, só texto). Só SELECT. Roda no projeto cqqukkvjjrguayiyjvhh.
-- Uma linha por filme, na ordem do ensaio: com defeito (CENA_FORA_DO_PEDIDO ou FINAL_FRACO) primeiro — os SEM o molde da pista, depois os
-- COM o molde, depois os sem planos registrados (anteriores a 12/11) —, e por fim os BONS (nota ≥ 8) como controle.
-- Para cada linha, disparar UM POR VEZ na conta do fundador (o interruptor KLING4_DESCRITOR_FORTE_1911 em 'internal'):
--   POST /api/generate-video-cinematic  { prompt: <roteiro>, original_idea: <ideia>, script_mode: 'verbatim', dry_run: true, duration: 15,
--                                          quality: 'cinematic_ai', generationId: <uuid novo>, ... os mesmos campos do Studio para o filme grátis }
--   a resposta traz `a2_ensaio` (planos de hoje × novos, juiz por plano, reescrita, latência, tokens). O texto ENVIADO de verdade naquele dia
--   está em `planos_enviados` abaixo (cinematic_dispatch_result; vazio nos filmes de antes de 12/11).
with n as (
  select link, nota, defeitos from film_review_notes_com_motor
  where quando > timestamptz '2026-11-05' and quando < timestamptz '2026-11-20' and motor_real = 'kling4'
), g as (
  select c.session_id gen, max(n.nota) nota, bool_or('CENA_FORA_DO_PEDIDO' = any(n.defeitos) or 'FINAL_FRACO' = any(n.defeitos)) defeito
  from n join videos v on (v.video_url = n.link or v.final_video_url = n.link)
  join events c on c.name = 'compose_submission_claim' and c.metadata->>'render_id' = v.render_id
  group by c.session_id
), e as (
  select g.*, cl.user_id, cl.created_at quando, cl.metadata->'response'->>'prompt' roteiro,
    (select d.metadata from events d where d.name = 'cinematic_dispatch_result' and d.metadata->>'generation_id' = g.gen
       and d.metadata->>'engine' like 'kling/v4%' order by d.created_at desc limit 1) disp
  from g join kling4_trial_films f on f.job_id = g.gen and f.engine_used = 'kling4'
  join events cl on cl.name = 'cinematic_submission_claim' and cl.session_id = g.gen
)
select
  row_number() over (order by (case when defeito then 0 else 1 end),
    (case when (disp->'scene_plan')::text like '%Main subject of this shot:%' then 1 when jsonb_array_length(coalesce(disp->'scene_plan'->'scenes', '[]'::jsonb)) > 0 then 0 else 2 end), gen) ordem,
  gen, case when defeito then 'defeito' else 'bom' end grupo, nota,
  case when jsonb_array_length(coalesce(disp->'scene_plan'->'scenes', '[]'::jsonb)) = 0 then 'sem_registro'
       when (disp->'scene_plan')::text like '%Main subject of this shot:%' then 'com_molde' else 'sem_molde' end molde,
  roteiro,
  (select w.metadata->>'original_idea' from events w where w.name = 'script_written' and w.user_id = e.user_id and w.created_at <= e.quando
     and length(w.metadata->>'script_head') >= 40 and position(w.metadata->>'script_head' in roteiro) = 1 order by w.created_at desc limit 1) ideia,
  (select jsonb_agg(s->>'prompt' order by (s->>'i')::int) from jsonb_array_elements(coalesce(disp->'scene_plan'->'scenes', '[]'::jsonb)) s) planos_enviados
from e
where defeito or nota >= 8
order by ordem;
