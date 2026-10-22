# KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — reprodução local

**FATO CONFIRMADO — 22/10/2026:** `run-suite.cjs` e `offline-preload.cjs` são as cópias exatas usadas na comparação. O runner inventaria scripts `test-*.mjs`, arquivos `tests/*.test.mjs` e provas `prove-*.mjs`. Executa os testes com escrita identificável em sequência; os demais usam a concorrência indicada.

**FATO CONFIRMADO:** os filhos recebem somente variáveis de sistema, sem credenciais. O preload bloqueia leitura de `.env`, rede Node e escritas nos dois arquivos protegidos; subprocessos ficam limitados a Git de leitura, Node e ffprobe local. Os cinco testes históricos incompatíveis com essa lista de comandos estão discriminados no consolidado.

**SUGESTÃO — reprodução:** use duas worktrees limpas e dependências locais, sem arquivos de ambiente. O primeiro argumento é a raiz da worktree, o segundo identifica a execução, o terceiro aceita uma lista JSON opcional; o quarto e quinto configuram concorrência e prazo por arquivo. Os resultados ficam no diretório temporário do sistema, ou em `KINEO_QA_OUTPUT_DIR`.

```powershell
node docs/qa/roteiro-curto-2210-validation/run-suite.cjs "CAMINHO_DA_WORKTREE_BASE" baseline
node docs/qa/roteiro-curto-2210-validation/run-suite.cjs "CAMINHO_DA_WORKTREE_CANDIDATA" candidate
```

**TESTADO LOCALMENTE:** a execução registrada inclui a bateria inteira e repetições específicas após mudanças nos guardiões ou prazos excedidos. Cada tentativa, SHA e falha permanece no consolidado; prazo excedido não é certificado como verde. Essas provas não incluem publicação nem filme pago.

**FATO CONFIRMADO — integração de 22/10/2026:** a comparação corrente usa base `f3532d7d2`, execução inteira do merge `7044847a` e provas finais em `b7bd5e73`. O [consolidado da integração](../roteiro-curto-2210-merge-suite.json) incorpora grafo, seleções, hashes, todas as tentativas e triagem das diferenças de stdout. Execuções completas: oito processos, prazo de 120 segundos por arquivo; reexecuções: dois processos, 300 segundos; os quatro casos de prazo foram repetidos isoladamente, com um processo e as asserções originais. Timeouts restantes permanecem não verdes. O consolidado original contra `72d23210c` continua preservado separadamente.
