-- data/ai-video-index/2026-10.sql — KINEO-INDICE-VIDEO-IA-2026-10-06
-- A consulta que GEROU data/ai-video-index/2026-10.json (a saída dela foi gravada verbatim no JSON).
-- Rodada em 07/10/2026 ~01:50 UTC no projeto cqqukkvjjrguayiyjvhh, SÓ SELECT (nenhuma escrita).
--
-- COMO FAZER A EDIÇÃO DO MÊS QUE VEM (ex.: 2026-11):
--   1. copiar este arquivo para data/ai-video-index/2026-11.sql;
--   2. trocar só o bloco `params` (edição + janela de 30 dias, em UTC) e as notas de disponibilidade em `engines`;
--   3. conferir a lista de contas da casa abaixo contra lib/internalAccounts.ts (o guardião
--      scripts/test-indice-video-ia-2026-10-06.mjs reprova se divergir);
--   4. rodar a consulta (só SELECT) e gravar a saída, sem editar número nenhum, em data/ai-video-index/2026-11.json;
--   5. apontar lib/seo/aiVideoIndexEdition.ts para o JSON novo (o guardião exige que a página leia a edição mais nova).
--
-- O QUE CADA NÚMERO MEDE (a página repete isto em inglês, na metodologia):
--   · films ............ filmes concluídos (videos.status='completed') cuja linha nasceu na janela — a linha só é gravada
--                         quando o MP4 final fica pronto, então created_at = momento da entrega.
--   · durationSeconds .. videos.duration do filme entregue (bate com a medição do cabeçalho do MP4 — mvhd, evento
--                         render_delivered_measured — com diferença ≤ 1 s em 100% dos filmes que têm as duas).
--   · minutesToFilm .... do 1º registro de SERVIDOR do pedido até o filme salvo na biblioteca (videos.created_at).
--                         Motores de IA: min(created_at) de generation_attempt_opened (sem ensaio dry_run) e
--                         generation_dispatch_received do mesmo generation_id; o filme liga ao pedido por
--                         compose_submission_claim (generation_id → render_id = videos.render_id).
--                         Kineo 1: o POST não carrega generation_id antes do plano; o pedido é o último
--                         generation_dispatch_received (engine='fast') da MESMA conta nos 15 min antes do plano de cenas
--                         (fast_scene_plan / fast_compose_recoverable, gravados dentro do mesmo POST).
--                         O filme é salvo quando a tela consulta o status ou quando o cron finish-stranded-renders
--                         (a cada 5 min) encontra o render pronto — sem ninguém olhando, isso pode somar até ~5 min.
--   · requests ......... coorte de pedidos com início na janela. Motores de IA: generation_id distintos de
--                         generation_attempt_opened (sem dry_run). Kineo 1: generation_dispatch_received (engine='fast').
--                         delivered = virou filme concluído (até a hora da leitura);
--                         stoppedByChecks = a casa recusou ANTES de renderizar qualquer cena (IA: cinematic_dispatch_result
--                           com 0 cenas tentadas e só HTTP 4xx — roteiro curto/longo para a duração, silêncio no plano;
--                           Kineo 1: sem plano e com engine_fit_warned / narration_guard_blocked / shot_spec_detected da
--                           conta depois do pedido e antes do pedido seguinte, em até 3 min) — nada é cobrado;
--                         failed = erro (HTTP 5xx, cena enviada e filme não montado, ou — Kineo 1 — plano sem filme ou
--                           generation_stage_error do servidor depois do pedido) — o crédito volta;
--                         noOutcomeRecorded = não virou filme e o servidor não gravou o porquê (Kineo 1, ou IA sem
--                           cinematic_dispatch_result).
--   · coherence ........ última nota da versão vigente do juiz (fast_coherence, version='k1_coerencia_v5_honesto',
--                         lib/fastCoherence.ts) por filme entregue na janela; below50 = veredito 'off'.
--   · house ............ as mesmas medidas de filme para as contas da casa — SEPARADAS, nunca somadas aos clientes.
--
-- PRIVACIDADE: a saída só tem contagens, medianas e médias por motor. Nenhum e-mail, id, prompt ou texto de cliente
-- sai daqui (o guardião varre o JSON). A lista de e-mails abaixo é o FILTRO das contas da casa (espelho de
-- lib/internalAccounts.ts), não um dado publicado.
with params as (
  select '2026-10'::text                             as edition,
         timestamptz '2026-09-07 00:00:00+00'        as window_start,
         timestamptz '2026-10-07 00:00:00+00'        as window_end
),
-- motor público ↔ quality_mode do banco ↔ chave de generation_attempt_opened (1:1, conferido em 07/10).
-- window_note = disponibilidade do motor DENTRO da janela (fonte: comentários datados de lib/engineLaunch.ts).
engines (ord, quality_mode, attempt_engine, engine, window_note) as (
  values
    (1, 'cinematic_ai',        'seedance',  'Seedance 1.5', null),
    (2, 'fast',                null,        'Kineo 1',      'Removed from the public catalogue on 2026-09-29; still available to existing paying accounts.'),
    (3, 'cinematic_kling',     'kling',     'Kling 2.5',    null),
    (4, 'cinematic_veo',       'veo',       'Veo 3.1',      null),
    (5, 'cinematic_hollywood', 'hollywood', 'Kling 3',      null),
    (6, 'cinematic_h3',        'h3',        'MiniMax H3',   'Paused for new films from 2026-09-15 to 2026-09-22.'),
    (7, 'cinematic_s25',       's25',       'Seedance 2.5', 'House-only until 2026-09-15, paused until 2026-10-06, then reopened for paid plans only.'),
    (8, 'cinematic_omni',      'omni',      'Omni Flash',   'Paused for maintenance since 2026-09-15.')
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
-- ── filmes entregues na janela ───────────────────────────────────────────────────────────────────────────────────
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
         e.metadata->>'render_id' as render_id, e.metadata->>'generation_id' as generation_id, e.created_at as claim_at
  from public.events e, params p
  where e.name = 'compose_submission_claim'
    and e.created_at >= p.window_start - interval '2 days'
    and e.metadata->>'render_id' is not null
  order by e.metadata->>'render_id', e.created_at
),
films_linked as (
  select f.*, c.generation_id, c.claim_at,
    (select min(e.created_at) from public.events e
       where e.created_at >= (select window_start from params) - interval '2 days'
         and ((e.name = 'generation_attempt_opened' and e.session_id = c.generation_id
               and coalesce(e.metadata->>'dry_run', 'false') <> 'true')
           or (e.name = 'generation_dispatch_received' and e.metadata->>'generation_id' = c.generation_id))) as gen_t0,
    (select min(e.created_at) from public.events e
       where e.name in ('fast_scene_plan', 'fast_compose_recoverable') and e.session_id = c.generation_id) as plan_at
  from films f
  left join claims c on c.render_id = f.render_id
),
films_timed as (
  select fl.*,
    case when fl.quality_mode = 'fast' then
      (select max(d.created_at) from public.events d
        where d.name = 'generation_dispatch_received' and d.user_id = fl.user_id and d.metadata->>'engine' = 'fast'
          and d.created_at <= coalesce(fl.plan_at, fl.claim_at)
          and d.created_at > coalesce(fl.plan_at, fl.claim_at) - interval '15 minutes')
    else fl.gen_t0 end as t0
  from films_linked fl
),
film_stats as (
  select quality_mode, house,
    count(*) as films,
    count(distinct user_id) as creators,
    count(*) filter (where duration > 0) as duration_n,
    round((percentile_cont(0.5) within group (order by duration) filter (where duration > 0))::numeric, 1) as duration_median,
    min(duration) filter (where duration > 0) as duration_min,
    max(duration) filter (where duration > 0) as duration_max,
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
         count(*) filter (where s.score < 50) as below50
  from films f
  join scores s on s.video_id = f.id::text
  group by 1, 2
),
-- ── pedidos dos motores de IA (coorte: início na janela) ──────────────────────────────────────────────────────────
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
    (select max(coalesce((d.metadata->>'attempted')::int, 0)) from public.events d
      where d.name = 'cinematic_dispatch_result' and d.metadata->>'generation_id' = r.generation_id) as max_attempted,
    (select bool_and(coalesce(d.metadata->>'app_http_status', '') ~ '^4[0-9][0-9]$') from public.events d
      where d.name = 'cinematic_dispatch_result' and d.metadata->>'generation_id' = r.generation_id) as all_4xx
  from gen_requests r
  join engines en on en.attempt_engine = r.attempt_engine
  cross join params p
  where r.t0 >= p.window_start and r.t0 < p.window_end
),
-- ── pedidos do Kineo 1 ────────────────────────────────────────────────────────────────────────────────────────────
fast_dispatches as (
  select d.id, d.user_id, d.created_at,
         lead(d.created_at) over (partition by d.user_id order by d.created_at) as next_at
  from public.events d, params p
  where d.name = 'generation_dispatch_received' and d.metadata->>'engine' = 'fast'
    and d.created_at >= p.window_start - interval '1 day' and d.created_at < p.window_end + interval '1 day'
),
fast_requests as (
  select fd.*, exists (select 1 from internal_ids i where i.id = fd.user_id) as house
  from fast_dispatches fd, params p
  where fd.created_at >= p.window_start and fd.created_at < p.window_end
),
fast_plans as (
  select e.session_id as generation_id, e.user_id, min(e.created_at) as plan_at
  from public.events e, params p
  where e.name in ('fast_scene_plan', 'fast_compose_recoverable') and e.created_at >= p.window_start - interval '1 day'
  group by 1, 2
),
fast_plan_link as (
  select pl.generation_id,
    (select d.id from public.events d
      where d.name = 'generation_dispatch_received' and d.user_id = pl.user_id and d.metadata->>'engine' = 'fast'
        and d.created_at <= pl.plan_at and d.created_at > pl.plan_at - interval '15 minutes'
      order by d.created_at desc limit 1) as dispatch_id
  from fast_plans pl
),
fast_delivered_gens as (
  select distinct c.metadata->>'generation_id' as generation_id
  from public.videos v
  join public.events c on c.name = 'compose_submission_claim' and c.metadata->>'render_id' = v.render_id
  where v.status = 'completed' and v.quality_mode = 'fast'
    and v.created_at >= (select window_start from params) - interval '1 day'
),
fast_outcomes as (
  select r.house,
    exists (select 1 from fast_plan_link pl join fast_delivered_gens g using (generation_id) where pl.dispatch_id = r.id) as delivered,
    exists (select 1 from fast_plan_link pl where pl.dispatch_id = r.id) as planned,
    exists (select 1 from public.events s
             where s.user_id = r.user_id and s.path = '/api/generate-video-fast' and s.name = 'generation_stage_error'
               and s.created_at >= r.created_at and s.created_at < least(coalesce(r.next_at, 'infinity'), r.created_at + interval '15 minutes')) as error_event,
    exists (select 1 from public.events c
             where c.user_id = r.user_id and c.path = '/api/generate-video-fast'
               and c.name in ('engine_fit_warned', 'narration_guard_blocked', 'shot_spec_detected')
               and c.created_at >= r.created_at and c.created_at < least(coalesce(r.next_at, 'infinity'), r.created_at + interval '3 minutes')) as check_event
  from fast_requests r
),
request_stats as (
  select quality_mode, house,
    count(*) as n,
    count(*) filter (where delivered) as delivered,
    count(*) filter (where not delivered and coalesce(max_attempted, 0) = 0 and all_4xx) as stopped_by_checks,
    count(*) filter (where not delivered and max_attempted is not null and not (coalesce(max_attempted, 0) = 0 and all_4xx)) as failed,
    count(*) filter (where not delivered and max_attempted is null) as no_outcome
  from gen_outcomes
  group by 1, 2
  union all
  select 'fast', house,
    count(*),
    count(*) filter (where delivered),
    count(*) filter (where not delivered and not planned and not error_event and check_event),
    count(*) filter (where not delivered and (planned or error_event)),
    count(*) filter (where not delivered and not planned and not error_event and not check_event)
  from fast_outcomes
  group by 2
)
-- ── o documento: uma linha, o JSON que vai para data/ai-video-index/<edição>.json ──────────────────────────────────
select jsonb_pretty(jsonb_build_object(
  'schema', 'kineo-ai-video-index/1',
  'edition', p.edition,
  'measuredAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'window', jsonb_build_object(
    'start', to_char(p.window_start at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'end', to_char(p.window_end at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'days', extract(day from (p.window_end - p.window_start))::int
  ),
  'houseAccounts', 'excluded from every customer figure; reported separately under "house"',
  'engines', (
    select jsonb_agg(jsonb_build_object(
      'qualityMode', en.quality_mode,
      'engine', en.engine,
      'windowNote', en.window_note,
      'customers', jsonb_build_object(
        'films', coalesce(fc.films, 0),
        'creators', coalesce(fc.creators, 0),
        'durationSeconds', jsonb_build_object('n', coalesce(fc.duration_n, 0), 'median', fc.duration_median, 'min', fc.duration_min, 'max', fc.duration_max),
        'minutesToFilm', jsonb_build_object('n', coalesce(fc.time_n, 0), 'median', fc.minutes_median, 'p90', fc.minutes_p90),
        'requests', jsonb_build_object(
          'n', coalesce(rc.n, 0), 'delivered', coalesce(rc.delivered, 0), 'stoppedByChecks', coalesce(rc.stopped_by_checks, 0),
          'failed', coalesce(rc.failed, 0), 'noOutcomeRecorded', coalesce(rc.no_outcome, 0)),
        'coherence', jsonb_build_object('n', coalesce(cc.n, 0), 'mean', cc.mean, 'below50', coalesce(cc.below50, 0))
      ),
      'house', jsonb_build_object(
        'films', coalesce(fh.films, 0),
        'durationSeconds', jsonb_build_object('n', coalesce(fh.duration_n, 0), 'median', fh.duration_median),
        'minutesToFilm', jsonb_build_object('n', coalesce(fh.time_n, 0), 'median', fh.minutes_median, 'p90', fh.minutes_p90)
      )
    ) order by en.ord)
    from engines en
    left join film_stats fc on fc.quality_mode = en.quality_mode and not fc.house
    left join film_stats fh on fh.quality_mode = en.quality_mode and fh.house
    left join request_stats rc on rc.quality_mode = en.quality_mode and not rc.house
    left join coherence_stats cc on cc.quality_mode = en.quality_mode and not cc.house
  )
)) as document
from params p;
