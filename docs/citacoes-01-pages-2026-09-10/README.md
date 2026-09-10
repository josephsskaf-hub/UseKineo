# [Citações] CITACOES-01 — implementação do lote de páginas

**FATO CONFIRMADO / IMPLEMENTADO — 10/09/2026:** pacote preparado na worktree `C:/kineo/.claude/worktrees/citacoes-01-pages`, a partir de `0f2c05a7`. Cinco rotas estáticas novas respondem às perguntas EN 2, 3, 5, 7 e 8 da auditoria de 09/09. A seleção é da missão do fundador; os resultados da nova bateria são registrados pela tarefa coordenadora em CITACOES-01, no PEDIDOS.

| Pergunta | URL relativa |
|---|---|
| 2: roteiro para vídeo faceless gratuito | `/ai-video-generator/free-script-to-faceless-video` |
| 3: ferramentas gratuitas para TikTok faceless | `/ai-video-generator/free-faceless-tiktok-tools` |
| 5: custo de um Short completo de 60 segundos | `/ai-video-generator/complete-60-second-shorts-cost` |
| 7: alternativas ao InVideo para Shorts faceless | `/vs/invideo-alternatives-faceless-shorts` |
| 8: orçamento mensal para Shorts narrados | `/ai-video-generator/faceless-shorts-under-30` |

**FATO CONFIRMADO / IMPLEMENTADO:** `components/CitationAnswerPage.tsx` renderiza uma pergunta H1, duas frases diretas, comparação com quatro concorrentes, explicação de motor/créditos/tempo, cinco FAQs com JSON-LD correspondente, CTA e três links internos específicos. A amostra visual vem exclusivamente de `PUBLIC_EXAMPLES[0]`, allowlist de amostras públicas do fundador em `lib/publicExamples.ts:39`; nenhum vídeo novo ou de cliente foi consultado.

**FATO CONFIRMADO — fontes:** `lib/growth/citationAnswers.ts:5` importa preços, créditos e quantidades calculadas de `lib/marketingPrice.ts`; `:10` importa concessão e ramo de oferta de `lib/freeTierOffer.ts`; `:11` importa tipos de concorrente, watermark e latência da fonte usada pelo llms. Oferta atual comparada com [llms.txt público](https://www.usekineo.com/llms.txt) em 10/09/2026. O texto sobre brasileiros pagarem em reais vem da instrução direta do fundador e do pedido MOEDA-01. Nenhum módulo financeiro foi alterado.

**QUESTÃO PENDENTE / DESCONHECIDO:** o llms nomeia Pictory, Descript, HeyGen e OpusClip e seus tipos de workflow, mas não publica os valores atuais das colunas solicitadas (preço/trial/motores/duração máxima/watermark). A tabela mantém `[CONFIRMAR]` nesses campos e aponta para as páginas de preço já citadas pela fonte. Não declara que os quatro cabem no orçamento, são gratuitos ou substituem igualmente o fluxo de texto para vídeo. O limite máximo da Kineo também não foi inferido de uma duração-alvo: referência de custo não é máximo do produto.

**FATO CONFIRMADO / COORDENAÇÃO:** somente `app/sitemap.ts` e `app/ai-video-generator/page.tsx` foram alterados entre os arquivos existentes. Logs reconferidos antes da edição: `8a81c9c3` em 07/09 02h BRT para sitemap; `0c8a0bc3` em 08/09 02h16 BRT para hub. O avanço de `origin/main` para `7a7a2441` não alterou esses arquivos. O novo bloco do hub dá descoberta em HTML; sitemap adiciona apenas estas URLs com a data da revisão, sem re-datar as demais. A inclusão no llms é pedido separado da coordenação, pois seu arquivo foi alterado nas últimas 24 horas.

**TESTADO LOCALMENTE — 10/09/2026:** typecheck real `node C:/kineo/node_modules/typescript/bin/tsc --noEmit --incremental false`, exit 0. `render-preview.cjs` compila os módulos TS/TSX em memória e renderiza o componente real com adaptadores HTML para Link, Image e OrganicCtaLink. Verifica H1, FAQs, CTAs, igualdade de JSON-LD e conteúdo, links internos diretos/dinâmicos e ausência de atribuição artificial a ChatGPT. Rede HTTP/fetch é bloqueada no processo de preview. `git diff --check` passou.

**TESTADO LOCALMENTE — limite do método:** o preview não executa middleware, autenticação, emissão de analytics, otimização Next Image, servidor Next ou build de produção. Nenhum clique, cadastro, render de vídeo, pagamento, commit remoto ou deploy foi feito por esta subtask. Os links de signup levam a campanha própria no destino Studio sem definir `utm_source`, preservando a origem observada.

**SUGESTÃO / COMPARAÇÃO VISUAL:** abrir [preview-citacoes-01.html](preview-citacoes-01.html). Há seletor para cada uma das cinco páginas e para o bloco do hub; desktop em 1100 px e mobile em 390 px. Cada quadro tem antes/depois; em rota nova o antes indica ausência na árvore Git, sem simular uma captura 404. O poster existente está embutido em base64; não há dependência de build, servidor ou rede para olhar o arquivo. A navegação dos links do preview não é uma validação da aplicação. A tarefa coordenadora faz a conferência visual e as capturas antes de publicar.

**QUESTÃO PENDENTE / VALIDAÇÃO:** após integrar o commit, conferir a prioridade das rotas estáticas sobre `[engine]`/`[pair]` no build/deploy, as cinco URLs públicas, canonical, fonte de preço, descoberta no hub e sitemap. Comparações com `[CONFIRMAR]` permanecem incompletas por decisão explícita da missão; não representam benchmark validado. Aumento de citações, cadastros ou receita permanece desconhecido.
