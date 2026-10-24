# KINEO-TRAFEGO-2310 — integração da main em 24/10/2026

**FATO CONFIRMADO / IMPLEMENTADO.** Merge `ee2662ae1135b18890a77cd7b6dac375f56cca6b`, com pais `8f5114bb3544bdb43d281cca37836d0d92ce6b29` (Tráfego) e `dd0abba8cc711be4bde2faaac39f0aef29f3f90d` (main). Branch de entrega: `codex/trafego-2310`.

**FATO CONFIRMADO.** Os três conflitos foram resolvidos preservando as camadas: comandos Public e Tráfego em `.github/workflows/guardiao.yml:27`; sete eventos Public e o alarme protegidos em `app/api/events/route.ts:23`; helper Escolha antigo idêntico à main em `scripts/test-support/desfaz-ads-escolha-2310.mjs:7`.

**FATO CONFIRMADO.** O encadeamento acíclico é Escolha → Public → Tráfego → JSON. Public remove somente os hunks exatos de Tráfego antes de verificar seus hashes completos e continua rejeitando divergências (`scripts/test-support/desfaz-ads-escolha-publico-2410.mjs:15`). O manifesto Public ficou byte a byte igual à main. O manifesto Tráfego agora restaura exatamente `dd0abba8`: 15 arquivos existentes e 39 hunks (`scripts/test-support/desfaz-trafego-2310-hunks.json:2`). O manifesto original da base `895d6c99` está preservado em `desfaz-trafego-base-895d6c99.json`.

**FATO CONFIRMADO.** A prova histórica Public usa o inventário completo da entrega imutável `f6ddd3f4`. Seus leitores de código, execução e mutantes continuam usando fontes atuais. A prova também exige que cada fonte Public, após retirar exclusivamente Tráfego, seja idêntica à main e ao hash original; verifica a cadeia integrada em LF e CRLF (`scripts/test-ads-escolha-publico-2410.mjs:371`). Nenhum snapshot Public foi regenerado.

**FATO CONFIRMADO.** `git diff dd0abba8 ee2662ae` está vazio para `lib/checkoutPricing.ts`, `lib/settlementCurrency.ts`, `vercel.json`, `components/home/HomeThreeCards.tsx`, `lib/ui/homeThreeCards.ts` e os seis assets novos dos cards. Os testes das seis entradas preservam URLs, títulos, canonicals e preços. Nesta integração, os textos e a data editorial de Tráfego permanecem os da entrega de 23/10.

**TESTADO LOCALMENTE — 24/10/2026.** Baterias em worktrees isoladas, com rede e leitura de arquivos de ambiente bloqueadas nos testes; sem chamadas pagas ou aplicação de migration. Resultados no snapshot `ee2662ae`:

| Verificação | Resultado |
| --- | --- |
| Ads Escolha | Verde: 39 mutantes, 29 provas UI e desfaz exato |
| Ads Render Fix | 32/32 |
| Páginas IA claras | 235/235 |
| Public | Verde: 24 mutantes mortos por asserção e desfaz exato |
| Tráfego: páginas / índice / alarme / desfaz | Quatro verdes; alarme 8/8 mutantes; desfaz 181/181 |
| Comparação completa | Main: 43/45 verdes; merge: 48/49 verdes; zero vermelho novo |
| Quatro mutantes GPT esperados | Mortos pelas mesmas asserções do baseline |
| TypeScript bruto | Exit 0, stdout/stderr vazios; TS 5.9.3, Node 24.18.0 |

**TESTADO LOCALMENTE.** Comando de tipos: `node node_modules/typescript/bin/tsc --noEmit --incremental false`. Provas completas: `merge-guardian-matrix.json`, `candidate-workflow.json`, `final-tsc.json` e os JSONs de baseline deste diretório. Os quatro guardiões Tráfego explicam a diferença entre os totais das baterias.

**FATO CONFIRMADO / TESTADO LOCALMENTE — o que estava errado.** Public já falhava na main ao comparar seu inventário histórico com toda a árvore posterior: 51 arquivos declarados contra 57 alterados, sendo os seis extras os assets aprovados dos cards. `baseline-public-inventory-audit.json` compara commits imutáveis, sem incluir artefatos locais; `baseline-public-inventory.txt` preserva o erro original. A reâncora corrigiu essa falha sem remover asserções de comportamento.

**FATO CONFIRMADO / TESTADO LOCALMENTE — pendência herdada.** O único vermelho restante é `scripts/test-locale-readiness.mjs:14`: tradução Hindi ausente de “Any video engine — premium engines use more credits per film”. Mesma asserção, teste e dicionários da main; evidência em `baseline-locale-readiness.txt` e na matriz.

**FATO CONFIRMADO.** `git grep -n '^<<<<<<<'` foi executado antes do commit: o único match bruto é um PNG histórico, idêntico à main (`docs/previews/K18-PT-ES-SCRIPT-LAUNCHERS-2026-09-04.png`). `git grep -I -n '^<<<<<<<'` não encontrou marcador textual; `git diff --check` passou. O commit posterior de entrega contém somente estas provas documentais; o código validado permanece `ee2662ae`.

**SUGESTÃO — próximo passo recomendado.** Revisar esta branch com o fluxo público e os cards preservados; corrigir a tradução Hindi em tarefa própria. Esta prova é local e não constitui validação em produção nem evidência de recuperação de tráfego.
