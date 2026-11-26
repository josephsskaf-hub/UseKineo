# Black Friday 2026 nos três planos anuais (KINEO-BF-TODOS-ANUAIS-2611)

**Ordem do dono (26/11/2026, palavras dele):** "Eu quero que você coloque todos os planos no Black Friday com 50% de margem de desconto. Independentemente da margem. Então, todos os planos estão com 50% de desconto. No plano anual".

**Leitura da CEO:** a Black Friday de 2026 passa a dar 50% no plano ANUAL de Starter, Creator e Studio. Até agora dava só no Starter (KINEO-BF-SO-STARTER-2311, fundador 16/11).

## O que mudou

| Arquivo | Mudança |
|---|---|
| `lib/billing/blackFriday2026.ts` | `BF2026_TIERS = ['starter', 'basic', 'pro']`. O comentário novo traz a ordem e a conta de margem, e o histórico de 16/11 continua no arquivo. `BF2026_PLAN_LABEL` = "Starter, Creator and Studio". Constantes novas: `BF2026_COVERS_EVERY_ANNUAL_PLAN`, `BF2026_OFFER_SCOPE` ("every annual plan") e `BF2026_OFFER_SCOPE_KINEO`. As três nascem da lista, então tirar um plano desliga sozinho a frase "every". O assunto e o corpo das cartas que ainda vão sair (27/11 e 30/11) passam a dizer "every Kineo annual plan (Starter, Creator and Studio)" e listam os 3 preços. |
| `lib/billing/annualWelcomeOffer.ts` | `resolveAnnualOffer`: na Black Friday aceita os 3 anuais (`TIERS_DA_BF`). Antes o Studio caía fora porque a regra exigia `TIERS_COM_ANUAL`, que não tem o Studio. Sem esta linha, o Studio logado pagaria US$ 354 em dólar, mas em reais seria cobrado o anual NORMAL (R$ 2.477,90), sem carimbo da oferta e com recuperação de sessão ligada. As 3 h da conta nova continuam só em Starter e Creator. |
| `app/pricing/PricingClient.tsx` | O cartão anual, na Black Friday, segue `bf2026CoversTier` (os 3). Fora dela continua com as 3 h (`annualOfferCoversTier`, sem o Studio). Assim o cartão mostra o mesmo preço que o checkout cobra, o Studio incluído. |
| `components/BlackFridayBanner.tsx` | Faixa: "Black Friday: 50% off every annual plan · ends Dec 1 →". Selo do /pricing: "50% off every annual plan (Starter, Creator and Studio), no code needed. Monthly plans keep their regular price." |
| `app/black-friday/page.tsx` | Os 3 cartões, cada um com o seu botão. Título, descrição e h1 dizem "every annual plan". Na pergunta "Are Creator and Studio included?" a resposta virou "Yes.". O rodapé diz que o mensal não entra. Nenhum preço está digitado: todos saem de `bf2026PriceRows()`. |

**O que NÃO mudou:**
- preço mensal, preço anual normal, `ANNUAL_WELCOME_PRICES` (US$ 54 / 114 / 354; R$ 269,90 / 569,90 / 1.769,90);
- créditos, débito de crédito, webhook e recarga anual (`annualRefill` já reconhecia o preço de boas-vindas dos 3 planos);
- a janela (24/11 05:00Z a 02/12 05:00Z, fim exclusivo);
- "só anual", "só `planAcceptsPromotions`" e "nunca no teste com cartão". Na rota, o teste com cartão só existe no mensal, e o portão recusa `wantsTrial` de qualquer jeito;
- quem paga o preço da oferta renova nele (price_data inline);
- quem já assina mantém o preço e os créditos (a troca de plano não aplica a oferta);
- nada foi mexido na Stripe.

## Casos executados (funções reais, sem Stripe)

`npx tsx scripts/test-bf-todos-anuais-2611.mjs`. Simula o checkout logado com conta velha que já pagou, na mesma ordem da rota.

| Caso | Esperado | Cobrado (US$ · R$) | Resultado |
|---|---|---|---|
| Starter anual, na janela (27/11 15:00Z) | preço da oferta | $54 · R$ 269,90 | PASS |
| Creator anual, na janela (27/11 15:00Z) | preço da oferta | $114 · R$ 569,90 | PASS |
| Studio anual, na janela (27/11 15:00Z) | preço da oferta | $354 · R$ 1769,90 | PASS |
| Starter mensal, na janela | preço normal | $9 · R$ 44,90 | PASS |
| Creator mensal, na janela | preço normal | $19 · R$ 94,90 | PASS |
| Studio mensal, na janela | preço normal | $59 · R$ 294,90 | PASS |
| Starter anual, 1 ms antes da janela (24/11 04:59:59.999Z) | preço normal | $76 · R$ 377,90 | PASS |
| Creator anual, 1 ms antes da janela | preço normal | $160 · R$ 797,90 | PASS |
| Studio anual, 1 ms antes da janela | preço normal | $496 · R$ 2477,90 | PASS |
| Starter / Creator / Studio anual, 1ª fração da janela (24/11 05:00Z) | preço da oferta | $54 / $114 / $354 | PASS |
| Starter / Creator / Studio anual, no fim exclusivo (02/12 05:00Z) | preço normal | $76 / $160 / $496 | PASS |
| Starter / Creator / Studio anual, depois (03/12 12:00Z) | preço normal | $76 / $160 / $496 | PASS |
| Starter / Creator / Studio anual, teste com cartão, na janela | preço normal | $76 / $160 / $496 | PASS |
| Business (`planAcceptsPromotions` = false), anual e mensal, na janela | preço normal | portão fechado, sem oferta | PASS |
| Lista e frase da tela | os 3 anuais | Starter, Creator and Studio · "every annual plan" | PASS |

## Conta de margem (pior caso, `worstCaseCogsUsd` do código)

O pior caso supõe todos os créditos do mês gastos no motor mais caro. É o custo máximo, não o custo médio.

| Plano | Créditos/mês | Oferta por mês (anual ÷ 12) | Custo máximo/mês | Margem no pior caso/mês |
|---|---|---|---|---|
| Starter | 40 | US$ 4,50 | US$ 2,64 | + US$ 1,86 |
| Creator | 150 | US$ 9,50 | US$ 16,65 | − US$ 7,15 |
| Studio | 470 | US$ 29,50 | US$ 53,52 | − US$ 24,02 |

No pior caso, Creator e Studio dão margem negativa. Foi por isso que o fundador os tirou em 16/11. A ordem de 26/11 aceita isso ("independentemente da margem"). A taxa da Stripe (2,9% + US$ 0,30 por cobrança) não entra na tabela.

## Provas

- `npx tsc --noEmit -p .` = 0 erros.
- `scripts/test-bf-so-starter-2311.mjs` foi reancorado sem afrouxar: agora fixa os 3 anuais e mata 52 de 52 mutantes. Entre eles: tirar o Creator, tirar o Studio, voltar ao só-Starter, 50% no mensal, relógio ignorado, janela um dia antes ou um dia depois, teste com cartão, Studio fora da regra (reais errados), copy de volta ao Starter e /pricing sem o Studio na BF. Os 4 mutantes do "item 1" ficaram equivalentes com o Creator dentro da BF (mesma resposta em todo instante) e saíram, com o motivo escrito no arquivo.
- `scripts/test-black-friday-2026.mts`, `scripts/test-precos-0511.mjs` e `scripts/test-oferta-3h-0411.mjs` foram reancorados nos 3 planos. O primeiro e o terceiro já estavam vermelhos na origin/main por motivos de fora (convidado mensal, /conferencia-receita, âncora do llms.txt) e seguem com exatamente as mesmas falhas da main.
- `bash scripts/ci/novos-vermelhos.sh 'bf|black|checkout|pricing|annual|welcome|promo|regiao'` em `e8f40cc2c`, com a árvore limpa (26/11 17:50): 81 guardiões rodados, 14 vermelhos no ramo, os mesmos 14 já vermelhos na origin/main, **0 vermelhos novos**.
