-- data/ai-video-index/2026-10.sql — KINEO-INDICE-VIDEO-IA-2026-10-06 (v2: decisão da sessão CEO de 06/10 antes de publicar)
-- A consulta que GEROU data/ai-video-index/2026-10.json (a saída dela foi gravada verbatim no JSON).
-- Rodada em 07/10/2026 UTC no projeto cqqukkvjjrguayiyjvhh, SÓ SELECT (nenhuma escrita).
--
-- O QUE A V2 MUDOU (o JSON é público por tabela: a página, o llms.txt e o sitemap leem dele):
--   1. SEM VOLUME ABSOLUTO na saída: nenhuma contagem de filmes, pedidos, pessoas ou participação de uso. O tamanho da
--      amostra sai SÓ como faixa ("100+", "10-99", "<10"). As contagens existem aqui dentro, nas CTEs, e não saem.
--   2. CONFIABILIDADE no lugar de "taxa de entrega": entregues ÷ (entregues + falhas com erro registrado), SÓ entre
--      renders que começaram de fato (pelo menos uma cena enviada ao modelo, ou filme entregue). Fica de fora: o pedido
--      barrado antes de renderizar (checagem da conta — plano, cota, saldo — e as checagens de roteiro/duração da casa,
--      e erro de servidor antes da 1ª cena), porque nenhum motor renderizou; e o render sem desfecho registrado, porque
--      desconhecido não vira falha. Se o desconhecido passar de 20% dos renders do motor, pct sai null ("not enough data").
--   3. KINEO 1 FORA: é montagem de banco de imagens, não motor gerativo; nenhum número dele sai daqui.
--   4. Motor com menos de 10 filmes de CLIENTE com tempo medido não ganha bloco de cliente nem taxa nenhuma: aparece só
--      pelos renders de teste da casa (tempo até o filme pronto e duração), que a página rotula "indicative".
--
-- COMO FAZER A EDIÇÃO DO MÊS QUE VEM (ex.: 2026-11):
--   1. copiar este arquivo para data/ai-video-index/2026-11.sql;
--   2. trocar só o bloco `params` (edição + janela de 30 dias, em UTC) e as notas de disponibilidade em `engines`;
--   3. conferir a lista de contas da casa abaixo contra lib/internalAccounts.ts (o guardião
--      scripts/test-indice-video-ia-2026-10-06.mjs reprova se divergir);
--   4. rodar a consulta (só SELECT) e gravar a saída, sem editar número nenhum, em data/ai-video-index/2026-11.json;
--   5. apontar lib/seo/aiVideoIndexEdition.ts para o JSON novo e atualizar o espelho lib/seo/aiVideoIndexHeadline.ts
--      (o guardião exige a edição mais nova e o espelho igual à manchete do JSON).
--
-- O QUE CADA NÚMERO MEDE (a página repete isto em inglês, na metodologia):
--   · durationSeconds .. mediana de videos.duration do filme entregue na janela (bate com o cabeçalho do MP4 — mvhd,
--                         evento render_delivered_measured — com diferença ≤ 1 s em 100% dos filmes que têm as duas).
--   · minutesToFilm .... mediana e p90 do 1º registro de SERVIDOR do pedido (min de generation_attempt_opened sem dry_run
--                         e generation_dispatch_received do mesmo generation_id) até o filme salvo na biblioteca
--                         (videos.created_at), ligados por compose_submission_claim (generation_id → render_id). Sem
--                         ninguém olhando a tela, o cron finish-stranded-renders (a cada 5 min) salva o filme: até ~5 min.
--   · reliability ...... coorte de pedidos com início na janela (generation_id distintos de generation_attempt_opened sem
--                         dry_run); "começou" = alguma cinematic_dispatch_result com attempted > 0, ou filme entregue;
--                         falha registrada = generation_stage_error / video_generation_failed / generate_failed /
--                         credits_refunded do generation_id, ou dispatch com cena rejeitada ou HTTP 5xx.
--   · coherence ........ última nota da versão vigente do juiz (fast_coherence, version='k1_coerencia_v5_honesto',
--                         lib/fastCoherence.ts) por filme entregue; offPct = % abaixo de 50 (veredito 'off').
--   · house ............ as mesmas medidas de tempo e duração para as contas da casa — SEPARADAS, nunca somadas.
--
-- PRIVACIDADE: a saída só tem medianas, percentis, médias, percentuais e faixas de amostra por motor. Nenhum e-mail,
-- id, prompt ou texto de cliente sai daqui (o guardião varre o JSON). A lista de e-mails abaixo é o FILTRO das contas da
-- casa (espelho de lib/internalAccounts.ts), não um dado publicado.
with params as (
  select '2026-10'::text                             as edition,
         timestamptz '2026-09-07 00:00:00+00'        as window_start,
         timestamptz '2026-10-07 00:00:00+00'        as window_end
),
-- motor público gerativo ↔ quality_mode do banco ↔ chave de generation_attempt_opened (1:1, conferido em 07/10).
-- window_note = disponibilidade do motor DENTRO da janela (fonte: comentários datados de lib/engineLaunch.ts).
engines (ord, quality_mode, attempt_engine, engine, window_note) as (
  values
    (1, 'cinematic_ai',        'seedance',  'Seedance 1.5', null),
    (2, 'cinematic_kling',     'kling',     'Kling 2.5',    null),
    (3, 'cinematic_veo',       'veo',       'Veo 3.1',      null),
    (4, 'cinematic_hollywood', 'hollywood', 'Kling 3',      null),
    (5, 'cinematic_h3',        'h3',        'MiniMax H3',   'Paused for new films from 2026-09-15 to 2026-09-22.'),
    (6, 'cinematic_s25',       's25',       'Seedance 2.5', 'House-only until 2026-09-15, paused until 2026-10-06, then reopened for paid plans only.'),
    (7, 'cinematic_omni',      'omni',      'Omni Flash',   'Paused for maintenance since 2026-09-15.')
),
-- faixas de amostra: a única forma em que o tamanho da amostra sai daqui
bands (lo, hi, label) as (
  values (100, 2147483647, '100+'), (10, 99, '10-99'), (1, 9, '<10')
),
-- contas da casa = espelho EXATO de lib/internalAccounts.ts (INTERNAL_EXACT_EMAILS + INTERNAL_LIKE_PATTERNS).
-- Dono sem perfil conta como cliente (isInternalEmail(null) = false), igual a lib/engineBenchmarkStats.
internal_ids as (
  select pr.id from public.profiles pr
  where lower(pr.email) in ('josephsskaf@gmail.com', 'josephskaf@hotmail.com', 'victoriaskaf96@gmail.com', 'joseph+teste01@gmail.com', 'teste01@shortsforgeai.com')
     or lower(pr.email) like 'josephsskaf+%@gmail.com'
     or lower(pr.email) like 'joseph+%@gmail.com'
     or lower(pr.email) like 'joseph+%'
     or lower(pr.email) like 'victoriaskaf%'
     or lower(pr.email) like '%@theresanaiforthat.com'
     or lower(pr.email) like 'josephsskaf%'
     or lower(pr.email) like 'josephskaf%'
     or lower(pr.email) like '%@shortsforgeai.com'
     or lower(pr.email) like 'test%'
     or lower(pr.email) like '%mailinator%'
     or lower(pr.email) like 'smoketest%'
),
-- ── filmes entregues na janela (só motores gerativos) ─────────────────────────────────────────────────────────────
films as (
  select v.id, v.user_id, v.quality_mode, v.duration, v.render_id, v.created_at as ready_at,
         exists (select 1 from internal_ids i where i.id = v.user_id) as house
  from public.videos v, params p
  where v.status = 'completed'
    and v.created_at >= p.window_start and v.created_at < p.window_end
    and v.quality_mode in (select quality_mode from engines)
),
claims as (
  select distinct on (e.metadata->>'render_id')
         e.metadata->>'render_id' as render_id, e.metadata->>'generation_id' as generation_id
  from public.events e, params p
  where e.name = 'compose_submission_claim'
    and e.created_at >= p.window_start - interval '2 days'
    and e.metadata->>'render_id' is not null
  order by e.metadata->>'render_id', e.created_at
),
films_timed as (
  select f.*,
    (select min(e.created_at) from public.events e
       where e.created_at >= (select window_start from params) - interval '2 days'
         and ((e.name = 'generation_attempt_opened' and e.session_id = c.generation_id
               and coalesce(e.metadata->>'dry_run', 'false') <> 'true')
           or (e.name = 'generation_dispatch_received' and e.metadata->>'generation_id' = c.generation_id))) as t0
  from films f
  left join claims c on c.render_id = f.render_id
),
film_stats as (
  select quality_mode, house,
    count(*) filter (where duration > 0) as duration_n,
    round((percentile_cont(0.5) within group (order by duration) filter (where duration > 0))::numeric, 1) as duration_median,
    count(t0) as time_n,
    round((percentile_cont(0.5) within group (order by extract(epoch from (ready_at - t0))) filter (where t0 is not null) / 60)::numeric, 1) as minutes_median,
    round((percentile_cont(0.9) within group (order by extract(epoch from (ready_at - t0))) filter (where t0 is not null) / 60)::numeric, 1) as minutes_p90
  from films_timed
  group by 1, 2
),
-- ── nota de coerência (juiz v5) dos filmes entregues ────────────────────────────────────────────────────────────
scores as (
  select distinct on (e.metadata->>'video_id') e.metadata->>'video_id' as video_id, (e.metadata->>'score')::numeric as score
  from public.events e
  where e.name = 'fast_coherence'
    and e.metadata->>'version' = 'k1_coerencia_v5_honesto'
    and e.metadata->>'video_id' in (select id::text from films)
  order by e.metadata->>'video_id', e.created_at desc
),
coherence_stats as (
  select f.quality_mode, f.house, count(s.score) as n, round(avg(s.score), 1) as mean,
         round(100.0 * count(*) filter (where s.score < 50) / nullif(count(s.score), 0), 1) as off_pct
  from films f
  join scores s on s.video_id = f.id::text
  group by 1, 2
),
-- ── confiabilidade: só renders que começaram de fato (coorte: início na janela) ──────────────────────────────────
gen_requests as (
  select e.session_id as generation_id, min(e.metadata->>'engine') as attempt_engine, min(e.created_at) as t0,
         min(e.user_id::text)::uuid as user_id
  from public.events e, params p
  where e.name = 'generation_attempt_opened'
    and coalesce(e.metadata->>'dry_run', 'false') <> 'true'
    and e.created_at >= p.window_start - interval '1 day' and e.created_at < p.window_end
  group by 1
),
gen_outcomes as (
  select en.quality_mode,
    exists (select 1 from internal_ids i where i.id = r.user_id) as house,
    exists (select 1 from public.events c
              join public.videos v on v.render_id = c.metadata->>'render_id' and v.status = 'completed'
             where c.name = 'compose_submission_claim' and c.metadata->>'generation_id' = r.generation_id) as delivered,
    coalesce((select max(coalesce((d.metadata->>'attempted')::int, 0)) from public.events d
               where d.name = 'cinematic_dispatch_result' and d.metadata->>'generation_id' = r.generation_id), 0) as max_attempted,
    exists (select 1 from public.events x
             where x.name in ('generation_stage_error', 'video_generation_failed', 'generate_failed', 'credits_refunded')
               and (x.session_id = r.generation_id or x.metadata->>'generation_id' = r.generation_id))
    or exists (select 1 from public.events d
             where d.name = 'cinematic_dispatch_result' and d.metadata->>'generation_id' = r.generation_id
               and (coalesce((d.metadata->>'rejected')::int, 0) > 0 or coalesce(d.metadata->>'app_http_status', '') ~ '^5[0-9][0-9]$')) as failure_recorded
  from gen_requests r
  join engines en on en.attempt_engine = r.attempt_engine
  cross join params p
  where r.t0 >= p.window_start and r.t0 < p.window_end
),
reliability_stats as (
  select quality_mode, house,
    count(*) filter (where max_attempted > 0 or delivered) as started,
    count(*) filter (where delivered) as delivered,
    count(*) filter (where (max_attempted > 0) and not delivered and failure_recorded) as failed,
    count(*) filter (where (max_attempted > 0) and not delivered and not failure_recorded) as unknown
  from gen_outcomes
  group by 1, 2
)
-- ── o documento: uma linha, o JSON que vai para data/ai-video-index/<edição>.json — sem contagem nenhuma ──────────
select jsonb_pretty(jsonb_build_object(
  'schema', 'kineo-ai-video-index/2',
  'edition', p.edition,
  'measuredAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'window', jsonb_build_object(
    'start', to_char(p.window_start at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'end', to_char(p.window_end at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'days', extract(day from (p.window_end - p.window_start))::int
  ),
  'engines', (
    select jsonb_agg(jsonb_build_object(
      'qualityMode', en.quality_mode,
      'engine', en.engine,
      'windowNote', en.window_note,
      -- bloco de CLIENTE só com 10+ filmes de cliente com tempo medido; senão null (sem taxa nenhuma)
      'customers', case when coalesce(fc.time_n, 0) >= 10 then jsonb_build_object(
        'minutesToFilm', jsonb_build_object('median', fc.minutes_median, 'p90', fc.minutes_p90,
                                            'sample', (select label from bands where fc.time_n between lo and hi)),
        'durationSeconds', jsonb_build_object('median', fc.duration_median,
                                              'sample', (select label from bands where fc.duration_n between lo and hi)),
        'reliability', case when coalesce(rc.started, 0) > 0 then jsonb_build_object(
          'pct', case when 100.0 * rc.unknown / rc.started > 20 then null
                      else round(100.0 * rc.delivered / nullif(rc.delivered + rc.failed, 0), 1) end,
          'unknownPct', round(100.0 * rc.unknown / rc.started, 1),
          'sample', (select label from bands where rc.started between lo and hi)) end,
        'coherence', case when coalesce(cc.n, 0) > 0 then jsonb_build_object(
          'mean', cc.mean, 'offPct', cc.off_pct,
          'sample', (select label from bands where cc.n between lo and hi)) end
      ) end,
      -- renders de TESTE da casa: só para motor sem bloco de cliente; só tempo e duração
      'house', case when coalesce(fc.time_n, 0) < 10 and coalesce(fh.time_n, 0) > 0 then jsonb_build_object(
        'minutesToFilm', jsonb_build_object('median', fh.minutes_median, 'p90', fh.minutes_p90,
                                            'sample', (select label from bands where fh.time_n between lo and hi)),
        'durationSeconds', jsonb_build_object('median', fh.duration_median,
                                              'sample', (select label from bands where fh.duration_n between lo and hi))
      ) end
    ) order by en.ord)
    from engines en
    left join film_stats fc on fc.quality_mode = en.quality_mode and not fc.house
    left join film_stats fh on fh.quality_mode = en.quality_mode and fh.house
    left join reliability_stats rc on rc.quality_mode = en.quality_mode and not rc.house
    left join coherence_stats cc on cc.quality_mode = en.quality_mode and not cc.house
  )
)) as document
from params p;
