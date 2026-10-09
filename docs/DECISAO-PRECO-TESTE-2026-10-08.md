# Teste de preço: Starter US$ 9,90 e Creator US$ 19,90 por 7 dias (KINEO-PRECO-TESTE-2026-10-08)

**Decisão do fundador, 08/10/2026, ~23h BRT.** Ele respondeu "tudo sim" à recomendação de voltar o Starter a
US$ 9,90 por 7 dias. Na mesma conversa, acrescentou: "e se a gente abaixar o valor do plano Creator também,
porque ele me traz receita boa". O Studio não entrou na decisão e fica em US$ 54,90.

## Por quê

Medi 10,1 dias antes e 10,1 dias depois da subida para a V8-A (deploy em 28/09 23:53 UTC). Contas internas ficaram de fora.

| 10 dias | antes da subida | depois |
|---|---|---|
| visitantes (landing_session_started) | 1.842 | 1.883 |
| cadastros | 196 | 184 |
| viram preços | 73 | 107 |
| abriram o checkout | 22 | 21 |
| **assinaram** | **4** | **1** |

Até o checkout, os números ficaram iguais. O que caiu foi quem paga depois de ver o preço. Isso bate com a conclusão
fechada em 19/08: o vazamento do checkout é o preço.

As 7 assinaturas desde 01/09 vieram de gente que comprou até 30 minutos depois do cadastro, sem ter feito nenhum
vídeo. A decisão de compra acontece na página de preços, não no produto.

Os números são pequenos (4 contra 1). Sozinhos não provam nada; o teste existe justamente para medir.

## O que muda

| plano | antes (V8-A) | no teste | anual (30% off) | BRL mensal / anual |
|---|---|---|---|---|
| Starter (60 cr) | US$ 12,90 | **US$ 9,90** | US$ 108 → **US$ 83** | R$ 64,90 / 545,90 → **R$ 49,90 / 419,90** |
| Creator (150 cr) | US$ 29,90 | **US$ 19,90** | US$ 250 → **US$ 167** | R$ 149,90 / 1.259,90 → **R$ 99,90 / 839,90** |
| Studio (300 cr) | US$ 54,90 | US$ 54,90 | US$ 460 | R$ 274,90 / 2.309,90 |

- Os créditos não mudam: 60 / 150 / 300.
- **Quem já assina** a US$ 12,90 ou 29,90 continua pagando o que assinou, porque a Stripe cobra o valor da assinatura.
  A renovação dá o mesmo grant de antes: renewalCreditsFor dá o grant cheio quando a fatura é igual ou maior que o preço vigente.
- **Anual no 2º mês** (desligado até depois de 11/10): quem paga ACIMA do vigente recebe o menor valor entre a conta
  e o anual do site. Assim, US$ 12,90 → US$ 83 e US$ 29,90 → US$ 167, e o mesmo plano nunca tem dois preços anuais.
  Detalhes em docs/ANUAL-NO-2o-MES-2026-10-08.md.
- **Clipes:** o preço em créditos NÃO muda. A régua de mercado dos clipes (05-06/10) usa o crédito do Creator como
  referência, e essa referência fica congelada em US$ 29,90 / 150 (lib/clips/clipPricing.ts). Se a referência
  acompanhasse o teste, todo clipe ficaria uns 50% mais caro em créditos sem decisão do fundador.
- **PayPal:** os planos sobem para a v5, porque um plano v4 já criado cobraria o preço antigo para sempre.
- **Páginas:**
  - os preços saem da fonte única;
  - o "Prices as of" das 4 páginas citáveis vai para 9 October 2026;
  - o llms.txt passa a dizer o preço da V8-A com números fixos (antes ele repetia o preço vigente na linha de 28/09)
    e ganha a linha de 09/10.

## O que o fundador precisa saber

- **Margem no pior caso:** é o caso em que o cliente gasta todos os créditos no motor mais caro (worstCaseCogsUsd).
  - Starter: 49% → **33%**.
  - Creator: 42% → **12%**.
  - Studio: 37%, sem mudança.
  - O Creator a US$ 19,90 ainda dá lucro nesse caso, mas pouco. Era o mesmo risco da V5 (09/09 a 28/09).
- **Crédito mais barato da casa:** passa a ser o do Creator (US$ 0,133), não o do Studio (US$ 0,183). Duas consequências:
  - o clipe de Seedance 2.5 (5 s = 8 cr, chamariz decidido em 06/10) fica perto do zero a zero para quem paga Creator;
  - o filme de Kling 2.5 (60 cr) fica levemente no prejuízo no pior caso.
  - O gate de motores por plano está desligado desde 09/09 (lib/enginePlanGate.ts), então o Creator usa todos os motores.
- **GPT "Kineo Video Maker":** as instruções coladas no GPT têm o preço digitado.
  - O texto atualizado está em docs/GPT-INSTRUCOES-V3-COLAR-2026-09-24.txt e precisa ser colado de novo no editor do GPT.
  - O app da Kineo no ChatGPT (MCP, kineo_facts) lê o preço ao vivo e não precisa de nada.
- **Anúncios do Microsoft (piloto ligado em 08/10):** os títulos e descrições dizem "Plans From $12.90" e
  "Creator $29.90". Depois do deploy, os textos são trocados para o preço do teste.

## Como medir (16/10)

1. O marco é o instante do deploy deste commit (Vercel, estado READY).
2. Contar payment_success com checkout_mode = subscription e created_at > marco, contra a mesma janela antes do marco.
   Contas internas ficam de fora, e a exclusão é feita com NOT EXISTS.
3. Medir também "abriram o checkout → assinaram" (checkout_started, pessoas distintas). Se a taxa voltar perto dos 18%
   de antes da V8-A (4/22), o preço era a trava.
4. Ver o mix: se o Creator a US$ 19,90 puxa assinaturas que iriam para o Starter, a receita por assinatura sobe.

## Como reverter

- Voltar TIER_PRICES, INTRO_PRICES e ANNUAL_PRICES (lib/checkoutPricing.ts) e BRL_PLAN_PRICES_MINOR
  (lib/settlementCurrency.ts) aos valores da V8-A.
- Na mesma mudança:
  - voltar o espelho de lib/entryPolicy.ts;
  - acrescentar uma linha nova no llms.txt;
  - subir o PayPal para v6;
  - decidir se o "Prices as of" muda;
  - re-ancorar os guardiões (test-preco-v8-A, test-pacote2-precos, test-moeda-local, test-anual-2mes e test-preco-teste-2026-10-08).
- Quem assinar a US$ 9,90 ou 19,90 durante o teste continua nesse preço (a assinatura guarda o valor). A escada
  legada (LEGACY_V5_PRICES_USD 990/1990/3990) já trata essas faturas como grant cheio 60/150/300.

Guardião: scripts/test-preco-teste-2026-10-08.mjs.
