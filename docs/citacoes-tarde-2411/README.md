# Citações · fila da tarde de 24/11/2026

**DECISÃO APROVADA · LOCAL / EM OBRA.** Pedido das 12:49 no quadro. Base: Crescimento af1a464db4f2af63c48193388916e1eda31cde79, sobre Formatos 6224c7846184386fe9f0372b31ae434ce30d5588 e origin/main c854849c816ba1643093681a2c815520cc5872a9. As duas branches aprovadas continuam preservadas. Esta candidata acrescenta dez ferramentas e a medida; nenhuma publicação ou gasto.

## O dado que escolheu as candidatas

**EVIDÊNCIA DE PRODUÇÃO · SELECT agregado em 24/11/2026.** Janela [2026-10-25T16:01:33.742416+00:00, 2026-11-24T16:01:33.742416+00:00), exclusiva no fim. Uma âncora landing_session_started por session_id; is_bot=false; internos excluídos pela régua canônica larga. Sessão não é pessoa e is_bot=false não prova humano. Uma conta nova entra uma única vez, na primeira sessão elegível em qualquer página/origem, vinculada por eventos com o mesmo session_id. Sessão com mais de uma conta não recebe cadastro. Perfis antigos não contam como cadastro novo. Consulta: [ORIGEM-PAGINA-30D.sql](ORIGEM-PAGINA-30D.sql), resultado completo agregado em [JSON](ORIGEM-PAGINA-30D.json).

| Página de pouso explicitamente ChatGPT | Sessões | Contas novas | 1º filme no histórico | Pagou |
|---|---:|---:|---:|---:|
| /text-to-video-shorts | 123 | 57 | 22 | 0 |
| / | 163 | 56 | 21 | 0 |
| /ai-video-generator/for/urdu | 105 | 55 | 7 | 0 |
| /free-ai-shorts/cartoon | 106 | 44 | 8 | 0 |
| /ai-video-generator/for/story-videos | 68 | 40 | 16 | 1 |
| /gerador-de-shorts-gratis | 67 | 37 | 21 | 0 |
| /free-ai-shorts/horror | 63 | 23 | 6 | 0 |
| /ai-ugc-ads | 51 | 23 | 6 | 0 |
| /state-of-ai-shorts-2026 | 33 | 8 | 2 | 0 |
| /ai-kids-cartoon-videos | 20 | 8 | 2 | 0 |
| /ai-video-generator/for/youtube-shorts | 14 | 8 | 5 | 0 |
| /ai-video-generator/for/instagram-reels | 13 | 6 | 3 | 0 |
| /ai-video-generator/seedance | 10 | 6 | 0 | 0 |
| /free-shorts-generator/de | 26 | 5 | 5 | 0 |
| /ai-video-generator/for/faceless-videos | 9 | 5 | 1 | 0 |
| /ai-video-generator/kling-4 | 7 | 5 | 0 | 0 |
| /ai-video-generator/for/documentary-shorts | 8 | 3 | 0 | 0 |
| /ai-short-film-generator | 6 | 3 | 1 | 1 |
| /ai-video-generator/for/widescreen-videos | 5 | 3 | 2 | 1 |
| /pricing | 41 | 2 | 0 | 0 |
| /best-ai-shorts-generators | 5 | 2 | 0 | 0 |
| /free-ai-shorts-generator | 3 | 1 | 1 | 0 |
| /free-ai-shorts | 1 | 1 | 0 | 0 |
| /scripts/animals | 1 | 1 | 0 | 0 |
| /scripts/psychology | 1 | 1 | 0 | 0 |
| /how-much-do-instagram-reels-pay | 53 | 0 | 0 | 0 |
| /how-much-does-tiktok-pay | 6 | 0 | 0 | 0 |
| /ai-video-generator/for/tiktok-videos | 4 | 0 | 0 | 0 |
| /free-ai-shorts/fitness | 4 | 0 | 0 | 0 |
| /library | 3 | 0 | 0 | 0 |
| /partners | 2 | 0 | 0 | 0 |
| /ai-shorts-without-filming | 1 | 0 | 0 | 0 |
| /ai-video-generator/veo/tr | 1 | 0 | 0 | 0 |
| /chatgpt | 1 | 0 | 0 | 0 |
| /effects/pet-bee | 1 | 0 | 0 | 0 |
| /generador-de-videos-de-terror | 1 | 0 | 0 | 0 |
| /login | 1 | 0 | 0 | 0 |

**FATO CONFIRMADO / LIMITE DA MEDIDA.** Origem ChatGPT exige referrer_host chatgpt.com (também www/chatgpt normalizado) ou utm_source contendo chatgpt. Sem origem gravada é outra linha; nunca ChatGPT. As classes conhecidas Bing, Google, DuckDuckGo e YouTube ficam separadas; outra_origem_gravada é um agregado residual, inadequado para alegar teste da mesma origem. Não inferimos Copilot de bing.com. O total de contas por origem desta consulta não substitui os recortes da CEO com outra janela ou atribuição do perfil.

**FATO CONFIRMADO.** Primeiro filme é o primeiro registro completed de um modo de filme no histórico, depois do cadastro e antes do corte; clip e ads_v2 ficam fora. O escritor atual insere a linha já completed após a entrega (`app/api/compose/status/[renderId]/route.ts:177` e `:213`); created_at tem default now() no banco, conferido por SELECT em 24/11. É o instante do registro no histórico, não o relógio físico do render. Modos legados sem contrato de entrega não são inferidos. Pagou é uma conta distinta com payment_success positivo do webhook Stripe real (livemode=true, paid) ou Dodo live, entre cadastro e corte; não usamos has_paid nem evento do navegador. Não é receita líquida, retenção ou MRR. Na janela, os eventos observados eram Stripe real. Os caminhos com identificadores são agrupados como /v/:id, /go/:id e equivalentes; o Git recebe só esses agregados.

## Dez ferramentas preparadas

**HIPÓTESE / PREPARADO.** O pouso existente comprova a intenção ampla, não procura pelo slug novo. As subintenções abaixo são candidatas de expansão apoiadas naquele sinal e em lacunas de página verificadas no catálogo. Não são dez demandas individuais atribuídas a compradores. O catálogo já tem páginas amplas de história, horror, alemão, português e cartoon; cada nova ferramenta restringe o trabalho, o idioma ou a revisão em vez de substituir a página ampla.

| URL nova em /ai-video-generator/for/ | Sinal existente | Diferença da ferramenta | Fonte primária da lacuna |
|---|---|---|---|
| urdu-story-videos | /ai-video-generator/for/urdu | How can I turn my Urdu kahani into a narrated video? | [Página oficial](https://makestory.video/p/urdu-story-video-maker) |
| urdu-moral-story-videos | /ai-video-generator/for/urdu | Can I make an Urdu moral story video from my own script? | [Página oficial](https://www.framecompose.com/moral-story-video-maker) |
| german-faceless-shorts | /free-shorts-generator/de | How do I make faceless Shorts with German narration? | [Página oficial](https://fliki.ai/features/ai-story-video-generator) |
| portuguese-story-shorts | /gerador-de-shorts-gratis | Can I turn my Portuguese story into a Short without recording my voice? | [Página oficial](https://makestory.video/) |
| bedtime-story-videos | /ai-kids-cartoon-videos | How can I make a gentle bedtime story video from text? | [Página oficial](https://www.framecompose.com/bedtime-story-video-maker) |
| moral-story-shorts | /free-ai-shorts/cartoon | How do I make a moral story Short with a clear lesson? | [Página oficial](https://www.framecompose.com/moral-story-video-maker) |
| scary-story-shorts | /free-ai-shorts/horror | Can I make a scary story Short from my own narration? | [Página oficial](https://slice.video/make/ai-horror-stories) |
| history-fact-shorts | /ai-video-generator/for/documentary-shorts | How can I make a history fact Short without filming? | [Página oficial](https://www.revid.ai/tools/faceless-video) |
| animal-fable-videos | /scripts/animals | Can AI make an animal fable video with narration? | [Página oficial](https://ovideo.io/resources/ai-animal-story-video) |
| cartoon-youtube-shorts | /free-ai-shorts/cartoon | How do I make a cartoon YouTube Short from text? | [Página oficial](https://fliki.ai/features/ai-story-video-generator) |

**QUESTÃO PENDENTE / DESCONHECIDO.** Não temos acesso a sessões de referência nem às citações do ChatGPT que mandam pessoas aos concorrentes. As buscas que fizemos em 24/11 são buscas do agente. Elas comprovam que páginas concorrentes respondem às intenções, não tráfego enviado pelo ChatGPT nem perguntas que geraram cadastro. Também não inventamos termos de busca a partir de roteiros privados. Essa parte específica do pedido continua sem evidência direta.

**OBSERVAÇÃO EM FONTE PRIMÁRIA / ALEGAÇÃO COMERCIAL, consulta 24/11.** [MakeStory Urdu](https://makestory.video/p/urdu-story-video-maker) oferece uma entrada específica de kahani com voz e legendas; [MakeStory](https://makestory.video/) reúne histórias em diferentes línguas. [Fliki Story](https://fliki.ai/features/ai-story-video-generator) combina ideia/roteiro, seleção de língua e cenas. [Revid Faceless](https://www.revid.ai/tools/faceless-video) mostra exemplos por uso e uma entrada de roteiro. [FrameCompose Bedtime](https://www.framecompose.com/bedtime-story-video-maker) e [Moral](https://www.framecompose.com/moral-story-video-maker) separam história calma de história com lição. [Slice Horror](https://slice.video/make/ai-horror-stories) abre com premissas específicas de suspense. [oVideo Animal](https://ovideo.io/resources/ai-animal-story-video) promete continuidade e fala de animais. Não testamos os renders nem os resultados comerciais dessas empresas. Adaptação proposta: entrada concreta e revisão do trabalho; a Kineo não herda as promessas de continuidade perfeita, diálogo sincronizado, certificação infantil, gratuidade diária ou monetização.

## Contrato do ensaio

**HIPÓTESE.** Visitante com intenção específica encontra uma ferramenta com texto original, dois modos e idioma que segue ao Studio; isso pode reduzir a ambiguidade da entrada. Métrica: contas novas distintas por página e origem, primeiro pedido concluído e pagamento confirmado. Nada nesta entrega prova aumento comercial.

**IMPLEMENTADO / LOCAL.** A chave existente CITATION_PAGES_RELEASE fica off no commit. Off e internal preservam as 129 páginas publicadas estáticas, com fallback fechado. No ensaio public, as treze URLs de intenção em rascunho entram no build: três formatos já aprovados e estas dez. Internal reescreve só os rascunhos para a rota privada, que confirma a conta da casa no servidor. A lista privada não entra no cliente. A nova entrada GET /api/citations/tool-entry mantém texto, modo e idioma do catálogo, ignora redirect/duration/create_intent adulterados, abre cadastro para visitante e Studio para autenticado. Nenhum render ou checkout é disparado pela entrada.

**RISCO CONCRETO / DEPENDÊNCIA.** A chave é compartilhada com as três páginas de formato. Não ligar public nesta candidata antes da aprovação das dez fotos pelo dono. Para publicar apenas os formatos já liberados, usar a branch Formatos aprovada, que não contém as dez páginas. A candidata nova permanece off; publicação é da CEO.

**FATO CONFIRMADO.** Motor gratuito vem de lib/freeFilmEngine.ts; nome do padrão vem de lib/seo/citacoesRotina1711.ts; preços e créditos vêm dos módulos canônicos derivados de lib/checkoutPricing.ts e da régua de custo. Exemplos de vídeo são arquivos próprios já públicos, com selo histórico preservado; não são prova do prompt novo nem da narração em outra língua. As dez entradas têm texto próprio, FAQ própria, limite de caracteres, dois modos, tabela de decisão, data e JSON-LD. As 129 anteriores conservam texto e schemas.

**SUGESTÃO / PRÓXIMO PASSO RECOMENDADO.** Kineo 3d executa o pacote local; com PODE IR, a CEO apresenta a folha conjunta ao dono. Só depois de revisão, aprovação visual e publicação haverá exposição para medir. O que pode melhorar: a sobreposição de intenções é risco de canibalização; acompanhar pousos e contas por URL e não chamar mais páginas de mais demanda. Evitar expandir outra leva sem sinal novo.


**TESTADO LOCALMENTE / RESSALVA HERDADA.** A navegação hidratada foi provada em 50 cliques reais, incluindo sessão recém-logada reutilizada em outra ferramenta e língua, sem o teste mudar destinos. O cadastro tem uma janela anterior à hidratação em que Sign in ainda aponta ao destino padrão. `app/(auth)/signup/page.tsx:343` e `:583`; blob 2a478081eeb0bcc9f510b98c94909f640b8e9661 idêntico na main, base aprovada e candidata. A prova hidratada não declara essa janela resolvida. O revisor também a reproduziu. Recomendação: o dono de Signup passar o destino inicial no HTML do servidor e testar clique antes da hidratação; nenhuma alteração compartilhada de Signup entrou nesta branch.

**TESTADO LOCALMENTE / PRIVACIDADE.** A varredura de 392 arquivos JavaScript compilados encontrou zero marcador nas entradas reais das ferramentas e zero marcador novo global. Um destinatário de alerta herdado em lib/openaiAlert.ts permanece em um chunk fora dessas entradas, byte a byte idêntico ao build aprovado (SHA-256 558a52847a9771fbf265a9cdd71603bca2b965a2bbff826b8d8e3b77c119aa9a). Não afirmamos ausência global absoluta. O guardião do grafo continua exigindo que lib/internalAccounts nunca seja alcançado pelo cliente, com seus seis mutantes intactos. Tratar o destinatário herdado em trabalho separado; nenhum endereço é listado aqui.
**EVIDÊNCIA DE PRODUÇÃO / COBERTURA FINANCEIRA.** Em SELECT de 24/11, as três subscription_invoice_paid da janela não gravavam livemode. Nenhuma pertencia a conta externa nova nas coortes desta tabela de 30 dias ou da semana 16–23/11. Não foram promovidas a pagamento real por suposição. A pauta futura precisa repetir a reconciliação de faturas e fontes desconhecidas antes de chamar uma ausência de evento confirmado de ausência de compra.
