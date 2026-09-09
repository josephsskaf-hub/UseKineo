# ROTINA ENTREGA — noite 08→09/09/2026

Missão: quem aperta Generate recebe o filme. Métrica: despachos que terminam
em vídeo `completed` / despachos totais, POR PESSOA, com corte no SHA de cada
conserto (nunca por relógio).

Worktree: `C:\kineo-wt\noite-entrega` · base `origin/main` a6d9cd7a.

---

## r1 20:40 — AUDITORIA COM DENOMINADOR

### O QUE MEDI

Contas externas (email sem josephsskaf/usekineo/kineo.local), **14 dias**,
por PESSOA. Denominador = `video_generation_started` (evento de cliente, o
único que existe para TODOS os motores). Desfecho = linha em `videos`
(verdade de servidor; a tabela só ganha linha quando o filme completa —
conferido: zero linhas com status ≠ completed nesta coorte).

**280 pessoas apertaram Generate · 230 receberam filme (82,1%) · 50 não.**

| causa (por PESSOAS) | pessoas | viram alguma tela de falha |
|---|---:|---:|
| **1. SILÊNCIO — nenhum erro registrado** | **22** | **0** |
| **2. narração curta (`narration_guard_blocked`)** | **12** | 4 |
| 3. PORTÃO de pagamento (não é falha) | 9 | 2 |
| 4. falha técnica (`fast_threw`/TypeError) | 6 | 2 |
| 5. PORTÃO via modal de upgrade (não é falha) | 1 | 0 |

Separando o que a ordem manda separar: **falha real = 40 pessoas**,
**portão = 10**.

**O fato transversal, e o maior número da noite: das 40 pessoas com falha
real, 32 (80%) NUNCA viram uma tela de falha.** O produto não erra alto —
ele fica mudo.

### DUAS CORREÇÕES DE LEITURA (números anteriores que não se sustentam)

1. **"O POST morre dentro do navegador" é artefato de corte.** O comentário
   em `app/api/cron/finish-stranded-renders/route.ts:1009` registra "9 das 11
   não têm sequer `generation_dispatch_received`". Esse evento **nasceu em
   05/09 20:56:54 UTC** (`KINEO-DISPATCH-ENTRY-2026-09-05`): quem despachou
   antes disso não podia tê-lo. Medido só na janela em que o campo existe:
   **100 de 101 despachos chegaram ao servidor** (65 pessoas). Um único
   despacho se perdeu no navegador em 3 dias. A coorte da carta
   `attempt_lost` é muito menor do que o comentário supõe.
   (memória `campo-novo-e-o-carimbo-do-deploy`)

2. **`narration_too_short` já está muito mitigado.** O autofit-down
   (`KINEO-DEGRAU-2026-09-03`, `lib/narrationFit.ts`) está LIGADO e chamado
   em `app/api/generate-video-cinematic/route.ts:1416`: **11 pessoas salvas**
   desde 04/09 (`script_duration_autofit_down`). Os 4 bloqueios que sobraram
   desde então têm cobertura de 6%, 14%, 32% e 53% — fala de 2s, 5s, 19s e
   32s. Ali recusar continua certo. O que NÃO está certo é como se recusa
   (ver causa nº2).

### AS DUAS CAUSAS ESCOLHIDAS (por pessoas atingidas, não por gravidade)

**CAUSA Nº1 — O TRABALHO PRONTO QUE EVAPORA COM A ABA. 22 pessoas.**

Mecanismo, lido no código e confirmado no rastro de duas pessoas na janela
válida:

- `/api/generate-video-fast` roda 30–40s e termina devolvendo o payload
  COMPLETO do compose (`generationId`, `clip_urls`, `voiceover_script`,
  `scene_captions`, `duration`) — rota, linha 1146.
- O checkpoint durável no servidor (`/api/render-recovery`,
  `KINEO-RECOVERY-2026-09-06`) só nasce quando **o CLIENTE recebe essa
  resposta** e a reenvia (`GenerateClient.tsx:9466`).
- Se a aba morreu enquanto o servidor trabalhava, a resposta cai no vazio:
  clipes buscados e script pronto **evaporam**, nenhum checkpoint existe, a
  fase 4 do cron é cega, e a pessoa nunca é avisada de nada.

Rastro da pessoa `1968136d` (06/09, Fast, vinda do ChatGPT): despacho 07:21:19
→ `generation_dispatch_received` 07:21:27 → aba embora 07:21:45 (27s de
espera) → **nunca mais nenhum evento, nenhum vídeo, nenhum erro**. O servidor
recebeu, trabalhou e o resultado morreu no ar.

O remédio existe e funciona — 43 de 48 checkpoints viraram filme desde 06/09.
Ele só nasce tarde demais: depende do sobrevivente para socorrer o afogado.

**CAUSA Nº2 — A RECUSA QUE NÃO CHEGA À TELA. 8 das 12 de narração curta.**
A guarda recusa o render e devolve 422; 8 das 12 pessoas bloqueadas em 14
dias não têm `generation_failed_screen_shown`. Elas apertaram, foram
barradas por uma decisão NOSSA, e não viram a frase que explica o porquê.

### O QUE MUDOU NESTA ROTAÇÃO
Nada em código. Rotação de auditoria — a ordem manda escolher as causas pelo
número de pessoas, e as duas escolhidas mudaram depois do corte correto.

### SHA
Sem commit de código nesta rotação.

### O QUE FICOU
r2: causa nº1 em código — o servidor grava o próprio checkpoint antes de
devolver, para que o filme não dependa da aba continuar viva. Guardião
`scripts/test-entrega-noite-2026-09-09.mjs`.

---

## r2 21:10 — CAUSA Nº1 EM CÓDIGO: o filme deixa de morrer junto com a aba

### O QUE MUDOU
`app/api/generate-video-fast/route.ts` — a própria rota do Kineo 1 grava o
checkpoint de resgate (`fast_compose_recoverable`, `source:'server'`) no
instante em que o payload existe, **antes** de devolver a resposta. Até hoje
esse checkpoint só nascia quando o CLIENTE recebia a resposta e a reenviava
para `/api/render-recovery`: aba morta = clipes e roteiro prontos evaporados,
nenhum checkpoint, fase 4 do cron cega, pessoa nunca avisada.

`app/api/render-recovery/route.ts` — a única exceção à idempotência: um
checkpoint do CLIENTE substitui um do SERVIDOR, uma vez. Sem isso, ligar o
conserto rebaixaria o resgate de quem tem aba viva (o payload do servidor não
tem `vertical`), e o remédio novo estragaria o remédio velho.

**O pipeline de qualidade não foi tocado:** mesmo `sanitizeFastComposePayload`,
mesmo nome de evento, mesma fase 4, mesmo `/api/compose` com custo por tier,
recusa por saldo e claim assinado. Prompt de cena, contrato, régua de voz,
planner, motor e crédito ficam idênticos. O que muda é quem grava o bilhete.

### GUARDIÃO
`scripts/test-entrega-noite-2026-09-09.mjs` — **23 verificações, verdes.**
Amarradas à condição que decide, não a texto solto. CRLF normalizado na
leitura; sem alias `@/` (senão o arquivo morre no import antes da 1ª asserção).

**Falsificado por 3 mutações, cada uma com a aplicação PROVADA por grep do
texto inserido** (mutação que não aplica devolve verde e se lê como guardião
resistindo — foi o que aconteceu na 1ª tentativa da M2, com 0 ocorrências):

| mutação | o que quebra | resultado |
|---|---|---|
| `priorSource !== 'server'` → `'servidor_x'` | a condição que decide a substituição | ✓ pegou (2 asserções) |
| `sessionId: generationId` → `sessionId: null` | o vínculo pelo qual a fase 4 acha o checkpoint | ✓ pegou |
| bloco movido para depois do `return` | o conserto vira código morto | ✓ pegou |

### SUÍTE
`npx tsc --noEmit --incremental false` verde (com a junção de `node_modules` —
sem ela o tsc mente com exit 0). `test-variety-axis` (23), `test-versao-b-
entrada-1-dolar`, `test-sistema-de-compra` verdes.

Suíte inteira, 459 arquivos: **113 vermelhos na base, 110 com esta entrega.**
Nenhum vermelho novo — os relacionados (7 de 7: activation-recovery,
stranded-*, roteiro-perdido, narracao-degrau, failure-recovery) já eram
vermelhos em `HEAD~1` e falham por asserção de contagem herdada, não por esta
mudança.

### SHA
**`8feb2ea1` publicado em `origin/main`** (bat oficial, fila 1→0). Home 200.

### COMO MEDIR (corte no campo novo, nunca no relógio)
`fast_compose_recoverable` com `metadata->>'source' = 'server'` é o carimbo
desta entrega. A pergunta a responder na r5: dos checkpoints `source:'server'`
que NÃO foram substituídos por um do cliente (= aba morreu), quantos viraram
`videos.status='completed'`? Cada um desses é um filme que, antes de hoje,
teria evaporado em silêncio.

### O QUE FICOU
Causa nº2: a recusa que não chega à tela (8 das 12 pessoas de narração curta
não têm `generation_failed_screen_shown`).

---

## r3 22:00 — CAUSA Nº2 DIAGNOSTICADA: a recusa que não chega a ninguém

### O QUE MEDI (30 dias, contas externas, `narration_guard_blocked`)

38 bloqueios · **30 pessoas**. O corte que explica tudo é o RAMO de entrada:

| ramo | bloqueios | pessoas | viram a tela | % |
|---|---:|---:|---:|---:|
| manual (a pessoa está na tela) | 17 | 14 | 10 | **59%** |
| **auto-start** (o produto despachou por ela) | 21 | 16 | 4 | **19%** |

A tela de falha (`generation_failed_screen_shown`) só existe enquanto o
`GenerateClient` está montado. No auto-start a pessoa é levada embora — para
/studio pelo `chatgpt_quickstart_selected`, para a home, para o dashboard — e
a recusa acontece com a tela já desmontada. Ninguém está lá para ler.

Cruzando tela × carta de recuperação, nas 30 pessoas:

| viu tela | recebeu carta | pessoas | fizeram filme depois |
|---|---|---:|---:|
| não | não | **15** | 9 |
| sim | não | 6 | **6 (100%)** |
| sim | sim | 6 | 2 |
| não | sim | 3 | 0 |

**15 pessoas — metade da coorte — foram barradas por uma decisão nossa e não
receberam aviso por NENHUM canal.** Seis delas nunca fizeram filme nenhum.
Quem viu a tela e nada mais converteu 6 de 6.

### POR QUE A CARTA NÃO SAI (a descoberta desta rotação)

`app/api/cron/send-failure-recovery/route.ts` monta a coorte de três fontes:
`generate_failed`, `generation_stage_error` com reason `analyze_prompt_too_long`,
e `credits_refunded` de razão-defeito. A rota **sabe** falar de narração curta —
tem `RE_NARRATION_SHORT_CODE` (linha 175) e o veredito `script_short` (linha 234).

Só que `generate_failed` é emitido **apenas** por
`app/(dashboard)/generate/GenerateClient.tsx:2613` — evento de NAVEGADOR.
`narration_guard_blocked` é evento de SERVIDOR
(`app/api/generate-video-cinematic/route.ts:2655`), existe sempre, esteja a
pessoa na tela ou não, e **não é fonte da carta**.

Ou seja: a única porta de entrada da carta, para esta causa, é justamente o
sinal que a coorte que mais precisa dela não consegue emitir. O remédio existe,
está escrito, tem cron — e é cego exatamente para quem foi embora.
(mesmo padrão de `entrega-so-de-cliente-nao-tem-sonda` e
`desfecho-anonimo-nao-tem-remedio`)

### POR QUE NÃO CONSERTEI ISTO ESTA NOITE — E É DECISÃO DO FUNDADOR

O conserto de uma linha seria somar `narration_guard_blocked` como quarta
fonte da coorte. **Não fiz de propósito:** esse cron ENVIA e-mail sozinho, e
a ordem desta rotina proíbe enviar e-mail. Ampliar a coorte de um cron que
dispara sozinho é causar envio por via indireta, e a quem escrever para 15
clientes é decisão de comunicação, não de código. Some-se a isso a memória
`carta-nova-so-depois-da-velha-mover-alguem`: as cartas atuais já saem em
volume e não moveram pagante.

**A alternativa que NÃO precisa de e-mail e tem plateia comprovada: 18 das 30
voltaram ao site depois do bloqueio.** `/api/next-action` já serve o próximo
passo a quem volta e já tem o estado `attempt_lost`. Ensinar a ele o estado
"sua última tentativa foi barrada por roteiro curto, e aqui está o roteiro"
avisa a pessoa dentro do produto, sem carta nenhuma. É a jogada recomendada
para a r4.

### O QUE MUDOU
Nada em código nesta rotação — o conserto disponível esbarra numa trava da
própria ordem, e a alternativa é maior que a janela.

### SHA
Sem commit de código. Diário publicado.

### O QUE FICOU
r4: ensinar `/api/next-action` o estado de recusa determinística (plateia
medida: 18 de 30 voltam). r5: medir o `source:'server'` da r2.

---

## r5 02:30 — A RECUSA QUE NINGUÉM LEU VOLTA A EXISTIR NA TELA QUE ELA REABRE

### O QUE MEDI — 1: o `source:'server'` da r2 (a pergunta que a r4 deixou)

**Zero oportunidades, não zero sucessos.** `fast_compose_recoverable` tem 49
eventos / 33 pessoas na história e **nenhum** com `metadata->>'source'`. O
carimbo da r2 não apareceu porque, desde que `8feb2ea1` entrou em `origin/main`
(08/09 21:01 BRT = 09/09 00:01 UTC), **não houve um único despacho**: em 5h30
de produção, 3 pessoas chegaram ao /studio/create e nenhuma apertou Generate.

A r2 continua sem prova de eficácia — e a razão é a madrugada, não o código.
Não escrevi "não mexeu": não houve o que mexer.
(memória: `zero-escritas-conte-as-oportunidades`)

### O QUE MEDI — 2: qual causa merecia esta rotação

Quebrei `generation_stage_error` por `reason` (7 dias), como manda a ordem:

| reason | eventos | pessoas |
|---|---:|---:|
| **narration_too_short** | **21** | **12** |
| cinematic_dispatch_not_ok | 12 | 1 |
| cinematic_provider_queued | 10 | 2 |
| compose_daily_free_limit (PORTÃO) | 7 | 4 |
| cinematic_gate_trial_ended (PORTÃO) | 6 | 2 |

**A dívida do CLAUDE.md "cena falhou → retentar a CENA" NÃO tem coorte viva.**
Conferi os 25 `cinematic_dispatch_result` de 30 dias: `accepted == planned` em
**todos**. O 503 da fal de 01/09 não voltou. Construir a retentativa de cena
hoje seria código para zero ocorrências — anotado como dívida real, sem coorte.

### A CAUSA QUE FECHEI

A trava de narração recusa **muito bem**: 422 com segundos de fala, palavras
que faltam, duração que caberia, espiral de reincidência, e desde 02/09 sem
tocar em crédito. O defeito não é a recusa — **é que ela tem um leitor só.**
`grep narrationTooShort` no produto inteiro devolve **uma** linha fora da rota:
`GenerateClient.tsx:9108`. Esse leitor só existe enquanto a aba está montada;
no auto-start a pessoa já foi embora quando a resposta chega (r3: 19% de tela
vista no auto-start contra 59% no manual).

### POR QUE NÃO FUI PARA O /api/next-action (a recomendação da r3)

**Alcance medido, e ele reprova a jogada anterior.** Das 31 pessoas bloqueadas
em 30 dias, quantas cada superfície alcança:

| superfície | pessoas das 31 | eventos |
|---|---:|---:|
| **/studio/create (`generate_page_view`)** | **14** | 71 |
| `generate_arrived_server` | 13 | 45 |
| `/api/next-action` (`next_action_served`) | **2** | — |

O next-action alcança **6%** da coorte; a tela de criar, **45%** — 7x mais.
O aviso foi para onde a plateia está. (memória:
`medir-alcance-da-superficie-antes-de-ligar`)

⚠️ Correção de um número da r3: "18 de 30 voltam" foi medido com corte na hora
do bloqueio e contava a própria cauda da tentativa (17 das 31 têm
`generation_stage_error` como evento seguinte — é o servidor, não a pessoa).
Com corte em +10min e só evento de navegador, o número que importa é o da
tabela acima. (memória: `corte-que-pega-o-proprio-envio`)

### O QUE MUDOU

Três arquivos novos/tocados, nenhum deles no pipeline de qualidade:

1. `lib/entrega/refusalNotice.ts` — a decisão **pura**. Três silêncios, cada um
   por um motivo diferente: já leu a tela · já fez filme depois · bloqueio com
   mais de 14 dias. Idade negativa (relógio torto, o incidente PGRST303) falha
   **fechada**. `charged` é **tri-estado**: campo ausente não vira `false`, e a
   frase "No credits were charged" só sai com o `false` provado.
2. `lib/entrega/refusalNoticeServer.ts` — o leitor com service role (a tabela
   `events` está fechada para `authenticated` desde 26/08). **Separado de
   propósito**: se o cliente do service role morasse no arquivo puro, ele
   entraria no bundle do navegador junto com a chave.
3. `app/(dashboard)/studio/create/page.tsx` + `GenerateClient.tsx` — o aviso na
   chegada, ao lado dos outros cards de verdade-do-servidor. Diz o que
   aconteceu com os números reais, e oferece **um botão que faz algo visível**:
   "Make it 35s" muda a duração de verdade (`setDuration`) e confirma na tela.
   Sem botão quando nenhuma duração do seletor cabe — 0 é "não há botão
   honesto", não "ofereça qualquer coisa".

**Nada de e-mail, crédito, render, prompt de cena, contrato, régua de voz,
planner, motor ou preço.** O 422 do servidor continua byte a byte o mesmo.

### GUARDIÃO

`scripts/test-entrega-noite-r5-2026-09-09.mjs` — **27 verificações, verdes.**
Estilo `readFileSync`, CRLF normalizado, zero `import` com alias `@/`.
`check(nome, condição)` em ordem fixa.

Falsificado por **3 mutações, cada uma com a aplicação provada por `grep` do
texto inserido** (mutação que não aplica devolve verde e se lê como guardião
resistindo):

| mutação | o que quebra | resultado |
|---|---|---|
| `if (fatos.sawScreenAfter)` → `if (false && …)` | o silêncio de quem já leu | ✓ pegou (nº 1) |
| gate da impressão → cópia da regra (`!refusalNotice`) | medir caixa diferente da desenhada | ✓ pegou (nº 22) |
| um `.gt('created_at', blockedAt)` → `'1970-01-01'` | contar tela/filme de antes do bloqueio | ✓ pegou (nº 18) |

### SUÍTE

`npx tsc --noEmit --incremental false` verde (com junção de `node_modules`).
`test-variety-axis` · `test-versao-b-entrada-1-dolar-2026-09-08` ·
`test-sistema-de-compra-2026-09-08` · `test-preco-v7-2026-09-09` — **verdes**.

### SHA

**`3f9337fa` em `origin/main`** (fila 1→0, bat oficial). Home 200.

### COMO MEDIR (corte no campo novo, nunca no relógio)

`refusal_notice_shown` é o carimbo desta entrega — e ele já nasce com
`tem_botao`, para que "ninguém quis" e "não havia botão" nunca tenham o mesmo
placar. As três perguntas da r6:
1. `refusal_notice_shown` — quantas pessoas distintas (alvo: até 14 das 31).
2. `refusal_notice_action_clicked` / `refusal_notice_shown` **onde
   `tem_botao=true`** — o degrau que mede se o remédio é apertado.
3. Dos que viram: quantos despacharam depois **e completaram**.

### O QUE FICOU

· Retentativa de cena: dívida real, **coorte zero** hoje — não construir sem um
  503 orgânico aparecer em `cinematic_dispatch_result`.
· A r2 segue sem denominador; a madrugada não despacha.
· `vendor_asset_expired`: 36 eventos / 8 pessoas nesta madrugada, todos de
  filmes de MAIO cuja URL do fornecedor deu 404. É a memória
  `fallback-silencioso-vaza-no-caso-caro` cobrando — filme entregue que morre
  depois. Fora da janela desta rotação; fica nomeado para o fechamento.
