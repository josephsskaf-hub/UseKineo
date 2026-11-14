# Validação da missão 7

**TESTADO LOCALMENTE · 13/11/2026.** Entrega reancorada na main `0ec28691a532ddc85a732e8cfc906a8dd430a5e0`, incluindo áudio original e proteção contra resultado sem troca. O código exato do build e do typecheck bruto está registrado em `BUILD-SOURCE.json`; o do gate, em `GATE-RUN.json`. O primeiro SHA experimental da API `f928d5b48` foi substituído pela versão publicada, sem duplicar a API. Nenhum arquivo de API ou biblioteca canônica do backend foi modificado pela tela.

| Verificação | Resultado e evidência |
|---|---|
| Build otimizado final, após reancorar e corrigir MIME/download | **PASSOU**, `npx next build`, saída 0; `validacao/build.log` |
| Typecheck bruto das fontes | **PASSOU**, `npx tsc --noEmit --incremental false`, saída 0; `validacao/tsc.log` vazio significa ausência de diagnósticos; `.next/types` ainda ausente no início desta execução |
| Tela SSR e handlers | **PASSOU**, 14 cenários, 173 verificações e 27 mutantes recusados no contrato esperado; `validacao/gate/ramo/test-recreate-seu-video-ui-1311.mjs.log` |
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

**FATO CONFIRMADO / última integração:** o texto acompanha `SEU_VIDEO_SOM_ORIGINAL` nos estados inicial e de espera, incluindo o modo desligado; a falha `not_swapped` orienta trocar a foto ou vídeo e só confirma estorno com valor positivo no estado. As capturas da nova tela e fixtures foram refeitas após essa integração. A prova de ida/volta do cadastro é anterior à atualização do áudio, como rotulado no HTML.

**QUESTÃO PENDENTE / próximo passo da CEO:** publicar e validar a geração completa com conta da casa e foto autorizada, conferir o download e o estorno real se ocorrer recusa. O interruptor de API continua `internal`; o de apresentação só habilita `/recreate-preview`. A missão 6 Etapa 2 continua preservada e em espera.
