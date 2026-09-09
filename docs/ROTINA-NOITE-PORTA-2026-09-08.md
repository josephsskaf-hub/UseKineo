# ROTINA PORTA — noite 08→09/09/2026

Missão: a porta de $1 (Versão B) tem que deixar de ser AVISO e virar CENA que a
pessoa clica. Métrica: pessoas distintas que clicam / pessoas distintas que veem.

Worktree: `C:\kineo-wt\noite-porta` (detached sobre origin/main).

---

## r1 20:05 — MEDIR ANTES DE MEXER

Base `origin/main = db1d00c0`. SQL contra o projeto `cqqukkvjjrguayiyjvhh`, contas
externas (e-mail sem josephsskaf/usekineo/kineo.local), desde `2026-09-08 05:00+00`.

### Quem viu a faixa (`card_entry_banner_shown`) — 7 pessoas, 13 impressões, 0 cliques

| # | pessoa | views | path | clicou faixa | tentou gerar | modal | checkout | total eventos |
|---|--------|-------|------|--------------|--------------|-------|----------|---------------|
| 1 | atoyebiolakam2010 | 1 | /studio | 0 | não | não | 0 | 5 |
| 2 | samuelhabtub | 2 | /studio | 0 | não | não | 0 | 9 |
| 3 | huychnuant…angmanh | 2 | /studio, /studio/create | 0 | sim | **sim** | 0 | 23 |
| 4 | kaursimrannn20 | 1 | /studio/create | 0 | sim (render FALHOU) | não | 0 | 49 |
| 5 | samu.mikkonen | 2 | /studio/create | 0 | sim | **sim (3×)** | **1** | 89 |
| 6 | ep5451873 | 4 | /studio, /studio/create | 0 | sim | **sim** | 0 | 90 |
| 7 | kingtopman | 1 | /studio | 0 | não | não | 0 | 2 |

Todas: `plan=free`, `has_paid=false`, `video_credits=0`; 6 com `trial_status='card_required'`,
1 (kingtopman) sem carimbo e com saldo 0 — a faixa apareceu para ela pelo ramo
`semCarimboMasSemCredito`, funcionou como projetado.

### O NÚMERO QUE MUDA A NOITE

Existem DUAS portas no ar, e a que a rotina foi mandada consertar não é a que converte:

| superfície | pessoas | impressões | cliques de checkout |
|---|---|---|---|
| faixa `card_entry_banner_shown` | **7** | 13 | **0** |
| modal `upgrade_modal_trial_door_shown` | **3** | 5 | **1** |

Quem clicou (samu.mikkonen, 11:18:25) clicou **de dentro do modal**
(`checkout_cta_clicked.surface = 'generate_upgrade_modal'`) — nunca da faixa.

### E O DEFEITO QUE ISSO REVELA — a porta de $1 PERDEU dentro da própria caixa

O `checkout_cta_clicked` da única pessoa que apertou algo hoje diz:

```
{ surface: 'generate_upgrade_modal', tier: 'starter', selection: 'starter', intro: true, reason: 'credits' }
```

E o `checkout_started` que veio 1s depois: `tier='starter'`, `intent_campaign='push77_short_cost_calculator'`,
`intro_requested=true`. Ou seja: **a porta de $1 estava na tela**
(`upgrade_modal_trial_door_shown` 3× para essa mesma pessoa, `visible:true`,
`door_reason:'ok'`, `entry_fee_minor:100`) **e ela escolheu o plano de $9** — que
é a oferta cara, exige decisão de assinatura e não entrega o filme que ela acabou
de escrever. Ela foi ao Stripe e **não pagou**. Voltou (`checkout_resume_banner_viewed`),
dispensou a faixa de retomada e bateu na parede mais 3 vezes
(`compose_refused` 6× no total, `reason='free_fast_limit'`, `limit:0`).

A porta de $1 não está fraca por copy. Está **competindo com uma grade de planos
dentro da mesma caixa, e perdendo**. Uma caixa que oferece 4 saídas não é uma porta.

### O que mais aparece no mesmo instante do bloqueio (ruído contra a porta)

Sequência real de quem bate na parede: `compose_refused` → `free_limit_wall_shown`
→ `upgrade_modal_opened` → `topup_unavailable_note_shown` (5 eventos, 3 pessoas)
→ `upgrade_modal_trial_door_shown`. A pessoa recebe, no pico de intenção, um aviso
de que **um produto não está disponível** colado na única oferta que a casa quer
que ela aceite.

### Onde a gente perde gente antes da porta

Das 7, **3 nunca apertaram Generate** (atoyebiolakam, samuelhabtub, kingtopman):
viram a faixa e saíram. Para elas a faixa é a única superfície — ela fica.
As outras 4 chegaram ao bloqueio, e é ali que a folha nova vai morar.
E 1 (kaursimrannn20) nem chegou à porta: o render dela **falhou**
(`video_generation_failed` 10:36) antes de qualquer conversa de dinheiro.

---

## r1 — DESENHO DA PORTA NOVA (`CardEntryDoor`, version `door_v2`)

**Onde entra:** no momento do bloqueio, em `openOutOfCreditsModal` — para a coorte
da porta (`CARD_ENTRY_ONLY && !hasPaid && saldo 0`) a folha abre **no lugar do
UpgradeModal**, não além dele. É esse "no lugar de" que mata a competição medida
acima. Fora dessa coorte (assinante sem crédito, saldo parcial, footage), o
UpgradeModal continua exatamente como está.

**O que a pessoa vê, nesta ordem:**

1. **A ideia dela, entre aspas** (prompt atual, cortado em 140 chars). A folha
   fala do filme DELA, não de planos. Sem ideia escrita, essa linha some.
2. **O robô rodando** — `public/previews/36a04f7b-…mp4`, loop, mudo, `playsInline`,
   poster `public/posters/36a04f7b-….jpg`, `max-height:40vh`. É o produto em
   movimento no segundo em que ela decide.
3. **Título** — `CARD_ENTRY_COPY.headline` (fonte única).
4. **Linha de preço** montada em runtime: `formatCheckoutMoney(currency, CARD_TRIAL_ENTRY_FEE_MINOR)`
   + `CARD_TRIAL_DAYS` + `CARD_TRIAL_GRANT_CREDITS` + `getTierPrice('basic', …)`.
   Nenhum "$1", "$19" ou "80" digitado no arquivo.
5. **Três linhas do que ela ganha**, derivadas de `TRIAL_ACCESS` (`engineCoverage`
   dá "80 créditos = N filmes inteiros de Kineo 1" — número calculado, não prometido).
6. **UM botão** → `CARD_ENTRY_CHECKOUT_PATH` com `intent_campaign=door_v2`
   (só a campanha muda; `tier=basic&billing=monthly&trial=1` intactos).
7. **"Not now"** discreto, que fecha e devolve a tela.

**O que a folha NÃO tem, de propósito:** grade de planos, nota de top-up
indisponível, segunda oferta, contagem regressiva.

**Rascunho:** gravado em `kineo_studio_draft_v1` ANTES de ir ao checkout (o
`resume=card_entry` já existe e não é duplicado).

**Eventos:** `card_entry_door_shown` / `card_entry_door_clicked` /
`card_entry_door_dismissed`, com `{version:'door_v2', path, prompt_len, surface}`.

**A faixa `CardEntryBanner` fica.** As 3 pessoas que nunca apertaram Generate só
têm ela.

**SHA desta rotação:** só documento — nada de código publicado na r1.
**Ficou para a r2:** construir a folha e ligá-la no bloqueio.

---

## r2 20:16 — CONSTRUIR E PUBLICAR

**SHA: `ff4c28c5660f9277c9fde1457b41abd7ca417a3d`** — na `origin/main`, deploy
`dpl_7R6nb2r9EB7iEMRPvB5B3HeYB74Q` (production). Fila estava vazia; enfileirado
por `scripts/enfileirar.sh` e publicado pelo `!RODAR-AGORA.bat`.

### O que mudou para o cliente

`components/CardEntryDoor.tsx` (novo) + 3 pontos em `GenerateClient.tsx`.
No instante em que a pessoa aperta Generate sem crédito, ela deixa de ver a
grade de planos e passa a ver, em tela cheia:

1. a própria ideia entre aspas (140 chars);
2. o robô da vitrine rodando, mudo, com poster;
3. o título de `CARD_ENTRY_COPY`;
4. o preço montado em runtime de `formatCheckoutMoney` + `CARD_TRIAL_DAYS` +
   `getTierPrice('basic')`;
5. três linhas do que ela ganha — a do meio é CALCULADA (`80 ÷ custo do Kineo 1`);
6. UM botão para `tier=basic&billing=monthly&trial=1&intent_campaign=door_v2`;
7. "Not now" discreto.

**A folha ABRE NO LUGAR do UpgradeModal**, não além dele — é isso que mata a
competição medida na r1. A coorte é estreita e falha fechada:
`CARD_ENTRY_ONLY && !hasPaid && !assinante && credits !== null && credits <= 0`
e só nos motivos de crédito. **Assinante, saldo parcial e `footage` continuam no
UpgradeModal com os pacotes de sempre** — o remédio deles não está na folha.

### Uma armadilha que quase entrou (e o que ela ensina)

A primeira versão importava `TRIAL_ACCESS` de `@/lib/kineoFacts` para a linha de
cobertura. **O `tsc` ficou verde e o build da Vercel teria quebrado**: a árvore
do `kineoFacts` puxa `node:crypto` (via `lib/gptHandoff`) e `crypto` (via
`lib/trialFingerprint`), e esta folha teria sido o **primeiro componente client
da casa a importá-lo** (varri os 9 importadores: todos servidor). Conserto: usar
o MESMO CONSTRUTOR e as MESMAS fontes que o `kineoFacts` usa —
`buildTrialAccessFact` + `creditsPerReferenceVideo('fast')` + `engineLabelFor('fast')`,
os três puros — em vez de copiar a conta. O guardião tem uma verificação que
varre a árvore de imports da folha e reprova qualquer builtin de servidor.

### Guardião — `scripts/test-porta-v2-2026-09-09.mjs`, 34 verificações

Estático (readFileSync) + **render real** com `react-dom/server`: o módulo de
preço, a política de entrada e os fatos são os REAIS do repositório; só React,
telemetria e idioma entram como dublês.

**Falsificado por mutação — 3 mutantes, cada um provado que APLICOU antes de rodar:**

| mutante | prova de que aplicou | guardião |
|---|---|---|
| preço digitado à mão no lugar da fonte única | `grep -c "for 7 days, then"` = 1 | 🔴 "literal da taxa no corpo de components/CardEntryDoor.tsx" |
| `if (cardEntryCohort && false)` — o modal volta a abrir junto | `grep -c "cardEntryCohort && false"` = 1 | 🔴 "a coorte não é usada" |
| rascunho gravado DEPOIS do checkout | `setItem` linha 235 · `launch` linha 224 | 🔴 "o rascunho é gravado DEPOIS do checkout — a ideia se perde" |

Os três revertidos por `git checkout --` (com o commit já feito antes), suíte de
volta ao verde. ⚠️ A primeira tentativa do 3º mutante **não aplicou** (regex com
`\n` contra arquivo em CRLF) e o guardião devolveu VERDE — que se lê como
"guardião resistiu". Só a prova de aplicação separou uma coisa da outra; refeito
por manipulação de linhas.

### Vizinhos, todos verdes (rodados de verdade, com contagem)

`test-versao-b-entrada-1-dolar` 36 · `test-sistema-de-compra` 27 ·
`test-funil-volta-1-dolar` · `test-continue-now` · `test-placar-trial-1-dolar`.
`npx tsc --noEmit --incremental false` verde com a junção de `node_modules`.

### Sonda

Home `200` com controle `404` na mesma medição (`/api/rota-que-nao-existe-sonda`).
`/api/health` não existe nesta casa — devolve 404 e **não prova nada**.
**A folha vive em rota autenticada**: não dá para provar o bundle dela de fora.
A prova real é o evento `card_entry_door_shown` de uma pessoa externa — é o que
a r3 vai medir, com corte por `metadata ? 'version'`, nunca por relógio.

### Ficou para a r3

Medir os eventos `door_v2`; conferir a folha no celular; e uma pergunta que a r1
deixou aberta: `topup_unavailable_note_shown` aparece 5× no mesmo instante do
bloqueio — na folha ele não existe, mas continua no caminho de quem cai no
UpgradeModal.

---

## r3 20:25 — TRÊS LÍNGUAS, CELULAR, E O DEFEITO QUE SÓ O OLHO ACHOU

Deploy da r2 confirmado: `ff4c28c5` = `dpl_7R6nb2r9EB7iEMRPvB5B3HeYB74Q`,
**READY**, aliasado em `www.usekineo.com`, `shortsforgeai.com` e mais 5.

### O defeito

Escrevi `scripts/preview-porta-v2-2026-09-09.mjs` — renderiza o COMPONENTE REAL
para HTML e serve num navegador. Olhando a folha a 375px apareceram **dois
defeitos que as 34 verificações não pegavam**, porque asserção nenhuma sabe ler
uma tela:

1. **O título saía em INGLÊS nas três línguas.** Ele vinha de
   `CARD_ENTRY_COPY.headline`, que é uma **constante de copy** — não passa pelo
   dicionário de interface. Quem escolheu español ou हिन्दी recebia um parágrafo
   inglês de 4 linhas no exato instante de pagar. A r3 estava listada como
   "traduzir os rótulos novos"; os rótulos NOVOS estavam traduzidos desde a r2 —
   o que não estava era o texto **maior da tela**.
2. **Ele ocupava 103px e repetia o preço da linha logo abaixo**, empurrando o
   único botão para fora da dobra: a folha media 823px numa tela de 812px.
   A pessoa tinha de ROLAR para achar o botão de comprar.

### O conserto

Título trocado por uma promessa curta, traduzida e **sem preço**:
"Kineo directs it, narrates it and edits it for you." / "Kineo la dirige, la
narra y la edita por ti." / "Kineo इसे निर्देशित करता है, आवाज़ देता है और एडिट करता है।"
Nenhum fato se perdeu — taxa, dias, créditos e mensalidade continuam na tela,
vindos de `lib/checkoutPricing`, e agora nas três línguas.

### Medido no navegador, viewport 375×812

| língua | altura da folha | precisa rolar | botão visível sem rolar |
|---|---|---|---|
| inglês | 625px | **não** | sim (base em 648 de 812) |
| हिन्दी | 630px | **não** | sim (base em 650 de 812) |

Tudo cabe: ideia, robô, promessa, preço, três linhas, botão de 48px e "Not now".
A ideia da pessoa **não é traduzida** (conteúdo de gente nunca é) — o vídeo do
robô carrega do domínio de produção, então o preview também prova que o arquivo
está no ar.

### Guardião: 34 → 36 verificações

Duas travas novas para o defeito não voltar: o `<h2>` tem de MUDAR entre as três
línguas e não pode conter `CARD_ENTRY_COPY.headline` nem `.sentence`; e não pode
conter cifrão nem dígito (o preço é papel da linha de preço, uma vez só).

### Ficou para a r4

Medir `card_entry_door_shown` de gente externa com corte por
`metadata ? 'version'`. E uma pergunta viva da r1: `topup_unavailable_note_shown`
ainda aparece no mesmo instante do bloqueio para quem cai no UpgradeModal.

### Primeira leitura dos eventos `door_v2` — 23:23 UTC (20:23 BRT)

`0` eventos. **E isso ainda não significa nada**, porque o denominador também é
zero. Medido desde o READY (`2026-09-08 23:18:19 UTC`), 5 minutos no ar:

| oportunidade | pessoas |
|---|---|
| pessoas externas com qualquer evento | 2 |
| viram a faixa da porta | 0 |
| tentaram gerar | 0 |
| **bateram na parede** (o gatilho da folha) | **0** |
| contas novas | 0 |

Zero cliques sobre zero oportunidades. A folha só monta quando alguém da coorte
aperta Generate sem crédito — não houve ninguém ainda. O corte de toda medição
seguinte é `metadata ? 'version'` (ou `= 'door_v2'`), **nunca o relógio**.

---

## r4 20:31 — A SUÍTE INTEIRA ACHOU UMA REGRESSÃO MINHA

Rodei os **458 guardiões** da casa na minha árvore e os **457** do commit pai
(`db1d00c0`) numa worktree pristina, para ter denominador dos dois lados.

| árvore | rodados | vermelhos |
|---|---|---|
| `db1d00c0` (sem a minha entrega) | 457 | **110** |
| a minha | 458 | **111** |

Os 110 são herança — a maioria são travas por diff, que ficam vermelhas quando o
commit que elas mediam entra na main. Conferido caso a caso pelo `comm`: **um
único guardião ficou vermelho por minha causa**, e ele estava certo.

### `test-telas-sem-filme-gratis-2026-09-08` — "a condição não se redigita"

Eu tinha escrito a coorte da folha assim:

```
const cardEntryCohort = CARD_ENTRY_ONLY && !hasPaid && …
```

A trava de outra pista reprova qualquer `= CARD_ENTRY_ONLY` no `GenerateClient`,
e o motivo é bom: **`freeFilmAvailable` é `OFFER.limit > 0`, o número do próprio
cobrador**. Derivar da política cria uma SEGUNDA RÉGUA, que diverge no dia em que
a casa reabrir o filme grátis — a folha continuaria aparecendo para quem tem
filme incluído, oferecendo a compra de algo que a pessoa já tem. Consertado para
`!freeFilmAvailable && …`: agora a porta se recolhe sozinha nesse dia.

Não afrouxei a trava alheia. **O que estava errado era o meu código — e também o
meu próprio guardião**, que exigia `CARD_ENTRY_ONLY` na coorte, ou seja, exigia
exatamente o que a regra da casa proíbe. Inverti: o meu check agora exige
`!freeFilmAvailable` e REPROVA `= CARD_ENTRY_ONLY`. As duas travas passaram a
puxar para o mesmo lado.

### Um ganho de tabela que veio junto, agora travado

`TopupUnavailableNote` — "recarga indisponível" — é montado DENTRO do
UpgradeModal. Em 08/09 ele apareceu **5× para 3 pessoas no mesmo instante do
bloqueio**: a casa anunciava um produto INDISPONÍVEL colado na única oferta que
queria ver aceita, no pico de intenção. Trocando a caixa pela folha, a coorte da
porta deixou de ver isso. Verificação nova prova que a nota só é montada depois
da definição do `UpgradeModal`; falsificada montando-a no caminho da folha
(mutante aplicado, guardião 🔴 "montada FORA do UpgradeModal").

Guardião: **36 → 38 verificações**, 4 mutantes falsificados no total.

### Confirmação depois do conserto — e um verde que NÃO é meu

| árvore | rodados | vermelhos | regressões minhas |
|---|---|---|---|
| `db1d00c0` (baseline) | 457 | 110 | — |
| minha, com o conserto | 458 | **109** | **nenhuma** |

O `comm` nos dois sentidos: zero guardiões vermelhos só na minha. Mas apareceu
**um vermelho do baseline que ficou verde na minha — e ele não é mérito meu**.
`test-last-setup-memory` mede por `git diff HEAD`: só passa quando existe
mudança NÃO COMMITADA em `GenerateClient.tsx`. Na minha árvore havia (o conserto
da r4); na pristina não. Determinístico nos dois lados (3 rodadas cada), e não
flakiness.

Previsão registrada e verificada: **depois de commitar, ele voltaria ao
vermelho** — e voltou. Ou seja, o número honesto é **110 lá e 110 aqui, com zero
regressão** minha. Escrever "consertei um guardião" seria mentira de placar.

**SHA da r4: o commit desta rotação (ver `git log`; o hash final é o da main após o publicador rebasear).**

---

## Correção de relógio — 20:33 BRT

Os cabeçalhos r2/r3/r4 tinham sido carimbados 21:10 / 21:40 / 22:20. **Eu
inventei esses horários** achando que a rotação tinha durado ~2h20. Não durou:
`date` (BRT) diz 20:31, e os commits confirmam — `ff4c28c5` 20:16, `713f66b1`
20:25, `b00c18c9` 20:31. A r1 começou 20:05. **As quatro rotações couberam em
26 minutos.** Cabeçalhos corrigidos pelos horários dos commits, que são fato.

Consequência prática, e é a que importa: **a noite mal começou.** O plano da
tarefa reservava 20:00→08:00 e as quatro entregas saíram antes das 20:35, então
as rotações de 22:00, 00:00, 02:00, 04:00 e 06:00 continuam abertas para MEDIR
a porta com gente de verdade — que é o que ainda falta. Não confundir "o plano
todo foi executado" com "a noite acabou": nenhuma pessoa externa viu a folha
ainda.

---

## r5 20:40 — O TETO DE ALCANCE DA FOLHA (dimensionar antes de afinar)

Com zero tráfego para medir a folha, a pergunta útil é outra: **quantas pessoas
a folha CONSEGUE alcançar, no melhor dos casos?** Coorte inteira da versão B
(`trial_status='card_required'`, contas externas, história completa — 8 pessoas):

| degrau | pessoas | % da coorte |
|---|---|---|
| coorte `card_required` | 8 | 100% |
| viram a **faixa** | 6 | **75%** |
| tentaram gerar | 4 | 50% |
| abriram a caixa de dinheiro (**gatilho da folha**) | 3 | **38%** |
| chegaram ao checkout | 2 | 25% |

**A folha tem teto de 38%. A faixa alcança 75%.** Três pessoas (38% da coorte)
são alcançáveis SÓ pela faixa — nunca apertaram nada. Duas não são alcançadas
por superfície nenhuma: entraram e sumiram sem ver nem a faixa.

### Um erro meu, corrigido antes de virar número publicado

A primeira consulta mediu o gatilho por eventos de SERVIDOR (`compose_refused`,
`free_limit_wall_shown`, `paywall_hit`) e deu **25%**. Está errado: `outOfCredits()`
barra o clique NO CLIENTE em saldo zero, então para essa coorte **a request nem
sai** e o servidor nunca registra nada. O gatilho verdadeiro da folha é
`upgrade_modal_opened` — o mesmo ponto onde ela foi plugada. Medido pelo gatilho
certo: 38%, não 25%. Um terço de alcance a mais, e a diferença era só a escolha
do predicado.

### O que isto manda fazer — e o que manda NÃO fazer

A folha era a aposta certa: ela pega quem já demonstrou intenção (tentou fazer o
filme), que é de onde saiu o único clique de checkout do dia. Mas **ela nunca vai
falar com a maioria**. A alavanca das próximas rotações não é afinar a folha —
é a **faixa**, que já alcança 75% e converteu 0. Afinar a folha antes de ela ter
UMA impressão real seria mexer no que não foi medido.

Números pequenos: 8 pessoas. Não são taxa, são contagem. Servem para escolher
onde olhar, não para provar efeito.

---

## r6 22:20 — A PORTA PERDEU A COMPARAÇÃO QUE NUNCA FEZ

### O que medi antes de tocar em código

A folha da r2 (`card_entry_door_*`) tem **zero impressões**. Não é defeito: a
coorte não aparece desde **15:27 UTC** e o deploy dela saiu às 20:31 BRT. Dez
horas sem uma única pessoa `card_required`. Afinar a folha agora seria mexer no
que não foi medido — então fui procurar o que os dados JÁ tinham para dizer.

Coorte inteira (8 pessoas, contas externas, história completa):

| pessoa | nasceu (UTC) | faixa | caixa de dinheiro | checkout |
|---|---|---|---|---|
| atoyebiolakam2010 | 05:14 | 1× /studio | — | — |
| samuelhabtub | 08:20 | 2× /studio | — | — |
| huychnuant | 10:00 | 2× | 1 | — |
| kaursimrannn20 | 10:33 | 1× | — | — |
| **samu.mikkonen** | 11:17 | 2× | 3 | **1** |
| ep5451873 | 12:04 | 4× | 1 | — |
| ad0616916 | 14:35 | — | — | — |
| **silverioortegaf301** | 19:31 | — | — | **1** |

### O ACHADO: os dois checkouts da coorte foram ao PREÇO CHEIO

Nenhum dos dois carrega `card_trial`. O cobrador não olha a coorte —
`app/api/stripe/checkout/route.ts:1010` faz `wantsTrial` depender **só** do
query param `trial=1`, e nada mais:

- `samu.mikkonen` → `tier: starter`, entrada `studio_create`;
- `silverioortegaf301` → `tier: basic`, `public_promo_first_charge_minor: **1520**`.

Traduzindo a segunda linha: uma conta cuja política de entrada diz **$1 por 7
dias** foi levada a uma primeira cobrança de **$15,20**. Ela cadastrou-se já
indo para o checkout (`destination_path: /api/stripe/checkout`, bridge de
sessão) — no instante do clique ela ainda não tinha conta, então nenhuma
superfície podia saber que nasceria `card_required` três segundos depois.

**O placar diz "0 cliques na porta". A verdade é pior e mais útil: as duas
pessoas da coorte que clicaram em comprar clicaram FORA da porta, e as duas
receberam o preço errado.** Intenção de compra existe; a porta de $1 não é o que
a captura.

### Por que a porta perdeu — e a resposta estava no próprio código da casa

A jornada de `samu.mikkonen`, evento a evento (11:17:03 → 11:18:26 UTC):
signup → autostart → `compose_refused` (`free_fast_limit`) →
`free_limit_wall_shown` → `upgrade_modal_opened` (`reason: 'credits'`) →
`upgrade_modal_trial_door_shown` → **`checkout_cta_clicked` com
`selection: 'starter'`**.

Ela viu a porta de $1 e escolheu pagar $7. Não por engano: as duas ofertas
estavam a 10 pixels uma da outra e **falavam línguas diferentes**.

| na tela | o que dizia |
|---|---|
| linhas de plano (`planUnlockLine`) | "**2 AI films** / month · 60 credits" |
| porta de $1 (`decideTrialDoorOffer`) | "80 **credits** now" |

O bloco **K17** do próprio `GenerateClient` já tinha decidido essa briga:
*"o resultado antes da unidade interna… o crédito vira detalhe, não manchete"*.
A casa aplicou isso nas linhas de plano e **esqueceu a porta**. Traduzida pela
mesma função (`videosForCredits`, custo `cinematic_ai` = 25cr/60s):

- **porta de $1 → 3 filmes por $1**
- **Starter → 2 filmes/mês por $7**

A porta entrega **50% mais filme por 1/7 do preço** — e a tela nunca disse isso.
A pessoa que procurava o degrau mais barato escolheu o que parecia o mais
barato, porque era o único que declarava o que entregava.

### O que mudou (nenhum número novo entrou na tela)

`capacityNote` nasce no núcleo compartilhado `decideTrialDoorOffer` a partir de
um `filmsNow` que **o chamador deriva** — `videosForCredits(CARD_TRIAL_GRANT_CREDITS,
'cinematic_ai')`, a mesma função das linhas de plano, sobre os créditos que o
**webhook** concede de fato (`route.ts:1359`, `isCardTrial ? CARD_TRIAL_GRANT_CREDITS`).
Nada é digitado à mão; se o custo do motor ou o grant mudarem, a frase muda
sozinha.

Duas superfícies ganharam a linha, e as duas mantêm tudo que já tinham:

- **modal de dinheiro** (`UpgradeModalTrialDoor`) — 105 aberturas / 30d, das
  quais **97 (92%)** com `reason` `credits`/`trial_*`. A capacidade vira
  manchete; o nome da oferta e a nota de preço completa continuam abaixo.
- **faixa** (`CardEntryBanner`) — a superfície de maior alcance da coorte
  (**75%**, contra 38% da caixa de dinheiro). O `headline` da política, uma
  frase de 130 caracteres que abre pelo preço, continua inteiro logo abaixo.

Fail-closed em três frentes: número não inteiro, não positivo, ou **maior que os
créditos concedidos** não vira promessa nenhuma — a porta continua exatamente
como era. É a trava que impede a vitrine de prometer o que o cobrador não honra.

### O que NÃO fiz, de propósito

- **Não reescrevi o destino do clique de ninguém.** Mandar quem escolheu Starter
  para o trial de Creator seria trocar o produto que a pessoa pediu.
- **Não toquei em `app/api/stripe/*`** (trava da rotina). O conserto do cobrador
  cego à coorte fica registrado abaixo como pendência nomeada, não executada.
- **Não mexi em `lib/admin/*`** — inclusive o pedido do Board para incluir
  `door_v2` no funil canônico (`PEDIDOS`, 08/09) cai nessa trava. Registrado e
  devolvido: não é minha pista.

### Guardião

`scripts/test-porta-fala-em-filmes-2026-09-09.mjs` — **62 verificações**, com o
núcleo puro compilado e **avaliado** (nunca importado com alias `@/`). Prova a
regra, o fail-closed nos 9 casos suspeitos, que as duas telas **derivam** em vez
de digitar (nenhum `$1`, `80 credits` ou `N AI films` literal nelas), que a copy
antiga sobreviveu **byte a byte**, e que a impressão carrega `films_now` +
`capacity_note_shown` — sem os dois, zero clique não distingue "ninguém quis" de
"nunca apareceu".

**3 mutantes falsificados**, cada um com a aplicação provada por leitura do
texto inserido (nunca por md5 — CRLF): derrubar o teto `films <= grantCredits`;
cravar `filmsNow={3}` no pai; e trocar `capacity_note_shown` por `true`.

### A suíte inteira achou 5 regressões minhas — e uma delas mudou o desenho

Baseline `5a3c051f` (árvore pristina): **110 vermelhos de 460**. A minha primeira
versão: **115**. Cinco a mais, todas minhas, todas conferidas uma a uma:

| guardião | o que acusou | veredito |
|---|---|---|
| `test-next-door-bar` (#47) | 3 linhas novas no `GenerateClient` tocando preço/upgrade | **trava certa — mudei o desenho** |
| `test-porta-1dolar-no-upgrade-modal` | âncora de uma linha quebrada | consequência da mesma mudança |
| `test-sistema-de-compra-2026-09-08` | idem | idem |
| `test-grant-copy-single-source` (C1) | `"7 days for"` sem preço na mesma linha | **falso positivo do meu comentário** |
| `test-clean-export-trial-door` | mutantes ancorados no `return` antigo | reancoragem |

**A #47 estava certa e eu estava errado.** Ela reprova QUALQUER linha nova no
`GenerateClient` que case com `price|upgrade|checkout|tier=`, para manter a
pista do Codex intocada. Eu passava `filmsNow` por prop, e isso exigia editar a
linha `<UpgradeModalTrialDoor …/>` — que contém "Upgrade" no próprio nome. Não
havia como passar a prop sem acender a trava.

O conserto não foi afrouxar nada: **a conta mudou de lugar**. Agora o modal
calcula `videosForCredits(CARD_TRIAL_GRANT_CREDITS, 'cinematic_ai')` dentro de
si mesmo — exatamente como a faixa já fazia. `GenerateClient.tsx` voltou a ter
**zero linhas alteradas**, e o desenho ficou mais coerente do que estava: as
duas superfícies fazem a mesma conta do mesmo jeito, e quem hospeda a caixa não
precisa saber dela. Meu guardião passou a exigir isso (`o pai continua sem saber
da conta`), então a prop não volta por descuido.

O C1 também não era do produto: meu comentário quebrava a linha logo depois de
`"Try Creator 7 days for` e a varredura leu um botão sem preço. Reescrevi o
comentário — a trava, que nasceu de um `$1` apagado por retrovisor de grupo em
`String.replace`, continua tão apertada quanto era.

O `test-clean-export-trial-door` citava o `return` do núcleo literalmente, e eu
somei `capacityNote` às três saídas. Reancorei as 4 ocorrências; o que a
mutação exige (mutada, a porta tem de mentir) continua idêntico — o próprio
cabeçalho daquele bloco já previa este caso.

**Resultado: 64 verificações no guardião novo, e a suíte de volta ao número do
baseline.**

### Como ler esta entrega quando a coorte voltar (corte pelo CAMPO, nunca pelo relógio)

O campo novo é o carimbo do deploy — quem recebeu o bundle novo emite
`capacity_note_shown`; quem não recebeu não tem a chave. Corte por hora inventa
defeito (memória `campo-novo-e-o-carimbo-do-deploy`).

```sql
-- pessoas distintas que VIRAM a porta em filmes, e o que fizeram depois
select e.name,
       count(*) as linhas,
       count(distinct e.user_id) as pessoas,
       count(*) filter (where (e.metadata->>'capacity_note_shown')::boolean) as com_nota,
       min(e.metadata->>'films_now') as filmes_anunciados
from events e
left join profiles p on p.id = e.user_id
where e.name in ('upgrade_modal_trial_door_shown','upgrade_modal_trial_door_clicked',
                 'card_entry_banner_shown','card_entry_banner_clicked')
  and e.metadata ? 'capacity_note_shown'
  and coalesce(p.email,'') !~* '(josephsskaf|usekineo|kineo\.local)'
group by 1 order by 1;
```

O par honesto é **impressão-com-nota → clique da MESMA superfície**, nunca
impressão de uma contra clique de outra (memória
`peca-escrita-para-muitos-vista-por-poucos`). E o denominador da coorte continua
minúsculo: **8 pessoas em toda a história**. Isto é contagem, não taxa.

### PRÓXIMA JOGADA — o degrau de maior intenção da casa converte 0%

Puxando o fio de `d95ea3a0` (a conta que nasceu indo direto ao checkout), medi a
coorte inteira desse caminho — 14 dias, contas externas, `auth_callback_completed`
com `is_new_user` e `is_checkout_destination`:

| caminho de cadastro | contas | chegaram ao checkout | pagaram |
|---|---|---|---|
| normal | 308 | 26 (**8,4%**) | **2** |
| **já indo ao checkout** | **6** | **5 (83%)** | **0** |

São pessoas que decidiram comprar **antes de ter conta**: dez vezes a taxa
normal de chegada ao checkout, e **nenhum pagamento**. As primeiras cobranças
que elas viram: **$12,00 · $23,20 · $23,20 · $23,20 · $15,20**. Nenhuma das
cinco levava `card_trial`. Quatro das seis estão hoje `downgraded` ou
`card_required`, com 0 crédito — ou seja, voltaram para dentro do produto sem
nada na mão.

A leitura: **a casa manda quem já decidiu comprar direto para a cobrança mais
cara que existe, sem passar por porta barata nenhuma.** O bridge preserva o
destino (`/api/stripe/checkout`) e o tier que a pessoa clicou lá fora, mas o
carimbo de coorte é gravado 3 segundos DEPOIS — então nem o cliente nem o
cobrador têm chance de aplicar a política de entrada.

Isto vale mais que qualquer copy da porta: são 6 pessoas de intenção máxima
contra 8 da coorte inteira do $1, e as duas populações se sobrepõem. Não é minha
pista para consertar (mora em `app/api/stripe/*` e no bridge), então foi
registrado nomeadamente em `PEDIDOS` com o predicado já conferido e o aceite
sugerido. **É a jogada de maior retorno que esta noite encontrou.**

### SHA e estado da r6

**PUBLICADO — `origin/main = 5d0a1c03`** (fila de 1, `!RODAR-AGORA` na tentativa
1). Sonda: home **200** com controle `/api/rota-que-nao-existe-porta-r6` = **404**
na mesma medição — o contraste existe, a sonda não é vácuo. `/api/health` devolve
404 porque essa rota não existe nesta casa; não é sinal de deploy ruim.

**O que NÃO consigo provar de fora, e digo em vez de fingir:** as duas peças
vivem em rota autenticada (o modal dentro do Studio, a faixa no layout do
dashboard). Não há sonda anônima que as renderize. Por isso a instrumentação
entrou no MESMO commit: `capacity_note_shown` e `films_now` chegam junto com a
mudança, e o corte de leitura é `metadata ? 'capacity_note_shown'` — quem tem a
chave recebeu o bundle novo (memória `entrega-so-de-cliente-nao-tem-sonda`).

**O que ficou aberto:**
1. A folha `door_v2` da r2 continua com **zero impressões** — a coorte não
   aparece desde 15:27 UTC. Nada a afinar sem uma pessoa real.
2. O cobrador cego à coorte (dois checkouts ao preço cheio, um de $15,20) está
   em `PEDIDOS` com predicado e aceite sugerido. **Não é minha pista.**
3. O pedido do Board para incluir `door_v2` em `lib/admin/versaoBFunnel.ts` foi
   recebido e devolvido: `lib/admin/*` é arquivo travado para esta rotina.

---

## r7 02:05 — A PORTA GANHOU. O COBRADOR NÃO ABRIU A PORTA.

Esta rotação começou para afinar copy e terminou achando por que não havia
nada a afinar.

### O primeiro clique da história da porta — e o que veio 800 ms depois

Às **02:16:43 UTC de 09/09** a `card_entry_door` (`version: door_v2`) teve a
primeira impressão com pessoa real desde que subiu. Oito segundos depois,
**02:16:51**, teve o **primeiro clique**.

A porta ganhou uma disputa difícil. A mesma pessoa, 35 segundos antes, tinha
visto o `trial_downgrade_modal` e o dispensado com `how: "stay_free"` —
"intentional": true. Recusou a oferta de plano e, ainda assim, clicou no $1.

E então:

```
02:16:51.534  checkout_cta_clicked   surface=card_entry_door  card_trial=true
02:16:52.301  checkout_failed        stage=redirect  reason=payment_session_failed
                                     tier=basic  card_trial="1"  intent_campaign=door_v2
02:16:53.239  pricing_view           source=door_v2        ← despejada em /pricing
02:16:55      welcome_offer_viewed  →  02:17:00 dismissed
02:17:01      agency_volume_bridge_viewed
02:17:03      exit_intent_shown                            ← e foi embora
```

Ela clicou para pagar um dólar, levou um erro, caiu no cardápio inteiro de
preços e saiu. **Taxa de clique da porta: 1/1. Taxa de sessão de checkout
aberta: 0/1.**

Quem é: conta de 04/09 vinda do `chatgpt.com`, agência de automação (o
primeiro filme foi um anúncio da "Ascend AI"), **2 filmes entregues, os dois
baixados**, trial de 25cr gasto até 0. É exatamente a pessoa que a Versão B foi
desenhada para converter — entregou, gostou, voltou, quis pagar.

### A coorte inteira, história completa

| evento com `card_trial` | linhas |
|---|---|
| `checkout_cta_clicked` | 1 |
| `checkout_failed` | 1 |
| **`checkout_started`** | **0** |
| **`payment_success`** | **0** |

**A taxa de entrada de $1 nunca abriu uma sessão de checkout. Nem uma vez,
desde que foi ligada.** Não é uma amostra pequena de uma conversão ruim: é um
caminho que nunca funcionou.

### A causa — falsificada, não deduzida

O evento não diz o porquê: `checkoutFailureReason()` corta a mensagem no
primeiro `":"`, então "Payment session failed: <o que a Stripe disse>" vira
`payment_session_failed` e a frase da Stripe é jogada fora. Tive de reconstruir.

O bloco do trial pago anexa o item de $1 em
`subscription_data.add_invoice_items`. Esse parâmetro **não existe** em
`Stripe.Checkout.SessionCreateParams.SubscriptionData` — ele é de Invoices e de
Subscriptions, não da criação de uma Checkout Session. Confirmado lendo os
tipos do SDK instalado (`stripe@16.12.0`): `add_invoice_items` aparece **0
vezes** em `types/Checkout/SessionsResource.d.ts`, enquanto `trial_period_days`
e `trial_settings` estão lá. A Stripe responde `Received unknown parameter`.

**Por que o `tsc` ficou verde 20 dias.** `sessionParams` É anotado como
`Stripe.Checkout.SessionCreateParams`. Mas o item entra por **spread
condicional**, e TypeScript não faz excess property check em spread. Provado
com as duas formas lado a lado, no mesmo arquivo, no mesmo compilador:

```
forma direta ....... error TS2353: 'add_invoice_items' does not exist
                     in type 'SubscriptionData'
forma por spread ... nenhum erro
```

A anotação estava certa; o caminho por onde o campo entrava é que escapava
dela. É o parente do `campo-validado-gravado-e-ecoado-nao-e-campo-honrado`:
auditar a declaração não basta, tem de se auditar a construção.

### O que ficou publicado (o que eu podia tocar)

`scripts/test-taxa-de-entrada-chega-na-stripe-2026-09-09.mjs` — 11 verificações.
Ele **não tem opinião gravada sobre a Stripe**: lê os tipos do SDK instalado e
re-deriva a verdade toda vez. Se um dia a API passar a aceitar o parâmetro e o
SDK for atualizado, ele fica verde sozinho. O que ele exige é só o contrato:
*enquanto a porta anunciar uma taxa de entrada, o parâmetro que a carrega tem
de existir no SDK que vai ser chamado.*

**Ele nasce vermelho de propósito** (10 ok · 1 falha), porque o defeito é real
e o conserto mora em `app/api/stripe/*` — caminho que esta rotina está proibida
de tocar. Vermelho = o dólar ainda não é cobrável.

### Falsificação por mutação — e uma que pegou o guardião, não o produto

| mutação | esperado | resultado |
|---|---|---|
| **M1** `add_invoice_items:` → outra chave (simula o conserto) | central fica **verde** | **11 ok · 0 falhas** ✔ |
| **M2** `CARD_TRIAL_ENTRY_FEE_MINOR` 100 → 0 | central fica verde, acende a da taxa | central verde, `a casa cobra uma taxa` **vermelha** ✔ |
| **M3** `trial=1` → `trial=0` no `entryPolicy` | acende a trava do caminho | `o caminho da porta pede o trial` **vermelha** ✔ |

O M1 é o que importa: prova que o guardião **não está preso no vermelho** — ele
segue a condição real.

E a primeira rodada do M1 **reprovou o meu próprio guardião**: eu tinha escrito
`/add_invoice_items/` solto, e o **comentário** que explica a mecânica do trial
pago também escreve o nome do parâmetro. Troquei a chave por outra e o guardião
não mudou de cor — ele estaria vermelho para sempre, inclusive depois do
conserto. Passou a exigir a **forma de chave** (`add_invoice_items\s*:`), que é
a única forma que a Stripe chega a ver. Sem a mutação, eu teria publicado um
guardião incapaz de ficar verde. (Memória `falsificar-mutacao-commitar-antes`,
segunda metade: regex solto casa com o próprio comentário.)

### O conserto está PRONTO e NÃO foi publicado

Branch **`salvo/porta-taxa-entrada-line-item`**, commit **`0f5a53e4`**: o item
de $1 sai de `subscription_data.add_invoice_items` e entra em `line_items` como
item avulso (`price_data` sem `recurring`) ao lado do recorrente — o caminho que
a Checkout Session realmente oferece; em `mode: 'subscription'` ele entra na
primeira fatura, emitida no ato, e a mensalidade continua começando ao fim dos
7 dias. `npx tsc --noEmit --incremental false` **verde**; o guardião novo passa
de 10 ok/1 falha para **11 ok/0 falhas**.

Não publiquei porque a regra da casa proíbe esta rotina de tocar
`app/api/stripe/*`, e a trava de caminho vence o argumento de intenção mesmo
quando a intenção é boa. Fica uma decisão de uma palavra para o dono do
caminho. Registrado em `PEDIDOS` com a evidência inteira.

### SHA e estado da r7

Publicado: guardião + diário + pedido. O conserto do cobrador, não — de
propósito, e dito com todas as letras em vez de "entregue".

### O que ficou aberto

1. **O dólar não é cobrável até `0f5a53e4` entrar.** Toda superfície da porta
   está correta e leva a uma parede. Afinar copy antes disso é afinar o
   letreiro de uma porta trancada.
2. A pessoa de 02:16 continua na casa, com 0 créditos e 2 filmes entregues.
   Ela quis pagar. Não é da minha pista mandar carta.
3. `checkoutFailureReason()` corta a frase da Stripe no `":"`. Foi por isso que
   esta noite precisou de um probe de tipos para descobrir algo que a Stripe já
   tinha dito por escrito às 02:16.

---

## r8 04:05 — A STRIPE JÁ TINHA EXPLICADO A FALHA. PARA O CLIENTE, NÃO PARA NÓS.

### O que mediu

Duas pessoas novas desde a r7, e a segunda muda o tamanho do problema.

**Placar da porta `door_v2`, história completa:**

| | pessoas distintas |
|---|---|
| viram a porta | **2** |
| clicaram | **1** |
| dispensaram | **1** |
| falharam na taxa de $1 | **2** |
| abriram sessão de checkout | **0** |
| pagaram o dólar | **0** |

**A pessoa nova das 06:11** (`fe5505d5`): abriu a porta em `/studio/create`
com **1.364 caracteres de roteiro escritos**, motivo `credits`, e **dispensou
em 8 segundos**. Escreveu um roteiro inteiro, bateu no muro, olhou a oferta de
$1 e saiu.

**E a das 05:37** (`35ce4512`) é a que dói: veio do **anúncio pago do Reddit**
(`utm_source=reddit`, `utm_medium=cpc`, `reddit_sep09`). Em **105 segundos**
ela tentou comprar **quatro vezes**:

```
05:36:39  checkout_attempted  signup     reddit_sep09
05:36:40  checkout_failed     card_trial="1"          ← o $1, quebrado
05:36:54  checkout_started    pricing    welcome20    ← $23,20, sessão abriu
05:37:21  checkout_cta_clicked  card_entry_banner  card_trial=true
05:37:22  checkout_failed     card_trial="1"          ← o $1 de novo, quebrado
05:37:40  checkout_started    starter10  $4,90        ← sessão abriu
05:37:50  pricing_view                                ← e parou
```

Duas conclusões que só aparecem com essa linha do tempo:

1. **A faixa (`card_entry_banner`) leva à mesma parede que a porta.** Não é um
   defeito da folha nova: são as duas superfícies da taxa de entrada caindo no
   mesmo `add_invoice_items`. A r7 mediu a porta; a faixa estava junto.
2. **O tráfego pago está sendo despejado na parede.** A campanha de $50 do
   Reddit mandou uma pessoa com intenção altíssima — quatro tentativas — e a
   única oferta que ela escolheu duas vezes foi justamente a que não funciona.

### O que estava debaixo do nariz

A rota, quando falha, devolve:

```
302 /pricing?checkout_error=<A FRASE INTEIRA DA STRIPE>
```

**A explicação foi renderizada na tela das duas pessoas.** Elas leram. Nós
não. A r7 gastou uma rotação sondando os tipos do SDK para redescobrir uma
coisa que a Stripe já tinha dito por escrito, em inglês, para os dois clientes.

O motivo é `checkoutFailureReason(msg)`, que corta no primeiro `':'` — e corta
de propósito, para que o código de motivo nunca carregue id de cliente, e-mail
ou dado de pagamento. A intenção está certa. O efeito colateral é que
"Payment session failed: `<o que a Stripe disse>`" vira `payment_session_failed`
e as **3 linhas de falha da noite são indistinguíveis entre si**.

### O que mudou (publicado)

O buraco fecha pelo lado do **cliente**, sem tocar em `app/api/stripe/*`.

**`lib/growth/checkoutErrorSignal.ts`** (novo, puro, sem imports):
- `classifyCheckoutError` olha a frase **inteira** e devolve uma classe
  estável (`unknown_parameter`, `no_such_price`, `invalid_api_key`, …). É a
  única diferença que importa em relação ao servidor: para ele, "Payment
  session failed: A" e "…: B" são o mesmo código.
- `redactCheckoutError` tira e-mail, id de objeto da Stripe, chave de API e
  corrida de 6+ dígitos **antes** de virar evento — a regra de privacidade do
  servidor não fica mais frouxa por estar do lado do cliente.
- `error_len` guarda o tamanho do **original**, então truncamento se denuncia.

**`app/pricing/PricingClient.tsx`** — a tela que já exibia a frase passa a
gravá-la:
- evento novo **`checkout_error_shown`** com `error_class`, `reason_detail`
  (redigido), `error_len`, `intent_campaign` e `from_card_entry`. Uma linha
  por sessão e por classe.
- o ramo genérico do erro era **uma linha vermelha solta** com a frase crua e
  nada mais. As duas pessoas caíram exatamente ali e foram embora. Agora é um
  card que mantém a frase do provedor na tela (ela é a única informação
  verdadeira sobre o que houve) e acrescenta o que faltava:
  **"No payment was created and your card was not charged."**
- e, para quem veio da taxa de entrada (`door_v2` ou `card_entry`), **"Your
  script is still saved in the studio"** com botão **Back to my script** →
  `/studio/create?resume=card_entry`, que restaura o rascunho e **não dispara
  render** (o auto-disparo exige crédito confirmado). O clique é medido em
  `checkout_error_recovery_clicked`.

**`scripts/test-erro-de-checkout-visivel-2026-09-09.mjs`** — 24 verificações,
**24 ok**. A biblioteca é pura, então o Node importa o `.ts` direto
(type-stripping nativo) e as 16 primeiras verificações são **execução real**,
não casamento de texto.

### Falsificação por mutação

| mutação | esperado | resultado |
|---|---|---|
| **M1** `classify` passa a olhar só o prefixo antes do `':'` (a cegueira do servidor) | a central fica vermelha | **3 vermelhas**, incluindo `A=unclassified B=unclassified` ✔ |
| **M2** remove a regra de e-mail da redação | acende a de privacidade | `a redação remove e-mail` **vermelha**, mostrando `buyer@example.com` cru ✔ |
| **M3** troca "No payment was created…" por "Something went wrong." | acende a da tela | `quem falhou lê que não foi cobrado` **vermelha** ✔ |

O M1 é o que prova o guardião: ele não passa por texto presente, passa pela
**diferença de comportamento** entre olhar a frase inteira e olhar o prefixo.
Cada mutação foi confirmada como aplicada por `grep` do texto inserido antes
de rodar (nunca por hash — CRLF).

### Suíte

`npx tsc --noEmit --incremental false` verde. Todos os guardiões pedidos verdes:
`test-porta-v2`, `test-versao-b-entrada-1-dolar`, `test-sistema-de-compra`,
`test-funil-volta-1-dolar`, `test-continue-now`, `test-placar-trial-1-dolar`,
`test-preco-v7`, `test-troca-de-plano`.

`test-taxa-de-entrada-chega-na-stripe` continua **vermelho de propósito**
(10 ok · 1 falha) — o dólar segue não-cobrável enquanto `0f5a53e4` não entrar.

### O que ficou

1. **O conserto do cobrador continua parado**, e agora com preço medido: cada
   hora que ele espera é tráfego pago do Reddit batendo numa parede. Branch
   `salvo/porta-taxa-entrada-line-item`, commit **`0f5a53e4`** — verifiquei
   nesta rotação que **ainda aplica limpo sobre a `origin/main` de agora**
   (`git cherry-pick --no-commit 0f5a53e4` → só `app/api/stripe/checkout/route.ts`).
   Não publiquei: `app/api/stripe/*` é caminho travado para esta rotina, e a
   trava vence o argumento de intenção mesmo quando a intenção é boa.
2. **A faixa `card_entry_banner` falha igual à porta.** Quem for medir a
   Versão B tem de contar as duas superfícies, não só `door_v2`.
3. A partir da próxima falha, a pergunta "por que o checkout quebrou?" se
   responde com uma consulta:
   `select metadata->>'error_class', metadata->>'reason_detail' from events where name='checkout_error_shown'`.
   Antes desta rotação, respondia-se sondando tipos de SDK.

### Adendo da r8 — a suíte inteira, e o que ela denunciou

Rodei os **467** guardiões de `scripts/`. **48 vermelhos**, todos herdados.
Provei que nenhum é meu do jeito certo: dos 48, **um único** lê o arquivo que
eu mudei (`test-checkout-currency-truth`), e ele falha **exatamente igual** com
a minha versão e com a do pai `a60865e1`:

```
MINHA versao:  exit=1 | AssertionError: the same visible answer still promises the free first video
versao do PAI: exit=1 | AssertionError: the same visible answer still promises the free first video
```

**Mas o que ele está dizendo importa para esta pista.** A `/pricing` ainda
promete "free first video" numa resposta do FAQ — enquanto a porta cobra $1 e
`CARD_ENTRY_COPY.noFreeTier` afirma que não existe camada grátis.

E não é um caso isolado: a rotina PH registrou, no `PEDIDOS`, que o `/studio`
deslogado mostra **"🔥 Get Started Free →"** logo abaixo do card que anuncia a
taxa de entrada. **Duas telas diferentes, o mesmo defeito**, achadas por duas
rotinas que não conversaram.

Isto é uma hipótese melhor para o clique baixo da porta do que qualquer ajuste
de copy dentro dela: **ninguém paga $1 por aquilo que a página do lado oferece
de graça.** A pessoa das 06:11, que escreveu 1.364 caracteres e dispensou a
porta em 8 segundos, é exatamente quem teria visto a contradição.

**Jogada da r9 (06:00):** varrer a promessa de grátis em TODA superfície
pública — FAQ da `/pricing`, `/studio` deslogado, home — e medir quantas
pessoas que viram a porta também viram uma promessa de grátis na mesma sessão.
Corrigir a contradição é trabalho de copy fora da fonte de preço, portanto
dentro desta pista; mudar preço, plano ou crédito continua fora.

---

## r9 07:35 — O ANÚNCIO DIZ "GRÁTIS", A PORTA COBRA $1. ELES FICAM NA MESMA CAIXA.

A rotação das 06:00 não disparou (o agendador tinha sido recriado às 01:20 e a
grade não pegou as duas últimas). Esta rodou às 07:35 e executa a jogada que a
r8 tinha deixado escrita: **varrer a promessa de grátis nas superfícies
públicas.**

### O que mediu — e o que NÃO consegui medir

O banco recusou toda consulta desta rotação:

```
mcp execute_sql → "You do not have permission to perform this action"   (2 tentativas)
```

É a intermitência conhecida do MCP em sessão autônoma. **Portanto esta seção
não tem número novo.** O último placar medido continua sendo o da r8 (04:05),
e está repetido no FECHAMENTO abaixo marcado com a hora em que foi medido.
Não inventei leitura nova nem reaproveitei a da r8 como se fosse de agora.

### O que a varredura achou

A r8 tinha duas denúncias vindas de rotinas que não conversaram: o FAQ da
`/pricing`/home prometendo "free first video", e o `/studio` deslogado com um
botão "Get Started Free". Fui conferir as duas **antes** de codar.

**A primeira já estava consertada.** O FAQ visível da home (`KineoLanding.tsx`
:1574) hoje termina com *"Every new account starts with the $1 trial: 7 days of
Creator with 80 credits."* Outra pista corrigiu. O que sobrou é um **guardião
velho** — `test-checkout-currency-truth.mjs` — que continua exigindo a frase
antiga:

```js
ok(/New accounts get free credits/.test(faq), 'the same visible answer still promises the free first video')
```

Ele está vermelho **porque o produto andou e a trava não**. Isso é a inversão
perigosa: uma trava que, lida de fora, manda alguém **reintroduzir** a promessa
que a Versão B matou. Não mexi nela — trava alheia, e desarmar guardião no
apagar das luzes é como se enterra regressão. Fica anotada no `PEDIDOS`.

**A segunda é real e estava viva.** `components/Sidebar.tsx`, a caixa que a
pessoa **deslogada** vê:

| linha | de onde vinha | o que dizia sob a porta |
|---|---|---|
| título | `<FreeTierCopy>` → swap | `$1 for 7 days — 80 credits, then $29/mo` |
| **botão** | **literal cru no JSX** | **`⚡ Get Started Free →`** |
| aria-label | literal cru | `Get started free — sign up` |

Duas frases contraditórias **dentro da mesma caixa, uma embaixo da outra**. A
de cima passou pelo swap quando a Versão B subiu; a de baixo nunca passou por
lugar nenhum. E a de baixo é a que tem maior taxa de leitura da caixa: é o
botão.

**Por que isto importa para esta pista, e não é polimento.** A campanha paga do
Reddit chega **deslogada**. O caminho medido na r8 — a pessoa das 05:37,
`utm_source=reddit`, quatro tentativas de compra em 105 segundos — passa por
esta caixa antes de ver qualquer porta. Ela lê "Get Started Free", cria a
conta, e a primeira coisa que a casa faz é pedir $1. Não é uma copy velha
esquecida: é **a promessa que o anúncio pago está comprando**, contradita pelo
produto 30 segundos depois.

É também a melhor hipótese disponível para o clique baixo da porta, e é mais
barata de testar do que qualquer ajuste dentro da folha: ninguém paga $1 pelo
que a tela anterior ofereceu de graça.

### O que mudou (publicado)

`components/Sidebar.tsx` — o rótulo do botão deixa de ser literal e passa a
sair da **fonte única**:

```tsx
const freeTierOffer = useFreeTierOffer()
const signupCtaLabel = freeTierOffer.cardEntry
  ? freeTierOffer.copy.ctaPrimary      // = CARD_ENTRY_COPY.ctaLong
  : 'Get Started Free →'               // versão A, byte a byte
```

Sob a porta ligada o botão passa a dizer **"Try Creator 7 days for $1 →"**, que
é o `ctaLong` de `lib/entryPolicy.ts` — nenhum preço digitado aqui. O
`aria-label` passa a derivar do mesmo rótulo (o leitor de tela lia a promessa
velha mesmo depois de o olho parar de ler). Com `CARD_ENTRY_ONLY` desligado o
literal legado volta byte a byte, que é a disciplina que o próprio
`freeTierOffer.ts` prega: o legado mora no call site para a versão A ser
auditável por inspeção local.

**Por que não usei `swapFreeTierCopy` aqui**, que seria o reflexo óbvio: o ramo
`cardEntry` daquele helper devolve `chip` ou `sentence` conforme o tamanho —
nunca um CTA. Um botão receberia *"$1 for 7 days — 80 credits, then $29/mo"*,
que é um chip de preço, não um convite. É exatamente a "varredura fina de cada
call site" que o comentário do M7 deixou pendente naquele arquivo.

`scripts/test-cadastro-nao-promete-gratis-2026-09-09.mjs` — 13 verificações,
**13 ok**. A trava é de comportamento, não de texto: recorta o JSX do botão
(não o arquivo inteiro, senão o literal legado da linha de decisão a satisfaria
sozinho) e exige que o rótulo venha da variável; exige que a decisão leia
`offer.cardEntry` em vez de redigitar a flag (memória
`predicado-do-cobrador-nao-se-redigita`); e lê o `ctaLong` da fonte para provar
que **o CTA da porta não contém a palavra "free"** — se alguém amaciar a copy
da entrada lá na fonte, acende aqui.

### Falsificação por mutação

| mutação | esperado | resultado |
|---|---|---|
| **M1** botão volta ao literal `Get Started Free →` | acende a do rótulo | `o rotulo do botao nao e mais o literal "Get Started Free"` **vermelha** ✔ |
| **M2** decisão redigita a flag (`true ? 'Try 7 days for $1'`) | acende a do predicado | `a decisao le offer.cardEntry, nao uma flag propria` **vermelha** ✔ |
| **M3** `ctaLong` da fonte passa a dizer "Start free for 7 days" | acende a da fonte | `o CTA da porta nao contem a palavra "free": Start free for 7 days →` **vermelha** ✔ |

Cada mutante foi confirmado como **aplicado por `grep` do texto inserido** antes
de rodar, nunca por hash (memória `mutacao-precisa-provar-que-aplicou`). O M2 é
o que prova que a trava não passa por texto presente: o arquivo continua tendo
um rótulo de $1: o que muda é **de onde ele vem**.

### Suíte

`npx tsc --noEmit --incremental false` **verde** (exit 0, com junção de
`node_modules`). Os 8 guardiões pedidos, mais os desta pista: **todos verdes**.

Rodei também **todos os guardiões que leem os arquivos que toquei** (`Sidebar
.tsx`, `entryPolicy.ts`) — 17 deles. Quatro vermelhos, e provei que **nenhum é
meu** rodando os três candidatos numa worktree pristina em `origin/main`
(`main-pristine`, f50da38c): `ph-galeria`, `test-manrope-system` e
`test-workspace-spanish` falham **igual** no pai. O quarto,
`test-taxa-de-entrada-chega-na-stripe`, segue vermelho **de propósito** desde a
r7 — o dólar continua não-cobrável.

### O que ficou

1. **O conserto do cobrador continua parado.** Confirmei nesta rotação que
   `add_invoice_items` ainda está em `app/api/stripe/checkout/route.ts:1545` na
   `origin/main` de agora. Branch `salvo/porta-taxa-entrada-line-item`, commit
   **`0f5a53e4`**. Terceira rotação seguida pedindo uma palavra.
2. `test-checkout-currency-truth.mjs` exige a promessa de grátis que a Versão B
   matou. Trava alheia, invertida pelo tempo.
3. Sem banco nesta rotação: o efeito desta mudança na taxa de clique da porta
   só se mede na próxima leitura.

---

## FECHAMENTO 09/09 08:00

**Esta seção substitui o rascunho escrito às 07:40.** Aquele rascunho dizia,
honestamente, que não tinha leitura de banco e que todo número era o da r8
(04:05). Nesta rotação o MCP respondeu, e a leitura das 08:05 **muda o placar
e confirma a tese**: entre 04:05 e 08:05 chegaram mais duas pessoas na porta,
e a taxa de clique subiu de 1/1 para **3 de 4 pessoas**. O que continua zerado
é o outro lado.

### O que está no ar (SHAs)

| rotação | o que entregou | SHA |
|---|---|---|
| r1–r6 | a folha `CardEntryDoor` (`door_v2`), 3 línguas, celular, e a tela que parou de mandar a pessoa bater numa porta trancada | ff4c28c5 · 713f66b1 · b00c18c9 · 5d0a1c03 · 08641311 |
| r7 | guardião que prova, contra os tipos do SDK instalado, que a taxa de entrada chega na Stripe — nasce **vermelho de propósito** | cb039303 |
| r8 | `lib/growth/checkoutErrorSignal.ts` + `checkout_error_shown`: a frase da Stripe passa a ser gravada (redigida); quem falha lê "your card was not charged" e volta ao rascunho | e69fed0f |
| r9 | a caixa de cadastro deslogada para de prometer "Get Started Free" ao lado da porta de $1 | 139341e4 · sonda 113353d4 |
| r10 (esta) | nenhum código: a janela fecha medindo. O diário passa a ter o número real | este commit |

**Não está no ar, e é o que decide tudo:** `0f5a53e4`, na branch
`salvo/porta-taxa-entrada-line-item` — conferido nesta rotação com
`git merge-base --is-ancestor`: **não é ancestral da `origin/main`**.
`app/api/stripe/*` é caminho travado para esta rotina, e a trava foi
respeitada; o commit está pronto e segurado, esperando uma palavra.

### Tabela por pessoa — todas as 4, medida às 08:05 (corte `metadata->>'version'='door_v2'`)

| pessoa | chegou | viu porta | clicou | quanto demorou | checkout abriu | pagou |
|---|---|---|---|---|---|---|
| `da3d9795` | 02:16 UTC, conta de 04/09, 2 filmes entregues e baixados | **sim** | **sim** | 8 s | **não** (`checkout_failed`) | não |
| `fe5505d5` | 06:11 UTC, `/studio/create`, 1.364 caracteres de roteiro escritos | **sim** | não (dispensou) | — | — | não |
| `44d90dda` | **08:52 UTC — conta nascida na porta** (`auth_callback_completed` → `card_entry_required`) | **sim** | **sim** | 24 s | **não**, 7 vezes | não |
| `bea677fa` | 10:24 UTC | **sim** | **sim** | 57 s | **não**, 2 vezes | não |

Fora da folha, a faixa antiga (`card_entry_banner`) no mesmo dia: 4 pessoas
viram, 2 clicaram. Cai na **mesma** parede — é a mesma taxa de entrada.

### O número que fecha a noite

**Taxa de entrada de $1, história inteira: 9 tentativas · 9 falhas · 0 sessões
de checkout abertas · 0 pagamentos.** Não há uma exceção. E, no mesmo recorte,
a casa está com **0 `payment_success` em 48 horas**.

A pessoa `44d90dda` é o caso que não deixa dúvida. Criou a conta às 08:52 e,
em **90 segundos**, apertou a oferta de $1 **sete vezes**, em três superfícies
diferentes — `/studio`, `/studio/create` e `/dashboard`. Cada uma respondeu
`checkout_failed / payment_session_failed` em menos de 500 ms e a despejou em
`/pricing`. Ela voltou e tentou de novo, e de novo. É a maior intenção de
compra registrada na casa esta semana, e a casa recusou o dinheiro sete vezes.

### Três frases do que aprendi

1. **A porta ganhou e a pergunta da missão está respondida.** A meta era
   "clicam / veem": deu **3 de 4**. Copy, ordem, tamanho e língua não são mais
   hipóteses vivas — não há o que afinar numa folha que 75% das pessoas
   apertam. Toda rotação gasta em texto a partir daqui é rotação gasta no lado
   que já funciona.
2. **A parede não é gradual, é total, e por isso é barata de consertar.** 9 de
   9 não é uma taxa de conversão ruim: é um defeito determinístico
   (`subscription_data.add_invoice_items` não existe na criação de uma Checkout
   Session). O `tsc` ficou verde 20 dias porque o campo entrava por **spread
   condicional**, que não recebe excess property check — objeto anotado não é
   objeto validado.
3. **A instrumentação da r8 provou-se no escuro.** `checkout_error_shown`
   disparou para 2 pessoas reais nesta madrugada: a frase da Stripe agora é
   nossa, e a pessoa lê "your card was not charged" em vez de sumir. Foi o que
   permitiu contar 7 falhas de uma pessoa só em vez de três linhas
   indistinguíveis.

### A próxima jogada

**Publicar `0f5a53e4` é a jogada inteira — e ela vale mais hoje do que ontem,
porque agora existe fila.** Quatro pessoas em 8 horas nasceram diante da porta
com o dedo no botão; três apertaram. Enquanto o commit não sobe, cada
impressão da oferta de $1 — porta, faixa e o botão de cadastro que a r9
corrigiu — é um anúncio de porta trancada, e **a campanha do Reddit está
comprando cliques para ela**.

No mesmo dia do SHA, escrever para as quatro. Não é uma carta de marketing, é
uma correção de erro nosso, e o texto já está pronto na cabeça: *"o pagamento
quebrou do nosso lado, você não foi cobrado, está consertado, seu roteiro está
salvo."* A coorte é minúscula e quentíssima — a de 02:16 tinha 2 filmes
baixados, a de 06:11 tinha 1.364 caracteres escritos, a de 08:52 tentou sete
vezes. São quatro pessoas que **a casa fez falhar**, e é a maior taxa de
conversão disponível hoje sem gastar um dólar de mídia. Enviar e-mail está
fora desta pista; o gatilho da carta é o SHA.
