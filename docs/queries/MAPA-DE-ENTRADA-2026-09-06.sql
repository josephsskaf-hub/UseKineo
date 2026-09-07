-- ═══════════════════════════════════════════════════════════════════════════
-- MAPA DE ENTRADA — de onde vem cada pessoa e por qual PÁGINA ela entrou
-- Ciclo de aquisição de 06/09/2026. Rode isto em vez de reconstruir a junção.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- POR QUE ESTE ARQUIVO EXISTE: eu montei este mapa à mão em 06/09 e ERREI na
-- primeira versão — contei SESSÕES em vez de PESSOAS, e uma visitante que abriu
-- três abas em 92 segundos virou "3 cadastros, 3 filmes, 3 checkouts e 3
-- pagamentos, 100% de conversão" numa página que na verdade tinha UMA pessoa.
-- A consulta abaixo é a versão deduplicada. Quem for refazer o mapa: use esta,
-- não reescreva a junção.
--
-- AS DUAS FONTES E POR QUE AS DUAS SÃO NECESSÁRIAS:
--   · `events.landing_session_started` sabe a PÁGINA de entrada (`path`) — o
--     perfil não guarda isso em coluna nenhuma;
--   · `profiles.signup_utm_source` / `signup_referrer` sabem a FONTE com muito
--     mais cobertura que o evento (o ChatGPT suprime o `Referer` e cola o
--     nosso próprio `?utm_source=chatgpt`, então 108 de 188 chegadas do
--     ChatGPT são invisíveis pelo referrer do evento).
--   Desde o commit 5411b6be (06/09) o evento também grava `utm_source`,
--   `surface`, `source` e `source_known` — a partir daí dá para medir o
--   ANÔNIMO por página, não só quem fez conta.
--
-- ⚠️ A JUNÇÃO SÓ CONTA CADASTRO NOVO: `profiles.created_at >= pouso - 10 min`.
-- Sem essa condição, todo login de cliente antigo entra como "cadastro" na
-- página onde ele reabriu o site (tipicamente `/studio`), e o mapa mente.

-- ── PARÂMETRO ──────────────────────────────────────────────────────────────
-- Troque a janela aqui. Para medir o efeito de uma entrega, use o MARCO do
-- ciclo em vez de "últimos N dias":
--   marco do ciclo de 06/09 = '2026-09-06 23:38:00+00'::timestamptz

with janela as (
  select (now() - interval '14 days') as desde
),

-- Primeiro pouso de cada sessão: página e fonte declarada pelo evento.
pouso as (
  select
    e.session_id,
    min(e.created_at)                                                as t0,
    (array_agg(e.path              order by e.created_at))[1]        as landing_path,
    (array_agg(e.metadata->>'referrer_host' order by e.created_at))[1] as referrer_host,
    -- campos que só existem a partir de 5411b6be (06/09); nulos antes disso
    (array_agg(e.metadata->>'source'       order by e.created_at))[1] as source_evento,
    (array_agg(e.metadata->>'source_known' order by e.created_at))[1] as source_known
  from events e, janela j
  where e.name = 'landing_session_started'
    and e.created_at > j.desde
  group by e.session_id
),

-- A quem essa sessão pertenceu (primeiro user_id visto DEPOIS do pouso).
dono as (
  select p.*,
         (select e.user_id
            from events e
           where e.session_id = p.session_id
             and e.user_id is not null
             and e.created_at >= p.t0
           order by e.created_at
           limit 1) as uid
  from pouso p
),

-- UMA linha por PESSOA, no PRIMEIRO pouso dela. É aqui que a deduplicação
-- acontece — sem o `distinct on`, quem abre três abas conta três vezes.
pessoa as (
  select distinct on (pr.id)
    pr.id  as uid,
    d.landing_path,
    d.t0,
    case
      when pr.signup_utm_source = 'chatgpt'
        or pr.signup_referrer ilike '%chatgpt%'              then 'chatgpt'
      when pr.signup_utm_source = 'taaft'
        or pr.signup_referrer ilike '%theresanaiforthat%'    then 'taaft'
      when pr.signup_referrer ilike '%google%'
        or pr.signup_referrer ilike '%bing%'
        or pr.signup_referrer ilike '%duckduckgo%'
        or pr.signup_referrer ilike '%brave%'
        or pr.signup_referrer ilike '%yahoo%'                then 'busca'
      when pr.signup_utm_source is null
       and pr.signup_referrer   is null                      then '(sem fonte)'
      else coalesce(pr.signup_utm_source, pr.signup_referrer)
    end as src
  from dono d
  join profiles pr
    on pr.id = d.uid
   -- só cadastro NOVO: ver o aviso no cabeçalho
   and pr.created_at >= d.t0 - interval '10 minutes'
  order by pr.id, d.t0
)

select
  landing_path                                                        as pagina_de_entrada,
  count(*)                                                            as pessoas,
  count(*) filter (where src = 'chatgpt')                             as chatgpt,
  count(*) filter (where src = 'taaft')                               as taaft,
  count(*) filter (where src = 'busca')                               as busca,
  count(*) filter (where src = '(sem fonte)')                         as sem_fonte,
  count(*) filter (
    where (select count(*) from videos v where v.user_id = pessoa.uid) >= 1)  as fez_filme,
  count(*) filter (
    where (select count(*) from videos v where v.user_id = pessoa.uid) >= 2)  as segundo_filme,
  count(*) filter (
    where exists (select 1 from events e
                   where e.user_id = pessoa.uid and e.name = 'checkout_started')) as checkout,
  count(*) filter (
    where exists (select 1 from events e
                   where e.user_id = pessoa.uid and e.name = 'payment_success')) as pagou
from pessoa
group by 1
order by pessoas desc;

-- ═══════════════════════════════════════════════════════════════════════════
-- CONSULTA IRMÃ — o que cada motor de resposta CITA de nós (inclui quem NÃO
-- fez conta, que é o denominador; a consulta de cima só enxerga cadastro).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- select path,
--        count(*) sessoes,
--        count(*) filter (where coalesce(metadata->>'referrer_host','') = 'chatgpt') de_chatgpt,
--        count(*) filter (where coalesce(metadata->>'referrer_host','') in
--              ('google','bing.com','duckduckgo.com','search.brave.com','yandex.ru')) de_busca
--   from events
--  where name = 'landing_session_started'
--    and created_at > now() - interval '14 days'
--  group by 1
-- having count(*) >= 4
--  order by sessoes desc;
--
-- ═══════════════════════════════════════════════════════════════════════════
-- COBERTURA DA ATRIBUIÇÃO — quanto do tráfego anônimo tem fonte conhecida.
-- Só faz sentido para eventos posteriores a 5411b6be (06/09 ~23:50 UTC).
-- Linha de base antes da correção: 40 de 320 em 24h = 12,5%. Alvo: >70%.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- select count(*)                                                   sessoes,
--        count(*) filter (where metadata ? 'source_known')          instrumentadas,
--        count(*) filter (where (metadata->>'source_known') = 'true') com_fonte
--   from events
--  where name = 'landing_session_started'
--    and created_at > '2026-09-06 23:38:00+00'::timestamptz;
