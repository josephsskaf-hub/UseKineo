-- ═══ G5 — O FUNIL DA PONTE, AS TRÊS ORIGENS ════════════════════════════════
-- Ciclo gpt-loja, 06-07/09/2026. Cada consulta é independente; rode a que
-- responde a pergunta que você tem.
--
-- As três origens vivem no campo `channel` de `gpt_handoffs`:
--   gpt_store      = a Action do GPT (POST /api/gpt/handoff)
--   paste_page     = a caixa "cole o roteiro" da página /chatgpt
--   assistant_link = o deep link GET /make, que qualquer assistente escreve
--
-- ⚠ LEIA ANTES DE CONCLUIR QUALQUER COISA: as linhas de 06-07/09 são TODAS
-- sondas desta madrugada (roteiros de teste, sem pessoa). Separá-las não é
-- opcional: sem isso a primeira leitura orgânica nasce somada a 16 ensaios e
-- o número se parece com adoção.
--
-- ═══ COMO SE SEPARA A SONDA DA PESSOA — e por que NÃO é por horário ════════
-- A tentação (e o erro que esta casa já cometeu duas vezes em 07/09: uma em
-- PONTE-COM-PRECO-2026-09-07.sql, outra no fechamento deste ciclo) é cravar um
-- `created_at > '<hora>Z'` depois do fim das sondas. Dois defeitos:
--   1. a hora costuma sair do relógio errado. O Git Bash desta máquina não tem
--      tzdata: `TZ=America/Sao_Paulo date` devolve UTC rotulado GMT, 3h
--      adiantado. Foi assim que o fechamento deste ciclo mandou a próxima
--      sessão cortar em `2026-09-07 07:00Z` — instante que, quando o texto foi
--      escrito, ainda estava 8 MINUTOS NO FUTURO. Rodada como está, a consulta
--      devolve zero por aritmética pura e se lê como "ninguém veio".
--   2. mesmo com a hora certa, o corte joga fora qualquer visitante real que
--      tenha chegado DURANTE a construção — e a ponte está no ar desde
--      00:15 UTC de 07/09.
--
-- O separador honesto é a ORIGEM, não o relógio. Medido em 07/09 06:52 UTC, as
-- 16 linhas existentes vêm de exatamente DOIS `ip_hash`:
--   67fc14c5…321e0d  → 15 linhas, 3 canais, 00:15–06:30 UTC. É esta máquina
--                      (todas as sondas de curl e de navegador da madrugada,
--                      inclusive as duas que usam UA de Chrome comum para
--                      atravessar o filtro de robô — por isso filtrar por
--                      `user_agent` NÃO funciona aqui).
--   04b85231…410625  → 1 linha, 02:45 UTC, UA `ChatGPT-User/1.0`: a Action
--                      chamada de dentro do editor de GPT da OpenAI. Também é
--                      ensaio, mas de outro lugar — é a prova de que o endpoint
--                      responde à infraestrutura da OpenAI, não só ao curl.
-- Quem acrescentar sonda nova: acrescente o hash às duas listas abaixo. Não
-- troque por corte de hora.

-- (1) O funil por origem e por dia, com a sonda separada da pessoa.
--     `origem` é a primeira coluna a ler: enquanto só houver `sonda`, não há
--     nada a concluir sobre adoção — e isso é um estado honesto, não um
--     fracasso. A ponte ganhou plateia no dia em que aparecer `organico`.
with sondas(ip_hash) as (
  values ('67fc14c5443b51680991b631ce1a7ec3aa53386b95a5c76a4e386f6d77321e0d'),
         ('04b852318d49a58963ac5a5303af0e4cbf8725197864c53dc9df553730410625')
)
select
  h.created_at::date                                           as dia,
  case when s.ip_hash is null then 'organico' else 'sonda' end as origem,
  h.channel,
  count(*)                                                     as handoffs_criados,
  count(h.viewed_at)                                           as abriram_o_go,
  count(*) filter (where h.clicked_at is not null)             as clicaram_make_this_video
from gpt_handoffs h
left join sondas s on s.ip_hash = h.ip_hash
group by 1, 2, 3
order by 1 desc, 2, 4 desc;

-- (1b) A pergunta de uma linha: JÁ VEIO ALGUÉM? Rode esta ANTES de qualquer
--      outra. Não tem corte de tempo nenhum, então não tem como devolver zero
--      por aritmética — só por ausência de gente, que é o que se quer saber.
select
  count(*)                                          as handoffs_organicos,
  count(*) filter (where h.viewed_at  is not null)  as abriram_o_go,
  count(*) filter (where h.clicked_at is not null)  as clicaram,
  min(h.created_at)                                 as primeiro,
  max(h.created_at)                                 as ultimo
from gpt_handoffs h
where h.ip_hash is null
   or h.ip_hash not in (
     '67fc14c5443b51680991b631ce1a7ec3aa53386b95a5c76a4e386f6d77321e0d',
     '04b852318d49a58963ac5a5303af0e4cbf8725197864c53dc9df553730410625'
   );

-- (2) O DESFECHO do roteiro, que passou a ser gravado no evento em 07/09
--     (commit aeb4bd39). Diz de que TAMANHO as IAs escrevem de verdade — é o
--     número que calibra o texto do prompt da página /chatgpt.
--       at_target    = enche a duração pedida
--       shorter_film = não enche, mas o servidor desce o alvo e entrega
--       too_short    = recusado na porta (desde 07/09 não vira link)
select
  created_at::date                as dia,
  metadata->>'outcome'            as desfecho,
  count(*)                        as n
from events
where name in ('gpt_handoff_created', 'paste_handoff_created')
  and created_at > now() - interval '30 days'
group by 1, 2
order by 1 desc, 3 desc;

-- (3) A ponte inteira, do handoff ao dinheiro, por pessoa.
--     `gpt_handoff_created` é evento de SERVIDOR e não tem user_id: a costura
--     com a pessoa só existe a partir do clique, então o denominador honesto
--     desta consulta é quem clicou, não quem recebeu link.
with clicaram as (
  select distinct e.session_id
  from events e
  where e.name = 'gpt_landing_clicked'
    and e.created_at > now() - interval '30 days'
    and e.session_id is not null
),
pessoas as (
  select distinct e.user_id
  from events e
  join clicaram c on c.session_id = e.session_id
  where e.user_id is not null
)
select
  (select count(*) from clicaram)                                        as sessoes_que_clicaram,
  (select count(*) from pessoas)                                         as viraram_conta,
  (select count(*) from pessoas p
     where exists (select 1 from videos v where v.user_id = p.user_id))  as fizeram_filme,
  (select count(*) from pessoas p
     where exists (select 1 from events e
                   where e.user_id = p.user_id
                     and e.name = 'payment_success'))                    as pagaram;

-- (4) A porta do ChatGPT que JÁ existia (não é a ponte nova) — o funil que
--     realmente move volume hoje. Medido em 07/09, 7 dias: 119 → 74 → 64 → 49
--     filmes → 1 pagamento.
with p as (
  select distinct coalesce(user_id::text, session_id) as k, name
  from events
  where created_at > now() - interval '7 days'
    and name in ('chatgpt_welcome_banner_shown',
                 'chatgpt_quickstart_input_opened',
                 'chatgpt_quickstart_selected',
                 'chatgpt_quickstart_studio_ready')
)
select name, count(*) as pessoas
from p
group by 1
order by 2 desc;

-- (5) A PAREDE DO ROTEIRO CURTO — e a prova de que ela FECHOU.
--     Guardada aqui porque em 07/09 ela quase virou conserto por engano: uma
--     janela de 7 dias mostra "17 pessoas batendo duas vezes na mesma parede"
--     e a leitura POR DIA mostra que a rajada é toda anterior ao autofitDown
--     (03/09). Sempre rode esta, nunca só o agregado.
select
  created_at::date as dia,
  count(*) filter (where name = 'narration_guard_blocked')       as bloqueios,
  count(*) filter (where name = 'script_duration_autofit_down')  as alvos_descidos,
  count(*) filter (where name = 'script_preflight_blocked')      as preflight,
  count(*) filter (where name = 'script_expand_failed')          as expansao_falhou
from events
where created_at > now() - interval '14 days'
  and name in ('narration_guard_blocked', 'script_duration_autofit_down',
               'script_preflight_blocked', 'script_expand_failed')
group by 1
order by 1 desc;

-- (6) Tráfego por hora — a consulta que impede de escrever "não há tráfego
--     agora". A madrugada de Brasília é manhã na Europa e na Índia: medido em
--     07/09 entre 00h e 05h UTC, 8 a 21 pessoas distintas POR HORA.
select
  date_trunc('hour', created_at)                        as hora,
  count(*)                                              as eventos,
  count(distinct coalesce(user_id::text, session_id))   as pessoas
from events
where created_at > now() - interval '24 hours'
group by 1
order by 1 desc;

-- ═══════════════════════════════════════════════════════════════════════════
-- (7) A PORTA DO /chatgpt — JULGADA SO PELO CARIMBO  (KINEO-CARIMBO-CTA, #18)
-- ═══════════════════════════════════════════════════════════════════════════
-- O CTA que leva quem colou uma ORDEM de chatbot para a /chatgpt subiu por
-- volta das 02:00 BRT de 07/09. Impressoes ANTES disso existem no mesmo evento,
-- com o mesmo `version` (v2) e o mesmo `paste_shape` — e nao tinham link nenhum
-- na tela. Contar as duas juntas devolve "0 de 8" quando o denominador real e 1.
-- Corte por relogio inventa defeito; o corte certo e o CAMPO NOVO no payload.
-- PARADA: com menos de ~20 impressoes carimbadas nao ha veredito — nem para
-- matar a porta, nem para dizer que ela funciona.
select
  date_trunc('day', created_at at time zone 'America/Sao_Paulo')::date as dia,
  count(*) filter (where name = 'activation_instruction_notice_viewed')            as impressoes_com_link,
  count(distinct user_id) filter (where name = 'activation_instruction_notice_viewed') as pessoas_com_link,
  count(*) filter (where name = 'instruction_notice_cta_clicked')                  as cliques,
  count(distinct user_id) filter (where name = 'instruction_notice_cta_clicked')   as pessoas_que_clicaram
from events
where created_at > now() - interval '30 days'
  and name in ('activation_instruction_notice_viewed', 'instruction_notice_cta_clicked')
  and metadata ? 'cta_present'                    -- <- o carimbo do deploy
  and metadata->>'cta_present' = 'true'           -- <- havia link NA TELA
group by 1
order by 1 desc;

-- (7b) CONTROLE do mesmo recorte: quantas impressoes ficaram DE FORA por nao
-- terem o carimbo. Se este numero nao parar de crescer, o bundle novo nao
-- chegou a producao — e a leitura de (7) continua sem denominador.
select
  count(*) filter (where metadata ? 'cta_present')      as carimbadas,
  count(*) filter (where not (metadata ? 'cta_present')) as sem_carimbo,
  to_char(max(created_at) filter (where metadata ? 'cta_present') at time zone 'America/Sao_Paulo',
          'DD/MM HH24:MI')                               as ultima_carimbada
from events
where name = 'activation_instruction_notice_viewed'
  and created_at > now() - interval '30 days';
