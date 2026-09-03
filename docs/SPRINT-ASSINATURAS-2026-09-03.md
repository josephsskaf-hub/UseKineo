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
### #3 — 15:50→16:35 BRT — as 22 pessoas que colaram um ROTEIRO DE CINEMA do ChatGPT ouviram o narrador ler "Visual dois pontos" em voz alta. São as que mais tentam da base inteira (2,45 filmes cada contra 1,53) e vinham do único canal que converte.

**Placar (SQL canônico, marco zero 03/09 16:00 UTC, contas externas, medido 19:04 UTC):**

| métrica | valor |
|---|---:|
| cadastros pós-marco (3h de vida) | 3 |
| pessoas com filme pós-marco | 2 |
| checkout de **desejo** (tem filme) | **1** |
| checkout **sem filme** (a classe de defeito) | **0** |
| assinaturas pós-marco | 0 |
| pessoas com falha e nenhum filme | 0 |
| vídeos completos 24h | 43 |

O marco tem 3 horas. O número que já dá sinal é `checkout_sem_filme = 0` contra
12 de 27 em 7 dias — cedo demais para comemorar (3 cadastros), mas é exatamente
o indicador que o plano manda vigiar.

**Checagem zero (1h):** 0 cadastro sem crédito, 0 `generation_stage_error`,
0 `narration_guard_blocked`, 0 compose submetido sem linha em `videos`,
2 vídeos entregues. Nada quebrado — a rodada foi para a jogada de maior retorno.

**O que estava errado (medido no banco, 03/09).** Rodei `videos.topic` de 60
dias (externos) atrás do formato que o ChatGPT devolve quando alguém pede um
Short. Ele tem nome e é sempre o mesmo:

    ### Scene 1 — One Earth | 0–7 sec
    **Visual:** Earth slowly rotating in space, sunrise across continents.
    **Voice-over:**
    “Across this beautiful Earth, people speak different languages…”
    **On-screen text:**

**22 pessoas** colaram um texto assim. O parser da casa (`lib/scriptParser.ts`,
maduro, 8 correções desde o Push #235) derruba `## header`, `speed:` e linha em
MAIÚSCULAS — e deixa passar todo o resto. O narrador dessas pessoas leu, em voz
alta, a direção de arte: *"Visual: Earth slowly rotating in space, sunrise
appearing across different continents. Voice-over. Across this beautiful
Earth…"*.

**A causa mecânica, e por que ninguém tinha visto.** Todo filtro do arquivo
ancora em `^\s*`. O ChatGPT escreve `**Visual:**`, `### 🎬 Scene 1`, `> “fala”`.
O asterisco, a cerquilha e o emoji na frente do rótulo desarmam o
`DIRECTIVE_LINE` inteiro sozinhos. Por isso `style:` era filtrado desde o Push
#237 e `**Style:**` nunca foi — o mesmo rótulo, com dois asteriscos.

**Por que 22 pessoas é um número grande.** Elas fazem **2,45 filmes cada**,
contra **1,53** do resto da base na mesma janela de 60 dias (596 pessoas). São o
cliente de maior esforço que existe aqui: quem escreve um roteiro inteiro no
ChatGPT e vem colar. Elas tentam de novo porque o primeiro saiu errado — e o
ChatGPT é o canal dos 3 últimos assinantes. 1 das 22 pagou (4,5%) contra 10 de
596 (1,7%): mesmo com o produto lendo a direção de arte, esse grupo converte 2,6×
melhor que a média. É o grupo mais barato de consertar e o mais caro de perder.

**O que mudou (arquivos).**
- `lib/scriptParser.ts` (+176): cinco regras determinísticas, nenhuma chamada de
  modelo, todas atrás de `unwrapLabelHead()` — que tira `**`, `#`, `>`, `-` e
  emoji do começo da linha ANTES de qualquer teste. É a linha que faltava.
  1. **Rótulo de produção nunca é fala** (`STAGE_LABEL_LINE`, ~70 rótulos em
     4 idiomas: `Visual:`, `Camera:`, `On-screen text:`, `SFX:`, `Prompt:`,
     `Título:`, `Personagens:`, `Texto em tela:`, `Target length:`…).
  2. **Marcação de tempo nunca é fala** (`0:00–0:04`, `0–8 sec`,
     `8–18 sec — THE PROBLEM`).
  3. **Cabeçalho de cena nunca é fala** em qualquer caixa (`Scene 1 — …`,
     `Cena 2:`, `Clip 3`, `ESCENA 1`) — o filtro de MAIÚSCULAS só pegava o último.
  4. **Preâmbulo de assistente** sai do topo (`Absolutely. Below is a complete
     content package…`), junto com o índice do entregável (`Each concept
     includes: hook, 10 scenes with timing…`).
  5. **A regra que devolve o filme certo:** com **dois ou mais** rótulos de FALA
     (`Voiceover:`, `Narration:`, `Narrador:`, `Diálogo:`…), o texto É um roteiro
     de cinema — a pessoa já disse, linha por linha, o que é para falar. A
     narração passa a ser SÓ o que está sob esses rótulos, e tudo antes do
     primeiro deles (preâmbulo, ficha técnica, lista de personagens) morre.
- `scripts/test-roteiro-de-cinema.mjs` (novo, 380 linhas): **64 verificações,
  0 falhas**, compilando o `scriptParser.ts` REAL e batendo nele com **9
  roteiros de clientes de verdade** lidos do banco (god/country, butter chicken,
  MadLabs, whale city, ransomware em PT, internet 1900 em ES, quadrilátero,
  Devanshi, nursery). Cada um verifica as duas metades: a direção de arte
  SUMIU **e** cada fala do cliente SOBREVIVEU, palavra por palavra.

**Onde isto pega.** `stripScriptMarkers` é a fronteira única de narração da
casa: `/api/compose`, `/api/compose/unlock`, `/api/prewarm-voiceover`,
`/api/voiceover`, `/api/render`, `/api/generate-avatar`, `lib/hollywood/
hostVoice.ts` e `lib/publicVideos.ts` passam todos por ela. Uma correção,
oito caminhos — os 8 motores, o avatar e a página pública.

**Interação com o #1 de hoje.** A régua de narração mede
`parseUserScript().narration`. Ela passa a medir a **fala de verdade**, não a
direção de arte: no roteiro god/country são 41% das palavras. Um roteiro de
cinema pedido a 60s cuja fala real dá 22s agora DESCE para 20s pelo degrau do #1
e sai como filme curto e correto, em vez de sair com 60 segundos de narrador
lendo "Visual dois pontos". As duas jogadas do dia se compõem.

**Decisões que tomei sozinha** (autonomia; reversíveis):
1. **Piso de DOIS rótulos de fala para a regra 5.** Um rótulo sozinho costuma ser
   ficha de voz ("Narration: natural male American English voice, 20s–30s"), não
   roteiro. Reverter a regra inteira = `if (rotulos < 2)` → `if (true)`.
2. **`Visual:` derruba a linha inteira; `Voiceover:` derruba só o rótulo.** É a
   assimetria do formato: o que vem depois de `Visual:` é imagem, o que vem
   depois de `Voiceover:` é fala.
3. **Preâmbulo só nas 3 primeiras linhas com texto, e exigindo verbo de entrega
   E substantivo de entregável.** "Sure, he said, and walked away." e "Perfect
   timing for a robbery" continuam sendo narração — os dois estão no teste.

**Risco.** O de sempre num saneador: comer palavra que era fala. Três travas
contra isso: (a) as regras 1-3 só derrubam linha que COMEÇA com rótulo/tempo/
cena; (b) a regra 5 só entra com dois rótulos explícitos de fala; (c) **trava de
segurança**: se as regras novas esvaziarem uma narração que o parser antigo teria
salvo, o resultado ANTIGO volta inteiro (`cleanNarration(raw, lenient, false)`).
Nenhum roteiro que funcionava pode virar string vazia — esse é exatamente o erro
de 13/08 (`voiceover_script is required` na cara do usuário, depois de todo o
custo) e ele está testado nos dois modos.

**Testes vizinhos, rodados antes e depois.** `test-expand-policy` (95),
`test-narracao-degrau` (746), `test-velocidade-2026-08-28` (23),
`test-shorts-script-timer`, `test-public-video-privacy`: todos verdes.
⚠ **Dois testes já estavam VERMELHOS em `origin/main` antes desta rodada** —
conferi rodando-os em `d33bca20` (antes do #1) e falham igual, então não são
desta jogada nem do #1: `test-narration-ruler.mjs` ("expand-script decide o
'depois' pela fala" — 1 invariante quebrado, dívida real em
`app/api/expand-script/route.ts`, pista minha) e
`test-roteiro-perdido-2026-08-31.mjs` (o harness quebrou: dá `SyntaxError:
Unexpected token 'export'` ao avaliar um `.ts` como função). Anotados como
próximo candidato de rodada curta.

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
-- roteiro de cinema colado DEPOIS do marco: a direcao de arte ainda vira fala?
with ext as (select id from profiles where email not ilike '%josephsskaf%'
  and email not ilike '%usekineo%' and email not ilike '%kineo.local')
select count(*) filter (where v.topic ~* '(^|\n)\s*[*_#>\s]*(voice-?over|narration|narrator|narrador|narração|narración|dialogue|diálogo)\s*[*_]*\s*:') roteiro_de_cinema,
       count(*) total
from videos v join ext on ext.id = v.user_id
where v.created_at > '2026-09-03 16:00:00+00' and v.status='completed';
```

Meta: as pessoas do grupo "roteiro de cinema" passarem a fazer o **segundo**
filme por escolha e não por conserto — hoje elas fazem 2,45 porque o primeiro sai
errado. Sinal secundário: `script_duration_autofit_down` deve APARECER nesse
grupo (a fala real é bem menor que o botão), e é o comportamento certo.

**SHA.** `SHA_AQUI` (enfileirado em `entrega-atual` sobre o #2 `aaa8f507`;
aguardando o clique no SUBIR-SITE.bat). Worktree: `C:\kineo-wt\b2-preambulo`.

**Próximo item.** **A3 — continuação de série entrega o filme inteiro** (M,
jogada de Fable pelo plano): 22% das continuações no Kineo 1 saem com <90% do
pedido (17s e 20s para 35s), porque o gerador recebe a ORDEM ("Create the next
episode in the same Short series about…") em vez do ASSUNTO — a mesma família de
defeito desta rodada, um andar acima. É a jogada da **2ª compra**: série é a
única razão para voltar amanhã, e a única assinante nova da semana está fazendo
"Teil 1". Depois dela: A4 (cron de resgate além de 20h).

**Modelo.** Feita em Opus. Pelo plano, Fable é obrigatório só em A1 e A3; B2 é
jogada minha. Medição, código, teste, diário e entrega na mesma sessão.
