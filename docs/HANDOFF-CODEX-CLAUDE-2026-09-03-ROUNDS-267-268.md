# HANDOFF CODEX → CLAUDE — RODADAS 267–268

**Data da evidência:** 2026-09-03 02:51:20 UTC

**Base:** `90ccb196153590416c484c949bb0c639db11b1bb`

**Commit funcional:** `057b74a13b33fdbcdf82fc0e43c7dc1aed5abeda`

**Workstream:** aquisição, fluxo e assinaturas B2C

**Escopo:** medição somente; nenhuma tela, oferta, preço, crédito, SKU, checkout, render, banco ou migration alterados

## Resultado executivo

**FATO CONFIRMADO:** os relatórios existentes respondiam separadamente qual superfície precedeu uma tentativa e qual Stripe Session terminou paga ou expirada. Eles não fechavam a cadeia completa `CTA → checkout_attempted → checkout_started → paid/expired_unpaid` por superfície, com o mesmo contrato e a mesma Session.

**IMPLEMENTADO / TESTADO LOCALMENTE:** `scripts/b2c-subscription-truth-report.mjs` agora expõe `terminalSurfaceTruth` para o contrato estrito `recurring_checkout_24h_v1`. O diagnóstico:

- começa somente em `checkout_started` v1, externo e dentro da janela;
- exige a cadeia ordenada clique → tentativa → Session em até 60 segundos;
- usa `metadata.tier` e `metadata.billing` como produto canônico; `selection` é apenas a chave de UI e fallback para callers legados;
- rejeita pack, SKU, seleção mista, browser divergente, contrato divergente, identidade divergente e um clique compartilhado entre Sessions;
- exige o mesmo Stripe Session para pagamento ou expiração;
- usa uma Session canônica por pessoa e superfície, sem inflar por retries;
- conta pessoas, Sessions e receita em unidades separadas;
- emite apenas agregados, superfícies allowlisted, motivos fechados e moeda; não emite usuário, browser, Stripe Session nem hash;
- abre somente `ready_for_diagnosis`, nunca declara causalidade, lift ou vencedor.

**FATO CONFIRMADO / FAIL-CLOSED:** depois de uma Session externa v1 entrar na coorte, todas as linhas daquele Stripe Session id voltam ao resolvedor — inclusive linhas antigas, internas, pack ou de contrato divergente. Isso impede que um filtro precoce “limpe” um conflito real. Sessions inteiramente antigas ou exclusivamente internas não contaminam o gate atual.

## Evidência de produção observada

**EVIDÊNCIA DE PRODUÇÃO — Supabase, SELECT somente leitura em 2026-09-03 02:51:20 UTC, contrato `recurring_checkout_24h_v1`, contas internas excluídas pela lista canônica de `lib/internalAccounts.ts`:**

- 13 pessoas externas;
- 15 Stripe Sessions recorrentes;
- 2 pessoas / 2 Sessions pagas;
- 3 Sessions `expired_unpaid`;
- 10 Sessions ainda abertas.

**ATRIBUIÇÃO ESTRITA OBSERVADA:**

- `pricing_page`: 2 pagamentos exatos;
- `generate_step_1`: 1 expiração sem pagamento exata;
- 2 expirações ficaram sem superfície por `cross_request_persistence_race`;
- das 10 Sessions abertas, 4 tinham superfície exata entre `generate_step_1`, `generate_upgrade_modal` e `trial_downgrade_modal`; 3 tinham race de persistência e 3 não tinham superfície suficiente;
- pessoas não devem ser somadas entre linhas/superfícies porque pode haver sobreposição.

**DECISÃO DESTA RODADA:** nenhuma mudança comercial é autorizada por esta amostra. Nenhuma superfície atingiu o gate mínimo de cinco pessoas terminais, duas superfícies comparáveis e sete dias. O leitor fica em `collecting`; a próxima medição deve preservar as superfícies atuais até maturidade.

**CORREÇÃO DE INTERPRETAÇÃO:** uma consulta direta CTA → Session havia sugerido que as expirações vinham do modal de upgrade. A cadeia estrita mostrou que duas delas tinham race e não podem ser atribuídas. Não declarar o modal como perdedor.

## Verificação

- `test-b2c-subscription-truth-report.mjs`: **164/164**;
- `test-post-delivery-checkout-origin-report.mjs`: **34/34**;
- `test-subscription-session-outcome-report.mjs`: **33/33**;
- `test-subscription-revenue-ledger.mjs`: **31/31**;
- total executado: **262/262**;
- `git -c core.whitespace=cr-at-eol diff --check`: limpo;
- três reauditorias independentes terminaram em **GO, P0=0, P1=0** depois de fecharem aliases reais de caller, pack/mixed, pagamentos legados, conflitos de Session, janela, identidade e contaminação interna;
- o runner local não pôde consultar produção porque esta worktree não possui `NEXT_PUBLIC_SUPABASE_URL` nem `SUPABASE_SERVICE_ROLE_KEY`; nenhum segredo foi lido ou improvisado. A evidência equivalente acima veio do conector Supabase em SELECT somente leitura;
- o typecheck não pôde ser repetido porque o compilador TypeScript não está instalado no repo/runtime local. Nenhum arquivo TS/TSX foi alterado;
- comparação visual não se aplica: nenhum JSX, CSS, texto visível, CTA ou destino foi alterado.

## Risco, gate e próxima alternância

**RISCO P2 ACEITO:** o elo interno com o outcome usa uma referência SHA-256 truncada a 12 caracteres para preservar privacidade. A implementação indexa a referência para uma lista e falha fechada quando houver zero ou mais de um resultado; colisão nunca escolhe uma Session silenciosamente.

**GATE:** reexecutar após novas Sessions completarem 24 horas. Só comparar superfícies quando duas delas tiverem ao menos cinco pessoas terminais e sete dias observados, com razão de pessoas não resolvidas ≤20% e zero conflito financeiro/contratual no conjunto v1.

**PRÓXIMA ALTERNÂNCIA:** B2B. Não reeditar as superfícies B2C enquanto o gate coleta; procurar um estágio B2B ainda sem experimento ativo no caminho descoberta → proposta → checkout → pagamento.
