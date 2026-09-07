-- ═══ G5 — O FUNIL DA PONTE, AS TRÊS ORIGENS ════════════════════════════════
-- Ciclo gpt-loja, 06-07/09/2026. Cada consulta é independente; rode a que
-- responde a pergunta que você tem.
--
-- As três origens vivem no campo `channel` de `gpt_handoffs`:
--   gpt_store      = a Action do GPT (POST /api/gpt/handoff)
--   paste_page     = a caixa "cole o roteiro" da página /chatgpt
--   assistant_link = o deep link GET /make, que qualquer assistente escreve
--
-- ⚠ LEIA ANTES DE CONCLUIR QUALQUER COISA: as linhas de 06-07/09 incluem as
-- sondas desta madrugada (roteiros de teste, sem pessoa). Corte por
-- `viewed_at is not null` ou cruze com evento de navegador antes de chamar
-- qualquer número de "adoção".

-- (1) O funil por origem e por dia.
select
  created_at::date                                as dia,
  channel,
  count(*)                                        as handoffs_criados,
  count(viewed_at)                                as abriram_o_go,
  count(*) filter (where clicked_at is not null)  as clicaram_make_this_video
from gpt_handoffs
group by 1, 2
order by 1 desc, 3 desc;

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
