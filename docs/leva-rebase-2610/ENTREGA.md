# KINEO-LEVA-REBASE-2610

**FATO CONFIRMADO — base, 26/10/2026:** merge --no-ff de origin/codex/leva-2410 (07435f57b7e18d4d37c325e57134776d452db382) sobre a main remota consultada em 26/10/2026 (46fa10e58fced6430e0a2ba7bb445bb8905bd2e7), em codex/leva-rebase-2610. O checkout principal foi preservado.

**IMPLEMENTADO — preservação:** scripts/test-leva-rebase-2610.mjs verifica fontes brutas de lib/filmes, lib/textLanguage.ts e rota cinematográfica iguais à main; compose conserva toda a main mais a linha original de entrega da compra avulsa. As duas seções de decisão foram preservadas em docs/DECISIONS.md.

**IMPLEMENTADO — integração histórica:** scripts/test-support/leva-rebase-2610.mjs sela a árvore combinada e projeta somente hashes completos reconhecidos para cada parent imutável. As fontes desconhecidas seguem visíveis aos guardiões originais. O manifesto histórico LEVA permanece igual a 07435f57b; preços, limites e manifestos das camadas não foram resealados.

**TESTADO LOCALMENTE — TypeScript, 26/10/2026:** node node_modules/typescript/bin/tsc --noEmit --incremental false terminou com exit 0. Régua completa e comparação com main em execução; evidência final será registrada antes do push.

**QUESTÃO PENDENTE / DESCONHECIDO:** publicação, migrations aplicadas, exposição e pagamentos externos desta integração. Esta tarefa prepara e envia somente a branch; não comprova resultado comercial.
