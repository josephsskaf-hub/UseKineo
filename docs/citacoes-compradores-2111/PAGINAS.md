# Dez páginas existentes — item 2

**IMPLEMENTADO / TESTADO LOCALMENTE — 21/11/2026.** Base f9e8e26bc, código 2e0630261157f22c7bda4ae686227d3843e80ee4. Não publicado; nenhuma página nova, conta, filme, gasto ou envio a IndexNow.

**FATO CONFIRMADO:** cada alvo recebeu resposta direta no primeiro parágrafo, comparação com cabeçalhos/caption, FAQ literal visível e no mesmo FAQPage, WebPage datado e dois links internos. `lib/seo/buyerQuestions2111.ts:1` deriva preço/créditos de checkoutPricing/engineCost e o motor elegível de freeFilmEngine. `components/seo/BuyerQuestions2111.tsx:1` renderiza o texto no servidor. O sitemap seleciona somente páginas revistas em `lib/seo/paginasCitadas0511.ts`.

| Página | Parágrafos antigos retidos | Tabelas antigas retidas | Estados reais antes/depois |
|---|---:|---:|---:|
| /faceless-youtube-shorts-generator | 13/13 | 1/1 | 4 pares |
| /ai-video-generator/for/documentary-shorts | 20/20 | 0/0 | 4 pares |
| /generador-de-shorts-gratis | 13/13 | 0/0 | 4 pares |
| /ai-video-generator/for/faceless-videos | 20/20 | 0/0 | 4 pares |
| /free-ai-shorts/horror | 29/29 | 2/2 | 4 pares |
| /vs/invideo-alternatives-faceless-shorts | 22/22 | 1/1 | 4 pares |
| /gerador-de-shorts-gratis | 32/32 | 3/3 | 4 pares |
| /ai-video-generator/for/story-videos | 24/24 | 1/1 | 4 pares |
| /generador-de-videos-de-terror | 22/22 | 0/0 | 4 pares |
| /text-to-video-shorts | 53/53 | 3/3 | 4 pares |

**EVIDÊNCIA LOCAL:** 40 estados antes e 40 depois (10 URLs × claro/escuro × 1920/390), sem mocks no Next 14.2.5. 40 fotos antes e 136 depois. Zero exceções de runtime registradas. Scroll não aumentou em nenhum par. Visitante, sem autenticação, compra ou geração. Cookies recusados no controle real. Páginas antigas podem manter sua paleta própria mesmo com o tema global alterado.

**FATO CONFIRMADO / LIMITE:** as únicas normalizações de texto anterior são os nomes do motor atual em documentary-shorts/faceless-videos (Seedance 1.5 → MiniMax H3 Turbo) e no aviso do formulário ES (Fast → nome de freeFilmEngine). Descrições e tabelas históricas, atribuição de VideoObject, “faceless” e links de cadastro permanecem. O novo guardião também compara três controles fora do alvo byte a byte.

**TESTADO LOCALMENTE:** TypeScript bruto completo --noEmit --incremental false, saída 0 em 22/11/2026. 46 guardiões que citam os arquivos tocados, incluindo .mts: 26 já vermelhos em origin/main, 0 vermelhos novos, saída 0; agregado em GUARDIOES.json. Comparação concluída em 22/11/2026. O teste novo renderiza os módulos reais das dez páginas offline e confere as 20 perguntas, primeiro parágrafo, todos os parágrafos/tabelas anteriores, schema visível, créditos/preço derivados e datas seletivas. Nesse teste offline somente, componentes client não pertinentes e o catálogo de scripts são fronteiras inertes; as fotos reais incluem os componentes reais.

**LIMITE DE VALIDAÇÃO:** a primeira tentativa após iniciar Next encontrou erro nos tipos de rota gerados para NICHE_SLUGS, exportação já existente em origin/main. Após encerrar Next, foi removido somente .next/types local e executado novamente o typecheck bruto exigido, sem alterar esse export. Não houve build de produção e a entrega não afirma que tipos gerados pelo build estão limpos. Chamadas auxiliares locais sem credenciais retornaram 503; não são evidência de defeito no ar. Nenhum .env.local foi lido.

**PROVAS FORA DO GIT:** C:/kineo/docs/citacoes-compradores-2111/provas-locais/COMPARACAO.html (autocontido, 25.071.853 bytes), capturas JPG, DOM JSON, preservacao.json, manifests e captura-real.cjs. Nada em .codex/visualizations. Somente este resumo e resultados textuais entram no Git.

**O que pode melhorar:** recuperar uma página na busca não prova citação em resposta real nem crescimento de visitas. O texto agora distingue montagem, revisão, publicação e limites de continuidade; a distribuição ainda depende de publicação pela CEO e coleta pelo índice.

**O que os concorrentes fazem:** as fontes abertas em PERGUNTAS.md mostram entradas/saídas explícitas e revisão de roteiro. Adaptamos a clareza por tarefa, sem copiar preços ou garantias de identidade/publicação.

**PRÓXIMO PASSO RECOMENDADO:** CEO revisar código e fotos; publicação é dela. Itens 3 e 4 são entregues em commits próprios depois deste item. Medir visitas, cadastros e primeiro filme nas definições de MEDIDA.md após exposição, sem tratar sessão como pessoa ou origem desconhecida como ChatGPT.
