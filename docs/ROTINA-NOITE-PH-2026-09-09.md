# ROTINA PH — NOITE DE 09/09/2026

Diário da rotina que prepara o lançamento no Product Hunt de **quinta 10/09,
00:01 PT (04:01 BRT)**. Plano: `docs/LANCAMENTO-PRODUCT-HUNT-2026-09-10.md`.
Entregas em `docs/ph/`. O fundador cria a conta e sobe; esta rotina só deixa
tudo pronto para colar.

**Regra de fábrica do kit:** nenhum preço, crédito ou contagem de filme é
digitado à mão. `scripts/ph-fatos.mjs` transpila e **executa**
`lib/checkoutPricing.ts`, `lib/entryPolicy.ts`, `lib/credits/engineCost.ts`,
`lib/marketingPrice.ts` e `lib/engineLabel.ts` — a mesma técnica do guardião de
preço V7. Se o fundador repricar, `node scripts/ph-galeria.mjs` refaz as
imagens sozinho e o guardião do kit acusa material velho.

---

## r1 03:05 — galeria (6 PNG 1270x760)

**O que ficou pronto:** `docs/ph/gallery-01..06.png`, 1270x760 exatos, ~2,6 MB
no total. Reprodutíveis com dois comandos.

| # | painel | o que mostra |
|---|---|---|
| 01 | a tese | "Type an idea. Get a cinematic short in about 3 minutes." + quadro do robô (Omni Flash) |
| 02 | os 8 motores | nome, a linha da vitrine e o custo em créditos de um filme de 60 s |
| 03 | a tela real | screenshot da home pública (deslogada), com a barra `usekineo.com` |
| 04 | os planos | Starter/Creator/Studio em **filmes por mês**, com o gate honesto |
| 05 | a porta de $1 | o `CARD_ENTRY_COPY` inteiro + leque de 3 filmes |
| 06 | filmes de verdade | 4 quadros, 4 motores, selo e custo de cada um |

**Como foram geradas (comandos):**

```bash
bash scripts/ph-quadros.sh      # baixa os masters e corta os quadros
node scripts/ph-galeria.mjs     # monta os 6 HTMLs e captura com o Edge
```

- `scripts/ph-fatos.mjs` (novo) transpila com `typescript` + `vm` e **executa**
  `lib/checkoutPricing.ts` (TIER_PRICES, TIER_CREDITS), `lib/entryPolicy.ts`
  (CARD_ENTRY_COPY), `lib/credits/engineCost.ts` (`creditCostForDuration`),
  `lib/marketingPrice.ts` (`videosPerMonth`), `lib/engineLabel.ts` (nomes) e
  `components/EngineCycleCard.tsx` (a linha de cada motor). Zero número
  digitado à mão em imagem, vídeo ou texto do kit.
- `scripts/ph-quadros.sh` (novo) baixa os masters 1080x1920 da vitrine do
  fundador (ids de `FOUNDER_SHOWCASE`) e corta **sempre** `crop=1080:1776:0:144`,
  que remove a faixa da marca antiga `usekineo.com/free` do topo.
- A captura é `msedge --headless --window-size=1270,760 --screenshot=…`, via
  `Start-Process -Wait` do PowerShell (o Edge chamado direto do bash retorna
  antes de escrever o arquivo). Não existe puppeteer/playwright/sharp no
  `package.json` — o Edge é o único renderizador disponível na máquina.
- `.ph-build/` (masters + HTMLs) entrou no `.gitignore`: 180 MB de vídeo não
  vão para o repositório.

**Números que as imagens afirmam, todos derivados:** Kineo 1 5cr · Seedance 1.5
25 · MiniMax H3 45 · Kling 2.5 50 · Veo 3.1 100 · Avatar 110 · Kling 3 150 ·
Omni Flash 150 (por filme de 60 s, conta paga). Starter $14/60cr = 12 Kineo 1
ou 2 Seedance · Creator $29/150cr = 30 ou 6 · Studio $59/300cr = 60 · 12 ·
6 Kling 2.5 · 2 Kling 3.

**Honestidade que o painel 04 respeita:** `lib/enginePlanGate.ts` só libera
Kling/Veo/Kling 3/H3/Omni/Avatar para **Studio** em conta criada depois de
08/09. Por isso Starter e Creator listam só Kineo 1 e Seedance — anunciar
"6 Kling 2.5 films" no Creator seria vender o que o cobrador recusa.

**Dois achados de produto para a rotação das 08:30 (não consertados aqui):**

1. **`/studio` deslogado mostra "🔥 Get Started Free →"** na barra lateral,
   logo abaixo do card que diz `$1 for 7 days — 80 credits, then $29/mo`.
   Contradiz `CARD_ENTRY_COPY.noFreeTier` na tela que o visitante do Product
   Hunt mais provavelmente vai abrir depois da `/ph`.
2. **A grade da `/ph` mostra a marca antiga.** Os cards da seção "Made with
   Kineo" usam as previews sem o corte de 144px, então o `usekineo.com/free`
   aparece atrás do selo do motor em vários cards. Todo material novo já sai
   cortado; a página, não.

**Guardiões rodados (verdes, base intacta):** `test-ph-landing-2026-09-08.mjs`
15/0 · `test-preco-v7-2026-09-09.mjs` 31/0.

**O que ficou para as próximas rotações:** vídeo de 60 s + thumb (04:30),
textos do PH (06:30), `/ph` polida + guardião do kit + fechamento (08:30).

## r2 03:35 — o vídeo de 60 s + thumbnail

**O que ficou pronto:** `docs/ph/kineo-ph-60s.mp4` — 1280x720, **60,03 s**,
**7,67 MB** (teto era 50), 30 fps, sem áudio. `docs/ph/kineo-ph-thumb.png`
1270x760.

**Como foi gerado (comando):**

```bash
node scripts/ph-video.mjs
```

**Linguagem visual:** a mesma do anúncio do Reddit publicado hoje
(`public/ads/kineo-reddit-sep09-16x9-v2.mp4`, commit `3eeae0d1`): o filme
vertical **inteiro** no centro, laterais desfocadas do próprio filme, texto no
topo. O produto é o filme 9:16 — mostrá-lo cortado seria vender outro produto.

**Montagem (4 filmes de 12 s + cartela de 12 s):**

| trecho | filme | motor | frase no topo |
|---|---|---|---|
| 0–12 s | The robot rising from the harbor | Omni Flash · 150cr | "Type an idea." |
| 12–24 s | The Dyatlov Pass incident | Kling 2.5 · 50cr | "One paragraph of text." |
| 24–36 s | The ghost ship Mary Celeste | Seedance 1.5 · 25cr | "Eight engines, one button." |
| 36–48 s | Storm over Lake Maracaibo | Kling 3 · 150cr | "A finished 9:16 film." |
| 48–60 s | cartela | — | `CARD_ENTRY_COPY.chip` + `.headline` + `.noFreeTier` |

O nome e o custo em créditos no selo de cada trecho saem de `ph-fatos.mjs`; a
cartela final é o `CARD_ENTRY_COPY` inteiro, palavra por palavra da fonte
única. Os quatro masters passam por `crop=1080:1776:0:144` — a marca antiga
não aparece em um quadro sequer.

**Detalhe técnico que vale para a próxima peça:** as tarjas de texto são PNG
com alfa capturados pelo Edge (`--default-background-color=00000000`) e
sobrepostos com `overlay`, em vez de `drawtext`. Sai a tipografia da casa, e
não há inferno de escape de `:` no filtro do ffmpeg.

## r3+r4 04:05 — textos, três consertos na /ph, guardião

**Textos:** `docs/ph/PH-TEXTOS-2026-09-10.md` — ficha (tagline 48/60,
descrição 220/260), primeiro comentário do maker, 5 respostas prontas,
3 posts para X/LinkedIn e os 30 apoiadores.

Números medidos no banco em 09/09 e nomeados como tais: **1.686** filmes
terminados · **1.849** contas · **12** pagantes (fora a conta do fundador) ·
primeiro filme em **12/05/2026**.

**Os 30 apoiadores são gente real, não perfil plausível.** O plano pedia
"30 hunters plausíveis com link público"; entregar isso seria repetir o erro
que já custou caro — as campanhas de 19/08 e 24/08 mandaram clientes reais
para `producthunt.com/products/kineo`, que é de um concorrente homônimo, e
duas reviews pagas foram parar na página de outra empresa. A lista entregue
são os 12 que pagaram + os 18 que terminaram 4 filmes ou mais, tirados do
banco. Para hunters do PH, o arquivo traz a receita de colher em 20 minutos
na quarta, com a conta já criada. Ninguém foi contatado.

### Três consertos na /ph

1. **A contagem de motores era digitada.** `VIDEO_ENGINE_COUNT_WORD`
   (`lib/engineLaunch.ts`) vale `'Eight'` porque `S25_PUBLIC=false`, e a `/ph`
   era o **único** lugar do site que escrevia "Nine" à mão — em três lugares,
   **dois deles na metadata**, que é o texto puxado como prévia do link pelo
   Product Hunt e pelo X. O site dizia oito e o cartão de compartilhamento do
   lançamento dizia nove. Agora importa a constante.
2. **O selo "Live on Product Hunt" apontava para uma ficha que não existe.**
   `producthunt.com/products/kineo-ai` só passa a existir quando o fundador
   subir o produto na quinta; hoje é 404. Agora o selo só renderiza atrás de
   `PH_LISTING_URL`, que nasce `null`. No dia, uma linha liga.
3. **A grade de 12 cards mostrava a marca do free tier.** Os pôsteres de
   `public/posters/ex-<id>.webp` foram tirados dos masters antes do corte e
   trazem `usekineo.com/free` no topo — na mesma página que diz "There is no
   free tier", em doze cards. `scripts/ph-posters.sh` gera as cópias cortadas
   em `public/posters/ph/`; os originais ficam intactos porque são curadoria
   do fundador em outras telas.

### O mobile estava certo, a minha sonda é que mentia

O Edge headless em `--window-size=390,1400` mostrou o parágrafo do herói
cortado à direita e o selo saindo da tela. Antes de "consertar", medi no
navegador de verdade com viewport 375: `document.documentElement.scrollWidth`
= 375, e **zero** elementos com `right > viewport`. A página não vaza. O corte
era artefato do headless, que não aplica o viewport móvel do jeito que um
celular aplica. **Regra para a próxima rotação: layout de celular se mede em
navegador com viewport emulado, nunca por screenshot do Edge headless
estreito.**

### Guardião `scripts/test-ph-kit-2026-09-09.mjs` — 64 verificações, 0 falhas

Confere: as 8 peças existem; os 7 PNG medem 1270x760; o MP4 dura ~60 s e cabe
no teto de 50 MB; **todo valor em dólar do texto sai da fonte única**; cada
motor aparece com o crédito derivado; a `/ph` não digita contagem de motores
nem URL crua de ficha do PH e segue `noindex`; os 12 pôsteres cortados existem.

Duas armadilhas que ele evita de propósito, e que valem para o próximo
guardião de texto:
- A varredura de preços **pula a seção de proibições** (que cita $7/$15/$19 de
  propósito, para mandar não usar) — e confere que o corte existe, senão ele
  vira o arquivo inteiro em silêncio e a varredura passa a não medir nada.
- As regras de conteúdo rodam só nos **blocos coláveis** (` ``` `), não na
  prosa. Na primeira versão, o aviso que existe justamente para proibir o slug
  do concorrente homônimo reprovava o próprio arquivo.

**Falsificado por 4 mutações**, cada uma conferida por `grep` do texto
inserido antes de rodar (nunca por hash — o CRLF do Windows mente):

| mutação | resultado |
|---|---|
| M1 — o texto volta a prometer "Nine video engines" | vermelho: *o colavel NAO promete nove motores* |
| M2 — a `/ph` volta a digitar "nine video engines" | vermelho: *a /ph NAO digita a contagem de motores* |
| M3 — some um pôster cortado | vermelho: *poster cortado existe: f3de57b0* |
| M4 — "Creator $19/mo" no texto | vermelho: *intrusos: 19* |

No estado limpo volta a 64/0 — ele não está preso no vermelho.

**tsc** `--noEmit --incremental false` verde · `test-ph-landing-2026-09-08`
15/0 · `test-preco-v7-2026-09-09` 31/0.

---

## FECHAMENTO 09/09 04:30

### O que está pronto (caminhos)

| peça | caminho |
|---|---|
| galeria, 6 imagens 1270x760 | `docs/ph/gallery-01..06.png` |
| vídeo de 60 s (7,67 MB) | `docs/ph/kineo-ph-60s.mp4` |
| thumbnail | `docs/ph/kineo-ph-thumb.png` |
| todos os textos, prontos para colar | `docs/ph/PH-TEXTOS-2026-09-10.md` |
| página de pouso | `https://www.usekineo.com/ph` |

Reprodutíveis: `bash scripts/ph-quadros.sh` → `node scripts/ph-galeria.mjs` →
`node scripts/ph-video.mjs` → `bash scripts/ph-posters.sh`. Guardião:
`node scripts/test-ph-kit-2026-09-09.mjs`.

Três entregas publicadas na noite: `70821391` (galeria) · `5bdebc13` (vídeo) ·
`2b338fd9` (textos + `/ph` + guardião).

### O que o fundador precisa fazer na quinta, em ordem

1. **Hoje (quarta), criar a conta** em producthunt.com com
   josephsskaf@gmail.com, foto e bio. Seguir 20-30 makers de IA — conta nova e
   vazia pesa contra.
2. **Criar a ficha** com o nome **`Kineo AI`** (nunca `Kineo` puro: o slug
   `kineo` é de um concorrente homônimo). Copiar tagline, descrição, tópicos e
   link do `PH-TEXTOS-2026-09-10.md`, e subir a galeria na ordem listada lá.
3. **Agendar para 10/09, 00:01 PT.** O PH permite agendar; ele dorme.
4. **Assim que a ficha existir**, abrir a URL real e mandar a rotação da manhã
   preencher `PH_LISTING_URL` em `app/ph/page.tsx` — enquanto for `null`, o
   selo "Live on Product Hunt" não aparece na `/ph`. Uma linha e um push.
5. **Pôr crédito na fal por Pix ainda hoje.** Dia de PH pode trazer 200-500
   filmes; saldo baixo = render falhando na frente de todo mundo.
6. **07:00 BRT de quinta:** postar o primeiro comentário do maker (está pronto)
   e responder tudo. O algoritmo do PH pesa resposta do maker; silêncio mata.
7. **Nunca escrever "upvote"** em post, e-mail ou DM. Pedir *comentário* e
   *feedback*.

### O que a rotação da manhã (ou a próxima sessão) deve olhar

- **`/studio` deslogado mostra "🔥 Get Started Free →"** na barra lateral, logo
  abaixo do card que diz `$1 for 7 days — 80 credits, then $29/mo`. Contradiz
  `CARD_ENTRY_COPY.noFreeTier` na tela que o visitante do PH mais provavelmente
  abre depois da `/ph`. Não consertei: é fora do escopo desta rotina e mexe em
  tela de produto viva.
- **A marca antiga fora da `/ph`.** Cortei só os 12 pôsteres da `/ph`. Os
  arquivos `public/posters/ex-*.webp` continuam com `usekineo.com/free` no topo
  e aparecem na home e no `/examples`. Vale o mesmo corte, mas é curadoria do
  fundador — precisa do "vai" dele.
- **`emiliomontinari`** paga há um ciclo inteiro e tem **0 filmes**. Para ele o
  convite certo não é o Product Hunt: é perguntar por que não usa.
- **Dívida com o Rick (gapozweb)**, o único apoiador com peça pública sobre a
  Kineo: ele cobrou o crédito prometido duas vezes e mandou "Feeling
  forgotten" em 22/08. Conferir se o crédito saiu ANTES de pedir qualquer
  favor de lançamento.

---

## r9 07:33 — O KIT ESTÁ PRONTO E O BOTÃO DELE NÃO ABRE

Esta rotação não produziu peça nova: as quatro do plano já estavam publicadas
e verificadas (guardião 64/0, PNGs 1270x760, MP4 60,03 s / 7,7 MB). Fui
conferir a `/ph` como manda o passo 4 e a página está **correta** — no celular
(375) e no desktop: `noindex, follow`, zero vazamento horizontal
(`scrollWidth - clientWidth = 0`, nenhum elemento passando da borda), CTA
acima da dobra nos dois tamanhos. Não havia nada para consertar na página.

O problema não é a página. É a porta atrás do botão.

### O achado

O CTA único do lançamento inteiro é:

```
/api/stripe/checkout?tier=basic&billing=monthly&trial=1&intent_campaign=ph_sep10
```

O `trial=1` cai no ramo `wantsTrial && !isAnnual` de
`app/api/stripe/checkout/route.ts:1543`, que anexa a taxa de $1 por
`subscription_data.add_invoice_items`. **A Checkout Session da Stripe não
aceita esse campo.** A resposta é sempre a mesma frase, e a pessoa é jogada em
`/pricing?checkout_error=`.

Não é intermitente: é um parâmetro inválido num objeto montado sempre igual.
**Todo** clique na porta de $1 bate nisso.

### Verificado por três caminhos independentes

| caminho | o que diz |
|---|---|
| **produção** (`checkout_error_shown`) | 4 erros hoje, 2 pessoas, os 4 com `Received unknown parameter: subscription_data[add_invoice_items]` — em **três** campanhas: `door_v2`, `trial_1usd`, `card_entry`. O último às **10:25 UTC**, ~8 min antes desta rotação. |
| **placar da porta** | 13 cliques (4 pessoas) · 4 erros · **0 pagamentos de trial, desde sempre** |
| **guardião na própria main** | `test-taxa-de-entrada-chega-na-stripe-2026-09-09` está **10 ok / 1 falha** — ele lê os tipos do SDK instalado e vê que `SubscriptionData` não declara `add_invoice_items` |

Os planos normais ($14/$29/$59) **não** são afetados: o parâmetro só entra no
ramo do trial. Quebrou exatamente a única oferta que o Product Hunt vai ver.

### O que eu fiz (o que estava ao meu alcance)

O guardião do kit imprimia `OK — kit do Product Hunt completo` enquanto o botão
que ele valida levava a uma parede. Essa linha era a mentira mais cara da
semana: quem a lê, lança.

`scripts/test-ph-kit-2026-09-09.mjs` ganhou a seção **"a porta que o kit
anuncia precisa abrir"**. Ela **não redigita** o predicado — herda o veredito
do guardião da porta rodando-o como subprocesso, para não criar uma segunda
regra que envelhece sozinha quando a primeira mudar.

**Falsificado nos dois sentidos**, não só no vermelho:

| estado | porta | kit |
|---|---|---|
| main como está | 10 ok / **1 falha** | 65 · **1 falha** |
| com `0f5a53e4` aplicado (cherry-pick temporário, desfeito) | **11 ok / 0** | **66 · 0** — *"e a porta de $1 abrindo"* |

Ou seja: o vermelho não está preso, e some no minuto em que o conserto entrar.

### O que eu NÃO fiz, e por quê

O conserto existe, está pronto, com tsc verde e guardião passando:

```
git cherry-pick 0f5a53e4     # toca só app/api/stripe/checkout/route.ts
```

`app/api/**` é **caminho travado** para esta rotina. A trava vale mesmo quando
eu concordo com o conserto — foi ela que impediu quatro sessões de se
atropelarem na mesma rota. Então o commit fica onde está e a decisão é de uma
palavra do dono do caminho. Apliquei, medi, desfiz: `git status` fecha esta
rotação com **um único arquivo modificado**, o guardião.

Também **não** troquei o CTA da `/ph` para um plano que funciona. Seria
abandonar a oferta de $1 em que a galeria, o vídeo, a cartela final e os
textos inteiros estão construídos — mudança de oferta é decisão do fundador,
não conserto de rotina.

## FECHAMENTO 09/09 (r9) — SUBSTITUI A ORDEM DO FECHAMENTO DAS 04:30

O fechamento das 04:30 continua valendo em tudo, **menos na ordem**: ele foi
escrito sem saber que a porta de $1 não abre. A lista de quinta ganha um passo
**zero**, e ele é eliminatório.

### 0. ANTES DE QUALQUER COISA — destravar a porta de $1

```
git cherry-pick 0f5a53e4
```

Uma linha, um arquivo (`app/api/stripe/checkout/route.ts`), tsc verde,
guardião de 10/1 para 11/0. **Sem isto o lançamento não tem para onde mandar
ninguém**: o botão do PH, da galeria, do vídeo e dos três posts é o mesmo, e
hoje ele devolve erro em 100% dos cliques. Como conferir que valeu:

```
node scripts/test-ph-kit-2026-09-09.mjs      # tem de terminar em "e a porta de $1 abrindo"
```

E, depois de publicado, a prova que não depende de teste — em produção, a
tabela tem de parar de crescer:

```sql
select count(*) from events
where name='checkout_error_shown'
  and metadata->>'error_class'='unknown_parameter'
  and created_at > now() - interval '1 hour';
```

### 1 a 7 — a lista das 04:30, sem mudança

Criar a conta hoje · ficha com o nome **`Kineo AI`** (nunca `Kineo` puro) ·
agendar 10/09 00:01 PT · mandar preencher `PH_LISTING_URL` quando a ficha
existir · **crédito na fal por Pix ainda hoje** · 07:00 BRT de quinta responder
tudo · nunca escrever "upvote", pedir *comentário*.

### O que está pronto, e continua pronto

| peça | caminho |
|---|---|
| galeria, 6 imagens 1270x760 | `docs/ph/gallery-01..06.png` |
| vídeo de 60 s (7,7 MB, 60,03 s) | `docs/ph/kineo-ph-60s.mp4` |
| thumbnail | `docs/ph/kineo-ph-thumb.png` |
| textos, prontos para colar | `docs/ph/PH-TEXTOS-2026-09-10.md` |
| página de pouso, conferida no celular e no desktop | `https://www.usekineo.com/ph` |

O kit está bom. Ele só está apontando para uma porta trancada, e a chave está
a um `cherry-pick` de distância.

### Verificação desta rotação

`tsc --noEmit --incremental false` verde · `test-ph-landing-2026-09-08` **15/0**
· `test-preco-v7-2026-09-09` **31/0** · `test-ph-kit` **65 · 1** (o vermelho é
a porta, de propósito).

Suíte inteira: **355 verdes / 113 vermelhos** — cauda herdada, grande, e que
não é desta rotação. A prova de que ela não é minha não é o número, é
estrutural: `grep -l` pelos meus três arquivos devolve **dois** guardiões
(`test-ph-kit` e `test-taxa-de-entrada`, os dois já citados), e **nenhum**
guardião varre `docs/` inteiro — então os dois anexos de diário não podem
pintar nada de vermelho. Lista dos 113 salva em `/tmp/suite-red-r9.txt` para
quem for atacar a cauda.

## r10 09:05 — A PORTA CONTINUA FECHADA, E O NÚMERO É MAIOR DO QUE PARECIA

Rotação de fechamento. Não havia peça nova a fazer: as quatro do plano estão
publicadas e conferidas. O que havia era conferir se o único bloqueio do
lançamento continuava de pé — e ele continua, com um tamanho que a rotação
anterior não tinha medido.

### 1. A porta continua fechada na main de hoje

`origin/main` = `db6fbc8d` às 12:05 UTC. `app/api/stripe/checkout/route.ts:1545`
ainda monta `add_invoice_items`. O conserto `0f5a53e4` **continua fora da main**
— a rotina ENTREGA confirmou o mesmo às 11:49 UTC, por outro caminho.

### 2. O dano medido é 31 falhas, não 4

A rotação r9 contou pelo evento de tela (`checkout_error_shown`, 4 eventos). O
evento do servidor conta outra história:

| medida | valor |
|---|---|
| `checkout_failed` / `payment_session_failed` | **31 eventos · 5 pessoas** |
| primeira / última | 09/09 **02:16** → 09/09 **10:25** UTC |
| o mesmo evento nos **7 dias anteriores** | **1** (31/08) |
| pagamentos de trial de $1 na história da porta | **0** |
| último pagamento da casa, de qualquer tipo | **02/09 20:22** — 0 em 72 h |

A leitura importa: `payment_session_failed` não é ruído de fundo. Ele **nasceu
em 02:16 de hoje** e se repetiu 31 vezes em oito horas. Sete sessões de
checkout foram abertas em 24 h e nenhuma virou dinheiro.

Um cuidado que eu devo ao número: **a seca é mais velha que o defeito.** A casa
não recebe um pagamento desde 02/09, e a porta só quebrou hoje. O defeito não
causou a seca — ele garante que ela continue, e é a única parte que está ao
alcance de um clique.

### 3. Um zero fantasma no caminho (a lição da rotação)

Minha primeira consulta perguntou por `metadata->>'error'` e devolveu **0
eventos** — contradizendo r9. A chave real é `reason_detail`; `error` não
existe nesse evento. Ancorei num número já conhecido antes de publicar e o zero
se desfez. Um `0` de chave inexistente é indistinguível de um `0` de defeito
consertado, e neste caso ele teria me feito escrever "a porta foi consertada".

### 4. O conserto foi provado contra a main de HOJE

`0f5a53e4` nasceu às 02:12, e a main andou desde então. Ninguém tinha conferido
se ele ainda aplica. Confirmei numa worktree isolada sobre `db6fbc8d`:

| prova | resultado |
|---|---|
| `git cherry-pick 0f5a53e4` | aplica **limpo** |
| `npx tsc --noEmit --incremental false` | **verde** |
| `test-taxa-de-entrada-chega-na-stripe` | **11 ok · 0 falhas** |
| `test-ph-kit` | **66 · 0** — *"e a porta de $1 abrindo"* |

### 5. A corrente DEPOIS da porta também foi auditada

A porta nunca abriu, então nada além dela jamais executou em produção. Se ela
abrir às 4 da manhã e o resto não funcionar, o lançamento converte e falha. Li
o caminho inteiro:

· o checkout carimba `metadata.card_trial = '1'` (linhas 1483 e 1571) — e o
  conserto **não toca** nessas linhas;
· o webhook lê exatamente esse carimbo (`route.ts:1358`) e concede
  `CARD_TRIAL_GRANT_CREDITS`;
· `CARD_TRIAL_GRANT_CREDITS = 80` = `CARD_ENTRY_TRIAL_CREDITS = 80`, que é o
  número que a `/ph`, a galeria e os textos prometem.

A corrente está **coerente**. Nunca foi exercitada, mas as três pontas
concordam entre si.

**Um falso alarme que eu descartei antes de escrever:** a taxa é montada como
`100` unidades mínimas na moeda resolvida, o que seria R$1,00 (≈ $0,18) para um
comprador brasileiro. Fui ler `resolveCheckoutCurrency` — ela devolve `'usd'`
sempre, desde a V6. O $1 é $1. Não é dívida.

### 6. O que esta rotação entregou: a decisão de uma palavra virou um clique

`app/api/**` é caminho travado para esta rotina, e a trava vale mesmo quando eu
concordo com o conserto. Continuo sem tocar nele: `git status` fecha esta
rotação sem uma linha de `app/api/`.

Mas a instrução que r9 deixou — `git cherry-pick 0f5a53e4` — tem uma armadilha
que eu não posso deixar de pé para as 4 da manhã: **ela não diz onde rodar.**
Rodada na pasta `C:\kineo`, cai na main LOCAL, que está suja e parada num
commit reprovado (`727a869`). O comando certo no lugar errado é um estrago.

Então empacotei a decisão dele:

| arquivo | o que faz |
|---|---|
| `scripts\!ABRIR-A-PORTA-DE-1-DOLAR.bat` | um clique, ordena no topo da pasta |
| `scripts/abrir-porta-de-1-dolar.sh` | a lógica, com as travas |

O script **nunca toca a árvore principal**: worktree isolada sobre
`origin/main`, cherry-pick, e só enfileira se `tsc` e os **dois** guardiões
ficarem verdes. Qualquer vermelho para com a explicação na tela e não enfileira
nada. Rodar duas vezes não faz mal: ele detecta a porta já aberta e sai
dizendo "nada a fazer".

Falsifiquei o que dava para falsificar sem executar a publicação:

· **detector de idempotência nos dois sentidos** — na main de hoje diz
  "fechada"; na worktree com o conserto diz "aberta". As duas menções residuais
  a `add_invoice_items` no arquivo consertado são comentários, e não casam com
  o padrão;
· **`bash -n`** verde;
· **o risco que já mordeu a casa**: a primeira versão fazia `rm -rf` na
  worktree com a junção `node_modules` dentro — o jeito conhecido de apagar
  `C:\kineo\node_modules`. O script agora desfaz a junção **antes**, confere se
  ela saiu, e **para** se não conseguiu.

### 7. O bat mentiu — e era a mentira mais cara possível

Rodei o caminho inteiro num modo `CONFERIR=1` que faz tudo **menos** enfileirar.
Foi assim que dois defeitos meus apareceram antes de chegarem ao fundador.

**(a) O `rm -rf` que a casa já conhece.** A primeira versão apagava a worktree
antiga com a junção `node_modules` dentro. Medi: essa junção **não sai** com
`rm -f`, `unlink` nem `find -type l -delete` — o Windows a trata como pasta, e
um `rm -rf` por cima é o jeito conhecido de apagar `C:\kineo\node_modules`. O
guarda que eu tinha posto disparou e salvou a pasta (conferido: intacta). A
correção não foi um guarda melhor: **o script deixou de apagar qualquer coisa**
e passou a criar worktree nova com o horário no nome.

**(b) O detector invertia, e dizia "nada a fazer".** O passo 1 era
`git show origin/main:...route.ts | grep -q add_invoice_items:`. Com `pipefail`,
o `grep -q` sai no primeiro acerto, o `git show` (160 KB, maior que o buffer do
pipe) morre de **SIGPIPE**, a pipeline vira 141 e o `!` **inverte a condição**.
Medido na mesma main fechada: **5 de 6 rodadas responderam "A PORTA JÁ ESTÁ
ABERTA"**. Um bat que diz "nada a fazer" é pior do que bat nenhum — o fundador
lançaria tranquilo com a porta trancada. `grep -c` lê a entrada inteira e não
gera SIGPIPE; depois da troca, **6 de 6** rodadas dizem "fechada".

**(c) O typecheck podia ficar verde sobre o nada.** O passo 2 montava
`node_modules` com `ln -s`. Neste Windows isso **não cria link — copia** 21.296
arquivos (0,31 GB) por rodada. Tentei trocar por `mklink /J` e a junção não
pegou; a cópia ficou como recuo. O que **não** ficou opcional foi a prova: o
script agora **exige** `node_modules/typescript/package.json` antes de
typecheckar e **para** se não achar — senão o `npx tsc` sai 0 sem compilar
nada e o verde é mentira. Custo aceito do clique: ~30 s e 0,31 GB.
Com isso o caminho inteiro está provado contra a main mais nova (`7ef8232c`):
worktree criada, cherry-pick limpo, `tsc` verde, os dois guardiões verdes, e
parada limpa antes da fila.

Não rodei o bat. Executá-lo enfileiraria uma mudança em `app/api/**`, que é
exatamente o que a trava me proíbe. Ele existe para o dono do caminho clicar.

## FECHAMENTO 09/09 08:30 — A ORDEM DA QUINTA

Substitui os fechamentos das 04:30 e das 07:33 **apenas na ordem e no passo 0**.
Todo o resto continua valendo.

### 0. ANTES DE TUDO — abrir a porta de $1 (eliminatório)

**Clique em `scripts\!ABRIR-A-PORTA-DE-1-DOLAR.bat` e depois em `SUBIR-SITE.bat`.**

Sem isto o lançamento não tem para onde mandar ninguém: o botão do Product
Hunt, o da galeria, o da cartela do vídeo e o dos três posts são **o mesmo
botão**, e hoje ele devolve erro em 100% dos cliques. Medido: 31 falhas, 5
pessoas, 0 pagamentos.

A prova de que valeu, 5 minutos depois de subir — esta consulta tem de parar de
crescer:

```sql
select count(*) from events
where name='checkout_failed'
  and metadata->>'reason'='payment_session_failed'
  and created_at > now() - interval '1 hour';
```

### 1 a 7 — a lista das 04:30, sem mudança

Criar a conta hoje · ficha com o nome **`Kineo AI`** (nunca `Kineo` puro) ·
agendar 10/09 00:01 PT · preencher `PH_LISTING_URL` quando a ficha existir ·
**crédito na fal por Pix ainda hoje** · 07:00 BRT de quinta responder tudo ·
nunca escrever "upvote", pedir **comentário**.

### O que está pronto

| peça | caminho |
|---|---|
| galeria, 6 imagens 1270x760 | `docs/ph/gallery-01..06.png` |
| vídeo de 60 s (7,7 MB, 60,03 s) | `docs/ph/kineo-ph-60s.mp4` |
| thumbnail | `docs/ph/kineo-ph-thumb.png` |
| textos prontos para colar | `docs/ph/PH-TEXTOS-2026-09-10.md` |
| página de pouso (conferida no celular e no desktop por r9) | `https://www.usekineo.com/ph` |
| o clique que abre a porta | `scripts\!ABRIR-A-PORTA-DE-1-DOLAR.bat` |

O kit está bom. Ele aponta para uma porta trancada, e agora a chave é um clique.

### Verificação desta rotação

`bash -n` verde · `test-ph-landing-2026-09-08` **15/0** · `test-ph-kit`
**65 · 1** — o vermelho é a porta, **de propósito**, e some sozinho no minuto
em que o bat rodar (provado: 66 · 0 com o conserto aplicado). Não rodei `tsc`
como prova desta entrega porque ela não tem uma linha de TypeScript: os dois
arquivos novos são `.sh` e `.bat`.
