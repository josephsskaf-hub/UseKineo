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

**SHA.** `f316ef06` (enfileirado em `entrega-atual` sobre o #2 `aaa8f507`;
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
### #4 — 16:20→17:15 BRT — a semente do episódio 3 era a ORDEM do episódio 2, cortada no meio da palavra. 9 de 43 continuações nasceram sobre um fragmento — e série é o único grupo que converte 7× acima da base.

**Placar (SQL canônico, marco zero 03/09 16:00 UTC, externos, medido 19:49 UTC):**

| métrica | valor |
|---|---:|
| cadastros pós-marco (3h50 de vida) | 5 |
| pessoas com filme pós-marco | 3 |
| checkout de **desejo** (tem filme) | 1 |
| checkout **sem filme** (a classe de defeito) | **0** |
| assinaturas pós-marco | 0 |
| pessoas com falha e nenhum filme | 0 |
| vídeos completos 24h | 38 |

`checkout_sem_filme` segue em **0** contra 12 de 27 em 7 dias. Amostra ainda
pequena (5 cadastros), mas é o indicador que o plano manda vigiar e ele não
piorou depois de #1/#2/#3.

**Checagem zero (1h):** 0 cadastro sem crédito, 0 `generation_stage_error`,
0 `narration_guard_blocked`, 0 render preso, 0 evento de erro de qualquer nome,
1 vídeo entregue. Nada quebrado — a rodada foi para a jogada de maior retorno.

**O número que mandou escolher A3.** Cruzei quem usou o botão de série com quem
paga:

| grupo | pessoas | pagaram | taxa |
|---|---:|---:|---:|
| usou "Build the next episode" | **27** | **3** | **11,1%** |
| base (pessoas com pelo menos 1 filme entregue) | 751 | 12 | 1,6% |

**3 dos 12 clientes pagantes da vida da empresa passaram por esse botão**, e ele
converte ~7x acima da base. É a máquina da segunda compra — e ela estava
entregando assunto quebrado em 21% das vezes.

**O que estava errado (medido, 43 continuações desde 31/07).** A ordem inteira
do gerador virava `videos.topic` E `videos.title` (o title é o topic cortado em
~120 chars). O clique seguinte passa `latestCompleted.title` como semente — ou
seja, **a semente do episódio 3 era a ORDEM do episódio 2**. E
`normalizeSeriesSeed` cortava em 180 chars sem olhar fronteira de palavra:

    Create the next episode in the same Short series about "Create the next
    episode in the same Short series about Every night at 3:17 AM, someone kn".
    Keep the topic and format recognizable, ...

O assunto do filme de alguém virou `Every night at 3:17 AM, someone kn`. Outros
fragmentos reais: `A vanished crew... and a mystery u`, `A detective's office —
and a murde`, `Want to know how billionaires buil`, `AI Revolution: Are You
Ready?. Ke` — esse `. Ke` é o começo de `. Keep the topic`, prova de que o corte
comeu a cauda do andaime junto.

- **6 de 43** aninhadas (a ordem dentro da ordem);
- **3 de 43** com semente lixo: `Untitled Short`, `5 shocking facts about`
  (sobra de marcador), `Title: La Frontera del Miedo…` (rótulo grudado);
- **9 de 43 = 21%** das continuações nasceram sobre um assunto destruído.

**O que mudou (arquivos).**
- `lib/seriesContinuation.ts` (+148/−3) — ponto único por onde passam os **12
  callers** (done-screen, recent-video, marco do /history e do /studio, card da
  Library, miniatura do /studio, pílula de render, faixa de retorno, banner de
  volta, e-mails `downgraded_loss`/`ending_soon`/momentum/video-ready e o
  autopilot). Nenhum caller foi tocado — o conserto cabe todo na biblioteca.
  1. `normalizeSeriesSeed` **desaninha** em laço com teto (cabeça da ordem +
     cauda de andaime, inclusive **os fragmentos** que o corte de 120/180
     produz: `. Ke`, `. Keep the topic and forma`…), tira rótulo de cabeça
     (`Title:`/`Título:`/`Tema:`/`Topic:`), mata semente degenerada e **só
     então** corta em 180 — na última fronteira de frase, senão no último
     espaço, **nunca no meio da palavra**.
  2. `buildSeriesContinuationPrompt` **inverte a frase**: o ASSUNTO na frente, a
     ordem atrás e subordinada — `Topic: "X". This is the next episode in the
     same Short series: same subject, same format, a completely new hook…`. Era
     exatamente o defeito que o A3 do plano descreve: o gerador recebia a ORDEM
     em vez do ASSUNTO.
- `scripts/test-serie-episodio-2.mjs` (novo): **262 verificações, 0 falhas**,
  compilando o `.ts` REAL. Bate nele com os **9 roteiros quebrados de produção
  verbatim**, com os `videos.title` de 120 chars (sem aspa de fechamento), com
  aninhamento triplo — e com o invariante que mata a classe inteira do bug:
  `normalizeSeriesSeed(buildSeriesContinuationPrompt(x)) === normalizeSeriesSeed(x)`
  para 14 assuntos em EN/PT/ES, com emoji, travessão, interrogação e dois-pontos.
- `scripts/test-library-caminho-volta-2026-08-31.mjs` (+4/−1): o teste vizinho
  procurava a frase antiga terminando em `about`. Passou a exigir o que
  realmente importa (`next episode in the same Short series`), com o porquê no
  comentário.

**A trava que não podia quebrar.** `lib/publicVideos.ts` tem o
`PROMPT_SCAFFOLDING`, que impede a ordem do gerador de virar manchete no sitemap
(incidente de 11/08, 3 páginas publicadas com "Keep the topic and format
recognizable…" como título). A frase nova continua casando com 3 das 4
alternativas dele, e o teste **extrai o regex do arquivo real** em vez de
copiá-lo — se alguém mudar a frase de novo, o teste cai.

**Para o cliente / receita.** O segundo filme é o único motivo de voltar amanhã,
e voltar amanhã é o que vira assinatura: 11,1% contra 1,6%. Uma em cada cinco
continuações saía sobre um fragmento sem sentido — a pessoa gastava crédito,
recebia um filme que não era sobre nada, e o botão que mais converte virava a
prova de que o produto não entende o que ela quer.

**Decisões que tomei sozinha** (autonomia; reversíveis):
1. **`MIN_SEED_WORDS = 1`, não 2** — reverti a escolha do agente depois de
   medir: só **9 dos 1.184** filmes entregues têm título de uma palavra, e
   "Chernobyl" ou "Pompeii" são assunto de série perfeitamente bom. Quem mata a
   sobra de marcador é a regra da palavra pendurada (`5 shocking facts about`
   tem 4 palavras), não a contagem. O piso 2 tiraria o botão de 9 filmes reais
   sem pegar um caso novo. Reverter: `MIN_SEED_WORDS = 2`.
2. **Semente degenerada devolve string vazia** e o caller cai no `/studio`
   limpo, em vez de gastar crédito num filme sobre um fragmento. Formulário em
   branco é ruim; filme errado pago é pior. Reverter: tirar `isDegenerate` do
   fim de `normalizeSeriesSeed`.
3. **Palavra pendurada depois do corte de 180 é removida, não zera a semente** —
   ali a entrada era longa e inteira (não é fragmento do banco), então cortar
   uma palavra é melhor que perder o botão.
4. **Fragmento mínimo de cauda: 4 chars com ponto, 10 sem** — `. K` (3) fica de
   fora de propósito, para "The Story of Mr. K" não perder o K e "Secrets You
   Should Keep" não perder o Keep. Os dois estão no teste.

**Risco.** É um saneador de texto: o erro possível é comer assunto que era bom.
Três travas: (a) a cabeça só é removida quando a linha COMEÇA com a ordem; (b) a
cauda só sai quando é prefixo literal do andaime conhecido; (c) o invariante de
idempotência garante que assunto legítimo atravessa `build → normalize` sem
perder um caractere. Efeito colateral aceito: um título que termine numa
preposição solta ("Coisas de A") vira vazio e cai no Studio limpo — nunca gasta
crédito errado. Segundo risco, menor: `lib/autopilot/topics.ts` concatena a
frase nova dentro de um prompt maior; a leitura fica coerente, mas é o único
caller cuja frase final muda de forma.

**Testes vizinhos, rodados depois:** `test-narracao-degrau` (746) OK,
`test-fila-proximo-episodio` (80) OK, `test-library-caminho-volta` (26) OK,
`test-public-video-privacy` (76) OK, `npx tsc --noEmit` exit 0.
Continuam vermelhos **de antes desta rodada** (não são desta jogada nem do
#1/#3): `test-narration-ruler`, `test-episodio2-ending` (B7),
`test-video-ready-footer` (42/43), `test-pilula-proximo-episodio`,
`test-done-footer`, `test-video-ready-nudge`, e `test-studio-tile-episode2` (que
nem roda: monta caminho `C:\C:\…`, bug de Windows no harness). São 7 dívidas de
teste, candidatas a uma rodada curta.

**Como medir (contra o marco zero, 03/09 16:00 UTC).**

```sql
with ext as (select id from profiles where email not ilike '%josephsskaf%'
  and email not ilike '%usekineo%' and email not ilike '%kineo.local'),
c as (select regexp_replace(coalesce(v.topic,''),'\s+',' ','g') t
      from videos v join ext on ext.id=v.user_id
      where v.created_at > '2026-09-03 16:00:00+00'
        and v.topic ~* 'next episode in the same short series')
select count(*) continuacoes,
       count(*) filter (where t ~* 'about "?(untitled|title:)') semente_lixo,
       count(*) filter (where t ~* 'Create the next episode') formato_antigo
from c;
```

Meta dupla: `semente_lixo = 0`, e a coorte de série (hoje 27 pessoas, 11,1% de
conversão) crescendo — cada continuação que sai certa é uma pessoa que volta
amanhã. Sinal secundário: continuações com `Topic: "` no `topic` (formato novo)
subindo enquanto `Create the next episode` para de aparecer.

**Próximo item.** **A4 — cron de resgate olha além de 20h** (P, jogada minha):
`finish-stranded-renders` tem `MAX_AGE_MS = 20h` e existem 110 renders de 87
pessoas com compose submetido e sem linha em `videos`, **100% fora da janela** —
ou seja, o cron nunca teve chance de salvar nenhum deles. Subir para 72h com
teto de tentativas por claim. Cada filme resgatado vira um e-mail "your video is
ready" para alguém que já tinha desistido. Confirmar o número no banco antes de
codar (o #2 de hoje mexeu no guarda de cobrança e pode ter mudado a contagem).

**Modelo.** Código do saneador escrito por agente **Fable** (regra do plano para
A1/A3). Medição, decisão do piso de palavras, conserto dos dois testes vizinhos
que a frase nova quebrou, diário e entrega em Opus.

**SHA.** `fb0ee654`. Worktree: `C:\kineo-wt\a3-serie-episodio`.

---

### #5 — 17:15→18:50 BRT — "seus créditos voltam em uma hora" era VERDADE, e matou 10 pessoas. Nenhuma delas voltou; 8 nunca viram um filme da Kineo na vida.

**Placar (SQL canônico, marco zero 03/09 16:00 UTC, externos, medido 21:27 UTC):**

| métrica | valor |
|---|---:|
| cadastros pós-marco (5h30 de vida) | 8 |
| pessoas com filme pós-marco | 5 (**63%**) |
| checkout de **desejo** (tem filme) | 1 |
| checkout **sem filme** (a classe de defeito) | 1 |
| assinaturas pós-marco | 0 |
| pessoas com falha e nenhum filme | 0 |
| `script_duration_autofit_down` (o #1 em produção) | 0 |
| `narration_guard_blocked` (o que o #1 mata) | **0** |
| vídeos completos 24h | 35 |

**A entrega de #1→#4 subiu.** `origin/main` = `78cbf7c3` — o fundador clicou. O
gate de narração, o guarda de cobrança, o parser de roteiro de cinema e a
semente de série estão em produção desde ~17h BRT.

**Checagem zero (1h):** 3 cadastros, 0 sem crédito, 0 `generation_stage_error`,
0 `narration_guard_blocked`, 0 evento de erro de qualquer nome, 2 vídeos
entregues. Nada quebrado.

**A jogada do cardápio (A4) morreu na medição — e isso é resultado.** O plano
diz "110 renders de 87 pessoas com compose submetido e sem linha em `videos`,
100% fora da janela de 20h; subir para 72h". Medi antes de codar, com o join
apertado (`videos.render_id`, que está preenchido em **1.535 de 1.535** vídeos
completos, então o join é sólido):

| janela | órfãos (30d) |
|---|---:|
| < 20h (dentro da janela do cron) | **0** |
| 20h – 72h (o que o A4 ganharia) | **1** |
| > 72h (não recuperável por janela nenhuma) | 52 |

E por dia: 05→24/08 = 52 órfãos; **25/08 → hoje = 1**. O resgate do Kineo 1
(fase 3, criada em 20/08) fechou a torneira. Subir a janela para 72h renderia
**um filme por mês**. Os 110 do plano são backlog histórico, não fluxo — e
filmes de agosto já não existem mais na Creatomate. **A4 fica registrada como
FEITA-POR-MEDIÇÃO: não se constrói.** O que sobra do backlog é um clique, não
código: a rota `/api/admin/rescue-composed-films` (#18) segue com 0 execuções.

**Onde a medição me levou.** Decompus as 96 pessoas de 7 dias que se cadastraram
e nunca viram um filme:

| onde morreram | pessoas |
|---|---:|
| abriram o Studio e **nunca submeteram** | ~66 |
| submeteram e não receberam nada | **16** |
| — dessas 16: barradas pelo **gate de narração** | **7** ← o #1 de hoje resolve |
| — dessas 16: barradas pelo **crédito preso** | **3** ← esta rodada |
| — resto (analyze falhou, prompt longo, stranded) | 6 |

Das 7 do gate, as coberturas eram 94%, 84%, 77%, 71%, 67%, 66%, 60% — todas
acima do corte de 60% do #1. Só a de 3s/35s continua (corretamente) recusada.
**O crédito preso é a segunda causa, e ninguém tinha olhado para ela.**

**O que estava errado (medido).** `compose_refused` com
`reason='credits_held_by_render'`, externos, 17/08 → 02/09:

| | |
|---|---:|
| recusas | **16** |
| pessoas | **10** |
| viraram filme em 24h | **0** |
| nunca viram um filme da Kineo na vida | **8 de 10** |
| débitos que seguravam e foram estornados depois | **16 de 16** |
| no Seedance 1.5 | 15 de 16 |

A frase que essas 10 pessoas leram:

> *"A video you already started is still holding N credits. If it doesn't
> finish, they come back automatically within the hour — your trial is still
> running."*

Ela é **verdadeira**: os 16 créditos voltaram, todos. E é inútil: ninguém espera
uma hora por um produto que acabou de dizer não. Ferruxezimzade levou a mesma
parede **cinco vezes em 84 segundos** (10:02:54 · 10:03:53 · 10:04:15 ·
10:04:37 · 10:05:17) e nunca mais voltou.

**A descoberta que mudou a jogada.** A idade do débito que segurava o crédito,
no instante exato da recusa, em minutos:

    0  0  1  1  2  2  2  3  3  4        → 10 casos abaixo de 5 minutos
    10 20 40 74                          → 4 casos mais velhos

Um render cinematográfico leva 3-6 minutos. **Em 13 dos 16 o render não estava
morto — estava no forno.** A pessoa clicou "gerar" de novo porque a tela não
disse que já havia um filme sendo feito, e recebeu de volta um erro de saldo com
cara de paywall. Aí ela fecha a aba. E o render, que dependia do poller da aba
para compor, morre de verdade. **A recusa fabricava exatamente o órfão que ela
alegava estar protegendo.**

**O que mudou (arquivos).**
- `lib/credits/heldRender.ts` (**novo**, 74 linhas): a decisão pura, fora da
  rota, com os 16 casos de produção documentados no cabeçalho. `classifyHold()`
  separa **filme no forno** (débito com menos de 12 min) de **render velho**.
  Os 12 minutos não são chute: são o `MIN_AGE_MS` do próprio cron de resgate —
  abaixo disso nem o servidor considera que vale tocar no render. `explainsGap`
  **não foi afrouxado**: o crédito preso só desculpa a recusa quando, de volta,
  fecharia a conta. Idade indatável NUNCA vira "no forno" (o sentido da falha
  importa: prometer um filme que não vem é pior que a frase antiga).
- `lib/credits/refund.ts` (+23/−3): `sweepAbandonedCinematicDebits` passa a
  aceitar `opts.userId`/`limit`. É um **estreitamento** da consulta de
  candidatos e nada mais — mesmo `CINEMATIC_ABANDON_CUTOFF_MS` (100 min), mesma
  cadeia de prova de não-entrega, mesmo estorno idempotente, mesmo
  `releaseCinematicClaim`. Sem `opts`, byte-a-byte o comportamento do cron
  horário, que continua o dono do caso geral.
- `app/api/generate-video-cinematic/route.ts` (+190/−16): **o estorno vem ANTES
  da recusa.** Quando o crédito preso é o que fecha a conta, a rota chama a
  varredura escopada nesta pessoa, relê o saldo (só sobe, nunca desce) e o filme
  sai **no mesmo clique**. Quando não dá para estornar, a recusa continua — com
  a frase certa: *"Your film from 3 minutes ago is still being made — it is
  holding 19 credits until it lands. You do not need to start it again: it shows
  up in your library on its own, and we email you the link if you close this
  tab."* Sem preço, sem plano, sem prazo inventado.
- `scripts/test-credito-preso.mjs` (**novo**, 200 linhas): **115 verificações,
  0 falhas**, compilando o módulo real e batendo nele com os **16 casos de
  produção um por um**, com nome e data.

**A não-regressão que quase passou batido.** Minha primeira versão criava um
`reason` novo (`render_in_flight`). Isso teria sido uma regressão vestida de
melhoria: `GenerateClient.tsx` tem, desde o sprint-v1v4 #33, uma **sala de
espera** ligada a `reason === 'credits_held_by_render'` — sem caixa de planos,
com rechecagem de saldo, exibindo o texto do servidor. Um `reason` novo jogaria
o caso **mais comum** (13 dos 16) no painel vermelho genérico, que ainda diz
*"your credits have been returned - you can retry safely"* — a mentira exata que
o #33 foi criado para matar. **O `reason` de fio não muda.** A frase nova entra
sozinha na sala de espera (ela exibe `data.error`), sem o Codex tocar em uma
linha. A distinção viaja em `holdState`/`inFlight`, campos aditivos. Três
verificações do teste guardam isso, uma delas lendo o `GenerateClient` real.

**Por que isto é dinheiro.** 10 pessoas por mês, 8 delas sem nunca ter visto um
filme da Kineo, e 15 das 16 recusas no Seedance 1.5 — um dos dois motores de
100% das primeiras impressões (memória de 02/09). E é a segunda maior causa de
"submeteu e não recebeu nada" nos últimos 7 dias, atrás só do gate que o #1
acabou de consertar.

**Decisões que tomei sozinha** (autonomia; reversíveis):
1. **A régua é 12 minutos**, emprestada do `MIN_AGE_MS` do cron de resgate, não
   inventada. Ela cobre 13 dos 16 casos medidos. Reverter a frase nova inteira:
   `HOLD_IN_FLIGHT_MAX_AGE_MS = 0` em `lib/credits/heldRender.ts`.
2. **O estorno ao vivo usa o cutoff do cron SEM AFROUXAR** (100 min). Isso
   significa que ele quase nunca vai disparar — dos 16 casos, só o de 74 min
   chegaria perto. Escolhi assim de propósito: afrouxar a prova de morte para
   estornar mais cedo arriscaria devolver crédito de um render vivo, e o valor
   da rodada está na frase, não no estorno. O estorno é o caminho de saída digna
   para o caso velho. Reverter: tirar a chamada `releaseHeldCreditsNow`.
3. **Não inventei `reason` novo** (ver acima). Reverter seria justamente o erro.
4. **A4 não foi construída.** A medição diz 1 filme/mês. Registro aqui para a
   próxima rodada não gastar tempo com ela de novo.

**Risco.** Baixo, e do lado certo em duas frentes. (a) O estorno ao vivo é a
mesma função do cron, com a mesma prova — não há caminho novo pelo qual crédito
volte sem abandono provado; o pior caso é ele não disparar. (b) A frase nova só
troca texto dentro de uma tela que já existia. O risco real que sobra é o
oposto do de hoje: alguém com um render **travado** (não no forno) abaixo de 12
minutos leria "está sendo feito" e esperaria. Custo: alguns minutos de espera,
contra a parede de hoje. E o resgate do cron pega esse caso em 12 min.

**Testes vizinhos.** Verdes: `test-billing-drift` (86), `test-narracao-degrau`
(746), `test-out-of-credits-plans` (65). **Já vermelhos em `origin/main` antes
desta rodada** (conferido com `git stash` no `78cbf7c3` — não são desta jogada):
`test-credits-held-waitroom` (procura o literal antigo; o `GenerateClient`
extraiu a condição para `const showGenericFailure`, o produto está certo),
`test-stranded-email-dedupe`, `test-stranded-extra-attempt-4xx`. Somam-se às 7
dívidas de teste anotadas no #4. `npx tsc --noEmit` limpo.

**Como medir (contra o marco zero, 03/09 16:00 UTC).**

```sql
select count(*) filter (where name='credits_held_release_attempted') as tentativas,
       count(*) filter (where name='credits_held_release_attempted'
                          and (metadata->>'unblocked')::boolean) as filme_saiu_no_clique,
       count(*) filter (where name='compose_refused'
                          and metadata->>'reason'='credits_held_by_render'
                          and (metadata->>'hold_in_flight')::boolean) as avisados_do_forno,
       count(distinct user_id) filter (where name='compose_refused'
                          and metadata->>'reason'='credits_held_by_render') as pessoas
from events where created_at > '2026-09-03 16:00:00+00';
```

Meta: dos que forem avisados do forno, **algum** aparecer com filme entregue nas
2 horas seguintes — hoje esse número é 0 de 10. Sinal secundário: a pessoa
parar de clicar 5 vezes em 84 segundos (recusas por pessoa caindo de 1,6 para
~1).

**Próximo item.** **D2 — a caixa vazia do pagante**, agora com um número maior
do que o do plano: **66 das 96 pessoas de 7 dias que não viram filme abriram o
Studio e nunca submeteram nada.** Não é render quebrado nem preço: é gente que
chega e não tem o que escrever. A versão 100% fora da zona do Codex é o pouso:
`videos_ok ≤ 1` cai em `/viral-now` (3 ideias prontas, 1 clique) em vez da caixa
em branco. Antes de codar, medir quantos desses 66 chegaram a digitar alguma
coisa (`analyze-idea` sem claim) — se a maioria digitou e desistiu, o problema é
outro e a jogada muda.

**Modelo.** Feita em Opus (A5 não é jogada de Fable pelo plano — Fable fica em
A1/A3). Medição, código, teste, diário e entrega na mesma sessão.

**SHA.** `796bf166`. Worktree: `C:\kineo-wt\a5-credito-preso`.

### #6 — 18:40→20:45 BRT — o e-mail de desculpa NUNCA saiu uma única vez em 30 dias. A palavra "credits" nas nossas próprias confissões de defeito desclassificava a pessoa — e metade delas não tinha evento nenhum para ser vista.

**Placar (SQL canônico, marco zero 03/09 16:00 UTC, externos, medido 23:45 UTC):**

| métrica | valor |
|---|---:|
| cadastros pós-marco (7h45 de vida) | 12 |
| pessoas com filme pós-marco | 8 (**67%**) |
| checkout de **desejo** (tem filme) | 1 |
| checkout **sem filme** (a classe de defeito) | 1 |
| assinaturas pós-marco | 0 |
| pessoas com falha e nenhum filme | **0** |
| `narration_guard_blocked` (o que o #1 mata) | **0** |
| `script_duration_autofit_down` | 0 |
| `cinematic_cost_drift` (o #2) | 0 |
| vídeos completos 24h | 36 |

`1º filme / cadastro` = **67%** contra os ~55% medidos no #1 e a meta de 80% do
plano. `checkout_sem_filme` = 1 em 12 contra 12 em 27 nos 7 dias anteriores.
Amostra pequena, mas os dois indicadores que o plano manda vigiar não pioraram
depois de #1→#5. Os contadores novos (`autofit_down`, `cost_drift`) seguem em 0
porque os defeitos que eles marcam também não aconteceram — não são medida de
uso, são medida de conserto.

**Checagem zero (1h):** 0 cadastro sem crédito, 0 `generation_stage_error`,
0 `narration_guard_blocked`, 0 render preso, 0 evento de erro de qualquer nome,
4 vídeos entregues. Nada quebrado.

**A jogada do cardápio (A4) já tinha morrido na medição do #5** — não repeti.
C3 (winback com filme pronto) é a próxima da ordem e **não cabe em autonomia**:
ela exige um lote de renders pagos (~US$ 30-40 de fal), e gastar dinheiro é uma
das exceções que continuam do fundador. Fica esperando o "vai" dele. Peguei a
jogada seguinte com número próprio, na minha pista.

**O que estava errado (medido hoje no banco).**

`app/api/cron/send-failure-recovery` existe desde 21/08 para uma coisa só:
pedir desculpa a quem tentou fazer um filme, foi derrubado por um defeito
NOSSO, e foi embora sem nada. Fui medir o que ele entregou:

| | |
|---|---:|
| `failure_recovery_sent` na história inteira | **8** |
| desses, `kind='script_short'` (roteiro curto) | **8** |
| desses, `kind='bug'` (o e-mail de DEFEITO) | **0** |

**O e-mail que é a razão de o arquivo existir nunca saiu uma única vez.**
Enquanto isso, do outro lado:

| | |
|---|---:|
| pessoas com estorno por defeito em 30d | 65 |
| — que nunca viram um filme da Kineo e são alcançáveis | **35** |
| — dessas, que receberam o e-mail | **1** |
| — dessas, sem NENHUM evento de navegador na vida | **15** |
| na janela de 7 dias | 10 (4 delas invisíveis) |

E o detalhe que fez a rodada ser hoje: **o #1 desta manhã acabou de eliminar o
`script_short`** — a única coorte que este cron atendia. Deixado como estava, o
cron ia para zero envios enquanto a fila de gente quebrada continuava cheia.

**As duas causas.**

**1. Um fragmento de nove letras.** A lista `NAO_E_BUG` — "mensagens que não são
defeito, são o produto dizendo não corretamente" — começava com o fragmento
solto `credits`. Só que TODA mensagem de erro da casa termina dizendo à pessoa
que o crédito dela voltou. É a coisa certa a dizer. E por isso a palavra aparece
dentro das nossas próprias confissões:

    "Our video provider did not accept the job — this is on our side, not
     yours. Nothing started, your CREDITS were refunded automatically…"

    "This generation stopped responding and we ended it here instead of
     leaving you waiting. Your CREDITS are being returned automatically…"

As duas dizem, com todas as letras, que a culpa é nossa. O cron lia as duas
como "o produto funcionou".

**2. Só o navegador era lido.** As duas fontes (`generate_failed` e
`generation_stage_error`) são eventos do cliente. Quinze das 35 pessoas não têm
um único deles na vida: o render morreu no SERVIDOR depois que a aba fechou, e
quem registrou o desfecho foi a varredura de estorno. Para essas quinze o cron
era cego por construção, não por regra.

**O que mudou (arquivos).**
- `app/api/cron/send-failure-recovery/route.ts` (+~180): (a) `DEFEITO_EXPLICITO`
  — frases em que o produto assume a culpa — **vence** o `NAO_E_BUG`; (b) o
  fragmento solto deu lugar às **frases inteiras** de cada recusa legítima. Não
  usei só as que apareceram em 30 dias de eventos: fui de `grep` em `app/api`
  atrás de TODA redação de saldo curto que existe no código, e achei quatro que
  os eventos não tinham (`AI Generated needs N credits. You have M.`,
  `Fast needs…`, `This generation needs…` nas duas variantes, `Animating a photo
  costs…`) — sem elas, o conserto criaria o erro oposto; (c) terceira fonte:
  `credits_refunded` com razão `cinematic_abandoned_no_delivery` ou
  `pending_orphan_no_dispatch`; (d) `?hours=N` (padrão 48, teto 720); (e) copy
  que não mente para falha velha; (f) carimbo com `fonte`/`stale_days`/
  `window_hours` e `by_source` no dry-run.
- `scripts/test-resgate-defeito.mjs` (novo): **78 verificações, 0 falhas**,
  compilando o código REAL da rota e batendo nele com **11 mensagens de defeito
  e 16 recusas legítimas** lidas do banco e do código — inclusive a trava do
  erro oposto: as 6 mensagens de estorno da casa que falam de crédito
  ("Your credits were refunded automatically") continuam sendo defeito.
- `scripts/test-failure-recovery-honest.mjs` e `-latest-wins.mjs`: os dois
  vizinhos voltaram ao verde (40/0 e 43/0). O `latest-wins` estava **quebrado
  em `origin/main` antes desta rodada** (SyntaxError no harness, conferido no
  arquivo original) e é justamente o que protege o invariante "o erro mais
  recente decide" — reparei e estendi para cobrir a terceira fonte.

**Por que isto é dinheiro, não higiene.** A pessoa que tentou fazer um filme e
foi derrubada por defeito nosso é a lista mais quente que existe: ela já quis o
produto, já escreveu o tema, já apertou gerar, e ainda está com os créditos
intactos. Não precisa ser convencida do valor — precisa saber que agora
funciona. São ~10 por semana, e hoje elas recebem **zero**. O primeiro filme é o
produto (memória de 02/09); estas são as pessoas para quem o primeiro filme
existiu, foi pago, e nunca chegou.

**Decisões que tomei sozinha** (autonomia; reversíveis):
1. **Capacidade continua FORA da desculpa** ("full capacity", "high demand right
   now"). É do nosso lado, mas dizer "it is fixed now" seria mentira — é a mesma
   regra do #5. Reverter: mover as duas frases de `NAO_E_BUG` para
   `DEFEITO_EXPLICITO`.
2. **A razão do estorno é filtrada em CÓDIGO, não no PostgREST.** Um filtro de
   caminho jsonb que o servidor não entenda não devolve erro — devolve lista
   vazia. Fonte que falha em silêncio é pior que fonte nenhuma: o cron
   continuaria "saudável" e as 15 continuariam invisíveis. São ~90 estornos em
   30 dias; o volume permite.
3. **Falha com mais de 7 dias ganha copy própria** em vez de ficar de fora. O
   backlog de 35 pessoas não some sozinho, e "we went quiet, which was worse"
   é verdade. Reverter: `const velho = staleDays > 99999`.
4. **A janela virou parâmetro com teto de 720h, não constante nova.** O cron do
   `vercel.json` segue sem o parâmetro, logo segue em 48h — o backlog é um
   clique do fundador, com dry-run por padrão, não uma mudança de comportamento
   automático.

**Risco.** O risco real é o oposto do defeito: mandar "a culpa foi nossa" para
quem levou um "não" legítimo. Três travas: (a) a lista de recusas virou frase
inteira e foi conferida contra o CÓDIGO, não só contra os eventos; (b) o teste
tranca as 16 recusas legítimas e as 6 mensagens de estorno da casa nas duas
direções; (c) a regra do #15 continua de pé — se a ÚLTIMA coisa que o produto
disse à pessoa foi um "não" legítimo, ela sai da lista, mesmo com defeito antes.
Risco menor: o carimbo é 1× por pessoa para sempre, então uma classificação
errada gasta a única chance daquela pessoa.

**Como medir (contra o marco zero, 03/09 16:00 UTC).**

```sql
select metadata->>'kind' kind, metadata->>'fonte' fonte, count(*) n
from events where name='failure_recovery_sent' and created_at > '2026-09-03 16:00:00+00'
group by 1,2 order by 3 desc;
```

Meta: `kind='bug'` deixar de ser zero pela primeira vez na história, e
`fonte='servidor'` aparecer — cada linha dessas é uma pessoa que o cron não
conseguia enxergar. Sinal secundário, o que importa de verdade: dessas pessoas,
quantas voltam e entregam um filme (`videos.status='completed'` depois do
carimbo).

**Próximo item.** **D2 — a caixa vazia**, com o número do #5: **66 das 96
pessoas de 7 dias que não viram filme abriram o Studio e nunca submeteram
nada**. Antes de codar, medir quantas chegaram a digitar: o #5 já anotou 41 com
`analyze_idea_clicked` contra 31 com `generate_started`, ou seja **10 digitaram
e desistiram na tela de revisão**, e os outros ~26 nem digitaram. Se a maioria
não digitou, a jogada é o pouso em `/viral-now` (3 ideias prontas, 1 clique,
100% fora da zona do Codex); se a maioria digitou e desistiu, o problema é a
tela de revisão e a jogada muda.

**Modelo.** Feita em Opus (pelo plano, Fable só em A1/A3). Medição, código,
teste, reparo dos dois vizinhos, diário e entrega na mesma sessão.

**SHA.** `6ad95b32` (enfileirado em `entrega-atual`; aguardando o clique no
SUBIR-SITE.bat). Worktree: `C:\kineo-wt\resgate-defeito`.

---

### #7 — 21:50→23:20 BRT — o expansor recusava o roteiro que o RENDERIZADOR aceitaria. 15 das 32 pessoas com expansão auto-disparada levaram a frase vermelha, e o último caso foi às 22:45 de hoje.

**Placar medido no início da rodada** (SQL canônico, contas externas, marco
zero 03/09 16:00 UTC; medição às 22:08 BRT / 04/09 01:08 UTC):

| métrica | valor |
|---|---:|
| cadastros pós-marco | 15 |
| pessoas com filme entregue pós-marco | **10 (67%)** |
| checkout de DESEJO (tem filme) | 1 |
| checkout de DEFEITO (0 filmes) | 1 |
| **assinaturas pós-marco** | **0** |
| pessoas com falha e sem filme | **0** |

A razão "cadastro com ≥1 filme" saiu de **55%** (marco zero) para **67%** nas
primeiras 9h pós-marco. Amostra pequena (15 pessoas, madrugada), mas é a
direção que as jogadas #1 a #6 miravam.

**Checagem zero (1h):** 0 cadastros, 0 cadastro sem crédito, 0 render preso, 0
`generation_stage_error`, 1 filme entregue. Nada quebrado — madrugada em BRT,
tráfego baixo.

**Anti-repetição.** O "próximo item" do #6 era **D2, a caixa vazia**, com uma
regra de decisão registrada de antemão: medir se a maioria digitou ou não. Fui
medir e o número mandou noutra direção. Dos **97 sem filme em 7 dias**: 70
chegaram ao Studio, **41 digitaram**, 31 submeteram, **19 deram erro**, 10
digitaram e desistiram, 29 nem digitaram. Dentro dos **29 que "nem digitaram"**
apareceu o que ninguém tinha olhado: **11 pessoas selecionaram o quickstart do
ChatGPT 49 vezes** e 6 dispararam `script_expand_autostarted` sem nunca chegar
ao gerador. Ou seja, boa parte do balde "não digitou" na verdade digitou — e
morreu no expansor, que não emite `analyze_idea_clicked`. D2 continua no
cardápio, com o denominador certo (agora ~18, não 29).

**O que estava errado (medido).** Funil do expansor, 14 dias, externos:

| evento | pessoas | eventos |
|---|---:|---:|
| `script_expand_autostarted` | **32** | 54 |
| `script_expanded` | 19 | 26 |
| `script_expand_failed` | **15** | 23 |
| `script_expand_accepted` | **12** | 14 |

Quase metade das pessoas cuja expansão dispara sozinha vê uma falha, e só 12 de
32 chegam a aceitar um texto. A causa dominante é `growth_limit` **com
`candidate_fits: true`** — o modelo escreveu um texto que ENCHE o alvo e nós o
jogamos fora. Três casos com o número no próprio evento:

    mehmetcakoglu  03/09 22:45  chatgpt.com  base 13s · teto  77 · candidato  96
    sohamughade96  03/09 05:57  taaft        base 19s · teto 107 · candidato 114
    livehigorxly   02/09 01:19  chatgpt.com  base 33s · teto 187 · candidato 230

O primeiro aconteceu **duas horas antes desta medição**. Nenhum dos três tem um
único filme entregue.

**A causa, e por que a tesoura de 02/09 não bastava.** O `KINEO-APARAR` já
existe desde 02/09 e apara o candidato que estourou o teto. Só que, para a apara
ser aceita, o texto tinha de cair na janela `[0,95 × alvo , 2,5 × base]` medida
em fala. Para o mehmet isso é **[33,25s , 33,7s]** — **meia palavra de
largura**, enquanto a tesoura corta por FRASE (10 a 20 palavras). Janela que
existe no papel e é intransponível na prática: a apara sempre cai fora, e a
pessoa leva a frase vermelha.

O que mudou de verdade hoje foi o vizinho. O **#1 desta sprint** (`6c822b36`,
já em produção) fez o RENDERIZADOR descer o alvo sozinho a partir de 60% de
cobertura, antes do custo: ele entrega um filme de 30s para quem pediu 35s. O
expansor não soube disso e continuou exigindo encher os 35s exatos. É a doença
das **DUAS RÉGUAS do #349** de novo, agora entre o expansor e o render — nós
recusávamos texto que o nosso próprio renderizador entregaria.

**O que mudou (arquivos).**
- `lib/expandPolicy.ts` (+118): `judgeTrimmedCandidate`, função pura, régua
  única do candidato aparado, **na ordem do contrato**: teto de 2,5× → Contrato
  C1 (frase do autor) → estrutura (HOOK/PAYOFF) → crescimento real → e só então
  o terceiro veredito honesto, `fits_lower_duration`. Devolve também o
  diagnóstico cru (`withinCap`/`authorOk`/`markersOk`/`fitsTarget`).
- `app/api/expand-script/route.ts` (+87/−13): o bloco da apara passa a chamar o
  veredito em vez de quatro condições soltas; `stillShort` e `expanded_ready`
  passam a contar a descida (**sem isso o botão de aprovar não aparece** e a
  pessoa fica no mesmo beco); a resposta carrega `effectiveDuration` e
  `autofitDown`; o 422 de `growth_limit` passa a carregar `trimAttempt`.
- `scripts/test-expansor-degrau.mjs` (novo, **49 verificações, 0 falhas**):
  executa as funções reais com os três casos do banco e **lê o `route.ts` real**
  para provar quem chama e em que ordem.
- `scripts/test-narration-ruler.mjs` (+11): estava **VERMELHO em origin/main** e
  não era o produto — procurava `const falaExpandida` e a rota usa `let` desde o
  #37. O invariante continua cobrado (a medida do "depois" sai da fala parseada,
  nunca do texto cru); o que mudou foi o teste parar de cobrar a palavra-chave.
  Mesma classe do teste do waitroom que apontei ao Codex às 18:45.

**Para o cliente / receita.** As ~15 pessoas por quinzena que colam um roteiro
curto, veem a expansão disparar sozinha e levam uma frase vermelha sem botão
passam a receber um filme. É o perfil mais caro de perder: vem do ChatGPT e do
TAAFT (os dois canais que convertem), já escreveu um texto próprio, e o primeiro
filme é o produto.

**O que este conserto NÃO faz — e o teste diz isso na cara.** Reproduzindo os
três casos, o `mehmet` (janela estreita) é salvo pela descida; o `soham` e o
`higor` saem por `fits_target`, ou seja **a apara antiga já deveria ter
funcionado neles**. Portanto ainda existe uma segunda causa nesses dois, que o
`trimAttempt` novo vai nomear na primeira ocorrência: teto, autor, marcador ou
enchimento. Não estou fechando o assunto — estou instrumentando o que faltava.

**Decisões que tomei sozinha** (autonomia; registradas para reversão):
1. **Piso do resgate = 30s (o piso HOLLYWOOD), não 20s.** A rota do expansor não
   sabe qual motor a pessoa escolheu, e o planner hollywood trava o alvo em
   `Math.max(30, …)`. Prometer um filme de 20s que o planner puxaria de volta
   para 30 recriaria o defeito que o #1 matou. Custa resgates (o caso de 25s do
   teste fica de fora) e compra uma promessa que vale nas duas estradas.
   Afrouxar: passar `AUTOFIT_DOWN_FLOOR_SECONDS`.
2. **`descidoPeloRender` conta como "pronto"** no portão do #26 ("o painel só
   aparece com expansão real e suficiente"). Não é afrouxar o portão: é ele
   passar a medir contra a duração que o render usa de verdade desde hoje, em
   vez de contra um número que o próprio servidor já não usa.
3. **Consertei um teste que não é da minha entrega** (`test-narration-ruler`).
   É do meu arquivo e estava vermelho antes de eu chegar (conferido com
   `git stash` sobre `origin/main`); teste vermelho crônico é teste que todo
   mundo aprende a ignorar.

**Risco.** O ponto sensível é a promessa: a tela ainda mostra o botão de 35s e o
filme sai com 30s. É o mesmo risco cosmético já registrado no #1, e a resposta
agora carrega `effectiveDuration` para o Codex escrever a frase honesta — pedido
aberto abaixo. Reverter a jogada inteira: `floorSeconds: 10000` na chamada de
`judgeTrimmedCandidate` em `app/api/expand-script/route.ts` (volta ao 422 de
hoje, sem tocar em mais nada).

**Modelo.** Feita em Opus (o plano reserva Fable para A1/A3; esta é jogada nova,
a "criatividade com critério" do dia, e vem depois de A1 e A2 entregues).

**Como medir (contra o marco zero, 03/09 16:00 UTC).**

```sql
select date_trunc('day', created_at)::date dia,
       name,
       metadata->>'reason' reason,
       count(*) n, count(distinct user_id) pessoas
from events
where name in ('script_expand_failed','script_expanded','script_expand_accepted')
  and created_at > '2026-09-03 16:00:00+00'
group by 1,2,3 order by 1 desc, 4 desc;
```

Meta: `script_expand_failed` com `reason='growth_limit'` **cair a zero**, e
`script_expand_accepted` subir contra `script_expand_autostarted` (hoje 12 de
32). Sinal secundário, o que importa: dessas pessoas, quantas entregam um filme
(`videos.status='completed'`) no mesmo dia.

**Próximo item.** **D2 com o denominador certo.** Os "29 que nem digitaram"
encolhem para **~18** depois de descontar os 11 do quickstart do ChatGPT — e
esses 11 são o achado novo: **49 seleções de quickstart em 11 pessoas (4,5 por
pessoa) e nenhuma chegou a submeter**. Antes de codar caixa vazia, medir o que
acontece entre `chatgpt_quickstart_selected` e `chatgpt_quickstart_studio_ready`
(58 pessoas selecionam, 35 chegam ao studio_ready): **23 pessoas somem no meio
de um fluxo de 3 eventos**. Se o buraco estiver no servidor, é meu; se estiver
na caixa, vira pedido ao Codex (já escrito).

**SHA.** `6c0885a3` (enfileirado em `entrega-atual`, fila = 1; aguardando o
clique no SUBIR-SITE.bat). Worktree: `C:\kineo-wt\expansor-degrau`.

---

### #8 — 23:30→00:55 BRT — a pessoa escrevia UMA frase, e a gente a acusava de ter tido "parte do seu roteiro" reescrita. 11 recusas, 7 pessoas, 4 delas sem um filme na vida — e o botão de saída clicado ZERO vezes.

**Placar da rodada** (SQL canônico, marco zero 03/09 16:00 UTC, contas externas):
16 cadastros · 11 pessoas com filme (69%) · 1 checkout COM filme · 1 checkout sem
filme · **0 assinaturas** · 0 pessoas com falha e sem filme.
**Checagem zero (1h): limpa** — 0 cadastro sem crédito, 0 render preso >25min,
0 `generation_stage_error` em 3h.

**A rodada começou refutando o próprio "próximo item" do #7.** O #7 mandou medir
o buraco do quickstart do ChatGPT (58 selecionam, 35 chegam ao `studio_ready`,
"23 pessoas somem no meio"). Medido por dia antes de codar:

| dia | selecionou | studio_ready |
|---|---:|---:|
| 28/08 | 5 | 0 |
| 29/08 | 17 | 1 |
| 30/08 | 9 | 8 |
| 31/08 | 3 | 3 |
| 01/09 | 13 | 13 |
| 02/09 | 5 | 5 |
| 03/09 | 7 | 7 |
| 04/09 | 2 | 2 |

**De 30/08 em diante os dois números são iguais todo dia.** Os 23 "perdidos" são
todos de 28-29/08, antes de o evento existir naquela rota (o primeiro
`studio_ready` é de 29/08 21:12). A prova independente é o relógio: em 11 dos 13
casos o `generate_arrived_server` seguinte veio a **menos de 1 segundo** do
`selected` — a pessoa chegou; o funil é que não a via. **Não há buraco no
quickstart.** Corrigi o pedido que o #7 tinha deixado aberto ao Codex, para ele
não gastar uma rodada num fantasma.

**E corrigiu também a premissa do D2.** O cardápio diz "caixa vazia". Medido em
7 dias (externos): 224 cadastros → 196 abriram o Studio → 127 com filme → **70
sem filme**. Desses 70: **48 DIGITARAM** e **31 chegaram a apertar gerar**. Quem
"não digitou" são 22, não 66. A caixa vazia é a minoria; a maioria escreve e não
recebe filme. Foi para os 31 que eu fui.

**O que estava errado (medido).** Varrendo as causas vivas de 48h, sobrou UMA que
ainda dispara depois de todos os consertos do dia: `author_rewrite_rejected` — 8
eventos, 4 pessoas, **o último às 00:05 de hoje**. Os 8 eventos que carregam a
contagem do #42 dizem tudo:

| autor | mexidas | candidato enchia o alvo? | quem |
|---:|---:|---|---|
| 1 | 1 | sim | taaft (×4, duas pessoas) |
| 2 | 2 | sim / não | taaft (×2) |
| 3 | 2 | sim | chatgpt.com — 00:05 de hoje |
| 14 | 1 | não | nav |

**Em 6 dos 8, `mexidas == autor`: nada do autor sobreviveu porque o autor tinha
UMA ou DUAS frases.** Dizer a essa pessoa *"the writer changed 1 of your 1
sentences instead of only adding to them"* é confessar um crime contra um
roteiro que nunca existiu — ela escreveu uma linha e pediu um filme. Em 6 dos 8 o
texto do modelo **enchia o alvo** (`candidate_fits: true`) e foi jogado fora
inteiro.

O preço: **das 7 pessoas que bateram nessa parede, 4 nunca fizeram um filme na
vida**, e 3 vieram de taaft e chatgpt.com — os dois canais que convertem.

**O que decidiu a jogada foi a porta irmã.** A mesma rota já tem, 150 linhas
acima, a resposta honesta para uma semente: `needs_authoring` — o 200 que diz
"isto é uma ideia, a gente escreve, com o seu consentimento, e você lê antes".
Comparando as duas portas na mesma situação:

| porta | ocorrências | tomaram a saída | filme em 2h |
|---|---:|---|---:|
| `author_rewrite_rejected` (422, acusação) | 11 | **0 de 11** (`script_rewrite_candidate_opened`) | 0 |
| `needs_authoring` (200, autoria) | 8 | 6 pedidos, 5 entregues, **4 aceites** | **3** |

Mesma pessoa, mesma situação, duas portas. Ela recebia a fechada. O botão que o
#42 construiu para essa tela — "Read the writer's version" — **nunca foi clicado
uma vez em 11 recusas**.

**O que mudou (arquivos).**
- `lib/expandPolicy.ts` (+53): `SEED_MAX_SENTENCES = 2` e
  `isSeedNotScript(totalAutor, frasesMexidas)`, função pura, com os 8 eventos de
  produção no comentário. Duas condições obrigatórias: nada do autor sobreviveu
  **e** o autor tinha no máximo 2 frases.
- `app/api/expand-script/route.ts` (+62): antes de acusar, a rota **pergunta se
  havia roteiro**. Semente sai por `needs_authoring` com
  `authoringReason: 'seed_rewritten'` (discriminador, para a medição não
  misturar com o `needs_authoring` do preflight), devolvendo o **original dela**
  em `script` e preservando o candidato do modelo para leitura.
- `scripts/test-expand-seed-authoring.mjs` (novo, 32 verificações): compila e
  **executa** o `lib/expandPolicy.ts` real com os 8 casos de produção, e lê o
  `route.ts` para provar quem chama e em que ordem.

**O Contrato C1 não afrouxa, e o teste tranca isso nas duas direções.** Autor com
3+ frases continua protegido palavra por palavra; autor com uma frase de pé entre
as mexidas continua caindo no 422 — é exatamente aí que a promessa do C1 quer
dizer alguma coisa. Os dois casos que a auditoria mandaria manter (3/2 do
chatgpt.com e 14/1 do nav) **continuam recusados**, por teste. Nada renderiza
sozinho: `needs_authoring` também exige clique e leitura.

**Para o cliente / receita.** As ~4 pessoas por semana que colam uma linha,
recebem uma acusação e vão embora passam a receber a pergunta certa ("quer que a
gente escreva?") pela porta que já entregou 3 filmes em 8 tentativas. É o perfil
mais caro de perder: vem do taaft e do chatgpt.com, e o primeiro filme é o
produto.

**Decisões que tomei sozinha** (autonomia; reversíveis):
1. **`SEED_MAX_SENTENCES = 2`, não 3.** O caso de hoje (3 frases, 2 mexidas)
   fica **de fora** — uma frase dela ficou de pé, então havia roteiro, e o C1
   protege. Perde-se uma pessoa por semana e compra-se a garantia de que nenhum
   roteiro de verdade seja reescrito em silêncio. Afrouxar: subir a constante.
2. **Exijo `mexidas >= autor`, não só o tamanho.** Um roteiro de 2 frases com 1
   mexida continua sendo recusa: o modelo tinha o que preservar e não preservou.
3. **A semente devolve o ORIGINAL em `script`, nunca o candidato.** Entregar o
   texto do modelo como se fosse o dela seria trocar uma desonestidade por outra.
   O candidato viaja junto, para a tela oferecer como leitura.
4. **Não toquei no `GenerateClient`.** É zona compartilhada e o Codex commitou
   nele às 21:16 de hoje (`0fea12ef`). A mudança é 100% de servidor e a tela já
   sabe renderizar `needs_authoring` — não depende de nada dele.

**Risco.** O risco real é o inverso do defeito: mandar para a autoria alguém que
queria o próprio texto preservado. Três travas: (a) as duas condições são
obrigatórias e conferidas contra a contagem REAL do `authorPreserved`, não
contra números escritos à mão; (b) o teste tranca os 8 casos de produção nos dois
sentidos; (c) `needs_authoring` não escreve nada sozinho — a pessoa clica e lê
antes do render. Risco menor: a tela do `needs_authoring` não tem auto-start (o
`script_authoring_auto_started` mora em outro gatilho), então parte da conversão
dos 4 aceites veio de lá; o pedido ao Codex sobre isso fica para quando o
`GenerateClient` esfriar.

**Como medir (contra o marco zero, 03/09 16:00 UTC).**

```sql
select date_trunc('day', created_at)::date dia,
       name,
       metadata->>'reason' reason,
       count(*) n, count(distinct user_id) pessoas
from events
where name in ('script_expand_failed','script_needs_authoring',
               'script_authoring_requested','script_authoring_accepted')
  and created_at > '2026-09-03 16:00:00+00'
group by 1,2,3 order by 1 desc, 4 desc;
```

Meta: `script_expand_failed` com `reason='author_rewrite_rejected'` **cair a
zero para autor de 1-2 frases**, e `script_needs_authoring` subir. Sinal
secundário, o que importa de verdade: dessas pessoas, quantas entregam um filme
(`videos.status='completed'`) no mesmo dia — hoje são 0 de 7.

**Placar de contexto.** 4 dos 7 SHAs do diário já estavam em produção quando a
rodada começou; **o fundador clicou no SUBIR-SITE durante a rodada e o #7 subiu**
— por isso o `enfileirar` deu conflito no `expandPolicy.ts` (os dois apenderam um
bloco no fim do arquivo). Resolvido à mão mantendo os dois; `test-expansor-degrau`
e `test-narracao-degrau` (do #7) seguem verdes por cima da minha mudança.
O `narration_guard_blocked` do #1 **parou às 09:55 UTC** e não voltou desde que o
degrau subiu às 17:00 UTC.

**Dívida que fica.** `scripts/test-narration-ruler.mjs` tem 1 invariante vermelho
em produção ("expand-script decide o 'depois' pela fala"): procura
`const falaExpandida` e a rota usa `let` desde o #37. O #7 já o conserta e acabou
de subir — conferir na próxima rodada se ficou verde.

**Próximo item.** **Os 22 que abriram o Studio e nunca digitaram** — agora com o
denominador limpo (não 66, não 29: 22 em 7 dias). Antes de codar, medir quanto
tempo eles ficam na tela e se chegam a focar a caixa: se abrem e saem em segundos,
não é caixa vazia, é gente que nem era do produto e a jogada muda de dono (vira
aquisição, do Codex). Se ficam e não escrevem, é minha, e a saída barata é o pouso
em `/viral-now` — 100% fora da zona do Codex, como o próprio cardápio anota no D2.

**Modelo.** Feita em Opus (o plano reserva Fable para A1/A3; esta é a causa viva
que a checagem de 48h apontou, não jogada nova de cardápio).

**SHA.** `5c0456a6` (enfileirado em `entrega-atual`, fila = 1; aguardando o
clique no SUBIR-SITE.bat). Worktree: `C:\kineo-wt\semente-autoria`.

---

### #9 — 23:04→23:35 BRT — 54 dos 95 cliques em "Rendering" apontavam para um render SEM ID, que a tela de destino não sabe religar. Uma pessoa clicou 16 vezes em cinco minutos hoje às 23:00 e foi embora sem o filme.

**Placar medido no início da rodada** (SQL canônico, contas externas, marco
zero 03/09 16:00 UTC; medição às 23:04 BRT / 04/09 02:04 UTC):

| métrica | valor |
|---|---:|
| cadastros pós-marco | 16 |
| pessoas com filme entregue pós-marco | **11 (69%)** |
| checkout de DESEJO (tem filme) | 1 |
| checkout de DEFEITO (0 filmes) | 1 |
| **assinaturas pós-marco** | **0** |
| pessoas com falha e sem filme | **0** |

A razão "cadastro com ≥1 filme" segue subindo contra o marco zero: **55% → 67%
(#7) → 69%**. Amostra pequena e de madrugada, mas na direção das jogadas #1-#8.

**Checagem zero (1h):** 1 cadastro, 0 sem crédito, 0 render preso >30min, 1
filme entregue — e **1 `generation_stage_error` com `TypeError`**, que é causa
de alarme no CLAUDE.md. Fui atrás dela, e ela levou à rodada inteira. (O
`TypeError` em si era falso alarme: `broll_plan_threw_autopilot` às 22:55:28,
capturado, com fallback — o despacho seguiu e as cenas do seedance foram
aceitas com HTTP 200. O que estava ao lado dele é que era o defeito.)

**O que estava errado (medido).** Cliques na pílula global de render, 14 dias,
contas externas:

| corte | valor |
|---|---:|
| cliques na pílula | 152 (52 pessoas) |
| cliques com `state='rendering'` | 95 |
| — desses, com **`render_id` NULO** | **54 (57%)** |
| pessoas nesse balde | **11** |
| — que **nunca** tiveram um filme completo | **6** |

**A causa.** `ActiveRenderPill.handleAction()` mandava TODO render para
`/studio/create`. Quem religa lá é `resumeServerActiveRender()`, e a função sai
na primeira linha: `if (!probe || probe.state !== 'rendering' || !probe.renderId) return`.
Um render cinematográfico ainda no fal **não tem render id** — a própria
`/api/compose/active` documenta isso desde 05/08, com todas as letras: *"it
carries no Creatomate render id ... resumable:false ... the client must NOT
offer 'Check progress' for it"*. O servidor avisava. A pílula não lia o aviso
(o tipo `Probe` dela nem tinha o campo `resumable`) e oferecia a porta assim
mesmo. Clicar não mudava nada na tela — então a pessoa clicava de novo.

Havia um segundo furo, na outra ponta: o ramo **compose** da sonda respondia
`resumable: true` **fixo**, inclusive quando a claim ainda não tinha o id do
Creatomate (ela nasce antes do POST ao provedor). Duas fontes, os dois lados
errados de jeitos diferentes.

**O caso vivo que abriu a rodada** (`angelchamorro12345`, 4 minutos antes desta
medição): cadastro às 22:29 vindo do **chatgpt.com**, telefone de 360px.
Entregou a **PARTE 1** de uma série às 22:39. Às 22:55 mandou renderizar a
**PARTE 2** (seedance, cenas aceitas, HTTP 200, crédito debitado). Das 22:59:49
às 23:00:56 clicou na pílula **16 vezes** — cada clique gerando
`generate_page_view` + `server_active_render_detected` com `render_id: null` e
`video_id: null` — e foi embora. Série é o grupo que mais converte da casa
(#4: 11,1% contra 1,6% da base).

**O que mudou (arquivos).**
- `lib/renderPillTarget.ts` (novo, 78 linhas): `alvoDaPilula()`, função pura —
  **uma** decisão para destino, rótulo e nome do clique. Regra: `religavel`
  exige as DUAS coisas (o servidor não ter dito `resumable:false` **e** existir
  um id). Sem id, o render vivo no motor vai para **`/history`** — onde o filme
  cai sozinho — com o rótulo **"My Videos"**, e não mais para um compositor que
  não sabe mostrá-lo.
- `components/ActiveRenderPill.tsx` (+40): o tipo `Probe` passa a carregar
  `resumable`; a leitura cruza com o id; destino, rótulo e ação vêm da função;
  `active_render_pill_clicked` e `_shown` passam a gravar `resumable` (a classe
  fantasma deixa de existir só por dedução) e o clique dela tem nome próprio,
  `action: 'track'`.
- `app/api/compose/active/route.ts` (+9/−2): `resumable` do ramo compose deriva
  do mesmo `idUsavel` que vira `render_id` — acabou a promessa fixa.
- `scripts/test-pilula-render-fantasma.mjs` (novo, 165 linhas): **44
  verificações, 0 falhas**, executando a função pura de verdade (apaga só as
  anotações de tipo do `.ts` real) e lendo os arquivos reais para provar quem a
  chama. Quatro delas congelam o caminho que **já funcionava**.
- `scripts/test-render-morto.mjs` (4 provas reescritas) e
  `test-pilula-proximo-episodio-2026-08-31.mjs` (1): liam literais que esta
  rodada moveu de lugar. As invariantes seguem cobradas — e a do
  próximo-episódio **já estava VERMELHA em `origin/main`** desde a #15
  (conferido com `git stash`), pela mesma doença.

**Para o cliente / receita.** As 11 pessoas por quinzena que hoje batem numa
porta que não abre enquanto o filme delas está sendo feito passam a chegar ao
lugar onde ele aparece. Seis delas nunca viram um filme da Kineo — e o primeiro
filme é o produto.

**O que esta rodada NÃO faz.** Não acelera render nenhum e não muda o que o
`/studio/create` mostra: lá, o cartão azul "Your video is rendering" só aparece
nas fases `idle | script_preview | options`. Quem já digitou outra coisa
continua sem ver o próprio render naquela tela — é `GenerateClient`, zona
compartilhada com commit do Codex hoje às 21:16, então virou **pedido**.

**Decisões que tomei sozinha** (autonomia; registradas para reversão):
1. **O destino do render sem id é `/history`, não "botão nenhum".** Tirar o
   clique também mataria o loop, mas deixaria a pessoa sem lugar nenhum para
   ir. `/history` é a única tela que muda visivelmente E é onde o filme cai.
   Reverter: `href: '/studio/create'` no ramo não-religável.
2. **A fonte mais restritiva vence** (id nulo derruba `resumable:true`). É o
   oposto de confiar num só lado — os dois lados já erraram, cada um do seu
   jeito. Reverter a jogada inteira: `religavel = entrada.resumable !== false`.
3. **Consertei 5 provas de dois testes vizinhos**, uma delas vermelha em
   produção antes de eu chegar. Mesma decisão do #7: teste vermelho crônico é
   teste que todo mundo aprende a ignorar.
4. **Não mexi no `TypeError`** do `broll_plan_threw_autopilot`. Ele é capturado,
   tem fallback e o render seguiu — consertar o que não está quebrado gastaria
   a rodada. Fica anotado: 3 ocorrências em 30 dias, 3 pessoas.

**Risco.** Baixo. O caminho que já funcionava (render com id) está congelado por
4 provas. O único jeito de piorar seria um render religável ser classificado
como fantasma — e para isso o servidor teria de mandar `render_id` nulo, caso
em que a religação já era impossível hoje. Risco cosmético: quem clica agora sai
da tela em que está; era o preço de não voltar para uma tela muda.

**Dívida que fica** (minha, para uma rodada futura):
`scripts/test-fila-global-pilula-2026-08-31.mjs` está **39/45 em `origin/main`**
— 6 provas (B1, G0-G4) presas na forma antiga do cartão. Medido antes e depois
da minha mudança: os mesmos 39/45. Não é desta entrega, mas é do meu arquivo.

**Como medir (contra o marco zero, 03/09 16:00 UTC).**

```sql
select date_trunc('day', created_at)::date dia,
       metadata->>'action' acao,
       metadata->>'resumable' religavel,
       count(*) n, count(distinct user_id) pessoas
from events
where name = 'active_render_pill_clicked'
  and created_at > '2026-09-03 16:00:00+00'
group by 1,2,3 order by 1 desc, 4 desc;
```

Meta: `action='track'` (a classe nova) existir e **não repetir** — hoje a mesma
pessoa clica 4,5 vezes em média nesse balde, e o pior caso foi 16. Sinal
secundário, o que importa: dessas pessoas, quantas entregam um filme no mesmo
dia — hoje 6 das 11 nunca entregaram nenhum na vida.

**Modelo.** Feita em Opus (o plano reserva Fable para A1/A3; esta é a causa viva
que a checagem zero apontou, não jogada nova de cardápio).

**Próximo item.** Continua o **D2 com denominador limpo (22 pessoas em 7 dias)**
que o #8 deixou: medir quanto tempo elas ficam no Studio e se chegam a focar a
caixa, antes de codar. Se abrem e saem em segundos, a jogada muda de dono (vira
aquisição, do Codex); se ficam e não escrevem, é minha e a saída barata é o
pouso em `/viral-now`. **Antes disso**, se a próxima rodada for de madrugada:
conferir se `action='track'` já apareceu e se o `angelchamorro12345` recebeu a
PARTE 2 (às 23:08 ainda não tinha chegado, 13 min depois do despacho).

**SHA.** `2c98df51` (enfileirado em `entrega-atual`, fila = 1; aguardando o
clique no SUBIR-SITE.bat). Worktree: `C:\kineo-wt\pilula-fantasma`.

---

### #10 — 00:05→01:20 BRT — o #9 mandava o render para uma tela que NÃO SABE que o filme existe. E clicar "My Videos" estando em `/history` era o mesmo loop de 16 cliques, mudado de lugar.

**Placar medido no início da rodada** (SQL canônico, contas externas, marco
zero 03/09 16:00 UTC; medição às 00:02 BRT / 04/09 03:02 UTC):

| métrica | valor |
|---|---:|
| cadastros pós-marco | 17 |
| pessoas com filme entregue pós-marco | **12 (71%)** |
| checkout de DESEJO (tem filme) | 1 |
| checkout de DEFEITO (0 filmes) | 1 |
| **assinaturas pós-marco** | **0** |
| pessoas com falha e sem filme | **0** |

A razão "cadastro com ≥1 filme" continua subindo contra o marco zero:
**55% → 67% (#7) → 69% (#9) → 71%**.

**Checagem zero (1h): limpa.** 1 cadastro, 0 sem crédito, 0 render preso >30min,
3 filmes entregues, 1 `generation_stage_error` — o MESMO `TypeError` de
`broll_planning` que o #9 já classificou como falso alarme (capturado, com
fallback, e o filme saiu). Os dois pendentes que o #9 deixou também fecharam:
`angelchamorro12345` **recebeu a PARTE 2** (completed às 23:31 BRT), e
`action='track'` ainda é 0 porque o #9 não subiu — a fila espera o clique.

**A rodada nasceu de auditar a minha própria entrega anterior, antes de ela
subir.** O #9 parou de mandar o render SEM id para `/studio/create` e passou a
mandar para `/history`, com a frase *"the film saves to My Videos on its own"*.
Fui conferir o destino. Ele tem dois furos, e os dois são a MESMA doença que o
#9 dizia estar curando:

**(a) `/history` não sabe que o filme existe.** `app/(dashboard)/history/page.tsx`
faz UMA leitura de `videos` no servidor. A linha de `videos` nasce no **fim**,
quando o compose termina — um render cinematográfico ainda no fal **não tem
linha nenhuma**. Ou seja: a pessoa era levada para uma tela que não podia
mostrar o filme dela, e via a lista velha ou **"No videos yet"**. É literalmente
a lição do incidente JWT-skew de 28/08, que está escrita como comentário na
linha 934 do próprio arquivo que eu ia usar como destino.

**(b) o clique continuava sendo um no-op, só que em outra tela.** A pílula é
montada em TODA página autenticada, `/history` inclusive. Clicar "My Videos"
estando em `/history` é `router.push` da rota atual: a rota não muda, a tela não
muda, nada acontece. É exatamente o loop que o #9 mediu — 95 cliques em
`state='rendering'` em 14 dias, **54 deles com `render_id` nulo**, 11 pessoas,
**6 sem um filme na vida**, pior caso 16 cliques em 5 minutos.

**O que mudou (arquivos).**
- `components/HistoryActiveRenderCard.tsx` (novo, 176 linhas): cartão no topo do
  `/history`, alimentado pela **mesma** sonda que a pílula já lia
  (`/api/compose/active`). Diz o que o servidor respondeu, com o relógio da
  espera. **Não é um segundo poller de render**: nunca fala com
  `/api/compose/status` nem com a Creatomate, nunca faz POST, nunca dispara
  geração. Sonda ao montar e a cada 20s **só** enquanto o estado for
  `rendering`; aba escondida não sonda; resposta não-ok vira silêncio, nunca uma
  afirmação sobre o filme de alguém. Quando o servidor responde `completed` **e
  esta tela tinha visto o render vivo**, chama `router.refresh()` — a lista
  (server component) recarrega e o filme entra pelo caminho normal.
- `lib/renderPillTarget.ts` (+53): `mesmaTela()`, função pura. O clique só é
  oferecido quando **muda de tela** (ignora query, barra final, caixa e âncora;
  caminho desconhecido devolve `false`, fail-open — na dúvida a saída continua).
- `components/ActiveRenderPill.tsx` (+34): a condição entra no `hidden`, e não
  só no JSX — senão o efeito de impressão gravaria `active_render_pill_shown`
  para uma pílula que ninguém viu, e a medição do #9 mentiria justamente na
  primeira tela consertada. `handleAction` nunca empurra para a rota atual
  (cinto e suspensório), e o clique passa a gravar `same_screen`.
- `app/(dashboard)/history/HistoryClient.tsx` (+13): o cartão montado nas DUAS
  metades — lista cheia e tela vazia. Na vazia ele vem **antes** do
  "No videos yet", que é onde a promessa doía mais.
- `scripts/test-historico-render-vivo.mjs` (novo): **57 verificações, 0 falhas**,
  executando a função pura de verdade e lendo os arquivos reais para provar quem
  a chama e em que ordem. Três delas congelam o que o #9 já fazia.
- `scripts/test-pilula-render-fantasma.mjs` (+5): o shim TS→JS aprende as duas
  anotações novas. Sem isso o teste do #9 ficava **vermelho sem defeito nenhum
  no produto** — e teste vermelho crônico é teste que todo mundo aprende a
  ignorar (mesma decisão do #7 e do #9).

**Para o cliente / receita.** As 11 pessoas por quinzena que o #9 passa a mandar
para a biblioteca chegam a uma tela que **muda**: ela diz que o filme está sendo
feito, mostra há quanto tempo, e o pega sozinha quando fica pronto. Sem esta
rodada, o #9 teria trocado uma porta que não abre por uma sala vazia — e 6
dessas 11 pessoas nunca viram um filme da Kineo.

**Duas medições que mudam o que as próximas rodadas devem fazer** (feitas antes
de escolher a jogada, e as duas contrariam o cardápio):

1. **A4 do cardápio está morto — não gastar rodada nele.** O plano manda subir o
   `MAX_AGE_MS` do `finish-stranded-renders` de 20h para 72h por causa de "110
   renders / 87 pessoas com compose submetido e sem linha em `videos`". Medido
   em 30 dias (externos): 764 claims de compose, **71 sem linha em `videos`, 58
   pessoas** — mas a série por dia mostra o assunto **acabando em 24/08**: 11 em
   19/08, 8 em 16/08, 7 em 17/08… e **1 único caso desde 24/08** (02/09). O
   irmão dele também parou: `cinematic_abandoned_no_delivery` teve **76 estornos
   / 64 pessoas em 30 dias (36 delas sem filme nenhum)**, e o último foi
   **02/09 13:31** — nenhum em 37 horas. O que matou os dois foi o #17 do sprint
   anterior (Data Cache da Vercel, `fetchCache='force-no-store'`, 02/09 04:47).
   Subir a janela hoje pescaria quase nada. **A4 sai da fila até a causa
   reaparecer.**
2. **O guarda `prompt_looks_like_instruction` está CERTO — não afrouxar.** É
   hoje a causa viva mais frequente do produto: **36 eventos, 35 pessoas, entre
   02/09 05:43 e 04/09 00:10 (20 minutos antes desta medição), 12 delas sem um
   filme na vida.** A tentação era relaxá-lo (é ele que impede o auto-start de
   fazer o primeiro filme sozinho). Fui ver os tamanhos antes: **os 36 têm ≥300
   caracteres** (30 na faixa 300-699, 2 em 700-999, 4 exatamente em 1.000). Não
   há um só caso de alguém escrevendo "make a video about X" e sendo barrado —
   é 100% colagem de pacote do ChatGPT. Afrouxar renderizaria lixo automático,
   que é exatamente o que a **⛔ trava de qualidade do fundador (03/09 23:40)**
   proíbe. **O problema não é o guarda: é o que a tela oferece depois dele** — e
   os 4 casos em exatamente 1.000 caracteres são o corte silencioso da caixa do
   quickstart, que já é pedido aberto ao Codex desde 00:45.

**Decisões que tomei sozinha** (autonomia; registradas para reversão):
1. **A condição de esconder a pílula mora no `hidden`, não só no JSX.** Só no
   JSX, a pílula sumiria da tela mas continuaria contando impressão — eu estaria
   consertando o produto e estragando a medição do #9 no mesmo commit. Reverter:
   tirar `renderNaPropriaTela ||` do `hidden`.
2. **`mesmaTela` falha ABERTO** (caminho desconhecido = "muda de tela"). O erro
   caro é esconder a saída de quem precisa dela; o erro barato é oferecer um
   clique a mais. Reverter a jogada inteira: `return false` no topo de
   `mesmaTela`.
3. **Aceitei duas sondas na mesma tela** enquanto houver um render vivo em
   `/history` (a do cartão e a da pílula, que continua lendo para os estados
   `completed`/`failed`). São dois GET baratos a cada 20s, só para quem tem
   render em voo naquela página. Unificar exigiria a pílula publicar o estado
   dela para a página — refactor maior do que a rodada. **Fica anotado como
   dívida.**
4. **Não toquei no guarda do auto-start** (ver medição 2), nem em nada do
   caminho de geração: nem `lib/compose`, nem `hollywood`, nem `cinematic`, nem
   `broll`, nem escolha de motor, nem régua de palavras por segundo.

**Risco.** Baixo e contido na tela. O pior caso do cartão é ele aparecer e não
sumir (a sonda para de responder) — a lista continua embaixo, intacta, e nenhum
crédito é tocado. O pior caso da pílula é ela sumir de uma tela onde ainda
seria útil; só acontece em `/history`, que agora mostra a mesma informação
maior. O caminho religável (render COM id → `/studio/create`) está congelado por
teste nos dois arquivos.

**Dívida que fica.** (a) as duas sondas do item 3; (b)
`scripts/test-fila-global-pilula-2026-08-31.mjs` segue **39/45**, os mesmos 6 de
antes da minha mudança (dívida herdada, anotada no #9).

**Como medir (contra o marco zero, 03/09 16:00 UTC).**

```sql
select date_trunc('day', created_at)::date dia, name,
       metadata->>'resumable' religavel, metadata->>'same_screen' mesma_tela,
       count(*) n, count(distinct user_id) pessoas
from events
where name in ('history_active_render_shown','history_active_render_landed',
               'active_render_pill_clicked')
  and created_at > '2026-09-03 16:00:00+00'
group by 1,2,3,4 order by 1 desc, 5 desc;
```

Meta: `history_active_render_shown` existir (hoje é impossível), e
`active_render_pill_clicked` com `same_screen=true` ser **zero para sempre** —
essa classe deixou de poder acontecer. Sinal secundário, o que importa: dessas
pessoas, quantas entregam um filme no mesmo dia — hoje 6 das 11 nunca
entregaram nenhum na vida.

**Modelo.** Feita em Opus (o plano reserva Fable para A1/A3; esta é auditoria da
própria entrega anterior, não jogada nova de cardápio).

**Próximo item.** **C2 — a oferta no pico do 2º download**, com o número desta
rodada: em 7 dias, **128 pessoas receberam um filme e 106 fizeram exatamente
UM**; **65 dessas 106 ainda têm ≥5 créditos** (dá para outro filme, de graça,
agora) e só **25 das 106** voltaram a abrir a tela de gerar. O 2º filme é a
única razão para voltar amanhã, e o grupo de série converte 11,1% contra 1,6%
da base. Antes de codar, medir onde estão os 65 e se o `plan_fit` já os alcança
— `plan_fit_impression` são 23 pessoas em 7 dias, então provavelmente não.

**SHA.** `ba8cfdba` (enfileirado em `entrega-atual`, fila = **4 commits**, que sao o #9 e o #10 — o #8 ja esta em origin/main;
aguardando o clique no SUBIR-SITE.bat). Worktree:
`C:\kineo-wt\historico-render-vivo`.

---

### #9 — 09:40→10:20 BRT (04/09) — o cadastro por E-MAIL E SENHA nascia sem os 25 créditos. 4 pessoas só hoje, e nenhum dos 14 órfãos de 21 dias fez UM vídeo na vida.
### #11 — 09:40→10:20 BRT (04/09) — o cadastro por E-MAIL E SENHA nascia sem os 25 créditos. 4 pessoas só hoje, e nenhum dos 14 órfãos de 21 dias fez UM vídeo na vida.

**Placar da rodada** (SQL canônico, marco zero 03/09 16:00 UTC, contas externas):
33 cadastros · 20 pessoas com filme (61%) · 1 checkout COM filme · 1 checkout sem
filme · **0 assinaturas** · 0 pessoas com falha e sem filme.

**Checagem zero: NÃO estava limpa — e a minha própria checagem não a via.**
Render preso >25min: 0. `generation_stage_error` em 3h: 0. Cadastro sem crédito
na última 1h: 0 — **e era falso conforto**. Alargando para 30h apareceram
**4 contas nascidas com `video_credits = 0` e `trial_status` NULL**, todas de
hoje, entre 04:58 e 11:09 UTC. A janela de 1 hora do roteiro é curta demais
para um defeito que acontece ~0,7 vez por dia: ela ia continuar dizendo "limpa"
para sempre. **Passo a varrer 30h nesta checagem.**

**Correção de rota antes de codar.** Comecei lendo `app/auth/callback/route.ts`
no diretório de trabalho e concluí que o grant do `a1fed16c` tinha sido
revertido. **Estava errado**: a árvore local está parada no `727a869c`, que é
ANTERIOR ao `a1fed16c`. Lido de `origin/main`, o grant do callback está vivo e
intacto. O buraco é outro, e mais estreito.

**O que estava errado (medido).** Em 28/08 o `a1fed16c` devolveu o crédito de
cadastro ao CADASTRO: a ativação passou a rodar em `app/auth/callback/route.ts`,
"o único ponto de servidor por onde TODA conta nova passa obrigatoriamente".
A frase é verdadeira para OAuth e link mágico — **e só para eles**. Quem se
cadastra com e-mail e senha **nunca cruza o `/auth/callback`**: essa conta
continuou dependendo dos dois caminhos frágeis que o próprio `a1fed16c`
condenou por escrito — a VISITA a `/studio/create` e o `fetch`
fire-and-forget de `/api/track-signup-source`.

| caminho de cadastro (14d, externos) | pessoas | com grant | sem grant | sem grant COM filme |
|---|---:|---:|---:|---:|
| `auth_callback_completed` (OAuth) | 290 | 286 | 4 | 0 |
| **só `email_signup_completed` (senha)** | **47** | 43 | **4 (8,5%)** | **0** |

Os 4 do caminho de senha são **todos de hoje**, numa janela de 6h, e têm o
MESMO rastro: `email_signup_completed` → `homepage_view` /
`viral_onboarding_viewed`. A pessoa se cadastrou, caiu na **vitrine** (o pouso
padrão desde 25/08), nunca abriu o /studio, e o fetch do cliente não chegou.
Em 21 dias são **14 órfãos no total, e NENHUM dos 14 fez um único vídeo na
vida** — a taxa de morte desse grupo é 100%. É o mesmo defeito que em 28/08
levou 17%→100% dos cadastros, sobrevivendo na única porta que a cura não
cobriu.

**A prova de que esta é a porta certa.** `/api/auth/activation-completed` é o
espelho exato do callback para o caminho de senha: roda no SERVIDOR, devolve
401 sem sessão (logo, quando ela escreve, o usuário está autenticado), e os
**QUATRO órfãos têm `email_signup_completed` gravado** — ela foi alcançada em
100% dos casos que ficaram sem crédito. Nenhum outro ponto tem essa
propriedade.

**O que mudou (arquivos).**
- `app/api/auth/activation-completed/route.ts` (+70): chama
  `maybeActivateReverseTrial` com o fingerprint desta request, **awaited**, em
  try/catch que só loga. Idempotente por construção — a UPDATE do grant é
  protegida por `.is('trial_status', null)` dentro de `lib/reverseTrial.ts`,
  então callback, `/studio/create`, `track-signup-source` e esta rota podem
  todos chamar: quem chegar primeiro concede, o resto é no-op. As guardas
  anti-abuso continuam INTEIRAS (conta <24h, 1 trial por conta para sempre,
  domínio descartável, N trials por fingerprint). O evento
  `email_signup_completed` passa a carregar `trial_activated` e `trial_reason`
  — a medição sai de graça.
- `scripts/test-trial-grant-orfao.mjs` (+43, 11 verificações novas, 25 no
  total): lê o `route.ts` REAL e prova import, chamada, `await` (não `void`),
  ordem contra a guarda de 401 e contra o `return`, catch que não quebra o
  cadastro, fingerprint da request, a medição no evento, e a **não-regressão do
  bloco de afiliado do Codex** (`076ca7bb`, que vive no mesmo arquivo).
  **Falsificado**: trocando o `await` por `void`, 3 verificações caem.

**Para o cliente / receita.** ~0,7 pessoa por dia parava de existir como
cliente no primeiro minuto: cadastrava, via um produto que não podia usar e ia
embora. Nenhuma delas fez um vídeo — e o primeiro filme é o produto. A cura
custa uma chamada idempotente e nenhuma linha nova de banco.

**Decisões que tomei sozinha** (autonomia; reversíveis):
1. **NÃO reparei as 4 contas de hoje.** Três são domínios descartáveis com
   local-part hexadecimal (`vmail.dev` x2, `mailshan.com`) e a quarta é um
   alias de pontos do Gmail, todas numa rajada de 6h — e uma quinta conta
   `@vmail.dev` da mesma rajada JÁ recebeu o trial e queimou os 25cr em 3
   filmes. Dar 25cr às outras seria pagar um farmer. Reversível pelo botão
   "+ créditos" do `/admin/people`.
2. **Não mexi na lista de domínios descartáveis.** `vmail.dev` e `mailshan.com`
   **não** estão em `DISPOSABLE_EMAIL_TOKENS` (`lib/reverseTrial.ts:232`) e o
   farmer passa por ela hoje, antes e depois desta mudança — minha correção não
   abre porta nova. Bloquear é decisão de política de abuso, não desta jogada;
   fica registrada abaixo como sugestão.
3. **Estendi o teste que já existia em vez de criar outro.** A checagem contra
   o banco ("nenhum cadastro das últimas 72h ficou sem trial") já morava lá e
   está **VERMELHA em produção agora** — não faz sentido ter dois arquivos
   guardando o mesmo alarme.

**Risco.** Baixo e conhecido: a rota ganha um `await` a mais no caminho do
cadastro (a mesma latência que o callback já paga desde 28/08); erro só vira
log e o cadastro segue; e a dupla concessão é impossível pela guarda
`.is('trial_status', null)`, que o teste tranca. O risco residual seria
conceder a quem a guarda de fingerprint teria barrado — não existe: o
fingerprint é calculado e passado daqui, como no callback.

**Como medir (contra o marco zero, 03/09 16:00 UTC).**

```sql
-- 1) o alarme direto: cadastro externo sem trial. Meta: zero linhas.
select p.email, p.created_at, p.video_credits
from profiles p
where p.trial_status is null
  and p.created_at > now() - interval '72 hours'
  and p.email not ilike '%josephsskaf%' and p.email not ilike '%usekineo%'
order by p.created_at desc;

-- 2) a medicao nova, de graca, dentro do proprio evento de cadastro
select date_trunc('day', created_at)::date dia,
       metadata->>'trial_activated' ativou,
       metadata->>'trial_reason'    razao,
       count(*) n
from events
where name = 'email_signup_completed' and created_at > '2026-09-04 12:00:00+00'
group by 1,2,3 order by 1 desc, 4 desc;
```

Meta: query (1) sempre vazia. Na (2), `trial_activated=true` OU `false` com
`trial_already_used` (o fetch do cliente ganhou a corrida) são os dois
desfechos saudáveis; `false` com `no_profile`/`read_error` é defeito novo.
Sinal que importa de verdade: dos cadastros por senha, quantos entregam um
filme — hoje os 4 órfãos entregaram 0 de 4.

**Sugestões para o fundador decidir (não executei).**
1. **`vmail.dev` e `mailshan.com` na lista de descartáveis.** Local-part de 16
   dígitos hexadecimais é endereço de máquina. Hoje um deles ganhou 25cr e
   queimou em 3 filmes — é gasto de fal sem chance de assinatura. Dois tokens
   com ponto (casam domínio exato + subdomínio), reversível em 2 linhas.
2. **`studio_prompt_over_limit_shown` disparou 275 vezes em 90 segundos** para
   uma única pessoa (`mdshahbaz052005`, 02/09, 0 filmes). São 5 pessoas e 303
   eventos na história inteira: o aviso de limite parece estar preso a cada
   tecla. Não é o gargalo de assinatura, mas polui toda contagem por evento.

**Placar de contexto.** A fila da `entrega-atual` já tinha **6 commits** quando
eu cheguei — este é o **7º**. Nada disso está em produção até o clique. O
**Placar de contexto — e uma colisão de numeração.** Cheguei numerando esta rodada como #9 e descobri, na hora de enfileirar, que OUTRA SESSÃO já tinha colocado um #9 e um #10 na fila (os dois sobre o clique em "Rendering" que apontava para render sem id). Renumerei para #11 e refiz os dois commits: quem lê o diário depois não pode ter dois #9. Regra que fica: conferir `git log origin/main..entrega-atual` ANTES de escolher o número, porque `origin/main` só mostra o que já subiu. A fila da `entrega-atual` já tinha **6 commits** quando
eu cheguei. Nada disso está em produção até o clique. O
`narration_too_short` do #1 continua morto: o último evento da família é de
**03/09 09:55 UTC**, 7h antes de o degrau subir, e não voltou em 24h. O
expansor também esfriou: 3 eventos desde 03/09 12:00 UTC, e o único
`author_rewrite_rejected` (3 frases / 2 mexidas) é exatamente o caso que o #8
decidiu manter recusado.

**Próximo item.** Os **22 que abriram o Studio e nunca digitaram** (denominador
limpo do #8) continuam sem medição de tempo de tela — segue de pé. Mas antes
dele vem uma pergunta que o placar desta rodada levanta: **20 pessoas com filme
e 1 checkout**. O #8 e o #9 tiraram pedras do caminho até o primeiro filme; o
primeiro filme está saindo (61%) e a assinatura não vem atrás. A próxima
rodada minha deve medir **o que acontece na tela DEPOIS do filme pronto** para
quem tem `videos_ok = 1` (`video_ready_viewed` → `video_download_clicked` →
`series_continue_seen` → aba fechada), porque é ali que o produto já provou
valor e não pede nada.

**Modelo.** Feita em Opus (o plano reserva Fable para A1/A3; esta é a causa
viva que a checagem zero apontou, não jogada nova de cardápio).

**SHA.** `9e0f9243` (enfileirado em `entrega-atual`, fila = 7; aguardando o
**SHA.** `ff33f80c` (enfileirado em `entrega-atual`; aguardando o
clique no SUBIR-SITE.bat). Worktree: `C:\kineo-wt\grant-email-signup`.
