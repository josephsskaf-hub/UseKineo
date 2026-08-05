-- docs/MIGRACAO-STUDY-STATS.sql — KINEO-LIVE-STUDY-2026-08-05
--
-- JÁ APLICADA em produção (cqqukkvjjrguayiyjvhh) em 05/08/2026, em duas
-- migrações: `study_stats_functions` e `study_speed_fast_only`. Este arquivo é
-- a cópia versionada — sem ele, ninguém consegue auditar se a metodologia
-- PÚBLICA de /state-of-ai-shorts-2026 corresponde ao que o banco realmente faz.
-- (Foi exatamente esse o bloqueador nº 4 da revisão adversarial pré-commit.)
--
-- CONTRATO COM O CÓDIGO — se mudar aqui, mude lá:
--   · lib/studyStats.ts consome as 3 funções e espera EXATAMENTE estes nomes de
--     coluna. Um rename silencioso derruba a página para o FALLBACK.
--   · A janela '2026-08-02' abaixo é a mesma que a página declara na
--     metodologia (lib/studyStats.RELIABILITY_WINDOW_START). São dois lugares
--     porque um é SQL e o outro é texto renderizado; se divergirem, a página
--     publica uma metodologia falsa. Mudar os dois juntos.
--   · A exclusão de internas em kineo_internal_ids() espelha
--     lib/internalAccounts.ts (INTERNAL_EXACT_EMAILS + INTERNAL_LIKE_PATTERNS).
--     Ao adicionar um e-mail interno lá, adicione aqui.
--
-- SEGURANÇA: SECURITY DEFINER porque o chamador é a página pública via service
-- role e os percentis precisam enxergar todas as linhas. Só agregados saem —
-- nenhuma função devolve linha de usuário. kineo_internal_ids() tem execute
-- revogado de anon/authenticated de propósito.

-- ── quem é conta interna (espelha lib/internalAccounts.ts) ──────────────────
create or replace function public.kineo_internal_ids()
returns table (id uuid)
language sql stable security definer set search_path = public as $$
  select p.id from public.profiles p
  where p.email is null
     or lower(p.email) in ('josephsskaf@gmail.com','josephskaf@hotmail.com',
                           'victoriaskaf96@gmail.com','joseph+teste01@gmail.com',
                           'teste01@shortsforgeai.com')
     or p.email ilike 'josephsskaf+%@gmail.com' or p.email ilike 'joseph+%@gmail.com'
     or p.email ilike '%@theresanaiforthat.com' or p.email ilike 'josephsskaf%'
     or p.email ilike 'josephskaf%' or p.email ilike '%@shortsforgeai.com'
     or p.email ilike 'test%' or p.email ilike '%mailinator%'
     or p.email ilike 'smoketest%' or p.email ilike '%@example.com';
$$;

-- ── volume, criadores, janela e curva mensal ────────────────────────────────
create or replace function public.study_volume()
returns table (total_videos bigint, total_creators bigint, since date, monthly jsonb)
language sql stable security definer set search_path = public as $$
  with v as (
    select vi.user_id, vi.created_at from public.videos vi
    where vi.status = 'completed'
      and vi.user_id not in (select id from public.kineo_internal_ids())
  )
  select (select count(*) from v),
         (select count(distinct user_id) from v),
         (select min(created_at)::date from v),
         (select coalesce(jsonb_agg(jsonb_build_object('month', m, 'videos', n) order by m), '[]'::jsonb)
            from (select to_char(date_trunc('month', created_at), 'YYYY-MM') m, count(*) n
                    from v group by 1) t);
$$;

-- ── velocidade e confiabilidade, POR TENTATIVA, SOMENTE motor Fast ──────────
-- O filtro `is_fast` é o bloqueador nº 2 da revisão: hoje 227 de 227 tentativas
-- da janela são Fast, então ele não muda nenhum número — mas trava a semântica.
-- lib/kineoFacts.fastGeneration* rotula estes valores como "Fast renders"; sem
-- o filtro, um único dia de tráfego cinematic passaria a misturar motores sob
-- um rótulo que diz Fast, e ninguém perceberia.
--
-- A janela começa em 02/08/2026 e isso está DECLARADO na metodologia pública:
-- é o primeiro dia limpo depois dos dois apagões de fornecedor (OpenAI 31/07,
-- Creatomate 01/08, ver docs/INCIDENTE-OPENAI-2026-07-31.md). Medir por cima
-- deles publicaria ~55% de conclusão e puniria o produto por falha de terceiro
-- já resolvida. Não é maquiagem justamente porque está escrito na página.
create or replace function public.study_speed()
returns table (completion_rate numeric, median_minutes numeric, p90_minutes numeric, sample_size bigint)
language sql stable security definer set search_path = public as $$
  with s as (
    select e.metadata->>'attempt_id' aid, e.created_at,
           e.metadata->>'stage' stage, e.metadata->>'quality' q
    from public.events e
    where e.name = 'generation_stage_reached'
      and e.metadata->>'attempt_id' is not null
      and e.created_at >= date '2026-08-02'
      and e.user_id not in (select id from public.kineo_internal_ids())
  ),
  agg as (
    select aid, min(created_at) t0, max(created_at) t1,
           bool_or(stage = 'done') ok, bool_or(stage = 'failed') failed,
           bool_or(q = 'fast') is_fast
    from s group by aid
  ),
  f as (select * from agg where is_fast)
  select round(100.0 * count(*) filter (where ok)
               / nullif(count(*) filter (where ok or failed), 0), 1),
         round((percentile_cont(0.5) within group (order by extract(epoch from (t1 - t0)))
                filter (where ok))::numeric / 60, 1),
         round((percentile_cont(0.9) within group (order by extract(epoch from (t1 - t0)))
                filter (where ok))::numeric / 60, 1),
         count(*) filter (where ok)
  from f;
$$;

-- ── mix de motor sobre vídeos concluídos ────────────────────────────────────
create or replace function public.study_engine_mix()
returns table (fast_share numeric, premium_share numeric)
language sql stable security definer set search_path = public as $$
  with v as (
    select coalesce(nullif(vi.quality_mode, ''), 'unknown') q
    from public.videos vi
    where vi.status = 'completed'
      and vi.user_id not in (select id from public.kineo_internal_ids())
  )
  select round(100.0 * count(*) filter (where q = 'fast') / nullif(count(*), 0), 1),
         round(100.0 * count(*) filter (where q in ('cinematic_ai','cinematic_kling',
               'cinematic_hollywood','basic_ai','presenter')) / nullif(count(*), 0), 1)
  from v;
$$;

revoke all on function public.kineo_internal_ids() from public, anon, authenticated;
grant execute on function public.study_volume() to service_role;
grant execute on function public.study_speed() to service_role;
grant execute on function public.study_engine_mix() to service_role;

-- ── conferência (o que estas funções devolviam em 05/08/2026 13:45Z) ────────
-- study_volume()     → 472 vídeos · 331 criadores · desde 2026-05-16
--                      mensal: 05=32, 06=60, 07=208, 08=172
-- study_speed()      → 91,9% · mediana 4,2 min · p90 6,6 min · amostra 114
-- study_engine_mix() → fast 89,2% · premium 4,0%
-- Estes são exatamente os valores do FALLBACK em lib/studyStats.ts.
