# AUDITORIA DO SISTEMA DE COMPRA — 08/09/2026 (tarefas 1 e 2 das dez)

**Ordem do fundador:** "o processo desde o momento em que a pessoa entra no
site até gerar o vídeo ou escolher o plano e ir pro paywall. Cada falha é um
cliente que a gente perde."

## O caminho, elo por elo (código lido, banco consultado)

| # | elo | estado | prova |
|---|---|---|---|
| 1 | Home/SEO → `/signup` (idea guardada em `pendingVideoPrompt`) | ✅ | 10 CTAs sondados; redirect preservado |
| 2 | Cadastro (Google, e-mail com confirmação) → `/auth/callback` → `maybeActivateReverseTrial` → **card_required, 0 créditos, evento** | ✅ | 9 eventos hoje; idempotente `.is('trial_status', null)` |
| 2b | Cadastro por senha auto-confirm (não passa pelo callback) | ⚠→✅ | carimbo acontece na 1ª visita ao Studio; **e agora a faixa aparece também sem carimbo quando saldo = 0 e nunca pagou** |
| 3 | Studio: faixa `CardEntryBanner` ($1, 80cr, então $19) | ✅ | 6 pessoas viram hoje |
| 4 | **Generate sem crédito** | ❌→✅ | `outOfCredits()` isentava o Fast → o clique ia ao `/api/compose`, voltava **402 free_fast_limit como TEXTO** ("Kineo starts at $1…"). 2 pessoas hoje. Agora: guarda conhece a versão B e abre o modal com a porta de $1 **antes** de qualquer request; o 402 do Fast também abre o modal (backstop); o compose devolve `cardEntry: true` e `upgrade` = checkout do $1 |
| 5 | Modal "sem créditos" | ⚠→✅ | oferecia **"Make my first film free"** (regra morta) — desligado sob a versão B; a porta de $1 (`UpgradeModalTrialDoor`) é a saída |
| 6 | `/api/stripe/checkout?tier=basic&billing=monthly&trial=1` | ✅ | `trial=1` só no Creator mensal; `has_paid` → preço cheio sem erro; $1 hoje via `add_invoice_items`, `trial_period_days: 7`, cartão ausente no fim → cancela |
| 7 | Webhook `checkout.session.completed` | ✅ | 80 créditos, `plan=basic_trial`, `has_paid=true`, `trial_status card_required→converted`, `payment_success` com `card_trial=true` |
| 8 | `/checkout/success` | ✅ | espera `has_paid` e plano pago (`basic_trial` na lista); com rascunho → `/studio/create?resume=card_entry` e o filme dispara 1× |
| 9 | Filme no trial | ✅ | Kineo 1 (5cr) e Seedance; motores caros → 402 com `upsell: studio` (modal); filme sai limpo (pagou) |
| 10 | Esgotou os 80 antes do dia 7 | ✅ | `TrialContinueNowBanner` → `POST /api/stripe/end-trial-now` → webhook concede 150 |
| 11 | Dia 8 | ✅ | `invoice.payment_succeeded` → 150cr, `plan=basic`, `subscription_invoice_paid` com `trial_conversion=true` |
| 12 | Admin | ✅ | régua única (`_shared/mrr`): trial ≠ pagante; MRR real da Stripe; KPI "Trials $1" |

## O que mudou hoje neste elo (código)

- `GenerateClient.outOfCredits()`: `CARD_ENTRY_ONLY && !hasPaid && credits === 0` → `true` (antes da isenção do Fast).
- `GenerateClient` 402 do Fast: `data.outOfCredits` → `openOutOfCreditsModal('credits')`.
- `GenerateClient` modal: `firstFilmFree` só quando `!CARD_ENTRY_ONLY`.
- `/api/compose` recusa: `cardEntry`, `upgrade` = checkout do $1.
- `CardEntryBanner`: aparece também para `trial_status=null` + `credits=0` + `!has_paid` (falha fechada se saldo não lido).
- Guardião `scripts/test-sistema-de-compra-2026-09-08.mjs` — 27 verificações do cadastro ao dia 8.

## O que NÃO dá para provar sem um cliente

Uma compra de $1 real ainda não aconteceu (0 até 11h). O primeiro pagamento
vai provar os elos 7-8 em produção; o guardião prova o código, e o placar
(`payment_success card_trial=true` → `card_entry_resume_autostart` →
`subscription_invoice_paid`) mostra cada elo assim que existir.
