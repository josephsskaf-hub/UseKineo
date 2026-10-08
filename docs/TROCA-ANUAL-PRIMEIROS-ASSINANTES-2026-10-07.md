# Troca para o anual — primeiros assinantes (KINEO-TROCA-ANUAL-2026-10-07)

## O que é

Em 05/10 o fundador mandou a 9 assinantes mensais o e-mail *"A thank-you for being one of our first subscribers"*:
anual com 40% de desconto, mesmos créditos liberados todo mês, o mês já pago creditado, reembolso integral em 14 dias,
"just reply YES and I'll switch your subscription myself". O `/api/stripe/change-plan` recusa anual (409
`annual_needs_support`), então não havia como cumprir. Agora há:

- **Rota:** `POST /api/admin/switch-to-annual` — só admin logado, uma pessoa por chamada, sem cron (cada execução cobra
  o cartão de um cliente e exige o "vai" do fundador para aquela pessoa).
- **Regra pura:** `lib/billing/annualSwitch.ts`.
- **Guardião:** `node scripts/test-troca-anual-2026-10-07.mjs` (Stripe e banco falsos; nunca chama a Stripe de verdade).

### A regra do valor (a mesma dos e-mails)

anual = mensal de hoje × 12 × 0,6, **arredondado ao dólar mais próximo** (meio para cima). O mensal de referência é o
`unit_amount` que a assinatura cobra hoje na Stripe. Os valores prometidos em 05/10:

| mensal hoje | anual prometido | e-mails |
|---|---|---|
| US$ 9,90 | US$ 71 | 4 |
| US$ 12,90 | US$ 93 | 1 |
| US$ 15,92 | US$ 115 | 1 |
| US$ 19,90 | US$ 143 | 2 |
| US$ 29,00 (Studio) | US$ 209 | 1 |

Qualquer outro valor — inclusive 1 dólar acima ou abaixo — é recusado (422 `annual_amount_mismatch`, com o valor
esperado na resposta). A ferramenta cobra o que o e-mail prometeu, nem mais, nem menos.

### O que a troca faz na Stripe

- Troca o **item** da assinatura para `price_data` anual (US$ X/ano, mesmo Product do item atual; sem Price de painel —
  o mesmo jeito do change-plan).
- `proration_behavior: 'always_invoice'` + `billing_cycle_anchor: 'now'`: cobra **agora** o ano novo menos o crédito do
  tempo não usado do mês já pago. O período anual começa na hora da troca.
- `payment_behavior: 'error_if_incomplete'`: cartão recusado = a Stripe **não troca nada** e devolve erro (402).
- Metadata: preserva tudo o que o checkout mensal original gravou (afiliado, origem, marcador de intro) e carimba as
  chaves de sistema da anual do checkout — `supabase_user_id`, `tier`, `plan_credits`, `price_region` — mais o selo
  `annual_switch_version / annual_switch_offer / annual_switch_from_monthly_minor / annual_switch_annual_minor`.
- No banco, nesta ordem: nasce o evento `plan_switched_to_annual` (o razão; id fixo por assinatura: uma troca por
  assinatura, para sempre) com mensal, anual, crédito do mês, valor cobrado e id da fatura; e, **só com o razão
  gravado**, o perfil recebe numa escrita só o plano e a **cota do 1º mês do ano pago** pela regra da renovação
  (`renewalBalance`: a cota do plano reinicia; crédito comprado acima de uma cota sobrevive). Por quê: o ano começa na
  troca e o resto do mês mensal volta em dinheiro (rateio) — sem essa cota a pessoa ficaria um mês sem crédito novo
  depois de pagar o ano. O evento guarda `credits_before`, `credits_after`, `credits_carried` e `credits_granted`.

## Passo a passo (uma pessoa por vez)

**0. Achar o `userId`** (= `profiles.id`) da pessoa que respondeu SIM: `/admin/people`, ou no SQL do Supabase
`select id, plan, stripe_subscription_id from profiles where email = '<e-mail da pessoa>';`.

**1. ENSAIO** (não grava nada, não cobra nada). No navegador logado como admin em `https://www.usekineo.com`, console
(F12):

```js
await (await fetch('/api/admin/switch-to-annual', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ userId: 'UUID-DA-PESSOA', annualAmountUsd: 71 }),
})).json()
```

**2. CONFERIR** na resposta do ensaio:

- `ready_to_send: true` e `blockers: []`;
- `subscription.monthly_usd` = o mensal citado no e-mail daquela pessoa; `offer.expected_annual_usd` = o anual do e-mail;
- `credits.perMonthToday` = `credits.perMonthAfter` ("same credits as today");
- `credits.balanceBefore` → `credits.balanceAfter`: o saldo de hoje e o saldo logo depois da troca (a cota do plano,
  mais o que a pessoa comprou acima de uma cota — `credits.balanceCarried`). O SEND relê o saldo na hora de conceder;
- `preview.proration_credit` = o crédito do mês já pago (maior que US$ 0 se ainda há dias no mês dela);
- `preview.charged_now` ≈ anual − crédito. **Se não bater com essa conta, pare e chame a sessão CEO.**
- `metadata_to_write` tem `tier`, `supabase_user_id` = o `userId`, `plan_credits` e o selo `annual_switch_*`.

**3. SEND** — o ensaio devolve o corpo pronto em `send_with`:

```js
await (await fetch('/api/admin/switch-to-annual', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ userId: 'UUID-DA-PESSOA', annualAmountUsd: 71, confirm: 'SEND' }),
})).json()
```

**4. CONFERIR o SEND:** `switched: true`, `charged_now.label` (o que o cartão pagou hoje), `invoice.invoiceId`,
`invoice.billingReason` = `subscription_update` (se vier outro valor, avise a sessão CEO: o webhook poderia tratar a
fatura como renovação), `profile_updated: true`, `ledger_written: true`, `refund_until`, `first_refill_at` e
`customer_reply_en` (a resposta ao cliente já com o valor real), `credits_granted: true` e `credits_before` →
`credits_after`. Se `ledger_written`, `profile_updated` ou `credits_granted` vier `false` (o banco caiu depois da
cobrança), rode o mesmo SEND de novo: ele completa o evento e a cota do mês **uma vez**, sem cobrar outra vez. Se a
resposta disser que a cota está pendente e o saldo mudou (`credits_grant_pending: true` + aviso), a ferramenta não
concede para não dobrar: confira o saldo e, se faltou, conceda à mão em `/admin/people` (+ créditos).

**5. RESPONDER** ao cliente — rascunho na thread do e-mail dele (modelo abaixo; o `customer_reply_en` do SEND já vem
com o valor preenchido).

**6. PROVA DE IDEMPOTÊNCIA:** rode o ENSAIO de novo. Tem de responder `already_switched: true` — um segundo clique não
cobra outra vez.

### Se der erro

- **403** — não está logado como admin.
- **422 `annual_amount_mismatch`** — o valor não é o prometido; a resposta traz `expected_annual_usd`.
- **409 `blocked`** — a lista `blockers` diz o motivo. Os principais: `subscription_has_discount` (cupom na assinatura
  cairia por cima do anual: remova o cupom no painel e rode o ensaio de novo), `cancel_scheduled` (confirme com a
  pessoa), `credits_would_change` (a recarga anual daria menos créditos que hoje — ex.: Studio a US$ 39,90 — não troque;
  chame a sessão CEO), `currency_not_usd`, `subscription_not_active`, `internal_account`, `already_annual`.
- **402 `stripe_update_failed`** (cartão recusado) — nada mudou e nada foi gravado. A pessoa atualiza o cartão; rode o
  ensaio de novo depois de 10 minutos.
- **502** (erro da Stripe ou de rede) — rode o ENSAIO. Se ele disser `already_switched: true` com `source: 'stripe'`, a
  troca aconteceu e o registro ficou pela metade: o SEND só completa o perfil e o evento, **sem cobrar de novo**.

## Estorno dentro de 14 dias (painel da Stripe)

A promessa é reembolso integral em até 14 dias da troca (o SEND devolve `refund_until`).

1. Stripe → **Clientes** → a pessoa → a assinatura anual. O id da fatura da troca está em `invoice.invoiceId` (e no
   evento `plan_switched_to_annual`, campo `stripe_invoice_id`).
2. **Cancelar assinatura → Imediatamente.** Se o diálogo oferecer reembolso, escolha **último pagamento** (o valor
   integral cobrado na troca). Se não oferecer: **Pagamentos** → a cobrança da troca → **Reembolsar** → valor total.
3. O cancelamento chega ao nosso webhook (`customer.subscription.deleted`) e o perfil volta a `free`. Os créditos que a
   pessoa tem não são retirados automaticamente — inclusive a cota concedida na troca (`credits_after` no evento);
   tirar ou não é decisão do fundador (`/admin/people`, + créditos com valor negativo e motivo).
4. Se a pessoa quiser continuar no **mensal**, ela assina de novo pelo `/pricing` (o checkout aceita porque a anterior foi
   cancelada). Não reative a anual nem troque o preço à mão no painel: a recarga anual e o webhook dependem da metadata.

## Modelo de resposta ao cliente (inglês)

> Done — you're now on the annual plan. We credited what you already paid this month, and your card was charged $X
> today. Same plan, same credits as before, released every month. If you change your mind, you get a full refund within
> 14 days — just reply to this email.

`$X` = `charged_now.label` do SEND (o anual menos o crédito do mês). O SEND devolve este texto pronto em
`customer_reply_en`.

## O Product do preço anual (08/10, primeira troca real)

O ensaio do Rick devolveu 502: a Stripe recusou criar preço no Product do item mensal ("marked as inactive") — o
checkout cria esse Product com `product_data` e ele não aceita preço novo. Desde 08/10 o anual nasce no **Product da
casa** do plano, com id fixo `kineo_plan_<tier>` (Kineo Starter / Kineo Creator / Kineo Studio, metadata `kineo_tier`):
reaproveitado se ativo, criado uma única vez se faltar (o ensaio pode criá-lo — é catálogo, sem preço nem cobrança) e,
se estiver arquivado, a rota recusa com 409 `house_product_inactive` (reative no catálogo e rode o ensaio de novo).
O ensaio mostra `product.id`, `product.created_now` e o Product do item mensal.

## O que acontece depois, sem ninguém fazer nada

- **Mês 1 do ano pago = na troca:** a rota concede a cota do plano na hora (regra da renovação, uma vez por assinatura).
- A fatura da troca chega ao webhook como `billing_reason = 'subscription_update'`: ele grava
  `subscription_update_invoice_paid` e **não concede crédito** (a cota do mês já veio na troca — nada em dobro).
- **Meses 2 a 12 = cron:** o `annual-credit-refill` solta a cota em +1, +2 … +11 meses da troca (os índices 1 a 11 dele),
  uma vez cada. Conta fechada no guardião: 1 (troca) + 11 (cron) = **12 cotas no ano pago**. Em +12 meses chega a
  fatura anual seguinte (`subscription_cycle`) e o webhook concede a 1ª cota do ano novo — o ciclo se repete. A data da
  recarga passa a ser o dia do mês da troca (troca em 8/10 → 8/11, 8/12 … 8/9).
- Lacuna conhecida (não bloqueia): o painel de MRR lê a última fatura de mensalidade; até a renovação anual ele mostra o
  mensal antigo, e na renovação anual a fatura herdaria "mensal" do checkout original. O evento
  `plan_switched_to_annual` tem tudo para o conserto (`annual_minor`, `stripe_subscription_id`).

## O que só uma troca real prova

O guardião roda com Stripe falsa. Só a primeira troca real confirma: (1) que a fatura imediata vem com
`billing_reason = 'subscription_update'`; (2) que a prévia (`invoices.createPreview` com `always_invoice` +
`billing_cycle_anchor: 'now'`) mostra a mesma fatura que o SEND cobra; (3) o valor exato do crédito do mês; (4) que a
Stripe aceita `price_data` com o Product do item mensal; (5) que o cartão salvo passa sem pedir autenticação (se pedir,
a resposta é 402 e nada muda).
