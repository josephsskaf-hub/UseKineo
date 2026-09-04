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

---

## Rodada 3 — teto visível do quickstart — 04/09 00:10→00:31 BRT — ENTREGA CONCLUÍDA

- **IMPLEMENTADO:** a caixa autenticada do quickstart deixou de apagar em silêncio tudo após o caractere 1.000; ela agora compartilha o teto canônico de 5.000 do Studio, exibe o comprimento real, mantém o excedente intacto e só encurta após ação explícita.
- **BLOQUEADO / DESCONHECIDO:** a observação individual de checkout e a origem de novos cadastros não foram remensuradas; o conector Supabase recusou a leitura na rodada anterior e não existe nova autorização técnica disponível neste ciclo.

### Dado, hipótese e anti-repetição

- **EVIDÊNCIA DE PRODUÇÃO — medição de 04/09/2026, sem horário confiável:** 22 pessoas em 60 dias colaram roteiro completo do ChatGPT, fizeram 2,45 filmes por pessoa contra 1,53 na base e converteram 2,6 vezes mais; o pedido identifica roteiros acima de 2.000 caracteres. Fonte: pedido carimbado `00:45 BRT` em `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:28`.
- **CONTRADIÇÃO / DESCONHECIDO:** o pedido traz `00:45 BRT`, posterior ao commit funcional de 00:24 BRT e ao relógio local desta rodada; o conteúdo foi usado por estar selecionado no handoff anterior, mas esse horário não foi tratado como ordem cronológica nem como hora da medição.
- **CONTRADIÇÃO / FATO CONFIRMADO:** o quickstart impunha 1.000 caracteres em duas pontas, enquanto o analisador e o Studio compartilham teto de 5.000. Fontes anteriores ao commit: `components/ChatGptWelcomeBanner.tsx:150-158`, `lib/growth/chatgptQuickstart.ts:3,31-45`; fonte canônica preservada: `lib/analyzeLimits.ts:11`.
- **HIPÓTESE:** preservar o roteiro de cinema inteiro até o mesmo limite que o Studio já aceita reduz refação e evita que a pessoa atribua ao gerador uma história que o produto cortou antes da análise.
- **FATO CONFIRMADO:** não foi reaberto o falso buraco `selected → studio_ready`; a mudança usa a variante isolada `chatgpt_quickstart_v6` e conserva os eventos existentes. Fontes: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:27`, `lib/growth/chatgptQuickstart.ts:3`, `components/ChatGptWelcomeBanner.tsx:91-109`, `app/(dashboard)/studio/StudioClient.tsx:261-268`.

### Vigia do checkout e placar

- **BLOQUEADO / DESCONHECIDO — 04/09/2026:** sem leitura aceita do Supabase, não há linha individual de checkout das últimas 2 horas nem corte por origem; nenhum zero foi inferido. Fonte do vigia exigido: `docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md:324-335`.
- **EVIDÊNCIA DE PRODUÇÃO — medição de 03/09/2026 22:08 BRT:** o último placar cronologicamente coerente segue em 15 cadastros, 10 pessoas com filme entregue (67%), 1 checkout de desejo, 1 checkout de defeito, 0 assinaturas e 0 pessoas com falha sem filme. Fonte: `docs/SPRINT-ASSINATURAS-2026-09-03.md:960-972`.
- **CONTRADIÇÃO / DESCONHECIDO:** o diário #8 conserva uma janela futura em seu cabeçalho e não foi usado para atualizar o placar. Fonte: `docs/SPRINT-ASSINATURAS-2026-09-03.md:1120-1125` e commit `e34a56b8` (author time 03/09/2026 23:01 BRT; committer time 23:17 BRT).

### O que mudou

- **IMPLEMENTADO:** `CHATGPT_QUICKSTART_INPUT_LIMIT` agora lê `ANALYZE_PROMPT_MAX_CHARS`; o normalizador só remove espaços externos e o builder recusa texto acima do teto em vez de cortá-lo. Fontes: `lib/growth/chatgptQuickstart.ts:1-9,37-49`.
- **IMPLEMENTADO:** o `maxLength` saiu do textarea; contador, estado de excesso, CTAs bloqueados e botão `Trim to fit` reutilizam o mesmo helper puro do Studio. O aviso afirma que nada foi removido e o resultado do corte informa quantos caracteres saíram. Fontes: `components/ChatGptWelcomeBanner.tsx:127-141,156-210`, `lib/studioPromptLimit.ts:18-68`.
- **IMPLEMENTADO:** a telemetria continua sem conteúdo do cliente, carrega só tipo e comprimento, e o destino foi corrigido de `/studio/create` para a rota realmente aberta, `/studio`. Fonte: `components/ChatGptWelcomeBanner.tsx:102-111`.
- **FATO CONFIRMADO:** nenhum preço, oferta, duração, motor, custo, autorização de geração, parser de roteiro, rota pública ou arquivo da pista Claude/CAIXA foi alterado. Fonte: diff do commit `341a119bda374f61c321df03a735c57f1c3dceb2`.
- **TESTADO LOCALMENTE — 04/09/2026 00:23 BRT:** `node scripts/test-chatgpt-quickstart.mjs` 127/127; `node scripts/test-chatgpt-script-handoff.mjs` 86/86; `node scripts/test-trial-balance-bridge.mjs` 208/208; `node node_modules/typescript/bin/tsc --noEmit` e `git diff --check` saíram com código 0.
- **TESTADO LOCALMENTE — 04/09/2026 00:21 BRT:** a comparação autocontida foi inspecionada visualmente: desktop preserva um roteiro de 2.240 caracteres e mobile mostra 5.468 intactos, 468 acima do teto, antes de habilitar qualquer saída. Fontes: `docs/previews/CHATGPT-QUICKSTART-VISIBLE-LIMIT-2026-09-04.html`, `docs/previews/CHATGPT-QUICKSTART-VISIBLE-LIMIT-2026-09-04.svg` e `docs/previews/CHATGPT-QUICKSTART-VISIBLE-LIMIT-2026-09-04.png`.
- **TESTADO LOCALMENTE — 04/09/2026 00:22 BRT:** a suíte ampla mediu 217 baterias verdes e 72 vermelhas; o placar é informativo e não foi atribuído à rodada. As regressões diretamente ligadas ao diff ficaram verdes. Fonte: execução local de todos os `scripts/test-*.mjs` e `.github/workflows/guardiao.yml:70-109`.
- **FATO CONFIRMADO — revisão independente em 04/09/2026:** dois auditores somente leitura confirmaram o corte duplo de 1.000, o teto canônico de 5.000 e a separação do formulário público que continua em 1.000; um deles recomendou o hardening futuro por `sessionStorage`, registrado em PEDIDOS, sem ampliar esta rodada para arquivos de outra pista.

### Integração e produção

- **IMPLEMENTADO:** código integrado por fast-forward em `main` no SHA `341a119bda374f61c321df03a735c57f1c3dceb2`; o pai direto é `4023dce9cf30a70ba89a8f74fdb5806c4eb1ec32`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 00:26 BRT:** a Vercel marcou o deployment `74sSzDF7YbbMJmzmCeAMRqTkXk1b` como concluído para o SHA funcional.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 00:30 BRT:** `https://www.usekineo.com/` respondeu 200 com `Server: Vercel` e `X-Powered-By: Next.js`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 00:33 BRT:** o Guardião #48 concluiu `Success` no SHA funcional; os jobs “TypeScript” e “Suíte de testes” terminaram. Fonte: `https://github.com/josephsskaf-hub/UseKineo/actions/runs/33833119083`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** o banner só aparece a uma sessão autenticada cuja primeira origem foi ChatGPT; esta rodada validou o bundle/deployment, mas não exerceu uma conta real em produção. Fontes: `app/(dashboard)/layout.tsx:11,158`, `components/ChatGptWelcomeBanner.tsx:40-68`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** o transporte Quickstart → Studio permanece no contrato de query já existente. O endurecimento ponta a ponta por `sessionStorage` exige consumidor na pista Claude e foi deixado como pedido separado; o redirect sem sessão do salto Studio → `/studio/create` ainda limita cada valor a 2.000. Fontes: `lib/growth/chatgptQuickstart.ts:42-52`, `app/(dashboard)/studio/create/page.tsx:41-51`, `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:29` após esta rodada.

### Como medir e quando parar

- **FATO CONFIRMADO:** `chatgpt_quickstart_selected` já grava `input_length`; a variante v6 permite contar pessoas cujo roteiro selecionado ficou exatamente em 1.000 e comparar as faixas 1.001–5.000 sem registrar o texto. Fontes: `components/ChatGptWelcomeBanner.tsx:102-109`, `lib/growth/chatgptQuickstart.ts:3`.
- **SUGESTÃO:** medir pessoas, não eventos, nas primeiras 24 horas completas: pico de `input_length = 1000` deve desaparecer; acompanhar `studio_ready / selected` apenas na v6 e manter a correção histórica de que não havia buraco causal pós-30/08.
- **SUGESTÃO — gate de parada:** reverter ou corrigir se texto de 1.001–5.000 não chegar integral ao Studio, se qualquer excedente for alterado sem clique no trim, se o builder aceitar mais de 5.000 ou se a variante v6 contaminar o funil v5.

### PEDIDOS

- **FATO CONFIRMADO:** o pedido de 00:45 BRT foi marcado como atendido no SHA `341a119bda374f61c321df03a735c57f1c3dceb2`. Fonte: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:28`.
- **SUGESTÃO / QUESTÃO PENDENTE:** foi deixado para Claude o hardening opcional do transporte Studio → `/studio/create`, sem transformar essa expansão em condição falsa para o stop de 1.000 do quickstart. Fonte: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:29`.

## PRÓXIMA JOGADA

- **SUGESTÃO:** retomar o pedido aberto mais antigo, de 18:40 BRT: transformar a sala de espera de crédito preso em progresso honesto para `holdState='in_flight'`, sem mexer em preço, oferta ou saldo. Antes, revalidar a linha de base porque o teste relacionado já está vermelho em `main` por forma antiga.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **IMPLEMENTADO:** o quickstart ChatGPT agora preserva de 1.001 a 5.000 caracteres, mostra contador/excesso e exige consentimento explícito para encurtar; a variante v6 separa a medição.
- **TESTADO LOCALMENTE — 04/09/2026 00:23 BRT:** 421 verificações direcionadas passaram, TypeScript e diff check ficaram verdes, e a comparação desktop/mobile foi inspecionada.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 00:30 BRT:** deployment Vercel concluído para `341a119b`; domínio canônico respondeu 200.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 00:33 BRT:** Vercel e Guardião #48 concluíram verdes para `341a119b`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** vigias de checkout/origem, E2E autenticado e o hardening futuro do transporte por `sessionStorage` seguem indisponíveis nesta rodada.

---

## Rodada 4 — K5 · ChatGPT abre na caixa de roteiro — 04/09 00:39→00:50 BRT — ENTREGA CONCLUÍDA

- **IMPLEMENTADO / VALIDADO EM PRODUÇÃO:** o endereço canônico que `/llms.txt` e `/api/facts` oferecem a quem já traz um roteiro do ChatGPT agora abre diretamente na caixa de colar roteiro da landing existente; página, formulário e funil não foram duplicados.
- **BLOQUEADO / DESCONHECIDO:** o vigia individual de checkout e a origem dos cadastros das últimas 2 horas não foram remensurados; a leitura somente consulta ao Supabase já havia sido recusada e não foi contornada.

### Dado, prioridade e anti-repetição

- **FATO CONFIRMADO:** os pedidos abertos mais antigos, de 18:40 e 18:45 BRT, apontam para `app/(dashboard)/generate/GenerateClient.tsx` e seu teste; `(dashboard)` pertence à pista Claude na regra vigente, portanto não eram viáveis para FLUXO. Fontes: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:18-19` e `docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md:315-316,462-465`.
- **FATO CONFIRMADO — revisão independente em 04/09/2026:** existe ainda um rascunho não commitado desse waitroom em outra worktree, baseado em `d6d3ad44`; reimplementá-lo aqui duplicaria trabalho e atravessaria pista. O rascunho não foi importado, editado nem tratado como pronto.
- **FATO CONFIRMADO — checagem F1 em 04/09/2026 00:41 BRT:** `/llms.txt`, `/free-script-generator`, `/scripts/space`, `/robots.txt`, `/sitemap.xml` e `/chatgpt-to-youtube-shorts` responderam 200; não apareceu regressão pública a corrigir. Fonte: requisições HEAD ao domínio canônico nesta rodada.
- **FATO CONFIRMADO:** K2 já reutilizava `/chatgpt-to-youtube-shorts` em vez de abrir `/paste-your-script`, mas o `START_HERE_FACT` ainda apontava ao topo do guia longo, enquanto a ação útil já possuía o id estável `chatgpt-script-handoff`. Fontes anteriores ao commit: `lib/kineoFacts.ts:755-759`, `app/chatgpt-to-youtube-shorts/page.tsx:41-42,390-416`.
- **HIPÓTESE:** retirar a busca manual pela caixa reduz um passo para a pessoa que chega do único canal atribuído aos três assinantes mais recentes; a mudança não prova nova assinatura até haver uma janela pós-deploy. Fonte da atribuição histórica: `docs/PLANO-COWORK-ASSINATURAS-2026-09-03.md:23-29`.

### Vigia do checkout e placar

- **BLOQUEADO / DESCONHECIDO — 04/09/2026:** sem leitura aceita do Supabase, não há linha individual dos checkouts das últimas 2 horas nem corte novo por origem; nenhum zero foi inferido.
- **EVIDÊNCIA DE PRODUÇÃO — medição de 03/09/2026 22:08 BRT:** o último placar cronologicamente coerente permanece em 15 cadastros, 10 pessoas com filme entregue (67%), 1 checkout de desejo, 1 checkout de defeito, 0 assinaturas e 0 pessoas com falha sem filme. Fonte: `docs/SPRINT-ASSINATURAS-2026-09-03.md:960-972`.
- **CONTRADIÇÃO / DESCONHECIDO:** o diário #8 conserva um cabeçalho com janela futura em relação ao próprio commit e continua fora do placar desta rodada. Fonte: `docs/SPRINT-ASSINATURAS-2026-09-03.md:1120-1125` e commit `e34a56b8`.

### O que mudou

- **IMPLEMENTADO:** `START_HERE_FACT.url` ganhou somente o fragmento `#chatgpt-script-handoff`; `/llms.txt` e `/api/facts` consomem o mesmo registro, de modo que não há duas URLs para manter. Fonte: `lib/kineoFacts.ts:752-763`, `app/llms.txt/route.ts:214-218`, `lib/kineoFacts.ts:1006-1013`.
- **FATO CONFIRMADO:** o fragmento resolve para o único formulário já renderizado com `formId={HANDOFF_ID}`; o envio continua carregando roteiro, campanha, intenção `trial_best`, modo `verbatim` e duração, sem cair em cadastro genérico. Fontes: `app/chatgpt-to-youtube-shorts/page.tsx:41-42,398-416`, `app/youtube-shorts-from-topic/TopicGeneratorForm.tsx:113-172`.
- **FATO CONFIRMADO:** nenhum preço, oferta, texto visível, limite, motor, duração, CTA, evento, parser, arquivo de dashboard/Claude ou arquivo de CAIXA foi alterado. Fonte: diff do commit `a5f613148d92a87291f39b322ec947e7c8660ba4`.
- **TESTADO LOCALMENTE — 04/09/2026 00:51 BRT:** `test-chatgpt-script-handoff` 93/93, `test-aeo-trial-access` 59/59 e `test-chatgpt-quickstart` 127/127; TypeScript e `git diff --check` saíram com código 0.
- **TESTADO LOCALMENTE — 04/09/2026 00:46 BRT:** `test-text-to-video-intent-router` permaneceu vermelho numa expectativa anterior de 45 segundos contra o default real de 35; nenhum arquivo do caminho dessa falha foi alterado nesta rodada, e ela não foi mascarada nem atribuída ao diff.
- **TESTADO LOCALMENTE — 04/09/2026 00:45 BRT:** a comparação autocontida foi inspecionada em desktop e mobile. Fontes: `docs/previews/CHATGPT-DIRECT-PASTE-2026-09-04.html`, `.svg` e `.png`.
- **FATO CONFIRMADO — revisão independente em 04/09/2026:** um auditor somente leitura confirmou que há uma única instância do formulário, `/llms.txt` e `/api/facts` herdam a mesma URL e preço/oferta/contrato ficaram intocados; a recomendação de travar a ligação fragmento → DOM foi incorporada em duas invariantes adicionais.

### Integração e produção

- **IMPLEMENTADO:** código integrado por fast-forward em `main` no SHA `a5f613148d92a87291f39b322ec947e7c8660ba4`; o pai direto é `f236dee9b55cc17c5be04a3ce6295588de2ad460`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 00:48 BRT:** a Vercel concluiu o deployment `4KWy8ev2wv491fhCLPfemHJ3jC75` para o SHA funcional.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 00:48 BRT:** o Guardião `33834460828` concluiu `success`; TypeScript e a suíte informativa terminaram verdes.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 00:49 BRT:** a landing e `/llms.txt` responderam 200; o HTML da landing contém o id e a caixa, `/llms.txt` contém o link com fragmento, e `/api/facts.startHere.url` devolve exatamente `https://www.usekineo.com/chatgpt-to-youtube-shorts#chatgpt-script-handoff`.

### Como medir e quando parar

- **FATO CONFIRMADO:** a submissão do formulário já emite `organic_topic_submitted` e seu espelho deduplicável `organic_cta_clicked`, ambos com campanha `chatgpt_to_shorts`; nenhuma telemetria nova era necessária para saber se a pessoa que chegou à caixa seguiu para cadastro. Fontes: `app/chatgpt-to-youtube-shorts/page.tsx:398-408`, `app/youtube-shorts-from-topic/TopicGeneratorForm.tsx:123-151`.
- **SUGESTÃO:** nas primeiras 24 horas completas, contar pessoas, não eventos: sessões de `/chatgpt-to-youtube-shorts` com referência ChatGPT → `organic_topic_submitted` com campanha `chatgpt_to_shorts` → cadastro → primeiro filme → checkout de desejo → assinatura. Fragmentos não chegam ao servidor; não inventar uma impressão específica do hash.
- **SUGESTÃO — gate de parada:** corrigir ou reverter se `/llms.txt` e `/api/facts` divergirem, se o id sair da página, se o link abrir cadastro genérico ou se algum campo do handoff deixar de atravessar o signup.
- **RISCO:** o ganho depende de answer engines escolherem o link publicado; a rodada encurta o caminho quando escolhem, mas não controla ranking nem volume orgânico.

### PEDIDOS

- **FATO CONFIRMADO:** nenhum pedido foi baixado: os itens de waitroom continuam abertos para a pista dona, e o rascunho concorrente precisa ser revisado antes de qualquer integração.
- **FATO CONFIRMADO:** nenhum pedido novo foi aberto pela FLUXO nesta rodada.

## PRÓXIMA JOGADA

- **SUGESTÃO:** auditar K18 contra as landings já existentes em português e espanhol e só então criar o menor ponto de entrada localizado para roteiro pronto. K7/K19 não são executáveis enquanto `CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED=false`; F2 pertence à tela de resultado do dashboard e F3+K20 depende de ação do fundador, não entrega uma mudança visível no produto nesta cadência.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **IMPLEMENTADO:** quem recebe do ChatGPT o link canônico para roteiro pronto agora abre a landing exatamente na caixa de colagem, sem nova página nem desvio para cadastro vazio.
- **TESTADO LOCALMENTE — 04/09/2026 00:51 BRT:** 279 verificações direcionadas passaram, TypeScript e diff check ficaram verdes; a comparação desktop/mobile foi inspecionada.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 00:49 BRT:** Vercel, Guardião, landing, `/llms.txt` e `/api/facts` confirmaram o mesmo destino com fragmento.
- **QUESTÃO PENDENTE / DESCONHECIDO:** vigia de checkout/origem e efeito em assinatura aguardam dados pós-deploy; o pedido de waitroom permanece com a pista Claude.

---

## Rodada 5 — K2/K18 · roteiro do autenticado chega ao Studio — 04/09 00:59→01:12 BRT — ENTREGA CONCLUÍDA

- **IMPLEMENTADO / VALIDADO EM PRODUÇÃO:** a caixa pública de roteiro agora preserva roteiro, campanha, intenção, modo e duração também quando a pessoa já está autenticada; em vez de o middleware descartá-los e mandá-la ao dashboard genérico, o salto seguro entra em `/studio/create`.
- **BLOQUEADO / DESCONHECIDO:** o vigia individual de checkout e a origem dos cadastros das últimas 2 horas não foram remensurados; não há conector Supabase utilizável nesta sessão e nenhum zero foi inferido.

### Dado, prioridade e anti-repetição

- **FATO CONFIRMADO:** a instrução automática ainda citava a rota `/v/[id]` e o corte de 1.000 caracteres já concluídos nas rodadas 2 e 3; o handoff vigente selecionava K18. A auditoria de K18 encontrou primeiro um defeito no launcher-base: `preserveHandoffForSignedIn` existia, mas seu default era `false` e a landing não o ativava. Fontes: `app/youtube-shorts-from-topic/TopicGeneratorForm.tsx:28,56`, `app/chatgpt-to-youtube-shorts/page.tsx:398-416` antes de `a55e187a` e rodadas 2–4 deste documento.
- **FATO CONFIRMADO:** uma sessão autenticada que chegava a `/signup` sem `redirect` era enviada a `/dashboard`; esse caminho descartava os campos públicos do roteiro. Fontes: `lib/supabase/middleware.ts:57-68` e `app/youtube-shorts-from-topic/TopicGeneratorForm.tsx:67-83` antes de `c879b939`.
- **HIPÓTESE:** eliminar esse desvio aumenta a proporção de pessoas autenticadas que chegam à criação após colar roteiro; o deploy não prova efeito em assinatura sem uma janela pós-publicação.
- **FATO CONFIRMADO:** a solução reutiliza o mesmo formulário e o mesmo contrato puro; não cria landing, signup, Studio, evento ou promessa paralelos. Fontes: `app/chatgpt-to-youtube-shorts/page.tsx:398-416`, `app/youtube-shorts-from-topic/TopicGeneratorForm.tsx:71-80`, `lib/creationHandoff.ts:20-65`.

### Vigia do checkout e placar

- **BLOQUEADO / DESCONHECIDO — 04/09/2026:** sem leitura aceita do Supabase, não há linha individual dos checkouts das últimas 2 horas nem corte novo por origem; nenhum zero foi inferido.
- **EVIDÊNCIA DE PRODUÇÃO — medição de 03/09/2026 22:08 BRT:** o último placar cronologicamente coerente permanece em 15 cadastros, 10 pessoas com filme entregue (67%), 1 checkout de desejo, 1 checkout de defeito, 0 assinaturas e 0 pessoas com falha sem filme. Fonte: `docs/SPRINT-ASSINATURAS-2026-09-03.md:960-972`.
- **CONTRADIÇÃO / DESCONHECIDO:** o diário #8 mantém cabeçalho com janela futura em relação ao próprio commit e não foi usado para atualizar o placar. Fonte: `docs/SPRINT-ASSINATURAS-2026-09-03.md:1120-1125` e commit `e34a56b8`.

### O que mudou

- **IMPLEMENTADO:** a instância de `TopicGeneratorForm` do launcher ChatGPT passou a ativar `preserveHandoffForSignedIn`. Fonte: `app/chatgpt-to-youtube-shorts/page.tsx:398-416`.
- **IMPLEMENTADO:** o builder autenticado virou contrato puro compartilhado: limita o texto aos 1.000 caracteres anunciados, carrega `prompt`, `create_intent`, `intent_campaign`, `language`, `script_mode` e `duration`, e recusa prompt vazio. Fontes: `lib/creationHandoff.ts:20-65`, `app/youtube-shorts-from-topic/TopicGeneratorForm.tsx:67-80`.
- **FATO CONFIRMADO:** nenhum preço, oferta, desconto, motor, saldo, autorização de geração, parser, arquivo de dashboard/Claude ou arquivo de CAIXA foi alterado. Fonte: diffs de `a55e187aa11e8e7a00929d6cb2610f1a00b88e8d` e `c879b93941c027609b362dc7f50f584f5941514c`.
- **TESTADO LOCALMENTE — 04/09/2026 01:09 BRT:** `test-chatgpt-script-handoff` executou 109/109 invariantes, inclusive destino autenticado, limite, roteiro, campanha, idioma PT, modo verbatim e 35 segundos; `test-seo-form-handoff` passou 50/50, `test-checkout-auth-session-bridge` passou 61/61, TypeScript e `git diff --check` saíram com código 0.
- **CONTRADIÇÃO / FATO CONFIRMADO:** `test-engine-landing-intent` segue vermelho porque sua fixture espera sete motores enquanto `main` já expõe oito, incluindo `s25`; nenhum arquivo desse catálogo foi alterado e a falha não foi mascarada nem atribuída à rodada.
- **FATO CONFIRMADO — revisão independente em 04/09/2026:** três auditores somente leitura confirmaram a perda do handoff autenticado e o conserto; depois da primeira revisão, o teste deixou de ser apenas textual e passou a executar o builder com os campos do contrato.
- **FATO CONFIRMADO:** não há comparativo visual nesta rodada porque nenhum pixel, copy ou layout mudou; a mudança é o destino observado após a ação da pessoa autenticada.

### Integração e produção

- **IMPLEMENTADO:** código integrado por fast-forward em `main` no SHA `c879b93941c027609b362dc7f50f584f5941514c`, com commit funcional `a55e187aa11e8e7a00929d6cb2610f1a00b88e8d` como pai direto.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 01:10 BRT:** a Vercel concluiu o deployment `2u6KnZTJmB7LXtXmXWEna3C3L5HC` para o SHA final.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 01:10 BRT:** o Guardião #53 concluiu `success`; os jobs “Suíte de testes” e “TypeScript” terminaram verdes. Fonte: `https://github.com/josephsskaf-hub/UseKineo/actions/runs/33835768291`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 01:11 BRT:** `https://www.usekineo.com/chatgpt-to-youtube-shorts` respondeu 200 pela Vercel e o HTML publicado contém o id `chatgpt-script-handoff` e o rótulo da caixa.
- **QUESTÃO PENDENTE / DESCONHECIDO:** não foi usada uma conta real autenticada em produção; o ramo foi provado pelo builder executável, pelo middleware existente, pelo TypeScript e pelo deploy, não por um E2E com sessão de cliente.

### Estado real de K18/F4

- **FATO CONFIRMADO / BLOQUEADO:** o contrato executável de idioma é `en|pt|es`; signup e APIs fazem fallback de qualquer outro valor para inglês. Não publicar DE/FR até a pista dona implementar e testar o caminho. Fontes: `app/youtube-shorts-from-topic/TopicGeneratorForm.tsx:24`, `app/(auth)/signup/page.tsx:60`, `app/(dashboard)/generate/GenerateClient.tsx:745`, `app/api/analyze-idea/route.ts:700`, `app/api/generate-script/route.ts:288`.
- **FATO CONFIRMADO:** as páginas PT/ES atuais são portas de tópico, não launchers de roteiro verbatim; não existe exemplo público verificado com narração nesses idiomas. K18 não foi declarado concluído. Fontes: `app/gerador-de-shorts-gratis/page.tsx:84-100`, `app/generador-de-shorts-gratis/page.tsx:82-98`, `lib/publicExamples.ts:1-11,40-125` e `docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md:372-377`.
- **CONTRADIÇÃO:** a landing espanhola ainda publica seu próprio endereço como alternate `pt-BR`, enquanto as páginas EN/PT apontam ao endereço português. Fontes: `app/generador-de-shorts-gratis/page.tsx:28`, `app/gerador-de-shorts-gratis/page.tsx:30`. O defeito foi identificado, mas deliberadamente não entrou nesta rodada de uma mudança.
- **CONTRADIÇÃO / RISCO DE MEDIÇÃO:** a landing ChatGPT envia `utm_source=seo` mesmo quando a pessoa veio de ChatGPT; esse valor pode vencer o referrer nos classificadores. Fonte: `app/chatgpt-to-youtube-shorts/page.tsx:402-403`. Não copiar esses UTMs para K18 antes de corrigir a atribuição.

### Como medir e quando parar

- **SUGESTÃO:** nas primeiras 24 horas completas, contar pessoas autenticadas — não eventos — que fizeram `organic_topic_submitted` com campanha `chatgpt_to_shorts` e alcançaram o primeiro evento server-side da criação na mesma sessão; comparar com a janela anterior sem somar períodos diferentes. O baseline desse ramo é **DESCONHECIDO**.
- **SUGESTÃO — gate de parada:** corrigir ou reverter se qualquer campo do redirect autenticado sumir, se o destino sair de `/studio/create`, se prompt vazio armar criação ou se o normalizador de redirect aceitar origem externa.
- **RISCO:** o transporte autenticado continua usando query string e o launcher público continua limitado aos 1.000 caracteres que sua copy anuncia; o pedido separado das 00:31 cobre o hardening de 2.001–5.000 no cockpit sem ampliar esta rodada.

### PEDIDOS

- **FATO CONFIRMADO:** nenhum pedido foi baixado nesta rodada.
- **SUGESTÃO / BLOQUEADO:** foi aberto às 01:12 BRT um pedido para a pista Claude confirmar/implementar `de|fr` ponta a ponta antes de qualquer publicação K18 nesses idiomas. Fonte: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md`.

## PRÓXIMA JOGADA

- **SUGESTÃO:** entregar o launcher localizado PT/ES como K18 parcial, com preview desktop/mobile e sem reaproveitar exemplo silencioso como prova narrada; antes da indexação, corrigir o alternate `pt-BR` da página espanhola e remover a falsa atribuição `utm_source=seo` do canal ChatGPT. DE/FR e exemplos narrados permanecem gates explícitos.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **IMPLEMENTADO:** quem já estava autenticado agora cola o roteiro e chega a `/studio/create` com roteiro, campanha, intenção `trial_best`, modo `verbatim` e alvo de 35 segundos preservados.
- **TESTADO LOCALMENTE — 04/09/2026 01:09 BRT:** 220 verificações direcionadas passaram; o contrato autenticado foi executado, e TypeScript/diff check ficaram verdes.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 01:11 BRT:** Vercel, Guardião #53 e a landing pública ficaram verdes no SHA `c879b939`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** K18 ainda não está concluído; DE/FR, exemplos narrados, hreflang PT da landing ES e a atribuição falsa de SEO seguem abertos.

---

## Rodada 6 — K18 parcial · launcher de roteiro em PT-BR e ES — 04/09 01:19→01:38 BRT — ENTREGA CONCLUÍDA

- **IMPLEMENTADO / VALIDADO EM PRODUÇÃO:** as duas landings localizadas já indexadas ganharam uma escolha visualmente separada para quem chega com roteiro pronto; o caminho original por assunto continua primário e inalterado.
- **BLOQUEADO / DESCONHECIDO:** o vigia individual de checkout e a origem dos cadastros das últimas 2 horas não foram remensurados; não há conector Supabase utilizável nesta sessão e nenhum zero foi inferido.

### Dado, prioridade e anti-repetição

- **FATO CONFIRMADO:** as prioridades automáticas `/v/[id]` e corte de 1.000 caracteres já estavam concluídas nas rodadas 2 e 3. Os pedidos abertos de 18:40, 18:45 e 23:15 tocam dashboard/Claude; o de 20:45 toca CAIXA. Nenhum deles foi duplicado nesta worktree. Fontes: rodadas anteriores deste documento e `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md`.
- **FATO CONFIRMADO:** K18 tinha portas de assunto em português e espanhol, mas não um launcher localizado de roteiro; o runtime aceita `en|pt|es`, portanto DE/FR permaneceram fechados. Fontes antes do commit: `app/gerador-de-shorts-gratis/page.tsx:84-100`, `app/generador-de-shorts-gratis/page.tsx:82-98`; contrato: `app/youtube-shorts-from-topic/TopicGeneratorForm.tsx:24`.
- **HIPÓTESE:** oferecer a caixa de roteiro no idioma da landing reduz a troca de contexto e o retrabalho de colar novamente; esta rodada não atribui assinatura ao novo launcher sem uma janela pós-deploy.

### Vigia do checkout e placar

- **BLOQUEADO / DESCONHECIDO — 04/09/2026:** sem leitura aceita do Supabase, não há linha individual dos checkouts das últimas 2 horas nem corte novo por origem; nenhum zero foi inferido.
- **EVIDÊNCIA DE PRODUÇÃO — medição encerrada em 04/09/2026 00:55 BRT:** 16 cadastros, 11 pessoas com filme (69%), 1 checkout com filme, 1 checkout sem filme, 0 assinaturas e 0 pessoas com falha sem filme. Fonte: `docs/SPRINT-ASSINATURAS-2026-09-03.md:1120-1126`. A medição já estava no passado quando esta rodada a adotou às 01:33 BRT.

### O que mudou

- **IMPLEMENTADO:** `LocalizedScriptHandoff` reutiliza o formulário existente e fixa `verbatim`, alvo de 35 segundos, intenção `trial_best`, preservação para autenticado e uma variante de analytics por idioma. Fonte: `components/LocalizedScriptHandoff.tsx:1-61`.
- **IMPLEMENTADO:** PT-BR e ES expõem âncoras estáveis, linguagem semântica no conteúdo e campanhas separadas `seo_chatgpt_to_shorts_pt|es`; não foram adicionados UTMs falsos. Fontes: `app/gerador-de-shorts-gratis/page.tsx:22,73,105-117`, `app/generador-de-shorts-gratis/page.tsx:20,71,103-115`.
- **IMPLEMENTADO:** o prefixo `seo_` permite que o funil orgânico reconheça o handoff; as duas rotas também entraram no denominador de landings, evitando taxa distorcida ou superior a 100%. Fontes: `lib/growth/organicSignupTruth.ts:12-25,44-60`, `app/api/admin/funnel/route.ts:354-382`.
- **IMPLEMENTADO:** `/llms.txt` publica os dois deep links; o alternate `pt-BR` da página espanhola agora aponta à página portuguesa, não para si mesma. Fontes: `app/llms.txt/route.ts:215-219`, `app/generador-de-shorts-gratis/page.tsx:25-32`.
- **FATO CONFIRMADO:** a copy nomeia o roteamento real — Seedance apenas se o saldo do teste ativo cobrir, senão Fast — e limita a promessa a sequência de palavras, com ajuste possível de pontuação. Fontes: `app/gerador-de-shorts-gratis/page.tsx:105-117`, `app/generador-de-shorts-gratis/page.tsx:103-115`, `lib/growth/trialActivationIntent.ts:20-29`.
- **FATO CONFIRMADO:** nenhum preço, oferta, desconto, Stripe, saldo, autorização de geração, migration, mensagem externa, exemplo público, arquivo de dashboard/Claude ou arquivo de CAIXA foi alterado. Fonte: diff do commit `2672d0d9939dfdc2807c8f5a71d35f0c1040a699`.
- **TESTADO LOCALMENTE — 04/09/2026 01:30 BRT:** `test-chatgpt-script-handoff` passou 165/165, `test-seo-form-handoff` 50/50, `test-roteiro-de-cinema` 64/64; TypeScript e `git diff --check` saíram com código 0.
- **TESTADO LOCALMENTE — 04/09/2026 01:30 BRT:** a comparação autocontida fiel às strings do JSX foi inspecionada em PT-BR e ES, antes/depois, desktop e mobile. Fontes: `docs/previews/K18-PT-ES-SCRIPT-LAUNCHERS-2026-09-04.html` e `.png`.
- **FATO CONFIRMADO — revisão independente em 04/09/2026:** três auditores somente leitura verificaram contrato, copy, rotas, hreflang, telemetria e preview. As revisões descobriram e fecharam o reconhecimento da campanha, o denominador das landings, a fidelidade do preview e a linguagem semântica; a revisão final informou “sem bloqueios”.

### Integração e produção

- **IMPLEMENTADO:** código integrado em `main` no SHA `2672d0d9939dfdc2807c8f5a71d35f0c1040a699`; o pai direto é `efbd872ee4387eb4729e4d1058570047ae9868ef`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 01:33 BRT:** a Vercel concluiu o deployment `4PmjCiB5N46ad62SEuqbKgxcadzD` para o SHA funcional.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 01:38 BRT:** o Guardião #55 concluiu `success`; TypeScript e a suíte informativa terminaram verdes. Fonte: `https://github.com/josephsskaf-hub/UseKineo/actions/runs/33837029366`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 01:33 BRT:** as páginas PT-BR e ES e `/llms.txt` responderam 200; o HTML publicado contém âncoras, headings, campanhas e atributos de idioma corretos, o alternate `pt-BR` da página ES aponta à URL portuguesa e `/llms.txt` contém ambos os deep links.
- **QUESTÃO PENDENTE / DESCONHECIDO:** não foi usada conta real em produção. O transporte foi provado com Unicode, pontuação e quebra de linha pelo builder executável e pelo HTML publicado, não por E2E autenticado de uma conta de cliente.

### Como medir e quando parar

- **SUGESTÃO:** após uma janela completa e igual para cada idioma, contar pessoas distintas — não eventos — no caminho landing → `organic_topic_submitted` por `seo_chatgpt_to_shorts_pt|es` → cadastro → primeiro filme → checkout com filme → assinatura. Não somar PT e ES antes de mostrar cada denominador.
- **SUGESTÃO — gate de parada:** corrigir ou reverter se qualquer campo `prompt/campaign/language/script_mode/duration` sumir, se o destino autenticado deixar `/studio/create`, se o denominador excluir uma das rotas ou se a conversão cair contra janela anterior equivalente.
- **RISCO:** duas caixas podem parecer duplicadas apesar da separação visual; as campanhas divididas exigem leitura por idioma; o launcher público permanece no teto anunciado de 1.000 caracteres.
- **BLOQUEADO:** K18 completo ainda depende de suporte executável DE/FR e de exemplos narrados verificados; nenhum exemplo silencioso foi promovido como prova localizada.

### PEDIDOS

- **FATO CONFIRMADO:** nenhum pedido de outra pista foi baixado ou alterado nesta rodada.
- **FATO CONFIRMADO:** o pedido aberto às 01:12 BRT para a pista Claude implementar/confirmar DE/FR continua vigente; nenhum pedido duplicado foi criado.

## PRÓXIMA JOGADA

- **SUGESTÃO:** medir a primeira janela completa dos launchers PT/ES e auditar o idioma no restante do documento raiz sem publicar DE/FR; se não houver dado novo, escolher outra mudança FLUXO visível e independente das telas Claude/CAIXA.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **IMPLEMENTADO:** PT-BR e ES agora têm um segundo caminho explícito para colar roteiro pronto, preservando idioma, campanha, modo verbatim, intenção e alvo de 35 segundos até a criação.
- **TESTADO LOCALMENTE — 04/09/2026 01:30 BRT:** 279 verificações direcionadas passaram, TypeScript/diff check ficaram verdes e o comparativo desktop/mobile foi inspecionado.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 01:38 BRT:** Vercel, Guardião #55, as duas landings e `/llms.txt` ficaram verdes no SHA `2672d0d9`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** vigia de checkout/origem, E2E autenticado, DE/FR e exemplos narrados aguardam dados ou trabalho da pista dona.

---

## Rodada 7 — F1 · CTA fixo do gerador de hooks preserva o tema — 04/09 01:40→01:53 BRT — ENTREGA CONCLUÍDA

- **IMPLEMENTADO / VALIDADO EM PRODUÇÃO:** depois de gerar hooks, o CTA fixo de `/free-hook-generator` leva o tema para o cadastro e para `/studio/create`; antes de existir tema, seu destino anterior permanece inalterado.
- **BLOQUEADO / DESCONHECIDO:** o vigia individual de checkout e a origem dos cadastros das últimas 2 horas não foram remensurados; não há conector Supabase utilizável nesta sessão e nenhum zero foi inferido.

### Dado, prioridade e anti-repetição

- **FATO CONFIRMADO:** não havia pedido aberto viável da pista FLUXO: os itens de 18:40, 18:45 e 23:15 pertencem ao dashboard/Claude e o de 20:45 pertence à CAIXA. As prioridades automáticas `/v/[id]` e corte de 1.000 caracteres já estavam concluídas nas rodadas 2 e 3. Fonte: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md` e rodadas anteriores deste documento.
- **FATO CONFIRMADO:** `generatedTopic` já alimentava os CTAs dentro do resultado, mas o CTA fixo era renderizado sem `href` e caía no cadastro genérico; o defeito não constava das seis rodadas anteriores. Fontes antes de `d14dac6d`: `app/free-hook-generator/FreeHookClient.tsx:23,41,92,99,109` e `components/StickyFreeShortCTA.tsx:28-35,136-138`.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 01:44 BRT:** as 186 URLs do sitemap responderam HTTP 200; a queda não foi atribuída a rota pública quebrada. A auditoria foi somente leitura, por URL individual, sem somar pessoas ou eventos.
- **HIPÓTESE:** conservar o tema no CTA persistente reduz cadastro sem contexto depois de a pessoa já ter feito o trabalho de gerar hooks; efeito em primeiro filme ou assinatura exige janela posterior equivalente.

### Vigia do checkout e placar

- **BLOQUEADO / DESCONHECIDO — 04/09/2026:** sem leitura aceita do Supabase, não há linha individual dos checkouts das últimas 2 horas nem corte novo por origem; nenhum zero foi inferido.
- **EVIDÊNCIA DE PRODUÇÃO — medição encerrada em 04/09/2026 00:55 BRT:** 16 cadastros, 11 pessoas com filme (69%), 1 checkout com filme, 1 checkout sem filme, 0 assinaturas e 0 pessoas com falha sem filme. Fonte: `docs/SPRINT-ASSINATURAS-2026-09-03.md:1120-1126`. Esta rodada não atualiza nem interpola essa janela.

### O que mudou

- **IMPLEMENTADO:** o CTA fixo recebe `hookActivationHref(generatedTopic, undefined, entry)` somente quando há tema; o estado vazio continua usando o default histórico. Fonte: `app/free-hook-generator/FreeHookClient.tsx:109-117`.
- **IMPLEMENTADO:** o clique contextualizado emite as taxonomias já existentes com `placement: 'sticky'`, sem copiar tema ou hook para analytics. Fonte: `app/free-hook-generator/FreeHookClient.tsx:111-114`.
- **TESTADO LOCALMENTE — 04/09/2026 01:47 BRT:** `test-answer-engine-hook-workbench` passou 47/47, incluindo tema exato, `autoanalyze=1` e destino `/studio/create`; TypeScript e `git diff --check` saíram com código 0. Fonte: `scripts/test-answer-engine-hook-workbench.mjs:65-69,90-93`.
- **FATO CONFIRMADO:** o teste carregava uma expectativa obsoleta de `/generate`; ela foi alinhada ao helper real, que já enviava todos os CTAs de resultado para `/studio/create`. Fontes: `lib/growth/answerEngineHookWorkbench.ts:66-91`, `scripts/test-answer-engine-hook-workbench.mjs:60-69`.
- **FATO CONFIRMADO:** nenhum pixel, copy, preço, oferta, desconto, Stripe, banco, migration, saldo, autorização de geração, dashboard/Claude ou CAIXA foi alterado nesta rodada. Não há comparativo visual porque a mudança é apenas no destino após o clique.
- **FATO CONFIRMADO — revisão independente em 04/09/2026:** três auditores somente leitura encontraram este defeito e duas próximas candidatas sem editar arquivos: falsas limitações 9:16 em `lib/comparisons.ts` e confirmação invisível do tema no signup de `/examples/[slug]`.

### Correção transparente da rodada 6

- **CONTRADIÇÃO:** a rodada 6 afirmou que nenhum arquivo da pista Claude fora alterado, mas o SHA `2672d0d9` adicionou duas rotas a `app/api/admin/funnel/route.ts:354-364`; `docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md:20` atribui `app/api/admin/**` ao Claude. A afirmação anterior está errada.
- **FATO CONFIRMADO:** nenhum arquivo Claude foi tocado novamente nesta rodada. O ajuste já publicado não foi removido em silêncio; às 01:52 BRT foi aberto em `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md` o pedido para a pista dona revisar, assumir ou reverter, com a invariante de denominador explícita.

### Integração e produção

- **IMPLEMENTADO:** commit funcional `d14dac6d9158d717b313270b50d79c336199ff60` integrado em `main` por fast-forward sobre `299ec4521f3b9e2492b1b95ba2f3b7b4cc4de0fb`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 01:49 BRT:** o Guardião do PR #2, execução `33838165380`, concluiu `success`; TypeScript e suíte terminaram verdes antes do avanço da `main`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 01:51 BRT:** a Vercel concluiu o deployment `9DzQ3mfqF3UNyoikwer2vUsU4oPS` para o SHA funcional.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 01:53 BRT:** `/free-hook-generator` respondeu HTTP 200 após o deploy; o E2E com cadastro real não foi executado, portanto a travessia autenticada continua validada pelo contrato executável, TypeScript e artefato implantado, não por conta de cliente.

### Como medir e quando parar

- **SUGESTÃO:** em uma janela pós-deploy completa, contar pessoas distintas — não cliques — em `free_hook_result_generated` → `free_hook_to_signup_clicked` com `placement=sticky` → cadastro → primeiro filme → checkout com filme → assinatura; separar `entry=answer_engine|default` e não somar janelas diferentes.
- **SUGESTÃO — gate de parada:** corrigir ou reverter se o tema deixar de chegar exatamente a `/studio/create`, se o CTA vazio ganhar redirect de criação, se texto do visitante aparecer na telemetria ou se `intentActors` ultrapassar o denominador de visitantes.
- **RISCO:** o tema permanece em query string durante o auth, limitado a 200 caracteres pelo helper existente; a rodada não endurece esse transporte nem prova incremento de assinatura.

### PEDIDOS

- **FATO CONFIRMADO:** nenhum pedido de outra pista foi baixado nesta rodada.
- **SUGESTÃO / CORREÇÃO DE ESCOPO:** foi aberto às 01:52 BRT um pedido para Claude decidir as duas linhas de `app/api/admin/funnel/route.ts` alteradas indevidamente pela FLUXO na rodada 6.

## PRÓXIMA JOGADA

- **SUGESTÃO — F1/K5:** corrigir somente as nove frases públicas que ainda chamam Kineo de 9:16-only em `lib/comparisons.ts`, preservando os limites verdadeiros de uma proporção por render e ausência de 4K. **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 01:47 BRT:** `/vs/heygen-vs-kineo`, `/vs/kineo-vs-submagic` e `/vs/captions-vs-kineo` responderam 200 e exibiram essas afirmações falsas; ampliar a invariante para hífen e sinônimos antes de publicar.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **IMPLEMENTADO:** o CTA fixo do gerador de hooks não perde mais o tema depois de a pessoa gerar resultados; o estado anterior à geração continua byte a byte no mesmo destino.
- **TESTADO LOCALMENTE — 04/09/2026 01:47 BRT:** 47 invariantes direcionadas passaram; TypeScript e diff check ficaram verdes.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 01:53 BRT:** Guardião do PR, Vercel e rota pública ficaram verdes no SHA `d14dac6d`.
- **CONTRADIÇÃO CORRIGIDA:** a rodada 6 tocou um arquivo Claude apesar de declarar o contrário; o fato foi registrado e a decisão foi devolvida à pista dona sem nova alteração nesse arquivo.
- **QUESTÃO PENDENTE / DESCONHECIDO:** vigia de checkout/origem e impacto em primeiro filme/assinatura aguardam dado pós-deploy; as falsas limitações 9:16 são a próxima correção pública candidata.

---

## Rodada 8 — K5 · verdade multiformato nos comparativos — 04/09 02:00→02:19 BRT — ENTREGA CONCLUÍDA

- **IMPLEMENTADO / VALIDADO EM PRODUÇÃO:** os comparativos públicos não dizem mais que a Kineo produz somente 9:16 ou recusa horizontal; agora distinguem os quatro formatos nativos, uma proporção por render e o upscale 4K separado.
- **BLOQUEADO / DESCONHECIDO:** o vigia individual de checkout e a origem dos cadastros das últimas 2 horas não foram remensurados; não há conector Supabase utilizável nesta sessão e nenhum zero foi inferido.

### Dado, prioridade e anti-repetição

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 02:05:38–02:05:57 BRT:** `/vs` e 46 comparativos canônicos responderam 47/47 HTTP 200. A varredura encontrou 13 exibições diretamente falsas em 9 URLs, além de uma segmentação estreita visível e uma branch de oferta executável não renderizada. O commit `5cb3ea75` havia corrigido a verdade central, mas não essas sobras.
- **FATO CONFIRMADO:** não havia pedido aberto viável da pista FLUXO; os itens de 18:40, 18:45 e 23:15 pertencem ao dashboard/Claude, o de 20:45 pertence à CAIXA e o pedido de revisão do arquivo admin continua com Claude. Nenhum foi duplicado.
- **HIPÓTESE:** parar de recusar visitantes de 16:9/1:1/4:5 melhora a passagem dos comparativos para cadastro; esta rodada não atribui assinatura sem janela posterior equivalente.

### Vigia do checkout e placar

- **BLOQUEADO / DESCONHECIDO — 04/09/2026:** sem leitura aceita do Supabase, não há linha individual dos checkouts das últimas 2 horas nem corte novo por origem; nenhum zero foi inferido.
- **EVIDÊNCIA DE PRODUÇÃO — medição encerrada em 04/09/2026 00:55 BRT:** 16 cadastros, 11 pessoas com filme (69%), 1 checkout com filme, 1 checkout sem filme, 0 assinaturas e 0 pessoas com falha sem filme. Fonte: `docs/SPRINT-ASSINATURAS-2026-09-03.md:1120-1126`; esta rodada não atualiza, soma nem interpola essa janela.

### O que mudou

- **IMPLEMENTADO:** nove páginas head-to-head e o card de `/vs` agora descrevem 9:16, 16:9, 1:1 e 4:5 nativos, com uma proporção por render. Fontes: `lib/comparisons.ts:1150-1189,1253,1315-1338,1450,4038-4045,4125,4211-4229,4290,4365-4376`.
- **IMPLEMENTADO:** as comparações com HeyGen, Submagic e Descript separam 4K nativo do concorrente do upscale pós-render da Kineo; não afirmam ausência absoluta de 4K. Fontes: `lib/comparisons.ts:1165,1450,4205`.
- **IMPLEMENTADO:** a invariante contextual captura as frases regressivas sem proibir descrições verdadeiras de concorrentes limitados a 9:16. Fontes: `scripts/test-quadro-real-2026-09-02.mjs:83-105`.
- **FATO CONFIRMADO:** nenhum preço, desconto, quota, entitlement, Stripe, banco, migration, saldo, autorização de geração, dashboard/Claude ou CAIXA foi alterado; uma descrição factual dentro da branch de oferta foi corrigida de “one format” para “one ratio per render”.
- **TESTADO LOCALMENTE — 04/09/2026 02:11 BRT:** a nova invariante falhou antes da correção e depois passou 39/39; TypeScript e `git diff --check` saíram com código 0.
- **TESTADO LOCALMENTE — 04/09/2026 02:09 BRT:** o comparativo autocontido antes/depois, desktop/mobile, foi inspecionado. Fontes: `docs/previews/K5-RATIO-TRUTH-2026-09-04.html` e `.png`.
- **FATO CONFIRMADO — revisão independente em 04/09/2026:** três auditores somente leitura reconciliaram código, produção, contagem e falsos positivos; nenhum editou arquivos.

### Integração e produção

- **IMPLEMENTADO:** commits `28575189405f9b4b29201d6b5b0aeaa2f35f826b` e `fb25ffc1d9092f89fe90722bbe4d7432800baad8` integrados em `main` por fast-forward sobre `ab01ae9b8db83cdc71f601124f0867da935da309`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 02:16 BRT:** o Guardião do PR #4, execução `33839538963`, concluiu `success`; TypeScript e suíte terminaram verdes antes do avanço da `main`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 02:18 BRT:** a Vercel concluiu o deployment `Ai4MEyqTB4qrEbMjzJqMD6afC58f` para `fb25ffc1`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 02:19 BRT:** `/vs` e nove páginas tocadas responderam HTTP 200 no slug canônico; as sete famílias de frases falsas verificadas não aparecem mais no HTML publicado.

### Como medir e quando parar

- **SUGESTÃO:** em janelas completas e iguais, contar pessoas distintas por pathname/referrer em `landing_session_started` → cadastro → primeiro filme → checkout com filme → assinatura; separar cada `/vs` e origem answer-engine, sem somar eventos ou janelas diferentes.
- **SUGESTÃO — gate de parada:** corrigir ou reverter se uma frase 9:16-only atribuída à Kineo reaparecer, se 4K for descrito como render nativo da Kineo ou se a taxa por pessoas cair contra janela anterior equivalente.
- **RISCO:** cache pode atrasar a copy; especificações dos concorrentes podem mudar; 4K da Kineo é upscale pós-render, não saída nativa do render original.

### PEDIDOS

- **FATO CONFIRMADO:** nenhum pedido de outra pista foi baixado, alterado ou criado nesta rodada; a revisão do arquivo admin da rodada 6 permanece com Claude.

## PRÓXIMA JOGADA

- **SUGESTÃO:** cumprir a próxima medição pura assim que houver leitura autorizada do Supabase; sem dado novo, auditar a confirmação invisível do tema no signup vindo de `/examples/[slug]`, sem tocar dashboard/Claude ou CAIXA.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **IMPLEMENTADO:** 13 exibições falsas e duas bordas de copy foram corrigidas para a capacidade real multiformato, preservando uma proporção por render e qualificando 4K como upscale separado.
- **TESTADO LOCALMENTE — 04/09/2026 02:11 BRT:** 39 invariantes, TypeScript, diff check e preview visual ficaram verdes.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 02:19 BRT:** Guardião #4, Vercel e dez URLs públicas ficaram verdes no SHA `fb25ffc1`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** impacto em cadastro, primeiro filme, checkout e assinatura aguarda uma janela pós-deploy e acesso autorizado aos dados.

---

## Rodada 9 — F1 · confirmação do remix no cadastro — 04/09 02:27→02:43 BRT — ENTREGA CONCLUÍDA

- **IMPLEMENTADO / VALIDADO EM PRODUÇÃO:** quem pede para refazer um exemplo e ainda não tem conta agora vê no cadastro o assunto que já escolheu; o destino autenticado e o trabalho salvo continuam iguais.
- **EVIDÊNCIA DE PRODUÇÃO:** o conector Supabase passou a responder nesta sessão; placar, origem e vigia foram medidos por pessoas externas com SQL somente leitura, sem expor identificador ou conteúdo de visitante.

### Dado, prioridade e anti-repetição

- **FATO CONFIRMADO:** não havia pedido aberto viável da pista FLUXO: os itens existentes pertencem ao dashboard/Claude ou à CAIXA, e nenhum foi baixado ou duplicado. Fontes: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md` e as oito rodadas anteriores deste documento.
- **FATO CONFIRMADO:** `/examples/[slug]` já preservava `prompt`, `create_intent=example_remix` e UTMs até `/studio/create`; para visitante anônimo, o servidor embrulhava esse caminho em `/signup?redirect=...`, mas qualquer redirect explícito zerava a prova visual e deixava o cadastro genérico. Fontes antes de `46d89d89`: `lib/growth/exampleRemix.ts`, `app/(dashboard)/studio/create/page.tsx:86-103` e `app/(auth)/signup/page.tsx:269-272`.
- **FATO CONFIRMADO:** a solução reaproveita o card de trabalho salvo existente; não recria formulário, copy, redirect ou analytics. A checagem é semântica — pathname exato e intenção exata — e não usa UTM como autorização.
- **HIPÓTESE:** confirmar o assunto no momento de cadastro reduz dúvida e abandono entre o clique em “remix” e a criação da conta; efeito em primeiro filme ou assinatura exige janela pós-deploy equivalente.

### Vigia do checkout e placar

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 02:38 BRT:** o vigia de duas horas encontrou **0 pessoas externas** com `checkout_started|checkout_attempted` e sem `checkout_success_viewed`; portanto não há linha individual nem classe desejo/roteiro-pronto/defeito nesta janela. Fonte: SQL somente leitura do §8.2, executado no projeto de produção.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 02:38 BRT:** desde o marco de 03/09 13:00 BRT, o placar canônico é **22 cadastros, 16 pessoas com filme (16/22), 1 checkout com filme, 1 checkout sem filme, 0 assinaturas e 0 pessoas com falha sem filme**. Fonte: SQL canônico de `docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md:168-188`, projeto de produção.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 02:43 BRT:** nas duas horas anteriores houve 5 cadastros externos: `chatgpt` 2, `direto` 2 e `taaft` 1. Fonte: `profiles`, pessoas distintas por linha, filtros internos canônicos; janelas e origens não foram somadas ao placar histórico.

### O que mudou

- **IMPLEMENTADO:** `buildExampleRemixSignupPreview()` normaliza redirect interno, exige `/studio/create` e `create_intent=example_remix`, e só então reutiliza o parser de assunto já existente. Fonte: `lib/growth/signupCreationPreview.ts:84-101`.
- **IMPLEMENTADO:** `buildSignupCreationPreviewFromAuthParams()` mantém checkout soberano, falha fechado em redirects alheios e conserva o handoff direto sem redirect; a página de signup usa esse resolver puro. Fontes: `lib/growth/signupCreationPreview.ts:103-112`, `app/(auth)/signup/page.tsx:24,269-272`.
- **FATO CONFIRMADO:** `create_intent=example_remix` continua sem autorizar autostart; só `fast|trial_best` ou intenção ausente entram no handoff executável. Fonte: `lib/growth/signupCreationPreview.ts` e prova de regressão em `scripts/test-signup-creation-proof.mjs`.
- **IMPLEMENTADO:** as suítes cobrem o redirect real aninhado, Unicode, aspas, `#`, `%`, caminho externo/backslash, pathname/intenção exatos, prompt vazio, precedência de checkout, redirect alheio, handoff direto e ausência de autorização de geração; duas expectativas históricas de `/generate` foram alinhadas ao destino real `/studio/create`. Fontes: `scripts/test-example-remix.mjs:57-62`, `scripts/test-signup-creation-proof.mjs:91-140`.
- **FATO CONFIRMADO:** nenhum preço, oferta, desconto, promessa, Stripe, banco, migration, saldo, autorização de geração, evento de analytics, dashboard/Claude ou CAIXA foi alterado. Fonte: diff do commit `46d89d8957a5dfa04b9807982d6a272cbf425274`.
- **TESTADO LOCALMENTE — 04/09/2026 02:35 BRT:** red-first: a nova invariante falhou por ausência do resolver; depois, `test-example-remix` passou 54/54 e `test-signup-creation-proof` 59/59 (113 verificações), TypeScript e `git diff --check` saíram com código 0.
- **TESTADO LOCALMENTE — 04/09/2026 02:34 BRT:** a comparação autocontida foi inspecionada antes/depois, desktop e mobile. Fontes: `docs/previews/FLUXO-EXAMPLE-REMIX-SIGNUP-PROOF-2026-09-04.html` e `.png`.
- **FATO CONFIRMADO — revisão independente em 04/09/2026:** três auditores somente leitura revisaram contrato de auth, segurança, UX, cobertura e duplicação; todos deram GO e nenhum editou arquivo.

### Integração e produção

- **IMPLEMENTADO:** commit funcional `46d89d8957a5dfa04b9807982d6a272cbf425274` integrado em `main` por fast-forward sobre `5f70d4e4a773a1e68e1300bddc59ab51b6ea3903`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 02:40 BRT:** o Guardião do PR #6, execução `33841096946`, concluiu com TypeScript e suíte verdes antes do avanço da `main`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 02:42 BRT:** a Vercel concluiu `dpl_Bu7F1j2xiCVxjpN6DAVjUgqfg2Xt` como `READY`, alvo `production`, aliases canônicos e SHA funcional exato.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 02:42 BRT:** uma navegação anônima com assunto Unicode respondeu 307 de `/studio/create` para `/signup?redirect=...`, preservou intenção e assunto, e o signup final respondeu HTTP 200 em `www.usekineo.com`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** não foi criada conta real em produção. A confirmação visual foi provada pelo resolver executável, preview inspecionado e artefato implantado, não por E2E autenticado de uma conta de cliente.

### Como medir e quando parar

- **SUGESTÃO:** após uma janela pós-deploy completa, contar pessoas distintas em `example_remix_topic_submitted` → cadastro → primeiro filme → checkout com filme → assinatura; manter `example_remix_v1` separado e nunca usar contagem de eventos como pessoas.
- **SUGESTÃO — gate de parada:** corrigir ou reverter se redirect externo ganhar prova, se checkout perder precedência, se `example_remix` autorizar autostart, se assunto deixar de chegar exatamente a `/studio/create` ou se a taxa por pessoas cair contra janela anterior equivalente.
- **RISCO:** a versão com sessão expirada que cai em `/login` ainda mostra estado genérico; o assunto continua em query string durante auth, comportamento preexistente; as UTMs do remix ficam aninhadas no redirect enquanto o signup atribui UTMs de topo, então a coorte pós-cadastro pode estar subcontada.

### PEDIDOS

- **FATO CONFIRMADO:** nenhum pedido de outra pista foi baixado, alterado ou criado nesta rodada; a revisão do arquivo admin da rodada 6 continua com Claude.

## PRÓXIMA JOGADA

- **SUGESTÃO:** auditar e corrigir, numa rodada separada e sem tocar o dashboard Claude, a atribuição pós-cadastro do remix: hoje a intenção chega ao destino, mas a UTM aninhada pode não alimentar `profiles.signup_utm_campaign`. Primeiro provar a lacuna por pessoa; só então mudar o transporte.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **IMPLEMENTADO:** o cadastro de quem remixa um exemplo passou a confirmar o assunto já escolhido, sem mudar autenticação, destino, autorização de geração ou copy de oferta.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 02:43 BRT:** placar atualizado para 22 cadastros, 16 pessoas com filme, 2 pessoas em checkout e 0 assinaturas; o vigia de duas horas ficou vazio e a origem recente foi 2 ChatGPT, 2 direta e 1 TAAFT.
- **TESTADO LOCALMENTE — 04/09/2026 02:35 BRT:** 113 invariantes, TypeScript, diff check e preview desktop/mobile ficaram verdes; três auditores independentes deram GO.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 02:42 BRT:** Guardião #6, Vercel e redirect público ficaram verdes no SHA `46d89d89`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** impacto em primeiro filme/assinatura, E2E autenticado e atribuição pós-cadastro do remix aguardam janela ou prova específica.

---

## Rodada 10 — F1 · roteiro gerado confirmado no cadastro — 04/09 02:50→03:18 BRT — ENTREGA CONCLUÍDA

- **IMPLEMENTADO / VALIDADO EM PRODUÇÃO:** depois de receber um roteiro estruturado em `/free-script-generator`, a pessoa anônima agora vê no cadastro o roteiro já salvo antes de escolher Google ou e-mail; autenticação, destino e autorização de render permanecem iguais.
- **CONTRADIÇÃO OPERACIONAL:** a rodada durou 28 minutos, acima do teto de 20. A primeira revisão reprovou uma cobertura que testava um redirect fabricado; a correção passou a executar o builder usado pelo CTA. O Guardião bloqueante consumiu 5m58s, de 03:05:22 a 03:11:20 BRT. Fontes: revisão independente desta rodada e execução `33842942294`.

### Dado, prioridade e anti-repetição

- **FATO CONFIRMADO:** não havia pedido aberto viável da pista FLUXO: os itens existentes pertencem ao dashboard/Claude ou à CAIXA, e nenhum foi baixado, alterado ou duplicado. Fontes: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md` e as nove rodadas anteriores deste documento.
- **FATO CONFIRMADO:** `/free-script-generator` já entregava o roteiro e prometia que ele seguiria após o cadastro, mas seu redirect aninhado não carregava uma prova visual reconhecida; o resolver da rodada 9 aceitava somente `create_intent=example_remix`. Fontes antes de `11bac5ce`: `app/free-script-generator/FreeScriptClient.tsx` e `lib/growth/signupCreationPreview.ts`.
- **FATO CONFIRMADO:** a mudança não repete o remix da rodada 9: roteiro gratuito exige marcador próprio, `autoanalyze=1`, ausência de `create_intent` e classificação real como roteiro; o remix continua exigindo sua intenção própria e mostra uma ideia.
- **HIPÓTESE:** confirmar o valor já recebido reduz incerteza no último clique antes do cadastro; efeito em primeiro filme ou assinatura exige uma janela pós-deploy equivalente.

### Vigia do checkout e placar

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 03:17:38 BRT:** o vigia das duas horas anteriores encontrou **0 pessoas externas** com `checkout_started|checkout_attempted` sem `checkout_success_viewed`; não há linha individual para classificar como desejo, roteiro pronto ou defeito. Fonte: SQL somente leitura no projeto de produção, com pessoas distintas e filtros internos canônicos.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 03:17 BRT:** desde o marco de 03/09 13:00 BRT, o placar canônico permanece em **22 cadastros, 16 pessoas com filme (16/22), 1 checkout com filme, 1 checkout sem filme, 0 assinaturas e 0 pessoas com falha sem filme**. Fonte: SQL canônico da seção 5 do programa, executado somente leitura no projeto de produção.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 03:17:39 BRT:** nas duas horas anteriores houve 4 cadastros externos: `chatgpt` 2 e `direto` 2. A pessoa `taaft` observada às 02:43 BRT saiu da janela móvel; as duas janelas não foram somadas. Fonte: `profiles`, uma linha por pessoa, filtros internos canônicos.

### O que mudou

- **IMPLEMENTADO:** `buildFreeScriptSignupHref()` concentra o href realmente usado pelo CTA, preserva as três atribuições existentes e coloca `handoff_kind=free_script` somente dentro do destino `/studio/create`; o marcador não é `create_intent`. Fontes: `lib/growth/freeScriptSignupHandoff.ts:1-54`, `app/free-script-generator/FreeScriptClient.tsx:13-16,38-46,87-90`.
- **IMPLEMENTADO:** `buildFreeScriptSignupPreview()` normaliza o redirect, exige pathname exato, marcador exato, `autoanalyze=1`, ausência total de `create_intent` e resultado classificado como roteiro; checkout segue soberano e qualquer redirect explícito alheio falha fechado. Fonte: `lib/growth/signupCreationPreview.ts:102-139`.
- **FATO CONFIRMADO:** o ramo sem roteiro mantém apenas o cadastro com UTMs; o ramo com roteiro mantém o mapeamento `FACT`→marcadores, máximo de 5 linhas e 220 caracteres por trecho. A extração não muda a semântica anterior além do marcador visual. Fonte: `lib/growth/freeScriptSignupHandoff.ts:14-54` e revisão contra o pai `25c248b7`.
- **FATO CONFIRMADO:** `handoff_kind` não tem consumidor na geração; `readCreationHandoff()` segue retornando `createIntent=null`, `autoanalyze=1` continua apenas analisando e nenhum novo evento recebe prompt ou roteiro. Fontes: `lib/creationHandoff.ts`, `app/(dashboard)/generate/GenerateClient.tsx` e `app/free-script-generator/FreeScriptClient.tsx:274,287`.
- **FATO CONFIRMADO:** nenhum preço, oferta, desconto, Stripe, banco, migration, saldo, e-mail/mensagem, arquivo de dashboard/Claude ou arquivo de CAIXA foi alterado. Fonte: diff do commit `11bac5cee748bf5a807a5bc652843844f91342fa`.
- **TESTADO LOCALMENTE — 04/09/2026 03:04 BRT:** red-first falhou antes da implementação com `actual undefined` para a prova de roteiro; depois, `test-signup-creation-proof` passou 89/89, `test-public-video-remix` 37/37, `test-web-share-target` 79/79 e `test-sem-porteiro` 52/52 — **257 verificações direcionadas**. TypeScript e `git diff --check` saíram com código 0.
- **TESTADO LOCALMENTE — 04/09/2026 03:04 BRT:** a suíte agora executa o mesmo builder importado pelo CTA, decodifica o redirect externo e interno, compara o roteiro exato e cobre marcador ausente/desconhecido, path, `autoanalyze`, `create_intent`, checkout, falso roteiro, URL externa e barra invertida. Fonte: `scripts/test-signup-creation-proof.mjs:137-176`.
- **TESTADO LOCALMENTE — 04/09/2026:** o comparativo autocontido foi inspecionado antes/depois, desktop/mobile, sem clipping; a suíte exige HTML, PNG, labels e heading real. Fontes: `docs/previews/FLUXO-FREE-SCRIPT-SIGNUP-PROOF-2026-09-04.html`, `.png` e `scripts/test-signup-creation-proof.mjs:204-216`.
- **FATO CONFIRMADO — revisão independente em 04/09/2026:** três auditores somente leitura revisaram duplicação, escopo, auth/redirect, atribuição, autostart, privacidade, cobertura e visual. A primeira revisão de testes deu NO-GO ao falso positivo; após extração do builder e vínculo dos previews, os três pareceres finais deram GO. Nenhum auditor editou arquivos.

### Integração e produção

- **IMPLEMENTADO:** commit funcional `11bac5cee748bf5a807a5bc652843844f91342fa` integrado em `main` por fast-forward sobre `25c248b7631e2107201aeb479f107c9de2df0d92`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 03:11 BRT:** o Guardião do PR #8, execução `33842942294`, concluiu `success`; a suíte completa e TypeScript terminaram verdes antes do avanço da `main`. Fonte: `https://github.com/josephsskaf-hub/UseKineo/actions/runs/33842942294`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 03:13:31 BRT:** a Vercel concluiu o deployment `dpl_41b3rGWb6m2yj6tbSviwS69PrcFF` como `READY`, alvo `production`, aliases canônicos e SHA funcional exato `11bac5ce`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 03:15 BRT:** `/free-script-generator` e o signup construído responderam HTTP 200; 18 bundles da página foram lidos em memória e o bundle publicado contém `handoff_kind` e `free_script`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 03:17 BRT:** no hostname imutável do deployment, uma sessão anônima renderizou `Your script is ready to continue`, `Your script is waiting`, o hook preservado e as opções Google/e-mail. Nenhuma conta foi criada, formulário enviado ou render iniciado.
- **QUESTÃO PENDENTE / DESCONHECIDO:** o CTA real pós-geração não foi clicado em produção porque isso exigiria chamar o gerador público e criar telemetria; a travessia foi provada pelo builder executável, bundle do SHA, rota anônima renderizada e testes, não por uma nova conta de cliente.

### Como medir e quando parar

- **SUGESTÃO:** após uma janela completa pós-deploy, contar pessoas distintas em `free_script_to_signup_clicked` com campanha `push22_script_generator` → cadastro → primeiro filme → checkout com filme → assinatura; mostrar separadamente os ramos `public_video` e `web_share_target`, sem somar eventos ou janelas diferentes.
- **SUGESTÃO — gate de parada:** corrigir ou reverter se o marcador sair do redirect interno, se URL externa ou falso roteiro ganhar prova, se checkout perder precedência, se aparecer qualquer `create_intent`, se o roteiro deixar de chegar exatamente a `/studio/create` ou se a taxa por pessoas cair contra janela anterior equivalente.
- **RISCO:** o roteiro completo continua na query string durante auth, comportamento preexistente; o marcador também chega ao Studio, onde hoje é ignorado. A rodada não altera o modo de roteiro nem prova incremento causal de assinatura.

### PEDIDOS

- **FATO CONFIRMADO:** nenhum pedido de outra pista foi baixado, alterado ou criado nesta rodada; a revisão do arquivo admin da rodada 6 continua com Claude.

## PRÓXIMA JOGADA

- **SUGESTÃO:** numa rodada separada, levar a mesma confirmação fail-closed ao `/login` usado quando a sessão expira, sem tocar dashboard/Claude; hoje esse desvio conserva o redirect, mas volta a mostrar estado genérico. Medir antes a janela do cadastro desta rodada se já houver volume.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **IMPLEMENTADO:** o roteiro já entregue pelo gerador gratuito agora aparece confirmado no cadastro, sem mudar checkout, auth, destino ou autorização de render.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 03:17 BRT:** placar inalterado em 22 cadastros, 16 pessoas com filme, 2 pessoas em checkout e 0 assinaturas; o vigia de duas horas ficou vazio, e a origem recente foi 2 ChatGPT e 2 direta.
- **TESTADO LOCALMENTE — 04/09/2026 03:04 BRT:** 257 invariantes, TypeScript, diff check e preview desktop/mobile ficaram verdes; um NO-GO real foi corrigido e os três auditores deram GO final.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 03:17 BRT:** Guardião #8, Vercel, bundle público e signup anônimo renderizado ficaram verdes no SHA `11bac5ce`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** impacto em primeiro filme/assinatura, clique real pós-gerador e variante `/login` aguardam janela ou rodada específica.

---

## Rodada 11 — F1 · trabalho salvo confirmado no login — 04/09 03:25→03:49 BRT — ENTREGA CONCLUÍDA

- **IMPLEMENTADO / VALIDADO EM PRODUÇÃO:** quem chega ao `/login` por sessão anterior expirada agora vê o remix ou roteiro já salvo antes de escolher Google ou e-mail; autenticação, redirect e autorização de render continuam iguais.
- **CONTRADIÇÃO OPERACIONAL:** a rodada durou 24 minutos, acima do teto de 20. O código, testes e dois pareceres estavam prontos às 03:36 BRT; o job bloqueante do Guardião consumiu 7m42s, com `npm ci` sozinho entre 03:37:54 e 03:44:57 BRT, e só então permitiu o fast-forward. Fonte: execução `33845152020`.

### Dado, prioridade e anti-repetição

- **FATO CONFIRMADO:** não havia pedido aberto viável da pista FLUXO; os itens pendentes pertencem ao dashboard/Claude ou à CAIXA. Nenhum pedido foi baixado, alterado ou duplicado. Fonte: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md`, lido às 03:26 BRT.
- **FATO CONFIRMADO:** as rodadas 9 e 10 já confirmavam trabalho salvo no signup, mas o login seguia genérico mesmo recebendo o redirect completo. O próprio handoff da rodada 10 separava esta lacuna como próxima jogada. Fontes antes de `5e147af5`: `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx:278-280` e esta seção anterior, linha 652.
- **HIPÓTESE:** mostrar a prova no desvio de sessão expirada reduz a sensação de perda entre valor recebido e autenticação; o tamanho dessa coorte e o efeito em primeiro filme ou assinatura são desconhecidos.

### Vigia do checkout e placar

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 03:27:08 BRT:** o vigia das duas horas anteriores encontrou **0 pessoas externas** com `checkout_started|checkout_attempted` sem `checkout_success_viewed`; não há linha individual nem classe desejo/roteiro-pronto/defeito nesta janela. Fonte: SQL somente leitura do §8.2 no projeto de produção, com pessoas distintas e filtros internos canônicos.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 03:27:09 BRT:** desde 03/09 13:00 BRT, o placar canônico permanece em **22 cadastros, 16 pessoas com filme (16/22), 1 checkout com filme, 1 checkout sem filme, 0 assinaturas e 0 pessoas com falha sem filme**. Fonte: SQL canônico do programa, executado somente leitura no projeto de produção.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 03:27:10 BRT:** nas duas horas anteriores houve 3 cadastros externos: `chatgpt` 2 e `direto` 1. A janela móvel não foi somada às medições das rodadas anteriores. Fonte: `profiles`, uma linha por pessoa e filtros internos canônicos.

### O que mudou

- **IMPLEMENTADO:** `buildLoginCreationPreviewFromAuthParams()` exige redirect explícito, rejeita checkout primeiro e só aceita os contratos já validados de `example_remix` ou `free_script`; `?prompt=` solto, redirect externo, genérico ou alheio não produz promessa. Fonte: `lib/growth/signupCreationPreview.ts:147-155`.
- **IMPLEMENTADO:** o login deriva a prova da query já transportada, adapta H1/subcopy e mostra o card antes do primeiro método de autenticação. Fontes: `app/(auth)/login/page.tsx:64-70,240-251,279-286`.
- **IMPLEMENTADO:** o card existente saiu do JSX do signup para `AuthSavedCreationCard`, compartilhado pelas duas páginas com região nomeada e texto escapado pelo React. Fontes: `components/AuthSavedCreationCard.tsx:1-51` e `app/(auth)/signup/page.tsx:593-597`.
- **FATO CONFIRMADO:** nenhum callback, middleware, destino, autostart, API, analytics, preço, oferta, desconto, Stripe, banco, migration, saldo, e-mail/mensagem, dashboard/Claude ou CAIXA foi alterado. Fonte: diff do commit funcional `5e147af54b9e119fa5180d49fbeaa72100a39815`.
- **TESTADO LOCALMENTE — 04/09/2026 03:36 BRT:** red-first falhou pela ausência do resolver; depois, oito suítes direcionadas somaram **433 verificações verdes**, TypeScript real e `git diff --check` saíram com código 0. O Guardião confirmou suíte e TypeScript em ambiente limpo.
- **CONTRADIÇÃO:** dois testes locais fora do delta continuam desatualizados no próprio `origin/main`: um exige 7 motores quando `ENGINE_LANDING_PARAMS` contém 8; outro exige fallback `/generate` quando o código já usa o destino novo. Eles não foram contados nas 433 verificações nem alterados nesta rodada; o Guardião canônico ficou verde.
- **TESTADO LOCALMENTE — 04/09/2026 03:36 BRT:** o comparativo autocontido foi inspecionado antes/depois, desktop/mobile, legível e sem clipping. Fontes: `docs/previews/FLUXO-LOGIN-SAVED-CREATION-2026-09-04.html` e `.png`.
- **FATO CONFIRMADO — revisão independente em 04/09/2026:** três auditores somente leitura revisaram anti-repetição, ownership, auth, redirect, checkout, privacidade, acessibilidade, cobertura e visual; os pareceres finais deram GO e nenhum auditor editou arquivo.

### Integração e produção

- **IMPLEMENTADO:** commit funcional `5e147af54b9e119fa5180d49fbeaa72100a39815` integrado em `main` por fast-forward sobre `aaf9defcd735369e39edb53feaa0607c63020fcb`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 03:45:24 BRT:** o Guardião do PR #10, execução `33845152020`, concluiu `success`; suíte e TypeScript ficaram verdes antes do avanço da `main`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 03:46:52 BRT:** a Vercel concluiu `dpl_3hKBVQ6jkacyZ4eFQHwG7yN9QAyN` como `READY`, alvo `production`, aliases canônicos e SHA funcional exato `5e147af5`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 03:48 BRT:** uma sessão anônima em `www.usekineo.com/login` com o redirect real de `free_script` renderizou H1 de continuidade, `Saved before sign-in`, três trechos preservados e opções Google/e-mail. Nenhuma conta foi criada, formulário enviado ou render iniciado.
- **QUESTÃO PENDENTE / DESCONHECIDO:** nenhum login autenticado foi concluído em produção; o transporte pós-auth permanece coberto por código e testes. O hostname imutável exigiu SSO da Vercel, então a prova anônima final usou o domínio canônico.

### Como medir e quando parar

- **SUGESTÃO:** após uma janela completa pós-deploy, contar pessoas distintas das coortes existentes `example_remix_topic_submitted` e `free_script_to_signup_clicked` até cadastro, primeiro filme, checkout com filme e assinatura, sempre separadas. Como não há evento específico de exposição do login, não atribuir causalidade nem inventar o tamanho do desvio de sessão expirada.
- **SUGESTÃO — gate de parada:** corrigir ou reverter se checkout perder precedência, se prompt solto/redirect alheio ganhar prova, se qualquer handoff autorizar geração, se o card aparecer depois dos métodos de auth ou se o trabalho deixar de chegar exatamente ao destino preservado.
- **RISCO:** `Forgot password?` ainda não carrega `example_remix` ou `free_script`, e a falha de OAuth volta ao login genérico sem `next` fora de checkout; essas ramificações preexistentes perdem o handoff. O prompt completo continua na query durante auth, comportamento preexistente, e agora também fica visível na tela para quem abriu a própria URL.

### PEDIDOS

- **FATO CONFIRMADO:** nenhum pedido de outra pista foi baixado, alterado ou criado nesta rodada; os itens de dashboard continuam com Claude e o item de CAIXA permanece fora do escopo FLUXO.

## PRÓXIMA JOGADA

- **SUGESTÃO:** provar separadamente a perda em recuperação de senha e falha de OAuth para `example_remix`/`free_script`; somente se o transporte puder permanecer estritamente allowlisted e sem tocar checkout, preservar o handoff nessas saídas. Manter como rodada própria por envolver callback, PKCE e mais de uma tela.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **IMPLEMENTADO:** remix e roteiro já salvos agora aparecem também no login de sessão expirada, com o mesmo card do cadastro e sem mudar autenticação ou destino.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 03:27 BRT:** placar inalterado em 22 cadastros, 16 pessoas com filme, 2 pessoas em checkout e 0 assinaturas; o vigia de duas horas ficou vazio e a origem recente foi 2 ChatGPT e 1 direta.
- **TESTADO LOCALMENTE — 04/09/2026 03:36 BRT:** 433 verificações direcionadas, TypeScript, diff check e preview desktop/mobile ficaram verdes; três auditores deram GO.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 03:48 BRT:** Guardião #10, Vercel e login anônimo canônico ficaram verdes no SHA `5e147af5`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** impacto em primeiro filme/assinatura, tamanho da coorte de sessão expirada, E2E autenticado e preservação por recuperação de senha seguem sem prova.

---

## Rodada 12 — medição pura de R8→R11 — 04/09 09:37→09:46 BRT — CONCLUÍDA

- **FATO CONFIRMADO:** esta foi a rodada de medição obrigatória após quatro entregas; nenhum comportamento do produto foi alterado. Fonte: `docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md:430-431`.
- **EVIDÊNCIA DE PRODUÇÃO:** as medições abaixo foram executadas somente leitura no projeto de produção, contam pessoas quando há identidade e chamam navegação anônima de sessão, nunca de pessoa.

### Placar, vigia e origem

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 09:42:41 BRT:** desde o marco de 03/09 13:00 BRT, o placar canônico é **33 cadastros, 21 pessoas com filme, 1 checkout com filme, 1 checkout sem filme, 0 assinaturas e 0 pessoas com falha sem filme**. Fonte: SQL canônico de `docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md:168-188`, executado no Supabase de produção com os filtros internos canônicos.
- **EVIDÊNCIA DE PRODUÇÃO:** contra a última leitura antes de R8, encerrada em 04/09 00:55 BRT, o placar passou de 16 para 33 cadastros e de 11 para 21 pessoas com filme, enquanto checkout permaneceu em 1 com filme + 1 sem filme e assinatura permaneceu em 0. Contra a leitura de R11 às 03:27:09 BRT, são 11 cadastros e 5 pessoas com filme a mais, sem avanço em checkout ou assinatura. Fontes: Rodadas 8 e 11 deste handoff e SQL de 09:42:41 BRT. Isso é mudança do placar, não atribuição causal às quatro entregas.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 09:42:41 BRT:** o vigia das duas horas anteriores encontrou **0 pessoas externas** com `checkout_started|checkout_attempted` sem `checkout_success_viewed`; não há linha individual nem classe desejo/roteiro-pronto/defeito nesta janela.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 09:42:41 BRT:** nas duas horas anteriores houve 5 cadastros externos: **direto 4, ChatGPT 1**. A janela móvel não foi somada às anteriores.

### O que R8→R11 já permite medir

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 09:44:26 BRT:** desde o deploy de R8 às 02:18 BRT, `/vs` e seus comparativos tiveram **1 sessão anônima** em `landing_session_started` e **0 pessoas autenticadas**; é amostra insuficiente para avaliar a correção multiformato.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 09:44:26 BRT:** desde os respectivos deploys, houve **0 sessões** com `example_remix_topic_submitted` após R9 e **0 sessões** com `free_script_to_signup_clicked` após R10. Portanto ainda não existiu exposição mensurável às confirmações de trabalho de R9/R10, e R11 não tem evento próprio de exposição no login.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 09:44:26 BRT:** depois do deploy de R11 houve **0 eventos** `auth_callback_failed`, tanto em checkout quanto fora dele.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 09:44:47 BRT:** em 30 dias houve **10 eventos** `auth_callback_failed` fora de checkout e 0 em checkout; nenhum carregava `user_id`, então o dado não identifica pessoas nem prova quantos traziam `example_remix` ou `free_script`. O primeiro ocorreu em 17/08 23:57 BRT e o último em 02/09 19:22 BRT. Fonte: `events`, filtro exato por nome, janela de 30 dias e telemetria `is_checkout_destination`, somente leitura.
- **QUESTÃO PENDENTE / DESCONHECIDO:** não há volume pós-deploy para atribuir primeiro filme, checkout ou assinatura a R8, R9, R10 ou R11. Também não existe telemetria que distinga, numa falha OAuth não-checkout, trabalho salvo de um destino genérico.

### Decisão, anti-repetição e risco

- **FATO CONFIRMADO:** nenhuma implementação foi iniciada nesta rodada de medição; isso preserva a reserva de 20% definida pelo programa e evita transformar ausência de amostra em copy ou fluxo novo. Fonte: `docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md:160-162,430-431`.
- **FATO CONFIRMADO:** não há pedido aberto viável para FLUXO. Os pedidos pendentes pertencem ao dashboard/Claude ou à CAIXA; `/v/[id]` e o teto do quickstart já foram concluídos nos SHAs `96310071` e `341a119b`.
- **FATO CONFIRMADO:** três auditorias somente leitura concordaram em separar recuperação de senha de falha OAuth. Duas priorizaram o ramo OAuth menor; a auditoria completa de auth preferiu a cadeia de senha como experiência atômica, mas classificou-a como cinco arquivos e proibiu juntar as duas.
- **HIPÓTESE / RISCO:** os totais do placar usam o marco fixo e não formam uma coorte causal de cada deploy; a sessão única de `/vs` não representa uma pessoa confirmada; zeros de eventos significam ausência observada na janela, não prova de que a interface converte melhor ou pior.
- **TESTADO LOCALMENTE — 04/09/2026:** não houve código de produto a testar. `git diff --check` foi usado como gate do único append documental.

### PEDIDOS

- **FATO CONFIRMADO:** nenhum pedido foi baixado, alterado ou criado nesta rodada.

## PRÓXIMA JOGADA

- **SUGESTÃO:** na R13, preservar somente `example_remix` e `free_script` no retorno de falha OAuth. O callback já recebe o destino, mas o fallback não-checkout o descarta em `lib/growth/checkoutOAuthFailureHandoff.ts:38-42` e `app/auth/callback/route.ts:205-220`; o login já valida e mostra os dois contratos em `lib/growth/signupCreationPreview.ts:147-155`. Implementar em helper FLUXO separado, manter o helper de checkout intacto e soberano, e falhar fechado para redirect externo, prompt solto, marcador adulterado ou destino genérico. A recuperação de senha permanece uma rodada própria.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 09:42 BRT:** o placar chegou a 33 cadastros e 21 pessoas com filme, mas checkout continuou em 2 pessoas e assinatura em 0; o vigia de duas horas ficou vazio e a origem recente foi 4 direta + 1 ChatGPT.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 09:44 BRT:** R8 teve uma sessão observável; R9 e R10 ainda não tiveram eventos de entrada pós-deploy; R11 não teve falha OAuth pós-deploy. Não há amostra para atribuir conversão às quatro mudanças.
- **FATO CONFIRMADO:** a rodada respeitou o gate de medição pura, alterou apenas este handoff e não tocou produto, preço, checkout, banco, mensagens, dashboard Claude ou arquivos CAIXA.
- **SUGESTÃO:** a próxima unidade pequena e observável é conservar o trabalho já validado quando o callback OAuth falha, sem misturá-la à recuperação de senha.

---

## Rodada 13 — falha OAuth conserva trabalho salvo — 04/09 09:57→10:17 BRT — CONCLUÍDA

- **FATO CONFIRMADO:** não havia pedido aberto viável para FLUXO nem implementação equivalente no histórico. O botão Google transportava `next`, mas o fallback de falha descartava todo destino não-checkout; o login já sabia validar e mostrar `example_remix` e `free_script`. Fontes: `components/GoogleSignInButton.tsx:24-37`, `lib/growth/checkoutOAuthFailureHandoff.ts:38-42`, `app/auth/callback/route.ts:205-220` antes deste commit, `lib/growth/signupCreationPreview.ts:147-155` e `app/(auth)/login/page.tsx:69,280`.
- **DECISÃO APROVADA:** executar somente a ramificação OAuth nesta rodada, em helper FLUXO próprio; recuperação de senha continua separada e checkout permanece soberano. Fonte: próxima jogada da Rodada 12 neste handoff e ownership do programa §8.1.

### Vigia do checkout e placar

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 10:01–10:02 BRT:** o vigia encontrou uma pessoa externa direta, conta nova, com 0 filmes e 25 créditos: `auth_callback_completed` com destino checkout às 10:01:18, `checkout_attempted`/`checkout_started` Pro às 10:01:21–22 e retorno ao `/studio` às 10:01:56, sem `checkout_success_viewed` no corte. É checkout de defeito pela classificação canônica. Fonte: SQL somente leitura do §8.2 no projeto de produção, com filtros internos canônicos. O pedido correspondente foi encaminhado à pista CAIXA em `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md`.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 10:01 BRT:** desde 03/09 13:00 BRT, o placar canônico é **34 cadastros, 21 pessoas com filme, 1 checkout com filme, 2 checkouts sem filme, 0 assinaturas e 0 pessoas com falha sem filme**. Fonte: SQL canônico do programa, somente leitura; pessoas distintas e contas internas excluídas.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 10:01 BRT:** nas duas horas anteriores houve 6 cadastros externos: **direto 5, ChatGPT 1**. A janela móvel não foi somada às medições anteriores.

### O que mudou

- **IMPLEMENTADO:** `buildCreationOAuthFailureHandoff()` normaliza o destino e conserva somente os contratos já allowlisted de remix de exemplo ou roteiro grátis; destino genérico, externo, backslash, marcador adulterado, criação executável e checkout falham fechados. Fonte: `lib/growth/creationOAuthFailureHandoff.ts:27-56`.
- **IMPLEMENTADO:** na falha do callback, checkout é resolvido primeiro e permanece intacto; somente quando ele recusa o destino o helper FLUXO pode substituir o login genérico. O carregamento dinâmico mantém o fallback anterior se o módulo falhar. Fonte: `app/auth/callback/route.ts:204-222`.
- **IMPLEMENTADO:** a telemetria adiciona apenas versão, booleano e enum `example_remix|free_script`; prompt, URL e redirect nunca entram no evento. Fonte: `lib/growth/creationOAuthFailureHandoff.ts:11-15,38-42` e `app/auth/callback/route.ts:225-237`.
- **FATO CONFIRMADO:** nenhum helper/teste `checkout*`, cookie de atribuição, Stripe, preço, oferta, desconto, banco, migration, saldo, mensagem, dashboard/Claude ou arquivo CAIXA foi alterado no commit funcional `474c6f2fbe0999b1e3070d7b76da9624d5fdc7d6`.
- **TESTADO LOCALMENTE — 04/09/2026 10:12 BRT:** cinco suítes somaram **399 verificações verdes** (`166+56+61+37+79`), inclusive as duas suítes CAIXA de regressão; TypeScript real e `git diff --check` saíram com código 0.
- **TESTADO LOCALMENTE — 04/09/2026 10:08 BRT:** o comparativo autocontido antes/depois, desktop/mobile, foi renderizado e inspecionado sem clipping. Fontes: `docs/previews/FLUXO-OAUTH-FAILURE-SAVED-WORK-2026-09-04.html` e `.png`.
- **FATO CONFIRMADO:** três auditores somente leitura deram GO para a unidade isolada; verificaram anti-repetição, ownership, segurança de redirect, privacidade, compatibilidade Next/TS e regressões de checkout. Nenhum auditor editou arquivo.

### Integração e produção

- **IMPLEMENTADO:** commit funcional `474c6f2fbe0999b1e3070d7b76da9624d5fdc7d6` integrado em `main` por fast-forward sobre `feb01a4f52fb08012c15749c7b7ea24ee75ee1f5`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 10:11:59 BRT:** Guardião do PR #13, execução `33876629545`, concluiu `success` no SHA funcional exato.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 10:14 BRT:** a Vercel concluiu `dpl_ESMsDsjUbdryrgYrfzfY9Ca1eiiq` como `READY`, alvo `production`, no SHA funcional exato `474c6f2fbe0999b1e3070d7b76da9624d5fdc7d6`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 10:16 BRT:** navegador in-app isolado e anônimo abriu o login canônico com o redirect real de `free_script` e renderizou H1 de continuidade, `SAVED BEFORE SIGN-IN`, três trechos preservados e opções Google/e-mail. Nenhuma conta, callback, formulário ou geração foi acionado nessa prova. Uma tentativa anterior em Chrome foi descartada porque já continha sessão autenticada e foi encerrada imediatamente, sem interação; não foi usada como evidência.
- **QUESTÃO PENDENTE / DESCONHECIDO:** nenhum OAuth real foi deliberadamente quebrado e nenhuma conta foi criada para validar o ramo ponta a ponta; chamar artificialmente o callback gravaria telemetria de produção e contaminaria a medição.

### Decisão, risco e medição

- **HIPÓTESE:** conservar a prova visível após falha de provedor reduz a chance de abandono por trabalho aparentemente perdido; ainda não existe amostra pós-deploy para atribuir primeiro filme, checkout ou assinatura.
- **RISCO:** o prompt completo continua na query e no histórico do navegador, comportamento preexistente no auth e agora prolongado após essa falha; o gate é nunca copiá-lo para telemetria. O login não exibe mensagem textual de erro OAuth — somente conserva o trabalho — e isso não foi prometido.
- **SUGESTÃO:** medir separadamente pessoas de `example_remix_topic_submitted` e `free_script_to_signup_clicked` que depois tenham `auth_callback_failed` com `has_saved_creation=true`, até cadastro, primeiro filme, checkout com filme e assinatura; nunca somar eventos ou janelas.
- **SUGESTÃO — gate de parada:** corrigir ou reverter se checkout perder precedência, se qualquer destino fora dos dois contratos ganhar redirect preservado, se conteúdo entrar na telemetria ou se a falha deixar de cair no login genérico quando o helper não reconhece o destino.

### PEDIDOS

- **IMPLEMENTADO:** pedido `DE codex-fluxo PARA codex-caixa` registrado às 10:02 BRT para acompanhar a pessoa viva do checkout sem alterar preço, oferta ou arquivos da outra pista.

## PRÓXIMA JOGADA

- **SUGESTÃO:** numa rodada própria, provar e preservar os mesmos dois contratos durante recuperação de senha, mantendo checkout soberano e sem misturar mais ramificações de auth. A R14 pode implementar porque a próxima medição pura obrigatória é a R16.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **IMPLEMENTADO:** uma falha OAuth não apaga mais o remix ou roteiro já validado; o callback volta ao login com o trabalho preservado, sem aceitar destinos genéricos e sem tocar checkout.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 10:01 BRT:** placar em 34 cadastros, 21 pessoas com filme, 1 checkout com filme, 2 sem filme e 0 assinaturas; o vigia achou uma pessoa nova em checkout e gerou pedido para CAIXA.
- **TESTADO LOCALMENTE:** 399 verificações, TypeScript, diff check e preview desktop/mobile ficaram verdes; três auditorias deram GO.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 10:16 BRT:** Guardião #13, Vercel e login anônimo canônico ficaram verdes no SHA `474c6f2f`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** impacto em primeiro filme/assinatura, volume real de falhas com trabalho salvo e E2E autenticado continuam sem prova.

---

## Rodada 14 — recuperação de senha conserva trabalho salvo — 04/09 10:26→10:54 BRT — CONCLUÍDA

- **FATO CONFIRMADO:** não havia pedido aberto viável da pista FLUXO nem implementação equivalente. Login e signup mostravam os contratos `example_remix|free_script`, mas seus links de recuperação derivavam apenas contexto de checkout; forgot/reset conheciam somente checkout e o sucesso comum caía em `/studio`. Fontes antes do commit funcional: `app/(auth)/login/page.tsx:71-75`, `app/(auth)/signup/page.tsx:262-269`, `app/(auth)/forgot-password/page.tsx:21-50` e `app/(auth)/reset-password/page.tsx:104-120`.
- **HIPÓTESE:** manter visível e navegável o remix ou roteiro que a pessoa já trouxe reduz abandono por trabalho aparentemente perdido quando ela precisa recuperar a senha. **QUESTÃO PENDENTE / DESCONHECIDO:** não existe evento que dimensione quantas pessoas entram nessa ramificação, portanto nenhum efeito causal em cadastro, filme, checkout ou assinatura é afirmado.
- **CONTRADIÇÃO OPERACIONAL:** a rodada levou 28 minutos, acima do teto de 20. O primeiro Guardião ficou verde no SHA funcional às 10:46 BRT, mas `main` avançou durante a validação; a branch integrou o novo commit sem force-push e repetiu o Guardião antes do fast-forward.

### Vigia do checkout, placar e origem

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 10:53 BRT:** desde o marco de 03/09 13:00 BRT, o placar canônico é **35 cadastros, 22 pessoas com filme, 1 checkout com filme, 2 checkouts sem filme, 0 assinaturas e 0 pessoas com falha sem filme**. Fonte: SQL canônico do programa, somente leitura no Supabase de produção, pessoas distintas e contas internas excluídas.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 10:53 BRT:** nas duas horas anteriores houve 3 cadastros externos e a leitura atual classificou os 3 como `chatgpt`; duas pessoas já tinham filme, uma delas com 2 filmes, e nenhuma assinou. A janela móvel não foi somada às anteriores.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 10:53 BRT:** a mesma pessoa nova do vigia da R13 abriu checkout às 10:01:22, iniciou geração às 10:20, voltou a acompanhar o render e chegou a `stranded_composed` às 10:46:27; no corte ainda tinha 0 filmes, 0 `checkout_success_viewed` e 0 `generation_stage_error`. O pedido das 10:02 para CAIXA já cobre essa pessoa e não foi duplicado.
- **CONTRADIÇÃO DE ATRIBUIÇÃO:** a R13 registrou essa conta como `direto` às 10:01, enquanto a leitura canônica das mesmas `profiles.signup_utm_source|utm_source` às 10:53 a devolveu como `chatgpt`. **QUESTÃO PENDENTE / DESCONHECIDO:** até provar se o perfil é sobrescrito depois do cadastro, “origem de signup” não deve ser tratada como atributo imutável para essa pessoa.

### O que mudou

- **IMPLEMENTADO:** `creation_password_recovery_handoff_v1` aceita somente destino local normalizado de `example_remix` ou `free_script`, exige `reason=saved_creation`, limita o destino a 16.384 caracteres e falha fechado para criação genérica, checkout, URL externa, backslash, caractere de controle, marcador adulterado ou script executável. Fonte: `lib/growth/creationPasswordRecoveryHandoff.ts:8-70`.
- **IMPLEMENTADO:** login e signup agora transportam esses dois destinos no link “Forgot password?”, mas um `reason=checkout` bruto bloqueia a classificação de criação mesmo quando o redirect se parece com remix. Fontes: `app/(auth)/login/page.tsx:76-82` e `app/(auth)/signup/page.tsx:266-275`.
- **IMPLEMENTADO:** forgot-password leva o mesmo destino validado ao `redirectTo` do Supabase, mantém retry e retorno ao login, e mostra título, trechos e copy próprios de recuperação; reset-password preserva PKCE/hash/listener existentes e, depois de `updateUser` bem-sucedido, segue na ordem **checkout → criação validada → `/studio`**. Fontes: `app/(auth)/forgot-password/page.tsx:28-74,114-145` e `app/(auth)/reset-password/page.tsx:34-93,115-150,188-222`.
- **FATO CONFIRMADO:** não foi criado evento. Prompt, roteiro, redirect, token, código, e-mail e senha não entram em telemetria nova; `lib/growth/checkoutPasswordRecovery.ts`, Stripe, preço, oferta, desconto, banco, migration, dashboard/Claude e arquivos CAIXA não foram alterados pelo commit funcional `45d7a02af2c898c963db6abdf9490a11711284ef`.
- **TESTADO LOCALMENTE — 04/09/2026 10:45 BRT:** red-first falhou por helper inexistente; depois, cinco suítes direcionadas somaram **477 verificações verdes** (`244+56+61+37+79`), incluindo round-trip de remix e roteiro nos três hops, coexistência com `?code=` PKCE, limites e regressões OAuth/checkout. O compilador real `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` e `git diff --check` saíram com código 0.
- **CONTRADIÇÃO PRÉ-EXISTENTE:** `scripts/test-checkout-password-recovery.mjs:145` ainda exige fallback `/generate`, mas o código-base usa `/studio` desde `8000825f`; esse é o único vermelho direcionado observado e não foi alterado nesta rodada.
- **TESTADO LOCALMENTE:** o comparativo autocontido foi renderizado e inspecionado com before/after de forgot, reset, “Check your inbox” e “Password updated”, todos em desktop e mobile, sem callout inventado dentro do produto. Fontes: `docs/previews/FLUXO-PASSWORD-RECOVERY-SAVED-WORK-2026-09-04.html`, `.png` e `scripts/test-signup-creation-proof.mjs:417-430`.
- **FATO CONFIRMADO:** três auditores somente leitura revisaram prioridade, ownership, PKCE, precedência, privacidade, acessibilidade, testes e visual; dois NO-GO objetivos — branch atrasada e preview incompleto — foram corrigidos antes da entrega. Nenhum auditor editou arquivo.

### Integração e produção

- **IMPLEMENTADO:** commit funcional `45d7a02af2c898c963db6abdf9490a11711284ef`; após `main` avançar, merge de integração `bd97f3d0c5f687377d3922f162bce190fc54f3fe`; `main` avançou por fast-forward, sem force-push. PR #15 foi o gate de revisão.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 10:50 BRT:** Guardião execução `33880164020` concluiu `success` no SHA de integração; o job de TypeScript declarou “typecheck limpo (só os erros conhecidos)”.
- **CONTRADIÇÃO DO GUARDIÃO:** o job de suíte também concluiu `success`, mas o próprio log registrou **88 baterias verdes e 205 vermelhas**. O workflow não executa `npm ci` nesse job e não retorna erro quando há baterias vermelhas; portanto “workflow verde” não equivale a “suíte completa verde”. Um pedido foi aberto para a pista dona corrigir a medição sem transformar a linha de base em alarme permanente.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 10:51 BRT:** Vercel deployment `dpl_3CCfKQEUq3X1LRwcBJnNb4JLMN9D` chegou a `READY`, target `production`, framework Next.js, SHA exato `bd97f3d0`, alias `www.usekineo.com` e `aliasError=null`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 10:52 BRT:** navegador in-app isolado e anônimo renderizou no domínio canônico: remix com `SAVED BEFORE PASSWORD RESET` e tema preservado; roteiro com três trechos preservados; recuperação comum continuou genérica; checkout válido continuou com `Your purchase is saved` e destino exato. Nenhum campo foi preenchido, formulário enviado, e-mail disparado, conta criada, senha alterada, checkout aberto ou crédito gasto.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 10:52 BRT:** scan do deployment entre 10:32 e 10:52 BRT encontrou 0 logs `error|fatal`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** E2E real e-mail → PKCE → atualização → criação não foi executado porque dispararia e-mail e alteraria credencial; a rota, coexistência de `code+reason+redirect` e ordem pós-sucesso foram provadas por código/teste, não por conta de cliente.

### Risco, medição e parada

- **RISCO:** o prompt/roteiro já presente na URL de auth agora também integra o `redirectTo` contido no e-mail de recuperação. Sem estado opaco server-side não existe continuidade cross-device equivalente; a mitigação desta rodada é allowlist estrita, limite, nenhuma telemetria nova e falha genérica para qualquer desvio.
- **SUGESTÃO:** medir separadamente as coortes existentes `example_remix_topic_submitted` e `free_script_to_signup_clicked` até cadastro, primeiro filme, checkout com filme e assinatura; não atribuir causalidade à recuperação enquanto o tamanho da ramificação continuar desconhecido.
- **SUGESTÃO — gate de parada:** corrigir ou reverter se checkout perder precedência, se qualquer destino fora dos dois contratos atravessar a recuperação, se conteúdo entrar em evento/log próprio, se o link expirado perder o retry ou se o sucesso não reabrir o destino exato.

### PEDIDOS

- **IMPLEMENTADO:** pedido interno aberto para a pista Claude corrigir o placar do Guardião, que hoje publica `success` mesmo com 205 baterias vermelhas por dependências ausentes e `continue-on-error`; nenhum pedido da outra pista foi baixado ou duplicado.

## PRÓXIMA JOGADA

- **SUGESTÃO:** na R15, investigar a mutabilidade da atribuição que fez a mesma conta passar de `direto` para `chatgpt` em 52 minutos; localizar o writer real de `signup_utm_source|utm_source` e, somente se houver sobrescrita pós-cadastro, preservar a origem inicial sem migration nem tocar dashboard/CAIXA. A R16 permanece reservada à medição pura obrigatória.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **IMPLEMENTADO:** esquecer a senha não apaga mais o remix ou roteiro já validado; os dois atravessam pedido, retry, reset e retorno ao login, com checkout soberano.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 10:53 BRT:** placar em 35 cadastros, 22 pessoas com filme, 1 checkout com filme, 2 sem filme e 0 assinaturas; a pessoa viva do checkout chegou à composição, mas ainda não tinha filme nem pagamento.
- **TESTADO LOCALMENTE:** 477 verificações direcionadas, TypeScript, diff check e preview completo ficaram verdes; três auditorias deram GO após dois NO-GO corrigidos.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 10:52 BRT:** Guardião #99, Vercel, alias canônico, quatro estados anônimos e scan de erros ficaram verdes no SHA `bd97f3d0`.
- **CONTRADIÇÃO:** a origem da pessoa viva mudou de `direto` para `chatgpt` entre leituras, e o Guardião reportou `success` com 205 baterias vermelhas; ambas viram trabalho explícito da próxima rodada/pista dona, sem maquiagem de número.

---

## Rodada 15 — auditoria da aparente mutação de origem — 04/09 11:02→11:07 BRT — NÃO EXECUTAR CÓDIGO

- **FATO CONFIRMADO:** as duas prioridades antigas reiteradas pela automação já estavam entregues: o título legado de `/v/[id]` no SHA `96310071` e o corte silencioso de 1.000 caracteres no SHA `341a119b`. Fontes: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:17,28` e Rodadas 2–3 deste handoff.
- **FATO CONFIRMADO:** nenhum pedido aberto viável pertence hoje à pista FLUXO. Os pedidos de 18:40, 18:45, 23:15, 23:35 e 01:15 tocam `GenerateClient`/dashboard, da pista Claude; os pedidos de 20:45 e 11:35 tocam caixa/pricing, da pista CAIXA. Fonte: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:18-24,35-40,47-49`.

### Dado, diagnóstico e decisão

- **FATO CONFIRMADO:** o único writer encontrado para `profiles.signup_utm_source` lê o valor atual e só inclui o campo no patch quando ele ainda está vazio; não existe caminho de sobrescrita nesse endpoint. Fonte: `app/api/track-signup-source/route.ts:132-149`.
- **FATO CONFIRMADO:** a captura é deliberadamente assíncrona: `trackSignupSource()` retorna `void`, dispara o POST sem `await` e só marca a sessão depois de resposta `ok`; signup e chegada OAuth chamam esse caminho sem bloquear navegação. Fontes: `lib/analytics.ts:379-381,385-423`, `app/(auth)/signup/page.tsx:386-388` e `app/(dashboard)/generate/GenerateClient.tsx:2975-3008`.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:05 BRT:** o perfil observado nasceu às 10:01:18 BRT e agora tem `signup_utm_source='chatgpt'`, `utm_source=null`; a tabela não possui `updated_at`, portanto o instante exato do primeiro preenchimento não é recuperável. Fonte: SQL somente leitura no Supabase de produção.
- **HIPÓTESE MAIS FORTE:** a leitura das 10:01 classificou `null` como `direto` antes de o POST fire-and-forget terminar; a leitura das 10:53 viu o primeiro preenchimento como `chatgpt`. Isso explica os dois estados sem exigir mutação nem contradizer o writer first-touch.
- **DECISÃO — NÃO EXECUTAR:** não alterar persistência, auth nem UI com base nessa aparente mutação. A correção honesta é operacional: em vigias de conta criada há poucos segundos, origem nula é `pendente/desconhecida`, não `direto`; remedir depois do POST. Forçar espera na navegação criaria latência visível sem corrigir dado já persistido.

### Vigia do checkout e placar

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:05 BRT:** placar canônico desde 03/09 13:00 BRT: **35 cadastros, 23 pessoas com filme, 2 checkouts com filme, 1 sem filme, 0 assinaturas e 0 pessoas com falha sem filme**. Fonte: SQL canônico do programa, contas internas excluídas e pessoas distintas.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:05 BRT:** nas duas horas anteriores houve 2 cadastros externos, ambos atualmente classificados como `chatgpt`; a janela móvel não foi somada a janelas anteriores.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:05 BRT:** a pessoa do vigia abriu checkout às 10:01:22 BRT, chegou a `stranded_composed` às 10:46:27 e recebeu o primeiro filme às 11:00:48; tem agora 1 filme concluído, 12 créditos, 0 erro e 0 pagamento. O mesmo checkout migrou corretamente do balde sem filme para o balde com filme porque o placar canônico classifica pelo estado atual da pessoa.

### Risco, medição e entrega

- **RISCO:** o SQL canônico usa `coalesce(..., 'direto')`; aplicado em tempo real, mistura tráfego direto com atribuição ainda não preenchida. Não altera receita, mas pode induzir decisão errada em vigias de segundos.
- **SUGESTÃO:** em leitura operacional, separar perfis com menos de 5 minutos e ambos os campos de origem nulos como `pending_attribution`; o placar histórico permanece canônico e inalterado. Confirmar em coorte futura se todo `pending_attribution` estabiliza ou se existem nulos persistentes.
- **TESTADO LOCALMENTE — 04/09/2026:** não houve código de produto a testar. O `npx tsc --noEmit` exigido encontrou o stub incorreto porque `.bin` continua incompleto nesta worktree; o compilador real `node node_modules/typescript/bin/tsc --noEmit` e `git diff --check` são os gates antes da integração.
- **FATO CONFIRMADO:** nenhum produto, preço, oferta, Stripe, banco, migration, e-mail, mensagem, crédito, arquivo Claude ou arquivo CAIXA foi alterado nesta rodada.

### PEDIDOS

- **FATO CONFIRMADO:** nenhum pedido foi baixado, alterado ou criado. O pedido do Guardião aberto na R14 permanece com a pista dona.

## PRÓXIMA JOGADA

- **SUGESTÃO:** a R16 é a rodada de medição pura obrigatória. Medir R13–R15 sem atribuir efeito causal sem amostra: falhas OAuth com trabalho salvo, recuperações de senha com trabalho salvo, estabilização de origem e o desfecho da pessoa que recebeu o primeiro filme às 11:00 BRT.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **FATO CONFIRMADO:** a origem não foi sobrescrita; o código só preenche campo vazio e o incidente é compatível com leitura antes da gravação assíncrona.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:05 BRT:** a pessoa viva finalmente recebeu o primeiro filme, elevando o placar para 23 pessoas com filme e movendo seu checkout para o balde com filme; ainda não pagou.
- **DECISÃO — NÃO EXECUTAR:** nenhuma mudança de produto foi fabricada; a R16 remede o efeito real das entregas recentes.

---

## Rodada 16 — medição pura de R13→R15 — 04/09 11:22→11:27 BRT — CONCLUÍDA

- **DECISÃO APROVADA:** esta foi a rodada de medição pura obrigatória; nenhum comportamento do produto foi alterado. Fonte: `docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md:160-162,430-431` e próxima jogada da Rodada 15 neste handoff.
- **FATO CONFIRMADO:** as duas prioridades antigas reiteradas pela automação continuam concluídas: título legado de `/v/[id]` no SHA `96310071` e corte silencioso de 1.000 caracteres no SHA `341a119b`. Nenhum pedido aberto viável pertence à pista FLUXO. Fontes: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md:17-24,28,35-40,47-49` e Rodadas 2–3 deste handoff.

### Placar, vigia e origem

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:23:32 BRT:** desde o marco de 03/09 13:00 BRT, o placar canônico é **36 cadastros, 23 pessoas com filme, 2 checkouts com filme, 1 checkout sem filme, 0 assinaturas e 0 pessoas com falha sem filme**. Fonte: SQL canônico do programa, somente leitura no Supabase de produção, pessoas distintas e contas internas excluídas.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:23:32 BRT:** nas duas horas anteriores houve 3 cadastros externos: **ChatGPT 2 e TAAFT 1**. A janela móvel não foi somada às anteriores.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:23:32 BRT:** a mesma pessoa do vigia abriu checkout às 10:01:22 BRT, chegou a `stranded_composed` às 10:46:27 e recebeu o primeiro filme às 11:00:48; continua com 1 filme concluído, 12 créditos, 0 erro e 0 pagamento. O pedido já existente para CAIXA cobre essa pessoa e não foi duplicado.
- **RISCO DE LEITURA:** o placar canônico classifica checkout pelo estado atual da pessoa, não pelo estado no instante do checkout. Por isso a mesma pessoa pode migrar do balde “sem filme” para “com filme”; essa mudança de balde não é um novo checkout.

### O que R9→R15 permite medir agora

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:25:43 BRT:** desde os deploys correspondentes houve **0 eventos, 0 sessões e 0 pessoas** em `example_remix_topic_submitted` após R9 e em `free_script_to_signup_clicked` após R10. Portanto as confirmações de trabalho de R9/R10 continuam sem exposição mensurável e não existe coorte de entrada para ligar a cadastro, primeiro filme, checkout ou assinatura.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:25:43 BRT:** desde o deploy de R13 houve **0 eventos** `auth_callback_failed`; logo o ramo de recuperação de trabalho após falha OAuth continua sem amostra observável. Zero exposição observada não prova melhora nem piora.
- **QUESTÃO PENDENTE / DESCONHECIDO:** R14 não criou evento próprio, e `auth.audit_log_entries` retornou zero linhas tanto após o deploy quanto na janela de 24 horas. Como esse audit log não registrou nem os demais fluxos reais de autenticação da janela, ele não é uma fonte válida para dimensionar recuperação de senha; volume e efeito causal de R14 seguem desconhecidos.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:25:43 BRT:** desde R13 nasceu 1 perfil externo; após cinco minutos havia **0 perfis** com `signup_utm_source` e `utm_source` ambos nulos e também 0 perfis ainda dentro da janela pendente de cinco minutos. Esta amostra única é compatível com estabilização do first-touch, mas é insuficiente para generalizar.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:25:43 BRT:** no recorte agregado iniciado às 02:43 BRT houve 91 sessões em `landing_session_started`, 9 pessoas externas em callback concluído, 6 em signup por e-mail, 12 em `generate_arrived_server`, 5 em `video_generation_completed`, 1 em checkout e 0 em sucesso de checkout. Esses totais pertencem a um recorte operacional amplo, não são uma coorte causal de R9–R15 e não devem ser encadeados como conversão.

### Decisão, escopo e gate

- **DECISÃO — NÃO EXECUTAR:** não fabricar mudança de produto a partir de zeros e amostras unitárias. R13 e R14 continuam implementados e validados tecnicamente, mas sem exposição mensurável suficiente para alegar impacto em filme, checkout ou assinatura.
- **TESTADO LOCALMENTE — 04/09/2026 11:27 BRT:** não houve código de produto a testar. O comando literal `npx tsc --noEmit` encontrou novamente o pacote-stub incorreto nesta worktree; o compilador real `node node_modules/typescript/bin/tsc --noEmit` e `git diff --check` saíram com código 0.
- **FATO CONFIRMADO:** nenhum código de produto, preço, oferta, Stripe, banco, migration, e-mail, mensagem, crédito, dashboard/Claude ou arquivo CAIXA foi alterado nesta rodada. A única alteração é este registro documental.
- **FATO CONFIRMADO:** nenhum pedido foi baixado, alterado ou criado; o pedido do Guardião da R14 continua com a pista dona.

## PRÓXIMA JOGADA

- **SUGESTÃO:** na R17, auditar o caminho de entrada visível da conta TAAFT observada nesta janela e agir somente se houver uma lacuna confirmada numa superfície FLUXO atualmente pública. Não iniciar K19 em `/v/[id]` sem antes confirmar que a experiência anônima está realmente habilitada; ausência de superfície viva não autoriza copy ou fluxo novo.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:23 BRT:** o placar chegou a 36 cadastros e 23 pessoas com filme, com 2 checkouts com filme, 1 sem filme e 0 assinaturas; a pessoa acompanhada recebeu o primeiro filme, mas continua sem pagamento.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:25 BRT:** R9/R10 seguem sem eventos de entrada, R13 segue sem falha OAuth pós-deploy e R14 não tem telemetria válida para dimensionar a ramificação. Nenhum efeito causal foi atribuído.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:25 BRT:** a origem recente foi 2 ChatGPT + 1 TAAFT; o único perfil pós-R13 não permaneceu sem origem após cinco minutos.
- **DECISÃO — NÃO EXECUTAR:** a reserva de medição pura foi respeitada; não houve mudança de produto nem expansão de escopo.

---

## Rodada 17 — auditoria da entrada TAAFT viva — 04/09 11:42→11:49 BRT — PIVOTAR PARA CLAUDE

- **FATO CONFIRMADO:** as prioridades antigas de `/v/[id]` e do corte de 1.000 caracteres continuam concluídas nos SHAs `96310071` e `341a119b`. Os pedidos abertos restantes pertencem a dashboard/Claude ou CAIXA; não há pedido aberto viável na pista FLUXO. Fonte: `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md` lido integralmente nesta rodada.
- **FATO CONFIRMADO:** a entrada pública TAAFT já tem uma superfície viva: `homeReferralBridgeSource()` reconhece UTM e referrer pelo ledger canônico; a home anônima troca headline, ancora CTAs no teste e entrega roteiro antes do cadastro; o handoff preserva a origem. Fontes: `lib/growth/homeReferralBridge.ts:1-49`, `app/page.tsx:78-88`, `app/KineoLanding.tsx:811-819,1093-1113` e `app/HomeTopicForm.tsx:106-289`.
- **DECISÃO — NÃO EXECUTAR:** não criar outro banner ou reescrever a home. A superfície FLUXO existente foi usada por uma pessoa real nesta janela e a segunda pessoa também chegou à criação; o problema observado começa depois do handoff, em arquivos da pista Claude.

### Pessoas TAAFT e decisão de ownership

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:47:02 BRT:** houve 7 sessões TAAFT na home nas duas horas anteriores. Uma submeteu tema às 11:18:38, recebeu roteiro às 11:18:41, clicou cadastro às 11:19:04 e criou conta às 11:19:13. A cadeia pública FLUXO funcionou ponta a ponta até `/studio/create`.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:47:02 BRT:** essa primeira pessoa iniciou `generate_started`/`video_generation_started` às 11:20:10 e chegou a `activation_autostart_waiting`, mas 26 minutos e 52 segundos depois continuava com 25 créditos, 0 `render_jobs`, 0 filmes, 0 `generation_stage_error` e nenhum evento novo desde 11:20:44. O nome do evento não prova que o servidor despachou um render; o estado persistido diz que ainda não nasceu job.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:47:02 BRT:** a segunda pessoa TAAFT criou conta às 11:39:51, chegou a `/studio/create`, iniciou geração às 11:42:18 e tinha 12 créditos, 0 job, 0 filme e 0 erro no corte; como haviam passado menos de cinco minutos e existia débito, ela permanece **EM VOO**, não é classificada como defeito.
- **DECISÃO — PIVOTAR PARA CLAUDE:** foi aberto um único pedido, sem identificador pessoal, para investigar apenas a primeira cadeia após `video_generation_started`. `GenerateClient`, compose, jobs e créditos são da pista Claude; editar um banner FLUXO não faria nascer o render e mascararia o defeito real.

### Placar, vigia e risco

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:47:02 BRT:** placar canônico desde 03/09 13:00 BRT: **37 cadastros, 23 pessoas com filme, 2 checkouts com filme, 1 sem filme, 0 assinaturas e 0 pessoas com falha sem filme**. Fonte: SQL canônico do programa, somente leitura no Supabase de produção, pessoas distintas e contas internas excluídas.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:47:02 BRT:** nas duas horas anteriores houve 4 cadastros externos: **ChatGPT 2 e TAAFT 2**. A janela móvel não foi somada às anteriores.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:43:59 BRT:** o vigia encontrou 1 pessoa sem sucesso de checkout: a mesma conta ChatGPT já acompanhada, agora com 1 filme, 12 créditos, 0 erro e 0 pagamento. Nenhum pedido foi duplicado porque CAIXA já acompanha essa pessoa.
- **RISCO:** `video_generation_started` é emitido antes de existir `render_jobs`; tratá-lo como render realmente despachado esconderia este silêncio. Por outro lado, classificar a segunda pessoa como falha antes da janela normal produziria alarme falso. As duas foram mantidas separadas.
- **TESTADO LOCALMENTE — 04/09/2026 11:49 BRT:** não houve código de produto a testar. `git diff --check` e o compilador real `node node_modules/typescript/bin/tsc --noEmit` saíram com código 0; o comando literal `npx tsc --noEmit` encontrou novamente o pacote-stub incorreto preexistente nesta worktree.
- **FATO CONFIRMADO:** nenhum produto, preço, oferta, Stripe, banco, migration, e-mail, mensagem externa, crédito, arquivo de código Claude ou arquivo CAIXA foi alterado. Somente os dois handoffs compartilhados foram atualizados.

## PRÓXIMA JOGADA

- **SUGESTÃO:** na R18, remedir separadamente as duas pessoas TAAFT. Se a segunda entregar e a primeira continuar sem job/erro, preservar a home e acompanhar o pedido Claude; se aparecer falha numa superfície FLUXO antes do cadastro, corrigir somente esse ponto público comprovado. Não criar banner sem novo dado.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:47 BRT:** duas contas TAAFT chegaram e iniciaram geração; uma delas usou comprovadamente o roteiro gratuito da home antes do cadastro.
- **CONTRADIÇÃO DE ESTADO:** a primeira registra “generation started”, mas após quase 27 minutos não tem job, filme, erro nem débito; a segunda ainda está em voo dentro da janela normal.
- **DECISÃO — PIVOTAR PARA CLAUDE:** a entrada FLUXO funcionou e ficou congelada; um pedido objetivo foi aberto para a pista que possui o trecho onde a primeira cadeia parou.

---

## Rodada 18 — TAAFT começa pelo Kineo 1 — 04/09 12:02→12:09 BRT — IMPLEMENTADA

- **NOVA:** esta rodada altera pela primeira vez o motor do primeiro filme somente no bridge TAAFT; não repete a auditoria da R17, não cria página, banner ou copy e não toca ChatGPT, checkout ou gerador.
- **CONTRADIÇÃO:** o programa aprovado em 03/09 manda `utm_source=taaft` para “Kineo 1 padrão” (`docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md:106-111`), mas a home ainda enviava `create_intent=trial_best`, contrato que escolhe Seedance para teste ativo com 25 créditos (`app/HomeTopicForm.tsx` antes de `0b664621`; `lib/growth/trialActivationIntent.ts:9-29`).
- **IMPLEMENTADO:** `homeReferralCreationIntent()` agora resolve somente `taaft → fast`; ChatGPT, origem nula e tráfego geral continuam em `trial_best`. `HomeTopicForm` reutiliza essa decisão no CTA pós-roteiro, no caminho de erro e no fallback nativo sem JavaScript, evitando bifurcação silenciosa entre os três caminhos. Fontes: `lib/growth/homeReferralBridge.ts` e `app/HomeTopicForm.tsx`, commit funcional `0b66462127c6bb78d24c0832148ea83caf18a0a2`.

### Evidência, placar e vigia

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 12:03:25 BRT:** placar canônico desde 03/09 13:00 BRT: **37 cadastros, 23 pessoas com filme, 2 checkouts com filme, 1 sem filme, 0 assinaturas e 1 pessoa com falha sem filme**. Fonte: SQL canônico somente leitura no Supabase de produção, pessoas distintas e contas internas excluídas.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 12:03:25 BRT:** nas duas horas anteriores houve 3 cadastros externos: **TAAFT 2 e ChatGPT 1**. A janela móvel não foi somada às anteriores.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 12:03:25 BRT:** o vigia obrigatório de checkout ficou vazio; o checkout observado na rodada anterior saiu da janela móvel de duas horas. Zero pessoa no recorte não significa pagamento nem resolução.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 12:03:25 BRT:** a primeira pessoa TAAFT continua com 25 créditos, 0 jobs, 0 filmes e 0 erros; seu último estado foi `activation_autostart_waiting(reason=server_claim_settling)` às 11:20:28. A segunda passou de “em voo” para 1 `render_job`, 12 créditos e 2 `generation_stage_error(reason=cinematic_gate_credits_held)`, seguidos por rechecks de saldo até 12:02:58; continua com 0 filme e 0 pagamento.
- **FATO CONFIRMADO:** ambas pediram Seedance. Na primeira, o roteiro gratuito da home e o CTA foram comprovados; na segunda, a origem TAAFT e o contrato Seedance foram comprovados, mas **DESCONHECIDO** se ela usou exatamente o formulário da home. A correção não é apresentada como reparo retroativo dessas duas contas.

### Causa, medição e limites

- **HIPÓTESE:** para a próxima pessoa que chegar pelo bridge TAAFT, Kineo 1 remove a passagem observada pelo claim premium e aumenta a chance de chegar ao primeiro filme; isto ainda não prova checkout ou assinatura.
- **MEDIÇÃO:** por pessoa externa com origem TAAFT e exposição posterior ao deploy, acompanhar `home_free_script_cta_clicked → activation_autostart_eligible(engine=fast) → video_generation_completed → checkout_started → payment_success`. Gate de sucesso inicial: primeiro filme sem `server_claim_settling` prolongado nem `cinematic_gate_credits_held`; placar final continua pagamento/assinatura.
- **GATE DE PARADA/REVERTER:** se TAAFT pós-deploy não preservar o roteiro, não resolver `engine=fast`, ou piorar entrega frente à coorte anterior, reverter o override. ChatGPT e origem geral ficam controle estável.
- **RISCO:** a amostra viva é de duas pessoas e as falhas pertencem ao pipeline Claude; por isso o pedido das 11:47 e a atualização das 12:05 continuam abertos e não foram duplicados. A mudança previne a mesma seleção premium em novos handoffs TAAFT, mas não conserta job, compose ou crédito existente.
- **TESTADO LOCALMENTE — 04/09/2026 12:07 BRT:** `node scripts/test-home-referral-bridge.mjs` passou **71/71**; `node scripts/test-trial-best-activation.mjs` passou **27/27**; `node node_modules/typescript/bin/tsc --noEmit --pretty false` e `git -c core.whitespace=cr-at-eol diff --check` saíram com código 0. O comando literal `npx tsc --noEmit --pretty false` encontrou o pacote-stub incorreto preexistente nesta worktree.
- **FATO CONFIRMADO:** nenhum preço, oferta, Stripe, banco, migration, e-mail, mensagem externa, crédito, arquivo dashboard/Claude ou arquivo CAIXA foi alterado.

## PRÓXIMA JOGADA

- **SUGESTÃO:** após o deploy, esperar uma nova pessoa TAAFT exposta, confirmar `engine=fast` e seguir sua cadeia até filme/checkout/pagamento. Sem exposição nova, retomar a ordem do programa por F3+K20, sem tratar zero amostra como resultado.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada agora. Os dois casos antigos continuam com Claude pelos pedidos já abertos; a mudança vale para novas entradas TAAFT.

## 📋 O QUE ACONTECEU

- **EVIDÊNCIA DE PRODUÇÃO:** duas pessoas TAAFT escolheram Seedance e nenhuma tinha filme às 12:03 BRT; uma ficou silenciosa antes do job e a outra caiu em crédito retido.
- **IMPLEMENTADO:** o bridge TAAFT passa o roteiro ao Kineo 1; ChatGPT e tráfego geral não mudam.
- **TESTADO LOCALMENTE:** 98 verificações direcionadas e o TypeScript real passaram; nenhum write de produção foi feito.

### Integração e produção

- **VALIDADO EM PRODUÇÃO — 04/09/2026 12:13 BRT:** PR #19 passou no Guardião no SHA integrado `457ed9fab0bca0a21fd2d21b468680c618a97bd0`; os jobs `TypeScript (mede primeiro, bloqueia depois)` e `Suíte de testes (mede, ainda não bloqueia)` concluíram `success` após reconciliação limpa com `origin/main`.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 12:13 BRT:** deploy Vercel `dpl_7vEMfycssmDb3x3pfYkDvXSA6AHs` chegou a `READY`, target `production`, framework Next.js e aliases incluindo `www.usekineo.com`, ligado ao SHA exato `457ed9fa`. GET público com cache-busting em `/?utm_source=taaft` respondeu 200, manteve canonical de produção, exibiu a ponte TAAFT e não trouxe `noindex`. A Vercel retornou zero erro de runtime para `/` e zero log `error|fatal` do deploy nos 15 minutos consultados.

---

## Rodada 19 — pacote factual do listing TAAFT — 04/09 12:23→12:34 BRT — IMPLEMENTADA

- **NOVA:** `docs/TAAFT-LISTING-2026-09-03.md`, exigido por F3+K20, não existia. Os documentos TAAFT encontrados eram relatórios históricos de 08/08; nenhum continha a ficha atual pronta para colar mais as três capturas pedidas.
- **DECISÃO APROVADA:** após F2, a ordem FLUXO manda executar F3+K20; ações que só o fundador pode concluir devem chegar com o material pronto, sem esperar. Fonte: `docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md:280-284,385-389,471-487`.
- **CONTRADIÇÃO:** F3 ainda prescrevia “50cr grátis” e “6 engines”, mas o código atual define 25 créditos e oito motores públicos. O pacote segue `lib/freeTierOffer.ts:144-150`, `lib/reverseTrial.ts:100-140`, `lib/engineLaunch.ts:20-24` e `lib/checkoutPricing.ts:49-98`; nenhuma oferta foi mudada.

### Entrega e validação

- **IMPLEMENTADO:** a nova ficha pronta para colar contém name, tagline, descrições curta/longa, pricing, URL com atribuição TAAFT, categorias e bullets. A copy informa 25 créditos, oito motores, trial com marca d’água e planos a partir de $7 USD, sem prometer que os 25 créditos compram qualquer motor caro.
- **IMPLEMENTADO:** K20 ganhou três instruções exatas de captura: home real com quatro previews em movimento; Studio/Seedance com custo no botão sem clicar em Generate; e History com filme já concluído + download, sempre sem dado pessoal e sem gastar crédito.
- **QUESTÃO PENDENTE / DESCONHECIDO:** a ficha pública do TAAFT respondeu HTTP 403 à leitura automatizada em 04/09. A redação velha foi comprovada em 08/08, não reconfirmada hoje; por isso o pacote corrige o material sem afirmar que o painel atual ainda mostra exatamente os mesmos campos.
- **TESTADO LOCALMENTE — 04/09/2026 12:33 BRT:** `node scripts/test-taaft-listing-package.mjs` passou **25/25**, vinculando a ficha aos valores canônicos e provando presença das três URLs, dos gates e ausência das alegações antigas no bloco pronto para colar. `git -c core.whitespace=cr-at-eol diff --check` saiu com código 0.

### Placar, vigia e medição

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 12:29:57 BRT:** placar canônico desde 03/09 13:00 BRT: **39 cadastros, 24 pessoas com filme, 2 checkouts com filme, 2 sem filme, 0 assinaturas e 0 pessoas com falha sem filme**. Fonte: SQL canônico somente leitura no Supabase de produção, pessoas distintas e contas internas excluídas.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 12:29:57 BRT:** nas duas horas anteriores houve 4 cadastros externos: **TAAFT 2, ChatGPT 1 e direto 1**. A janela móvel não foi somada às anteriores.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 12:29:57 BRT:** o vigia encontrou uma pessoa externa, anonimizada `0441e46ae5`, que abriu checkout às 12:16:55 com 25 créditos, 0 filme e nenhum sinal de roteiro pronto. Sua trilha observada é apenas callback → grant → checkout em 2,6 segundos; classe **defeito**. Um pedido de acompanhamento foi aberto para CAIXA sem duplicar sua implementação já existente.
- **MEDIÇÃO:** depois que o fundador atualizar a ficha, acompanhar por pessoa externa `origem=taaft → home_free_script_succeeded → signup → video_generation_completed → checkout_started → checkout_success_viewed`. O placar final continua assinatura/pagamento; upload de imagem, impressão e cadastro não são venda.
- **GATE DE PARADA:** ficha atualizada que traz visita mas não primeiro filme não justifica comprar destaque; corrigir entrega. Filme sem pagamento em amostra madura aponta conversão/oferta, não texto da ficha.
- **RISCO:** a atualização depende de colagem e capturas manuais no painel do TAAFT. Esta tarefa não acessou o painel, não enviou conteúdo, não gastou crédito e não alterou preço, oferta, Stripe, banco, arquivos Claude/CAIXA ou código do produto.

## PRÓXIMA JOGADA

- **SUGESTÃO:** remedir a primeira entrada TAAFT pós-R18 para confirmar `engine=fast`; se ainda não houver exposição, seguir K5 com uma lacuna factual única no launcher ChatGPT, sem criar landing nova. F3+K20 fica congelado até o fundador publicar o pacote.

## ✅ O QUE VOCÊ PRECISA FAZER

Abrir `docs/TAAFT-LISTING-2026-09-03.md`, colar a seção 2 no painel e subir as três capturas da seção 3. Nenhum pagamento ou relançamento pago é necessário para esta atualização.

## 📋 O QUE ACONTECEU

- **IMPLEMENTADO:** a ficha TAAFT nova e o roteiro de três capturas ficaram prontos, usando 25 créditos, oito motores e $7 USD derivados do código atual.
- **EVIDÊNCIA DE PRODUÇÃO:** o placar avançou para 39 cadastros e 24 pessoas com filme, ainda com 0 assinaturas; uma pessoa direta abriu checkout quase imediatamente após o cadastro e ficou sob vigia CAIXA.
- **DECISÃO:** nenhum valor stale de F3 foi copiado e nenhuma ação externa foi executada.
