-- data/state-of-ai-shorts/2026-10.sql — KINEO-GEO-RODADA2-2026-10-08 (edição de OUTUBRO do "State of AI Shorts 2026")
-- A consulta que GEROU data/state-of-ai-shorts/2026-10.json (a saída dela foi gravada verbatim no JSON).
-- Rodada em 08/10/2026 UTC no projeto cqqukkvjjrguayiyjvhh, SÓ SELECT (nenhuma escrita).
--
-- POR QUE A PÁGINA VIROU EDIÇÃO (e deixou de ler o banco a cada dia): a /state-of-ai-shorts-2026 lia três RPCs
-- (study_volume / study_speed / study_engine_mix, lib/studyStats.ts) com teto de 5 s por chamada; em produção ela estava
-- servindo o FALLBACK de 05/08 ("last read August 5, 2026", 472 vídeos, curva mensal até agosto) havia dois meses — e as
-- sessões vindas do ChatGPT caíram de 53 para 22 por semana. Edição mensal versionada = o mesmo desenho do Kineo AI
-- Video Index (data/ai-video-index/), com data e fonte na página, e nunca mais um número congelado em silêncio.
--
-- A REGRA DO ÍNDICE V2 (sessão CEO 06/10; repetida para esta página em 08/10): SEM VOLUME ABSOLUTO na saída — nenhuma
-- contagem de filmes, pedidos, pessoas, nem participação de uso por motor. Só medianas, percentis e taxas. O tamanho da
-- amostra sai SÓ como faixa ("100+", "10-99", "<10"). As contagens vivem nas CTEs e não saem.
--
-- JANELA: a MESMA da edição de outubro do Kineo AI Video Index (data/ai-video-index/2026-10.sql), 30 dias em UTC — as duas
-- páginas de dado da casa medem o mesmo período e não se contradizem.
--
-- DUAS POPULAÇÕES (a página diz qual número vem de qual):
--   · P1 "finished Shorts" — todo filme ENTREGUE (videos.status='completed') de conta de CLIENTE na janela, em qualquer
--     motor de filme (o Kineo 1, montagem com banco de imagens, e os motores que geram cena). Clipe avulso ('clip') não é
--     Short e fica fora. Mede: DURAÇÃO do filme pronto e o que as pessoas fazem (NICHOS).
--   · P2 "scene-generating renders" — só os motores que geram cada cena (Seedance, Kling, Veo, MiniMax, Omni). Mede: TEMPO
--     até o filme pronto e CONFIABILIDADE, com o MESMO método do índice. O Kineo 1 fica fora destes dois porque não é mais
--     oferecido a conta nova desde 29/09 (lib/engineLaunch.ts KINEO1_PUBLIC=false): publicar o tempo dele prometeria a quem
--     chega um tempo que ele não vai ter.
--
-- O QUE CADA NÚMERO MEDE (a página repete isto em inglês, na metodologia):
--   · length ........ P1: mediana de videos.duration do filme entregue; % com 60 s ou mais; % com menos de 30 s.
--   · renderTime .... P2: mediana e p90 do 1º registro de SERVIDOR do pedido (min de generation_attempt_opened sem dry_run e
--                     generation_dispatch_received do mesmo generation_id) até o filme salvo (videos.created_at), ligados por
--                     compose_submission_claim (generation_id → render_id). Só com 10+ filmes cronometrados; senão null.
--   · reliability ... P2: coorte de pedidos com início na janela; "começou" = alguma cinematic_dispatch_result com
--                     attempted > 0, ou filme entregue; pct = entregues ÷ (entregues + falhas registradas). Desconhecido
--                     acima de 20% dos que começaram = pct null ("not enough data"). Só com 10+ que começaram; senão null.
--   · niches ........ P1: o texto que a pessoa digitou (videos.topic, sem as marcações [..] de cena) casado com a lista de
--                     palavras de cada nicho (inglês, português, espanhol e francês) abaixo. Conta PESSOAS distintas por
--                     nicho (um criador que fez nove vídeos do mesmo tema conta uma vez); um Short pode cair em mais de um
--                     nicho. Sai só a POSIÇÃO (rank, empates com a mesma posição) e a FAIXA: 'most' = 10%+ dos criadores,
--                     'common' = 5% a 10%, 'less' = menos de 5%.
--
-- COMO FAZER A EDIÇÃO DO MÊS QUE VEM (ex.: 2026-11): copiar este arquivo para 2026-11.sql; trocar só o bloco `params`
-- (edição + janela de 30 dias em UTC, a mesma do índice do mês); conferir as contas da casa contra lib/internalAccounts.ts
-- (o guardião scripts/test-geo-rodada2-2026-10-08.mjs reprova se divergir); rodar (só SELECT) e gravar a saída, sem editar
-- número nenhum, em data/state-of-ai-shorts/2026-11.json; apontar lib/seo/stateOfAiShortsEdition.ts para o JSON novo.
--
-- PRIVACIDADE: a saída só tem medianas, percentis, percentuais, posições, faixas e chaves de nicho. Nenhum e-mail, id,
-- prompt ou texto de cliente sai daqui. A lista de e-mails abaixo é o FILTRO das contas da casa (espelho de
-- lib/internalAccounts.ts), não um dado publicado.
with params as (
  select '2026-10'::text                             as edition,
         timestamptz '2026-09-07 00:00:00+00'        as window_start,
         timestamptz '2026-10-07 00:00:00+00'        as window_end
),
-- faixas de amostra: a única forma em que o tamanho da amostra sai daqui
bands (lo, hi, label) as (
  values (100, 2147483647, '100+'), (10, 99, '10-99'), (1, 9, '<10')
),
-- contas da casa = espelho EXATO de lib/internalAccounts.ts (INTERNAL_EXACT_EMAILS + INTERNAL_LIKE_PATTERNS).
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
-- motores que GERAM a cena ↔ chave de generation_attempt_opened (1:1, a mesma tabela do índice)
scene_engines (quality_mode, attempt_engine) as (
  values ('cinematic_ai', 'seedance'), ('cinematic_kling', 'kling'), ('cinematic_veo', 'veo'), ('cinematic_hollywood', 'hollywood'),
         ('cinematic_h3', 'h3'), ('cinematic_s25', 's25'), ('cinematic_omni', 'omni')
),
-- ── P1: todo Short entregue de cliente na janela ────────────────────────────────────────────────────────────────
shorts as (
  select v.id, v.user_id, v.quality_mode, v.duration, v.render_id, v.created_at as ready_at,
         lower(regexp_replace(coalesce(v.topic, ''), '\[[^\]]*\]', ' ', 'g')) as idea
  from public.videos v, params p
  where v.status = 'completed'
    and v.created_at >= p.window_start and v.created_at < p.window_end
    and (v.quality_mode = 'fast' or v.quality_mode in (select quality_mode from scene_engines))
    and not exists (select 1 from internal_ids i where i.id = v.user_id)
),
length_stats as (
  select count(*) filter (where duration > 0) as n,
         round((percentile_cont(0.5) within group (order by duration) filter (where duration > 0))::numeric, 1) as median_seconds,
         round(100.0 * count(*) filter (where duration >= 60) / nullif(count(*) filter (where duration > 0), 0), 1) as pct_60_plus,
         round(100.0 * count(*) filter (where duration > 0 and duration < 30) / nullif(count(*) filter (where duration > 0), 0), 1) as pct_under_30
  from shorts
),
-- ── P2: tempo até o filme pronto (método do índice) ─────────────────────────────────────────────────────────────
claims as (
  select distinct on (e.metadata->>'render_id')
         e.metadata->>'render_id' as render_id, e.metadata->>'generation_id' as generation_id
  from public.events e, params p
  where e.name = 'compose_submission_claim'
    and e.created_at >= p.window_start - interval '2 days'
    and e.metadata->>'render_id' is not null
  order by e.metadata->>'render_id', e.created_at
),
scene_timed as (
  select s.*,
    (select min(e.created_at) from public.events e
       where e.created_at >= (select window_start from params) - interval '2 days'
         and ((e.name = 'generation_attempt_opened' and e.session_id = c.generation_id
               and coalesce(e.metadata->>'dry_run', 'false') <> 'true')
           or (e.name = 'generation_dispatch_received' and e.metadata->>'generation_id' = c.generation_id))) as t0
  from shorts s
  left join claims c on c.render_id = s.render_id
  where s.quality_mode in (select quality_mode from scene_engines)
),
time_stats as (
  select count(t0) as n,
    round((percentile_cont(0.5) within group (order by extract(epoch from (ready_at - t0))) filter (where t0 is not null) / 60)::numeric, 1) as minutes_median,
    round((percentile_cont(0.9) within group (order by extract(epoch from (ready_at - t0))) filter (where t0 is not null) / 60)::numeric, 1) as minutes_p90
  from scene_timed
),
-- ── P2: confiabilidade entre renders que começaram (método do índice, motores de cena somados) ────────────────
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
  select
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
  join scene_engines en on en.attempt_engine = r.attempt_engine
  cross join params p
  where r.t0 >= p.window_start and r.t0 < p.window_end
    and not exists (select 1 from internal_ids i where i.id = r.user_id)
),
reliability_stats as (
  select count(*) filter (where max_attempted > 0 or delivered) as started,
         count(*) filter (where delivered) as delivered,
         count(*) filter (where (max_attempted > 0) and not delivered and failure_recorded) as failed,
         count(*) filter (where (max_attempted > 0) and not delivered and not failure_recorded) as unknown
  from gen_outcomes
),
-- ── P1: nichos — palavras-chave por nicho (as chaves batem com lib/seo/stateOfAiShorts.ts STATE_NICHES) ─────────
niches (key, rx) as (
  values
    ('horror',     '(horror|scary|creepy|haunt|ghost|terrifying|nightmare|demon|paranormal|possessed|witching hour|\m3 ?am\M|\m3:[0-5][0-9] ?a\.?m|madrugada|assombr|fantasma|\mterror\M|miedo|effray|hantée|knocking|under the bed|\mcursed?\M)'),
    ('mystery',    '(myster|mistér|misteri|unsolved|vanish|disappear|desapare|disparu|unexplain|inexplic|nobody knows|no one knows|enigma|énigme|ghost ship|declassified|classified|conspira|\mufos?\M|bermuda|anomal)'),
    ('truecrime',  '(murder|killer|serial kill|true crime|\mcrime|criminal|detective|kidnap|stalk|robber|\mfbi\M|cold case|homicid|hijack|skyjack|assassinat|zodiac|\mprison\M|thie(f|ves))'),
    ('history',    '(histor|ancient|empire|imperio|império|medieval|\mrome\M|roman |egypt|pharaoh|samurai|viking|world war|civil war|battle of|\mcentury\M|centuries|século|siglo|dynasty|emperor|pompeii|titanic|hiroshima|soviet|napoleon|caesar|\m(in|em|en) 1[0-9]{3}\M|\m1[0-9]{3}s\M)'),
    ('space',      '(\mspace\M|planet|black hole|buraco negro|agujero negro|galax|universe|universo|\mnasa\M|\mmars\M|\mmoons?\M|\mlua\M|\mluna\M|solar system|asteroid|comet|astronaut|cosmos|telescope)'),
    ('science',    '(scien|cientí|ciênc|physic|chemist|biolog|\matoms?\M|\mdna\M|quantum|evolution|experiment|gravity|time dilation|volcan|earthquake|tsunami|bacteri|\mvirus|amygdala|neuro|superdeep|borehole)'),
    ('facts',      '(did you know|\mfacts?\M|fun fact|sabia que|sabías|você sabia|curiosidade|curiosidad|trivia|you won.t believe|never knew|fatos)'),
    ('money',      '(money|\mrich\M|richest|billion|millionaire|wealth|invest|financ|salary|mortgage|lottery|bitcoin|crypto|bezos|buffett|\mmusk\M|luxury|rolex|ferrari|\$[0-9]|₹[0-9]|€[0-9]|dinheiro|dinero|riqueza|startup|business|\mbrand\M)'),
    ('faith',      '(\mgod\M|jesus|christ|bible|bíblia|biblia|psalm|salmo|\mpray|faith|church|\mlord\M|amen\M|krishna|radha|arjuna|ayodhya|allah|quran|\mdeus\M|\mdios\M|oração|oración|devotion|goliath)'),
    ('kids',       '(kids|toddler|nursery|cartoon|\mbab(y|ies)\M|bebê|children|preschool|criança|niño|niña|infantil|bedtime|bunny|princess|princesa|\mpony\M|for kids|enfants|little explorers)'),
    ('animals',    '(animal|\mdogs?\M|\mcats?\M|\mlions?\M|tiger|shark|octopus|\mbirds?\M|\mants?\M|insect|species|wildlife|\mpets?\M|raccoon|whale|snake|crocodil|cocodrilo|\mwolf\M|\mlobo\M|eagle|águila|mosquito|cockroach|lungfish|\memus?\M|\mbears?\M|perro|gato|cachorro|rabbit)'),
    ('geography',  '(countr|\misland|\mcity\M|cities|border|travel|\mpaís\M|\milha\M|\misla\M|cidade|ciudad|desert|ocean floor|deepest hole|\mlake\M|\mriver\M)'),
    ('motivation', '(motivat|discipline|disciplina|success|sucesso|habit|hábito|mindset|stoic|productiv|procrastinat|self-improvement|morning routine|patience)'),
    ('comedy',     '(funny|prank|comedy|laugh|\mmemes?\M|hilarious|engraçad|divertid|gracios|humor|brainrot|parod)'),
    ('tech',       '(\mai\M(?![- ]?(video|visual|voice|generat|image|micro|short|animat|anime|scene|avatar|clip|art\M|model|film|story|character))|artificial intelligence|inteligência artificial|inteligencia artificial|robot|chatgpt|openai|\mtech\M|technolog|tecnolog|smartphone|iphone|internet|computer|software)'),
    ('health',     '(health|medical|disease|infection|symptom|\mlungs?\M|tuberc|insomnia|stopped sleeping|cold shower|nutrition|fitness|\mgym\M|workout|saúde|salud)')
),
creators_total as (
  select count(distinct user_id) as n from shorts
),
niche_hits as (
  select n.key, count(distinct s.user_id) as creators
  from niches n
  join shorts s on s.idea ~ n.rx
  group by n.key
),
niche_ranked as (
  select h.key,
         rank() over (order by h.creators desc) as rnk,
         case when 100.0 * h.creators / ct.n >= 10 then 'most'
              when 100.0 * h.creators / ct.n >= 5 then 'common'
              else 'less' end as tier
  from niche_hits h cross join creators_total ct
)
-- ── o documento: uma linha, o JSON que vai para data/state-of-ai-shorts/<edição>.json — sem contagem nenhuma ──────────
select jsonb_pretty(jsonb_build_object(
  'schema', 'kineo-state-of-ai-shorts/1',
  'edition', p.edition,
  'measuredAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'window', jsonb_build_object(
    'start', to_char(p.window_start at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'end', to_char(p.window_end at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'days', extract(day from (p.window_end - p.window_start))::int
  ),
  'length', case when ls.n >= 10 then jsonb_build_object(
    'medianSeconds', ls.median_seconds, 'pct60Plus', ls.pct_60_plus, 'pctUnder30', ls.pct_under_30,
    'sample', (select label from bands where ls.n between lo and hi)) end,
  'renderTime', case when ts.n >= 10 then jsonb_build_object(
    'medianMinutes', ts.minutes_median, 'p90Minutes', ts.minutes_p90,
    'sample', (select label from bands where ts.n between lo and hi)) end,
  'reliability', case when rs.started >= 10 then jsonb_build_object(
    'pct', case when 100.0 * rs.unknown / rs.started > 20 then null
                else round(100.0 * rs.delivered / nullif(rs.delivered + rs.failed, 0), 1) end,
    'unknownPct', round(100.0 * rs.unknown / rs.started, 1),
    'sample', (select label from bands where rs.started between lo and hi)) end,
  'niches', jsonb_build_object(
    'sample', (select label from bands where ct.n between lo and hi),
    'ranking', (select jsonb_agg(jsonb_build_object('key', nr.key, 'rank', nr.rnk, 'tier', nr.tier) order by nr.rnk, nr.key) from niche_ranked nr)
  )
)) as document
from params p
cross join length_stats ls
cross join time_stats ts
cross join reliability_stats rs
cross join creators_total ct;
