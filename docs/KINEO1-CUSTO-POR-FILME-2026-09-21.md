# KINEO 1 — QUANTO CUSTA CADA FILME (21/09/2026)

Pergunta do fundador: "quanto está custando o Kineo quando o primeiro usuário usa? Tem diferença entre o
primeiro vídeo e o segundo, terceiro, quarto."

## Base de cálculo
- **Medição da casa (20/08)**: Kineo 1 de 60 s ≈ **US$ 0,33** de Creatomate + OpenAI (comentário em
  `lib/checkoutPricing.ts`; é o número que sustenta `FAST_USD_PER_CREDIT = 0.066`). Escala ~linear com a
  duração (Creatomate cobra por minuto renderizado): 35 s ≈ 0,22 · 45 s ≈ 0,27 · 60 s ≈ 0,33.
- O que entrou **depois** de 20/08 e NÃO está nesse número:
  - **Lyria 3 Pro** (trilha gerada por filme, desde 01/09): US$ 0,08 por faixa (`lib/lyriaMusic.ts`).
  - **Still FLUX** (híbrido, desde 16/09): `flux/dev` a US$ 0,025/MP × ~1,0 MP (portrait_16_9) ≈ **US$ 0,026**
    por still (28 passos custam o mesmo que 4 — a fal cobra por megapixel).
  - **Seedance 1.5 Pro** (só no 1º filme de conta gratuita, desde 17/09): US$ 0,13 por clipe de 5 s sem áudio.
- Medido em `events` nos últimos 4 dias (compose_submission_claim × fast_ai_still × fast_ai_clips_result):

| Coorte | Filmes | Duração média | Stills/filme | Seedance/filme | Créditos cobrados |
|---|---|---|---|---|---|
| 1º filme de conta gratuita (trial) | 32 | 45 s | 2,3 | 3,0 | 3,9 (do trial de 10) |
| Filmes seguintes / conta paga | 12 | 41 s | 4,1 | 0 | 3,5 |
| Cota grátis semanal (15 s) | 0 nesta janela | 15 s | ~1-2 | 0 | 0 |

## O custo por filme, hoje

| | 1º filme (trial) | 2º, 3º, 4º… (trial ou pago) | Cota grátis semanal (15 s) |
|---|---|---|---|
| Creatomate + OpenAI (TTS-hd, Whisper, GPT do roteiro/plano/juiz) | 0,27 | 0,25 | ~0,10 |
| Lyria (trilha) | 0,08 | 0,08 | 0,08 |
| Stills FLUX | 2,3 × 0,026 = 0,06 | 4,1 × 0,026 = 0,11 | ~0,04 |
| Seedance (3 clipes) | 3 × 0,13 = **0,39** | — | — |
| **Total** | **≈ US$ 0,80** | **≈ US$ 0,44** | **≈ US$ 0,22** |
| Receita direta | 0 (créditos de trial) | 3,5 cr × US$ 0,165 (Starter) ≈ 0,58 | 0 |

Onde vai o dinheiro do **primeiro** filme: Seedance 49% · Creatomate ~30% · Lyria 10% · stills 7% · OpenAI ~4%.
O primeiro filme custa **1,8×** o seguinte — por decisão do fundador (17/09, "max 0,5 teto" para o upside de
vídeo): o adicional de Seedance + stills é US$ 0,45, dentro do teto.

## O que isso muda (alerta, não decisão)
- `FAST_USD_PER_CREDIT = 0.066` (o piso do guardião de margem) ficou **velho**: com Lyria + stills, o Kineo 1
  pago custa ~US$ 0,44 por 3,5 cr = **US$ 0,126/cr** (quase 2×). No Starter (US$ 9,90 / 60 cr = US$ 0,165/cr) a
  margem do Kineo 1 puro cai para ~24% — em cima do piso de 24% do guardião, que hoje olha para um número que
  não existe mais. **Preço e crédito não mudam** (regra da casa até 09/10); o que precisa mudar é a constante,
  para o guardião voltar a proteger de verdade. Decisão de reprecificação = fundador.
- A alavanca mais barata para baixar o custo sem tocar em qualidade: **Lyria por humor com cache** (a mesma
  trilha instrumental serve dezenas de filmes do mesmo humor) — US$ 0,08 → ~0,01 por filme.

## Dry-run do Kling 3 (21/09, conta do fundador, US$ 0)
`POST /api/generate-video-cinematic` `{ engine: 'hollywood', duration: 35, script_mode: 'verbatim', dry_run: true }`,
roteiro Lituya Bay 1958 (84 palavras). Duas recusas corretas do portão antes (31 s e 33 s de fala para 35 s —
"adicione N palavras", nada cobrado). Com 84 palavras: **PASS** — 5 cenas (6/7/8/8/11 s), 40 s de história,
0 s mudos, silêncio dentro de cena ≤ 1,2 s, `dispatch_preview` com `kling-video/o3/pro/image-to-video`
(âncora) em todas, `preflight_problems: []`, `visual_mode: documentary_faceless`. As âncoras a 28 passos só se
exercitam no render real (o dry-run para antes de qualquer POST pago).

Roteiro para o teste da tarde (35 s, "Use my script as is", Kling 3, 150 cr):
```
On July 9, 1958, a violent earthquake shook Lituya Bay in Alaska.
Ninety million tons of rock fell into the narrow water all at once.
The splash climbed the opposite mountainside to 1,720 feet — taller than the Empire State Building.
Two fishermen rode the giant wave in their small boat and lived to describe it.
Whole forests were stripped from the slopes like matchsticks.
The megatsunami of Lituya Bay remains the tallest wave ever recorded on planet Earth.
```
