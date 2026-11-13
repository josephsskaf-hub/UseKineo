# Medição dos oito guias — 10/11/2026

DECISÃO APROVADA — pedido direto do CEO nesta conversa: primeiro lote somente de medição, sem texto ou layout. Publicação autônoma autorizada; conferir fila e não publicar commits pendentes de outras sessões. A autorização substitui a espera pelo clique do fundador para este lote. As oito páginas são os oito guias publicados identificados no relatório do Dia 1, definidos por `MEASURED_GUIDE_PATHS` em `lib/seo/guideEngagement.ts`.

## Contrato

IMPLEMENTADO — `GuideEngagementTracker` retorna `null`; o molde existente o monta sem elemento visível novo. O coletor continua `trackEvent` → `/api/events`, com sessão e atribuição existentes e os rótulos de bot emitidos pelo servidor. Nenhum endpoint, schema, formulário, oferta, texto, href, CSS, metadata ou sitemap é alterado. O evento `organic_cta_clicked` anterior continua existindo e não deve ser somado ao novo evento de primeiro clique.

|Evento|Unidade e significado|
|---|---|
|`guide_page_viewed`|Uma tentativa de registro por visita hidratada com documento visível e foco; denominador da medição, não prova de pessoa distinta.|
|`guide_scroll_depth`|25/50/75/100% do percurso rolável do documento, uma vez por marco por visita. Topo=0; fundo (tolerância 2px)=100. Página sem percurso rolável não ganha os quatro marcos. Saltar ao fundo registra os marcos alcançados; não comprova leitura de cada trecho.|
|`guide_visible_time`|Milissegundos cumulativos com documento visível e foco. Pausa quando oculto/sem foco; snapshots aos 15/30/60/120/300/600/1200/1800 s e ao ocultar/sair/desmontar. Agregar `MAX(visible_ms)` por visita, nunca somar snapshots. Tempo visível não comprova atenção ou compreensão.|
|`guide_first_cta_clicked`|Primeiro clique confiável da visita no CTA primário do hero (`.kc-hero .kc-cta`), inclusive em seu filho; ignora navegação, CTA de fechamento e cliques sintéticos. Não bloqueia nem altera o destino.|

FATO CONFIRMADO — Todos recebem `measurement_version=guides_20261110_v1`, `visit_id` efêmero da visita, `source=guide_<slug>`, `visible_ms` e o caminho separado. Sem texto lido, prompt, valores de formulário ou query string do destino. O coletor mantém os parâmetros de aquisição que já preservava; não se força `utm_source=chatgpt` nem `seo`.

FATO CONFIRMADO — `WeakMap` por raiz DOM conserva a visita no replay de efeitos do React; uma montagem real nova gera outra visita. Volta do BFCache conserva a visita e exclui o intervalo ausente. A saída limpa listeners e timer. `trackEvent` usa `keepalive`; falha de rede/armazenamento continua sendo dado perdido, sem bloquear a página ou fabricar sucesso. Navegação antes da hidratação, navegador encerrado abruptamente e bloqueadores podem deixar tempo incompleto ou visita ausente.

## Janela e leitura

SUGESTÃO — Iniciar a janela no instante READY do deploy de produção cujo SHA contém apenas este lote sobre a main já pública; registrar esse instante e o SHA no diário local. Ler após 48 horas completas. Não alterar conteúdo destas páginas nem fazer outra renovação de conteúdo desta missão durante a coleta inicial. O prazo sozinho não assegura amostra suficiente nem identifica causa.

FATO CONFIRMADO — Oito caminhos, todos em `/guides/`:

- ai-product-video-accuracy
- ai-dropshipping-video-ads
- ai-personal-care-product-ads
- ai-clothing-brand-video
- ai-tech-product-ads
- elevenlabs-alternatives-narrated-video
- multilingual-video-narration
- weekly-video-ads-approval

SUGESTÃO — Na leitura, selecionar a versão e o corte de deploy, excluir `metadata.is_bot=true`, contas internas de `lib/internalAccounts.ts` e sessões reconhecidamente ligadas a internos. Atribuir origem pelo evento de aquisição da mesma sessão, sem converter `source=guide_*` em origem. Separar ChatGPT, Google, outras e desconhecidas. Manter anônimos separados de contas e não chamar `visit_id` ou `session_id` de pessoa. Usar apenas visitas com `guide_page_viewed` na janela; eventos sem denominador ficam à parte como incompletos. Para cada caminho mostrar n de visitas, sessões e contas externas observadas; alcance dos quatro marcos; clique inicial/visita; mediana de MAX(visible_ms) por visita; ausências de tempo separadas de tempo zero. Deduplicar marcos/cliques por visita na leitura mesmo com a proteção do browser.

HIPÓTESE — Pouco tempo e pouco alcance de 25% podem apontar perda na entrada. Alcance alto e pouco CTA inicial podem indicar leitura comparativa, CTA inadequado ou retorno posterior; não provam defeito no fim do artigo. Oito páginas têm públicos diferentes: não agregar como um único experimento causal. Reportar amostra pequena e medições incompletas. Pagamento só com vínculo canônico, fora destes eventos de leitura.

## Verificação

TESTADO LOCALMENTE — `scripts/test-guide-engagement-1011.mjs` executa o código real em ambiente sem rede: marcos únicos; CTA correto; relógio oculto/sem foco; visita em aba oculta; cleanup; replay; BFCache; página curta; exclusão fora da coorte; payload limitado; erro do coletor. Quatro mutantes devem falhar. O teste compara HTML completo e metadata dos oito guias com a base `dc39b556126392a802116bb3f43f8ea65b5542a6`, incluindo textos, CSS, JSON-LD, hrefs e a estrutura. Não posta eventos de QA em produção.

QUESTÃO PENDENTE — O status de publicação e a primeira ingestão real pertencem ao diário local. Código aprovado em teste não é prova de evento recebido no banco.

## Correção de rolagem — 13/11/2026

FATO CONFIRMADO — A v1 observava somente window.scrollY e o scroll da janela. O CSS global combina height:100% em html/body com overflow-x:hidden no celular. Quando body é um contêiner de rolagem independente, a janela pode continuar em zero e os marcos da v1 ficar ausentes. A hipótese surgiu da conferência da Divisão 1 de 13/11 e foi reproduzida contra a base exata bd85389d3 com DOM/eventos simulados, sem navegador nem rede. Fontes: app/globals.css, lib/seo/guideEngagement.ts; https://developer.mozilla.org/en-US/docs/Web/API/Element/scroll_event e https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener, consultadas em 13/11.

IMPLEMENTADO — Versão guides_20261113_v2. A profundidade usa scrollTop, scrollHeight e clientHeight do body quando ele tem overflow vertical auto/scroll e percurso próprio. Nos demais casos, conserva o caminho de rolagem do documento. Um listener em captura observa apenas body/html; rolagem interna de tabelas não conta como profundidade da página. O dono da rolagem é reavaliado após resize e cada amostragem, sem mudar CSS. O listener é retirado com a mesma opção de captura. Eventos de profundidade incluem scroll_root=body ou document; os demais campos e eventos continuam iguais.

TESTADO LOCALMENTE — test-guide-body-scroll-1311.mjs cobre body com janela em zero, documento, tabela interna, viewport menor no body, posição restaurada, troca de modo no resize, página curta, body como scrollingElement e limpeza. A base precisa falhar nesse cenário; três mutantes rejeitam perda do listener, altura errada e listener órfão. O guardião de 10/11 mantém os testes de coorte, CTA, tempo, replay/BFCache e igualdade integral de HTML/metadata dos oito guias; só a expectativa da versão muda.

LIMITE DE LEITURA — Preservar o intervalo inicial e seus dados v1; não preencher profundidades ausentes nem recalcular retroativamente. A leitura inicial continua inconclusiva e agora registra essa limitação adicional de cobertura móvel. O defeito não demonstra a causa de nenhum tempo ausente ou a humanidade das visitas. Separar v1 e v2 em todas as consultas, com o instante READY da correção no diário. MAX(visible_ms) por visita, denominador page_view e filtros de bot/internos continuam obrigatórios. Não reiniciar a missão ou exigir nova alteração de conteúdo quando apenas o prazo transcorrer.
