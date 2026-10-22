# KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — reprodução local

**FATO CONFIRMADO — 22/10/2026:** `run-suite.cjs` e `offline-preload.cjs` são as cópias exatas usadas na comparação. O runner inventaria scripts `test-*.mjs`, arquivos `tests/*.test.mjs` e provas `prove-*.mjs`. Executa os testes com escrita identificável em sequência; os demais usam a concorrência indicada.

**FATO CONFIRMADO:** os filhos recebem somente variáveis de sistema, sem credenciais. O preload bloqueia leitura de `.env`, rede Node e escritas nos dois arquivos protegidos; subprocessos ficam limitados a Git de leitura, Node e ffprobe local. Os cinco testes históricos incompatíveis com essa lista de comandos estão discriminados no consolidado.

**SUGESTÃO — reprodução:** use duas worktrees limpas e dependências locais, sem arquivos de ambiente. O primeiro argumento é a raiz da worktree, o segundo identifica a execução, o terceiro aceita uma lista JSON opcional; o quarto e quinto configuram concorrência e prazo por arquivo. Os resultados ficam no diretório temporário do sistema, ou em `KINEO_QA_OUTPUT_DIR`.

```powershell
node docs/qa/roteiro-curto-2210-validation/run-suite.cjs "CAMINHO_DA_WORKTREE_BASE" baseline
node docs/qa/roteiro-curto-2210-validation/run-suite.cjs "CAMINHO_DA_WORKTREE_CANDIDATA" candidate
```

**TESTADO LOCALMENTE:** a execução registrada inclui a bateria inteira e repetições específicas após mudanças nos guardiões ou prazos excedidos. Cada tentativa, SHA e falha permanece no consolidado; prazo excedido não é certificado como verde. Essas provas não incluem publicação nem filme pago.
