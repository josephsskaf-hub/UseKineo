# HANDOFF CODEX → CLAUDE — RODADAS 269–270

**Data da evidência:** 2026-09-03

**Base:** `08e418218ce427f6d7a72aca1d8d10360c6b76e8`

**Commit funcional:** `9cdc31d21d38b5e95e47ff7cbf6f8c175ead8ebe`

**Workstream:** aquisição, fluxo e assinaturas B2B

**Escopo:** instrumentação do CTA público da página de agências e atribuição estrita até assinatura; nenhuma copy, estilo, preço, crédito, SKU, checkout, render, banco ou migration alterados

## Decisão baseada em evidência

**EVIDÊNCIA DE PRODUÇÃO — Supabase, SELECT somente leitura em 2026-09-03, contas internas excluídas pela lista canônica:**

- o Publish Kit empresarial teve zero eventos `publish_kit_business_*` em 30 dias; não havia denominador para outra mudança nessa superfície;
- o caminho de confiança teve três sessões anônimas e zero cliques no CTA; não havia pessoa identificada suficiente para uma decisão comercial;
- em sete dias, `agency_bulk_page_viewed` alcançou duas pessoas externas identificadas e nove sessões anônimas; `agency_margin_calculator_viewed`, uma pessoa externa identificada e nove sessões anônimas; `agency_margin_proposal_copied`, uma pessoa externa identificada;
- pessoas e sessões das linhas acima não devem ser somadas: pode haver sobreposição.

**DECISÃO DESTA RODADA:** preservar Publish Kit, confiança e proposta enquanto coletam amostra. O primeiro buraco ainda não medido no caminho de agências era o CTA do cabeçalho até Studio → vídeo → Checkout recorrente → pagamento.

## Implementação

**IMPLEMENTADO / TESTADO LOCALMENTE:** o CTA autenticado `Open Studio →` agora leva para `/studio?intent_campaign=agency_header_studio_v1` e emite o evento fechado `agency_header_studio_clicked`. O CTA deslogado conserva login e retorno interno à página de agências; seu diagnóstico usa outro nome, `agency_header_signin_clicked`, e nunca entra no denominador do Studio.

**FATO CONFIRMADO:** autenticação começa em `checking`. Somente resposta 401/403 vira `signed_out`; erro de rede ou 5xx não produz falso clique de login. Metadados são constantes categóricas e não carregam PII.

**FATO CONFIRMADO:** o relatório B2B fecha a cadeia apenas quando:

- o clique corresponde integralmente a nome, versão, campanha, superfície, posição, destino e estado autenticado;
- clique e Checkout pertencem à mesma pessoa externa e à mesma sessão de navegador;
- o clique é anterior ao Checkout, está dentro de 24 horas e é o clique válido mais próximo;
- um vídeo pós-clique só conta quando `clickAt < videoAt < checkoutAt`, com a mesma pessoa, sessão e campanha;
- cada Stripe Session resolve pagamento pelo ledger canônico da própria Session;
- retries de Checkout permanecem Sessions separadas, mas a pessoa é deduplicada e receita só entra para a Session realmente paga;
- conflito de dono até o Checkout reprova; atividade futura de outro dono não revoga uma atribuição já fechada;
- a atribuição permanece `entry_immature` até completar 24 horas desde o clique.

**FATO CONFIRMADO:** `generate_completed` agregado por campanha continua diagnóstico. Somente `subscription.postVideo` cumpre a cadeia causal estrita; contagem diagnóstica não libera gate nem receita.

## Gate de interpretação

**FRONTEIRA:** `2026-09-03T05:00:00.000Z`. Eventos anteriores nunca entram nesta variante.

**GATE:** manter a superfície sem reedição até alcançar dez pessoas externas identificadas que clicaram e sete dias completos de observação. Uma primeira Stripe Session ou pagamento recorrente com entrada exata pode antecipar a leitura, mas somente depois de sua janela de 24 horas maturar. Checkout aberto, sessão Stripe, clique e vídeo não são assinatura.

**PROIBIDO CONCLUIR:** nenhuma evidência atual prova lift, causalidade ou aumento de receita. A variante começa em `collecting`.

## Verificação

- `test-agency-header-journey.mjs`: **26/26**;
- `test-b2b-subscription-truth-report.mjs`: **161/161**;
- `test-b2b-commercial-funnel-report.mjs`: **167/167**;
- `test-b2b-bulk-page.mjs`: **32/32**;
- `test-b2b-auth-context.mjs`: **26/26**;
- `test-server-only-events.mjs`: **33/33**;
- `test-checkout-auth-session-bridge.mjs`: **61/61**;
- total executado: **506/506**;
- `git -c core.whitespace=cr-at-eol diff --check`: limpo;
- três reauditorias independentes: **GO final, P0=0, P1=0**;
- typecheck: somente três erros preexistentes, fora do diff, em `app/api/admin/_shared/mrr.ts`, `app/api/me/subscription/route.ts` e `components/TrialDowngradeModal.tsx`;
- comparação visual não se aplica: textos, CSS, layout e estrutura responsiva do CTA permaneceram idênticos.

## Risco e próxima alternância

**RISCO P2 ACEITO:** `quality.subscriptionStartsWithoutRequiredEntryView` é um agregado que sobrepõe os diagnósticos específicos de identidade, maturidade e ambiguidade. Não somar essas linhas entre si.

**PRÓXIMA ALTERNÂNCIA:** B2C. Preservar as superfícies terminais existentes até o gate do handoff 267–268; procurar outro estágio ainda sem experimento no caminho primeiro vídeo → valor percebido → Checkout → pagamento, sem alterar preço, crédito ou checkout enquanto a coorte atual coleta.

**PUBLICAÇÃO:** pendente neste momento; preencher SHA final de `origin/main`, deployment e smoke após push seguro.
