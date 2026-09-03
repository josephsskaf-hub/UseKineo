# SPRINT ASSINATURAS — 03/09/2026 → 04/09/2026 (janela de 24h)

> Diário da execução do `docs/PLANO-COWORK-ASSINATURAS-2026-09-03.md`.
> MISSÃO ÚNICA: assinaturas novas. Cadastro e vídeo são meio; assinatura é o fim.
> Marco zero: `created_at > '2026-09-03 16:00:00+00'` (13:00 BRT).
> Cada rodada lê o último `### #N` antes de escolher a jogada. Este arquivo É a
> memória entre rodadas — nenhuma delas lembra da anterior.

---

### #0 — placar de base (03/09 ~13:00 BRT, copiado do plano)

| dia | cadastros | origem dominante | vídeos | pessoas no checkout | assinou |
|---|---:|---|---:|---:|---:|
| 27/08 | 18 | chatgpt 14 | 9 | 1 | 0 |
| 28/08 | 29 | chatgpt 14 · direto 13 | 9 | 2 | 0 |
| 29/08 | 26 | chatgpt 21 | 16 | 7 | 0 |
| 30/08 | 24 | chatgpt 16 | 20 | 0 | 0 |
| 31/08 | 23 | chatgpt 13 | 15 | 1 | **1** (godofloki, Pro, chatgpt) |
| 01/09 | 24 | chatgpt 19 | 17 | 1 | 0 |
| 02/09 | **57** | **taaft 33** · chatgpt 16 | 43 | 11 | **1** (cintia, Starter, chatgpt) |
| 03/09 (parcial) | 26 | taaft 18 | 26 | 5 | 0 |

7 dias: ~230 cadastros → ~155 filmes → 28 no checkout → **2 assinaturas**.
Pagantes na vida: 12. MRR ~$120.

---

### #1 — 13:38→14:10 BRT — o nosso próprio gate de narração recusou 34 renders de ~30 pessoas em 30 dias por "faltam 2 palavras"; 24 deles tinham ≥60% de cobertura. Agora o alvo DESCE sozinho antes do custo e o filme sai.

**Placar medido no início da rodada** (externos = e-mail sem josephsskaf/usekineo/kineo.local):

| métrica | valor |
|---|---:|
| assinaturas 7d | **2** (cintia 02/09 Starter · godofloki 30/08 Pro — as duas do chatgpt) |
| cadastros 7d | 216 |
| cadastros 7d com ≥1 filme entregue | 119 (**55%**) |
| pessoas no checkout 7d | 27 |
| — checkout de **DESEJO** (tem filme) | 15 |
| — checkout de **DEFEITO** (0 filmes) | **12** |
| pagantes na vida | 12 (chatgpt 3 · taaft 4 · direto/outros 5) |
| cadastros pós-marco-zero | 0 (o marco tinha 38 min de vida) |

**Checagem zero (1h):** 0 cadastros, 0 cadastro sem crédito, 0 render preso,
0 `generation_stage_error`, 47 vídeos entregues em 24h. Nada quebrado — a rodada
podia ir direto para a jogada de maior retorno.

**O que estava errado (medido).** `narration_guard_blocked`, 30d, externos:
**34 bloqueios**. Cruzando com 14d de `generation_stage_error`: **78 bloqueios,
32 pessoas, 16 delas nunca viram um único vídeo da Kineo**. A distribuição de
cobertura (`fala ÷ alvo`) tem um degrau óbvio no próprio dado:

    94% 93% 86% 85% 84% 82% 80% 80% 78% 77% 76% 73% 71% 69% 67% 66% 63% 60%   → 24 bloqueios
    ------------------------------- degrau -------------------------------
    57% 31% 12% 9% 9% 6% 5% 5% 5% 3%                                          → 10 bloqueios

Os 24 de cima são gente que escreveu um roteiro quase do tamanho certo e levou
uma porta na cara. Os 10 de baixo são roteiros de 2 a 11 segundos de fala — ali
recusar continua sendo o certo.

**O que mudou (arquivos).**
- `lib/narrationFit.ts` (+130): função pura `autofitDown(script, requestedSeconds, {floorSeconds})`
  + constantes `MIN_AUTOFIT_DOWN_COVERAGE = 0.60`, `AUTOFIT_DOWN_FLOOR_SECONDS = 20`,
  `AUTOFIT_DOWN_FLOOR_SECONDS_HOLLYWOOD = 30`. Desce para o múltiplo de 5
  arredondado **para baixo** (FLOOR, nunca ROUND: 33s de fala → alvo 30, nunca
  35, senão o defeito renasce na 2ª tentativa) e só devolve `applied` depois de
  **verificar a régua de novo** no alvo descido.
- `app/api/generate-video-cinematic/route.ts` (+133/−20): `parseUserScript` e a
  decisão `verbatim` subiram ~900 linhas, para logo depois de `hollywoodPath`;
  `requestedDuration` congelado; `duration` desce ali — **antes** de
  `creditCostForDuration`, do fingerprint e do claim. Este é o coração da
  jogada. Evento novo `script_duration_autofit_down` com
  `credits_requested` × `credits_effective`. Dry-run e as duas respostas de
  sucesso passam a carregar `requested_duration` + `autofit_down`.
- `app/api/compose/route.ts` (+28): ponte necessária. O compose recalcula o
  custo com a duração que o **navegador** manda (o botão), não com a do claim.
  Sem a ponte, todo filme descido morreria em *"These AI clips do not match
  their signed generation"* — com todas as cenas pagas e prontas. A ponte só age
  quando o claim traz duração **menor** que o botão **e** o custo do claim bate
  exatamente com o custo dessa duração; nunca deixa o cliente esticar.
- `scripts/test-narracao-degrau.mjs` (novo, 301 linhas): **746 verificações,
  0 falhas** — inclusive lendo o `route.ts` real e provando por índice no texto
  que a descida acontece ANTES de `creditCostForDuration`.

**Por que isto é dinheiro, não higiene.** A trava vinha DEPOIS do débito. Descer
a duração ali faria a pessoa pagar 35s e receber 30s (`creditCostForDuration` é
linear nos segundos) — cobrança-surpresa, a mesma classe de erro que o
`KINEO-DURACAO-2026-08-20` existe para matar. Descendo antes do custo, custo,
claim, débito, planner, compose e resposta usam todos a mesma duração efetiva:
**zero drift financeiro**. A pessoa paga exatamente o filme que recebe.

**Para o cliente / receita.** ~16 pessoas por quinzena que hoje batem a cabeça no
gate e vão embora sem NUNCA ver um filme da Kineo passam a receber o filme. O
primeiro filme é o produto (memória de 02/09: os 4 pagantes vieram todos da
própria ideia, escrita à mão — exatamente o perfil que este gate matava).

**Decisões que tomei sozinha** (autonomia; registradas para reversão):
1. **Corte em 60% de cobertura**, não 50% nem 70%: o dado tem um abismo entre
   57% e 31%, e 0.60 fica dentro dele. Reverter a jogada INTEIRA =
   `MIN_AUTOFIT_DOWN_COVERAGE = 1.01` em `lib/narrationFit.ts`.
2. **Piso hollywood 30s, clássico 20s**: o planner hollywood trava o alvo em
   `Math.max(30, …)`; descer para 20 ali seria puxado de volta e a fala voltaria
   a faltar. Pedido de 35s com 21-29s de fala em Kling 3/H3/Omni/S25 continua no
   422 de hoje.
3. **Descida de 60s para menos de 60s é permitida** (sai do TikTok Creator
   Rewards), porque a alternativa de hoje é a pessoa não receber filme nenhum.
   Fica medida no evento: `lost_60s_floor`.

**Risco.** A ponte do compose é o ponto sensível: ela muda a duração de
composição de um claim já assinado. Está travada em três condições (só desce, o
custo tem de bater exatamente, `!isServiceFinish`) e a regra dura continua logo
abaixo. Se der ruim, o sintoma é o oposto do de hoje: filme montado com duração
menor que a assinada. Segundo risco, cosmético: os alvos descidos (30/40/50) não
existem no seletor, então a UI mostra "35s" enquanto o filme tem 30s — a resposta
já carrega `requested_duration`/`autofit_down` para o Codex usar quando quiser.

**Modelo.** Código escrito por agente **Fable** (regra do plano para A1/A3/C1).
Medição, revisão do diff, diário e entrega em Opus.

**Como medir (contra o marco zero, 03/09 16:00 UTC).**

```sql
select count(*) filter (where name='script_duration_autofit_down') as desceu,
       count(*) filter (where name='narration_guard_blocked')      as ainda_recusado
from events where created_at > '2026-09-03 16:00:00+00';
```

Meta: `narration_guard_blocked` de PRIMEIRO vídeo perto de 0, e a razão
`cadastros com ≥1 filme / cadastros` saindo de **55%** rumo aos 80% do plano.

**Próximo item.** **C1 — paywall só depois do 1º filme**: 12 dos 27 checkouts de
7d são conta com 0 filmes entregues. Achar o gatilho exato do
`upgrade_modal_opened` com `videos_ok=0` e crédito intacto, e trocar o modal por
"Make it now with Kineo 1 (fits your free credits)". Segunda maior alavanca do
plano, e também jogada de Fable.

---

### #2 — 14:00→14:50 BRT — 5 dos 6 filmes que foram MONTADOS e nunca chegaram ao cliente morreram no nosso próprio guarda de cobrança, por uma diferença de preço que não cobrava ninguém. Agora a divergência entrega o filme e vira sinal.

**Placar (SQL canônico, marco zero 03/09 16:00 UTC, contas externas):**

| métrica | valor |
|---|---:|
| cadastros pós-marco (1h de vida) | 0 |
| pessoas com filme pós-marco | 0 |
| checkout de desejo / sem filme | 0 / 0 |
| assinaturas pós-marco | 0 |
| cadastros 12h | 21 · vídeos completos 12h: 19 |

O marco tem 1 hora e a madrugada dos EUA é o vale do dia — nenhum número novo
para ler ainda. A rodada foi escolhida pelo histórico, não pelo marco.

**Checagem zero (3h):** 0 cadastros, 0 cadastro sem crédito, 0 render preso,
1 `generation_stage_error` (`resolved=false retries=0`, estágio `idle` — sem
prejuízo), 0 `narration_guard_blocked` (o #1 ainda não está em produção: falta o
clique), 5 vídeos entregues. Nada quebrado.

**O que estava errado (medido hoje, no banco).** Pares nascimento×compose na
história: **312**. Desses, **6 nunca viraram linha em `videos`** — filme montado
na Creatomate, cenas pagas na fal, cliente sem nada. E **5 dos 6 tinham custo
divergente** entre o claim de nascimento e o de compose:

| quando | pessoa | motor | nascimento | compose | filmes na vida |
|---|---|---|---:|---:|---:|
| 02/09 03:31 | wummm709 | cinematic_ai | 19 | 15 | **0** |
| 21/08 11:19 | yk5162690 | cinematic_ai | 12 | 20 | 5 |
| 21/08 07:20 | ebnother.werner | cinematic_kling | 75 | 50 | 1 |
| 21/08 05:15 | tsatsraljess | cinematic_h3 | 27 | 45 | **0** |
| 21/08 05:01 | tsatsraljess | cinematic_h3 | 27 | 45 | **0** |

O 6º (luzluzi055) tinha os custos iguais — é outra causa. Ou seja: **83% dos
filmes montados-e-descartados morreram nesta única linha de código.**

E o dado que fecha o argumento: os `stranded_composed` dos últimos 7 dias
(ks.ttk102, sinesh596, mhjyytryh, imtanvish, surajgulgulbantai, sjesubamiji,
rochilsebosslady, ayoolaoluwasegunfunmi, arif065525, godofloki, …) **todos
viraram vídeo** — o resgate normal funciona. O único que ficou para trás foi
wummm709, o do custo divergente. A classe que o cron não salva é exatamente
esta.

**Por que os dois números diferem** (investigação fechada em
`docs/BILLING-MISMATCH-2026-09-03.md`): o nascimento precifica a duração
**pedida**, o compose precifica a duração **entregue**, e o filme fecha onde a
fala termina — a régua "35/60/90 é norte, não camisa de força". A flexibilidade
que faz o filme sair melhor era o que impedia a entrega dele.

**O que mudou (arquivos).**
- `lib/cinematic/claim.ts` (+97/−2): `birth.claim.creditCost !== cost` SAIU da
  condição de recusa de `loadSettledCinematicClaimForRender`. Quando os números
  divergem, a função grava `cinematic_cost_drift` (custo dos dois lados, delta,
  duração do compose, razão do estorno, `delivered:true`) e **entrega o filme**.
  O id do evento é determinístico por (usuário, generation, render): o
  `/api/compose/status` é polido dezenas de vezes por render e sem isso um filme
  divergente encheria a tabela `events`. Escrita em `try/catch` — observabilidade
  nunca derruba entrega.
- Mesmo arquivo: o regex de 3 razões de estorno virou a constante exportada
  `CINEMATIC_DELIVERABLE_REFUND_REASONS` com as **9** que existem
  (produção emite 7: `provider_abandoned`, `explicit_pre_provider_failure`,
  `narration_too_short_no_charge`, `dry_run_no_charge`, `provider_rejected`,
  `provider_all_failed`, `provider_balance_rejected`; o código emite mais
  `provider_failed` e `stale_pending`). Razão nova continua caindo no 503 — de
  propósito: liberar entrega para um desfecho novo é decisão humana.
- `scripts/test-billing-drift.mjs` (novo, 380 linhas): **86 verificações, 0
  falhas**, compilando o `claim.ts` REAL e batendo nele com um banco de mentira
  — inclusive os dois casos de cliente de verdade (19×15 e 27×45), 20 polls
  seguidos gravando 1 linha só, `insert` explodindo sem derrubar a entrega, e as
  4 recusas que provam posse (quality, prefixo `cinematic-`, assinatura falsa,
  claim de outro usuário).

**Por que isto é dinheiro, não higiene.** O guarda alegava impedir cobrança
dobrada. Ela já era impossível por dois outros meios — `debit_video_credits` é
idempotente pela PK `render_id` e o guarda da linha em `videos` barra o segundo
débito — e nos 5 casos **o crédito já tinha sido estornado**. O guarda cobrava
100% da entrega por 0% de risco. Duas das 4 pessoas nunca viram um filme da
Kineo na vida; o primeiro filme é o produto (memória de 02/09).

**Decisões que tomei sozinha** (autonomia; reversíveis):
1. **Lista explícita em vez de `/_refunded$/` solto.** Um regex genérico
   entregaria filme em qualquer desfecho futuro sem ninguém decidir. Reverter =
   esvaziar `CINEMATIC_DELIVERABLE_REFUND_REASONS`.
2. **Incluí as duas razões `_no_charge_refunded`** (narração curta e dry-run)
   embora elas nunca cheguem aqui — sem despacho na fal não há cena, não há
   compose. Custo zero, e fecha o 503 se o fluxo mudar.
3. **O evento é gravado dentro do loader, não na rota.** A rota tem um único
   caller e o loader já tem o cliente admin; gravar ali garante que o sinal
   exista mesmo quando o resgate vier do cron, não do navegador.

**Risco.** Baixo e do lado certo: a mudança só transforma 503 em entrega. O que
prova posse continua duro e testado. `releaseCinematicClaim` **não** foi
afrouxado — claim `settled` continua exigindo `provider_*_refunded` com a mesma
referência. Se der ruim, o sintoma seria um filme entregue com custo diferente
do debitado — e é justamente isso que o `cinematic_cost_drift` passa a mostrar,
com nome e sobrenome.

**Como medir (contra o marco zero).**

```sql
select count(*) filter (where name='cinematic_cost_drift') as divergencias_entregues,
       count(distinct user_id) filter (where name='cinematic_cost_drift') as pessoas
from events where created_at > '2026-09-03 16:00:00+00';
```

Meta: `cinematic_cost_drift` > 0 com `videos` correspondente existindo, e ZERO
novo par nascimento×compose sem linha em `videos` por custo divergente.

**Achado grande de graça (não é código, é clique).** A rota
`/api/admin/rescue-composed-films` (#18, construída em 02/09 exatamente para o
caso do wummm709) **nunca foi executada**: `rescued_film_persisted` = 0 eventos
na história. Os 6 filmes perdidos são precisamente os candidatos dela — todos
têm `credits_refunded` com razão `cinematic_abandoned_no_delivery`. Ela é
dry-run por padrão e pergunta à Creatomate se o arquivo ainda existe antes de
qualquer coisa. Está na lista ✅ desta rodada.

**Próximo item.** **B2 — preâmbulo do ChatGPT descartado antes de virar filme**
(P, jogada minha): "Absolutely. Below is a complete content package…" ainda vira
narração e tema de e-mail (7 dos 25 momentum de 02/09 tinham instrução como
tema). Filtro determinístico no `finished_script` e no `momentumTopic`. É o
canal que traz os 3 últimos assinantes — cada preâmbulo que vira fala é um
primeiro filme estragado do único canal que converte. Depois dele, A3 (série).

**Modelo.** Feita em Opus (A2 não é jogada de Fable pelo plano). Medição, código,
teste, diário e entrega na mesma sessão.
