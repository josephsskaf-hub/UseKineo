-- ═══════════════════════════════════════════════════════════════════════════
-- FUNIL DO DEEP LINK DE ASSISTENTE (G5) — escrito e RODADO em 06/09/2026 23:5x
-- ═══════════════════════════════════════════════════════════════════════════
--
-- O QUE ISTO MEDE
--   O caminho novo: um assistente (ChatGPT/Claude/Perplexity/Gemini, ou o GPT
--   da loja quando o fundador publicar) escreve um link, a pessoa clica, cai
--   numa pagina com o roteiro e aperta um botao que abre o Studio preenchido.
--
-- A REGRA DE UNIDADE, que e o unico jeito de isto nao mentir:
--   Os tres primeiros degraus contam HANDOFFS — nao existe pessoa ainda, o
--   link nasce anonimo. Os tres ultimos contam PESSOAS. Somar os seis como se
--   fossem a mesma unidade e o erro que a memoria `funil-agregado-esconde-o-
--   degrau-seco` ja cobrou uma vez nesta casa.
--
-- A EXCLUSAO OBRIGATORIA:
--   `user_agent not like '%KineoCanary%'` tira as sondas da propria casa. Sem
--   isso eu falsifico a minha tese com o meu proprio dedo. Quem sondar o /make
--   daqui para frente usa UA identificavel — um UA de Chrome falso e
--   indistinguivel de gente e envenena a metrica para sempre.
--
-- SUJEIRA CONHECIDA E NAO REMOVIVEL (nasceu antes desta regra):
--   duas linhas `assistant_link` de 07/09 01:52 e 01:54 UTC com UA de Chrome
--   comum — uma de 31 palavras ("Lake Natron", tema de teste da casa) e outra
--   de 2 palavras. Nao sao gente. Ao ler os numeros dos primeiros dias,
--   descontar 2.


-- ───────────────────────────────────────────────────────────────────────────
-- (1) DEGRAUS 1-3 — POR HANDOFF, POR DIA E POR CANAL
--     channel: 'gpt_store' (a Action do GPT) vs 'assistant_link' (o GET /make
--     que qualquer assistente sabe escrever, sem depender da OpenAI aprovar).
-- ───────────────────────────────────────────────────────────────────────────
with h as (
  select id, token, channel, user_id, created_at, viewed_at, clicked_at, user_agent
  from gpt_handoffs
  where coalesce(user_agent, '') not like '%KineoCanary%'
)
select date_trunc('day', created_at)::date            as dia,
       channel,
       count(*)                                        as criados,
       count(*) filter (where viewed_at is not null)   as pousos_vistos,
       count(*) filter (where clicked_at is not null)  as cliques,
       count(distinct user_id)
         filter (where user_id is not null)            as pessoas_identificadas
from h
group by 1, 2
order by dia desc, channel;


-- ───────────────────────────────────────────────────────────────────────────
-- (2) DEGRAUS 4-6 — POR PESSOA
--     So entra quem o /go conseguiu identificar: o `user_id` e gravado no
--     clique COM sessao, e a coluna guarda a PRIMEIRA pessoa (o link pode ser
--     colado num grupo; sobrescrever trocaria o dono da atribuicao).
-- ───────────────────────────────────────────────────────────────────────────
with p as (
  select h.user_id, min(h.created_at) as primeiro_handoff
  from gpt_handoffs h
  where h.user_id is not null
    and coalesce(h.user_agent, '') not like '%KineoCanary%'
  group by h.user_id
)
select (select count(*) from p)                                     as pessoas_capturadas,
       (select count(*) from p join profiles pr on pr.id = p.user_id) as com_perfil,
       (select count(*) from p
         where exists (select 1 from videos v where v.user_id = p.user_id)) as com_filme,
       (select count(*) from p
         where exists (select 1 from events e
                        where e.user_id = p.user_id
                          and e.name = 'payment_success'))           as pagou;


-- ───────────────────────────────────────────────────────────────────────────
-- (3) FALSIFICACAO DA CONSULTA (2) — rodada em 06/09 23:5x
--     "0 de 0" e indistinguivel de "predicado quebrado". Esta consulta troca a
--     coorte do handoff por uma coorte que EXISTE, mantendo os MESMOS
--     predicados. Se ela vier zerada, o defeito e meu, nao do mundo.
--     RESULTADO MEDIDO EM 06/09 23:5x:
--       coorte 236 · com_perfil 236 · com_filme 157 · pagou 1
--     Ou seja: os joins funcionam. Os zeros da (2) sao ausencia real de gente,
--     nao consulta quebrada.
-- ───────────────────────────────────────────────────────────────────────────
with p as (
  select id as user_id from profiles where created_at > now() - interval '7 days'
)
select (select count(*) from p)                                     as coorte,
       (select count(*) from p join profiles pr on pr.id = p.user_id) as com_perfil,
       (select count(*) from p
         where exists (select 1 from videos v where v.user_id = p.user_id)) as com_filme,
       (select count(*) from p
         where exists (select 1 from events e
                        where e.user_id = p.user_id
                          and e.name = 'payment_success'))           as pagou;


-- ───────────────────────────────────────────────────────────────────────────
-- (4) O BURACO HONESTO DA JUNCAO POR PESSOA
--     Quem clica deslogado, se cadastra e NAO volta ao /go fica invisivel na
--     coluna user_id. O tamanho do buraco e mensuravel: compare os cadastros
--     que se declaram vindos de assistente com os que o /go conseguiu prender.
--     Se `capturados_pelo_go` ficar muito abaixo, o laco esta furando.
-- ───────────────────────────────────────────────────────────────────────────
--     RODADA EM 06/09 23:5x (5 dias): cadastros_callback 42/37/24/24/28/1 por
--     dia, voltaram_ao_go 0, capturados_pelo_go 0 — como esperado, a peca tem
--     horas de vida. A consulta ROda; os zeros sao ausencia, nao erro.
select date_trunc('day', e.created_at)::date as dia,
       count(distinct e.user_id)                                      as cadastros_callback,
       count(distinct e.user_id) filter (
         where e.metadata->>'destination_path' like '/go/%')          as voltaram_ao_go,
       count(distinct h.user_id)                                      as capturados_pelo_go
from events e
left join gpt_handoffs h
       on h.user_id = e.user_id
      and coalesce(h.user_agent, '') not like '%KineoCanary%'
where e.name = 'auth_callback_completed'
  and e.created_at > now() - interval '14 days'
group by 1
order by dia desc;


-- ───────────────────────────────────────────────────────────────────────────
-- (5) OS EVENTOS DO CAMINHO — leitura rapida de saude
--     gpt_landing_auto_forwarded so tera linha quando alguem de verdade criar
--     conta a partir de um link: e o desvio que poupa o segundo clique de quem
--     acabou de se cadastrar. Enquanto for 0 com cadastros > 0, o desvio nunca
--     foi exercido por gente.
-- ───────────────────────────────────────────────────────────────────────────
select name,
       count(*)                                          as eventos,
       count(*) filter (where (metadata->>'bot')::bool)  as marcados_bot,
       count(distinct user_id)
         filter (where user_id is not null)              as pessoas,
       max(created_at)                                   as ultimo
from events
where name in ('gpt_handoff_created', 'gpt_landing_viewed', 'gpt_landing_clicked',
               'gpt_landing_pricing_clicked', 'gpt_landing_auto_forwarded')
  and created_at > now() - interval '14 days'
group by name
order by eventos desc;


-- ───────────────────────────────────────────────────────────────────────────
-- PARADA (a condicao que mata esta aposta, registrada na #5 e na #6)
--   Menos de 10 handoffs `assistant_link` DE HUMANO (fora canario e fora as
--   duas linhas sujas de 07/09) em 14 dias = a tese "os assistentes leem o
--   llms.txt e entregam o link" esta errada, e o esforco vai para publicar o
--   GPT da loja (que depende de verificacao de dominio por DNS, mao do
--   fundador).
-- ───────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════
-- ACRESCENTADO 07/09 ~00:0x — O TERCEIRO CANAL: `paste_page`
-- ═══════════════════════════════════════════════════════════════════════════
--
-- POR QUE ELE EXISTE: a loja da OpenAI fechou para conta pessoal em 16/08/2026
-- (so workspace Business/Enterprise cria e publica GPT). O canal `gpt_store`
-- fica de pe, mas DORMENTE, ate o fundador decidir sobre o ChatGPT Business.
-- O canal `paste_page` nao depende de aprovacao de ninguem: a pagina /chatgpt
-- da o PROMPT para a pessoa colar no assistente dela e recebe o roteiro de
-- volta numa caixa. Mesma tabela, mesma pagina /go, mesmos degraus.
--
-- As consultas (1) a (4) acima JA cobrem o canal novo: elas agrupam por
-- `channel` sem lista digitada, entao `paste_page` aparece sozinho. O que
-- falta e a pergunta que so o canal novo sabe responder.


-- ───────────────────────────────────────────────────────────────────────────
-- (5) QUAL ASSISTENTE ESCREVEU O ROTEIRO — a pergunta de 57%
--     Hoje sabemos que 57% dos cadastros vem de chatgpt.com, e NADA sobre o
--     que Claude/Gemini/Perplexity representam: eles nao passam Referer que a
--     casa saiba ler. A coluna `assistant` e declarada pela propria pessoa no
--     select da /chatgpt (opcional). Se Claude ou Gemini aparecerem com peso,
--     a jogada seguinte e documentacao dirigida a eles; se nao aparecerem, o
--     esforco continua todo no ChatGPT. Ler `null` como "nenhum" seria o erro
--     da memoria `sentinela-lido-como-valor-real`: null aqui significa
--     "nao respondeu", nao "nenhum assistente".
-- ───────────────────────────────────────────────────────────────────────────
select coalesce(assistant, '(nao respondeu)')        as assistente,
       count(*)                                      as handoffs,
       count(*) filter (where clicked_at is not null) as cliques,
       round(avg(words))                             as palavras_medias,
       count(*) filter (where fit = 'short')          as roteiro_curto_demais,
       min(created_at)::date                          as primeiro,
       max(created_at)::date                          as ultimo
from gpt_handoffs
where channel = 'paste_page'
  and coalesce(user_agent, '') not like '%KineoCanary%'
group by 1
order by handoffs desc;


-- ───────────────────────────────────────────────────────────────────────────
-- (6) O DENOMINADOR DA PAGINA — quem viu, quem copiou, quem colou
--     Sem isto, "3 handoffs" e indistinguivel de "3 de 4" e de "3 de 900".
--     A memoria `zero-escritas-conte-as-oportunidades` cobra exatamente isso.
--     Os tres eventos sao emitidos pela propria /chatgpt.
-- ───────────────────────────────────────────────────────────────────────────
select date_trunc('day', created_at)::date as dia,
       count(*) filter (where name = 'chatgpt_page_viewed')    as viram_a_pagina,
       count(*) filter (where name = 'chatgpt_prompt_copied')  as copiaram_o_prompt,
       count(*) filter (where name = 'paste_handoff_created')  as colaram_roteiro,
       count(distinct session_id) filter (where name = 'chatgpt_page_viewed') as sessoes
from events
where name in ('chatgpt_page_viewed', 'chatgpt_prompt_copied', 'paste_handoff_created')
  and created_at > now() - interval '30 days'
group by 1
order by dia desc;


-- ───────────────────────────────────────────────────────────────────────────
-- (7) A COORTE QUE MANDOU CONSTRUIR A PAGINA — medida em 07/09 00:0x
--     Pessoas que colaram no Studio uma ORDEM PARA UM CHATBOT em vez de um
--     roteiro (lib/growth/instructionPasteNotice.ts, reason=
--     'prompt_looks_like_instruction'). Resultado de 14 dias, ANTES da pagina:
--       59 pessoas · 40 com ao menos 1 filme · 57 filmes · 0 PAGANTES.
--     E o teste da tese: se a /chatgpt funcionar, esta coorte encolhe e a
--     `paste_page` cresce. Rodar de novo daqui a 14 dias.
-- ───────────────────────────────────────────────────────────────────────────
with coorte as (
  select distinct user_id
  from events
  where created_at > now() - interval '14 days'
    and metadata->>'reason' = 'prompt_looks_like_instruction'
    and user_id is not null
)
select (select count(*) from coorte)                                        as pessoas,
       (select count(distinct c.user_id) from coorte c
          join videos v on v.user_id = c.user_id and v.status = 'completed') as com_filme,
       (select count(distinct c.user_id) from coorte c
          join events e on e.user_id = c.user_id and e.name = 'payment_success') as pagaram;
