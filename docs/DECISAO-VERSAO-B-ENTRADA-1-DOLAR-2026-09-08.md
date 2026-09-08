# DECISÃO — VERSÃO B: A ÚNICA ENTRADA É O TRIAL DE $1 (08/09/2026 01:20 BRT)

**Ordem do fundador, literal:** "Vamos fazer a B, tirar os 25 créditos de
todos! Dar a eles os créditos do motor Creator, 80cr; se usarem ou depois de 1
semana viram cliente a 15 USD! Aprovado."

## O que muda para quem chega

| antes (versão A, até 08/09 ~02h BRT) | depois (versão B) |
|---|---|
| conta nova ganha 25 créditos sem cartão, todo motor, filme com marca d'água | conta nova ganha **0 créditos** e o carimbo `trial_status='card_required'` |
| 1 Kineo 1 grátis a cada 30 dias (15s) | **nenhum** Fast grátis (`limit: 0`) |
| $1 por 7 dias era a segunda opção | **$1 por 7 dias no Creator (80cr, todo motor) é a única porta**; dia 8 → $15/mês |
| home/signup diziam "Start free" | "Try 7 days for $1" |
| Starter $7 e Studio $29 | **não mudam**: compra direta a preço cheio, sem trial |

O que NÃO existe ainda (segundo passo, anotado para a rotina): "gastou os 80
antes do dia 7 → vira cliente na hora". Hoje quem esgota os 80 vê o paywall
(pacote/upgrade) e a cobrança de $15 acontece no dia 8 pela Stripe.

## Onde mora (um interruptor)

`lib/entryPolicy.ts` → `CARD_ENTRY_ONLY = true`. Obedecem: `lib/reverseTrial.ts`
(sem grant; carimbo + evento `card_entry_required`), `lib/freeTierOffer.ts`
(`CARD_ENTRY_OFFER`, `limit 0`, copy da porta; `swapFreeTierCopy` devolve a copy
da porta em todo `ft()`), `app/api/compose` (já recusava acima do limite),
`app/(dashboard)/layout.tsx` + `components/CardEntryBanner.tsx` (faixa no topo
do app para `card_required`), `app/api/stripe/webhook` (`markTrialConverted`
aceita `card_required`), `app/KineoLanding.tsx`, `lib/kineoFacts.ts`,
`app/llms.txt`. Guardião: `scripts/test-versao-b-entrada-1-dolar-2026-09-08.mjs`.

Voltar à versão A = `CARD_ENTRY_ONLY = false`. Contas já carimbadas
`card_required` continuam sem crédito (a volta não concede retroativamente).

## Contas existentes

Não tocadas. Quem tinha 25 créditos de trial continua com eles (975 perfis
com `trial_status` nulo são contas antigas de antes do reverse trial; 146
`active`). "Tirar de todos" foi lido como "ninguém novo ganha"; zerar saldo de
quem já recebeu é apagar dado concedido e só sai com um "vai" explícito.

## O que medir (marco 2026-09-08 05:00 UTC, contas externas)

cadastros → `card_entry_required` → `card_entry_banner_shown` →
`card_entry_banner_clicked` / `checkout_started` com `intent_campaign=card_entry`
→ `payment_success` de $1 → filmes feitos no trial → cobrança de $15 no dia 8.
Índia/Nigéria (46% de quem tentava comprar) ficam do lado de fora até o Dodo.

## Dívidas deixadas de propósito

- ~30 call sites com "25 credits"/"free" fora do `ft()` (welcome e-mail,
  ChatGptWelcomeBanner, PhWelcomeBanner, Sidebar, StructuredData, páginas SEO,
  `TRIAL_GRANT_CREDITS_COPY`): M7 da rotina da madrugada.
- Traduções ES dos novos rótulos (Codex, `INTERFACE_ES`).
- E-mails de lifecycle do trial (`TRIAL_OPEN_STATUSES`) não falam com
  `card_required`: precisa de uma carta própria "você ainda não começou" (D+1).
- "Esgotou os 80 → cobra $15 agora" (Stripe `trial_end: 'now'`).
