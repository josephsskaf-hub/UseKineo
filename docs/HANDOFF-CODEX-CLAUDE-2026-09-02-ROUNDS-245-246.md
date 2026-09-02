# HANDOFF CODEX → CLAUDE — RODADAS 245–246

**Data da medição:** 2026-09-02 17:24 BRT
**Workstream:** Growth / B2C
**Branch:** codex/b2c-post-expiry-new-session-v1
**Base no início:** 0a19844be613e3ee1dc71f23f722b7f508765b60

## Objetivo da rodada

Determinar, sem alterar checkout ou produto, se uma pessoa que obteve o primeiro arquivo,
abriu um checkout recorrente e deixou essa primeira Stripe Session expirar volta depois da
expiração, cria uma Session distinta e paga.

## Inventário anti-duplicação

**FATO CONFIRMADO:** a hipótese já aparecia parcialmente em três relatórios, mas nenhum
montava a sequência canônica completa:

- subscription-session-outcome-report.mjs classifica cada Session, sem sequência por pessoa/arquivo;
- first-video-file-value-to-subscription-report.mjs preserva a primeira Session e apenas conta as posteriores;
- first-file-later-day-retrieval-report.mjs também ancora a primeira Session, sem classificar o pagamento da posterior.

**DECISÃO DA RODADA:** não alterar CheckoutResumeBanner, PricingSavedCheckout, página
de cancelamento nem oferta pós-vídeo. Seus experimentos continuam sob gates próprios.

## Contrato novo

**IMPLEMENTADO / TESTADO LOCALMENTE:**

primeiro vídeo maduro externo → blob exato do primeiro arquivo → primeira Session recorrente
com expired_unpaid exato → timestamp real da expiração → primeira Session distinta iniciada
depois da expiração → desfecho terminal e receita exatos da nova Session.

Regras:

- observação fixa de 7 dias por pessoa;
- pagamento ou expiração depois do cutoff não contamina a coorte;
- nova Session antes da expiração não é recuperação pós-expiração;
- reabertura da mesma Stripe Session nunca vira Session nova;
- open_before_deadline permanece pendente e não amadurece o gate;
- missing_terminal_signal, conflito ou pagamento inválido bloqueiam qualidade;
- pessoa, Stripe Session e receita são unidades separadas;
- identificadores de pessoa e Session saem apenas como hashes opacos;
- gate mínimo: 5 pessoas com segunda Session de desfecho terminal exato;
- o relatório nunca autoriza mudança de produto sozinho.

Arquivos:

- scripts/post-expiry-new-session-report.mjs
- scripts/measure-post-expiry-new-session.mjs
- scripts/test-post-expiry-new-session.mjs

## Evidência de produção

**EVIDÊNCIA DE PRODUÇÃO — Supabase, consulta somente leitura, 2026-09-02 17:20 BRT,
contas internas excluídas:**

| Unidade | Resultado |
|---|---:|
| pessoas com primeiro vídeo maduro | 294 |
| pessoas com blob exato do primeiro arquivo | 110 |
| pessoas com checkout recorrente depois do blob | 20 |
| pessoas cuja primeira Session expirou unpaid de forma exata | 9 |
| pessoas com Session distinta iniciada realmente depois da expiração | 1 |
| pessoas com desfecho terminal exato nessa nova Session | 1 |
| pessoas que pagaram nessa nova Session | 1 |
| Stripe Sessions pagas nessa transição | 1 |
| receita exata | USD 2.900 minor = US$ 29,00 |

**CONTRADIÇÃO CORRIGIDA:** o handoff 243–244 registrava 3 Sessions posteriores e a
primeira consulta desta rodada encontrou 2 pessoas com Session posterior ao início da
primeira. Isso não provava recuperação pós-expiração. Aplicando a ordem temporal correta,
sobra 1 pessoa; ela pagou US$ 29. A outra Session começou antes de a primeira expirar.

## Gate

**ESTADO:** collecting — 1/5 pessoas com nova Session pós-expiração e desfecho terminal.

**DECISÃO:** nenhuma mudança em UI, copy ou checkout. A amostra mostra que o retorno pode
converter, mas ainda não permite escolher mecanismo ou causalidade.

## Validação

- test-post-expiry-new-session.mjs: 73/73
- test-subscription-session-outcome-report.mjs: 32/32
- test-subscription-revenue-ledger.mjs: 31/31
- test-first-video-file-value-to-subscription.mjs: 99/99
- total: 235/235
- git diff --check: limpo
- typecheck: os mesmos 3 erros preexistentes (mrr.ts, me/subscription, TrialDowngradeModal), nenhum arquivo desta rodada
- auditoria adversarial final: GO, P0=0, P1=0, P2=0

## Próximo passo

Preservar as superfícies B2C atuais até seus gates. Reexecutar este relatório quando houver
5 pessoas com segunda Session pós-expiração e desfecho terminal exato. Alternar agora para
a frente B2B, sem reabrir checkout.
