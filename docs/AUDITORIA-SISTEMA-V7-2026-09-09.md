# Auditoria do sistema V7 — porta de $1 → 7 dias → plano → renovação (09/09/2026)

Ordem do fundador (09/09 00h): "manter o $1; depois de sete dias ela pode migrar para qualquer plano; auditoria para ver se está tudo completo, se os sistemas estão se integrando e se não tem nenhum erro. Não importa se demorar."

Regra da auditoria: cada item tem o que o código FAZ (lido, não suposto), o que estava errado, o conserto com SHA, e o guardião que impede a volta.

## 1. Entrada ($1 por 7 dias)

| Passo | O que o código faz | Estado |
|---|---|---|
| Checkout `?tier=basic&trial=1` | `wantsTrial` só com `tier === TRIAL_TIER` (Creator); `trial_period_days: 7`; item avulso de $1 cobrado no ato; `missing_payment_method: 'cancel'` | ✅ |
| `has_paid === true` pede trial | negado (`card_trial_denied = 'has_paid'`) | ✅ |
| Já tem assinatura (Stripe ou PayPal) | checkout recusa a segunda; mensagem agora aponta para "Switch to" no /pricing | ✅ lote 2 |
| `checkout.session.completed` | plano `basic_trial`, 80 créditos, `payment_success` com `card_trial` | ✅ |
| Dia 8 (`invoice.payment_succeeded`, `subscription_cycle`) | plano `basic`, créditos = `renewalCreditsFor('basic', amount_paid)` = 150, evento `subscription_invoice_paid` com `trial_conversion` | ✅ V7 |
| Cartão falha no dia 8 | assinatura cancela (Stripe), `subscription.deleted` → plano free; carta `card_trial_ending_emailed` 3 dias antes | ✅ |
| Continuar agora | `/api/stripe/end-trial-now` (`trial_end: 'now'`), cobra o Creator, grant pela renovação | ✅ |

## 2. Migrar para qualquer plano (buraco fechado no lote 2)

**Antes:** o $1 era amarrado ao Creator; para Starter ou Studio a pessoa tinha que cancelar e comprar de novo, e o checkout recusava enquanto a assinatura existisse. O portal da Stripe só troca cartão e cancela (a casa usa `price_data` inline, sem catálogo).

**Agora:** `POST /api/stripe/change-plan { tier }`:
- atualiza o item da assinatura com o preço da fonte única (Product por plano achado/criado por `metadata.kineo_tier`);
- carimba `metadata.tier` e `plan_credits` (é de lá que a renovação lê o grant);
- trial: sem proration; os 80 créditos ficam; no dia 8 cobra o plano novo e concede o grant dele;
- ativo, upgrade: proration na próxima fatura; créditos sobem agora pela diferença de grant;
- ativo, downgrade: proration (crédito) na próxima fatura; créditos atuais não são retirados;
- anual e PayPal: 409 com texto honesto (suporte troca no mesmo dia).
- perfil atualizado na hora (chave de serviço), evento `plan_changed`.

UI: /pricing e os cards do app mostram "Current plan" e "Switch to X" para quem assina (confirmação antes, aviso depois); o botão do trial some para assinante; /account ganhou "Change plan". Webhook: fatura de proration (`billing_reason = subscription_update`) NÃO é tratada como renovação (antes zeraria o saldo do mês pelo grant). Guardião: `scripts/test-troca-de-plano-2026-09-09.mjs` (23).

## 3. Compra direta e renovação

- Starter/Creator/Studio mensal e anual: `price_data` inline de `TIER_PRICES`/`ANNUAL_PRICES`; grant `TIER_CREDITS` (60/150/300). ✅ V7.
- Renovação: `renewalCreditsFor(tier, amount_paid)`; quem paga o preço antigo recebe o grant antigo (`LEGACY_TIER_CREDITS_V6`). Guardião `test-preco-v7` executa 8 casos. ✅
- Top-up 300: $59,90 (invariante: top-up nunca abaixo do plano mais barato por crédito). ✅
- Packs de agência (bulk10/20/50: $99/$179/$379): produto B2B antigo, ainda no ar em /ai-shorts-for-agencies e no "Packs start at $7.58" de 6 páginas. **Decisão do fundador pendente: matar ou manter.**

## 4. Copy pública (lote 1, 812ba9fa)

Morreram: "Generate your first film free — no card", "Try Kineo free", "Make one free", "No editing, no card", "25 credits on signup · every engine unlocked", "free Fast workflow requires no card", "Free tier output carries a watermark", "$X for the first month, then $X" (intro igual ao cheio deixa de existir), "Can I make a Short for free first?", motor "Free · watermarked", Kling 2.5/H3 rotulados Creator (o gate cobra Studio), "Studio grant covers one" (agora calculado). Guardiões de preço/copy verdes.

## 5. E-mails e crons

- Nenhum cron vivo (vercel.json) tem preço literal no corpo; a carta do trial usa o valor da assinatura; a D+1 usa a fonte única. ✅
- Cartas antigas aposentadas (india-price etc.) mantêm o texto histórico como registro; não disparam.

## 6. Admin e placar

- `PLAN_PRICE_USD` ← `PLANS` ← `TIER_PRICES`. ✅
- Marco do placar: 09/09 00:00 UTC (V7). Rotina 09:10/22:10 lê `card_entry_door_*` e `door_v2`. ✅

## 7. O que ainda é decisão do fundador

1. Packs de agência: matar ou manter (item 3).
2. Comissão de afiliado 40% recorrente: no Studio, pior caso H3 ($34,80) + comissão ($23,60) em $59 → margem ~0. Proposta: comissão só no primeiro pagamento.
3. Dodo/TAAFT: em análise externa (~72h).
