-- ═══ LEITURA DO TESTE NO GOOGLE SEARCH (US$ 10/dia × 7) — KINEO-GOOGLE-ADS-TESTE-0111 ═══════════════════════════════════
-- Só SELECT. Supabase cqqukkvjjrguayiyjvhh. Doc: docs/GOOGLE-ADS-TESTE-2026-11-01.md
-- Mesma lógica da leitura de 07/10 (docs/queries/ANUNCIO-MOTOR-LEITURA-2026-10-07.sql, com controles positivos que
-- contaram certo: reddit_sep09 e seo_engine_seedance), trocando o padrão para gs_<grupo>.
--
-- O QUE DEVOLVE: uma linha por grupo (utm_campaign gs_kling4 / gs_seedance / gs_veo) e uma linha TOTAL:
--   visitas (sessões que pousaram vindas do anúncio) · cadastros (contas criadas na janela) · checkout aberto (convidado
--   incluído) · pagantes e receita. Custo por cadastro/pagante = gasto do grupo no Google Ads ÷ esta consulta.
--
-- COMO UMA PESSOA ENTRA NUM GRUPO (qualquer toque na janela):
--   1. evento do navegador com metadata.utm_campaign gs_* (todo evento da aba leva os utm_* — lib/analytics.ts);
--   2. evento de checkout/payment_success com metadata.paid_utm_campaign gs_* (cookie do clique pago, 90 dias);
--   3. perfil com signup_utm_campaign gs_* (primeiro toque; e, desde KINEO-GOOGLE-ADS-TESTE-0111, também o clique pago
--      quando o primeiro toque não tinha utm — app/api/track-signup-source/route.ts);
--   4. qualquer conta vista na MESMA sessão de navegador de um toque (1) ou (2).
-- Contas da casa ficam fora. O trial de cartão de US$ 1 não conta como pagante.
--
-- PARA LER: troque só a janela em `params` (início = dia em que a campanha começou a gastar; fim = início + 7 dias). Rode de
-- novo 48 h depois do fim (fim + 2 dias): a compra costuma chegar em até 48 h.

with params as (
  select
    'gs\_%'::text                            as padrao,  -- utm_campaign do teste (o \_ é o "_" literal)
    (now() - interval '7 days')::timestamptz as inicio,  -- ex.: '2026-11-03 00:00-03'::timestamptz
    now()::timestamptz                       as fim      -- ex.: '2026-11-10 00:00-03'::timestamptz
),
grupos_esperados(grupo, nome) as (
  values
    ('gs_kling4',   'Kling 4.0'),
    ('gs_seedance', 'Seedance'),
    ('gs_veo',      'Veo 3 alternative / premium AI video')
),
internos as (
  select p.id
  from profiles p
  where lower(p.email) in ('josephsskaf@gmail.com', 'josephskaf@hotmail.com', 'victoriaskaf96@gmail.com',
                           'joseph+teste01@gmail.com', 'teste01@shortsforgeai.com')
     or lower(p.email) like 'josephsskaf+%@gmail.com' or lower(p.email) like 'joseph+%'
     or lower(p.email) like 'victoriaskaf%'          or lower(p.email) like '%@theresanaiforthat.com'
     or lower(p.email) like 'josephsskaf%'           or lower(p.email) like 'josephskaf%'
     or lower(p.email) like '%@shortsforgeai.com'    or lower(p.email) like 'test%'
     or lower(p.email) like '%mailinator%'           or lower(p.email) like 'smoketest%'
),
janela as (
  select e.*
  from events e, params
  where e.created_at >= params.inicio and e.created_at < params.fim
),
toque_navegador as (   -- (1)
  select lower(j.metadata->>'utm_campaign') as grupo, j.session_id, j.user_id, j.name
  from janela j, params
  where lower(j.metadata->>'utm_campaign') like params.padrao
),
toque_pago as (        -- (2)
  select lower(j.metadata->>'paid_utm_campaign') as grupo, j.session_id, j.user_id
  from janela j, params
  where lower(j.metadata->>'paid_utm_campaign') like params.padrao
),
sessoes as (
  select grupo, session_id from toque_navegador where session_id is not null
  union
  select grupo, session_id from toque_pago where session_id is not null
),
pessoas as (
  select grupo, user_id from toque_navegador where user_id is not null
  union
  select grupo, user_id from toque_pago where user_id is not null
  union                                                                  -- (3)
  select lower(p.signup_utm_campaign), p.id
  from profiles p, params
  where lower(p.signup_utm_campaign) like params.padrao
  union                                                                  -- (4)
  select s.grupo, j.user_id
  from sessoes s
  join janela j on j.session_id = s.session_id and j.user_id is not null
),
grupos as (
  select grupo, nome from grupos_esperados
  union
  select distinct s.grupo, '(fora da lista: conferir o URL final)' from sessoes s
  where not exists (select 1 from grupos_esperados g where g.grupo = s.grupo)
),
checkout_grupo as (
  select distinct g.grupo, c.id,
         coalesce(c.user_id::text, c.session_id, c.metadata->>'stripe_session_id') as quem,
         coalesce((c.metadata->>'guest_checkout')::boolean, false) as convidado
  from janela c
  join lateral (
    select lower(c.metadata->>'paid_utm_campaign') as grupo
    union select s.grupo from sessoes s where s.session_id = c.session_id
    union select pe.grupo from pessoas pe where pe.user_id = c.user_id
  ) g on g.grupo like (select padrao from params)
  where c.name = 'checkout_started'
    and not exists (select 1 from internos i where i.id = c.user_id)
),
pagamento_grupo as (
  select distinct g.grupo, pg.id,
         coalesce(pg.user_id::text, pg.metadata->>'stripe_session_id') as quem,
         case when lower(coalesce(pg.metadata->>'currency', 'usd')) = 'usd'
              then coalesce((pg.metadata->>'amount_total')::numeric, 0) / 100 else 0 end as usd
  from janela pg
  join lateral (
    select lower(pg.metadata->>'paid_utm_campaign') as grupo
    union select s.grupo from sessoes s where s.session_id = pg.session_id
    union select pe.grupo from pessoas pe where pe.user_id = pg.user_id
  ) g on g.grupo like (select padrao from params)
  where pg.name = 'payment_success'
    and coalesce((pg.metadata->>'card_trial')::boolean, false) = false
    and not exists (select 1 from internos i where i.id = pg.user_id)
),
cadastro_grupo as (
  select distinct pe.grupo, p.id
  from pessoas pe
  join profiles p on p.id = pe.user_id, params
  where p.created_at >= params.inicio and p.created_at < params.fim
    and not exists (select 1 from internos i where i.id = p.id)
),
por_grupo as (
  select
    g.grupo,
    g.nome,
    (select count(distinct t.session_id) from toque_navegador t
      where t.grupo = g.grupo and t.name = 'landing_session_started')                     as visitas,
    (select count(*) from cadastro_grupo c where c.grupo = g.grupo)                       as cadastros,
    (select count(distinct c.quem) from checkout_grupo c where c.grupo = g.grupo)          as checkout_aberto,
    (select count(distinct c.quem) from checkout_grupo c where c.grupo = g.grupo and c.convidado) as checkout_convidado,
    (select count(distinct p.quem) from pagamento_grupo p where p.grupo = g.grupo)         as pagantes,
    (select round(coalesce(sum(p.usd), 0), 2) from pagamento_grupo p where p.grupo = g.grupo) as receita_usd
  from grupos g
)
select grupo, nome, visitas, cadastros, checkout_aberto, checkout_convidado, pagantes, receita_usd
from (
  select 1 as ordem, * from por_grupo
  union all
  select 2, 'TOTAL', '(pessoas distintas)',
    (select count(distinct t.session_id) from toque_navegador t where t.name = 'landing_session_started'),
    (select count(distinct c.id) from cadastro_grupo c),
    (select count(distinct c.quem) from checkout_grupo c),
    (select count(distinct c.quem) from checkout_grupo c where c.convidado),
    (select count(distinct p.quem) from pagamento_grupo p),
    (select round(coalesce(sum(x.usd), 0), 2) from (select distinct id, usd from pagamento_grupo) x)
) leitura
order by ordem, grupo;

-- ═══ CONFERÊNCIA DO URL (dia 1, depois de abrir cada URL de pouso no navegador) ═══════════════════════════════════════
-- Cada grupo tem de aparecer com o utm_campaign certo e o utm_term preenchido. Linha com gclid e SEM utm_campaign = anúncio
-- com URL final sem os parâmetros: corrigir no Google Ads. utm_term = '{keyword}' literal = sufixo colado no campo errado.
select coalesce(lower(metadata->>'utm_campaign'), '(sem utm_campaign)') as utm_campaign,
       lower(metadata->>'utm_source') as utm_source, lower(metadata->>'utm_medium') as utm_medium,
       metadata->>'utm_term' as utm_term, path, count(distinct session_id) as sessoes,
       count(*) filter (where metadata ? 'gclid') as com_gclid, max(created_at) as ultima
from events
where name = 'landing_session_started' and created_at > now() - interval '24 hours'
  and (lower(metadata->>'utm_campaign') like 'gs\_%' or metadata ? 'gclid')
group by 1, 2, 3, 4, 5
order by ultima desc;

-- ═══ CADASTROS DO DIA POR GRUPO (régua de parada do dia 3: 0 cadastros em 3 dias → parar) ══════════════════════════════
select lower(signup_utm_campaign) as grupo, count(*) as cadastros, max(created_at) as ultimo
from profiles
where lower(signup_utm_campaign) like 'gs\_%' and created_at > now() - interval '3 days'
group by 1
order by 1;
