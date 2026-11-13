-- KINEO-VOLTA-1211 — medição de 24 h de cada lote da carta de volta (só leitura; Supabase cqqukkvjjrguayiyjvhh).
-- Rodar 24 h depois do lote. Cada pessoa que recebeu (volta_1211_emailed) conta UMA vez em cada coluna.
-- Chegada = qualquer evento dela com metadata.utm_campaign = 'volta_1211' (o site carimba a utm em todo evento da visita,
-- inclusive landing_session_started em /history e em /studio/create — conferido 13/11 com post_nudge e video_ready).
-- Previsão (relatório div4-volta-1211-ensaio.md): base inteira 120–275 visitas e 5–25 filmes; o lote c (464) é o mais quente,
-- então a régua do lote c é: visitas ≥ 4% (≥ 19) = segue; < 1% depois de 200 enviados (< 2) = PARA (voltaPararOnda 'clique').

with enviados as (
  select user_id, min(created_at) t, min(metadata->>'seg') seg, min(metadata->>'lingua') lingua
  from events where name = 'volta_1211_emailed' group by 1
),
chegou as (
  select e.user_id, min(e.created_at) primeira
  from events e join enviados s on s.user_id = e.user_id
  where e.metadata->>'utm_campaign' = 'volta_1211' and e.created_at >= s.t
  group by 1
)
select s.seg, s.lingua,
  count(*)                                                                                      as enviados,
  count(c.user_id)                                                                              as visitas_pela_carta,
  round(100.0 * count(c.user_id) / nullif(count(*), 0), 1)                                      as pct_visita,
  count(*) filter (where exists (select 1 from events e where e.user_id = s.user_id and e.created_at > s.t + interval '5 minutes'
                                   and e.created_at < s.t + interval '24 hours' and e.name not like '%emailed%'))  as voltou_qualquer_coisa_24h,
  count(*) filter (where exists (select 1 from videos v where v.user_id = s.user_id and v.status = 'completed'
                                   and v.created_at > s.t and v.created_at < s.t + interval '24 hours'))           as filme_novo_24h,
  count(*) filter (where exists (select 1 from events e where e.user_id = s.user_id and e.name = 'payment_success'
                                   and e.created_at > s.t and e.created_at < s.t + interval '72 hours'))          as pagou_72h,
  count(*) filter (where exists (select 1 from profiles p where p.id = s.user_id and p.email_opted_out
                                   and p.email_opted_out_at > s.t))                                                as descadastrou
from enviados s left join chegou c on c.user_id = s.user_id
group by rollup (s.seg, s.lingua)
order by 1 nulls last, 2 nulls last;

-- Falhas do envio no ledger (o Resend recusou na hora; não é bounce):
-- select ok, http_status, count(*) from email_send_log where kind = 'volta_1211' group by 1, 2;
