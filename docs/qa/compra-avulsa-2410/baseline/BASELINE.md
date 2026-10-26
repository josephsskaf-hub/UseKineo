# Baseline offline — KINEO-COMPRA-AVULSA-2410

**FATO CONFIRMADO / TESTADO LOCALMENTE — 24/10/2026:** base imutável 7950e411, worktree detached compra-avulsa-baseline-2410; nenhum código funcional alterado. Os logs foram copiados para esta pasta somente depois dos testes de inventário.

**FATO CONFIRMADO / TESTADO LOCALMENTE:** TypeScript 5.9.3, Node v24.18.0 (o workflow declara Node 22), dependências locais existentes. Typecheck direto equivalente a npx tsc --noEmit --incremental false: exit 0 (00-typescript-noemit.log).

**FATO CONFIRMADO / TESTADO LOCALMENTE:** todos os comandos Node do job critical de .github/workflows/guardiao.yml foram executados, incluindo os mutantes esperados dos GPT-5H e trial. Os dois falsos vermelhos por require absoluto de TypeScript foram repetidos após criar junction ignorada node_modules e passaram; logs originais e retries preservados. results.json registra cada comando, expectativa, exit, duração e log.

**FATO CONFIRMADO / TESTADO LOCALMENTE:** a bateria pertinente adicional incluiu Kit BF criação e venda, Cartoon venda, Stripe assíncrono, falha Stripe, compra verificada, entitlement, moeda, clareza, checkout honesto, saldo baixo, atribuição de plano e pricing verdadeiro. Todos passaram, exceto o guardião legado de moeda descrito abaixo.

**FATO CONFIRMADO / TESTADO LOCALMENTE — vermelhos anteriores à implementação:**

- scripts/test-locale-readiness.mjs: falta chave Hindi Any video engine — premium engines use more credits per film; fonte: 33-test-locale-readiness.log.
- scripts/test-checkout-currency-truth.mjs: guardião espera cobrança USD mundial, mas a fonte atual informa BRL no Brasil; fonte: 64-test-checkout-currency-truth.log. Não foi corrigido fora do escopo.

**FATO CONFIRMADO / TESTADO LOCALMENTE — isolamento:** os processos de teste usaram offline-guard.cjs (rede e leitura de nomes .env bloqueadas). O runner inicial passou somente variáveis do sistema necessárias; retries eliminaram nomes de credenciais do ambiente herdado. SDKs/banco/Stripe dos harnesses foram fakes em memória. Não houve build, deploy, migração, leitura de .env ou chamada paga.

**QUESTÃO PENDENTE / DESCONHECIDO:** não há validação em produção ou no GitHub Actions nesta baseline. A nova camada precisa ser comparada com estas mesmas falhas legadas, além do seu próprio guardião e desfaz.
