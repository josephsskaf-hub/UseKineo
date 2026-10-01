# MRR — entrega local de 01/10/2026

**IMPLEMENTADO / ainda não VALIDADO EM PRODUÇÃO.** Duas alavancas: botão junto da ideia no Studio e prova comercial com valor em filmes no novo /showcase, acessível pela vitrine da home. O funil, suas lacunas e os cenários estão em [MEASUREMENT.md](MEASUREMENT.md). Não há promessa de novos pagantes com base em teste local.

**FATO CONFIRMADO.** `components/StudioNearIdeaAction.tsx:17` mostra motor/duração e permite revisar ajustes; recebe o custo final do Studio, inclusive adicionais. `lib/growth/mrrStudio.ts:5` bloqueia texto vazio/incompleto, limite excedido e saldo insuficiente/desconhecido. Não cria render nem modifica o handler original. `lib/growth/mrrShowcase.ts:22` deriva filmes do custo vigente e créditos/preço canônicos, sem preço literal em JSX. A vitrine usa a seleção pública existente e exclui motor pausado em `app/showcase/ShowcaseExperience.tsx:29`.

**TESTADO LOCALMENTE.** Chrome com os componentes React reais transpilados, CSS e imagens locais; conta e respostas GET simuladas. Viewports 1440×1000 e 390×844, claro/escuro. Vinte capturas em `media/`; comparação autocontida em `REVIEW.html`. O preview da home recorta a seção alterada. O showcase não existia na base: não há imagem anterior fictícia. As capturas não são de produção nem teste de autenticação/SSR do Next completo.

**TESTADO LOCALMENTE.** Interações confirmam: botão vazio desabilitado; ideia registrada uma vez por montagem; clique explícito usa a navegação original com formato; nenhum POST/render real; modo Clipe sem botão novo; duração muda filmes/créditos mantendo preço mensal canônico; motor pausado ausente; primeira interação da vitrine registrada. Logs em `media/browser-results.json`. Harness isolado em `C:/Users/josep/.codex/outputs/01a0e5e3-36cf-72b3-bc5d-26ca2cd6e88d/mrr-20261001/{preview.cjs,preview-boot.js,verify-browser.cjs}`. Ele bloqueia rede externa e simula analytics, portanto não prova entrega de eventos ao banco.

**TESTADO LOCALMENTE.** Guardiões novos `scripts/test-mrr-studio-near-idea-2026-10-01.mjs` (7 mutantes) e `scripts/test-mrr-showcase-2026-10-01.mjs` (6 mutantes). Adaptador de `test-showcase-premium.mjs` carrega a nova dependência no SSR isolado; nenhuma asserção anterior removida. Suíte completa executada sem rede/credenciais com timeout de 90 s por arquivo; comparação contra main 87825d3225af384ed4c887a7faf7bacbe4546c47. Resultado definitivo vai no checkpoint externo depois da execução congelada; não interpretar falhas históricas como suíte verde.

**IMPLEMENTADO.** Eventos de impressão/gesto têm versão explícita; identidade vem do sink autenticado e session_id do helper existente. Texto de ideia não é transmitido nos eventos novos. Dedupe no navegador reduz repetição, mas a régua é DISTINCT user_id no SQL. `after-versioned-48h.sql` separa exposições por versão/variante, pessoas com 48 h de acompanhamento e sessões anônimas não resolvidas. Um session_id só liga uma visita a pessoa se tiver exatamente um user_id. Não comparar taxa histórica de 30 dias a taxa nova de 48 h como melhoria.

## Reversão e decisões

**SUGESTÃO / reversível.** Desligar `MRR_NEAR_IDEA_ENABLED` em `lib/growth/mrrStudio.ts:2` remove o botão e mantém a mesma régua com variante control. Desligar `MRR_SHOWCASE_ENABLED` em `lib/growth/mrrShowcaseConfig.ts:1` remove a porta e faz /showcase responder notFound. Qualquer desligamento segue a mesma fila/publicação revisada; não há operação no banco. Para retirar código integralmente, reverter os commits da sprint numa branch própria, preservando merges e trabalho de outras sessões.

**QUESTÃO PENDENTE / DESCONHECIDO.** Publicação, ingestão real dos eventos, visitas/pessoas/cadastros/primeiras assinaturas posteriores e MRR incremental ainda não comprovados. Não confundir enfileirar com deploy. A amostra anterior não tem a nova versão; manter/desligar por conversão exige coortes comparáveis, sem atribuição causal automática.

**PARA O FUNDADOR DECIDIR.** Executar o PUBLICAR revisado quando existir; depois avaliar permanência com dados maduros. Preços, planos e cupons permanecem como estão. Não há gasto, crédito, geração ou envio de e-mail nesta entrega.
