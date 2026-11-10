# CI — falhas herdadas da main

TESTADO LOCALMENTE — 2026-11-10T08:22:38.215Z; Node 22.23.4, main 10407b89a. Replay dos comandos Node críticos do workflow com dependências locais e PostgreSQL isolado; não foi npm ci limpo nem CI GitHub/Linux. Base efetiva: 54/107 passaram, 53 falharam. Candidato: 57/109 passaram, 52 falharam. Nenhum verde da main virou vermelho; dois gates Recreate novos passam; Five improvements foi corrigido dentro do workflow. Clips e Studio series também passaram separadamente (validacao-final.json), como o fundador pediu. Não chamo a CI inteira de verde.

FATO CONFIRMADO / ESCOPO — o bloco da manhã mandou deixar os guardiões já vermelhos na main sem correção ampliada. A investigação anterior foi arquivada fora do candidato; nenhuma correção dos antigos Ads/ofertas/render foi incluída para mascarar verde. Alguns primeiros erros de provas históricas mudam ao ver a camada Recreate; o fato de a mesma suíte já falhar não demonstra equivalência de todos os seus checks. Ambas as assinaturas estão em CI-COMPARACAO.json.

TESTADO LOCALMENTE — rechecagens: administração de apresentadores usa só loopback/arquivos e passou nas duas árvores fora da restrição de localhost; a primeira execução está preservada. Um teste de mutação recebeu UNKNOWN ao restaurar um arquivo no Windows e deixou seu mutante de duração; o arquivo foi reposto a partir da main, a suíte passou isolada e a auditoria final confirmou a restauração do conteúdo. Não entrou mudança em GenerateClient. Fontes: ci-retestes.json, ci-main-10407b89a.json e ci-candidato-109.json.

Já vinha vermelho — mantido sem alteração neste lote:

- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-cards-giro-undo-2410.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-leva-integration-2410.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-leva-rebase-2610.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-ads-amostra-anuncio-2410.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-ads-amostra-data-2410.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-support/ads-escolha-sample-media-2410.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-support/ads-amostra-race-2410.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-support/ads-amostra-upgrade-retry-2410.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-support/ads-amostra-entry-2410.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-ads-amostra-undo-2410.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-apresentadores-voice-2410.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-apresentadores-undo-2410.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-compra-avulsa-delivery-2410.mjs --mutants
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-compra-avulsa-ui-2410.mjs --mutants
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-compra-avulsa-undo-2410.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-ads-formatos-escolha-2410.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-idiomas-formatos-undo-2410.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-ads-escolha-publico-2410.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-ads-escolha-2310.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-ads-render-fix-2310.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-trafego-pages-2310.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-trafego-undo-2310.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-admin-leve-undo-2310.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-roteiro-curto-undo-2210.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** docs/video-fiel-2610/juiz-offline.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** docs/video-fiel-2610/cenas-test.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** docs/video-fiel-2610/test-legacy-layer.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** docs/free15-quality-v2/caption-legacy-test.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-filme15-legenda-canonica-2610.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-filme15-perfeito-undo-2610.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** docs/compra-clareza-2610/test-recurring-plan-value.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** docs/compra-clareza-2610/test-own-idea-start.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** docs/compra-clareza-2610/test-result-script-review.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** docs/compra-clareza-2610/test-legacy-layer.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-afiliados-acordam.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-coerencia-kineo1-2026-09-16.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-juiz-still-2026-10-06.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-gpt-v31-facts-2026-09-24.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-gpt-v31-facts-2026-09-24.mjs --mutant
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-seedance-hero-plans-2026-09-28.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-motores-geo-2026-10-06.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-locale-readiness.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-app-blue-layout.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-cinematic-timeline-2026-09-11.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-cinematic-speech-2026-09-11.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-music-direction-2026-09-11.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-visual-contract-2026-09-11.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-quality-route-integration-2026-09-11.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-quality-failure-ui-2026-09-11.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-cinematic-terminal-proof-2026-09-11.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-cinematic-poll-diagnostic-2026-09-11.mjs
- **JÁ VINHA VERMELHO / TESTADO LOCALMENTE:** scripts/test-cartoon-tracao.mjs --mutants
