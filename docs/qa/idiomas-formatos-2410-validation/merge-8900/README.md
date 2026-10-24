# Merge da main 8900 — prova de 24/10/2026

**FATO CONFIRMADO / IMPLEMENTADO.** `git fetch origin` confirmou a main `8900a4f6ee5154a7a5cc13b2077c3ae0c2ae8405`. O merge `d09cf5d91417a2b6626707ab8e9849a7546b6a54` tem os pais `b01cfe2cb2d9f244df0ee22baa649daa8d6103fe` e `8900a4f6ee5154a7a5cc13b2077c3ae0c2ae8405`. A branch continua `codex/idiomas-formatos-2410`. Fonte: [source-union.json](source-union.json).

**FATO CONFIRMADO / IMPLEMENTADO.** Os conflitos em `scripts/test-ads-escolha-publico-2410.mjs:369` e `scripts/test-support/desfaz-ads-escolha-publico-2410.mjs:15` mantêm ambas as camadas: Idiomas → Tráfego → Public, antes dos retornos antecipados e hashes históricos. O teste Public conserva todas as asserções da main, seu inventário imutável `f6ddd3f4` e acrescenta a igualdade com a fonte publicada em 8900 após retirar somente Idiomas. Runtime, UI e mutantes continuam lendo fontes atuais. O manifesto Public e os hunks Tráfego são idênticos aos da main.

**FATO CONFIRMADO / TESTADO LOCALMENTE.** O helper Idiomas permanece uma folha acíclica. Conserva os bytes `before` da base original `dd0abba8`, os hashes da entrega original `b01cfe2c` e, nas três sobreposições exatas, os bytes integrados de 8900. O leitor de Tráfego undo tem antes próprio de 8900, pois não existia em dd0. O guardião comprova as duas histórias, LF/CRLF, caminhos Windows, idempotência, adulteração de fonte/manifesto e inventário relativo à main integrada. Fontes: `scripts/test-support/desfaz-idiomas-formatos-2410.mjs:8`, `scripts/test-idiomas-formatos-undo-2410.mjs:9`, `scripts/test-trafego-undo-2310.mjs:15`.

**TESTADO LOCALMENTE — comparação atual.** A [main efetiva](baseline-8900.effective.json) terminou 55 execuções: 53 conformes e duas falhas herdadas. A [candidata integrada](candidate-8900.json) terminou 59 execuções: 57 conformes e as mesmas duas falhas. Zero novo vermelho, agravamento, ausente, duplicata ou timeout. Os 55 comandos e argumentos originais estão presentes; as quatro adições são os guardiões desta camada. Os quatro mutantes GPT de saída um esperada contam como conformes apenas após conferência da mesma falha contratual específica da base. Fonte: [merge-comparison.json](merge-comparison.json).

**TESTADO LOCALMENTE — auditoria independente.** Uma segunda composição conferiu argumentos, estados, hashes, os quatro mutantes GPT e as assinaturas das duas falhas herdadas. Também verificou os 104 registros de fonte diretamente contra os commits Git, incluindo as três sobreposições e o leitor com base própria.

| Classificação em 24/10/2026 | Verificação | Resultado na candidata |
| --- | --- | --- |
| TESTADO LOCALMENTE | Ads Público | Verde, 24 mutantes mortos por asserção e desfaz integrado |
| TESTADO LOCALMENTE | Ads Escolha | Verde, 39 mutantes e 29 provas UI |
| TESTADO LOCALMENTE | Ads Render Fix | Verde, 32/32 |
| TESTADO LOCALMENTE | Tráfego páginas / índice / alarme / desfaz | Quatro verdes; alarme com oito mutantes; desfaz 196 verificações |
| TESTADO LOCALMENTE | Idiomas / Unicode / formatos / desfaz | Quatro verdes; 104 fontes com restauração exata nas duas histórias |
| TESTADO LOCALMENTE | Admin e roteiro curto | Mutantes em disco e desfaz verdes; fontes restauradas |
| TESTADO LOCALMENTE | GPT | Quatro positivos verdes e quatro mutantes mortos pelas mesmas falhas contratuais |
| TESTADO LOCALMENTE | TypeScript bruto | `node node_modules/typescript/bin/tsc --noEmit --incremental false`, saída zero |
| TESTADO LOCALMENTE | Worktrees de teste | Limpas, HEAD inalterado após cada bateria serial |

**TESTADO LOCALMENTE — o que ainda pode melhorar.** `test-locale-readiness.mjs:14` continua falhando pela tradução Hindi ausente de “Any video engine — premium engines use more credits per film”. `test-plan-film-language.mjs` continua esperando oito filmes, enquanto o cálculo atual retorna doze. Os dois testes e suas falhas específicas coincidem com a main. Não foram afrouxados nem corrigidos fora do escopo. Os logs integrais das duas árvores e as assinaturas estão neste diretório.

**TESTADO LOCALMENTE — isolamento e limites.** Ambiente Windows, Node 24.18.0. Rede e leitura de arquivos de ambiente bloqueadas; sem chamadas pagas, build, deploy ou acesso a banco de produção. A primeira tentativa upstream de Tráfego undo foi bloqueada pelo preload por usar `git ls-tree`, somente leitura. A allowlist local foi corrigida para esse subcomando; o rerun passou, substituindo apenas esse resultado no recibo efetivo. A tentativa original e o recheck permanecem arquivados. A rodada é a critical unificada, compilador e dois diagnósticos adicionais; não é uma repetição dos mais de mil scripts legados. A prova integral pré-merge permanece histórica em `../comparison.json`.

**FATO CONFIRMADO / TESTADO LOCALMENTE — proveniência.** Os 36 TS/TSX desta tarefa são idênticos ao pai `b01cfe2c`; os 16 TS/TSX recebidos de Tráfego são idênticos ao pai `8900a4f6`. Não há alteração manual nesses arquivos de produto. Os dois manifestos anteriores têm os mesmos blobs Git. A prova é executável por [prove-source-union.cjs](prove-source-union.cjs); hashes de recibos e 115 logs brutos estão em [evidence-files.json](evidence-files.json). Atributos locais preservam os bytes dos JSONs/logs em checkouts Windows.

**TESTADO LOCALMENTE — inventário após empacotar.** O guardião de desfaz foi repetido após incluir estes artefatos: saída zero, 104 fontes exatas, ambas as histórias e inventário completo. Fonte: [final-inventory.json](final-inventory.json). Depois da bateria em `d09cf5d9`, somente relatório, artefatos de QA e seu inventário foram alterados; nenhum TS/TSX mudou.

**FATO CONFIRMADO — marcadores.** Antes do commit de merge, `git grep -n '^<<<<<<<'` encontrou somente o PNG histórico `docs/previews/K18-PT-ES-SCRIPT-LAUNCHERS-2026-09-04.png`, idêntico à main. `git grep -I -n '^<<<<<<<'` não encontrou conflito textual. `git diff --check` passou.

**SUGESTÃO — próximo passo recomendado.** Revisar a branch integrada e tratar as duas pendências herdadas em tarefa própria. A prova local não valida qualidade de voz/vídeo ou recuperação de tráfego em produção.
