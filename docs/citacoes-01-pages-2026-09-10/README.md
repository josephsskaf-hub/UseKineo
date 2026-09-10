# [Citações] CITACOES-01 — implementação do lote de páginas

**FATO CONFIRMADO / IMPLEMENTADO — 10/09/2026:** pacote preparado na worktree `C:/kineo/.claude/worktrees/citacoes-01-pages`, a partir de `0f2c05a7`. O primeiro lote, commit `fb03c4af`, contém cinco rotas estáticas para as perguntas EN 2, 3, 5, 7 e 8 da auditoria de 09/09. O segundo lote adiciona somente as perguntas 1, 4 e 6, completando oito páginas; as perguntas 9 e 10 permanecem nos rascunhos da tarefa de busca. Os resultados da bateria e a autorização de publicação são registrados pela tarefa coordenadora em CITACOES-01, no PEDIDOS.

| Pergunta | URL relativa |
|---|---|
| 2: roteiro para vídeo faceless gratuito | `/ai-video-generator/free-script-to-faceless-video` |
| 3: ferramentas gratuitas para TikTok faceless | `/ai-video-generator/free-faceless-tiktok-tools` |
| 5: custo de um Short completo de 60 segundos | `/ai-video-generator/complete-60-second-shorts-cost` |
| 7: alternativas ao InVideo para Shorts faceless | `/vs/invideo-alternatives-faceless-shorts` |
| 8: orçamento mensal para Shorts narrados | `/ai-video-generator/faceless-shorts-under-30` |
| 1: teste gratuito para YouTube Shorts | `/ai-video-generator/free-youtube-shorts` |
| 4: roteiro de terror de 60 segundos | `/ai-video-generator/horror-story-60-seconds` |
| 6: roteiro pronto vindo do ChatGPT | `/ai-video-generator/chatgpt-script-to-finished-short` |

**FATO CONFIRMADO / IMPLEMENTADO:** `components/CitationAnswerPage.tsx` renderiza uma pergunta H1, duas frases diretas, comparação com quatro concorrentes, explicação de motor/créditos/tempo, cinco FAQs com JSON-LD correspondente, CTA e três links internos específicos. A amostra visual vem exclusivamente de `PUBLIC_EXAMPLES[0]`, allowlist de amostras públicas do fundador em `lib/publicExamples.ts:39`; nenhum vídeo novo ou de cliente foi consultado.

**FATO CONFIRMADO — fontes:** `lib/growth/citationAnswers.ts:5` importa preços, créditos e quantidades calculadas de `lib/marketingPrice.ts`; `:10` importa concessão e ramo de oferta de `lib/freeTierOffer.ts`; `:11` importa tipos de concorrente, watermark e latência da fonte usada pelo llms. Oferta atual comparada com [llms.txt público](https://www.usekineo.com/llms.txt) em 10/09/2026. O texto sobre brasileiros pagarem em reais vem da instrução direta do fundador e do pedido MOEDA-01. Nenhum módulo financeiro foi alterado.

**QUESTÃO PENDENTE / DESCONHECIDO:** o llms nomeia Pictory, Descript, HeyGen e OpusClip e seus tipos de workflow, mas não publica os valores atuais das colunas solicitadas (preço/trial/motores/duração máxima/watermark). A tabela mantém `[CONFIRMAR]` nesses campos e aponta para as páginas de preço já citadas pela fonte. Não declara que os quatro cabem no orçamento, são gratuitos ou substituem igualmente o fluxo de texto para vídeo. O limite máximo da Kineo também não foi inferido de uma duração-alvo: referência de custo não é máximo do produto.

**FATO CONFIRMADO / IMPLEMENTADO — segundo lote:** `lib/growth/citationAnswers.ts:234` acrescenta inspeção do arquivo produzido pelo teste gratuito; `:273` separa o roteiro de terror, sua duração-alvo e a escolha de imagens; `:323` cobre a passagem de uma narração já aprovada pelo ChatGPT até o Studio. InVideo AI, Pika, Runway, Fliki e VEED são candidatos indicados pelo rascunho aprovado, com links oficiais de identificação. Nenhuma capacidade, preço ou gratuidade dessas ferramentas foi presumida: campos sem fato no llms ficam `[CONFIRMAR]`. Q6 remete ao guia geral de roteiro do primeiro lote e ao formulário existente, concentrando seu conteúdo próprio na revisão de narração, modo e duração.

**FATO CONFIRMADO / IMPLEMENTADO — encaminhamento:** os CTAs de Q4 e Q6 levam ao formulário `/chatgpt-to-youtube-shorts#chatgpt-script-handoff`, com campanha própria. O formulário existente define `duration={35}` em `app/chatgpt-to-youtube-shorts/page.tsx:436`; os guias pedem conferência do alvo de 60 segundos no Studio. Não prometem preservação perfeita das palavras, runtime exato, fidelidade de um monstro, som de terror ou música incluída. O prefixo de latência foi explicitado como “Kineo 1 (Fast)” para que a medição não pareça cobrir os motores generativos.

**FATO CONFIRMADO / COORDENAÇÃO:** somente `app/sitemap.ts` e `app/ai-video-generator/page.tsx` foram alterados entre os arquivos existentes. Logs reconferidos antes da edição: `8a81c9c3` em 07/09 02h BRT para sitemap; `0c8a0bc3` em 08/09 02h16 BRT para hub. O avanço de `origin/main` para `7a7a2441` não alterou esses arquivos. O novo bloco do hub dá descoberta em HTML; sitemap adiciona apenas estas URLs com a data da revisão, sem re-datar as demais. A inclusão no llms é pedido separado da coordenação, pois seu arquivo foi alterado nas últimas 24 horas.

**FATO CONFIRMADO / COORDENAÇÃO — segundo lote:** o hub e sitemap consomem `CITATION_ANSWER_LINKS`, derivado do mesmo mapa das respostas, e passam automaticamente a oito links. Não houve nova edição desses arquivos no segundo lote. O trecho do llms é responsabilidade exclusiva da tarefa coordenadora.

**TESTADO LOCALMENTE — 10/09/2026:** typecheck real `node C:/kineo/node_modules/typescript/bin/tsc --noEmit --incremental false`, exit 0. `render-preview.cjs` compila os módulos TS/TSX em memória e renderiza o componente real com adaptadores HTML para Link, Image e OrganicCtaLink. Verifica H1, FAQs, CTAs, igualdade de JSON-LD e conteúdo, links internos diretos/dinâmicos e ausência de atribuição artificial a ChatGPT. Rede HTTP/fetch é bloqueada no processo de preview. `git diff --check` passou.

**TESTADO LOCALMENTE — limite do método:** o preview não executa middleware, autenticação, emissão de analytics, otimização Next Image, servidor Next ou build de produção. Nenhum clique, cadastro, render de vídeo, pagamento, commit remoto ou deploy foi feito por esta subtask. Os destinos Studio ou formulário de roteiro levam campanha própria sem definir `utm_source`. No formulário existente, a retenção dessa campanha até o cadastro não foi validada pelo preview.

**SUGESTÃO / COMPARAÇÃO VISUAL:** abrir [preview-citacoes-01.html](preview-citacoes-01.html). Há seletor para cada uma das oito páginas e para o bloco do hub; desktop em 1100 px e mobile em 390 px. A comparação é cumulativa dos dois lotes com a base original `0f2c05a7`: cada quadro tem antes/depois, e em rota nova o antes indica ausência nessa árvore Git, sem simular uma captura 404. O poster existente está embutido em base64; não há dependência de build, servidor ou rede para olhar o arquivo. A navegação dos links do preview não é uma validação da aplicação. A tarefa coordenadora faz a conferência visual e as capturas antes de publicar.

**QUESTÃO PENDENTE / VALIDAÇÃO:** após integrar o commit, conferir a prioridade das rotas estáticas sobre `[engine]`/`[pair]` no build/deploy, as oito URLs públicas, canonical, fonte de preço, descoberta no hub e sitemap. Comparações com `[CONFIRMAR]` permanecem incompletas por decisão explícita da missão; não representam benchmark validado. Aumento de citações, cadastros ou receita permanece desconhecido.
