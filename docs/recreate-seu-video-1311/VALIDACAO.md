# Validação da missão 7

**TESTADO LOCALMENTE · 13/11/2026, até 21:09 −03:00.** Código da entrega: `8c3eacd19` + `192a0fe0a`, sobre a main publicada `4a299ab1e85c2aed398fff38daac75b323313f15`. A API publicada já está nessa base (`246c5865c` + `8f03330ce`); o primeiro SHA experimental `f928d5b48` foi substituído na ancestralidade, sem duplicar a API. Nenhum arquivo de API ou biblioteca canônica do backend foi modificado pela tela.

| Verificação | Resultado e evidência |
|---|---|
| Build otimizado final, após reancorar e corrigir MIME/download | **PASSOU**, `npx next build`, saída 0; `validacao/build.log` |
| Typecheck bruto das fontes | **PASSOU**, `npx tsc --noEmit --incremental false`, saída 0; `validacao/tsc.log` vazio significa ausência de diagnósticos; `.next/types` ainda ausente no início desta execução |
| Tela SSR e handlers | **PASSOU**, 13 cenários, 163 verificações e 25 mutantes recusados no contrato esperado; `validacao/gate/ramo/test-recreate-seu-video-ui-1311.mjs.log` |
| Cliente da API com transporte injetado | **PASSOU**, 82 verificações e 9 mutantes; log `test-seu-video-client-1311.mjs.log` na mesma pasta |
| Rascunho IndexedDB e volta em outra aba | **PASSOU**, 89 verificações e 10 mutantes; log `test-seu-video-draft-1311.mjs.log` |
| Catálogo: fontes e arquivos reais | **PASSOU**, 8 referências, 98 verificações, 13 mutantes e cenário de mídia ausente recusado; log `test-recreate-seu-video-catalog-1311.cjs.log` |
| Guardião da API publicada | **PASSOU**, 28 ok, 0 falhas; `validacao/backend.log` |
| Download da casa | **PASSOU**, guardião da main e seus 9 mutantes; uso do helper na nova tela também protegido por mutante próprio da UI |
| Gate oficial de vermelhos novos | **PASSOU**, saída 0; 13 testes, 11 verdes e 2 vermelhos também na main; `validacao/gate-console.log`, `validacao/gate/ramo.txt`, `validacao/gate/main.txt` |

**FATO CONFIRMADO:** os dois testes já vermelhos são `test-five-improvements.mjs` e `test-recreate-trava-1011.mjs`. Seus logs do ramo e da main foram preservados. O gate executou o helper real, com árvore limpa, `PARALELO=2` e `TETO_SEGUNDOS=300`, e voltou para `codex/recreate-seu-video-1311`. Nenhum teste novo depende de `C:/kineo` como fallback: dependências vêm de `node_modules` da raiz indicada, e arquivo de runtime ausente falha explicitamente. A API e os auxiliares de produção coincidem com a main de referência.

Comando do gate:

```sh
bash scripts/ci/novos-vermelhos.sh '^test-(recreate-|seu-video-|menu-recreate-1211|enquadramento-vitrine-0911|sharing-safety|five-improvements|download-nosso-1311)'
```

**CONTRADIÇÃO preexistente / limite de tipos:** o build do projeto ignora a validação de tipos. Uma execução anterior com tipos de rotas gerados registrou 15 diagnósticos em exportações/assinaturas antigas, fora desta tela (`validacao/tsc-gerado-pelo-build.log`). O teste bruto verde não deve ser apresentado como correção dessa dívida. Esses arquivos não receberam alterações nesta missão. O build final passou e foi aberto no navegador; não é prova de geração real.

**TESTADO LOCALMENTE no navegador:** `DOM-MOBILE.json` e `DOM-DESKTOP.json` registram 390×844 e 1920×1080 no build final sobre a main publicada, sem largura excedente ou texto próprio abaixo de 12px. O valor no botão apareceu também numa abertura fria com metadados já carregados antes da hidratação. Os JPEGs são capturas do viewport inteiro, com dimensões verificadas, sem edição. `COMPARACAO.html` abriu no navegador, com as 18 fotos embutidas e zoom nativo funcional.

**TESTADO LOCALMENTE / percurso do visitante:** `FLUXO-NAVEGADOR.json` registra vídeo próprio e foto fictícios, edição, clique Generate, URL de cadastro com referência opaca e restauração na nova aba da mesma origem. Não houve cadastro real, upload autenticado, geração, débito ou estorno reais. Os estados autenticado, externo, espera, falha e resultado são testes de componente ou fixtures explicitamente identificadas.

**FATO CONFIRMADO / correções da revisão:** (1) o mesmo helper de MIME é usado no cliente e no armazenamento, preservando bytes e tipos originais, inclusive nomes longos; (2) a duração do catálogo é lida mesmo se o evento ocorrer antes da hidratação; (3) idempotência preserva o objeto conferido e os arquivos na repetição incerta; (4) a instrução editada é medida corretamente; (5) o resultado usa primeiro quadro e download da casa. Cada contrato alterado tem teste que rejeita sua remoção.

**QUESTÃO PENDENTE / próximo passo da CEO:** publicar e validar a geração completa com conta da casa e foto autorizada, conferir o download e o estorno real se ocorrer recusa. O interruptor de API continua `internal`; o de apresentação só habilita `/recreate-preview`. A missão 6 Etapa 2 continua preservada e em espera.
