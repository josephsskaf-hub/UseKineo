# DECISÃO DE PREÇOS V8 — OPÇÃO A (ESCADA 13/30/55) — 28/09/2026

**STATUS: AGUARDA O VAI DO FUNDADOR.** Código pronto e commitado na branch
`codex/preco-v8-A-0928` (worktree `C:\kineo-wt\preco-A`), **não enfileirada**.
Nada foi publicado. Produção segue na V5 restaurada ($9,90 / $19,90 / $39,90).

## A decisão (fundador, 28/09)

"Subir um pouco o preço, 3 degraus como o mercado" (tier 1 / tier 2 / tier 3).
Os créditos **não** mudam; o anual segue 10× o mensal (2 meses grátis); o intro
segue espelhando o mensal (nenhum "1º mês com desconto"); "Most popular" fica no
Creator (já é assim em `app/pricing/PricingClient.tsx`).

## Tabela antiga → nova

| Plano   | Créditos | V5 restaurada (09/09→) | V8-A mensal | V8-A anual (10×) | BRL mensal / anual (tabela) |
|---------|---------:|-----------------------:|------------:|-----------------:|-----------------------------|
| Starter |       60 | US$ 9,90 / anual 99    | **US$ 12,90** | US$ 129        | R$ 64,90 / R$ 649,00        |
| Creator |      150 | US$ 19,90 / anual 199  | **US$ 29,90** | US$ 299        | R$ 149,90 / R$ 1.499,00     |
| Studio  |      300 | US$ 39,90 / anual 399  | **US$ 54,90** | US$ 549        | R$ 274,90 / R$ 2.749,00     |

Centavos na fonte (`lib/checkoutPricing.ts`): TIER_PRICES 1290 / 2990 / 5490 ·
ANNUAL_PRICES 12900 / 29900 / 54900 · INTRO_PRICES 1290 / 2990. BRL
(`lib/settlementCurrency.ts`, `BRL_PLAN_PRICES_MINOR`): 6490/64900 ·
14990/149900 · 27490/274900 — cada mensal é exatamente `usdToBrlMinor(mensal)`
(câmbio da casa 5,0, terminando em ,90), conferido por `checkSettlementInvariants`.

## Margem no pior caso (calculada pelas funções da fonte)

Fórmula: líquido = `netAfterStripeUsd(preço)` = preço × 0,971 − 0,30;
COGS = `worstCaseCogsUsd(créditos)` = ⌊cr/45⌋ × 45 × US$ 0,116 (MiniMax H3, o
pior motor por crédito) + resto × US$ 0,066 (Kineo 1). Margem = (líquido − COGS) / líquido.

| Plano   | Líquido  | COGS pior caso | Sobra    | Margem |
|---------|---------:|---------------:|---------:|-------:|
| Starter | US$ 12,23 | US$ 6,21      | US$ 6,02 | **49 %** |
| Creator | US$ 28,73 | US$ 16,65     | US$ 12,08 | **42 %** |
| Studio  | US$ 53,01 | US$ 33,30     | US$ 19,71 | **37 %** |

Referência V5 restaurada (mesma conta): Starter 33 %, Creator 11 %, Studio 13 %.
O invariante (3) de `checkPricingInvariants` continua vazio; o guardião
`scripts/test-preco-v8-A-2026-09-28.mjs` trava os três percentuais.

## Quem já assina

- **Preço:** mantém. A Stripe cobra o que está na assinatura; nenhuma assinatura
  existente é tocada (não há Price ID por plano: o checkout cria `price_data` por
  sessão, então o número novo só vale para sessão nova).
- **Créditos na renovação** (`renewalCreditsFor` / `renewalCreditsForInvoice` /
  `annualRefillCredits`): a régua antiga dizia "pagou menos que o vigente → grant
  V6 (60/150/180)". Isso mandaria o Studio de US$ 39,90 — que hoje recebe 300 —
  para 180 na primeira renovação após a subida. A V8-A troca por uma **escada
  por fatura**: fatura ≥ preço V5 do plano (990/1990/3990; anual 10×; em reais
  4990/9990/19990) → **60/150/300 (mantém)**; abaixo disso (assinantes V6 a
  $7/$15/$29, ou V7 $14/$29) → 60/150/180, como já era.
  Constantes novas: `LEGACY_V5_PRICES_USD`, `LEGACY_TIER_CREDITS_V5`,
  `legacyCreditsForUsd()`, `LEGACY_V5_BRL_PLAN_PRICES_MINOR`.

## O que muda sozinho ao ligar (derivado da fonte)

/pricing e PricingCards (`lib/pricing.ts` PLANS), llms.txt (+ linha de changelog
28/09), `lib/kineoFacts.ts`, comparações `/vs`, catálogo PayPal e Dodo, e-mail da
cota semanal (agora derivado), CTA "See plans — from …" do Studio (agora derivado),
calculadora/FAQ que leem `TIER_PRICES`.

Literais espelhados em módulos puros, atualizados à mão e travados pelo guardião:
`lib/entryPolicy.ts` ("Plans start at $12.90/month"), `lib/enginePlanGate.ts`
("$54.90/mo"), `lib/ads/offer.ts` (lista de valores ocupados: anuais
12900/29900/54900; 9900 fica só com o piloto), comentários do webhook,
`docs/GPT-KINEO-VIDEO-MAKER.md` (instruções da loja do GPT), `docs/KIT-AFILIADOS-2026-09-08.md`.

`AMBIGUOUS_ONE_TIME_USD_AMOUNTS` ficou vazia: o Starter anual saiu de 9900 e o
piloto de US$ 99 voltou a ser o único dono do valor (o invariante (6) exige tirar
a entrada obsoleta).

## Decisões que ficam com o fundador (abertas)

1. **Barra de créditos (`lib/credits/creditSlider.ts`)** — a barra vende a
   US$ 0,199/cr até 100 créditos, afinando até US$ 0,149/cr em 1.000+. O Studio
   novo custa US$ 0,183/cr. A partir de ~390 créditos a barra fica **mais barata
   por crédito que o plano mais caro** (500 cr = US$ 87,90 → 0,176; 1.000 = 148,90
   → 0,149; 2.000 = 297,90 → 0,149). O guardião `test-barra-de-creditos-2026-09-23`
   (3) acusa isso e fica vermelho de propósito. Opções: (a) subir o piso da barra
   para ≥ US$ 0,184/cr (a barra inteira acima do Studio), (b) aceitar que
   assinante recarrega mais barato (é só para quem já paga). Nenhum número foi
   inventado no código: a barra está como estava.
2. **TAAFT** (listing externo, editado no painel do TAAFT) ainda diz "from $9.90/month";
   `docs/TAAFT-LISTING-2026-09-03.md` espelha o que está publicado e não foi alterado.
3. **Admin MRR** (`app/api/admin/_shared/mrr.ts` lê PLANS → preço vigente): assinantes
   antigos passariam a ser somados a US$ 12,90/29,90/54,90 no painel. A verdade
   está na Stripe (`amount_paid`); ajustar o painel é tarefa à parte.
4. **PayPal**: o id do plano deriva do preço (`plan_${tier}_${billing}_usd${preço}_c${cr}_v2`,
   `lib/paypalCatalog.ts:55`); conferir se `lib/paypal.ts` cria o plano novo sozinho
   na primeira sessão ou se precisa de setup (`/api/paypal/setup`).

## Como ligar (só depois do "vai")

Na worktree: `bash scripts/enfileirar.sh` (rebasa por cima da fila e move
`entrega-atual`), depois o fundador clica `SUBIR-SITE.bat`. Nunca `git branch -f`.
