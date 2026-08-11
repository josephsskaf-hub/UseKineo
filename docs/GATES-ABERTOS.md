# 🔴 GATE ATUAL — **13 COMMITS** (sprint 16h de 11/08)

`origin/main` = **`4061731`** — reconferido por `git ls-remote origin refs/heads/main`
às 19:1xZ de 11/08. **Não mudou desde a sprint das 10h**: o push não rodou hoje.
Ponta local `refs/heads/main` antes desta sprint: **`7c5b01f`** (12 commits);
com o commit desta sprint, **13**.

⚠️ A regra é *tudo o que estiver à frente de `4061731`*. A contagem envelhece a
cada sprint, o SHA não.

⚠️ **O script é o `scripts\68-PUSH.bat`** (o prompt diário ainda manda rodar o
`52-PUSH.bat`, que está vencido). Ele apaga os 3 locks órfãos e dá `git push`;
não cria commit e não faz `add`. Seguro se rodado duas vezes.

## ✅ CAI NESTA SPRINT — o gate nº7 estava VENCIDO

**A única conversão da história NÃO está sem vídeo.** `75f76a4c` tem **2 vídeos
`completed`, com URL**, em 11/08 07:32Z e 13:43Z. O texto abaixo que fala em "12
erros de render" e projeta risco de reembolso/chargeback por não-entrega
descreve o mundo do apagão, não o de hoje. Sai da lista.

## 🆕 ABERTO NESTA SPRINT — 26 pessoas quentes que ninguém avisou

26 contas em trial ATIVO tentaram gerar, falharam, têm os **40 créditos
intactos** (1.040 no total), estavam ativas nas últimas 48h e **nunca receberam
uma mensagem**. 12 vencem em 72h. O cron `/api/cron/send-video-rescue` roda e
funciona (377 envios, o último hoje às 14:01Z) — ele só não as enxerga, porque
seu único sinal de "ativado" é *ter linha em `videos`*, e a linha só nasce no
sucesso. Correção escrita linha a linha em `docs/COORTE-QUEBRADOS-2026-08-11.md`;
**não implementada** porque manda e-mail para fora (gate do fundador) e porque a
copy atual abriria com *"You made a Short 🎬"* para quem nunca fez um.

## ✅ TRÊS GATES DESTA LISTA CAÍRAM — MEDIDOS NA SPRINT 10h DE 11/08

**1. O APAGÃO DO CREATOMATE ACABOU.** Renders normalizados desde **11/08
02:00Z**, após ~34h parados (09/08 16:21Z → 11/08 02:00Z). 7 vídeos entregues
nas últimas 24h, **100% de sucesso, zero falhas**. O gate nº1 abaixo ("O PRODUTO
ESTÁ PARADO") não descreve mais a produção.
⚠️ **O que NÃO caiu:** ninguém sabe POR QUE voltou (top-up? upgrade? reset do
fornecedor?). A aritmética do plano continua projetando estouro em **01/09**.
Sem a causa, "resolvido" é palpite — segue como a pergunta nº1 do fundador.

**2. `origin/main` NÃO É MAIS `6fcc83b`.** É `4061731`. Todo o texto abaixo que
conta commits a partir de `6fcc83b` superestima o gate. A regra continua sendo o
SHA, não a contagem — mas o SHA mudou.

**3. `/api/render/[id]` já estava fechado.** Confirmado de novo: `ec9f112` em
produção desde 07/08. Era o "item 0 da Fase 2" citado no prompt diário —
**já entregue**, não fazer de novo.

---

## 🆕 DÍVIDA ABERTA NESTA SPRINT — o A/B 3d×7d pode contar conversão a mais

`KINEO-TRIAL-REVIVE-RACE-2026-08-11` tornou `downgraded` reversível num caso
(estorno de falha de fornecedor com relógio vivo). Uma conta revivida que
**depois converta** chega ao webhook como `active` e vira `converted` — e o
painel `/admin/trial-cohort` bucketiza **puramente por `trial_status`**. Ela
seria contada como conversão limpa do experimento, quando na verdade passou por
um churn no meio.

O evento `trial_cap_refunded` carrega `ab_cohort_note='revived_after_provider_failure'`
para permitir excluí-la. **O join ainda não existe.**
🛑 **Ler isto antes de citar qualquer taxa de conversão do A/B.** Hoje são 7
contas num universo de 109 trials — não é ruído.

## 🆕 DÍVIDA MENOR — as 7 ressuscitadas não foram avisadas

Voltaram ao trial e não sabem. 4 delas leram "Here's what you just lost access
to" antes do estorno. O claim de `downgraded_loss` foi reaberto (para o e-mail
voltar a funcionar na morte real), mas **não existe mensagem corretiva**.
`trial_extended` cobre outro caso e afirmaria coisa errada aqui.

---

## 🗄 HISTÓRICO — bloco da sprint 21h de 10/08 (VENCIDO em 3 pontos, ver acima)

# 🔴 GATE ANTERIOR — **16 COMMITS** (atualizado na sprint 21h de 10/08)

`origin/main` = **`6fcc83b`** — reconferido por `git ls-remote origin refs/heads/main`
as 00:1xZ de 11/08 (mesmo valor desde 08/08: **o push ainda NAO rodou**).
Ponta local: `refs/heads/sprint-19h` = **`4061731`**, 16 commits a frente.

⚠️ A regra que vale e *tudo o que estiver a frente de `6fcc83b`* — a contagem
envelhece a cada sprint, o SHA nao.

⚠️ **O script e o `scripts\67-PUSH.bat`.** O prompt diario manda rodar
`52-PUSH.bat`, o `65-PUSH.bat` tem cabecalho staled e o **`66-PUSH.bat` nao
serve mais**: os commits das 19h estao em `refs/heads/sprint-19h` e ha 3 `.lock`
orfaos no `.git` que so o Windows apaga. O 67 substitui todos. Seguro se rodado
duas vezes.

---

## ✅ DOIS GATES DESTA LISTA CAIRAM — MEDIDOS NA SPRINT 21h DE 10/08

**1. Os 390 creditos do apagao JA FORAM ESTORNADOS.** Nao ha decisao a tomar.
Medido em `credit_debits` desde 09/08 16:21Z: **400 debitados, 390 estornados
automaticamente, queima liquida real = 10 creditos**. Sai da lista.
(O commit represado `3397d5c` corrige o *atraso* de 3h do estorno, nao a
existencia dele.)

**2. A compensacao de relogio das vitimas JA EXISTE EM PRODUCAO.** Quem expira
com menos de 10 dos 40 creditos usados e nunca assinou recebe +3 dias e volta a
`active` (`trial_extended=true`), via `app/api/cron/trial-lifecycle-emails/route.ts`,
ja no `6fcc83b`. **Disparou pela primeira vez hoje as 18:55:24Z** (`5f0f607e`).
As 21 vitimas em trial ativo sem video estao todas com `trial_credits_used = 0`
(o estorno zerou) e portanto **todas se qualificam**. Nao construir nada aqui.

---

# 🚨 O QUE MUDOU O PESO DO GATE Nº1 (sprint 21h, 10/08)

**A primeira conversao de trial da historia da empresa aconteceu hoje — e ela
nunca recebeu um video.** `noelrss21@gmail.com` (`75f76a4c`): cadastro 10/08
14:04Z em pleno apagao, trial 3d, assinatura Stripe ativa no plano `basic`,
`trial_status='converted'`. **0 videos entregues, 12 erros de render na conta
dela.**

O gate do Creatomate deixou de ser "o produto esta parado" e passou a ser
**"a unica cliente que o reverse trial converteu pagou por um produto que nunca
funcionou para ela"**. Risco de reembolso/chargeback maximo, e e o unico ponto
de dado positivo do A/B 3d x 7d.

---

# 🚨 GATE Nº1 DE HOJE — CREATOMATE: O PLANO ESTOUROU (diagnostico FECHADO 10/08 19:4xZ)

**Nao e bug, nao e cobranca, nao e incidente do fornecedor. E o teto mensal do
plano, atingido na data que a aritmetica manda.**

Prova (sprint 16h, secoes 1–3 do SPRINT-2026-08-10.md):
- Plano **Growth 10K** pago em 01/08 (Paddle nº 80035218-167963147, R$ 668,57).
  **Zero e-mails do Creatomate/Paddle desde entao** — sem falha, sem suspensao.
- Formula publica do fornecedor: `creditos = W*H*FPS*dur/1e8`. Nosso output e
  1080x1920@30 = **0,62208 cr/s**.
- **309 videos entregues no ciclo = 14.415s = 8.967 creditos = 89,7% do plano**,
  em 8,7 dias de 31 — contando **so os entregues**. Com falhados e a rota
  legada, cruza 10.000 exatamente em **09/08 16:21**, a hora do ultimo video.
- Queima **1.038 cr/dia** → Growth 10K dura **9,6 dias**. Estourou identico em
  01/08 no Essential. **Vai estourar de novo em 01/09.**

**COMO FECHAR (30 segundos):** ha um **rascunho pronto no Gmail**, resposta a
thread "Emergency credit top-up request" para `casper@creatomate.com` — que
resolveu o estouro de 01/08 em **2h11min**. So clicar em Enviar.

**Alternativa direta:** creatomate.com/dashboard → Subscription → **Growth 10K
para Growth 40K** (upgrade no meio do ciclo e permitido; da para descer depois).
Autonomia na queima de hoje: 10K = 9,6 dias · 20K = 19,3 · 30K = 28,9 ·
**40K = 38,5**. **So o 40K cobre um ciclo de 31 dias.**

⚠️ Ressalva honesta sobre a prova: os 8.967 creditos sao **estimativa nossa**
pela formula publica, nao leitura do contador do fornecedor. O numero exato esta
em `Dashboard → API Log`. A estimativa e um **piso** (ignora renders falhados),
e por isso o argumento nao depende de precisao: o piso ja e 89,7%.

## 🛑 URGENCIA NOVA E MAIOR QUE TODAS AS ANTERIORES: O PRODUTO ESTA PARADO

Medido em 10/08 14:0x–14:15Z: **nenhum video concluido desde 09/08 16:21:08Z**
(22h), 55 recusas HTTP 502 do `/api/compose` atingindo **22 pessoas**, ainda
caindo as 14:15Z. **390 creditos queimados por 13 pessoas, 0 videos entregues.**
**18 das 22 vitimas sao de PRIMEIRO DIA.** Causa: o **Creatomate** esta
recusando todo render.

O commit desta sprint (KINEO-CREATOMATE-BLACKOUT-2026-08-10) entrega as duas
metades que faltavam **no unico fornecedor que entra em 100% dos renders**:
`lib/creatomateAlert.ts` (nao existia; ha `openaiAlert` e `falAlert` desde
julho) e `creatomate_rejected` dentro de `BLACKOUT_MARKER_REASONS`, para o
win-back deixar de responder `no_blackout_in_window` durante um apagao real.
Enquanto o push nao roda, **o proximo apagao tambem sera silencioso.**

🔑 **GATE DO FUNDADOR, 5 MINUTOS, MAIOR RETORNO DO DIA:** abrir
https://creatomate.com/dashboard e conferir plano / saldo / chave de API. O
padrao (502 constante, sem intermitencia, comecando de uma hora para outra) e
tipico de cota/plano/chave — mas e hipotese, e o dashboard fecha. Eu nao tenho
acesso a conta nem a chave.

## ⏳ O PRAZO DO GATE ANTERIOR CONTINUA VALENDO: push depois de 24/08 custa 4 last-calls

Rodar `npm run prove:trial-clock` — ele sai com codigo 1 se o dia do deploy cair
na faixa de 25 a 27/08 e nomeia as contas (`e6acebb8`, `ade5c987`, `6eb47386`,
`c16336a8`).

## O que este push tira do ar (5 urgencias)

0. **Apagao silencioso de fornecedor** — sem alarme e sem win-back (acima).
1. **Compra AVULSA resgatada com link de ASSINATURA**.
2. **Clique MENSAL resgatado numa sessao ANUAL** — $4,90 prometidos contra $99,00, 20x.
3. **`541f5bf`** — quem e rebaixado com 10+ creditos usados nao recebia nada por 5 dias.
4. **`985368f`** — last-call atrasado em ate 7 dias para 10 de 10 pessoas ja rebaixadas.

**Garantia:** o push nao cria commit. So faz `git push` — nao faz `git add`, nao
faz `git reset`, nao escreve em arquivo nenhum. Nao ha como apagar trabalho.

⚠️ **O indice do repo segue ENVENENADO** (reconfirmado 10/08 14:2xZ): ha delecao
STAGED de docs. **Um `git commit` normal apaga tudo isso.** Receita obrigatoria:
indice temporario (`git read-tree HEAD` em `$HOME`) + caminhos explicitos +
`commit-tree` + escrita direta do ref.

---

## 🗄 HISTORICO — bloco da sprint 10h de 10/08

# 🔴 GATE ATUAL — **8 COMMITS** (08/08 sprints 19h/21h + 10/08 madrugada + 10/08 10h)

`origin/main` = **`6fcc83b`** — reconferido por `git ls-remote origin refs/heads/main`
na sprint das 10h de 10/08 (mesmo valor desde 08/08: **o push ainda NÃO rodou**).
`HEAD` local = **`5b1f4b0`**.

⚠️ A regra que vale é *tudo o que estiver à frente de `6fcc83b`* — a contagem
envelhece a cada sprint, o SHA não.

## ⏳ ESTE GATE AGORA TEM PRAZO: **empurrar o push para depois de 24/08 custa 4 last-calls**

O commit `985368f` (KINEO-TRIAL-CLOCK-NONMONOTONIC-2026-08-10) move as janelas de
e-mail do trial **para trás**, o que é a correção — mas as janelas FECHADAS andam
junto. Em 4 contas (`e6acebb8`, `ade5c987`, `6eb47386`, `c16336a8`) a janela D10
nova (`down+15d`) fecha **antes** de a antiga (`ends+10d`) abrir: deployar entre
**25/08 e 27/08** mataria o `expired_lastcall_d10` dessas contas em silêncio.

Isto não precisa ser lembrado, precisa ser **rodado**: `npm run prove:trial-clock`
sai com código 1 se o dia do deploy cair na faixa, e nomeia as contas.

## O que este push tira do ar (4 urgências)

1. **Compra AVULSA resgatada com link de ASSINATURA** (`?pack=…` usam o mesmo
   hook, mas `/api/stripe/checkout/resume` só conhece assinatura).
2. **Clique MENSAL resgatado numa sessão ANUAL** — $4,90 prometidos contra
   $99,00, 20×.
3. **`541f5bf`** — quem é rebaixado com 10+ créditos usados não recebia nada por
   5 dias. Os dois primeiros vencimentos da história foram 10/08 17:57Z e 18:22Z.
4. **`985368f`** — o last-call atrasado em até 7 dias para **10 de 10** pessoas
   já rebaixadas (todas morreram por teto, nenhuma por relógio).

**Garantia:** o push não cria commit. Só faz `git push` — não faz `git add`, não
faz `git reset`, não escreve em arquivo nenhum. Não há como apagar trabalho.

⚠️ **O índice do repo segue ENVENENADO** (reconfirmado em 10/08 13:5xZ): há
deleção STAGED de `PROMPT-DIARIO.md`, `SPRINT-2026-08-08.md`,
`SPRINT-2026-08-10.md`, `GATES-ABERTOS.md`, `ENGAGEMENT-LOG.md` e `65-PUSH.bat`.
**Um `git commit` normal apaga tudo isso.** Os commits de 10/08 foram feitos por
índice temporário (`git read-tree HEAD` em `$HOME` + caminhos explícitos +
`commit-tree` + escrita direta do ref). Quem for commitar aqui: mesma receita.

---

## 🗄 HISTÓRICO — bloco da sprint 21h de 08/08

# GATE ANTERIOR — `scripts\63-PUSH.bat` — **4 COMMITS** (08/08, sprints 19h e 21h)

`origin/main` = **`6fcc83b`** — conferido por `git ls-remote origin refs/heads/main`
na sprint das 21h de 08/08. `HEAD` local = **`d122fa2`**.

⚠️ A regra que vale é *tudo o que estiver à frente de `6fcc83b`* — a contagem
envelhece a cada sprint, o SHA não.

🛑 **ESTE PUSH TIRA DOIS BUGS DE DINHEIRO DO AR. Eles NÃO foram criados hoje —
estão vivos em produção agora:**

1. **Compra AVULSA resgatada com link de ASSINATURA.** `?pack=starter`,
   `?pack=autopilot_pilot`, `?pack=starter290` e os top-ups usam o mesmo hook de
   checkout, mas o `/api/stripe/checkout/resume` **só conhece assinatura** e o
   cookie dura **30 dias**. Quem abandonou um plano e depois comprou um top-up
   que travasse recebia, como "resgate", o link de um **plano recorrente**.
2. **Clique MENSAL resgatado numa sessão ANUAL.** Mesmo `tier`, periodicidade
   diferente: primeira cobrança prometida de **$4,90** contra **$99,00** — **20×**.
   O campo `billing` sempre veio do servidor e o cliente nunca o lia.

**Commits à frente de `6fcc83b` (do mais novo para o mais antigo):**

1. **`d122fa2`** — `KINEO-CHECKOUT-RESCUE-BLIND-2026-08-09`: o **primeiro clique
   da história** na caixa de oferta do trial aconteceu às 22:11:50Z e **quebrou no
   checkout**; o resgate shipado de manhã degradou para `server_retry` e ofereceu
   a mesma rota que acabara de travar. Sonda vira sequência (6s/10s/13,5s),
   telemetria em todo desfecho, promoção do link no card já visível — mais os
   dois bloqueadores acima. 2 arquivos de código + doc.
2. **`99446c7`** — doc desta sprint (21h): este gate + 8 aprendizados no PROMPT-DIARIO.
3. **`c7a7c59`** — doc da sprint 19h.
4. **`212d147`** — `KINEO-TRIAL-DEATH-OFFER-2026-08-08`: a caixa de assinatura
   passa a cobrir a fase `'ending'` (trial morto por teto).

⚠️ O 63 **não cria commit**: só faz `git push`. Não faz `git add`, não faz
`git reset`, não escreve em arquivo nenhum — não há como apagar trabalho.

---

## 🗄 HISTÓRICO — bloco da sprint 16h

# 🔴 GATE ATUAL — `scripts\63-PUSH.bat` — **7 COMMITS** (08/08, sprints 12h→16h)

`origin/main` = **`3204672`** — conferido por `git ls-remote origin refs/heads/main`
na sprint das 16h de 08/08 (mesmo valor das 13h: **o 63 ainda NÃO rodou**).
`HEAD` local = **`fa86339`**.

⚠️ A regra que vale é *tudo o que estiver à frente de `3204672`* — a contagem
envelhece a cada sprint, o SHA não.

**Novos nesta sprint (16h), além dos 5 já listados no bloco abaixo:**

6. **`fa86339`** — `KINEO-TRIAL-ENTRY-VISIBILITY-2026-08-08`: **o trial nunca foi
   dito a ninguém.** Das 36 pessoas em trial, as únicas superfícies que mencionam
   o trial são um evento de SERVIDOR (invisível), a caixa pós-vídeo (13 pessoas,
   só desde hoje 10:20Z e só depois do vídeo pronto) e o e-mail (9 pessoas,
   primeiro disparo hoje 16:30Z). Ninguém teme perder o que não sabe que tem.
   Entrega: `components/TrialActiveBanner.tsx` + mount no layout do dashboard,
   gateado pela MESMA flag, em fluxo normal (sem `z-index`, para não cobrir o CTA
   de compra). 2 arquivos, +401 linhas, 0 remoções.
7. **doc da sprint 16h** — este bloco + `SPRINT-2026-08-08.md` +
   `VIDEO-2026-08-08-A858.md` + a correção da regra do `.lock` no `PROMPT-DIARIO`.

🔒 **O que está represado muda número:** a manchete nova da caixa de oferta
(`1ae2960`), a cadência dos e-mails do trial (`57e7db6`) e o banner (`fa86339`)
são as **três** correções que atacam o 0-de-36, e nenhuma está no ar.

⚠️ O 63 **não cria commit**: só faz `git push`. Não faz `git add`, não faz
`git reset`, não escreve em arquivo nenhum — não há como apagar trabalho.

---

## 🗄 HISTÓRICO — bloco da sprint 13h (5 commits, ainda válido para os itens 1–5)

# 🔴 GATE ATUAL — `scripts\63-PUSH.bat` — **5 COMMITS** (08/08, sprints 12h e 13h)

`origin/main` = **`3204672`** — conferido por `git ls-remote origin refs/heads/main`
na sprint das 13h de 08/08.

✅ **CORREÇÃO DE ESTADO: o 63 JÁ RODOU e os 8 commits que os resumos das 10h e 11h
anunciaram como represados ESTÃO EM PRODUÇÃO.** O bloco anterior deste arquivo
dizia `origin/main = 8dd5f91` e "o dia 08/08 inteiro está represado"; o remoto
respondeu `3204672`. O documento estava errado, não o repositório — e dois
relatórios seguidos abriram com um alerta vermelho que já não existia. Fonte da
verdade daqui em diante: **`git ls-remote`, nunca o doc anterior.**

**Commits represados (5, do mais novo para o mais antigo).** A regra que vale é
*tudo o que estiver à frente de `3204672`* — a contagem envelhece, o SHA não:

0. **`c96a103`** — prova de tipos paga e falsificada + a lição do `git commit` que
   falhou com o commit já criado (trava órfã do OneDrive). Só documento.
0b. **doc final da sprint 13h** — esta correção de contagem + `PROMPT-DIARIO`.

1. **Commit da sprint 13h** — `KINEO-TRIAL-OFFER-SCARCITY-2026-08-08`: a caixa de
   oferta pós-vídeo do trial tem **14 impressões e 0 cliques**, e em 9 delas a
   manchete foi "1..5 of 40 trial credits used" — um argumento contra a compra
   escrito pela própria oferta. O prazo passa a liderar; o contador só aparece
   com metade da concessão gasta. Métrica por adição (`trial_counter_rendered`,
   `trial_headline`); `trial_counter_shown` intocado para não invalidar as 14
   impressões que já existem. Nenhum preço, desconto ou promessa nova.
2. **`57e7db6`** — `KINEO-TRIAL-EMAIL-STARVATION` + a 3ª superfície do
   `KINEO-AEO-FREE-TOOLS`. **A correção estava pronta no disco desde as 11h e
   nunca tinha sido commitada** (`vercel.json` e a rota do cron estavam ` M`;
   HEAD seguia com `"30 16 * * *"`). Re-medido antes de subir: **16 dos 23
   trials estão suprimidos no único tiro diário de 16:30Z**. Enquanto este
   commit não subir, `trial_emails_log` continua em 0 por construção.
3. **`ebea323`** — TAAFT relançamento: pacote de decisão para as 18h (só doc).

⚠️ O 63 **não cria commit**: só faz `git push`. Não faz `git add`, não faz
`git reset`, não escreve em arquivo nenhum — não há como apagar trabalho.

---

## 🗄 HISTÓRICO — bloco anterior (estado incorreto, mantido para rastreio)

# 🔴 GATE ATUAL — `scripts\63-PUSH.bat` — **7 COMMITS** (08/08, sprints da madrugada + 10h)

Substitui o **62** e todos os anteriores — **não clicar** em nenhum deles.
`origin/main` = `8dd5f91`. O **62 já rodou** e levou os 3 commits de 07/08 para produção;
o que está represado agora é **o dia 08/08 inteiro**.

⚠️ **O 63 é diferente de todos os anteriores: ele NÃO cria commit.** Os 7 commits já
existem no repositório local. O script só faz `git push`. Ele não faz `git add`, não faz
`git reset`, não escreve em nenhum arquivo do disco — então **não há como ele apagar
trabalho**, que era o risco real dos anteriores (o `b6fef68` reverteu 70 linhas assim).
Se falhar, nada é perdido e os commits continuam intactos.

⚠️ Gravado em **CRLF** (43/43 linhas conferidas). O 58, o 59 e o 60 nasceram em LF e
nenhum dos três chegou a rodar.

**Commits represados (7, do mais novo para o mais antigo):**

1. **`b4b5d4e`** (sprint 10h de 08/08) — `KINEO-AEO-FACTS-WINDOW` + `KINEO-AEO-FACTS-DATES`:
   `/api/facts` afirmava a uma máquina que o grátis é **30x maior do que é**
   (`videosPer24h: 1` com janela de 720h), no endpoint que o nosso próprio `/llms.txt`
   manda o agente buscar — e **o ChatGPT virou hoje o maior canal de entrada da empresa**
   (6 cadastros em 24h contra 1 do TAAFT). 3 arquivos, aditivo, `tsc` do projeto inteiro
   EXITCODE=0 **e falsificado**.
2. **`eb7fee1`** — crédito preso: estorno no caminho da falha do Creatomate.
3. **`32e845c`** — pré-lançamento TAAFT: a home prometia menos do que o produto entrega.
4. **`c843595`** — capacidade pré-TAAFT: Pixabay com disjuntor + teto diário de renders.
5. **`508d918`** — órfãos do B-roll: 2.662 objetos medidos, **nada movido** (falta a chave).
6. **`e81fd72`** — BUGHUNT fila: `ending_soon` com prazo real.
7. **`d39a61b`** — BUGHUNT: cofre de clips morto há 15 dias (score FLOAT em coluna INTEGER).

✅ **RESSALVA DO 62 PAGA.** O 62 pedia que "a primeira sprint com shell folgado rode o
`tsc` do projeto inteiro e registre o EXITCODE". Feito na sprint das 10h de 08/08:
**`npx tsc --noEmit` do projeto inteiro, EXITCODE=0**, e o `tsc` foi **falsificado**
(erro proposital → EXITCODE=2 apontando `lib/kineoFacts.ts`; arquivo restaurado
byte-idêntico, conferido por `cmp`). Não há mais dívida de prova de tipos na fila.


## 🗄 HISTÓRICO — GATE `scripts\62-PUSH.bat` — **JÁ RODOU**, 3 commits em produção

Substitui o **61**, o **60**, o **59**, o **58**, o **57**, o **56**, o **55**, o **54** e o
**53** — **não clicar** em nenhum deles. `origin/main` = `3faabec`.

**Por que 62 e não 61:** a sprint das 21h escreveu código novo em `lib/videoDownload.ts`,
arquivo que **não estava na lista do 61**. Rodar o 61 agora deixaria de fora a correção do
download no celular — a única coisa desta fila que impede uma pessoa de ir embora sem o vídeo
que acabou de fazer. O 62 faz **tudo** o que o 61 fazia, em dois commits, mais o terceiro.

⚠️ **O 62 está gravado em CRLF de propósito.** O 58, o 59 e o 60 foram gravados em LF e
**nenhum dos três chegou a rodar**.

**Commits represados (3):**

1. **`c65406d`** (já commitado, sprint 10h) — o gate de render morto que prendeu o único
   pagante ativo (`valos87196`, 75 créditos comprados) por **3h23min / 31 cliques bloqueados**.
   Junto vai a prova social (#2 Fazier + TAAFT) promovida para a dobra da home.
2. **Commit novo** (sprints 13h + 16h) — `KINEO-TRIAL-ENTITLEMENT-TIER` +
   `KINEO-SEO-CTA-TRIAL` + `KINEO-TRIAL-POSTVIDEO-OFFER` + `KINEO-AEO-TRIAL`.
3. **Commit novo** (sprint 21h) — `KINEO-DOWNLOAD-MOBILE-RESCUE`: **o "plano B" do download
   tem 0 de 10 de aproveitamento desde que existe.** 33% de quem tenta baixar no celular fica
   com NADA na mão (4 casos nas últimas 24h). 1 arquivo, 3 call sites intactos, superfície
   exportada byte-idêntica ao HEAD.

⚠️ **RESSALVA DE PROVA — leia antes de aprovar o commit 3.** O `tsc --noEmit` do **projeto
inteiro** rodou EXITCODE=0 numa versão ANTERIOR às correções da 2ª revisão adversarial; depois
disso ele passou a estourar o teto de 44s do shell do host em todas as tentativas, inclusive
destacado (`setsid`), e **log vazio não é prova — processo morto também deixa log vazio**. O
que ESTÁ provado da versão final: `tsc` **escopado** no arquivo alterado com EXITCODE=0 **e
falsificado** (erro proposital → EXITCODE=2 apontando o próprio arquivo, restaurado
byte-idêntico), mais a prova de que **as linhas `export` são idênticas ao HEAD** e o tipo
`DownloadOutcome` não mudou — isto é, nenhum consumidor pode quebrar por assinatura. A
primeira sprint com shell folgado deve rodar o `tsc` do projeto inteiro e registrar o EXITCODE.

**Risco:** baixo. `/api/credits` só GANHA um campo (aditivo). Os dois ramos novos de cliente
são provadamente inalcançáveis com a flag OFF (640 e **1.458** combinações testadas por
script, **0 disparos**). Copy de marketing gateada pela mesma flag, com os literais OFF
conferidos byte a byte contra `git show HEAD` (6/6). `tsc --noEmit` EXITCODE=0 — e o próprio
`tsc` foi **falsificado** na sprint das 16h (erro proposital → EXITCODE=2). Nenhuma migração,
nada de dinheiro / marca d'água / preço / checkout / flag.

⚠️ **Ao montar o próximo N-PUSH:** o `git status` desta árvore lista **~311 arquivos
"modificados"** que são idênticos ao HEAD (índice envenenado do OneDrive). O tamanho do diff
se confere com **`git diff HEAD --ignore-cr-at-eol`**, nunca com `git diff` puro, e o staging
é **por caminho explícito** — `git add -A` aqui apagaria 281 linhas de
`docs/REVISAO-EMAIL-D0-2026-08-07.md`. O `.bat` começa com `git reset --mixed` por isso.
E o `.git\index.lock` **continua irremovível pelo sandbox** (`Operation not permitted`),
reconfirmado nas sprints das 13h e das 16h: por isso o `.bat` faz o commit.

**Como destrava:** mandar qualquer mensagem na conversa durante uma sprint, ou rodar o `.bat`
pelo Explorador (selecionar o arquivo na pasta e dar Return — a barra de endereço falha em
silêncio). Permanente: abrir a tarefa `kineo-sprint-diario` → **Run now** → aprovar o cartão
do Explorador de Arquivos **uma vez**.

---

## 🗄 HISTÓRICO — GATE `scripts\60-PUSH.bat` (07/08, sprints 10h + 13h) — SUBSTITUÍDO PELO 61


Substitui o **59** (NÃO executado), **58**, **57**, **56**, **55**, **54** e **53** — **não
clicar** em nenhum deles. `origin/main` = `3faabec`, revalidado por `git ls-remote` no início
**e no fim** da sprint das 13h, com deploy READY em produção nesse mesmo SHA.

**Commits represados (2):**

1. **`c65406d`** (já commitado, sprint 10h) — o gate de render morto que prendeu o único
   pagante ativo (`valos87196`, 75 créditos comprados) por **3h23min / 31 cliques bloqueados**,
   depois de ele ler a página de preço às 11:43:01Z. Junto vai a prova social (#2 Fazier +
   TAAFT) promovida para a dobra da home. ⚠️ **Correção de hash:** o relatório das 10h dizia
   `ee5106d`; o commit que existe na árvore é `c65406d`. **Ele NÃO voltou desde 11:44:16Z**
   (conferido nesta sprint) — enquanto não subir, o produto segue fechado para ele.
2. **`KINEO-TRIAL-ENTITLEMENT-TIER` + `KINEO-SEO-CTA-TRIAL`** (sprint 13h, o commit que o
   `.bat` FAZ) — `/api/credits` passa a devolver `entitlementTier`, e o generate deixa de
   pré-selecionar o motor grátis para quem está em reverse trial. Junto: o botão primário
   das páginas de aquisição para de vender o free tier antigo.

⚠️ **CORREÇÃO DE UM ITEM ERRADO DESTE PRÓPRIO DOC.** A versão anterior anunciava o commit 2
como `KINEO-TRIAL-PROVES-ENGINE` "da sprint 11h". **Aquela correção foi REVERTIDA pela própria
revisão adversarial das 11h** (podia rotular um vídeo de 20 créditos como "Free · Fast Mode" na
tela do cliente) — o commit das 11h seria **só de documentação**. O que sobe agora é uma
implementação DIFERENTE, pela rota que o diagnóstico das 11h prescreveu: campo novo em
`/api/credits`, sem efeito novo, sem snap-back, sem tocar em `mode` fora da montagem.

**Risco:** baixo. Duas rotas de leitura (`/api/credits` ganha um campo aditivo), um ramo novo
provadamente inalcançável com a flag OFF (640 combinações testadas, 0 disparos), 6 páginas de
marketing com copy gateada pelo helper que já existia. `tsc --noEmit` EXITCODE=0. Nenhuma
migração, nada de dinheiro / marca d'água / preço / checkout.

⚠️ **Ao montar o próximo N-PUSH:** o `git status` desta árvore lista **~311 arquivos
"modificados"** que são idênticos ao HEAD (índice envenenado do OneDrive). O tamanho do diff
se confere com **`git diff HEAD`**, nunca com `git diff` puro, e o staging é **por caminho
explícito** — `git add -A` aqui comprometeria os 311 e apagaria 281 linhas de
`docs/REVISAO-EMAIL-D0-2026-08-07.md`. O `.bat` começa com `git reset --mixed` por isso.
E o `.git\index.lock` **continua irremovível pelo sandbox** (`Operation not permitted`,
mtime 10:20 de hoje) — reconfirmado nesta sprint: por isso o `.bat` faz o commit.

**Como destrava:** mandar qualquer mensagem na conversa durante uma sprint, ou rodar o `.bat`
pelo Explorador (selecionar o arquivo na pasta e dar Return — a barra de endereço falha em
silêncio). Permanente: abrir a tarefa `kineo-sprint-diario` → **Run now** → aprovar o cartão
do Explorador de Arquivos **uma vez**.

---

## ⚠️ AVISO DE LEITURA — os blocos abaixo estão VENCIDOS (corrigido 07/08 sprint 10h)

Quem ler o arquivo de cima para baixo conclui errado. Estado verificado hoje:

- ✅ **`/api/render/[id]` NÃO está vazando.** Fechado em produção desde `ec9f112`, conferido
  por CONTEÚDO (marcador `KINEO-RENDER-OWNERSHIP-2026-08-06`) + deploy READY. O alarme
  vermelho logo abaixo é histórico.
- ✅ **Os "10 commits represados" subiram.** Assim como os 4 do 57-PUSH.
- ✅ **`KINEO_REVERSE_TRIAL_ENABLED` está LIGADA em produção**, não OFF. Há 2 trials reais
  ativos, com 40 créditos concedidos cada e 100% de ativação.
- ✅ **O `compose` conhece o trial** (fechado em `6dfad6a`, gates de motor).

Segue o histórico, mantido para não repetir diagnóstico:

---

# 🗄️ HISTÓRICO — GATE — `scripts\56-PUSH.bat` — **10 COMMITS REPRESADOS** (06/08, sprint 19h) — ✅ RESOLVIDO

Substitui o **55**, o **54** e o **53** — todos obsoletos, **não clicar**.
`origin/main` = `c3f3c46` (revalidado por `git ls-remote` no fim desta sprint).

**O que continua fora do ar enquanto isto não subir** — e o primeiro item é o que importa:
- 🚨 **`/api/render/[id]`**: a rota em produção devolve a **URL do MP4 de qualquer render
  para qualquer usuário logado**. Corrigida em `d1133c7`, represada desde as 13h.
- o cron de downgrade do trial (`89a235d`), o grant de 40 créditos, o interlinking das 3
  páginas de receita, e o modal/paywall desta sprint (`aaee4f6`).

Nada disto liga a flag. `KINEO_REVERSE_TRIAL_ENABLED` segue **OFF** e o push não muda nada
para nenhum usuário hoje — exceto **fechar o vazamento de URL**.

**Como destrava:** mandar qualquer mensagem na conversa durante uma sprint, ou rodar o `.bat`
pelo Explorador (selecionar o arquivo na pasta e dar Return — a barra de endereço falha em
silêncio). Permanente: abrir a tarefa `kineo-sprint-diario` → **Run now** → aprovar o cartão
do Explorador de Arquivos **uma vez**.

---

# 🔴 GATE NOVO — O `compose` NÃO CONHECE O TRIAL (bloqueador do QA da flag)

Achado da revisão adversarial desta sprint, e é o mais grave do dia.

`isTrialActive()` é consultado em **UM arquivo só**: `app/api/generate-video-cinematic`.
O **`app/api/compose/route.ts` — que decide MARCA D'ÁGUA, export limpo e a cota de
3 Fast/24h — não sabe que o trial existe.**

Consequência com a flag ON: quem entra no trial ganha o motor de AI, gera o vídeo… e recebe
**marca d'água**, e ainda bate na cota free de 3 Fast por 24h. A promessa é "direitos de
Creator exceto Studio"; o que o código entrega é "o motor, e só".

**Não toquei** — mexer em marca d'água/compose é gate do fundador (guardrail explícito).
**Isto precisa ser decidido antes do QA do trial**, senão o A/B mede um trial quebrado.

---

# 🟠 GATE — o `UpgradeModal` do `/generate` mostra preço USD FIXO

As linhas de plano do modal usam `PLAN_LIST` de `lib/pricing.ts`, cujos `priceLabel` são
literais (`$9.90`, `$24.90`, `$37.90`), USD-only. O defeito é **pré-existente**, mas a razão
`trial_ended` criada nesta sprint **amplia o alcance dele**: a coorte que perde o trial inclui
BR e IN por construção (a região `value` cobre BR desde 04/08). O `TrialDowngradeModal` novo
faz certo (moeda de `/api/geo` + `lib/checkoutPricing`) — o contraste é a prova.
Bloqueador do QA da flag.

---

# 🟠 ACHADO MENOR REGISTRADO (pré-existente, não introduzido)

`app/api/credits/route.ts:36` — `void supabase.from('profiles').update({last_ip,last_country})`.
Os builders do supabase-js v2 são **thenables preguiçosos**: só executam quando alguém chama
`.then()`. `void` não chama. Esse UPDATE provavelmente **nunca disparou**, e a geo da página
`/admin/users` deve estar vazia desde sempre. Correção de uma linha, fora do escopo desta sprint.

---

# 🟢 GATE #1 — `scripts\47-PUSH.bat` — **CLICADO ÀS ~19:28Z. FECHADO.**

`origin/main` = `457a46f`. Subiu tudo o que estava parado desde ontem: estudo vivo, shortlist de
micro-criadores, **hotfix do incidente OpenAI/504** e **o cap-hit lendo o muro**. A Vercel faz o
deploy sozinha. Os pushes 44, 45 e 46 ficam obsoletos — não clicar.

**Libera o gate #2 (Conor Martin, $100), que dependia do push.**

<details><summary>texto original do gate (histórico)</summary>

# ~~🔴 GATE #1 — `scripts\47-PUSH.bat`~~ (05/08 19h)

**Clique só neste.** O 46 não foi clicado (`main` estava 2 commits à frente às 19:01Z). O 47 sobe
tudo o que está pendente de uma vez — nada se perde por pular o 46.

**O que vai junto:**

**1. Hotfix do incidente de hoje.** Às 15h36–16h42 o OpenAI parou de responder e matava a função
antes do nosso tratamento de erro: sem alarme, sem mensagem honesta, sem e-mail de recuperação —
um cadastro **novo, vindo do TAAFT**, falhou 4× em 20 min no primeiro dia dele. **O motor já
voltou sozinho** (11 vídeos `completed` desde 16h42, o último 18:58Z), então isto não é urgência
de produto parado: é a blindagem para a próxima vez, que hoje não existe no ar.

**2. O e-mail que vende na hora certa.** Quem bate no limite do plano free é a pessoa mais pronta
para comprar do funil inteiro — usou 3× hoje e pediu a 4ª. **Na história toda, 11 pessoas fizeram
isso e nenhuma comprou.** O cron que existe para esse momento procurava quem *terminou* 3 vídeos,
enquanto o limite conta *tentativas* — e quem bate no muro costuma ter 2 vídeos prontos. Ele era
cego por construção: **8 das 11 nunca receberam nada.** Agora lê o próprio limite; **3 pessoas
entram na fila na primeira rodada depois do push.** Corrigida também a frase que dizia "você
acabou de fazer seu 3º vídeo hoje — Nice run" para quem tinha recebido 2.

Enquanto não for clicado, nada disto está no ar.

</details>

---

<!-- gate 46 (substituído pelo 47) -->
# ~~GATE ANTIGO — `46-PUSH.bat`~~ (substituído)

**Este substitui o 45, que JÁ FOI CLICADO.** Sobe 1 commit (`2f1c441`).

Às 15h36–16h um cadastro **novo, vindo do TAAFT**, tentou gerar vídeo **4 vezes em 20 minutos e
falhou nas 4** — e o incidente ainda estava ativo quando o arquivo foi criado. Causa: o cliente
OpenAI não tinha limite de tempo (padrão do SDK = 10 minutos), então uma chamada lenta segurava a
função até a Vercel matá-la; com a função morta, o nosso tratamento de erro nunca rodava — sem
alarme, sem mensagem honesta e sem e-mail de recuperação. **Créditos estavam OK** (não é o
incidente de 31/07 de novo).

Enquanto não for clicado, o produto continua exposto ao mesmo modo de falha.

---

# GATES ABERTOS — só o fundador consegue destravar

> ## 🎯 METAS DA EMPRESA (fundador, 01/08): 500 pagantes → 1.000 pagantes
> ⚡ ORDENS ATIVAS: ORDENS-CONVERSAO (conversão) + ORDENS-AQUISICAO (aquisição) + **PESQUISA-CONCORRENTES (G1-G5)** + **ordem H (engajamento X/YouTube/Reddit/Quora — aprovada 03/08, regras de ouro no doc; X já executável na sessão logada)**
> Ver docs/METAS.md — toda sprint conecta o trabalho a uma das duas alavancas
> (volume de cadastros × conversão) e o placar reporta a distância. Baseline: 4 compradores.

> ## 🟢 01/08 01:10Z — INCIDENTE OPENAI RESOLVIDO. ENV JÁ TROCADA. MOTOR VALIDADO.
> Sprint: leia `docs/INCIDENTE-OPENAI-2026-07-31.md` ANTES de mencionar OpenAI/env.
> A chave foi trocada às 00:50Z, redeploy feito, vídeo `completed` às 01:04Z em produção.
> **NÃO pedir troca de env de novo. Este gate está FECHADO.**
>
> ## 🟢 01/08 05:06Z — INCIDENTE #2 (Creatomate 402) TAMBÉM RESOLVIDO
> Upgrade Growth 10K feito pelo fundador; vídeo de USUÁRIO REAL completed 05:06:21Z.
> Herança permanente pras sprints: construir lib/creatomateAlert.ts + monitor de % de
> créditos no placar (tarefas 2-3 do doc de incidente). Ambos os apagões da noite: FECHADOS.



## 🔴 05/08 14:30Z — SPRINT DAS 11h: **1 CLIQUE + 3 DECISÕES DE 2 MINUTOS**

### 1. `scripts\45-PUSH.bat` — **substitui o 44. Clique só neste.**
O 44 **não foi clicado** (`main` estava 2 commits à frente às 14:01Z). O 45 faz a mesma coisa e
sobe os **3 commits de hoje**: o estudo vivo + os aprendizados + a shortlist de micro-criadores.

### 2. Enviar o rascunho do **Conor Martin** ($100) — recomendação: **SIM**
Já está no Gmail, revisado. `@conormartinai`: 4,24k inscritos, mas **1,64M de views em 266
vídeos**, e o *"Revid AI Review (after 30 days)"* dele fez **15.134 views**. Quem procura review
de concorrente está comparando ferramenta com o cartão na mão — **$0,0066 por view qualificada**,
e o vídeo continua entregando daqui a um ano porque é busca, não feed.
⚠️ **Enviar DEPOIS do push.** O e-mail manda ele para `/state-of-ai-shorts-2026`; enquanto a
página velha estiver no ar, ela mostra 2,30 min onde o e-mail diz 4,2.

### 3. Enviar o rascunho do **Malva AI** — **não compromete nenhum dólar**
155k inscritos, e-mail de negócio público. O rascunho só pede a tabela de preço dele.

### 4. Criar no Stripe um **cupom de 100% off por 3 meses** (2 min no painel)
É o **único** jeito de entregar os "3 meses de Creator" que os dois e-mails prometem. Não existe
rota admin que conceda plano pago, e o caminho SQL entregaria Creator **vitalício** com crédito de
um mês só. O checkout já resolve `?promo=`.

> Contexto completo, com os canais medidos e o que foi **vetado** (Ai Titan: 91,7k inscritos e
> 117k views totais = audiência comprada): `docs/SHORTLIST-MICROCRIADORES-2026-08-05.md`

---

## 🔴 05/08 14:00Z — **`scripts\44-PUSH.bat` — O ESTUDO VIVO + O TEMPO REAL DE RENDER**
> ⬆️ **SUPERSEDIDO PELO 45-PUSH acima** (mesmo push, 3 commits em vez de 1). Se você já clicou
> no 44, clique no 45 mesmo assim — ele completa o que faltou.

Um clique. É o único gate desta sprint. 1 commit, para frente, não desfaz nada.

**O que está errado no ar agora e este push conserta:** a página pública
`/state-of-ai-shorts-2026` é um estudo "free to cite" com os números chumbados em 24/07 — e os
**cinco** estão errados hoje. O pior: publica **mediana de 2,30 min** de render contra **4,2 min
reais** (p90 6,6), a partir de uma amostra de DOZE renders.

E esse número não mora só ali: mora em `lib/kineoFacts.ts`, que alimenta o `/llms.txt` e o
`/facts` — os arquivos que servimos de bandeja para o ChatGPT e o Bing, o canal que já traz **4x
mais tráfego que o Google inteiro**. Ou seja, **estamos ensinando o ChatGPT a prometer, em nosso
nome, metade do tempo real de espera.** Quem chega por essa citação espera 2 min, o render leva
4–7, e vai embora antes do vídeo ficar pronto — o que explica direto o maior buraco do funil
(333 geraram, 69 baixaram).

Depois do push, confira no celular: `www.usekineo.com/state-of-ai-shorts-2026` deve dizer
"updated daily · last read August 5, 2026" e mostrar mediana **4.2 min**.

> As duas migrações do banco **já estão aplicadas** (`study_stats_functions`,
> `study_speed_fast_only`) e conferidas — a página não depende do push para não quebrar.

## ✅ 05/08 13:50Z — GATES ANTERIORES **FECHADOS** (conferido, não suposto)

| Item | Como conferi | Estado |
|---|---|---|
| 11 restantes do COMEBACK50 | `comeback50_emailed` = **21** · 12 eventos `comeback50_sent` hoje | ✅ **DISPARADO** |
| Rascunhos Waqas / pritikathar | `list_drafts` não devolve mais nenhum dos dois | ✅ **saíram** |
| `41-PUSH.bat` | `origin/main` = `ac791ec`, muito à frente | ✅ fechado |

**Não pedir nenhum dos três de novo.**

⏳ **NUDGE DIÁRIO ainda não disparou:** `credits_back_sent_at` = **0** às 13:50Z. O cron
`send-credits-back` roda **15:25Z**. A sprint das 13h confere e reporta.

## ✅ 05/08 00:22Z — **FECHADO. O `41-PUSH` FOI RODADO E A CORREÇÃO ESTÁ EM PRODUÇÃO.**

`origin/main = dc5a7ec`, deploy `dpl_8zinEF…` **READY às 00:22:42Z**. A versão com o
`location.href` ficou no ar **4 minutos e 36 segundos** (00:18:06 → 00:22:42Z). Não pedir de novo.
**Janela de medição do `KINEO-DOWNLOAD-TRUTH` começa em 05/08 00:22:42Z** — nada antes conta.
Rodar `docs/SQL-DOWNLOAD-TRUTH.sql` a partir de **06/08 00:30Z**.

## 🟠 05/08 00:50Z — OS DOIS E-MAILS **AINDA NÃO SAÍRAM** (conferido, não suposto)

O fundador reportou "já fiz isso" às 00:48Z. Conferi antes de aceitar — e o push realmente saiu,
mas os dois e-mails não:

| Item | Como conferi | Estado |
|---|---|---|
| 11 restantes do COMEBACK50 | `count(*) filter (where comeback50_emailed)` = **9** (seria 20) | ❌ não saiu |
| Rascunhos Waqas / pritikathar | `list_drafts` ainda devolve os dois (22:10Z), `in:sent` não tem | ❌ não saiu |

**Como fazer cada um, exato:**

1. **COMEBACK50** — logado como conta interna, abrir
   `https://www.usekineo.com/api/admin/send-comeback50` (dry run, mostra `remaining_unemailed`),
   conferir o número e então abrir a mesma URL com **`?confirm=SEND`**. A rota tem gate duro: se
   o cupom não estiver vivo no Stripe, nada sai.
2. **Os 2 rascunhos** — Gmail → Rascunhos → `thewaqaskhanofficial@gmail.com` e
   `pritikathar995@gmail.com` → Enviar. São leads de 04/08, esfriam rápido.

## (histórico) 05/08 00:35Z — pedido do `41-PUSH.bat`, já atendido

Você rodou o `40-PUSH.bat` **durante a sprint** (00:18Z, deploy `dpl_A4pgm6d8…` READY). Obrigado
— mas ele levou junto uma **versão anterior** da mudança de download, que uma revisão
adversarial derrubou **minutos depois** do commit. O `41-PUSH.bat` é a correção, e é **um commit
só, para frente** (não desfaz nada, não mexe no que você já subiu de resto).

**O que está errado no que está no ar (dois defeitos, ambos no caminho de fallback):**

1. **A aba do app pode ser sequestrada.** Quando o download por blob falha, o código atual
   navega a MESMA aba para o MP4. Se o Supabase não mandar `Content-Disposition: attachment`, a
   pessoa cai num player de vídeo e **perde a página** — e na tela de vídeo pronto isso mata
   justamente o upsell de marca d'água e o pedido de nota que rodam depois.
2. **O número mais importante da empresa passaria a mentir para cima.** O código atual conta
   `video_downloaded` também quando só *abriu uma aba* — sem prova de entrega. Esse evento é o
   que `send-comeback50` e o cron `send-video-ready` usam para decidir **quem NÃO precisa de
   e-mail de resgate**: inflá-lo faria a empresa parar de resgatar exatamente quem falhou.

**O que o 41 faz:** a entrega volta a ser **idêntica à de produção de ontem** (blob →
`window.open`), e fica só a parte boa — clique contado, falha com motivo, popup barrado visível.
Sem degrau novo, sem risco. A correção de verdade do mobile vira trabalho de sprint **depois**
que o número disser o tamanho do problema.

**Quanto tempo o defeito fica no ar:** ele só aparece quando o download por blob falha, que é o
caminho raro. Mas é o caminho de quem já estava com problema — por isso vale o clique hoje.

⚪ Nada mais mudou: os 11 do COMEBACK50 e os 2 rascunhos do Gmail continuam como estavam.

## ✅ 05/08 00:18Z — FECHADO PELO FUNDADOR: o `40-PUSH.bat` FOI RODADO (deploy READY)

**`scripts\40-PUSH.bat`** — 4 commits, e três deles já estavam prontos e parados no seu
computador desde ontem à noite:

| # | Commit | O quê | Estado |
|---|---|---|---|
| 1 | `249e172` | docs do replay | só documentação |
| 2 | `23bc1ac` | **NUDGE DIÁRIO** — e-mail "seus 3 vídeos free voltaram" | migração **conferida em produção** nesta sprint ✅ |
| 3 | `b1f05a7` | **POST TO EARN** — 3 créditos por Short publicado | tabela + trava anti-fraude **conferidas em produção** ✅ |
| 4 | novo | **A VERDADE SOBRE O DOWNLOAD** | `tsc` EXITCODE=0 ✅ |

Conferi as duas migrações no banco em vez de supor: **o único degrau que falta nos três é o
push.** Se tivessem subido sem a migração, o POST TO EARN pagaria crédito sem trava de
idempotência — dez contas colando o mesmo vídeo, dez pagamentos. Não é o caso.

**O item 4, em uma frase:** 327 pessoas geraram um vídeo na Kineo e só 67 baixaram (**20%** — o
maior buraco do funil), e esse número era **cego**: o evento só existia no caminho feliz e o
fallback era mudo. Além disso o fallback usava `window.open` **depois de um `await`**, o que no
celular é **popup bloqueado** — a pessoa fica sem arquivo e **sem mensagem de erro**, e o banco
não registrava nada disso. Agora registra, e o **clique** passa a ser contado.

**Risco baixo de propósito:** a **entrega** do arquivo continua idêntica à que já está em
produção. Quem já conseguia baixar não sente diferença nenhuma — o que muda é só o que passa a
ser contado. (Uma revisão adversarial derrubou a primeira versão desta mudança, que navegava a
mesma aba e teria destruído o upsell de marca d'água e o pedido de nota.)

**Depois de rodar:** 24h depois, colar `docs/SQL-DOWNLOAD-TRUTH.sql` no Supabase. São 5 queries
e elas dizem qual das três causas do buraco é a verdadeira — **antes** de gastarmos uma sprint
construindo a Medida 5 (CTA sticky), que só resolve uma das três.

⚪ O `39-PUSH.bat` (só docs) fica obsoleto: o 40 leva tudo o que ele levava.

## ✅ 04/08 22:28Z — GATE A DA SPRINT 19h JÁ FOI FECHADO PELO FUNDADOR

**PUSH FEITO DURANTE A SPRINT.** `origin/main = 6ea2180`, deploy `dpl_42nGKG…` **READY em
produção** (22:28Z, confirmado por `list_deployments` + o `dpl=` nos assets servidos).
O `37-PUSH.bat` virou no-op — **não pedir de novo**. Consequências:
   - o **bug de preço está corrigido em produção**: a tela de checkout cancelado não promete
     mais R$49,90 a quem vai pagar R$24,90;
   - o `KINEO-OBJECTION-HANDLER` está servindo. **Janela de medição de `checkout_cancel_reason`
     e dos 4 eventos novos começa em 22:28Z de 04/08** — nada antes disso conta.
   - ⚠️ O cabeçalho do `37-PUSH.bat` cita o SHA `5976d8b`; o commit que entrou foi `6ea2180`
     (mesmo conteúdo, refeito sobre o mesmo pai para caber o próprio .bat). Sem impacto —
     registrado só para quem for conferir SHA no histórico.

## 🟠 04/08 22:15Z (sprint 19h) — O QUE CONTINUA NA SUA MÃO

**1. Dois rascunhos de venda 1:1 no Gmail (só falta o Send).** Ambos são leads de HOJE:
   - **thewaqaskhanofficial@gmail.com** (TAAFT · 2 vídeos · 2 downloads · abriu 3 checkouts em
     18 min e cancelou os três). Assunto: *"Which Kineo plan you actually need (30 seconds)"*.
     **Sem desconto de propósito** — o comportamento dele foi confusão de catálogo, não preço.
   - **pritikathar995@gmail.com** (Índia/INR · 1 vídeo · **0 downloads** · 2 checkouts).
     Assunto: *"Download your Short before you pay us anything"*. Manda usar antes de pagar e
     pergunta se o checkout falhou.

**2. 🟠 Da 16h:** os **11 restantes** do COMEBACK50, a um `&confirm=SEND`.

**3. ⚪ Sem pressa (só docs):** `scripts\38-PUSH.bat` — 1 commit só de documentação
   (fechamento deste gate). Pode ir junto com o próximo push de código.

## ✅ 04/08 22:05Z — OS DOIS GATES DA SPRINT 16h FORAM FECHADOS PELO FUNDADOR

**A. PUSH FEITO.** `origin/main = 43e2a3b`, deploy **READY em produção** (22:00:42Z).
   Consequências que valem para as próximas sprints:
   - o **preço regional está no ar** — Brasil vê Starter R$24,90 (era R$49,90). A partir de
     agora, qualquer leitura de conversão de checkout no Brasil é sobre o preço NOVO;
   - `<VideoRatingAsk/>` está servindo. A janela de medição de `video_rated` /
     `video_rating_reason` / `taaft_review_ask_clicked` **começa em 22:00Z de 04/08** — não
     contar nada antes disso.

**B. OS 9 SENDS SAÍRAM** (22:00:55Z–22:01:16Z), confirmado em `in:sent`: os 8 rascunhos
   COMEBACK50 (kingtopman, obasindubuisi20, verifiedpee236, nooributter+1, ajiterumololuwa,
   kylajanae78, jatinnnnn078, agadac02) + o ToolRiot. A flag `comeback50_emailed=true` já
   estava marcada nos 9 antes do envio, então a rota automática **não vai duplicar**.
   Medir `utm_source=comeback50-personal` a partir de 22:01Z, separado do disparo Resend.
   **NÃO repetir este pedido.**

**C. 🟠 Continua aberto:** os **11 restantes** do COMEBACK50, a um `&confirm=SEND` na rota
   (que agora existe e está deployada). Disparo em massa irreversível — decisão sua.

## 📌 04/08 19:45Z (sprint 16h) — O QUE ESTAVA NA SUA MÃO (A e B FECHADOS ÀS 22h, ver acima)

**A. 🔴 PUSH — `scripts\36-PUSH.bat` (30s).** 6 commits parados localmente. Dois deles
   **não são meus**: `6ce3d9a` + `4e8af7a`, o **preço regional** (Starter/Creator mais baratos
   em países de menor renda; Brasil R$49,90 → R$24,90) que a sessão paralela commitou e
   **ainda não está em produção** — enquanto este push não sair, o brasileiro segue vendo
   R$49,90. Passei o `tsc` sobre tudo junto: **EXITCODE=0**. Os outros 4 são o
   `<VideoRatingAsk/>` desta sprint + docs. **Não toca em render.**

**B. 🔴 9 cliques de Send no Gmail — continuam parados.** Confirmei com `in:sent newer_than:1d`:
   só há 2 threads de hoje, ambas de 02:03Z (parceiros, campanha antiga). Os **8 rascunhos
   COMEBACK50** e o **rascunho do ToolRiot** seguem em Rascunhos, intactos. A flag
   `comeback50_emailed` já está marcada nos 9 (checado: boolean `= true`, exatamente 9), então
   a rota automática não vai duplicá-los — mas se você **não** apertar Send, essas 9 pessoas
   ficam sem receber nada, por ninguém. É o item de maior retorno por segundo que existe hoje.

**C. 🟠 Os 11 restantes do COMEBACK50** seguem a um clique de distância
   (`&confirm=SEND` na rota, que agora existe em produção). Deixei sem apertar de propósito:
   disparo em massa irreversível. Sua decisão.


## 📌 04/08 16:50Z (sprint 13h) — PENDENTES DE HOJE

**0. ✅ PUSH FEITO POR VOCÊ DURANTE ESTA SPRINT — está tudo no ar.**
   Deploy READY em produção com `66a0b86` (17:0xZ). Ou seja: o fix do desconto, a rota
   COMEBACK50 e a linha do PRODUCTHUNT **existem em produção agora**. Validei a cadeia
   inteira no ar, na sua sessão logada, com o dry run da rota:
   `{"promo_live":true,"promo_detail":"promotion_code promo_1U0jqT… active",
   "remaining_unemailed":11}` — o `promo_live:true` prova que o cupom resolve, e o
   `remaining_unemailed:11` prova que os 9 que eu já cobri por rascunho **não vão duplicar**.
   (Texto original do gate abaixo, mantido como registro.)

~~**0. 🔴 PUSH — `scripts\34-PUSH.bat` (30s). É O ÚNICO GARGALO DA CAMPANHA.**~~
   3 commits meus parados. O `33-PUSH` **não foi rodado**: produção ainda serve `0c988b4`,
   e por isso `/api/admin/send-comeback50` responde **404** — a ordem "sprint das 10h
   dispara os e-mails" era fisicamente impossível sem este clique. O 34 sobe:
   - o **fix `KINEO-PROMO-BEATS-INTRO`** (abaixo, item 1 — é o mais importante do dia);
   - a rota COMEBACK50 + a linha do cupom PRODUCTHUNT no banner de PH;
   - os docs das sprints 11h e 13h.
   **Não toca em render** — nada de `lib/compose.ts`; seu freeze de dia de lançamento
   segue intacto.

**1. 🟢 NADA A FAZER, SÓ SAIBA: a campanha ia sair com uma promessa quebrada.**
   O `/pricing` anexa `intro=1` sozinho em todo clique monthly de Starter/Creator, e o
   checkout aplicava o intro ANTES do `?promo=` — o `COMEBACK50` era descartado com um
   `console.warn`. As 19 pessoas leriam "50% off por 3 meses" e receberiam um mês com
   desconto menor, **sem nenhum erro aparecer**. Corrigido nesta sprint (tsc=0). Só existe
   em produção depois do item 0.

**1b. 🟠 O DISPARO DOS 11 RESTANTES — 1 clique, e eu deliberadamente NÃO apertei.**
   A rota está viva e testada; falta só o envio. Deixei para você porque é disparo em massa
   irreversível para 11 pessoas reais, e eu já cobri os 8 melhores por rascunho pessoal
   (que converte mais). Link direto, na sua sessão logada:
   https://www.usekineo.com/api/admin/send-comeback50?confirm=SEND
   Se preferir testar com 2 antes: acrescente `&limit=2`. Quem recebe são os de cauda —
   dabira4u (3 vídeos/4 downloads), farooqhumna93 (2/4), moiseshamester (3/3), rammarndi870
   (3/3), jeff.a.wiggins (2/3), safuras090 (3/2) e 5 com cartão e vídeo mas 0 downloads.

**2. 🟠 8 RASCUNHOS NO GMAIL — 8 cliques de Send, a melhor lista do banco.**
   Como o push travou o disparo automático, a campanha saiu por rascunho pessoal seu, um
   por pessoa, abrindo pelo que cada uma fez. São: kingtopman (6 vídeos/24 downloads),
   agadac02 (9/23), jatinnnnn078 (2/21 — pergunto se o export quebrou), kylajanae78 (6/20),
   ajiterumololuwa (1/12), nooributter+1 (7/8, dormente desde julho), verifiedpee236 (3/6),
   obasindubuisi20 (5/3). Sem preço no corpo; link com `utm_source=comeback50-personal`
   para separar o que a rota manual converteu.
   Os 8 já estão marcados com `comeback50_emailed=true`, então a rota automática (depois do
   push) **não duplica** e vai para os outros 11. **Se decidir NÃO enviar**, o SQL de
   rollback está na seção 3 do `docs/SPRINT-2026-08-04.md`.

**3. 🟢 RASCUNHO ToolRiot (`hello@toolriot.com`) — 1 clique, e não é uma venda.**
   Ele estava na fila para receber 50% off. Fui olhar quem é antes de mandar: **review lab**
   que testa ferramentas de IA e publica **Shorts de 60s no YouTube** (@ToolRiot). Rodou a
   Kineo em 01/08 (1 vídeo, 12 exports) e não publicou nada. O rascunho oferece conta cheia
   comped **sem contrapartida** e propõe o teste que só a gente permite: o Short sobre a
   Kineo, feito pela Kineo. Se você discordar de comped, é só não enviar — nada mais depende
   disso.

**4. ⏱️ 30 segundos, quando puder: confirmar o promotion code `PRODUCTHUNT`.**
   O dashboard da Stripe entrou em erro exatamente nessa página. Vi o **cupom** na lista
   (30% × 3 meses); não consegui ver o **código promocional**. O banner foi escrito para não
   mentir mesmo se ele não existir ("use code at checkout"), então não é urgente.
   Link: https://dashboard.stripe.com/coupons/PRODUCTHUNT

**5. 🟠 Product Hunt — veredito com número.** O banner de boas-vindas apareceu **9 vezes em
   24h** e o launch converteu **0**. 3 pontos, 0 comentários externos. Não é canal de
   aquisição; é troféu. Nada a fazer lá hoje — regra de morte corre até 11/08.

---

## 📌 04/08 15:00Z (sprint 11h) — HISTÓRICO (itens 0 e 1 RESOLVIDOS)

> ✅ **Item 1 (criar o cupom COMEBACK50) FECHADO** pela sessão CEO em 12:05 −0300 (`09956d5`).
> Conferido por mim no dashboard, não presumido do commit: `COMEBACK50` é cupom **e** código
> promocional ativo (`promo_1U0jqT…`, 50% por 3 meses, 0 resgates). `PRODUCTHUNT` idem como
> cupom (código promocional pendente de conferência — item 4 acima).
> O item 0 (push) segue aberto e virou o item 0 do bloco das 13h.


**0. PUSH — 1 commit meu parado** (a sandbox não tem credencial do GitHub; o push sai da sua
   máquina). Sobe a campanha COMEBACK50 + os docs desta sprint. **Não toca em render** —
   os fixes de `lib/compose.ts` (glow/base preta) já subiram na sua sessão paralela durante
   esta sprint, `origin/main` já está em `0c988b4`. Ou seja: nada aqui fura o seu freeze de
   dia de lançamento.

**1. 🔴 CRIAR O CUPOM `COMEBACK50` NA STRIPE — 2 minutos, destrava 19 e-mails prontos**
   A rota `/api/admin/send-comeback50` está construída, testada (tsc=0) e **se recusa a
   enviar** enquanto o código não existir (409), porque o checkout ignora promo inexistente
   em silêncio e as 19 pessoas cairiam no preço cheio depois de ler "50% off".
   Passo a passo (Stripe → Catálogo de produtos → Cupons → + Criar cupom):
   1. Desconto percentual **50%** · Duração **Vários meses → 3 meses**
   2. Aplicar a produtos específicos: **só Creator e Studio** (NUNCA o Starter)
   3. Salvar → abrir o cupom → **Códigos promocionais → + Novo → `COMEBACK50`**
   4. Me avisar: a próxima sprint roda o dry run e depois `&confirm=SEND`
   **Alternativa de 0 minuto:** já existem `FOUNDING50` (50% uma vez) e `FOUNDER50` (50%
   vitalício, 0/10 usados). Se preferir não criar nada, diga qual usar — eu troco o código
   na rota. A escolha é sua porque muda promessa de dinheiro.
   Quem recebe (19, os 6 primeiros por downloads): kingtopman (6 vídeos/24 downloads),
   agadac02 (9/23), jatinnnnn078 (2/21), kylajanae78 (6/20), hello@toolriot (1/12),
   ajiterumololuwa (1/12).

**2. 🟠 Product Hunt — o lançamento não pegou.** 3 pontos, 0 comentários, 0 cadastros em 8h
   (corte do top-17 do dia: 73 pontos). Não há nada para eu responder lá. Se você quiser
   dar uma última chance ao canal hoje, o único movimento legítimo é **compartilhar o link
   com sua rede** (X/WhatsApp) — nunca pedir upvote. Veredito completo no relatório das 22h.

## 📌 03/08 ~14:30Z (sprint 10h) — PENDENTES DE HOJE

1. ✅ ~~21/22/23/24/27/28-PUSH~~ — RODADOS (produção = 1cf2670: página EARN + og-card v2
   no ar; IndexNow 108 URLs rodado 19:04Z pela sprint 16h).
   → **NOVO: rodar `scripts\29-PUSH.bat`** (30s) — sobe ADMIN HQ consolidado
   (30cd789 + f812f06) + log engajamento X (dceea2c) + docs sprint 16h (pesquisa Whop).
1b. ✅ ~~Conta Whop~~ — **FEITA pelo fundador ~19:45Z 03/08** e whop montado POR MIM na
   sessão logada: **whop.com/kineoclippers** ("Kineo Clippers", descrição com free +
   40% afiliado, welcome post com utm_source=whop, indexável). Rota B (grátis) NO AR.
1c. ⏸️ Campanha Content Rewards paga — **ADIADA: fundador sem caixa agora** (03/08).
   Spec pronto em `docs/PESQUISA-WHOP-2026-08-03.md`; religar quando houver budget
   (dá pra testar com $50). Enquanto isso: Rota C grátis (outreach a donos de
   comunidade com afiliado 40%) — eu rascunho no Gmail.
2. ✅ ~~Fazier launch~~ — **NO AR, #1 DO DIA com 45 upvotes** (14:20Z). 3 comentários
   respondidos como maker na sua sessão. Só acompanhar; nada obrigatório seu.
3. (30s, ouro) **TAAFT review — akajitin@gmail.com**: comprou HOJE 25 min após cadastrar
   via TAAFT, 5 vídeos, viu o review-ask. Uma linha pessoal sua pedindo review =
   candidato nº 1 da história. Link: https://theresanaiforthat.com/ai/kineo/
4. 🗓️ Amanhã ter 04/08 12:01am PT — **PH LAUNCH DAY** (agendado, checklist 100%).

## 📌 02/08 ~22:20Z (atualizado sprint 19h) — PENDENTES DO DIA (2×30s)

1. ✅ ~~Send Emilio~~ — **FEITO 21:35Z** (verificado in:sent). Aguardando retorno dele.
2. ✅ ~~14-PUSH~~ — **FEITO** (origin/main=845c6b5; fast-retry + first-win em produção).
3. ✅ ~~16-PUSH~~ — **RODADO** (deploy sha 6a74621 READY; IndexNow 107 URLs HTTP 200 pós-deploy).
4. 🗓️ **Fazier launch AMANHÃ seg 03/08** — fazier.com/launches/kineo.
5. ✅ ~~Conta PH~~ — **2º LAUNCH AGENDADO: TERÇA 04/08 12:01am PT** (página refeita, galeria nova,
   first comment pronto). No dia: responder comentários; NÃO pedir upvotes (regra PH).
6. ✅ ~~17/18-PUSH~~ — **RODADO ~00:50Z 03/08** (deploy READY sha 75e5d04 em www.usekineo.com; PayPal-no-recovery + CTA Autopilot EM PRODUÇÃO).

**Regra:** eu nunca paro num gate. Anoto aqui, passo para a próxima coisa, e o Joseph resolve tudo de uma vez por dia.
**Não posso:** criar conta · digitar senha · resolver CAPTCHA · mover dinheiro.

---

## 🚨 00. DIAGNÓSTICO FECHADO (sprint 21h) — A RECARGA FOI PARA A CONTA ERRADA. Conserto: 5 min

**Verificado às ~00:05Z de 01/08 na SUA sessão logada do Chrome em platform.openai.com
(hipótese 3 era a certa — as outras duas caíram):**

- O blackout foi **UM SÓ, contínuo, 11:07Z → 23:52Z+** (último erro registrado antes deste
  relatório). 21 vítimas externas no dia, **0 vídeos entregues o dia inteiro**. Os "rounds"
  eram só janelas de observação — os erros nunca pararam (17h→23h: erros em TODAS as horas).
- A conta **josephsskaf@gmail.com tem UMA org só ("Personal")**: saldo **$18.98**, auto-reload
  LIGADO ($5→$10, teto $30/mês), spend limit $50/mês. E essa org gastou **$1.02 em 15 dias**
  (27 requests no período 17/07–01/08; única key "Aestivora Vora" `sk-...60kA`, last used
  **17/jul**, monthly spend $0.00).
- Conclusão inescapável: **a OPENAI_API_KEY da produção NÃO pertence a esta conta.** A
  produção consome de OUTRA conta OpenAI, que está sem créditos desde 11:07Z. A recarga das
  16:42Z caiu nesta conta (a errada) — por isso "não segurou": ela nunca teve efeito.
- Código confirma: `lib/openai.ts` = `new OpenAI({ apiKey })` sem baseURL (api.openai.com
  puro). `.env.local` local só tem placeholder `sk-...`; a chave real vive nos env vars da
  Vercel.

**CONSERTO (5 min) — não cace a conta antiga; traga a produção para a conta que você já monitora:**
1. https://platform.openai.com/api-keys (logado como josephsskaf@gmail.com) →
   **Create new secret key** → copiar.
2. https://vercel.com → projeto **kineo** → Settings → **Environment Variables** →
   editar `OPENAI_API_KEY` (Production) → colar a nova chave → Save.
3. Aba **Deployments** → menu ⋯ do deploy atual → **Redeploy** (env var nova só entra
   com deploy novo). Antes disso, rode o `scripts\13-PUSH.bat` — aí o próprio push já
   faz o deploy com a env nova.
4. Pronto: produção passa a consumir da org com $18.98 + auto-reload ligado. O win-back
   dispara SOZINHO na volta (45 min sem marker + 1 vídeo completado; cron hh:05/hh:35).
5. Na mesma sessão (2 min, https://platform.openai.com/settings/organization/limits):
   com a onda a 68 cadastros/24h, o colchão atual é fino → auto-reload **gatilho $10 /
   recarregar até $25**, teto mensal de auto-reload **$30 → $100** e spend limit da org
   **$50 → $200** (teto é permissão, não gasto — e o mês da OpenAI acabou de virar).

⚠️ Por regra dura eu não crio nem colo chaves/segredos em campo nenhum — por isso este
gate é seu. Teste de sucesso: gerar 1 vídeo → `videos.status='completed'` novo → win-back
sai sozinho para as 21 vítimas.

---

## ✅ 00-a. ROUND 1 (histórico) — recarga feita pelo fundador, fim às 16:42Z (31/07)

Duração total: **11:07Z → 16:42Z (5h35)**. Dano final: 15 vítimas externas / ~196 erros /
0 vídeos no período. Verificado em produção às 16:50Z: **zero erros desde 16:43Z** (antes,
~1/min). Timeline completa em SPRINT-2026-07-31 (§ sprints 11h e 13h).
Alarme (10-PUSH) e win-back (11-PUSH) ambos no ar — deploy `a81f6d8` READY.
O win-back dispara sozinho quando: 45 min sem erro de quota + 1 vídeo COMPLETADO depois
de 16:42Z (cron roda às hh:05/hh:35). Nenhuma ação pendente.

**Pós-mortem (16:55Z, screenshot do fundador):** saldo $18.98 e **auto-reload LIGADO**
(gatilho $5 → recarrega até $10, teto $30/mês) — a causa raiz está tratada. ⚠️ Ajuste
recomendado (2 min, botão Modify): colchão de $5 é fino para pico de onda (gatilho $10 →
até $25) e o **teto de $30/mês é o novo ponto único de falha** se o volume seguir
crescendo — subir para $100+ (teto é permissão, não gasto). Se o teto bater, o alarme
pega em segundos e o win-back recupera as vítimas — mas melhor não bater.

## ✅ 0. `scripts\11-PUSH.bat` — RODADO pelo fundador às ~16:44Z (deploy `a81f6d8` READY)

---

## ✅ SPRINT DE FLUXO 31/07 (3h) — o que EU já fiz sozinho, com a extensão viva

| Ação | Resultado |
|---|---|
| IndexNow (Bing/ChatGPT) | **107 URLs aceitas, HTTP 200** — inclui o case study novo |
| Google: reindex da HOME | **"Indexing requested"** — o título de marca novo entrou na fila prioritária |
| Google: index do case study | **"Indexing requested"** |
| Google: recrawl de /avatar | **"request rejected"** = o Google LEU o noindex — o snippet "ShortsForgeAI · $11.90" vai cair |
| **FutureTools (Matt Wolfe, ~700k subs)** | ✅ **"Tool Submitted!"** — 1ª submissão de diretório da história da empresa |
| **Insidr.ai** | ✅ **"Your submission was successful."** |
| aitoolsdirectory.com | ⏳ rascunho preenchido (Kineo + URL salvos no form); página com bug de render — terminar à mão leva 2 min |

## ❌ Diretórios que EU não consigo — precisam de VOCÊ logado (a extensão já permite eu dirigir depois do seu login)

Todos verificados em 31/07. Cada um pede conta/login:

| Diretório | Bloqueio | Link |
|---|---|---|
| **Fazier** (melhor dofollow da lista) | conta | fazier.com |
| **Microlaunch** | conta | microlaunch.net |
| **OpenAlternative** | conta | openalternative.co/submit |
| Dang.ai | magic link por e-mail | dang.ai/submit |
| Findly.tools | conta | findly.tools/submit |
| TinyLaunch (badge DR 72+) | conta | tinylaunch.com |
| ProductCool | magic link | productcool.com/submit |
| AIStage | login p/ ver o form | aistage.net/submit |
| Turbo0 | conta | turbo0.com/submit |
| StartupBase · BetaList · SaaSHub · Uneed | conta | — |

**Como destravar em lote (30 min, uma vez):** você loga nesses sites numa janela do Chrome e me fala — com a extensão conectada eu preencho e submeto todos na hora, igual fiz no FutureTools.

## ❌ Mortos ou pagos — riscar da lista para sempre

- **TAAFT rota grátis (tally.so/r/mRWbdK): FORMULÁRIO FECHADO** em 31/07 — "This form is now closed". A única rota grátis do TAAFT morreu; sobra a edição da ficha (já feita) e reviews.
- aitools.fyi/submit → virou serviço pago **$37**
- ToolsFine → formulário termina em **"Continue to PayPal – $10"**
- LaunchingNext → parede anti-bot infinita

---

## 🔴 0. (03/08 19h) Rodar `scripts\31-PUSH.bat` + enviar 3 outreach Whop — 6 min

- **31-PUSH** (substitui o 30): sobe as 4 iniciativas da sessão CEO (WALL /wall, SCRIPT
  LIBRARY /scripts, AEO 46 /vs, sitemap) + admin HQ + docs. 7 commits parados localmente.
- **3 rascunhos no Gmail** (Rota C Whop, afiliado 40%): o canal real é **Whop DM / IG DM**
  — abrir cada rascunho, copiar o CORPO e colar no destino que está no assunto:
  1. carlosdelzo (whop.com/cashclipslatino) — em espanhol
  2. @eugenelitman_ IG / whop.com/joinclipstudios
  3. @adan.maxwell IG / whop.com/vitaclips

## 🔴 1. TAAFT — pedir 5 avaliações reais — 15 min

Nota **3,0 com só 2 avaliações** governa o que todo LLM lê sobre a Kineo. O TAAFT segue sendo o canal nº 1 (81 cadastros, 32,1% de ativação, metade dos compradores da história) e está decaindo 48→16→9→5/semana. Mandar o link para 5 usuários reais é o item de maior retorno por minuto que existe: https://theresanaiforthat.com/ai/kineo/
Lista de candidatos (por vídeos concluídos) em `docs/SPRINT-2026-07-30-D.md` §7.
Bônus: **antonia@theresanaiforthat.com tem conta na Kineo com 5 vídeos** — contato mais valioso da empresa.

## 🔴 1.b Send no rascunho do pagante — 30 segundos (sprint 10h)

Rascunho novo no seu Gmail: **"Fixed — your videos will deliver now"** para
`valos87196@…` (o único plano pago ativo). Diagnóstico fechado hoje: 6 vídeos dele foram
renderizados e RECUSADOS na entrega por falha nossa de débito; o fix subiu no seu push desta
manhã e um débito real liquidou às 10:55Z. Ele não tenta desde 30/07 12:44Z — este e-mail é
o que o traz de volta. Só apertar Send.

## 🔴 2. E-mail de win-back — 12 pessoas, "pode mandar" seu

12 pessoas tiveram 25 vídeos prontos destruídos (23–30/07) por falha nossa. Rascunho pronto; só falta seu OK. O pagante `valos87196@…` merece contato direto.

## 🔴 3. Bing Webmaster Tools — 10 min

Import do GSC em 1 clique: bing.com/webmasters. O canal já está alimentado (IndexNow ×2); falta enxergar posições/consultas no índice que sustenta a busca do ChatGPT.

## 🟠 4. AlternativeTo — 20 min

Página da Kineo com 0 likes. "Suggest alternative" em OpusClip, Submagic, InVideo, Klap, Crayo, AutoShorts, Revid, Faceless.so, Syllaby, Pictory, HeyGen, Fliki, SendShort, Zebracat, Quso.

## 🟡 5. Computer-use nas tarefas agendadas — 1 min, mata o gate de push

Configurações da tarefa `kineo-sprint-diario` → adicionar **Explorador de Arquivos**. Aí as 4 sprints diárias empurram commits sozinhas.

## ✅ 6. KINEO_LIFECYCLE_EMAILS_ENABLED — LIGADO em 31/07 (nudges saindo em ritmo saudável: 502 às 16:02Z)

Auditoria de 31/07 (sessão B) concluiu os dois pré-requisitos:
- **Supressão cruzada de 24h: JÁ ESTAVA LIGADA** nos 4 crons + 2 rotas admin desde 27/07
  (`lib/lifecycle/suppression.ts` — os docs é que estavam atrasados).
- **Templates auditados um a um:** remetente certo (`hello@usekineo.com`), claims honestos.
  Único erro real — video-rescue prometia "25 Shorts por $4,90" quando o pack dá **30** —
  corrigido e amarrado à fonte de preço (commit da sessão B).
- A "falsidade documentada" ("first AI video is free, no credits") vive só num **comentário
  de código** e no doc morto EMAIL-HOT-LEAD.md — nenhum e-mail enviado a contém.

**Para ligar:** Vercel → kineo → Settings → Environment Variables → `KINEO_LIFECYCLE_EMAILS_ENABLED=true` → redeploy. Reversível em segundos. 721 contatos do outro lado, máx. 1 e-mail/24h por pessoa, 1 de cada tipo por vida.

## ✅ 7. Post do Reddit — FEITO POR MIM em 31/07 (autorizado)
Postado de u/ShortsforgeAI + 1º comentário. Filtro do Reddit segurou o post (conta nova sem karma) — está na fila dos mods. Modmail de revisão bloqueado ("You can't message that user" = restrição de conta nova). **Se você tiver conta Reddit PESSOAL com karma, o próximo post sai dela — resolve o filtro na raiz.**

## ~~🆕 7-antigo~~. Post do Reddit — PRONTO PARA COLAR — 5 min

`docs/REDDIT-POST-PRONTO.md`: título + corpo + primeiro comentário, para o r/YouTubeCreators
(98k membros, sem regras de autopromoção). É a distribuição do case study — thread viva que
se atualiza toda semana. Postar exige sua conta Reddit; o texto está pronto palavra por palavra.

## 🔴 INCIDENTE DE CREDITO — DESCOBERTO 05/08 03:40Z (fundador reportou "creditos abaixaram sem video")
CAUSA: modo cinematografico (seedance/veo/kling/hollywood) e avatar/presenter DEBITAM NO SUBMIT
(app/api/generate-video-cinematic/route.ts:798), nao na entrega. Reembolso existia SO AO VIVO
(dependia da aba aberta fazendo polling) e o sweep diario EXCLUIA cinematic-% de proposito.
Aba fechada / fal travado = credito perdido para sempre, em silencio.
A tela prometia "Credits are only charged on successful delivery" — VERDADE no fast, MENTIRA
em todos os motores de IA. Promessa falsa para cliente pagante = risco de reembolso/chargeback.
PROVA: 1 render abandonado de 22/07 com 150 creditos queimados que ninguem soube + os 2 do
fundador em 05/08 (20 seedance + 90 veo).
CORRIGIDO em e3ddf7a: sweepAbandonedCinematicDebits() no cron de refund (09:30), /api/compose/active
passa a enxergar cinematic em fal_polling (a pilula global era cega na fase mais longa e ja paga),
copy condicional por motor. Creditos do fundador devolvidos via refund_render_credits (397 -> 507).

### ⚠️ RISCO IRMAO AINDA ABERTO — avatar/presenter
avatar-% tem EXATAMENTE o mesmo buraco (debita no submit, refund so ao vivo, excluido do sweep).
Hoje nao ha linha presa, mas o proximo avatar abandonado queima creditos igual.
TAREFA PARA A PROXIMA SPRINT: estender sweepAbandonedCinematicDebits para avatar-% usando a
mesma cadeia de verificacao de entrega. Prioridade alta — e dinheiro do cliente.

### ⚠️ ETA MENTIROSA POR MOTOR (mesma familia: usuario no escuro)
A tela promete "usually 2-4 minutes" para TODOS os motores. Veo 60s = 7 clipes x 2-4 min = 15-25 min.
O fundador achou que tinha travado (05/08 03:30Z). TAREFA: ETA condicional por motor/duracao.

---

## 🔴 05/08/2026 22:5xZ — GATE NOVO E MAL DIAGNOSTICADO ATE AGORA: **O AUTO-PUSH NAO PODE FUNCIONAR EM SPRINT AGENDADA**

A sprint das 19h concluiu que o `request_access` do Explorador de Arquivos "expirou 3x (180s)" e
que bastava o fundador aprovar o dialogo quando ele aparecesse. **Isso esta errado.** A tentativa
de hoje devolveu o motivo real, em texto:

> *"Computer-use access to 'Explorador de Arquivos' can't be approved during a scheduled run.
> To grant it, send a message in this conversation (the approval card will appear), or add the
> app to the scheduled task's settings."*

Nao e timeout, nao e o fundador demorando para clicar: **execucao agendada nao consegue levantar
o dialogo de aprovacao, por desenho.** O dialogo nunca apareceu para ser aprovado.

**Os dois caminhos que resolvem de verdade (so o fundador pode fazer):**
1. **Adicionar "Explorador de Arquivos" nas configuracoes da tarefa agendada `kineo-sprint-diario`.**
   E o caminho definitivo: vale para todas as sprints, sem clique diario. `update_scheduled_task`
   NAO tem campo para isso — tem que ser pela interface da tarefa.
2. Ou rodar um `N-PUSH.bat` manualmente, como sempre foi.

**Enquanto isso: `scripts\49-PUSH.bat`** — 6 commits esperando, incluindo a correcao que devolve
o e-mail do muro do plano free a quem bate no teto.

⚠️ Consequencia para o prompt: a secao "PUSH: EU MESMO RODO" so vale em sessao INTERATIVA. Em
sprint agendada o push continua sendo gate ate o item 1 acima ser feito.

### ✅ 23:0xZ — O CAMINHO EXATO PARA DESTRAVAR O PUSH DE VEZ (veio da propria plataforma)

Ao atualizar a tarefa agendada, o sistema devolveu a regra que faltava:

> *"Tool approvals granted during a run are stored on the task and auto-applied to future runs.
> If this task is likely to use remote connectors or browser control, recommend the user click
> **'Run now'** first to pre-approve the tools it needs — this prevents future runs from pausing
> on permission prompts."*

**Ou seja: aprovacao dada numa execucao INTERATIVA fica guardada NA TAREFA e vale para todas as
execucoes agendadas seguintes.** O que o fundador precisa fazer, **uma vez so**:

1. Abrir a tarefa `kineo-sprint-diario` e clicar **"Run now"** (execucao interativa).
2. Quando aparecer o cartao pedindo acesso ao **Explorador de Arquivos**, **aprovar**.
3. Pronto. A partir dai as 6 sprints diarias rodam o `scripts\AUTO-PUSH.bat` sozinhas e o push
   deixa de ser gate para sempre.

E menos trabalho que clicar um `N-PUSH.bat` por dia, e resolve permanentemente.

---

## 🔎 23:47Z (sprint 23h) — TERCEIRO DIAGNOSTICO DO PUSH, E ELE CONTRADIZ OS DOIS ANTERIORES

`request_access` numa sprint AGENDADA devolveu, hoje, uma mensagem **nova**:

> *"Another Claude session is currently using the computer. Wait for the user to acknowledge it
> is finished (stop button in the Claude window), or find a non-computer-use approach."*

Nao e "timeout" (sprint das 19h) nem "sprint agendada nao levanta dialogo" (sprint das 21h).
E **contencao**: existe uma sessao interativa aberta segurando o computador — que e, muito
provavelmente, a MESMA sessao pela qual os pushes de hoje entraram (`origin/main` andou duas vezes
durante esta sprint, ate `691fe57`, deploy READY 23:29Z).

**Licao para o prompt, e ela vale alem do push:** *o mesmo sintoma ("nao consegui") teve tres
causas diferentes em tres sprints do mesmo dia.* Diagnostico de gate tem prazo de validade de UMA
sprint. Reler a mensagem crua todas as vezes, nunca herdar a conclusao.

**O gate permanente NAO mudou** e continua sendo o item 1 acima (Run now + aprovar o Explorador de
Arquivos uma vez). Enquanto isso: **`scripts\50-PUSH.bat`, 2 commits**, sendo o principal a trava
que impede o e-mail do muro de ser reenviado em loop.

---

## 🔎 01:45Z 06/08 (sprint extra) — O PUSH VOLTOU A SER GATE, E A MENSAGEM CRUA É A DE ONTEM

`request_access` numa sprint AGENDADA devolveu, hoje, **exatamente** a mensagem da sprint das 21h:

> *"Computer-use access to 'Explorador de Arquivos' can't be approved during a scheduled run. To
> grant it, send a message in this conversation (the approval card will appear), or add the app to
> the scheduled task's settings. (Retrying returns this same result.)"*

Nenhuma menção a contenção por outra sessão (o terceiro diagnóstico, das 23:47Z). **Uma tentativa
só**, como manda o prompt — o próprio texto avisa que retentar devolve o mesmo.

**Confirmado, então, o que a sprint das 00h descobriu:** o que destrava é **o fundador mandar
qualquer mensagem na conversa durante a sprint** (foi assim que 3 pushes saíram sozinhos às
23:28Z de ontem). A alternativa permanente continua sendo adicionar o **Explorador de Arquivos**
nas **configurações da tarefa agendada** `kineo-sprint-diario` — `update_scheduled_task` não tem
esse campo, é pela interface.

**Represado agora: `scripts\51-PUSH.bat` — 2 commits.** O principal faz a tela do Autopilot parar
de dizer *"isso é para quem paga"* para 2 dos 3 assinantes ativos da empresa.

---

## 🔎 14:50Z 06/08 (sprint das 11h) — O GATE DA MADRUGADA FOI FECHADO, O DO PUSH VOLTOU

**BOA NOTÍCIA PRIMEIRO:** os 3 commits represados (`9b41ae6`, `737e1fb`, `8d915cd`) **subiram** —
`origin/main` estava em `a7d61bb` no início desta sprint e o deploy está READY. A correção do
Autopilot, que fazia a tela dizer *"isso é para quem paga"* para 2 dos 3 assinantes ativos, **está
em produção desde ~12:42Z**. O `51-PUSH.bat` não é mais necessário.

**O gate do push voltou, com a mensagem idêntica** (uma tentativa só, como manda o prompt):

> *"Computer-use access to 'Explorador de Arquivos' can't be approved during a scheduled run. To
> grant it, send a message in this conversation (the approval card will appear), or add the app to
> the scheduled task's settings. (Retrying returns this same result.)"*

**Represado agora: `scripts\53-PUSH.bat` — 2 commits.** Um é a fonte única da cota free
(`lib/freeFastQuota.ts`) e o outro é o **REVERSE TRIAL fase 1** da sessão paralela.

### 🚨 ITEM NOVO PARA O FUNDADOR SABER (não é gate, é achado)
`app/api/render/[id]/route.ts` **não verifica se o render pertence ao usuário** — só se existe um
login. Qualquer pessoa logada que tenha um `render_id` recebe a URL do vídeo de outra, e a rota
ainda chama `refundRenderCredits`, o que permite **disparar refund no ledger de crédito alheio**.
Não corrigi na mesma sprint de propósito: mexe em dinheiro e precisa de revisão adversarial
dedicada. É o item 1 da próxima sprint.

---

## 🔎 22:0xZ 06/08 (sprint 19h/21h) — UM GATE NOVO: O ÍNDICE DO GIT ESTÁ PRESO POR OUTRA SESSÃO

O gate do push continua o de sempre (2 commits represados, `scripts\56-PUSH.bat`). O **novo** é
outro e não deve ser confundido com ele — a lição de 06/08 vale ("o mesmo sintoma teve três causas
em três sprints; diagnóstico de gate vale UMA sprint"):

`.git/index.lock` existe desde **19:13** e todo `git add` devolve *"Another git process seems to be
running in this repository"*. **NÃO é lock morto:** `.git/index` foi tocado nos minutos seguintes e
**20+ arquivos foram reescritos entre 19:07 e 19:30** (`lib/freeTierOffer.ts`,
`components/FreeTierOfferProvider.tsx`, auth, pricing, checkout/cancelled, llms.txt, Sidebar…),
ou seja **uma sessão paralela está executando a TROCA ATÔMICA DO FREE TIER (fase 2, item 6) agora**.

**Não removi o lock, e essa é a decisão:** apagar o índice de um `git commit` alheio em andamento
corrompe o índice para todas as sessões. O trabalho desta sprint
(`app/(dashboard)/generate/GenerateClient.tsx`, correção de moeda do UpgradeModal) está **no disco,
com `tsc --noEmit` EXIT=0**, e entra no próximo commit — seja o meu, seja o da sessão paralela se
ela usar `add -A`.

**Efeito colateral a conferir na próxima sprint:** se a sessão paralela commitou com `add -A`, o
fix de moeda entrou no commit da troca do free tier, sem mensagem própria. `git log -1 --stat` no
GenerateClient.tsx resolve a dúvida em uma linha.

### 🚨 ITEM PARA O FUNDADOR (não é gate de código, é gate de dinheiro)
**Três fornecedores reportaram falha de cobrança em 30 horas:** fal.ai (*Payment failed*,
#BCOUKU-00033, 05/08; nova fatura #BCOUKU-00034 de US$ 25,00 vencendo 18/08), OpenAI
(*Auto-recharge Failed* 05/08, recuperado 12 min depois no cartão final 1375) e **Render**
(*Invalid payment info / unpaid balance*, 06/08 11:58, **ainda em aberto**). Isoladas são ruído;
juntas apontam para **o meio de pagamento**, não para saldo. Registra-se também que
*auto-reload ligado* e *cobrança falhando* são compatíveis — a premissa "fal está resolvido" não
cobre este sintoma. Meio de pagamento é gate do fundador; nada foi tocado.

---

## 🟠 ABERTO — `characterLimitFor` não conhece `creator`, `studio` nem `autopilot`
*(achado da sprint 21h de 06/08, KINEO-TRIAL-FEATURE-GATES; não corrigido de propósito)*

`lib/characters.ts` decide a cota de personagens por STRING de plano:
`pro`/`pro_trial` → 10 · `starter`/`basic` (+`_trial`) → 3 · **qualquer outra coisa
→ `hasPaid ? 3 : 0`**. As strings `creator`, `creator_trial`, `studio`,
`studio_trial`, `autopilot`, `autopilot_trial` e `autopilot_pilot` **não têm ramo**
e caem no fallback. Consequências verificáveis, hoje, com a flag OFF:

- `plan='studio'` recebe **3 personagens em vez de 10** — o cliente mais caro
  recebe a cota do mais barato;
- `plan='creator'` com `has_paid=false` recebe **0** e vê o 402 de "feature paga".

As sete strings são valores que o webhook da Stripe realmente escreve
(`app/api/admin/users/route.ts` lista o conjunto canônico). **Exposição real hoje é
baixa** — a produção tem só 3 planos pagos ativos (2 `starter`, 1 `basic`), e todo
caminho de escrita que produz as strings novas também grava `has_paid=true`, que é
o primeiro termo dos gates. Mas o defeito arma no dia em que o primeiro Studio
assinar.

**Não corrigi porque não é bug de código, é decisão de produto:** definir a cota de
Creator/Studio/Autopilot é decidir o que o cliente comprou. Uma linha do fundador
("Studio = 10, Creator = 3, Autopilot = ?") fecha isso em 5 minutos de código.

### Irmão do mesmo defeito: 5 listas diferentes de "plano pago" no repo
Grep de allowlists de plano encontrou **cinco conjuntos distintos** em 14 arquivos:
`starter/basic/pro` (7 arquivos, sem creator/studio/autopilot) · +creator/studio
(3) · +autopilot (2) · sem os `_trial` (1) · e um com `autopilot_pilot` (1). Os 12
que não são gate de feature são e-mails/admin/métricas — errar ali custa um e-mail,
não uma feature. Os dois que ERAM gate de feature (`footage`, `characters`) foram
os corrigidos nesta sprint. O padrão certo já existe e está documentado em
`lib/reverseTrial.ts`: `isPayingProfile` (denylist invertida, falha FECHADO), porque
allowlist "erra do lado caro" — a produção tem 3 perfis pagando com `plan='free'` e
1 com `plan='pro'` sem `has_paid`.

## 🔵 Para o GO-LIVE: o único gate free/pago que DISCORDA do trial
`app/api/generate-video-fast/route.ts` usa `AI_HOOK_PAID_PLANS` no sentido
INVERTIDO — o hook de IA é perk exclusivo do free tier. Uma conta em trial é
`plan='free', has_paid=false`, logo **ganha um perk que o pagante não ganha**. Não é
regressão (o mesmo signup sem trial também ganharia) e não custa dinheiro, mas é a
única superfície onde "trial = Creator" não vale. Registrado para não virar
surpresa no reteste da flag.

---

## 🔴 08/08 14:5xZ — REPO TRAVADO POR DOIS CADEADOS ÓRFÃOS + INDEX ENVENENADO

**Um processo git morreu às 10:23 e deixou dois locks de 0 bytes:**
`.git/index.lock` e `.git/refs/heads/main.lock`. O sandbox **não consegue removê-los**
(`Operation not permitted`), então nenhuma sprint agendada consegue `git add`, `git reset`
nem `git update-ref` até que sejam apagados **do Windows**.

**O perigo real não é o cadeado — é o que ficou STAGED no index:**

| arquivo | o que está staged |
|---|---|
| `docs/SPRINT-2026-08-08.md` | **DELEÇÃO** |
| `scripts/63-PUSH.bat` | **DELEÇÃO** |
| `docs/ENGAGEMENT-LOG.md` | reversão de 27 linhas |
| `docs/GATES-ABERTOS.md` | reversão de 40 linhas |

**216 deleções esperando o próximo `git commit` normal.** Quem commitar sem `git reset`
antes apaga o doc do dia e o script de push.

**O commit da sprint 11h existe e está íntegro** — foi montado com `GIT_INDEX_FILE`
alternativo a partir de `read-tree HEAD`, então NÃO passou pelo index envenenado e carrega
exatamente 7 arquivos, zero deleções:

```
85c2ac4bd66c3c93cfc941d7e933faff6025f1c4
```

**Como destravar (1 clique):** selecionar `scripts\64-DESTRAVA-E-PUSH.bat` no Explorador e
dar Return. Ele apaga os dois cadeados, move `main` para `85c2ac4`, roda `git reset` (sem
`--hard`, não toca em arquivo do disco) e faz o push dos 9 commits. Não cria commit, não faz
`git add`, não apaga arquivo do projeto.

---

## Atualizacao — 10/08/2026, sprint 19h

### GATE #1 — CREATOMATE (o unico que impede o produto de existir)
**Confirmado na fonte, nao mais por inferencia.** Painel do fornecedor as 22:0xZ:
"Credit Usage — 10.0K of 10.0K credits used — **100%**". Nao e cobranca (os
avisos de cartao sao do Render.com), nao e chave, nao e instabilidade.

- Produto parado desde **09/08 16:21:08Z** — 30 horas na hora desta leitura.
- Erros ainda chegando as **21:38Z**. 22 cadastros hoje, nenhum fez um video.
- **Acao (30 segundos):** creatomate.com > Credit Usage > Subscription >
  subir **Growth 10K → Growth 40K**. Unico tier que cobre 31 dias na queima de
  hoje (10K=9,6 dias · 20K=19,3 · 30K=28,9 · 40K=38,5).
- Alternativa: o rascunho para o Casper continua pronto no Gmail (ele resolveu
  em 2h11 da ultima vez). **Nao foi enviado** — e clique do fundador.
- Nao ha caminho autonomo: dinheiro e gate do fundador, e nao existe fallback
  de render sem reproduzir legenda e marca d'agua (guardrail).

### GATE #2 — PUSH: agora sao 16 commits, e o script mudou
⚠️ **Rode `scripts\67-PUSH.bat`, NAO o 66.** Apareceram tres `.lock` orfaos de
08/08 no `.git` que o ambiente do Cowork nao consegue apagar
(`Operation not permitted`, mount do OneDrive). Os 2 commits da sprint das 19h
foram criados por plumbing numa ref paralela **`refs/heads/sprint-19h`**; o
`67-PUSH.bat` apaga os locks, faz o `main` avancar e empurra. Seguro rodar
duas vezes.

### GATE #3 — Resolucao do output (ficou BARATO de decidir)
Continua sem resposta desde as 16h, mas deixou de exigir commit: agora sao as
envs `KINEO_RENDER_WIDTH` / `_HEIGHT` / `_FPS` na Vercel.
**Recomendacao (numeros corrigidos apos a revisao adversarial — a primeira
versao estava 11,5% otimista):**

| perfil | autonomia real no 10K | Δ custo |
|---|---|---|
| 1080×1920@30 (hoje) | 8,6 dias | — |
| 720×1280@30 | 19,4 dias | −56% |
| 720×1280@24 | 24,3 dias | −64% |
| 480×854@24 | 54,6 dias | −84% |

⚠️ **Nenhum perfil com qualidade cobre um ciclo de 31 dias no plano de 10.000
— nem o 720p24.** A escolha real e entre (a) pagar plano maior e manter 1080p,
ou (b) 720p24 + plano maior menor. Manter 1080p30 no 10K significa apagao todo
dia 9 do mes.

### GATE #4 — TAAFT $347: ADIADO pela 5ª sprint seguida
Motivo continua sendo de produto, nao de funil: com o render parado, cada
visitante novo e um cadastro queimado. Os 30 cadastros do apagao sao a prova.
Reabrir **depois** de: (a) Creatomate de volta, (b) QA do reverse trial, (c)
flag ligada.
