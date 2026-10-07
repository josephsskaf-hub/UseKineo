-- ═══ LEITURA DO TESTE DE ANÚNCIO POR MOTOR (Google Search) — KINEO-ANUNCIO-MOTOR-2026-10-07 ═══════════════════════
-- Só SELECT. Supabase cqqukkvjjrguayiyjvhh. Doc: docs/ANUNCIO-GOOGLE-MOTORES-2026-10-07.md
--
-- O QUE DEVOLVE: uma linha por grupo de anúncio (utm_campaign = motor-<grupo>) e uma linha TOTAL, com
--   visitas (sessões de navegador que pousaram vindas do anúncio) · cadastros (contas criadas na janela) ·
--   checkout aberto (pessoas que abriram a Stripe, convidado incluído) · pagantes e receita.
-- Custo por pagante = gasto do grupo no Google Ads ÷ pagantes desta consulta (o gasto não mora no nosso banco).
--
-- COMO UMA PESSOA ENTRA NUM GRUPO (qualquer toque na janela; quem tocou dois grupos conta nos dois, e uma vez no TOTAL):
--   1. evento do navegador com metadata.utm_campaign do grupo (todo evento da aba leva os utm_* — lib/analytics.ts);
--   2. evento de checkout ou payment_success com metadata.paid_utm_campaign do grupo (cookie do clique pago, 90 dias —
--      lib/growth/paidClickAttribution.ts; cobre quem clicou, saiu e voltou outro dia, inclusive na compra sem login);
--   3. perfil com signup_utm_campaign do grupo (primeiro toque, cookie kineo_src);
--   4. qualquer conta vista na MESMA sessão de navegador de um toque (1) ou (2).
-- Contas da casa ficam fora (lista de lib/internalAccounts.ts). O trial de cartão de US$ 1 não conta como pagante.
--
-- PARA LER: troque só a janela em `params` (início = dia em que a campanha foi publicada; fim = início + 7 dias; para dar
-- tempo à compra do dia 7, rode de novo 48 h depois do fim com o mesmo início e fim + 2 dias).
-- CONTROLE POSITIVO (prova que a consulta conta): padrao = 'reddit%', inicio = '2026-09-08', fim = '2026-09-22'
-- devolve a campanha reddit_sep09 (1.016 sessões em setembro).

with params as (
  select
    'motor-%'::text                         as padrao,  -- utm_campaign do teste
    (now() - interval '7 days')::timestamptz as inicio,  -- ex.: '2026-10-08 00:00-03'::timestamptz
    now()::timestamptz                       as fim      -- ex.: '2026-10-15 00:00-03'::timestamptz
),
grupos_esperados(grupo, nome) as (
  values
    ('motor-seedance-2-5', 'Seedance 2.5'),
    ('motor-kling-3',      'Kling 3'),
    ('motor-veo-3-1',      'Veo 3.1'),
    ('motor-3-em-1',       'Seedance + Kling + Veo in one app')
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
-- linhas de checkout e de pagamento, cada uma com TODOS os grupos que a explicam
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

-- ═══ CONFERÊNCIA DO URL FINAL (rodar no dia 1, depois de abrir cada URL final no navegador) ═══════════════════════
-- Cada grupo tem de aparecer com o utm_campaign certo. Linha com gclid e SEM utm_campaign = anúncio com URL final sem
-- os parâmetros (o clique entra no TOTAL do Google, mas não no grupo): corrigir o URL final no Google Ads.
select coalesce(lower(metadata->>'utm_campaign'), '(sem utm_campaign)') as utm_campaign,
       lower(metadata->>'utm_source') as utm_source, lower(metadata->>'utm_medium') as utm_medium,
       path, count(distinct session_id) as sessoes, count(*) filter (where metadata ? 'gclid') as com_gclid,
       max(created_at) as ultima
from events
where name = 'landing_session_started' and created_at > now() - interval '24 hours'
  and (lower(metadata->>'utm_campaign') like 'motor-%' or metadata ? 'gclid')
group by 1, 2, 3, 4
order by ultima desc;
