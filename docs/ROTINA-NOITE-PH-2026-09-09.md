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
