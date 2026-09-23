# Decisão — barra de créditos no pop-up (23/09/2026)

**Fundador, 23/09:** "vai com mínimo 50, escada aprovada, pode liberar".

**Exceção registrada ao congelamento de preço e oferta até 09/10/2026** (docs/DECISAO-RESTAURACAO-2026-09-09.md): o
fundador liberou a barra antes do fim do congelamento. Planos, trial e todos os outros preços continuam congelados.

## O que mudou

- O pop-up de créditos (`components/CreditsTopupModal.tsx`, aberto pelo chip de créditos da barra lateral e pelos 402
  de Images/Audio) trocou os 4 pacotes fixos por UMA barra: 50 a 2.000 créditos, de 10 em 10, padrão 300.
- Checkout: `/api/stripe/checkout?pack=credits_custom&credits=N`. O preço é SEMPRE recalculado no servidor
  (`lib/credits/creditSlider.ts`); mesma regra de quem pode comprar do top-up (planos pagos), mesma moeda de
  liquidação (Brasil paga em reais pela fórmula da casa, com Pix), crédito pelo webhook via `metadata.pack_credits`.
- Os pacotes antigos (topup40/120/100/300) continuam vendáveis por link direto; só saíram do pop-up.

## Escada aprovada

US$ 0,199 por crédito até 100 → cai em linha reta até US$ 0,149 em 1.000 → plana até 2.000. Preço em dólares inteiros
arredondados − US$ 0,10 (etiqueta ",90").

| Créditos | US$ | por crédito | R$ |
|---|---|---|---|
| 50 | 9,90 | 0,198 | 49,90 |
| 100 | 19,90 | 0,199 | 99,90 |
| 300 | 55,90 | 0,186 | 279,90 |
| 500 | 87,90 | 0,176 | 439,90 |
| 1.000 | 148,90 | 0,149 | 744,90 |
| 2.000 | 297,90 | 0,149 | 1.489,90 |

Piso 0,149 acima do plano mais barato por crédito (≈ 0,133): assinar continua sendo o melhor negócio.
Margem no pior caso (Kling 3) ≈ 45% no fundo da escada.

## Medir

`checkout_started` / `payment_success` com `sku`/`pack` = `credits_custom` e `credits` na metadata: quantos compram,
ticket médio, e a distribuição de quantidades (onde as pessoas soltam a bolinha). Comparar com os 4 pacotes antigos
(30 dias antes). Contexto de origem: 23/09 21:20Z, comprador vindo do ChatGPT levou 30 créditos por $5,90.

Guardião: `scripts/test-barra-de-creditos-2026-09-23.mjs` (todos os degraus, invariante do plano, reais, rota, pop-up,
4 mutantes).
