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
