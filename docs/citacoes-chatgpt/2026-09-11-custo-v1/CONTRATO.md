# [Citações] V1 — custo por filme e acesso direto a planos

**HIPÓTESE / CONTRATO ANTES DA EDIÇÃO — 10/09/2026 23h42 BRT:** pessoas externas que chegam ao guia de custo podem já querer comparar uma assinatura. O hero atual só dá ação de teste gratuito; o acesso a planos fica no final. Falta uma conta explícita de custo mensal alocado por filme na unidade perguntada. Isso foi observado no código, não atribuído a uma coorte medida.

**FATO CONFIRMADO — base 45a6cac9:** `app/ai-video-generator/complete-60-second-shorts-cost/page.tsx` usa o template sem opção própria de compra; `components/CitationAnswerPage.tsx:46` mostra somente o CTA de trial no hero. `lib/marketingPrice.ts:89,100,254` já fornece créditos, filmes por plano e custo por filme completo de referência. Reutilizar esses helpers; não duplicar fórmula financeira nem importar o componente de calculadora que contém apresentação de moeda e motores fora deste escopo.

**PESSOA / COORTE:** visitantes externos do guia existente `/ai-video-generator/complete-60-second-shorts-cost`, com atribuição orgânica real preservada. Anônimos não vinculáveis ficam separados; nenhuma pessoa será identificada por IP. Não há amostra financeira consultada nesta rodada.

**MUDANÇA MÍNIMA REVERSÍVEL:** uma única variante em inglês, somente neste guia: CTA secundário “Compare plans” no hero, sem exigir geração; quadro que explicita Starter, duração de referência de 60 segundos, créditos, quantidade de filmes completos e custo mensal alocado por filme para Kineo 1 e Seedance 1.5. O denominador usa `videosPerMonth`; custo usa `costPerFilmUsd`, não preço avulso de cada render. Explicitar saldo restante, créditos sem rollover, regenerações/uso diferente e Brasil em reais. Trial, preço, oferta, FAQ e exemplos autorizados permanecem. Para outras durações, link à calculadora existente; não criar outra calculadora ou nona página.

**SUPERFÍCIE / CANAL:** mesma URL, descoberta existente, sem alterar llms. CTA de planos usa `/pricing?intent_campaign=citacoes_cost_decision_v1`, sem forjar `utm_source=chatgpt`. Template recebe slots opcionais; as outras sete páginas mantêm saída atual. Arquivos previstos: página de custo, `components/CitationAnswerPage.tsx`, novo `components/CitationCostDecision.tsx` e CSS próprio do bloco; nenhum arquivo de preço/checkout/Claude.

**MÉTRICA EXISTENTE:** `organic_cta_clicked` com source/placement/destination, seguido de `pricing_view`, gesto de checkout e pagamento canônico de pessoa externa se o acesso autorizado disponibilizar esses dados. Não criar contador financeiro ou atribuir compra a clique. A preservação de campanha até pagamento deverá ser comprovada; sem isso, atribuição é desconhecida.

**PAGAMENTO ESPERADO — HIPÓTESE:** facilitar a escolha de primeira assinatura por quem já está pronto, sem obrigar um filme de teste. Nenhuma previsão numérica de conversão ou receita.

**AMOSTRA / REVISÃO:** registrar SHA/hora de exposição e consultar evidência canônica disponível na primeira revisão de seis horas após publicação, ou antes se houver resposta/intenção real. Sem acesso, manter DESCONHECIDO e preservar a variante. A medição de citações continua somente em 11/09 20h.

**PARADA:** interromper imediatamente por preço/moeda incorretos, regressão em CTA/canonical, nova falha de gate ou pedido do fundador. Sem amostra comparável, não rejeitar por ausência de vendas; mudar outra etapa autorizada. Limite de duas variantes simultâneas: esta é V1, sem segunda variante criada.

**DONO / COORDENAÇÃO:** Citações implementa em worktree isolada a partir de `45a6cac9`; Board integra o primeiro pacote exatamente até esse SHA, preservado. Esta variante será delta posterior separado, sem editar a worktree do transporte. Reserva no PEDIDOS antes da edição. Preview antes/depois desktop/mobile e verificação do componente real exigidos. Nenhum clique de aquisição, cadastro, render ou pagamento de teste.

