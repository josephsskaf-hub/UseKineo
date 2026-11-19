-- KINEO-DESCRITOR-FORTE-1911 · 2º ensaio do A2 (CEO 19/11, teto US$ 1,50 aprovado pelo dono). SÓ SELECT. A mesma consulta do 1º (ensaio-a2-lista.sql),
-- só com os 39 pedidos: os 35 com defeito que tiveram a2_ensaio + os 4 bons que pioraram (47d66e48, 3505835b, b4de7d59, c968edac), e no FIM, se sobrar teto,
-- os 2 de descrição nula (42bcd59f, caed3456: o pedido de novo da seção nula). Ordem = a ordem da lista abaixo.
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
    cl.metadata->>'engine' motor_pedido, cl.metadata->'response'->>'language' lingua, -- [revisor 19/11] o ensaio manda o motor e a língua do pedido (roteiro em português medido em inglês = medida errada)
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
  roteiro, motor_pedido engine, lingua language,
  (select w.metadata->>'original_idea' from events w where w.name = 'script_written' and w.user_id = e.user_id and w.created_at <= e.quando
     and length(w.metadata->>'script_head') >= 40 and position(w.metadata->>'script_head' in roteiro) = 1 order by w.created_at desc limit 1) ideia,
  (select jsonb_agg(s->>'prompt' order by (s->>'i')::int) from jsonb_array_elements(coalesce(disp->'scene_plan'->'scenes', '[]'::jsonb)) s) planos_enviados
from e
where left(gen, 8) in ('876487b4','ce661ba1','0a00868b','224c4659','273c7774','44d02f20','55e4970b','62fc7ab6','7f92fe17','82a809d0','ac9bb8f8','b1ffe3ad','b9ddb528','c92b352b','03d002f3','193e4465','1c770cb7','2b22a93c','32c93ee3','373b8121','3eb34f6a','40543daf','4134e784','4eb0c0c9','61944992','76b00b37','804e9f0b','80d9a38d','98063aa2','bf8989ad','c827ec0d','d5f666ce','d8bfd93d','de85d652','f133c184','47d66e48','3505835b','b4de7d59','c968edac','42bcd59f','caed3456')
order by array_position(array['876487b4','ce661ba1','0a00868b','224c4659','273c7774','44d02f20','55e4970b','62fc7ab6','7f92fe17','82a809d0','ac9bb8f8','b1ffe3ad','b9ddb528','c92b352b','03d002f3','193e4465','1c770cb7','2b22a93c','32c93ee3','373b8121','3eb34f6a','40543daf','4134e784','4eb0c0c9','61944992','76b00b37','804e9f0b','80d9a38d','98063aa2','bf8989ad','c827ec0d','d5f666ce','d8bfd93d','de85d652','f133c184','47d66e48','3505835b','b4de7d59','c968edac','42bcd59f','caed3456'], left(gen, 8))
;
