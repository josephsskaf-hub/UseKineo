-- KINEO-APERTOU-E-NAO-SAIU-2026-09-24 — leitura dos consertos publicados em 43be75f1 (deploy dpl_ZEkWCur2BZxyYanLDpxJCpLJDtHz,
-- READY em produção às 16:16:33 UTC de 24/09, dpl_ZEkWCur2BZxyYanLDpxJCpLJDtHz; o 16:37 da primeira versão estava errado e cortava os primeiros 20 min). Base medida antes: 13 pessoas/7 d apertaram Gerar e não receberam filme
-- (12 por defeito nosso, 11 via ChatGPT). Corte por HORA DO DEPLOY (o carimbo do cron não tem campo novo); o botão
-- "Keep primeiro" (d1470148) tem carimbo próprio: engine_fit_box_shown.metadata ? 'keep_first'.

-- 1. Cron de pedido órfão do Kineo 1: antes do deploy o replay batia no 409 de encaixe; depois deve virar 200.
select case when e.created_at < '2026-09-24 16:17+00' then 'antes' else 'depois' end as janela,
       e.metadata->>'status' as status, count(*) as pedidos, count(distinct e.user_id) as pessoas
from events e
where e.name = 'render_job_finished' and e.created_at > '2026-09-17 16:17+00'
group by 1, 2 order by 1, 2;

-- 2. A carta falsa "a aba fechou" deve cair (ela saía para quem o cron via como órfão e recebia 409).
select case when created_at < '2026-09-24 16:17+00' then 'antes' else 'depois' end as janela,
       count(*) as cartas, count(distinct user_id) as pessoas
from events where name = 'attempt_lost_rescue_sent' and created_at > '2026-09-17 16:17+00'
group by 1;

-- 3. O aviso de encaixe disparado pelo AUTO-START deve ir a zero (o auto-start agora manda o override).
select case when e.created_at < '2026-09-24 16:17+00' then 'antes' else 'depois' end as janela,
       count(*) filter (where exists (select 1 from events a where a.user_id = e.user_id and a.name = 'activation_autostart_dispatched'
                                        and a.created_at between e.created_at - interval '2 minutes' and e.created_at)) as avisos_apos_autostart,
       count(*) as avisos_total
from events e where e.name = 'engine_fit_box_shown' and e.created_at > '2026-09-17 16:17+00'
group by 1;

-- 4. A métrica que importa: pessoas que apertaram Gerar e NÃO receberam filme, janelas de 7 d (base 13).
with st as (
  select user_id, min(created_at) as t0 from events
  where name in ('generate_started','video_generation_started','generation_dispatch_received') and user_id is not null
    and created_at > now() - interval '7 days'
  group by 1
)
select count(*) as apertaram,
       count(*) filter (where not exists (select 1 from videos v where v.user_id = st.user_id and v.status = 'completed' and v.created_at >= st.t0 - interval '10 minutes')) as sem_filme,
       count(*) filter (where st.t0 >= '2026-09-24 16:17+00') as apertaram_depois_do_deploy,
       count(*) filter (where st.t0 >= '2026-09-24 16:17+00' and not exists (select 1 from videos v where v.user_id = st.user_id and v.status = 'completed' and v.created_at >= st.t0 - interval '10 minutes')) as sem_filme_depois
from st join profiles p on p.id = st.user_id
where not (p.email ilike any (array['%josephsskaf%','%josephskaf%','%shortsforgeai.com%','%usekineo.com%','%joseph-test%']));

-- 5. Botão "Make it with Kineo 1 now" (decisão "1 troca"): quem viu o aviso com keep_first, e o que apertou.
select coalesce(s.metadata->>'keep_first', '(antes do carimbo)') as keep_first,
       count(distinct s.user_id) as viram,
       count(distinct k.user_id) as mantiveram_kineo1,
       count(distinct w.user_id) as trocaram_para_seedance
from events s
left join events k on k.user_id = s.user_id and k.name = 'engine_fit_kept' and k.created_at between s.created_at and s.created_at + interval '30 minutes'
left join events w on w.user_id = s.user_id and w.name = 'engine_fit_switched' and w.created_at between s.created_at and s.created_at + interval '30 minutes'
where s.name = 'engine_fit_box_shown' and s.created_at > '2026-09-17'
group by 1;
