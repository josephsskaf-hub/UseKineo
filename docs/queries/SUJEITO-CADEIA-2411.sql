-- KINEO-SUJEITO-CADEIA-2411 — por que o filme sai SEM sujeito lido (só SELECT). Lê o bloco cadeia_2411 de cinematic_required_subject
-- (só existe nos eventos gravados depois do deploy desta medida). Cliente × casa pela lista EXATA da casa (lib/internalAccounts.ts,
-- INTERNAL_EXACT_EMAILS). Gerações só pelos 8 primeiros caracteres. Último evento por geração; dry-run fora.

-- 1) Por dia, cliente × casa: filmes sem sujeito por MOTIVO.
--    leitor_nada_em_todos  = todo degrau tentado respondeu e o validador disse uso_none (o leitor não viu coisa física)
--    validador_descartou:<código> = algum degrau respondeu com uso literal e o validador descartou (o 1º código desses degraus)
--    leitura_falhou        = algum degrau não respondeu (prazo, 429…) e nenhum foi descartado pelo validador
--    nenhum_degrau_tentado = sem pedido confiável e sem fala para ler
with ev as (
  select distinct on (e.metadata->>'generation_id') e.metadata->>'generation_id' gen, e.user_id, e.created_at, e.metadata m
  from events e
  where e.name = 'cinematic_required_subject' and e.created_at > now() - interval '30 days'
    and coalesce(e.metadata->>'dry_run', 'false') <> 'true' and e.metadata ? 'cadeia_2411'
  order by e.metadata->>'generation_id', e.created_at desc),
j as (
  select ev.*, case when lower(coalesce(u.email, '')) in ('josephsskaf@gmail.com', 'josephskaf@hotmail.com', 'victoriaskaf96@gmail.com', 'joseph+teste01@gmail.com', 'teste01@shortsforgeai.com') then 'casa' else 'cliente' end quem
  from ev left join auth.users u on u.id = ev.user_id),
d as (
  select j.gen, j.quem, j.created_at, j.m, x.ord, x.deg
  from j cross join lateral jsonb_array_elements(coalesce(j.m->'cadeia_2411'->'degraus', '[]'::jsonb)) with ordinality as x(deg, ord)),
motivo as (
  select j.gen, j.quem, j.created_at::date dia,
    case
      when (j.m->'cadeia_2411'->>'erro')::boolean then 'erro_da_medida'
      when not exists (select 1 from d where d.gen = j.gen and (d.deg->>'tentou')::boolean) then 'nenhum_degrau_tentado'
      when exists (select 1 from d where d.gen = j.gen and (d.deg->>'respondeu')::boolean and d.deg->>'uso' = 'literal' and not (d.deg->>'aceito')::boolean)
        then 'validador_descartou:' || (select d.deg->>'motivo_do_descarte' from d where d.gen = j.gen and (d.deg->>'respondeu')::boolean and d.deg->>'uso' = 'literal' and not (d.deg->>'aceito')::boolean order by d.ord limit 1)
      when exists (select 1 from d where d.gen = j.gen and (d.deg->>'tentou')::boolean and not (d.deg->>'respondeu')::boolean) then 'leitura_falhou'
      when not exists (select 1 from d where d.gen = j.gen and (d.deg->>'respondeu')::boolean and coalesce(d.deg->>'uso', '') <> 'none') then 'leitor_nada_em_todos'
      else 'leitor_nao_literal:' || (select d.deg->>'uso' from d where d.gen = j.gen and (d.deg->>'respondeu')::boolean and d.deg->>'uso' <> 'none' order by d.ord limit 1)
    end motivo
  from j where j.m->>'sujeito' is null)
select dia, quem, motivo, count(*) filmes,
  (select count(*) from j j2 where j2.created_at::date = motivo.dia and j2.quem = motivo.quem) filmes_do_dia
from motivo group by dia, quem, motivo order by dia desc, quem, filmes desc;

-- 2) Degrau não tentado, por degrau (o que a cadeia nunca chegou a ler), cliente × casa.
with ev as (
  select distinct on (e.metadata->>'generation_id') e.metadata->>'generation_id' gen, e.user_id, e.metadata m
  from events e
  where e.name = 'cinematic_required_subject' and e.created_at > now() - interval '30 days'
    and coalesce(e.metadata->>'dry_run', 'false') <> 'true' and e.metadata ? 'cadeia_2411'
  order by e.metadata->>'generation_id', e.created_at desc)
select case when lower(coalesce(u.email, '')) in ('josephsskaf@gmail.com', 'josephskaf@hotmail.com', 'victoriaskaf96@gmail.com', 'joseph+teste01@gmail.com', 'teste01@shortsforgeai.com') then 'casa' else 'cliente' end quem,
  x.deg->>'degrau' degrau, (ev.m->>'sujeito' is null) sem_sujeito,
  count(*) filter (where not (x.deg->>'tentou')::boolean) nao_tentou,
  count(*) filter (where (x.deg->>'tentou')::boolean and not (x.deg->>'respondeu')::boolean) nao_respondeu,
  count(*) filter (where (x.deg->>'aceito')::boolean) aceito,
  count(*) filter (where (x.deg->>'respondeu')::boolean and not (x.deg->>'aceito')::boolean) descartado
from ev left join auth.users u on u.id = ev.user_id
cross join lateral jsonb_array_elements(coalesce(ev.m->'cadeia_2411'->'degraus', '[]'::jsonb)) x(deg)
group by 1, 2, 3 order by 1, 3 desc, 2;

-- 3) Lista para o revisor de vídeos: os descartados por visual_com_maiuscula, com o substantivo central (uma palavra comum) e o degrau.
--    Pergunta ao revisor: aquele era o sujeito certo do filme?
with ev as (
  select distinct on (e.metadata->>'generation_id') e.metadata->>'generation_id' gen, e.user_id, e.created_at, e.metadata m
  from events e
  where e.name = 'cinematic_required_subject' and e.created_at > now() - interval '30 days'
    and coalesce(e.metadata->>'dry_run', 'false') <> 'true' and e.metadata ? 'cadeia_2411'
  order by e.metadata->>'generation_id', e.created_at desc)
select ev.created_at::date dia, left(ev.gen, 8) geracao,
  case when lower(coalesce(u.email, '')) in ('josephsskaf@gmail.com', 'josephskaf@hotmail.com', 'victoriaskaf96@gmail.com', 'joseph+teste01@gmail.com', 'teste01@shortsforgeai.com') then 'casa' else 'cliente' end quem,
  ev.m->>'engine' motor, x.deg->>'degrau' degrau, x.deg->>'tipo' tipo, x.deg->>'substantivo_central' substantivo_central,
  (x.deg->>'palavras_do_visual')::int palavras_do_visual, (ev.m->>'sujeito' is not null) filme_teve_outro_sujeito
from ev left join auth.users u on u.id = ev.user_id
cross join lateral jsonb_array_elements(coalesce(ev.m->'cadeia_2411'->'degraus', '[]'::jsonb)) x(deg)
where x.deg->>'motivo_do_descarte' = 'visual_com_maiuscula'
order by dia desc, geracao;
