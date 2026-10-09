# Madrugada de 09/10/2026 — "o preço baixou" + margem com 20% (KINEO-PRECO-CAIU-2026-10-09)

Pedido do fundador (~03h30 BRT, antes de dormir): "fica aí trabalhando a madrugada para trazer cliente de formas
diferentes, coisas que a gente não fez ainda… a gente precisa ter 50 clientes no final desse mês." E: "calcula pra ver se
a gente consegue dar os 20% em todos os planos… me calcula a margem com os planos que a gente tem hoje."

## 1. A carta "o preço baixou" (pronta, NÃO enviada)

**Por quê:** a conclusão fechada da casa é que o vazamento do checkout é PREÇO (CLAUDE.md, 19/08). Às 03:38 UTC de 09/10 o
Starter foi de US$ 12,90 para US$ 9,90 e o Creator de US$ 29,90 para US$ 19,90. Quem travou no preço antigo não sabe.
Nenhuma carta da casa disse isso até hoje: as de checkout falavam de cupom, crédito ou filme.

**Para quem (medido 09/10):** abriu o checkout entre 28/09 e 09/10 03:38 UTC (a V8-A). Foram 21 pessoas; 18 nunca pagaram;
1 é conta da casa. Ficam de fora quem pagou, quem saiu da lista, conta da casa, quem já recebeu esta carta e quem recebeu
outra carta nossa nas últimas 24 h (a supressão da casa).

**O que diz:** "era X, agora Y" do Starter e do Creator; o que o Creator faz por mês (imagens Nano Banana Pro e filmes
Seedance de 60 s, das funções da casa); o filme da própria pessoa, se ela tiver um; e o botão para o /pricing já no mensal
(`?billing=monthly`, os mesmos números da carta). Assinada pelo Joseph, `joseph@usekineo.com`.

**A trava:** se o teste de 7 dias acabar e o preço voltar, a rota responde 409 `price_not_lower` e não envia nada.

**Como disparar (fundador, logado no site):**
1. Conferir (não envia): `https://www.usekineo.com/api/admin/send-price-drop`
2. Enviar: `https://www.usekineo.com/api/admin/send-price-drop?confirm=SEND`

Rota: `app/api/admin/send-price-drop/route.ts` · regra pura: `lib/growth/priceDrop.ts` · carimbo `price_drop_1009_sent`
(na lista da supressão, `lib/lifecycle/emailEvents.ts`) · guardião `scripts/test-preco-caiu-2026-10-09.mjs` (9 mutantes).
Medir: cliques com `utm_campaign=price_drop_1009` e `payment_success` dessas pessoas.

## 2. Margem com 20% (a conta que o fundador pediu)

Taxa da Stripe da casa (`netAfterStripeUsd`: 2,9% + US$ 0,30). Custo por crédito pelos números de fatura em
`lib/clips/clipPricing.ts` (fal) e `lib/supplier/burn.ts` ("não existe motor barato em termos de crédito", ~US$ 0,10/cr).

Três cenários de custo:
- **Uso real:** medido em 09/10, os 12 assinantes gastaram 665 de 1.470 créditos em 30 dias (45%), a ~US$ 0,10/cr.
- **Uso total:** o assinante gasta 100% dos créditos, a ~US$ 0,10/cr.
- **Pior caso:** 100% no motor mais caro por crédito (filme Kling 2.5: US$ 8,40 / 60 cr = US$ 0,14/cr).

| Plano | Cobrança | Preço/mês | Margem uso real | Margem uso total | Margem pior caso |
|---|---|---|---|---|---|
| Starter | mensal hoje | $9.90 | 71% | 36% | 10% |
| Starter | mensal −20% | $7.92 | 63% | 19% | −14% |
| Starter | anual hoje (−30%) | $6.92 | 59% | 10% | −26% |
| Creator | mensal hoje | $19.90 | 64% | 21% | −10% |
| Creator | mensal −20% | $15.92 | 55% | 1% | −39% |
| Creator | anual hoje (−30%) | $13.92 | 50% | −11% | −56% |
| Studio | mensal hoje | $54.90 | 74% | 43% | 21% |
| Studio | mensal −20% | $43.92 | 68% | 29% | 1% |
| Studio | anual hoje (−30%) | $38.33 | 64% | 19% | −13% |

Leituras:
- No uso real, 20% cabe em todos os planos (margem de 55% a 68%).
- Para quem usa tudo, o Creator a −20% fica no zero a zero.
- O anual de hoje (−30%, a página já abre nele, com o mensal riscado) já é o desconto "na cara" mais agressivo da página.
- O pior caso da casa (`WORST_CASE_USD_PER_CREDIT = 0,116`, H3 de 20/08) está velho: o filme Kling 2.5 a 60 cr custa
  US$ 0,14/cr. Isso vale um conserto de preço, decisão do fundador.

Opções levadas ao fundador (decisão dele):
- **A ✅ — 20% no 1º mês, visível no cartão, Creator e Studio mensais.** É o WELCOME20 que já existe e já foi aprovado
  (25/08), hoje escondido num pop-up. Risco só no 1º mês. Margem de uso real nesse mês: 55% / 68%.
- **B — A + Starter.** Regra nova no checkout: hoje o WELCOME20 recusa o Starter. 1º mês do Starter: 63% de margem em uso
  real, −14% no pior caso.
- **C — 20% para sempre no mensal.** Não recomendado: Creator de uso total vira zero a zero.

Conta reexecutável: `node scripts/conta-margem-20-2026-10-09.mjs` (lê `lib/checkoutPricing.ts` pelo loader offline; os números
acima saíram dele; o uso real de 45% é a medição de 09/10 e fica fixo no script).
