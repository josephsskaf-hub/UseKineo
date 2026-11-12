-- KINEO-STUDIO-PREENCHIDO-1211 — o Studio chega preenchido com a ideia-exemplo da página de entrada. Leitura em 7 dias.
-- Corte antes/depois = o evento studio_prefilled_from_page (versão studio_preenchido_1211). NUNCA o relógio.
-- Base (30 dias até 11/11, cadastros externos, página = pouso do mesmo session_id): / 165 de 201 sem ideia · /ai-video-generator/seedance
-- 52 de 53 · /text-to-video-shorts 36 de 88 · /ai-ugc-ads 35 de 35 (anúncio: fica de fora) · quem chega COM ideia aparece no Studio
-- com ela em ~100% (studio_idea_arrived_v1). ChatGPT sem filme (Div. 3): 18% abrem o Studio e não digitam, 15% digitam e não geram.

-- 1) Por página: chegadas medidas, quantas já tinham ideia, quantas foram preenchidas, quantas geraram com a ideia da página
--    (editada ou não), e quantas tiveram filme pronto em 24 h.
with p as (
  select e.user_id, min(e.created_at) t0, max(e.metadata->>'page') pagina,
         bool_or((e.metadata->>'had_idea')::boolean) tinha_ideia, bool_or((e.metadata->>'prefilled')::boolean) preenchido
  from events e join auth.users u on u.id = e.user_id
  where e.name = 'studio_prefilled_from_page' and e.metadata->>'version' = 'studio_preenchido_1211'
    and u.email !~* '(josephs?skaf|usekineo\.com|shortsforgeai|kineo)'
  group by e.user_id
)
select coalesce(pagina, '(sem página)') pagina, count(*) chegadas,
  count(*) filter (where tinha_ideia) ja_tinha_ideia,
  count(*) filter (where preenchido) preenchidas,
  count(*) filter (where exists (select 1 from events g where g.user_id = p.user_id and g.name = 'studio_prefilled_generated')) geraram_com_a_ideia_da_pagina,
  count(*) filter (where exists (select 1 from events g where g.user_id = p.user_id and g.name = 'studio_prefilled_generated' and (g.metadata->>'edited')::boolean)) editaram_antes,
  count(*) filter (where exists (select 1 from videos v where v.user_id = p.user_id and v.status = 'completed' and v.created_at < p.t0 + interval '24 hours')) filme_em_24h
from p group by 1 order by 2 desc;

-- 2) Comparação: entre os preenchidos, % que gerou; entre os que chegaram vazios ANTES (mesmas páginas, 30 d antes do corte), % com
--    filme em 24 h. Régua (escrita antes do 1º dado): em 7 dias, ≥ 30 preenchidos e a taxa de filme em 24 h dos preenchidos ≥ a dos
--    vazios de antes = mantém. Taxa menor com ≥ 30 = desliga (KINEO_STUDIO_PREENCHIDO_1211 = 'off') e a pergunta vira a frase-exemplo.
