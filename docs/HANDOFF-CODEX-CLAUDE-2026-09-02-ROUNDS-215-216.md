# HANDOFF CODEX -> CLAUDE — RODADAS 215–216

**Data da medição:** 2026-09-02 13:01 UTC

**Base:** `42e17fab0a8f0a250333b30829dd3fb15db8360a`

**Commit funcional:** `cfdb50925fbc5609630c8914c4b3b4f99a5f535a`

**Workstream:** Growth / B2C — Stripe Session iniciada → resultado terminal

**Escopo:** medição somente; nenhuma UI, preço, crédito, checkout, render, migration ou comunicação externa alterados

## Resultado executivo

**FATO CONFIRMADO:** a Stripe já emite no backend sinais distintos de início, pagamento e expiração, mas nenhum relatório os fechava por pessoa externa e pela mesma Checkout Session. `payment_success` e `checkout_session_expired` possuem `stripe_session_id`; `checkout_payment_failed` usa referência de PaymentIntent e não possui vínculo exato com a Session de destino.

**IMPLEMENTADO / TESTADO LOCALMENTE:** `scripts/subscription-session-outcome-report.mjs` classifica cada Session recorrente externa em um dos estados abaixo, sem usar ausência como prova de abandono:

- `paid` — pagamento exato na mesma Stripe Session;
- `expired_unpaid` — webhook de expiração exato com `payment_status=unpaid`;
- `expired_no_payment_required` ou `expired_unknown_payment_status` — preservados sem coerção;
- `open_before_deadline` — relógio atribuído pelo servidor ainda não terminou;
- `missing_terminal_signal` — relógio terminou sem pagamento nem expiração; é falha de observabilidade, não abandono provado;
- `unknown_maturity` — Session histórica sem uma janela válida registrada;
- `conflict` — dono, produto, estado ou semântica contraditórios; falha fechada.

O output usa uma referência SHA-256 curta e nunca publica o Stripe Session ID bruto nem e-mail. Pessoas, Sessions, browser sessions e eventos continuam separados.

## Evidência de produção — janela de 30 dias

**EVIDÊNCIA DE PRODUÇÃO — Supabase `SELECT`, observada em 2026-09-02 13:00:25 UTC, contas internas excluídas:**

- 91 pessoas externas iniciaram 109 Stripe Sessions recorrentes válidas;
- 5 pessoas / 5 Sessions pagaram;
- 44 pessoas / 48 Sessions expiraram com `payment_status=unpaid`;
- 5 pessoas / 6 Sessions permaneciam abertas antes do prazo;
- 38 pessoas / 50 Sessions são legado sem janela de maturidade registrada;
- `checkout_cancelled`: 14 pessoas externas, 38 eventos;
- `checkout_resume_banner_clicked`: 9 pessoas externas, 12 eventos;
- `checkout_resume_choice_viewed`: 1 pessoa externa, 2 eventos;
- zero eventos observados de `checkout_payment_failed` e `checkout_payment_failure_enriched` na janela.

**REGRA DE LEITURA:** as pessoas dos estados e assistências podem se repetir e não devem ser somadas. `unpaid` significa apenas que a Session expirou sem pagamento concluído; não prova que a pessoa nunca digitou cartão.

## Coorte comparável da janela nova de 24 horas

**FATO CONFIRMADO:** `lib/growth/checkoutSessionWindow.ts:2-6` define `recurring_checkout_24h_v1` e 24 horas. `app/api/stripe/checkout/route.ts:2148-2149` grava os dois valores em cada novo `checkout_started`.

**EVIDÊNCIA DE PRODUÇÃO — Supabase `SELECT`, observada em 2026-09-02 13:01:20 UTC, somente `recurring_checkout_24h_v1`:**

- 6 pessoas externas;
- 7 Stripe Sessions;
- 1 Session paga;
- 6 Sessions ainda abertas antes do prazo;
- zero expirada e zero sem sinal terminal nessa coorte;
- primeiro início em 2026-08-31 20:57:36 UTC e último em 2026-09-02 07:13:08 UTC.

**DECISÃO DE GATE:** não editar o último metro enquanto as 6 Sessions não vencerem o relógio de 24 horas. Hoje existe um pagamento real e não existe amostra terminal suficiente para afirmar que a janela nova fracassou ou venceu.

## O que a comparação competitiva acrescentou

**EVIDÊNCIA EXTERNA — fontes oficiais consultadas em 2026-09-02:** OpusClip apresenta teste sem cartão, quantidade concreta de outputs e comparação de planos; Pictory apresenta trial, capacidade concreta, cobrança anual/mensal e cancelamento; InVideo explicita flexibilidade e mecânica de créditos. A Kineo já apresenta os mesmos redutores de ansiedade — teste sem cartão, quantidade por plano, USD, cobrança/renovação, cancelamento e garantia — em `app/KineoLanding.tsx` e `app/pricing/PricingClient.tsx`.

Fontes: `https://www.opus.pro/pricing`, `https://pictory.ai/pricing/`, `https://invideo.io/pricing/`.

**DECISÃO:** não repetir copy competitiva que já existe. O diferencial desta rodada é fechar o resultado financeiro da Session, não empilhar outra promessa na página.

## Testes e qualidade

- `test-subscription-session-outcome-report.mjs`: **32/32**;
- `test-subscription-revenue-ledger.mjs`: **31/31**;
- `test-b2c-subscription-truth-report.mjs`: **27/27**;
- `test-post-delivery-checkout-origin-report.mjs`: **34/34**;
- `test-checkout-session-window.mjs`: **25/25**;
- sintaxe do runner e whitespace: verdes;
- typecheck: somente os 3 erros pré-existentes em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `components/TrialDowngradeModal.tsx:334`; zero erro novo.

Casos adversariais: Session ainda aberta nunca vira abandono; prazo vencido sem webhook vira lacuna de instrumento; proprietário estrangeiro falha fechado; Session paga e expirada falha fechado; colisão interno/externo falha fechado; pack não entra; expiração duplicada coerente conta uma vez; status Stripe desconhecido não é reinterpretado; IDs e e-mails não saem no relatório.

## Próxima decisão

**SUGESTÃO:** reconciliar novamente a coorte `recurring_checkout_24h_v1` quando as 6 Sessions atuais amadurecerem. Se expirarem sem pagamento, testar uma hipótese de retorno baseada na Session original. Se pagarem, preservar a janela e investigar somente as origens que não converteram. Se faltar webhook depois do prazo, corrigir observabilidade antes de mudar a experiência.

**RISCO FORA DA PISTA:** a varredura Vercel pós-deploy anterior mostrou um erro de `cinematic birth/compose billing mismatch` em `/api/cron/finish-stranded-renders`, associado ao deploy anterior `dpl_HieBatktwMBQLyGuVkaM1KWAEsmt`, em 2026-09-02 12:45:31 UTC. Codex não tocou render, billing de render ou cron; Claude deve reconciliar esse item na pista de produto.
