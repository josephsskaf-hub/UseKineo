# [Citações] Decisão por custo de filme completo — V1

**IMPLEMENTADO · 10/09/2026 BRT / 11/09/2026 UTC.** Delta isolado sobre `45a6cac9d7a375b082a798afaa5e2f33d0a30c2d`, na branch `codex/citacoes-cost-20260911`. A única rota com nova apresentação é `/ai-video-generator/complete-60-second-shorts-cost`.

**FATO CONFIRMADO.** O guia substitui os três cards de plano por dois cenários alternativos do mesmo Starter, com filmes completos de referência de 60 segundos. Usa `creditsPerReferenceVideo`, `videosPerMonth`, `costPerFilmUsd`, `formatUsd`, `STARTER_MONTH` e `STARTER_CREDITS` sem alterar suas fontes: `components/CitationCostDecision.tsx:3`, `lib/marketingPrice.ts:89`, `lib/marketingPrice.ts:100`, `lib/marketingPrice.ts:254`.

**FATO CONFIRMADO · valores dos helpers em 10/09/2026.** Fast: 5 créditos por filme, 12 filmes completos, saldo zero, aproximadamente US$ 0,83 alocados por filme. Seedance 1.5: 25 créditos por filme, 2 filmes completos, saldo de 10 créditos, aproximadamente US$ 4,95 alocados por filme. O denominador é a quantidade inteira de filmes; não se usa divisão por filmes fracionários nem custo proporcional dos créditos. Os saldos e a equação aparecem em `components/CitationCostDecision.tsx:26`.

**FATO CONFIRMADO.** O texto explica que o valor aloca a mensalidade inteira, não é uma cobrança avulsa por render; os cenários não se somam; regenerações, outros motores e durações mudam o consumo; créditos mensais não acumulam; brasileiros pagam em reais. Fonte do não acúmulo: `app/llms.txt/route.ts:312`. Texto visível: `components/CitationCostDecision.tsx:42`.

**IMPLEMENTADO.** A ação secundária `Compare plans` usa `OrganicCtaLink`, campanha `citacoes_cost_decision_v1`, posição `hero_compare_plans` e destino `/pricing?intent_campaign=citacoes_cost_decision_v1`, sem inventar `utm_source`: `components/CitationCostDecision.tsx:15`. Os dois CTAs grátis, seus destinos, FAQ, concorrentes com `[CONFIRMAR]` e amostra pública existente permanecem iguais. O mapa global de respostas e os arquivos financeiros não foram editados.

**TESTADO LOCALMENTE.** `node docs/citacoes-cost-v1-20260911/verify-and-preview.cjs` terminou com código 0 em `2026-09-11T02:50:34.136Z`: 20 checks, incluindo comparação byte a byte do HTML das outras sete páginas, metadados, cenários independentes de filmes inteiros, saldos, preservação dos CTAs/amostra/FAQ/tabela e chamada do handler real de `OrganicCtaLink` com analytics substituído em memória. Houve zero tentativa de rede. Resultado e hashes: [verification.json](verification.json). O teste não comprova chegada de eventos em produção.

**TESTADO LOCALMENTE.** `node C:/kineo/node_modules/typescript/bin/tsc --noEmit --incremental false` terminou com código 0. O projeto incluiu os tipos Next disponíveis copiados somente para a `.next/types` desta worktree: `package.json`, `app/layout.ts` e `app/ai-video-generator/complete-60-second-shorts-cost/page.ts`. Isso não representa geração de tipos de todas as rotas nem build de produção. Nenhum tipo ou configuração da worktree raiz foi alterado.

**IMPLEMENTADO.** [preview.html](preview.html) contém antes/depois dos componentes React reais, CSS e poster embutidos, com seletores desktop de 1100 px e mobile de 390 px. A visualização não precisa de build, servidor ou rede. O gerador usa imports locais controlados, sem arquivo de ambiente nem analytics real.

**QUESTÃO PENDENTE.** A raiz fará a comparação visual no Next real, após integrar este commit, e registrará o resultado separadamente. Publicação e transporte continuam exclusivamente com o Board; esta entrega não enviou commit, não enfileirou e não publicou. O pacote anterior permanece congelado em `45a6cac9`.

**FATO CONFIRMADO.** Escopo funcional: `app/ai-video-generator/complete-60-second-shorts-cost/page.tsx`, `components/CitationAnswerPage.tsx`, `components/CitationCostDecision.tsx` e `lib/ui/citationCostDecisionStyles.ts`. O restante deste delta é a evidência local nesta pasta. Não há nova rota, mudança no catálogo, calculadora, home, llms, preço ou política de entrada.
