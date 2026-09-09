# Sprint ChatGPT → dólar — 09/09/2026 (13:00 → 10/09 03:30 BRT)

Missão: o caminho ChatGPT → cadastro → filme → porta de $1 → pagamento, sem um
degrau quebrado, medido POR PESSOA. Território: `app/api/gpt*`, `lib/gpt*`,
`lib/growth/instructionPasteNotice.ts`, `gpt_handoffs` (leitura), a chegada do
handoff em `studio/` e `generate/`, e a porta de $1 vista por quem vem do ChatGPT.

---

## r1 (executada 13:37–13:50 BRT — janela planejada 13:30) — RETRATO POR PESSOA

Base: `origin/main = 606bda28`, worktree `C:/kineo-wt/sprint-chatgpt`.
Corte da Versão B: **08/09 05:00 UTC**. Leitura feita às **16:37 UTC** (13:37 BRT).

### 1. A coorte da Versão B é de 15 pessoas — não das ~98 do briefing

O briefing da sprint fala em "98 cadastros com utm_source=chatgpt desde 02/09".
Verdade, mas esse número é do regime ANTIGO. Sob a Versão B a casa inteira
recebeu **15 cadastros**, dos quais **6 do ChatGPT**.

| Degrau (15 pessoas da Versão B) | Pessoas |
| --- | --- |
| cadastraram | **15** |
| nasceram `card_entry_required`, 0 créditos | **15 de 15 (100%)** |
| viram a faixa da porta (`card_entry_banner_shown`) | 11 |
| despacharam uma geração | 4 |
| **tiveram o filme MONTADO e depois recusado** | **3** |
| viram a porta cheia (`card_entry_door_shown`) | 4 |
| dispensaram a porta | 3 |
| `checkout_started` | 5 |
| **pagaram** | **0** |
| **têm ao menos um filme** | **0 de 15** |

`trial_status` das 15: `card_required` em **todas**. `video_credits`: **0 em
todas**. `has_paid`: **false em todas**. Nenhuma exceção.

Coorte ChatGPT inteira (383 perfis históricos), desde a Versão B: 8 viram a
porta · 5 clicaram · 4 falharam no cobrador · **0 pagaram**.

**A casa está sem um único `payment_success` desde 02/09 20:22 UTC** — 7 dias.
Zero pagamentos na Versão B inteira, de qualquer origem.

### 2. O degrau que mais seca: a casa MONTA o filme e só então recusa

História completa de `sovannara.nay` (ChatGPT, KH, cadastro hoje 13:58:49 UTC),
lida evento a evento. É o padrão, não a exceção:

```
13:58:50  auth_callback_completed   destino /studio/create, com prompt
13:58:51  card_entry_required       grant_credits: 0
13:59:02  activation_autostart_eligible     ← a casa DECIDE que ela pode gerar
13:59:23  activation_autostart_dispatched   ← e dispara sozinha
13:59:36  generation_dispatch_received      engine fast, prompt de 876 chars
14:00:00  fast_compose_recoverable          ← 13 CLIPES prontos, roteiro escrito
14:00:00  free_duration_clamped             35s → 15s
14:00:01  compose_refused  { used: 1, limit: 0 }   ← 402: o limite é ZERO
14:00:03  card_entry_door_shown             a porta de $1 aparece
14:00:06  card_entry_door_dismissed         ela fecha em 3 segundos
14:00:12  chatgpt_quickstart_selected       tenta de novo: roteiro pronto, 976 chars
14:15:36  compose_refused  { limit: 0 }     tentativa 2 — mesma parede
14:30:56  compose_refused  { limit: 0 }     tentativa 3 — mesma parede
```

**O defeito:** na Versão B `FREE_OFFER.limit` é **0**, mas o autostart continua
julgando a pessoa elegível e disparando. O servidor escreve o roteiro, busca 13
clipes no Pixabay e monta o trabalho — **e só depois** consulta a cota, que é
zero por construção. `used: 1, limit: 0`: o "1" é a reserva da própria pessoa.
A primeira tentativa da vida dela já nasce recusada.

Duas consequências, ambas caras:
1. **Custo real jogado fora** (chamada de roteiro + busca de clipes) por pessoa
   que nunca teve permissão de gerar — 3 vezes por pessoa, em média (12 recusas
   para 3 pessoas).
2. **A porta de $1 chega como interrupção, não como oferta.** A pessoa vê a
   barra andar até `clips_ready` e leva uma parede. Das 4 que viram a porta,
   **3 dispensaram** — a de hoje em 3 segundos.

Medição: 3 de 3 pessoas que chegaram a `fast_compose_recoverable` na Versão B
foram recusadas com `limit:0`. 12 recusas, 0 filmes.

### 3. A porta de $1 esteve quebrada até 14:58 UTC de HOJE

Confirmado independentemente desta sprint (rotina PORTA, PEDIDOS 09/09 02:50):
`add_invoice_items` não existe em `Checkout.SessionCreateParams.SubscriptionData`.
Conserto `040af511`, deploy `dpl_CKMQWXnwMcLhVLN4WdhdhVPub4KR`, **READY**.

O que isso significa para toda leitura anterior: **nenhuma medição de copy da
porta antes de 14:58 UTC de 09/09 vale** — os cliques morriam no cobrador.

Prova do tamanho do dano, uma pessoa só — `dinotinyyoutube` (ChatGPT, UA):
entre **08:53 e 09:04 UTC (11 minutos) ela apertou a porta 25 vezes**, em três
campanhas (`card_entry`, `trial_1usd`, `door_v2`). **25 `checkout_failed`.**
Quem insiste 25 vezes queria comprar. Ela não desistiu da oferta; foi expulsa
pelo cobrador.

Depois do conserto houve **1** `checkout_started` sem falha (15:09:04 UTC) — e é
do próprio fundador testando (`e92d81bf`). **Nenhum cliente tocou a porta
consertada ainda.** Não há tráfego na coorte desde 14:31 UTC.

### 4. `gpt_handoffs` está morto desde 07/09 de manhã

A tabela inteira tem **16 linhas**, todas entre **07/09 00:15 e 06:30 UTC**.
Depois disso: zero. Nenhuma tem `user_id` (0 de 16); 2 foram clicadas.

Ou seja: **o degrau "handoff recebido" do funil desta sprint não existe hoje.**
As 6 pessoas do ChatGPT da Versão B chegaram por link `utm_source=chatgpt`, não
por handoff. Quem constrói em cima de `gpt_handoffs` constrói sobre plateia zero
— o remédio da r2 tem de morar no caminho que a gente MEDIU vivo (a chegada em
`/studio/create` com prompt + o quickstart do ChatGPT), não no handoff.

### 5. ⚠ Fora do meu território: o cadastro caiu 3× com a Versão B

Mesma janela de relógio (00:00 → 16:37 UTC) em cada dia, para não comparar dia
cheio com dia parcial:

| dia | cadastros até 16:37 UTC | do ChatGPT |
| --- | --- | --- |
| 03/09 | 26 | 3 |
| 04/09 | 28 | 15 |
| 05/09 | 18 | 11 |
| 06/09 | 22 | 14 |
| 07/09 | 22 | 12 |
| **08/09** (Versão B às 05:00) | **8** | 4 |
| **09/09** | **7** | 3 |

Queda de ~22/dia para 7-8/dia, sustentada por dois dias. Isso é maior que
qualquer degrau interno: a Versão B pode estar convertendo melhor por pessoa e
ainda assim entregar menos dinheiro, porque entram 3× menos pessoas. **Não é
meu caminho** (`/signup`, `/ph` são da sprint irmã) — vai como PEDIDO.

### 6. Baseline da suíte (worktree limpa em 606bda28)

**111 vermelhos de 471** arquivos `scripts/test-*.mjs`. Lista em
`.scratchpad/baseline-r1.txt` da sessão. Qualquer entrega desta sprint compara
contra 111 e não pode acrescentar nenhum.

Três vermelhos ficam DENTRO do meu território e são candidatos de conserto:

| guardião | verificação vermelha |
| --- | --- |
| `test-gpt-handoff.mjs` | (B5) grava `sha256(salt\|ip)`, **nunca IP cru** |
| `test-gpt-handoff.mjs` | (C2) etiqueta de robô (sem UA = robô) |
| `test-chatgpt-paste-page.mjs` | (E7) nenhum crédito/preço digitado na página |

O (E7) importa agora: preço cravado na página de colar do ChatGPT vira mentira
com os planos V7 ($14/$29/$59). O (B5) é privacidade — IP cru no banco.

### O que fica para a r2

Consertar o degrau do item 2 — a casa não pode montar um filme para recusá-lo
em seguida. Duas metades, nesta ordem:
1. **Não gastar trabalho que a cota proíbe:** a decisão de cota tem de vir ANTES
   do despacho, não depois de `clips_ready`.
2. **A porta tem de nascer da coisa que a pessoa acabou de pedir**, com o tema
   dela em cima — não como interrupção genérica de um trabalho perdido.

E medir o (E7): preço cravado na página do ChatGPT.

**Números desta rotação:** 15 pessoas · 0 filmes · 0 pagamentos · 12 recusas com
`limit:0` para 3 pessoas · 25 falhas de checkout numa pessoa só · baseline 111.

---

## r2 (executada 13:50–14:01 BRT — adiantada; janela planejada 15:30) — A PORTA PARA DE PROMETER O QUE JÁ ESTÁ FEITO

### O defeito, na frase mais curta que dá

A folha de $1 dizia **"Your film, waiting to be made"** para quem já tinha
**13 clipes rodados e o roteiro escrito**.

Não é copy fraca: é falso. Na Versão B a casa escreve o roteiro, busca os
clipes, monta o material — e só então consulta a cota, que é `limit: 0`. Quando
a porta abre, o trabalho **já existe** e está preso atrás dela. A folha vendia
uma promessa quando podia estar vendendo uma coisa pronta.

Isso explica o gesto que mais dói no retrato da r1: das 4 pessoas que viram a
porta, **3 dispensaram** — a de hoje **em 3 segundos**. Uma folha que promete
"vamos fazer seu filme" logo depois de uma barra de progresso que morreu lê-se
como aviso de erro, não como oferta.

### O que mudou

`components/CardEntryDoor.tsx` ganhou a prop `readyClips`, e
`GenerateClient.tsx` liga nela o estado `clipUrls` — os clipes que a casa
acabou de rodar para **este** filme. Quando existem (e só então):

| | antes | agora |
| --- | --- | --- |
| rótulo | "Your film, waiting to be made" | **"Your film is already shot"** |
| promessa | "Kineo directs it, narrates it and edits it for you." | **"Kineo already wrote it and shot it. One step left: the final render."** |
| primeiro benefício | *(não existia)* | **"Script written and 13 clips already shot for this film"** |
| vídeo | robô da casa | **o primeiro clipe DELA** |

Sem clipes, a folha continua byte a byte a de antes — o ramo antigo é o padrão,
e o guardião prova isso renderizando os dois.

Três cuidados que valem registrar:

1. **O texto não depende do preview.** Se a URL do fornecedor expirar, o
   `<video>` cai para o vídeo da casa (`onError` → `clipPreviewFailed`), mas a
   frase continua verdadeira: os clipes existem no servidor mesmo quando o
   navegador não os toca. Um enfeite quebrado não pode transformar um fato em
   mentira nem deixar um quadro preto na tela da decisão.
2. **Só URL `http(s)` conta.** `blob:` e `data:` de uma tentativa morta não são
   clipe rodado — e esse número vira texto na cara da pessoa.
3. **A folha não promete o filme PRONTO.** "Already shot" é verdade; "your film
   is ready" seria mentira, porque o render final é justamente o que os 80
   créditos vão pagar. O guardião trava essa fronteira.

Nenhum número de preço foi digitado: taxa, dias, créditos e mensalidade
continuam saindo de `lib/checkoutPricing`. O guardião irmão
`test-porta-v2-2026-09-09.mjs` (38 verificações, inclusive a trava de preço nas
três línguas) **continua verde** com a mudança.

### Medição que isto habilita

`card_entry_door_shown`, `_clicked` e `_dismissed` passam a carregar
`ready_clips` (contagem) e `film_already_shot` (booleano). Sem esses dois campos
as duas folhas chegariam idênticas ao banco e nenhuma leitura posterior
conseguiria separá-las — o erro que a memória da casa chama de "superfície
medida por cópia da regra". A partir do próximo deploy dá para comparar
**dispensa** e **clique** nos dois ramos, com denominador por pessoa.

### Prova

- `npx tsc --noEmit --incremental false` **verde**.
- Guardião novo `scripts/test-porta-filme-ja-feito-2026-09-09.mjs`:
  **16 verificações**, incluindo render real da folha nos dois ramos, contagem
  com singular/plural, URL inválida e as três línguas.
- **Falsificado por 3 mutações reais**, cada uma com `git diff` provando que o
  mutante aplicou:

| mutante | o que ele simula | resultado |
| --- | --- | --- |
| M1 — apaga `readyClips={clipUrls}` do call site | alguém "limpa" a prop e a folha nunca sabe do filme | 16 → **1** verde, acusa "a porta é montada SEM readyClips" |
| M2 — troca `filmIsShot ? A : B` por `A` | o rótulo afirma "já rodado" para todo mundo | 16 → **4** verdes, acusa "o rótulo não é guardado por filmIsShot" |
| M3 — filtro aceita qualquer string | `blob:`/`data:` viram "clipe rodado" | 16 → **3** verdes, acusa o filtro |

O M2 é o que importa: um mutante que remove a condição mantém **todas as
strings presentes no arquivo**. Guardião que contasse texto ficaria verde.

### O que fica

A porta consertada só vale quando alguém a vir. Não há tráfego na coorte desde
14:31 UTC, e o cobrador só ficou de pé às ~14:58 UTC — ou seja, **nenhum cliente
viu ainda a porta funcionando, nem esta versão dela**. A r3/r4 mede com corte no
campo novo (`film_already_shot`), nunca por relógio.

### Publicação confirmada

`87926146` → deploy `dpl_BkT1hwWcCtoa31z8ikVXYSq5AaDP`, **READY**, alias
`www.usekineo.com`. Sonda da home: HTTP 200.

**Estado da plateia no momento da publicação (14:01 BRT / 17:01 UTC):** desde o
conserto do cobrador (~14:58 UTC) a casa teve 121 eventos de 28 pessoas e
**zero** eventos de porta, **zero** `checkout_failed` e **zero** pagamentos.
Ninguém bateu na porta ainda — nem na versão velha consertada, nem nesta. A
próxima rotação mede com corte no campo novo `film_already_shot`, nunca por
relógio: enquanto esse campo não aparecer no banco, nenhuma pessoa recebeu o
bundle novo e qualquer taxa calculada é sobre plateia zero.

---

## r3 (executada 15:37–16:05 BRT — janela planejada 17:30, adiantada) — A CAIXA IRMÃ, QUE ABRE NO MESMO SEGUNDO E NÃO SABIA DO FILME

### 1. O retrato mudou de forma: a porta que a r2 consertou é a MENOR das três

A r2 consertou `CardEntryDoor`. Medido hoje às 15:40 BRT, coorte da Versão B
(cadastro ≥ 08/09 05:00 UTC), contando PESSOAS:

| superfície que pede o $1 | pessoas | do ChatGPT |
| --- | --- | --- |
| `card_entry_banner_shown` (a faixa) | **11** | 6 |
| `upgrade_modal_opened` (o modal) | **7** | 5 |
| `upgrade_modal_trial_door_shown` (a caixa DENTRO do modal) | 3 | 2 |
| `card_entry_door_shown` (a porta cheia — **a que a r2 tocou**) | 4 | 3 |

Primeiro instinto: "7 abriram o modal e só 3 viram a porta lá dentro — degrau
morto". **Falso, e vale registrar para ninguém repetir.** Cruzando por pessoa,
`upgrade_modal_trial_door_shown` e `card_entry_door_shown` são **mutuamente
exclusivas**: das 7, as que têm uma têm ZERO da outra, sem exceção.

| pessoa | origem | porta no modal | porta cheia |
| --- | --- | --- | --- |
| samu.mikkonen | chatgpt | 3 | 0 |
| ep5451873 | chatgpt | 1 | 0 |
| huychnuant… | seo | 1 | 0 |
| dinotinyyoutube | chatgpt | 0 | 6 |
| sovannara.nay | chatgpt | 0 | 1 |
| mtsalvo3104 | chatgpt | 0 | 1 |
| raulvon291 | — | 0 | 1 |

São dois caminhos alternativos para o mesmo pedido de $1, não um funil com
degrau seco. **Consequência direta:** a r2 melhorou a folha de 4 pessoas e
deixou a outra metade da coorte com a folha antiga.

### 2. O defeito: um comentário que envelheceu e virou mentira

`components/UpgradeModalTrialDoor.tsx` passava `unlocksCurrentFilm: false` com
esta justificativa escrita no código:

> "O modal não tem um filme em foco para destravar: ele abre ANTES do render,
> quando o saldo não cobre o pedido."

Era verdade na Versão A. Virou falso em 08/09. Prova, `samu.mikkonen`
(ChatGPT, 08/09 UTC), evento a evento:

```
11:17:59  fast_compose_recoverable   { clips: 15 }   <- roteiro escrito, 15 clipes rodados
11:18:00  compose_refused            { used: 1, limit: 0 }
11:18:00  upgrade_modal_opened       <- MESMO SEGUNDO
11:18:00  upgrade_modal_trial_door_shown
```

Na Versão B a cota é zero por construção, então a casa roda o filme inteiro
**antes** de consultar a cota. Quando a caixa abre, o trabalho já existe e está
preso atrás dela — e a caixa só falava do que a pessoa *ganharia*.

O resto da jornada dela explica por que isso custa dinheiro:

```
11:18:25  checkout_cta_clicked  { tier: 'starter' }   <- escolheu $9/mes tendo o $1 na tela
11:18:26  checkout_started      { renewal_amount: 900 }
11:18:50  checkout_resume_banner_dismissed            <- abandonou
11:18:59  first_video_generation_dispatched_from_viral_onboarding
11:19:30  fast_compose_recoverable { clips: 14 }      <- a casa rodou TUDO DE NOVO
11:19:31  compose_refused { limit: 0 }                <- e recusou de novo
```

**Dois filmes rodados e recusados em 92 segundos.** E não é só o autostart que
convida: `viral_onboarding` chamou o segundo. Ela teve 6 recusas no total.

### 3. O que mudou (`73a29699`)

A caixa do modal passa a dizer o fato — **"Script written and 15 clips already
shot for this film"** — e só quando ele é verdade.

`unlocksCurrentFilm` **continua `false`, de propósito**: essa chave liga a
manchete "Get this film clean", que promete tirar marca d'água de um arquivo
que a pessoa tem na mão. Aqui não há arquivo — há material rodado e nenhum
render. Trocar uma mentira por outra não é conserto; o guardião trava essa
fronteira nos dois sentidos.

**Fonte única, e não uma segunda cópia.** O predicado "o que conta como clipe
rodado" saiu de dentro da `CardEntryDoor` para `filterShotClips` /
`countShotClips` em `lib/growth/cleanFilmTrialDoor.ts`. Duas folhas disputando
o mesmo instante com dois filtros próprios é a bomba que a casa já catalogou
(`superficie-medida-por-copia-da-regra`). A porta cheia agora consome a mesma
função; o guardião dela foi **reancorado** e continua com 17 verificações.

Nenhum preço digitado: `door.priceNote` e `capacityNote` seguem saindo do
núcleo e de `lib/checkoutPricing`.

**Medição:** impressão **e clique** passam a carregar `ready_clips` e
`film_already_shot` — os MESMOS dois nomes que a porta cheia já emite. Com
nomes iguais, "qual folha converte quando o filme já está rodado?" tem
denominador. O ramo antigo emite `false`/`0` em vez de omitir o campo.

### 4. Prova

- `npx tsc --noEmit --incremental false` **verde**.
- Guardião novo `scripts/test-porta-modal-filme-rodado-2026-09-09.mjs`:
  **19 verificações**, com render REAL da caixa nos dois ramos e o `useEffect`
  executado à mão (senão "o evento carrega o ramo" seria afirmação sobre código
  que nunca correu).
- **4 mutantes falsificados**, cada um com `git diff` provando a aplicação:

| mutante | o que simula | resultado |
| --- | --- | --- |
| M1 — tira `readyClips={clipUrls}` do `<UpgradeModal` | o elo 1 da fiação morre | 19 -> **6**, acusa "elo 1" |
| M2 — tira `readyClips` do `<UpgradeModalTrialDoor` | o elo 2 morre | 19 -> **6**, acusa "elo 2" |
| M3 — `{filmIsShot ? (` vira `{true ? (` | afirma "já rodado" para todo mundo | 19 -> **7**, acusa "afirma filme rodado sem clipe nenhum" |
| M4 — filtro aceita qualquer string | `blob:`/`data:` viram clipe rodado | 19 -> **0** |

O M3 é o que importa: ele mantém **todas as strings do arquivo**. Guardião que
contasse texto ficaria verde.

⚠ **Primeira tentativa de M1 não aplicou onde eu queria** — `perl` sem `/g`
pegou a PRIMEIRA ocorrência de `readyClips={clipUrls}`, que é a da porta cheia,
e o guardião (corretamente) ficou verde. Só o `git diff` mostrou isso. Reforça
`mutacao-precisa-provar-que-aplicou`: mutante que não aplicou no alvo lê-se
como guardião resistindo.

- **Suíte inteira: 111 vermelhos na base (`HEAD~1`) e 111 com a entrega,
  conjuntos idênticos.** Houve 1 vermelho novo no meio do caminho e ele foi
  resolvido — ver abaixo.

### 5. Duas travas alheias no caminho — uma reancorada, uma registrada

**(a) `test-porta-1dolar-no-upgrade-modal` — reancorada (`d8ac2326`).** Ela
exigia a linha literal `import { decideTrialDoorOffer } from ...`. Ao importar
também `countShotClips` do MESMO módulo, ficou vermelha por colisão de
substring. A asserção **não afrouxou**: segue exigindo `decideTrialDoorOffer`
vindo de `cleanFilmTrialDoor`, agora tolerando outros símbolos na lista.
Falsificada nos dois sentidos.

**(b) `test-next-door-bar` (#47) — NÃO tocada, e vira PEDIDO.** A verificação 6
("pista do Codex intocada") roda `git diff -U0 HEAD` sobre o GenerateClient
inteiro e reprova qualquer linha nova que case com `/upgrade|price|checkout|.../`.
A linha do call site (`<UpgradeModalTrialDoor ... readyClips={readyClips} />`)
casa com `upgrade` pelo NOME DO COMPONENTE. Duas coisas verdadeiras ao mesmo
tempo, e as duas ficam registradas:

1. Com a mudança pendente, o #47 fica **vermelho** (27/1).
2. Depois do commit, `git diff HEAD` esvazia e ele volta **verde (28/0)** —
   confirmado. Ou seja, **essa trava não protege nada de forma durável**; ela
   só atrapalha quem tem trabalho pendente no arquivo
   (memória `trava-por-diff-fica-verde-ao-mergear`).

Não afrouxei e não contornei em silêncio: fica o pedido para o dono ancorar a
verificação no BLOCO da barra do 2º vídeo, não no arquivo inteiro.

### 6. Estado da plateia — a entrega ainda não tem público

Medido 15:40 BRT (18:40 UTC), desde a publicação da r2 (17:01 UTC):
139 eventos · 17 pessoas · **0 cadastros novos** · **0 eventos de porta** ·
**0 `checkout_started`** · **0 `compose_refused`** · **0 pagamentos**.
`metadata ? 'film_already_shot'` = **0 linhas em toda a história** — nenhuma
pessoa recebeu ainda o bundle da r2, quanto mais o desta rotação.

O tráfego da hora é de landing: `landing_session_started` 44 · `ph_landing_shown`
27 pessoas — e **nenhum vira cadastro**. Isso é da sprint irmã, e reforça o
achado 5 da r1 (cadastro caiu 3x com a Versão B).

**Corte de medição para a r6:** `metadata ? 'film_already_shot'` — nunca o
relógio. Enquanto esse campo não existir no banco, qualquer taxa é sobre
plateia zero.

**Números desta rotação:** 11 · 7 · 4 · 3 pessoas por superfície · 2 filmes
rodados e recusados em 92s numa pessoa · 19 verificações novas · 4 mutantes ·
111 = 111 na suíte · 0 pagamentos na casa desde 02/09 20:22 UTC.

### 7. ADENDO 16:20 BRT — a plateia chegou, e ela CORRIGE a leitura do item 1

Publicado: `0ff88967` → deploy `dpl_GVT1izvTnkm7QfY31k4yM35tsvNr`, **READY**,
alias `www.usekineo.com`.

Entre a medição do item 6 (18:40 UTC) e agora, a primeira pessoa recebeu o
bundle da r2. `metadata ? 'film_already_shot'` saiu de **0 para 6 linhas**.

**Quem:** `farooquihuzaifa998` (ChatGPT, PK), cadastro 18:41:36 UTC. Viu a porta
**3 vezes** e dispensou **3 vezes**, em 15 segundos — e nas 3 com
`ready_clips: 0, film_already_shot: false`.

**Por que zero clipes, e por que isso é o guardião funcionando:** ela escolheu
`cinematic_ai` (Seedance, 25cr), não o `fast`. Nesse caminho o bloqueio ocorre
em `analyzing`, ANTES de qualquer clipe — a checagem de saldo vem primeiro, como
deve. O ramo "already shot" **não se aplicou e corretamente não apareceu**: a
folha não inventou um fato que não existia. Isso é a falha fechada exercida em
produção, não só no guardião.

#### ⚠ A correção que importa: a caixa que consertei tem plateia ZERO desde ontem

Medição que eu deveria ter feito ANTES de escolher o alvo:

| dia | `card_entry_door_shown` (pessoas) | `upgrade_modal_trial_door_shown` (pessoas) | `upgrade_modal_opened` |
| --- | --- | --- | --- |
| 07/09 | 0 | 0 | 3 |
| 08/09 | 0 | **3** | 5 |
| 09/09 | **7** | **0** | 17 |

A `CardEntryDoor` entrou em 09/09 e **substituiu** a caixa do modal: hoje são
**17 aberturas de modal e ZERO impressões** da caixa que esta rotação consertou.
As 3 pessoas dela são **todas de 08/09**.

**Onde eu errei:** no item 1 escrevi que as duas superfícies são "dois caminhos
alternativos" — verdade sobre a coorte inteira, e **falso sobre hoje**. Eu li o
alcance somando 2 dias e não quebrei por dia, que é exatamente o erro que a
memória `superficie-nova-empurra-a-que-vende` descreve: penhasco de cobertura
por **sucessão**, não por defeito. A tabela do item 1 continua correta como
retrato acumulado; ela não autoriza a conclusão de alcance que tirei dela.

**O que a entrega vale, então, sem inflar:**
- Hoje, **nada** — a caixa não é renderizada para ninguém.
- É defensiva e continua certa: `cardEntryCohort` decide qual das duas abre, e
  no dia em que essa coorte mudar (ou a porta cheia for desarmada), a caixa do
  modal volta com o fato certo em vez do comentário que envelheceu.
- O que tem valor imediato e **permanece**: a **fonte única** (`filterShotClips`
  / `countShotClips`), que impede as duas folhas de contarem "clipes rodados" de
  jeitos diferentes; e os campos `ready_clips` / `film_already_shot` iguais nas
  duas, sem os quais nenhuma comparação futura teria denominador.

#### O alvo certo, agora com número (para a r4)

Das **7 pessoas que viram a porta cheia hoje**:

| | pessoas |
| --- | --- |
| viram a porta | **7** |
| tinham clipes rodados (`fast_compose_recoverable`) | **2** |
| bateram na cota (`compose_refused`) | 1 |
| **clicaram na porta** | **4** |
| pagaram | **0** |

Duas leituras que a próxima rotação não deve confundir:

1. O ramo "already shot" da r2 alcança **2 de 7 (29%)** — não é raro, mas
   também não é a maioria. Quem vai por `cinematic_ai` nunca o vê, por
   construção.
2. **4 de 7 clicaram e 0 pagaram.** Esse é o degrau que seca agora, e ele é
   depois da porta — no cobrador, não na folha. O cobrador só ficou de pé às
   14:58 UTC de hoje; das 4 que clicaram, é preciso separar quem clicou antes e
   depois desse instante antes de culpar a oferta.

**Próxima jogada (r4):** parar de escrever copy de porta e seguir os 4 cliques
até o fim — `card_entry_door_clicked` → `checkout_attempted` → `checkout_started`
→ `checkout_failed`/`payment_success`, por pessoa, com corte no conserto do
cobrador. Se os 4 morreram no cobrador, a oferta nunca foi testada e nenhuma
folha nova muda nada.

---

## r4 (executada 17:37–18:05 BRT — janela planejada 19:30, adiantada) — O PRIMEIRO MINUTO PAGO ENTREGAVA OUTRO PRODUTO

### 1. Os 4 cliques da r3, seguidos até o fim: 4 de 4 morreram no cobrador

A r3 fechou com a jogada "parar de escrever copy de porta e seguir os 4 cliques".
Feito, por pessoa, com corte no conserto do cobrador (09/09 14:58 UTC):

| pessoa | origem | 1º clique (UTC) | cliques | desfecho |
| --- | --- | --- | --- | --- |
| ascendbusniess | chatgpt | 02:16:51 | 1 | `checkout_failed` `payment_session_failed` |
| dinotinyyoutube | chatgpt | 08:56:56 | 2 | `checkout_failed` (dezenas) |
| ch.aminpakistan1 | chatgpt | 10:25:03 | 1 | `checkout_failed` + `checkout_error_shown` |
| mtsalvo3104 | chatgpt | 14:31:29 | 1 | `checkout_failed` + `checkout_error_shown` |

**4 de 4 do ChatGPT. 4 de 4 ANTES das 14:58 UTC** — o último por 27 minutos.
Nenhum cliente tocou a porta depois do conserto. **A oferta de $1 ainda não foi
testada uma única vez**, e nenhuma leitura de copy da porta significa coisa
alguma até que alguém clique nela consertada.

Um detalhe que separa "oferta ruim" de "cano quebrado": no meio das dezenas de
falhas de `dinotinyyoutube` existem **dois `checkout_started` que deram certo**
(08:57:36 e 09:02:03), os dois precedidos de `basic_checkout_clicked` — nunca da
porta. Ou seja, o mesmo cliente, no mesmo minuto, conseguia abrir sessão pelo
caminho normal e não conseguia pela porta de $1. A falha era do trial, não do
checkout — exatamente o que o `add_invoice_items` previa.

### 2. Ninguém pagou, então o caminho pago foi lido linha a linha — e tinha 3 furos

O servidor está certo, e isso ficou provado: o webhook grava `plan` como
`<tier>_trial` (= `basic_trial`), `has_paid: true` e `+80` créditos
(`CARD_TRIAL_GRANT_CREDITS`); `selfServeEntitlementState` tem `basic_trial` na
lista de planos pagos; `/checkout/success` manda para
`/studio/create?resume=card_entry` quando há rascunho; `/studio/create` monta o
`GenerateClient`, onde o filme dispara sozinho. A cadeia existe inteira.

O que estava quebrado é o que atravessa o Stripe: **o rascunho**.

**(a) O rascunho não levava o motor.** Ele guardava `prompt`, `quality` e
`duration`. Só que quem escolhe o motor são **`mode` e `aiEngine`** — as duas
variáveis de que `selectedCost` deriva o preço — e nenhuma das duas era gravada.
Na volta do Stripe o `mode` renascia no padrão de fábrica (`fast`).

> Quem escolheu um motor cinematográfico, **pagou por ele** e voltou, recebia um
> Kineo 1. Sem aviso, sem erro na tela, sem escolha. O primeiro minuto pago da
> casa entregava outro produto.

Tamanho medido, coorte da Versão B: das 9 pessoas que despacharam,
**7 em `fast` e 2 em `cinematic`** — a troca silenciosa atingiria ~1 em cada 5.

**(b) A validação do `quality` olhava a lista errada.** Era feita contra
`QUALITY_OPTIONS`, lista **legada** de três entradas (`basic`/`basic_ai`/`pro`).
Os dois valores que o produto usa hoje — `fast` e `cinematic_ai` — não estão
nela. Resultado: o `quality` do rascunho era recusado em **100% dos casos vivos**.

**(c) O disparo tinha régua própria.** Exigia `credits > 0`; o gerador exige
`credits >= selectedCost`. Com os 80 créditos do $1 e um motor de 150, o efeito
seria o pior desfecho possível: o evento `card_entry_resume_autostart`
**afirmaria que o filme começou**, o rascunho seria **apagado**, e a pessoa
levaria um modal de "sem créditos" logo depois de pagar — sem o próprio texto
para tentar de novo. Note que (a) MASCARAVA (c): com `mode` sempre em `fast`,
o custo nunca passava de 80. Consertar (a) sozinho ARMARIA (c).

### 3. O que mudou (`8766de70` + `11ef4ef3`)

`lib/growth/cardEntryResumeDraft.ts` (novo) passa a ser o dono da chave, do TTL
e da leitura validada do rascunho. O `GenerateClient` grava `mode` e `aiEngine`
junto, e na volta devolve os dois à tela — nulo nunca vira chute.

E o disparo **pergunta ao mesmo caixa que o botão**: a guarda virou
`outOfCredits()`, a função que `handleGenerateGuarded` já consulta. Não há cópia
da regra, então as duas não podem divergir (memória
`predicado-do-cobrador-nao-se-redigita`). Bloqueado por saldo, o rascunho
**FICA** e o rastro é `card_entry_resume_blocked` — que não mente sobre ter
começado.

**A chave continua `_v1` de propósito.** Há gente com rascunho gravado pelo
bundle que está no ar, possivelmente dentro do Stripe neste minuto; `_v2`
orfanaria esse rascunho justamente na volta do pagamento. Os campos novos são
aditivos.

**Medição que isto habilita:** `card_entry_resume_restored` passa a carregar
`mode`, `engine` e `engine_restored`; o autostart carrega `mode` e `engine`. Sem
esses campos não há como separar "voltou com o motor certo" de "voltou no padrão
de fábrica".

### 4. Prova

- `npx tsc --noEmit --incremental false` **verde**.
- Guardião novo `scripts/test-resume-1dolar-fiel-2026-09-09.mjs`:
  **23 verificações**, com o módulo **executado de verdade** (ida-e-volta dos 8
  motores e dos 4 modos, rascunho velho, JSON quebrado, TTL) e a fiação amarrada
  à variável que decide.
- **4 mutantes falsificados**, cada um com `git diff` provando que aplicou:

| mutante | o que simula | resultado |
| --- | --- | --- |
| M1 — `mode, engine: aiEngine` vira literais fixos | o rascunho volta a não levar o motor | 23 → **12**, acusa "a gravacao nao passa o aiEngine" |
| M2 — `if (outOfCredits())` vira `if (false)` | volta a régua paralela | 23 → **16**, acusa "o disparo nao pergunta ao caixa" |
| M3 — o ramo bloqueado volta a apagar o rascunho | quem pagou perde o texto | 23 → **19**, acusa "o ramo bloqueado apaga o texto de quem acabou de pagar" |
| M4 — `DRAFT_QUALITIES` volta à lista legada | o defeito (b) | 23 → **4**, acusa "quality viva recusada: fast" |

O M2 é o que importa: ele mantém **todas as strings do arquivo**. Guardião que
contasse texto ficaria verde.

### 5. Rodar a suíte inteira pagou de novo — 3 vermelhos, os 3 informação

Baseline medida **no meu pai** (`f1248840`), não a da r1 (`606bda28`, 6 commits
atrás): **111 de 476**. Com a primeira entrega: **114 de 477**. Os três novos:

1. **`test-funil-volta-1-dolar-2026-09-08` estava REPROVANDO o conserto.** Ele
   foi escrito em 08/09 como retrato byte a byte da primeira implementação e por
   isso **afirmava literalmente os três defeitos**: chamava `quality` de "motor",
   exigia `QUALITY_OPTIONS.some(...)` e exigia `credits <= 0`. Um guardião nesse
   estado tranca o defeito em vez de proteger a intenção. Reancorado: as 20
   intenções continuam todas lá, **três ficaram mais estritas**, e ele foi de
   **20 para 27** verificações. O porquê está no cabeçalho dele.
2. **`test-porta-v2-2026-09-09`** exigia que o Studio REDIGITASSE o literal da
   chave. Agora prova algo melhor: o Studio importa a constante do dono e o
   literal não pode reaparecer.
3. **`test-verified-checkout-purchase` (Codex, 04/09)** tem mapa explícito de
   imports e recusa qualquer import fora dele, de propósito. O módulo novo
   entrou como **módulo real**, não dublê.

Resultado final: **111 vermelhos na base e 111 com a entrega, conjuntos
idênticos.**

**Achado de brinde:** `components/CardEntryDoor.tsx` tinha a **quarta** cópia do
literal da chave e grava um rascunho de emergência antes do Stripe. Ela grava só
`if (!raw)`, então não atropelava o rascunho bom — mas era mais uma chave para
envelhecer sozinha. Agora seu `STUDIO_DRAFT_KEY` é reexportação da constante do
dono.

### 6. Estado da plateia

Sem pagamentos na casa desde **02/09 20:22 UTC** (7 dias). Sem nenhum cliente na
porta consertada desde 14:58 UTC. `card_entry_resume_*` nunca rodou para ninguém
— este conserto é para a **primeira pessoa que pagar**, que até aqui seria a
cobaia dos três furos.

**Números desta rotação:** 4 de 4 cliques mortos no cobrador, todos antes das
14:58 · 2 de 9 despachos em motor cinematográfico (a coorte da troca silenciosa)
· 23 verificações novas · 4 mutantes · 20 → 27 no guardião reancorado · 111 = 111
na suíte · 0 pagamentos.

### 7. Corte de medição para a r6

`metadata ? 'engine_restored'` — **nunca o relógio**. Enquanto esse campo não
existir no banco, ninguém recebeu o bundle desta rotação e qualquer taxa é sobre
plateia zero.

### 8. Publicação confirmada (18:25 BRT / 21:25 UTC)

`cb4f8537` → deploy `dpl_Fyv9MVhyii5fysgWdSU6RziwUSso`, **READY**, alias
`www.usekineo.com` (confirmado servindo: o `dpl_` no HTML da home é esse).
Reconferido **na ponta da fila**, não só na worktree: `tsc` verde e os 7
guardiões do caminho de $1 verdes depois do rebase do `enfileirar.sh` (a fila
tinha 1 commit alheio, `7cd98543`, docs).

Estado da plateia no momento da publicação:

| | |
| --- | --- |
| pagamentos na Versão B | **0** |
| último pagamento da casa | **02/09 20:22:43 UTC** (7 dias) |
| `card_entry_door_clicked` desde o conserto do cobrador (14:58 UTC) | **0** |
| linhas com `engine_restored` em toda a história | **0** |
| pessoas ativas na última hora | 1 |

Os dois zeros do meio são o recado da rotação: **a oferta de $1 continua sem um
único teste** — ninguém clicou na porta desde que o cobrador ficou de pé — e
**ninguém recebeu ainda o bundle desta rotação**. Qualquer taxa calculada agora
é sobre plateia zero. O corte da r6 é `metadata ? 'engine_restored'`, nunca o
relógio.

### O que fica para a r5

O contrato para o GPT. E ele agora tem um fato novo e vendável para dizer: quem
paga o $1 volta para o **próprio filme, com o próprio motor**, e dispara sozinho.
Antes desta rotação essa frase seria mentira para 1 em cada 5 compradores.
