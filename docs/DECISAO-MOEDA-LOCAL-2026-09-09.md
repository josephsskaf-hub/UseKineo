# DECISÃO — Dólar na vitrine, moeda do país no caixa (09/09/2026, noite)

## O que aconteceu

O fundador testou o funil de afiliados com o próprio cartão (conta
`josephsskaf+testeste1010@gmail.com`, código `5ENEDG6F`). Quatro dos cinco
degraus provaram (clique → cadastro com afiliado → referral → checkout). O
quinto morreu na Stripe: **"Moeda não aceita — cartões desta marca"**, evento
`checkout_payment_failed` com `card_country=BR`, `currency=usd`,
`reason_category=unsupported`, `network_status=not_sent_to_network`.

Causa: a conta Stripe da Kineo é **brasileira**. Cartão emitido no Brasil só
pode ser cobrado em **reais**; cartão estrangeiro pode ser cobrado em dólar.
Desde 19/08 (V6, "USD no mundo todo") a casa cobrava USD para todos — logo
**nenhum brasileiro conseguia pagar nenhum plano nem pacote**. Não era preço.

## O modelo (aprovado pelo fundador)

1. **Vitrine sempre em dólar.** $9,90 / $19,90 / $39,90 em todo card, para
   todo mundo. Nenhum Pix, real ou bandeira local aparece na página de preços.
   (Higgsfield, Runway, InVideo, Pika mostram só USD; Canva/Netflix mostram a
   moeda local. Nós: USD na vitrine porque somos globais, moeda local no caixa
   porque a conta é brasileira.)
2. **Ao clicar, o servidor decide a moeda da sessão**, uma vez, em
   `lib/settlementCurrency.ts` → `resolveSettlementCurrency`:
   `?currency=` (só links da casa) → recusa anterior de cartão BR em USD →
   IP = BR → navegador em pt-BR → USD.
3. **Tabela fixa em reais**, não câmbio do dia (câmbio da casa 5,0; etiqueta
   termina em ,90): **Starter R$ 49,90 · Creator R$ 99,90 · Studio R$ 199,90;
   anual 10×** (R$ 499 / 999 / 1.999). Pacotes e top-ups seguem a mesma fórmula
   (`usdToBrlMinor`). Revisão do câmbio da casa: **dia 9 de cada mês**
   (`BRL_HOUSE_RATE_NEXT_REVIEW = 2026-10-09`).
4. **Meios de pagamento por região, dentro do checkout, decididos pela Stripe:**
   sessão em BRL mostra cartão brasileiro, Apple/Google Pay e (quando ativo)
   Pix/Boleto; sessão em USD nunca mostra Pix. A rota **não fixa**
   `payment_method_types` de propósito.
5. **Rede de segurança:** quem já teve `checkout_payment_failed` com
   `card_country=BR` numa sessão USD abre a próxima sessão em BRL sem pedir nada
   (`priorBrazilianCardFailure`, leitura via service role, falha fechada).
   A tela `/checkout/cancelled` recebe `settle=brl` e diz o valor exato em R$.
6. **A linha honesta:** `/api/geo` devolve `settlement_currency`; `/pricing`
   mostra, **só para quem vai pagar em reais**, "Charged in BRL: R$ 49,90/mo"
   embaixo do preço em dólar (`data-testid="settlement-note"`).

## O que NÃO mudou

- `CheckoutCurrency` continua `'usd'`. A moeda de EXIBIÇÃO é uma só; o que
  nasceu é a moeda de LIQUIDAÇÃO, restrita ao servidor. As ~15 telas de preço
  não foram tocadas.
- Índia e resto do mundo seguem em USD nesta versão (o trilho da Índia é o
  Dodo/UPI, quando o KYC sair).
- Preço público em dólar segue congelado até 09/10 (restauração).

## Correções de verdade que valem para sempre

- **Pix não faz assinatura.** A Stripe só aceita Pix em pagamento único
  (`mode: 'payment'`): pacotes e top-ups em BRL ganham Pix assim que ele for
  ativado no painel. Mensalidade e anual (`mode: 'subscription'`) seguem no
  cartão. Pix no anual exige vender o anual como pagamento único com
  entitlement de 12 meses nosso — próximo passo, não este.
- **Apple Pay e Google Pay já estão habilitados** na configuração `ShortsAI`
  (pmc_1ReaGGlah5dxzSBfnA0AFHA7). Com checkout hospedado da Stripe não é
  preciso registrar domínio.
- **Pix não aparece na lista da conta** (Cartões, Apple Pay, Google Pay, Link,
  Boleto desabilitado). Se não estiver na lista "adicionar formas de pagamento",
  depende de liberação da Stripe para a conta — pedido ao suporte.

## Régua de renovação

`renewalCreditsFor(tier, amount_paid, invoice.currency)`: fatura em BRL é
comparada com a tabela BRL do plano, nunca com o dólar.

## Guardião

`scripts/test-moeda-local-2026-09-09.mjs` (47 verificações; executa a lib em
sandbox e prova por texto rota, webhook, /api/geo, /pricing e /checkout/cancelled).
`test-preco-v7` ganhou 3 casos em reais; `test-continue-now` aceita a moeda na régua.

## Próximo passo depois do deploy

1. Fundador refaz o teste do afiliado com o cartão brasileiro: a sessão nasce em
   R$ 49,90 (Starter) pela rede de segurança, mesmo antes de qualquer outra
   coisa. Fecha o degrau 5 (comissão) da sonda AF-09.
2. Ativar Pix (painel Stripe ou pedido ao suporte).
3. Anual via Pix (pagamento único + entitlement de 12 meses).
4. Rúpia para a Índia pelo Dodo quando o KYC sair.
