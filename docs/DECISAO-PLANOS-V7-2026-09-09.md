# Decisão — Planos V7: $14 / $29 / $59 com 60 / 150 / 300 (08/09/2026, ~20h BRT)

**Ordem do fundador:** "quero aumentar de todos os nossos planos, para que sejam compatíveis" (com os pares de mercado) → "Aprovo $14/$29/$59 com 60/150/300".

## Por quê

O benchmark do Board (08/09, `C:/kineo-wt/board-caixa-12h-20260908/docs/BENCHMARK-PRECOS-QUANTIDADES-CONCORRENTES-2026-09-08.md`) e a comparação par a par mostraram que, a $9/$19/$29, a Kineo entregava **mais filmes que todos os pares em todas as faixas** e cobrava menos que o mercado. A decisão: subir para a faixa dos pares mantendo mais filmes que eles, e ganhar margem para afiliado e taxa.

| Plano | V6 (08/09 manhã) | **V7 (09/09)** | Créditos | Filmes de 60 s | Par de mercado |
|---|---|---|---|---|---|
| Starter | $9 | **$14** | 60 | 12 Kineo 1 | AutoShorts $19 = 13 por imagem |
| Creator | $19 | **$29** | 150 | 30 Kineo 1 ou 6 Seedance | HeyGen $29 = 5 Seedance |
| Studio | $29 | **$59** | **300** (era 180) | 60 Kineo 1 · 12 Seedance · 6 H3 (45cr) · 2 Kling 3 — filmes de 60 s, por motor | AutoShorts $69 = 60 por imagem · InVideo $100 |

Anual = 10× o mensal ($140 / $290 / $590). Margem pior caso (motor mais caro do plano, antes de taxa e afiliado): 72% / 58% / 41%.

## O que muda para o cliente

- A porta de $1 continua igual (7 dias de Creator, 80 créditos) e passa a dizer **"depois $29/mês"** sozinha: o rótulo deriva de `TIER_PRICES.basic` (lib/entryPolicy.ts `CREATOR_USD`).
- Studio ganha 300 créditos: 2 filmes Kling 3 por mês em vez de 1.
- **Quem já assina paga o preço antigo** (a Stripe cobra o que está na assinatura) e recebe na renovação o grant que esse preço comprava: `renewalCreditsFor(tier, invoice.amount_paid)` → fatura abaixo do preço vigente = `LEGACY_TIER_CREDITS_V6` (60/150/180). Studio a $29 segue com 180.

## Onde vive

- Fonte única: `lib/checkoutPricing.ts` (TIER_PRICES, ANNUAL_PRICES, INTRO_PRICES, TIER_CREDITS, LEGACY_TIER_CREDITS_V6, renewalCreditsFor).
- Webhook: `app/api/stripe/webhook/route.ts` (renovação).
- Porta: `lib/entryPolicy.ts` (copy derivada).
- Página dos motores: `app/ai-video-generator/[engine]/page.tsx` (STUDIO_USD).
- llms.txt: changelog 2026-09-09; a entrada de 08/09 marcada como superada.
- Placar: `VERSAO_B_SINCE` anda para 2026-09-09 00:00 UTC (a porta mudou de promessa; a medição recomeça). O dia 08/09 fica registrado em docs/PLACAR-VERSAO-B-2026-09.md.
- PayPal (`lib/paypalCatalog.ts`), Dodo (`lib/dodoCatalog.ts`) e admin (`_shared/mrr` ← `lib/pricing.ts`) derivam da fonte; nada literal.
- Guardião: `scripts/test-preco-v7-2026-09-09.mjs` (executa a régua da renovação com 8 casos).

## Fora do código (fundador / Cowork)

- Dodo: produtos ao vivo em $14 / $29 / $59 (brief `docs/COWORK-PRECOS-V7-2026-09-09.md`).
- TAAFT: ficha em $14/$29/$59 (`docs/TAAFT-LISTING-2026-09-03.md` já atualizada).
- GPT: bloco de sincronização (na resposta do dia).
- Reddit: anúncio diz "7 days of Creator for $1" — continua verdadeiro.

## Riscos declarados

- **$29 na porta é pedido maior que $19.** Critério: se a porta não converter em 7 dias (16/09), fallback Creator $24.
- **Afiliado 40% recorrente** come a margem do Studio no pior caso (H3: $34,80 de custo + $23,60 de comissão em $59). Decisão pendente do fundador: comissão só no primeiro pagamento.
- A medição da porta (Reddit, rotinas da noite) recomeça no marco 09/09 00:00 UTC.
