# HANDOFF CODEX — FLUXO — 03→04/09/2026

**FATO CONFIRMADO:** este é o arquivo único e append-only definido para a pista FLUXO; as medições abaixo contam pessoas, não eventos, salvo quando ambos são mostrados explicitamente. Fonte: `docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md:313-320`.

---

## Rodada 1 — K2 · roteiro ChatGPT rotulado — 03/09 22:42→23:26 BRT — ENTREGA PARCIAL

- **IMPLEMENTADO / VALIDADO EM PRODUÇÃO:** a mudança K2 e seus gates técnicos foram concluídos.
- **BLOQUEADO / DESCONHECIDO:** a rodada é parcial perante `docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md:324-335,471-482`, porque o conector recusou o vigia individual de checkout e cadastros por origem.

### Dado, hipótese e anti-repetição

- **EVIDÊNCIA DE PRODUÇÃO — janela de 60 dias consultada em 03/09/2026 durante a rodada #3, 15:50→16:35 BRT:** 22 pessoas externas colaram roteiro completo com direções; o grupo fez 2,45 filmes por pessoa contra 1,53 no restante e converteu 2,6× melhor. Fonte: `docs/SPRINT-ASSINATURAS-2026-09-03.md:235-237,267-283` e `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:16`.
- **HIPÓTESE:** dizer o contrato real do parser antes do clique reduz o primeiro filme usado como conserto de narração e aumenta o segundo filme intencional desse grupo.
- **FATO CONFIRMADO:** a landing existente já contém o launcher que transporta o roteiro para o Studio; por isso K2 reutilizou `/chatgpt-to-youtube-shorts` e não abriu uma landing duplicada. Fontes: `app/chatgpt-to-youtube-shorts/page.tsx:405-415` e `app/youtube-shorts-from-topic/TopicGeneratorForm.tsx:68`.
- **FATO CONFIRMADO:** a promessa foi limitada ao comportamento verificável: entrada de até 1.000 caracteres e modo “somente fala” apenas quando há pelo menos dois rótulos de fala; com menos de dois, o parser retorna ao fluxo normal. Fontes: `app/youtube-shorts-from-topic/TopicGeneratorForm.tsx:68,183`, `lib/scriptParser.ts:382`.

### Vigia do checkout e placar

- **BLOQUEADO / DESCONHECIDO — 03/09/2026:** o vigia individual de checkout das últimas 2 horas não foi executado porque o conector Supabase recusou a operação somente leitura nesta rodada. Portanto não há linha por pessoa e nenhum zero foi inventado.
- **BLOQUEADO / DESCONHECIDO — 03/09/2026:** cadastros por origem nesta rodada também não foram medidos pela mesma recusa do conector Supabase; o agregado canônico abaixo não permite inferir a origem.
- **EVIDÊNCIA DE PRODUÇÃO — medição de 03/09/2026 22:08 BRT:** desde o marco de 03/09 16:00 UTC houve 15 cadastros, 10 pessoas com filme entregue (67%), 1 checkout de desejo, 1 checkout de defeito, 0 assinaturas e 0 pessoas com falha sem filme. Esta é a última medição cronologicamente coerente disponível e não substitui a janela individual de 2 horas. Fonte: `docs/SPRINT-ASSINATURAS-2026-09-03.md:960-972`.
- **CONTRADIÇÃO / DESCONHECIDO:** o diário #8 registra um placar posterior, mas seu cabeçalho afirma uma janela futura “23:30→00:55 BRT” apesar de o commit `e34a56b8` ter author time 23:01 BRT e committer time 23:17 BRT de 03/09/2026. Esse placar não foi usado como evidência nesta rodada. Fontes: `docs/SPRINT-ASSINATURAS-2026-09-03.md:1120-1125` e commit `e34a56b8`.

### O que mudou

- **IMPLEMENTADO:** o banner do ChatGPT agora explica o limite de 1.000 caracteres, os dois rótulos necessários, as direções reconhecidas que ficam fora da narração e preserva a alternativa de começar só com uma ideia. Fonte: `components/ChatGptWelcomeBanner.tsx:143-145`.
- **IMPLEMENTADO:** o launcher público agora apresenta o mesmo contrato antes de carregar o roteiro pelo cadastro. Fonte: `app/chatgpt-to-youtube-shorts/page.tsx:411-414`.
- **IMPLEMENTADO:** o limite anunciado continua preso ao limite real do formulário. Fonte: `app/youtube-shorts-from-topic/TopicGeneratorForm.tsx:68,183`.
- **IMPLEMENTADO:** foram acrescentadas invariantes em `scripts/test-chatgpt-quickstart.mjs:204-207` e `scripts/test-chatgpt-script-handoff.mjs:131-178`; quatro expectativas antigas do segundo arquivo foram alinhadas ao comportamento canônico atual sem alterar produto.
- **FATO CONFIRMADO:** nenhum preço, oferta, CTA, href, evento ou variante foi alterado; a variante permanece `chatgpt_quickstart_v5`. Fontes: `lib/growth/chatgptQuickstart.ts:1`, `components/ChatGptWelcomeBanner.tsx:86-132`.
- **TESTADO LOCALMENTE — 03/09/2026, reexecutado após rebase em `03a0eef4`:** `node scripts/test-chatgpt-quickstart.mjs` 107/107; `node scripts/test-chatgpt-script-handoff.mjs` 86/86; `node scripts/test-roteiro-de-cinema.mjs` 64/64; `node .\\node_modules\\typescript\\bin\\tsc --noEmit` com saída 0; `git -c core.whitespace=cr-at-eol diff --check` com saída 0. Fontes dos executáveis e invariantes: `scripts/test-chatgpt-quickstart.mjs:204-251`, `scripts/test-chatgpt-script-handoff.mjs:131-214`, `scripts/test-roteiro-de-cinema.mjs:420-422`.
- **TESTADO LOCALMENTE — 03/09/2026 23:22 BRT:** o comparativo antes/depois foi inspecionado em desktop e mobile. Fonte autocontida: `docs/previews/FLUXO-K2-CHATGPT-LABELED-SCRIPT-2026-09-03.html`; captura inspecionada: `C:\Users\josep\.codex\visualizations\2026\09\03\01a069b3-ddcf-7460-8515-1be8c04c4d08\fluxo-k2-chatgpt-labeled-script-compact.png`.

### Integração e produção

- **IMPLEMENTADO:** código integrado em `main` no SHA `e4d4f84dfcf5ad8f4a273a4a68b0b8d45d80aa90`; o DAG registra `dc9ee8e5` como pai direto.
- **VALIDADO EM PRODUÇÃO — 03/09/2026 23:13 BRT:** a Vercel marcou o deployment `2M4WNawoEYBppTa58j28iVpf1Vq3` como concluído.
- **VALIDADO EM PRODUÇÃO — 03/09/2026 23:13 BRT:** `https://www.usekineo.com/chatgpt-to-youtube-shorts` respondeu com a nova condição dos dois rótulos e a exclusão das direções reconhecidas da narração.
- **QUESTÃO PENDENTE / DESCONHECIDO:** o banner autenticado está implementado no mesmo SHA, mas não foi exercitado ponta a ponta em uma sessão autenticada de produção nesta rodada.
- **VALIDADO EM PRODUÇÃO — 03/09/2026 23:17 BRT:** o Guardião #41 concluiu verde no SHA `e4d4f84dfcf5ad8f4a273a4a68b0b8d45d80aa90`; os jobs TypeScript e suíte terminaram com `success`. Fonte: `https://github.com/josephsskaf-hub/UseKineo/actions/runs/33828614306`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** o total interno de baterias vermelhas do Guardião #41 não é inferível pela conclusão do job, porque a suíte mede `pass`/`fail`, mas é não bloqueante e não encerra com erro por bateria vermelha. Os três testes diretamente ligados a K2 estão verdes localmente. Fonte: `.github/workflows/guardiao.yml:70-109` e os comandos registrados acima.

### Como medir e quando parar

- **FATO CONFIRMADO:** o funil existente é `chatgpt_welcome_banner_shown` → `chatgpt_quickstart_selected` → `chatgpt_quickstart_studio_ready`; todos usam a variante `chatgpt_quickstart_v5`. Fontes: `components/ChatGptWelcomeBanner.tsx:86-132`, `app/(dashboard)/studio/StudioClient.tsx:261-262`, `lib/growth/chatgptQuickstart.ts:1`.
- **SUGESTÃO:** medir pessoas, não eventos: `studio_ready / selected`, entrega do primeiro filme e segundo filme entre quem trouxe `videos.topic` com `Voiceover:`/`Narration:`/`Narrador:`.
- **CONTRADIÇÃO / QUESTÃO PENDENTE:** o diário #7 atribuiu uma queda de 58 para 35 pessoas ao quickstart; um documento posterior em `main` afirma que os 23 casos precedem a instrumentação completa, mas pertence à mesma janela cronologicamente inconsistente do diário #8. Não mudar a caixa com base em nenhum dos dois totais antes de remedir uma janela pós-30/08. Fontes: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:25,27` e `docs/SPRINT-ASSINATURAS-2026-09-03.md:1127-1148`.
- **SUGESTÃO — gate de parada:** interromper a promessa e diagnosticar se qualquer reprodução pós-deploy com pelo menos dois rótulos de fala narrar `Visual:`, `Camera:`, cabeçalho de cena ou timecode. Para conversão, comparar pessoas únicas nas primeiras 24 horas completas pós-deploy com as 24 horas imediatamente anteriores e não decidir com eventos brutos.

### PEDIDOS

- **FATO CONFIRMADO:** o pedido K2 de 16:30 BRT foi marcado como atendido no SHA `e4d4f84dfcf5ad8f4a273a4a68b0b8d45d80aa90`. Fonte: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:16`.
- **FATO CONFIRMADO:** nenhum pedido novo foi aberto pela pista FLUXO nesta rodada; o único diff no arquivo de pedidos baixa K2. Fonte: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:16`.
- **QUESTÃO PENDENTE:** o pedido recebido sobre corte silencioso em 1.000 caracteres continua aberto; a copy nova informa o teto, mas ainda não existe contador nem tratamento explícito do excedente colado. Fonte: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:28`.

## PRÓXIMA JOGADA

- **SUGESTÃO:** atender primeiro o pedido de 17:10 BRT em `app/v/[id]`: normalizar o scaffolding legado antes de renderizar título/H1. Depois, tratar o pedido de corte em 1.000 caracteres; não mudar o quickstart com base no buraco 58 → 35 sem uma medição cronologicamente válida.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **FATO CONFIRMADO:** as duas superfícies explicam antes do clique quais blocos de fala serão lidos e quais direções reconhecidas ficarão fora, dentro do teto real do formulário. Fontes: `components/ChatGptWelcomeBanner.tsx:143-145`, `app/chatgpt-to-youtube-shorts/page.tsx:411-414`, `app/youtube-shorts-from-topic/TopicGeneratorForm.tsx:68,183`.
- **VALIDADO EM PRODUÇÃO — 03/09/2026 23:13 BRT:** a landing pública entrega a orientação no domínio canônico `https://www.usekineo.com/chatgpt-to-youtube-shorts`.
- **TESTADO LOCALMENTE — 03/09/2026:** o banner autenticado está coberto pelas 107 invariantes do quickstart e pelas 86 invariantes do handoff. Fontes: `scripts/test-chatgpt-quickstart.mjs:204-251`, `scripts/test-chatgpt-script-handoff.mjs:131-214`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** o banner autenticado ainda não foi exercitado ponta a ponta em uma sessão autenticada de produção.

---

## Rodada 2 — título público de série — 03/09 23:48→04/09 00:02 BRT — ENTREGA CONCLUÍDA

- **IMPLEMENTADO:** o modelo público e o bitmap social agora recuperam o assunto de prompts de continuação legados antes de expor o título.
- **BLOQUEADO / DESCONHECIDO:** a observação individual de checkout e a origem de novos cadastros não foram remensuradas; o conector Supabase recusou a leitura na rodada anterior e não existe nova autorização técnica disponível neste ciclo.

### Dado, hipótese e anti-repetição

- **EVIDÊNCIA DE PRODUÇÃO — consulta registrada em 03/09/2026 17:10 BRT:** 43 vídeos de 27 pessoas guardavam a instrução interna de continuação; 3 das 27 pessoas pagaram (11,1%), contra 12 de 751 pessoas da base com filme (1,6%). Fonte: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:17`.
- **HIPÓTESE:** mostrar o assunto reconhecível no lugar da ordem interna preserva confiança no compartilhamento e impede que o próximo remix volte a usar a instrução como tema.
- **FATO CONFIRMADO:** não foi criada outra rota nem outro normalizador. A entrega reutiliza `normalizeSeriesSeed` e centraliza o título exposto em `resolvePublicVideoTitle`. Fontes: `lib/seriesContinuation.ts:199-208`, `lib/publicVideos.ts:414-438`.
- **FATO CONFIRMADO:** o componente de página permaneceu Server Component e manteve o contrato de parâmetros já usado pelo repositório; nenhuma nova fronteira cliente foi introduzida. Fonte: `app/v/[id]/page.tsx:53,159` em 03/09/2026.

### Vigia do checkout e placar

- **BLOQUEADO / DESCONHECIDO — 04/09/2026:** sem leitura aceita do Supabase, não há linha individual de checkout das últimas 2 horas nem corte por origem; nenhum zero foi inferido. Fonte do vigia exigido: `docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md:324-335`.
- **EVIDÊNCIA DE PRODUÇÃO — medição de 03/09/2026 22:08 BRT:** o último placar cronologicamente coerente segue em 15 cadastros, 10 pessoas com filme entregue (67%), 1 checkout de desejo, 1 checkout de defeito, 0 assinaturas e 0 pessoas com falha sem filme. Fonte: `docs/SPRINT-ASSINATURAS-2026-09-03.md:960-972`.
- **CONTRADIÇÃO / DESCONHECIDO:** o diário #8 conserva uma janela futura em seu cabeçalho e não foi usado para atualizar o placar. Fonte: `docs/SPRINT-ASSINATURAS-2026-09-03.md:1120-1125` e commit `e34a56b8` (author time 03/09/2026 23:01 BRT; committer time 23:17 BRT).

### O que mudou

- **IMPLEMENTADO:** `resolvePublicVideoTitle` detecta scaffolding no título, no tópico e no candidato derivado; no ramo contaminado recupera primeiro o tópico completo, depois o título truncado, e usa `AI YouTube Short` quando não resta assunto seguro. Fonte: `lib/publicVideos.ts:414-438`.
- **IMPLEMENTADO:** `toPublicVideo` entrega esse único valor ao H1, metadata, JSON-LD, breadcrumb, compartilhamento e CTAs já consumidores de `PublicVideo.title`, sem promover a linha contaminada de volta ao sitemap. Fontes: `lib/publicVideos.ts:527-549`, `app/v/[id]/page.tsx:56,63,118,146,169,175,232,330,352`.
- **IMPLEMENTADO:** a rota de imagem OG, que faz uma consulta própria, também usa o resolver compartilhado e mantém o gate de privacidade antes da leitura administrativa. Fonte: `app/v/[id]/opengraph-image.tsx:5,24-30,45`.
- **FATO CONFIRMADO:** nenhum preço, oferta, CTA textual, destino, evento, autenticação ou política pública foi alterado. Fontes: diff do commit `96310071ebdba64881e228df5331dadb25990991` e `lib/publicSurfacePolicy.ts:11`.
- **TESTADO LOCALMENTE — 03/09/2026 23:57 BRT:** `node scripts/test-public-video-privacy.mjs` 87/87; `node scripts/test-serie-episodio-2.mjs` 262/262; `node scripts/test-public-video-remix.mjs` 36/36; `node node_modules/typescript/bin/tsc --noEmit` com saída 0; `git diff --check` sem erro. Fontes: `scripts/test-public-video-privacy.mjs:62-107,166-167` e os executáveis citados.
- **TESTADO LOCALMENTE — 03/09/2026 23:54 BRT:** o comparativo autocontido foi inspecionado em desktop de 1.440 px e mobile de 360 px. Fontes: `docs/previews/FLUXO-PUBLIC-VIDEO-TITLE-2026-09-03.html` e `docs/previews/FLUXO-PUBLIC-VIDEO-TITLE-2026-09-03.png`.
- **TESTADO LOCALMENTE — 03/09/2026 23:58 BRT:** duas revisões independentes deram GO após exigir que o tópico bruto entrasse no detector, o tópico completo precedesse o título truncado e o bitmap OG compartilhasse o mesmo resolver. Fonte: revisão dos agentes `inspect_tests` e `trace_public_series` nesta rodada.

### Integração e produção

- **IMPLEMENTADO:** código integrado por fast-forward em `main` no SHA `96310071ebdba64881e228df5331dadb25990991`; o pai direto é `61422aeee3dd291274449bafaa9d544c399a039b`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 00:00 BRT:** a Vercel marcou o deployment `5QYjDJXCkgHEJXCGnJFnxkBsBygq` como concluído para o SHA funcional.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 00:01 BRT:** `https://www.usekineo.com/` respondeu 200 e uma URL sintética em `/v/[id]` respondeu 404, coerente com a política anônima desligada.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 00:01 BRT:** o Guardião #46 concluiu verde no SHA funcional; os jobs “Suíte de testes” e “TypeScript” terminaram com `success`. Fonte: `https://github.com/josephsskaf-hub/UseKineo/actions/runs/33831554780`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** as 43 páginas legadas não podem ser exercitadas anonimamente enquanto `CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED` estiver `false`, e seus IDs não foram lidos nesta rodada. A correção exata foi provada pelas fixtures reais e pelo deploy, não por um E2E de uma linha legada em produção. Fontes: `lib/publicSurfacePolicy.ts:11`, `scripts/test-public-video-privacy.mjs:62-107`.

### Como medir e quando parar

- **FATO CONFIRMADO:** a métrica pedida permanece “páginas `/v/` cujo título/H1 contém `Create the next episode` ou `Keep the topic and format recognizable`”; o alvo é zero pessoas/páginas quando a superfície voltar a ser observável. Fonte: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:17`.
- **SUGESTÃO:** ao reativar a superfície, validar primeiro uma amostra das linhas antigas por ID e contar páginas, não requisições; manter o gate `noindex` até decisão explícita de privacidade.
- **SUGESTÃO — gate de parada:** reverter ou corrigir se qualquer título normal for alterado, se uma linha contaminada voltar a ficar indexável ou se o bitmap social divergir do H1. O teste trava os ramos normal, legado, novo formato, truncado e degenerado.

### PEDIDOS

- **FATO CONFIRMADO:** o pedido de 17:10 BRT foi marcado como atendido no SHA `96310071ebdba64881e228df5331dadb25990991`. Fonte: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:17`.
- **FATO CONFIRMADO:** nenhum pedido novo foi aberto pela pista FLUXO nesta rodada; o único diff no arquivo de pedidos baixa o título público de série.
- **QUESTÃO PENDENTE:** o corte silencioso em 1.000 caracteres continua aberto. Fonte: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:28`.

## PRÓXIMA JOGADA

- **SUGESTÃO:** tratar o corte silencioso de 1.000 caracteres no quickstart sem reabrir o falso buraco 58→35: tornar qualquer excedente visível ou transportar o texto inteiro por um canal que não dependa da query string.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **IMPLEMENTADO:** títulos públicos de continuação agora mostram o assunto recuperado, inclusive no card social, e os casos sem assunto seguro recebem o fallback genérico; o `noindex` continua ativo.
- **TESTADO LOCALMENTE — 03/09/2026 23:57 BRT:** 385 verificações direcionadas passaram, TypeScript saiu com código 0 e a comparação desktop/mobile foi inspecionada. Fontes: os três comandos e os dois artefatos registrados em “O que mudou”.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 00:01 BRT:** Vercel e Guardião #46 concluíram verdes para `96310071ebdba64881e228df5331dadb25990991`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** o E2E de uma linha legada e os vigias individuais de checkout/origem seguem indisponíveis com a superfície anônima desligada e sem leitura aceita do Supabase.
