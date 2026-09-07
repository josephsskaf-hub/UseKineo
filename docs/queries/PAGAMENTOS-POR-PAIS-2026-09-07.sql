-- ═══════════════════════════════════════════════════════════════════════════
-- PAGAMENTOS POR PAÍS E POR TRILHO — ciclo de 07/09/2026
-- ═══════════════════════════════════════════════════════════════════════════
-- Este arquivo é o placar do ciclo. Três regras que ele obedece e que qualquer
-- número novo tem de obedecer também:
--
--  1. CONTA-SE GENTE, NÃO EVENTO. Uma pessoa que tenta pagar três vezes é 1 no
--     numerador, não 3. Funil agregado por evento já escondeu o degrau seco
--     aqui mais de uma vez.
--  2. O PAÍS DE UMA PESSOA É A MODA DOS PAÍSES DOS EVENTOS DELA, e o campo é
--     `coalesce(ip_country, country)`: `ip_country` só é carimbado pela rota de
--     checkout (então usá-lo sozinho reduz a base a quem já chegou ao
--     checkout, e o denominador colapsa de 86 para 20), enquanto `country` vem
--     dos eventos de navegador. Trocar um pelo outro muda a resposta.
--  3. O CORTE ANTES/DEPOIS É O CAMPO NOVO, NUNCA O RELÓGIO:
--     `metadata ? 'identity_source'` para a recusa,
--     `metadata->>'surface_version'` para a oferta regional.

-- ───────────────────────────────────────────────────────────────────────────
-- (1) O PLACAR: chegou ao checkout × pagou, por país, 30 dias.
--     Estado no marco de 07/09 15:38Z: IN 21→0 · NG 12→0 · PK 3→0 · BD 2→0 ·
--     KE 2→0 · US 10→1 · BR 5→1 · GB 2→1.
-- ───────────────────────────────────────────────────────────────────────────
with pais_por_pessoa as (
  select user_id,
         mode() within group (order by coalesce(metadata->>'ip_country', metadata->>'country')) as pais
  from events
  where created_at > now() - interval '30 days'
    and user_id is not null
    and coalesce(metadata->>'ip_country', metadata->>'country') is not null
  group by user_id
)
select pp.pais,
  count(distinct pp.user_id) as pessoas,
  count(distinct pp.user_id) filter (
    where exists (select 1 from videos v where v.user_id = pp.user_id and v.status = 'completed')
  ) as com_filme,
  count(distinct pp.user_id) filter (
    where exists (select 1 from events x where x.user_id = pp.user_id
                    and x.name in ('checkout_started', 'checkout_attempted')
                    and x.created_at > now() - interval '30 days')
  ) as no_checkout,
  count(distinct pp.user_id) filter (
    where exists (select 1 from events x where x.user_id = pp.user_id and x.name = 'payment_success')
  ) as pagou
from pais_por_pessoa pp
group by pp.pais
having count(distinct pp.user_id) >= 3
order by no_checkout desc;

-- ───────────────────────────────────────────────────────────────────────────
-- (2) POR TRILHO. Hoje só existe a Stripe; `rail` nasce com o webhook do Dodo.
--     A ausência de `rail` = Stripe, e isso é explícito para que um NULL não
--     seja lido como "trilho desconhecido" quando o Dodo entrar.
-- ───────────────────────────────────────────────────────────────────────────
select coalesce(metadata->>'rail', 'stripe') as trilho,
       coalesce(metadata->>'ip_country', metadata->>'country', '?') as pais,
       count(*) as pagamentos,
       count(distinct user_id) as pessoas,
       min(created_at) as primeiro,
       max(created_at) as ultimo
from events
where name = 'payment_success'
group by 1, 2
order by 3 desc;

-- ───────────────────────────────────────────────────────────────────────────
-- (3) A OFERTA REGIONAL TEM PLATEIA? O denominador é a parte que engana.
--     `pack_first_for_region_shown` só pode ser comparado com
--     `pricing_currency_resolved`, que o PricingClient emite no MESMO instante
--     (a mesma chamada /api/geo), para TODO visitante e com o MESMO campo
--     `country`. É o único par que dispara igual. Comparar com montagem de
--     página, com sessão ou com `checkout_started` é laranja com maçã.
--     ⚠️ Isto vale para a superfície `pricing`. A superfície `post_video` tem
--     outro denominador honesto: `trial_post_video_offer_viewed` — não misture
--     as duas num número só; é para isso que o evento carrega `surface`.
--
-- ⛔ NÃO USE `count(distinct user_id)` NESTA CONSULTA. `/pricing` é PÚBLICO:
--    o visitante deslogado grava `user_id = NULL`, e `count(distinct user_id)`
--    ignora NULL — ou seja, ele conta essas pessoas como ZERO e a peça pareceria
--    morta estando viva. Medido em 07/09 sobre 14 dias de
--    `pricing_currency_resolved`: 157 linhas, 123 com user_id, **157 com
--    session_id**; `count(distinct user_id)` = 69 e o número real de visitantes
--    é **100**. Uma subcontagem de 31% no denominador E no numerador.
--    A unidade certa é `coalesce(user_id::text, session_id)` nos dois lados.
--    (Na superfície `post_video` a rota é autenticada e os dois batem — 23 de
--    23 têm dono —, mas a mesma expressão é usada para não haver duas réguas.)
-- ───────────────────────────────────────────────────────────────────────────
select
  (select count(distinct coalesce(user_id::text, session_id)) from events
     where name = 'pricing_currency_resolved'
       and metadata->>'country' in ('IN','NG','PK','BD','KE')
       and created_at > timestamptz '2026-09-07 15:38:00+00') as denominador_pricing,
  (select count(distinct coalesce(user_id::text, session_id)) from events
     where name = 'pack_first_for_region_shown' and metadata->>'surface' = 'pricing') as viram_no_pricing,
  (select count(distinct coalesce(user_id::text, session_id)) from events
     where name = 'trial_post_video_offer_viewed'
       and created_at > timestamptz '2026-09-07 15:38:00+00') as denominador_pos_filme,
  (select count(distinct coalesce(user_id::text, session_id)) from events
     where name = 'pack_first_for_region_shown' and metadata->>'surface' = 'post_video') as viram_pos_filme,
  (select count(distinct coalesce(user_id::text, session_id)) from events
     where name = 'pack_first_for_region_clicked') as clicaram,
  (select count(*) from events
     where name = 'payment_success' and metadata->>'pack' is not null
       and created_at > timestamptz '2026-09-07 15:38:00+00') as compraram_o_pack;

-- ───────────────────────────────────────────────────────────────────────────
-- (4) ALCANCE DAS SUPERFÍCIES, por pessoa — a consulta que eu deveria ter
--     rodado ANTES de escolher onde montar. Ela responde "quem desta coorte
--     chega a ver cada tela?". Medido em 07/09 sobre 86 pessoas dos cinco
--     países: /pricing 46 · pós-filme 47 · checkout 40 · modal do "não" 11 ·
--     ponte de saldo 3. Nenhuma tela sozinha passa de 55%.
-- ───────────────────────────────────────────────────────────────────────────
with pais_por_pessoa as (
  select user_id,
         mode() within group (order by coalesce(metadata->>'ip_country', metadata->>'country')) as pais
  from events
  where created_at > now() - interval '30 days' and user_id is not null
    and coalesce(metadata->>'ip_country', metadata->>'country') is not null
  group by user_id
),
alvo as (select user_id from pais_por_pessoa where pais in ('IN','NG','PK','BD','KE'))
select
  (select count(*) from alvo) as pessoas,
  (select count(distinct a.user_id) from alvo a where exists (
     select 1 from events x where x.user_id = a.user_id
       and x.created_at > now() - interval '30 days'
       and (x.path like '/pricing%' or x.name in ('pricing_currency_resolved','pricing_viewed')))) as viram_pricing,
  (select count(distinct a.user_id) from alvo a where exists (
     select 1 from events x where x.user_id = a.user_id and x.name = 'trial_post_video_offer_viewed'
       and x.created_at > now() - interval '30 days')) as viram_pos_filme,
  (select count(distinct a.user_id) from alvo a where exists (
     select 1 from events x where x.user_id = a.user_id and x.name = 'upgrade_modal_opened'
       and x.created_at > now() - interval '30 days')) as viram_modal_do_nao;
