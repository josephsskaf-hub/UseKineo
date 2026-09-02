# HANDOFF CODEX → CLAUDE — RODADAS 211–212

**Data da medição:** 2026-09-02 11:55 UTC

**Workstream:** Growth / B2C — verdade financeira e arbitragem de experimentos

**Commit funcional:** `cef987a8ef80033bc61ee48dcfc882c438c25d45`

**Estado ao escrever:** commit local isolado; push e validação de deploy ainda pendentes

## Resultado executivo

**FATO CONFIRMADO:** foi criado um ledger único por `stripe_session_id`. Uma assinatura paga agora pode contribuir receita exatamente uma vez nos relatórios novos. Compra avulsa, Session com donos divergentes, mistura assinatura/pack, valor ou moeda contraditórios e pagamento anterior ao checkout falham fechados em `scripts/subscription-revenue-ledger.mjs`.

**FATO CONFIRMADO:** o relatório transversal novo separa cinco dimensões que antes eram misturadas:

1. verdade financeira exclusiva;
2. origem exata exclusiva do checkout;
3. exposições/assistências não exclusivas e não causais;
4. mediadores de valor/ativação que nunca recebem receita;
5. gates individuais e gate transversal ainda em coleta.

Arquivos:

- `scripts/subscription-revenue-ledger.mjs`
- `scripts/test-subscription-revenue-ledger.mjs`
- `scripts/b2c-subscription-truth-report.mjs`
- `scripts/test-b2c-subscription-truth-report.mjs`
- `scripts/measure-b2c-subscription-truth.mjs`

**FATO CONFIRMADO:** nenhum arquivo de interface, checkout, Stripe, preço, crédito ou render foi alterado. A decisão comercial continua sendo USD-only; o ledger lê a moeda realmente registrada e invalida uma Session se as linhas discordarem.

## Evidência de produção — somente SELECT

**EVIDÊNCIA DE PRODUÇÃO — 2026-09-02 11:55 UTC, janela de 30 dias, contas internas excluídas:**

- 5 pessoas externas com assinatura paga exata;
- 5 Stripe Sessions de assinatura pagas exatas;
- USD 9.270 em minor units = **US$ 92,70** de receita exata;
- 8 Sessions de pack observadas em 60 dias e explicitamente fora de “assinantes”;
- zero conflito de dono, zero pagamento de assinatura órfão, zero divergência de dinheiro e zero pagamento anterior ao checkout observados nessa leitura.

**EVIDÊNCIA DE PRODUÇÃO — fronteira fixa `2026-09-01T18:48:08.098670Z`:**

- 18 pessoas externas tiveram a primeira entrega;
- 12 delas têm amostra de valor válida dentro da coorte; 6 ainda não;
- 4 pessoas iniciaram 5 Stripe Sessions de assinatura;
- zero pagamento de assinatura ligado a essas Sessions até a medição;
- exposições válidas: result sample 13 pessoas no total da janela, WELCOME20 8, inline pricing 4, Plan Fit 2, checkout resume 1, trial downgrade 1, balance bridge no resultado 3 e no retorno 4;
- as 5 Sessions iniciadas vieram de `generate_step_1` (2), `generate_upgrade_modal` (1), `trial_active_banner` (1) e `trial_downgrade_modal` (1).

**LEITURA:** não existe amostra para declarar uma oferta vencedora. O dado permite dizer onde houve exposição e checkout; ainda não permite atribuir causalidade nem concluir que uma dessas telas converte melhor.

## Contrato de verdade

**FATO CONFIRMADO:** cada Stripe Session paga conta no máximo uma vez. Pessoas pagantes e Sessions pagas são métricas separadas; uma pessoa pode pagar duas Sessions.

**FATO CONFIRMADO:** receita de assinatura exige `payment_success.checkout_mode = subscription`, início compatível, mesmo dono externo, ordem temporal e sem `sku` de pack.

**FATO CONFIRMADO:** duplicatas coerentes do webhook contam uma vez e aparecem como diagnóstico. Qualquer contradição de dono, produto, valor, moeda ou tempo zera a receita atribuível daquela Session.

**FATO CONFIRMADO:** result sample, balance bridge e ChatGPT quickstart são mediadores/assistências. Podem anteceder pagamento, mas nunca “ganham” outra receita.

**FATO CONFIRMADO:** retomada permanece `unknown_resume_gap`, pois hoje não existe vínculo servidor-servidor entre a Session original e a ação de retomada. O relatório não adivinha essa origem.

## Testes e gates

**TESTADO LOCALMENTE:** `test-subscription-revenue-ledger.mjs` — 31/31.

**TESTADO LOCALMENTE:** `test-b2c-subscription-truth-report.mjs` — 27/27.

**TESTADO LOCALMENTE:** regressões — result report 51/51, post-delivery origin 34/34, Plan Fit 382/382.

**TESTADO LOCALMENTE:** typecheck reproduziu somente os 3 erros de baseline: Stripe API em `mrr.ts` e `me/subscription`, e `Promise<Promise<T>>` em `TrialDowngradeModal.tsx`. Zero erro novo.

**TESTADO LOCALMENTE:** `git diff --check` limpo.

Casos adversariais cobertos: duplicata coerente; dois usuários na mesma Session; externo+interno; pagamento sem usuário; valor/moeda divergentes; assinatura misturada com pack; pack após trial; pagamento antes do checkout; início anterior à janela; pagamento órfão; duas Sessions da mesma pessoa; retomada em outro navegador; três exposições antes de um pagamento; WELCOME20 em navegador diferente; WELCOME20 sem promoção aplicada.

## Gates atuais

**FATO CONFIRMADO:** o gate transversal continua `collecting`. Requisitos: 20 pessoas pós-entrega, 5 pessoas com Session exata, 7 dias e no máximo 20% de Sessions iniciadas sem origem exata.

**FATO CONFIRMADO:** o result-sample está em 18/20 pessoas, 12/5 sampled e 6/5 not-sampled, mas ainda não completou 7 dias e não há pagamento exato que abra reconciliação antecipada.

**FATO CONFIRMADO:** WELCOME20 já passou 5 pessoas, porém não completou 7 dias. Inline, Plan Fit, resume e downgrade também não completaram seus gates. Preservar variantes; não reeditar por ansiedade de amostra.

## Dívida que continua aberta — não confundir com esta entrega

**CONTRADIÇÃO:** os cards antigos ainda podem chamar qualquer pagamento posterior de “assinatura” e dar a mesma compra a várias superfícies. Pontos principais:

- `lib/admin/trialPostVideoFunnel.ts`
- `lib/admin/trialBalanceBridgeFunnel.ts`
- `lib/admin/chatgptQuickstartFunnel.ts`
- `scripts/result-video-decision-report.mjs`
- `scripts/post-delivery-checkout-origin-report.mjs`

**RISCO:** isso é atribuição duplicada no board, não cobrança duplicada no Stripe. Os arquivos `lib/admin/**` e `app/(dashboard)/admin/**` pertencem à pista Claude; o Codex não os alterou. O relatório novo é o contrato que esses cards devem adotar.

**PRÓXIMA AÇÃO COORDENADA:** Claude migra os cards admin para o ledger (ou consome a mesma regra) sem mudar produto. Codex corrige os dois relatórios de Growth antigos e acrescenta vínculo servidor-servidor de retomada somente em uma rodada própria, depois de avisar por tocar checkout compartilhado.

## Hipótese da próxima rodada B2C

**HIPÓTESE:** o problema mais próximo da receita não é falta de mais uma oferta, mas quatro Sessions recentes que chegaram ao Stripe e não pagaram, com cinco tentativas. A próxima rodada deve reconciliar retorno/cancelamento dessas quatro pessoas sem editar as variantes que ainda não atingiram gate, e sem desconto automático.
