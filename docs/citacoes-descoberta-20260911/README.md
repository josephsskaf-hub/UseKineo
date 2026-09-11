# [Citações] Links contextuais para os guias existentes

**IMPLEMENTADO · 11/09/2026.** Delta isolado sobre `679b789c3381c914392a8c56ed150226a6af341e`, branch `codex/citacoes-descoberta-20260911`. Os dois arquivos funcionais receberam quatro links de leitura; nenhuma nova página ou variante comercial foi criada.

**FATO CONFIRMADO.** `app/ai-video-generator/[engine]/page.tsx:247` acrescenta um parágrafo imediatamente depois da ficha técnica, condicionado a `params.engine === 'seedance'`. `app/cheapest-ai-shorts-maker/page.tsx:151` acrescenta as mesmas referências ao final do parágrafo de escolha de motor, preservando seu conteúdo anterior e os links para pricing e alternatives.

**IMPLEMENTADO.** Os destinos são `/ai-video-generator/complete-60-second-shorts-cost` e `/vs/invideo-alternatives-faceless-shorts`. São links Next `Link` comuns, sem nova campanha, UTM, evento ou chamada de compra. A redação aponta para consumo de créditos e diferenças de fluxo; não acrescenta preço ou promessa.

**TESTADO LOCALMENTE.** `node docs/citacoes-descoberta-20260911/verify-and-preview.cjs` passou com cinco checks: mudanças limitadas ao condicional e ao parágrafo; destinos locais existentes e intactos; renderização apenas para Seedance entre os slugs do catálogo; quatro URLs exatas sem atribuição nova; preservação do parágrafo e links anteriores da calculadora. O JSX real das duas seções foi renderizado com os custos dos helpers existentes. Não houve tentativa de rede, carregamento de mídia ou geração de vídeo. Horário: [verification.json](verification.json).

**TESTADO LOCALMENTE.** `node C:/kineo/node_modules/typescript/bin/tsc --noEmit --incremental false` terminou com código 0. Incluiu os tipos Next disponíveis copiados somente para esta worktree: layout, hub, página dinâmica de motores, eventos, stats/public e checkout/resume, além de `package.json`. Não havia tipo gerado da página da calculadora; o resultado não representa geração completa de tipos ou build.

**IMPLEMENTADO.** [preview.html](preview.html) mostra as duas seções antes/depois com controles desktop de 1100 px e mobile de 390 px. O arquivo é autocontido e usa o JSX e os estilos reais, preservando o layout já existente da ficha técnica. Não executa as rotas nem seus carregadores de mídias.

**QUESTÃO PENDENTE.** A raiz fará QA no Next real e os gates pertinentes da integração. O patch não saneia textos antigos da calculadora nem altera formulário, cálculo, CTAs comerciais, V1, V2, catálogo, dados financeiros, sitemap ou llms. Não houve publicação, push ou enfileiramento nesta worktree. A raiz executará o transporte sob coordenação do Board.
