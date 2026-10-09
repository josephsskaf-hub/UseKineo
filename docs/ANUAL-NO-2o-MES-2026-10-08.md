# Anual no 2º mês, com 30% (KINEO-ANUAL-2o-MES-2026-10-08)

## O que é

Decisão do fundador em 08/10/2026 (~01h BRT): *"É o mensal e no segundo mês a gente tenta trocar pro anual. Com desconto
de 30%."* O mensal continua sendo a porta de entrada. Quem já pagou **a 1ª renovação** (está no 2º mês da assinatura ou
depois) passa a ver a troca para o anual com 30% de desconto — o momento em que o mercado mais troca do mensal para o
anual (ChartMogul). Em 08/10, 6 de 10 assinantes mensais estavam com cancelamento agendado: o anual no 2º mês é a
resposta de produto a esse vazamento.

**LIGADO em 09/10/2026, com abertura em 12/10 (KINEO-ANUAL-2o-MES-LIGA-2026-10-09).** O fundador respondeu "2 sim" à
pergunta "ligar a oferta do anual no 2º mês no dia 12/10, quando vence a de 40%?".
- `MONTH2_ANNUAL_OFFER_LIVE = true`.
- `MONTH2_ANNUAL_OFFER_STARTS_AT = '2026-10-12T03:00:00.000Z'` (12/10 00:00 BRT).
- A tela, a rota e o cron perguntam `month2AnnualOfferOpen()` a cada pedido.
- **Antes de 12/10, nada abre:** a tela não pinta a oferta, a rota responde 404 `offer_not_live` e o cron responde 409.
- **O cron diário** (`?confirm=SEND&limit=20`, 13:29 UTC) entrou no `vercel.json`. O primeiro envio real é em
  12/10 às 13:29 UTC.
- **Emergência:** `MONTH2_ANNUAL_OFFER_LIVE = false` (com `EXPECTED_SHIPPED_LIVE = false` no guardião e a linha do cron
  fora do `vercel.json`) e publicar.

Antes do "liga": tudo estava atrás de um interruptor que saía DESLIGADO (`MONTH2_ANNUAL_OFFER_LIVE = false`). Desligado,
nada aparece na tela, a rota de autoatendimento responde 404 `offer_not_live` sem ler nada, e o cron do e-mail só faz
ensaio (o `?confirm=SEND` é recusado com 409, nada sai).

### A regra do valor

Oferta `month2_annual_30_2026_10_08`, sobre o `unit_amount` que a assinatura cobra hoje na Stripe. **O mesmo plano
nunca tem dois preços anuais** (coerência é a prioridade nº 1 do fundador — regra de 08/10, KINEO-ANUAL-2o-MES-COERENCIA):

- quem paga o **mensal vigente** do plano (`TIER_PRICES`; no teste de preço de 08/10: US$ 9,90 / 19,90 / 54,90) recebe
  **o anual do site** (`ANNUAL_PRICES`: US$ 83 / 167 / 460, lido da tabela — nunca digitado). Se o site mudar o anual, a
  oferta muda junto;
- quem paga um **mensal legado ABAIXO do vigente** (preço antigo, regional ou com desconto: 15,92, 29…) recebe mensal ×
  12 × 0,7, **arredondado ao dólar mais próximo** (meio para cima);
- quem paga **ACIMA do vigente** (KINEO-PRECO-TESTE-2026-10-08: quem assinou a US$ 12,90 / 29,90 antes do teste) recebe
  o **menor** entre a conta e o anual do site — nunca um anual mais caro que o do site para o mesmo plano.

Os valores conferidos pelo guardião (com o preço do teste de 08/10 — Starter e Creator a US$ 9,90 / 19,90):

| mensal hoje | anual no 2º mês | de onde vem | créditos/mês (iguais aos de hoje) |
|---|---|---|---|
| US$ 9,90 (Starter) | US$ 83 | anual do site | 60 |
| US$ 12,90 (Starter V8-A) | US$ 83 | teto: anual do site (a conta daria 108) | 60 |
| US$ 15,92 (Creator com desconto) | US$ 134 | × 12 × 0,7 | 150 |
| US$ 19,90 (Creator) | US$ 167 | anual do site | 150 |
| US$ 29,00 (Studio antigo) | US$ 244 | × 12 × 0,7 | 180 |
| US$ 29,90 (Creator V8-A) | US$ 167 | teto: anual do site (a conta daria 251) | 150 |
| US$ 54,90 (Studio) | US$ 460 | anual do site | 300 |

Antes do teste (V8-A), o vigente era US$ 12,90 / 29,90 / 54,90 e o anual do site US$ 108 / 250 / 460.

Se um dia o anual do site tiver centavos, a oferta do 2º mês FECHA para esse plano (a troca cobra dólares inteiros) e o
guardião fica vermelho no mesmo dia — quem mudar o preço decide o arredondamento antes de publicar.

A oferta de **40%** dos primeiros assinantes (e-mail de 05/10, e a retenção de 07/10, válida até 11/10) **continua como
está**, pela rota do admin (`/api/admin/switch-to-annual`, mensal × 12 × 0,6). As duas ofertas usam a **mesma** troca
(`lib/billing/annualSwitchCore.ts`) e o **mesmo** razão `plan_switched_to_annual` com id fixo por assinatura: **uma troca
por assinatura, para sempre**, venha de onde vier.

### Quem é elegível (tudo, ao mesmo tempo)

- assinatura **Stripe mensal ativa em USD** (BRL fica para depois; PayPal fora);
- **já pagou ao menos UMA renovação**: faturas `subscription_cycle` pagas, sem contar o 1º mês (`subscription_create`)
  nem a conversão do teste de US$ 1 (a 1ª fatura de ciclo depois do teste é o 1º mês pago, não renovação);
- **fora do teste**, **sem cancelamento agendado**, **sem cupom**, um item, cobrança automática;
- **não é conta interna** (`lib/internalAccounts`);
- a recarga anual dá **os mesmos créditos/mês** de hoje (senão a troca é bloqueada: é parte da promessa). Exemplo
  bloqueado: Studio antigo a US$ 39,90 (300 hoje, 180 pela escada legada do anual);
- a assinatura é **da própria pessoa** (o perfil é sempre o da sessão; a Stripe confere `metadata.supabase_user_id` e o
  Customer).

Inelegível = 409 `not_eligible` com os códigos (`no_renewal_yet`, `in_trial`, `cancel_scheduled`,
`subscription_has_discount`, `internal_account`, `currency_not_usd`, `already_annual`, `paypal_subscription`,
`not_owner`, `credits_would_change`, `renewals_unknown`…) e **nada gravado**.

### Onde aparece

1. **Conta → Billing** (`/account?tab=billing`): cartão "Switch to annual and save 30% — $X/year instead of $Y × 12.
   Unused days are credited. Full refund within 14 days." com o botão que abre a prévia. Só assinante pago monta a peça.
2. **/studio**: o mesmo texto num aviso discreto, com × para dispensar (a dispensa fica no navegador da pessoa).
3. **E-mail do 2º mês** (cron): quem pagou a 1ª renovação nos últimos 7 dias recebe UM e-mail (pt, es ou en pelo país),
   com o valor dela em dólar e um botão que leva ao login com destino na conta; a prévia abre sozinha ao chegar.

Os textos da tela estão nas 16 línguas da interface (`lib/ui/refinementCopy.json`).

### O que acontece quando a pessoa confirma

O modal mostra a **prévia** (o ensaio do servidor: anual, crédito dos dias não usados, cobrado agora, créditos antes e
depois, data do reembolso de 14 dias). No "Confirm — pay $X today", a rota `POST /api/stripe/switch-to-annual` com
`confirm: 'SEND'` faz a troca pelo núcleo único — exatamente como a rota do admin:

- item da assinatura → `price_data` anual no Product da casa (`kineo_plan_<tier>`), `proration_behavior: 'always_invoice'`
  + `billing_cycle_anchor: 'now'` (cobra AGORA o ano menos o resto do mês já pago) e `payment_behavior:
  'error_if_incomplete'` (cartão recusado = nada muda, 402);
- exige o anual que a pessoa viu na prévia (`annualAmountUsd`); se a regra der outro valor, 409 `price_changed` e nada é
  cobrado;
- grava o razão `plan_switched_to_annual` (`offer: month2_annual_30_2026_10_08`, `source: self_service_switch_to_annual`,
  `surface`: `account_billing` | `studio` | `email`, `switched_by: self`) e concede a cota do 1º mês do ano pago pela
  régua da renovação; o webhook ignora a fatura `subscription_update` (sem crédito em dobro); o cron
  `annual-credit-refill` solta os meses seguintes; o MRR do admin já lê o razão (anual ÷ 12).

## Como ligar

Pré-requisito sugerido: **ligar depois de 11/10**. Até lá vale a oferta de 40% para quem recebeu o e-mail; os
assinantes ATIVOS desse grupo (sem cancelamento agendado) também seriam elegíveis ao cartão de 30% — se trocassem por
ele, pagariam mais do que a promessa de 40% e, como é uma troca por assinatura, não haveria segunda chance.

1. **Ver a coorte antes** (funciona com a oferta desligada, não grava nada): logado como admin em
   `https://www.usekineo.com`, abrir `https://www.usekineo.com/api/cron/send-month2-annual-offer` — a resposta lista quem
   receberia o e-mail hoje, com mensal → anual, língua e data da renovação, e por que cada um ficou de fora
   (`excluidos`, `motivos_dos_bloqueios`).
2. Com o **"liga"** do fundador, num commit só (worktree limpa):
   - `lib/billing/month2AnnualOffer.ts`: `export const MONTH2_ANNUAL_OFFER_LIVE = true`;
   - `scripts/test-anual-2mes-2026-10-08.mjs`: `const EXPECTED_SHIPPED_LIVE = true`;
   - `vercel.json`, na lista `crons` (minuto livre conferido em 08/10 — nenhum outro job em 13:29 UTC):
     `{ "path": "/api/cron/send-month2-annual-offer?confirm=SEND&limit=20", "schedule": "29 13 * * *" }`
     (13:29 UTC = 10:29 BRT, manhã nos EUA);
   - `tsc` + suíte inteira; enfileirar; o fundador publica.
3. Depois do deploy: a 1ª troca real é a prova. Conferir no banco (abaixo) o razão com `credits_granted = true` e, na
   Stripe, a fatura `subscription_update` paga.

**Desligar em emergência:** `MONTH2_ANNUAL_OFFER_LIVE = false` (e `EXPECTED_SHIPPED_LIVE = false`, e tirar a linha do
`vercel.json`) + publicar. Quem já trocou continua anual (o estorno de 14 dias segue o passo a passo de
`docs/TROCA-ANUAL-PRIMEIROS-ASSINANTES-2026-10-07.md`).

## Como medir

Sempre a partir da data do "liga" (`<LIGA>` abaixo), por PESSOA, nunca "últimos N dias".

**Funil da tela** (eventos do navegador; `surface` diz onde):

```sql
select name, metadata->>'surface' as surface, metadata->>'origin' as origem,
       count(*) as eventos, count(distinct coalesce(user_id::text, session_id)) as pessoas
from events
where name in ('month2_annual_offer_shown', 'month2_annual_offer_clicked', 'month2_annual_preview_viewed',
               'month2_annual_confirm_clicked', 'month2_annual_offer_dismissed')
  and created_at > '<LIGA>'
group by 1, 2, 3 order by 1, 2, 3;
```

**O que virou dinheiro** (o razão do servidor — o único fato que vale):

```sql
select created_at, user_id, metadata->>'surface' as surface,
       (metadata->>'monthly_minor')::int / 100.0 as mensal_usd, (metadata->>'annual_minor')::int / 100.0 as anual_usd,
       (metadata->>'amount_charged_minor')::int / 100.0 as cobrado_hoje_usd, metadata->>'credits_granted' as cota_do_mes
from events
where name = 'plan_switched_to_annual' and metadata->>'offer' = 'month2_annual_30_2026_10_08'
order by created_at;
```

`cota_do_mes = false` = a Stripe trocou e o banco caiu no meio: rode o SEND do admin para essa pessoa
(`/api/admin/switch-to-annual`, ver o doc da troca) — ele completa o registro e a cota **sem cobrar de novo**.

**E-mail do 2º mês** (carimbo `month2_annual_offer_sent`, um por assinatura; a linha da corrida diz o porquê de cada zero):

```sql
select count(*) filter (where metadata->>'status' = 'sent') as enviados,
       count(*) filter (where metadata->>'status' = 'claimed') as reservados_sem_confirmacao
from events where name = 'month2_annual_offer_sent' and created_at > '<LIGA>';

select created_at, metadata->>'enviados' as enviados, metadata->>'elegiveis' as elegiveis,
       metadata->>'motivo_do_zero' as motivo_do_zero
from events where name = 'campaign_run_v1' and metadata->>'campanha' = 'month2_annual_30'
order by created_at desc limit 14;
```

**Conversão e-mail → anual** (por assinatura, em até 14 dias do e-mail):

```sql
select count(distinct s.metadata->>'stripe_subscription_id') as receberam,
       count(distinct a.metadata->>'stripe_subscription_id') as trocaram
from events s
left join events a on a.name = 'plan_switched_to_annual'
  and a.metadata->>'stripe_subscription_id' = s.metadata->>'stripe_subscription_id'
  and a.created_at between s.created_at and s.created_at + interval '14 days'
where s.name = 'month2_annual_offer_sent' and s.metadata->>'status' = 'sent' and s.created_at > '<LIGA>';
```

A pergunta de negócio é o **churn do 3º mês** de quem entrou no 2º mês depois do `<LIGA>` (trocou = não cancela por 12
meses), comparado com quem entrou antes. Reembolso dentro dos 14 dias só aparece na Stripe (Pagamentos → reembolsos).

## Onde mora cada peça

- Interruptor, id da oferta, desconto, eventos e textos da tela: `lib/billing/month2AnnualOffer.ts` (puro).
- Regra do valor (registro das ofertas), renovações pagas, bloqueios do 2º mês: `lib/billing/annualSwitch.ts` (puro).
- A troca (Stripe, Product da casa, prévia, update, razão, cota, idempotência): `lib/billing/annualSwitchCore.ts` — o
  núcleo único; a rota do admin (40%) e o autoatendimento (30%) chamam o mesmo `runAnnualSwitch`.
- Autoatendimento: `app/api/stripe/switch-to-annual/route.ts` (GET estado, POST ensaio/troca).
- E-mail: `lib/billing/month2AnnualEmail.ts` (textos en/pt/es) + `app/api/cron/send-month2-annual-offer/route.ts`
  (ensaio por padrão; `?confirm=SEND` envia; reserva o carimbo antes do envio, falha do Resend libera; supressão de
  24 h; opt-out; linha `campaign_run_v1`; fora do `vercel.json` até o "liga").
- Tela: `components/billing/Month2AnnualOffer.tsx`, montada em `app/(dashboard)/account/AccountClient.tsx` (Billing) e
  `app/(dashboard)/studio/StudioClient.tsx`.
- Guardiões: `node scripts/test-anual-2mes-2026-10-08.mjs` (este) e `node scripts/test-troca-anual-2026-10-07.mjs` (a
  troca do admin, agora mutando o núcleo).
