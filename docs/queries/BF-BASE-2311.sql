-- KINEO-BF-BASE-2311 — carta da semana da Black Friday para a base (só leitura; Supabase cqqukkvjjrguayiyjvhh).
-- Rota: /api/admin/send-bf-base-2311 · regra pura: lib/lifecycle/bfBase2311.ts · selo: events.name = 'bf_base_2311_sent'
-- (metadata: campaign, arm 'a'|'b', ok true|false|null, http_status, resend_id). ok = true é envio aceito pelo Resend.
-- Chegada = qualquer evento da pessoa com metadata.utm_campaign = 'bf_base_2311' depois do envio (o site carimba a utm em todo
-- evento da visita). utm_content = arm_a | arm_b diz por qual link ela veio.

-- ═══ 1. MEDIÇÃO POR METADE: enviados → visitas com a utm → checkouts abertos → pagamentos (cada pessoa conta 1 vez por coluna) ═══
with enviados as (
  select user_id, min(created_at) t, min(metadata->>'arm') arm
  from events
  where name = 'bf_base_2311_sent' and (metadata->>'ok') = 'true'
  group by 1
),
visita as (
  select distinct e.user_id
  from events e join enviados s on s.user_id = e.user_id
  where e.metadata->>'utm_campaign' = 'bf_base_2311' and e.created_at >= s.t
),
checkout as (
  select distinct e.user_id
  from events e join enviados s on s.user_id = e.user_id
  where e.name in ('checkout_started', 'bf2026_checkout_started') and e.created_at >= s.t
),
pagou as (
  select distinct e.user_id
  from events e join enviados s on s.user_id = e.user_id
  where e.name = 'payment_success' and e.created_at >= s.t
)
select s.arm,
  count(*)                                                              as enviados,
  count(v.user_id)                                                      as visitas_com_utm,
  round(100.0 * count(v.user_id) / nullif(count(*), 0), 1)              as pct_visita,
  count(c.user_id)                                                      as checkouts_abertos,
  count(p.user_id)                                                      as pagamentos,
  round(100.0 * count(p.user_id) / nullif(count(*), 0), 2)              as pct_pagou,
  count(*) filter (where exists (select 1 from profiles pr where pr.id = s.user_id and pr.email_opted_out
                                   and pr.email_opted_out_at > s.t))    as descadastrou
from enviados s
left join visita v on v.user_id = s.user_id
left join checkout c on c.user_id = s.user_id
left join pagou p on p.user_id = s.user_id
group by rollup (s.arm)
order by 1 nulls last;

-- Visita pelo link de OUTRA metade (alguém encaminhou ou clicou depois): conferir por utm_content.
-- select s.arm, e.metadata->>'utm_content' veio_por, count(distinct e.user_id)
-- from events e join (select user_id, min(created_at) t, min(metadata->>'arm') arm from events
--                     where name = 'bf_base_2311_sent' and (metadata->>'ok') = 'true' group by 1) s on s.user_id = e.user_id
-- where e.metadata->>'utm_campaign' = 'bf_base_2311' and e.created_at >= s.t group by 1, 2 order by 1, 2;

-- Recusas do Resend e selos sem envio (ok false/null): a pessoa não recebe de novo — conferir antes de qualquer reenvio.
-- select metadata->>'arm' arm, metadata->>'ok' ok, metadata->>'http_status' http, count(*)
-- from events where name = 'bf_base_2311_sent' group by 1, 2, 3 order by 1, 2, 3;
-- select ok, http_status, count(*) from email_send_log where kind = 'bf_base_2311' group by 1, 2;

-- ═══ 2. ENSAIO (o mesmo filtro da rota, em SQL, para conferir o JSON do dry-run) ═══════════════════════════════════════════
-- A metade (a/b) é um hash FNV-1a + murmur do id em TypeScript (bfBaseMetade) e não se reproduz aqui: a contagem por metade sai
-- só do JSON da rota. Este SQL confere o total e cada trava. A casa: lista EXATA de lib/internalAccounts.ts INTERNAL_EXACT_EMAILS
-- (copiada abaixo; se a lista mudar, a rota segue o código e este SQL precisa ser atualizado) e o domínio usekineo.com.
with base as (
  select p.id, lower(trim(p.email)) email, p.email_opted_out, p.has_paid, p.stripe_subscription_id, p.paypal_subscription_id,
         upper(trim(coalesce(nullif(trim(p.signup_country), ''), p.last_country))) pais
  from profiles p
),
marcado as (
  select b.*,
    case
      when b.email is null or b.email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then 'sem_email'
      when b.email in ('josephsskaf@gmail.com', 'josephskaf@hotmail.com', 'victoriaskaf96@gmail.com', 'joseph+teste01@gmail.com',
                       'teste01@shortsforgeai.com') or b.email ~ '@([a-z0-9-]+\.)*usekineo\.com$' then 'casa'
      when b.pais is null or b.pais not in ('US','GB','CA','AU','DE','FR','NL','SE','NO','DK','CH','IE','NZ','AT','BE','FI','ES','IT',
                                            'JP','SG','AE','IL','KR') then 'pais_fora'
      when b.email_opted_out is true then 'saiu'
      when b.has_paid is distinct from false or coalesce(trim(b.stripe_subscription_id), '') <> ''
           or coalesce(trim(b.paypal_subscription_id), '') <> ''
           or exists (select 1 from events e where e.user_id = b.id and e.name = 'payment_success') then 'pagou'
      when not exists (select 1 from videos v where v.user_id = b.id and v.status = 'completed') then 'sem_filme'
      when exists (select 1 from events e where e.user_id = b.id and e.name = 'bf_base_2311_sent') then 'ja_recebeu_esta'
      when exists (select 1 from email_send_log l where l.user_id = b.id and l.ok and l.yielded is not true
                     and l.sent_at > now() - interval '7 days')
        or exists (select 1 from trial_emails_log t where t.user_id = b.id and t.sent_at > now() - interval '7 days') then 'email_7d'
      else 'elegivel'
    end trava
  from base b
)
select trava, count(*) from marcado group by 1 order by 1;
-- Diferenças esperadas contra o JSON: a rota tira e-mail repetido (email_repetido) e soma a supressão da casa de 168 h, que lê
-- também carimbos de profiles e de events (lib/lifecycle/suppression.ts); por isso 'email_7d' da rota pode ser maior que o daqui.
