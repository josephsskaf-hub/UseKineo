# [Citações] Comparação verificável — V2

**IMPLEMENTADO · 11/09/2026.** Delta isolado sobre `984a1a15a0bdd373decbb325d4f57e3c9e0a6057`, na branch `codex/citacoes-comparacao-20260911`. A apresentação nova afeta somente `/vs/invideo-alternatives-faceless-shorts`, sem nova rota.

**FATO CONFIRMADO.** `components/CitationAnswerPage.tsx:24` recebe `comparisonSection` e `reviewDate` opcionais, com os valores anteriores como fallback. A rota local passa o componente novo e ajusta a descrição, a segunda frase e a quarta FAQ; mantém pergunta/H1, título, canonical, duas chamadas grátis, amostra pública e as outras quatro FAQs: `app/vs/invideo-alternatives-faceless-shorts/page.tsx:8`.

**IMPLEMENTADO.** A tabela mantém seis colunas e cinco ferramentas: Kineo, Pictory, Descript, HeyGen e OpusClip. Cada campo de concorrente contém texto curto, situação da evidência, URL primária e data de consulta em `lib/growth/citationComparisonSnapshot.ts:5`. O componente mostra as fontes junto aos respectivos campos, conserva as lacunas e distingue cobrança mensal, franquia de processamento e duração por exportação: `components/CitationComparisonDecision.tsx:9`.

**EVIDÊNCIA DE FONTES PRIMÁRIAS PÚBLICAS · 11/09/2026.** A pesquisa fornecida pela raiz consultou páginas oficiais de preço e ajuda, sem conta ou exportação real. As URLs exatas e suas relações com cada campo estão no snapshot e em [verification.json](verification.json). As referências iniciais são [Pictory](https://pictory.ai/pricing/), [Descript](https://www.descript.com/pricing), [HeyGen](https://www.heygen.com/pricing) e [OpusClip](https://www.opus.pro/pricing). Os arquivos privados da pesquisa não foram copiados para o Git.

**CONTRADIÇÃO / QUESTÃO PENDENTE.** O requisito de cartão do trial Pictory e a marca d’água do Free em Descript e HeyGen têm fontes oficiais divergentes. Esses trechos continuam `[CONFIRMAR]`; as fontes conflitantes são vinculadas nas células. Acesso a modelos por plano e máximos de exportação sem evidência suficiente também ficam explícitos. A lista geral de modelos de um produto não foi apresentada como permissão no seu plano de entrada.

**FATO CONFIRMADO.** Os preços, trial e marca d’água da Kineo vêm dos helpers existentes de `lib/growth/citationAnswers.ts:21`; não há novo preço literal em JSX nem edição financeira. O máximo de duração Kineo continua desconhecido. A tabela reutiliza o CSS existente e não altera a apresentação das demais páginas.

**IMPLEMENTADO.** `components/CitationComparisonDecision.tsx:16` usa o `OrganicCtaLink` existente depois da tabela: rótulo `Compare Kineo plans`, campanha `citacoes_comparison_decision_v2`, posição `comparison_plans`, destino `/pricing?intent_campaign=citacoes_comparison_decision_v2`. Não cria origem de aquisição; a campanha da V1 de custo permanece separada.

**TESTADO LOCALMENTE.** `node docs/citacoes-comparacao-v2-20260911/verify-and-preview.cjs` terminou com código 0 em 11/09/2026 às 01h18m27s BRT. Os 39 checks incluem as sete rotas reais com HTML byte a byte idêntico à base, incluindo os dois slots da V1; fontes/datas por campo; fixtures independentes de preços mensais, unidades e limites; lacunas visíveis; CTA real com analytics substituído em memória; CTAs grátis/amostra/canonical preservados. Houve zero tentativa de rede. Horário com milissegundos e hashes estão em [verification.json](verification.json).

**TESTADO LOCALMENTE.** `node C:/kineo/node_modules/typescript/bin/tsc --noEmit --incremental false` terminou com código 0. Incluiu os tipos Next disponíveis copiados para esta worktree: layout, página de custo, página dinâmica de motores, API de eventos e checkout/resume, além de `package.json`. Não havia tipo gerado da rota InVideo; este teste não representa geração completa de tipos nem build. Não se alterou a `.next` da raiz.

**IMPLEMENTADO.** [preview.html](preview.html) é uma comparação antes/depois dos componentes React reais, com CSS e poster embutidos e controles desktop de 1100 px e mobile de 390 px. Pode ser visto sem build, servidor ou rede. A tabela conserva rolagem horizontal acessível para suas colunas.

**QUESTÃO PENDENTE.** A raiz fará QA visual no Next real e os gates finais de integração. A verificação offline do handler não comprova evento recebido em produção, aquisição nem pagamento. Esta worktree não publicou, enfileirou, enviou commits ou executou script de produção. Transporte continua com o Board.

**FATO CONFIRMADO.** Escopo funcional deste delta: rota InVideo, template `CitationAnswerPage`, novo `CitationComparisonDecision` e novo `citationComparisonSnapshot`. Os demais arquivos são evidências nesta pasta. O mapa global de respostas, V1, llms, home, calculadora, catálogo, checkout, entrada e preços permanecem intactos.
