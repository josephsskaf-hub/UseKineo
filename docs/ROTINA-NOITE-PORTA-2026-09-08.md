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
