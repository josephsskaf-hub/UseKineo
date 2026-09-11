# [Citações] V1 — fontes da conta e da atribuição

**FATO CONFIRMADO / IMPLEMENTADO — inspeção em 10/09/2026 23h50 BRT, base 45a6cac9:** esta variante pode reutilizar o caminho atual de navegação e eventos. Nenhuma mudança em checkout, preço ou instrumentação financeira é necessária para preparar a página.

| Etapa | Fonte no código | Limite da evidência |
|---|---|---|
| Clique orgânico | `components/OrganicCtaLink.tsx:36,45–52` emite `organic_cta_clicked`, com source, placement e destination sem query. Sem focusTargetId, mantém a navegação do Link. | Leitura do código; não foi gerado clique de aquisição. |
| Visita aos planos | `app/pricing/PricingClient.tsx:455–460` sanitiza intent_campaign, lembra a campanha e emite pricing_view com source. | Implementado; ingestão do evento em produção não consultada. |
| Escolha de plano | `app/pricing/PricingClient.tsx:590–601,619` transporta a campanha sanitizada ao destino de compra e ao helper de atribuição. | Nenhuma compra ou checkout de teste. |
| Campanha válida | `lib/growth/pricingPlanChoiceAttribution.ts:21–26,47–52` aceita citacoes_cost_decision_v1 e a inclui no objeto de atribuição. | Não comprova vínculo com pagamento. |
| Origem real preservada | `lib/analytics.ts:75–86,160–178` mantém o primeiro UTM e o primeiro handoff de intenção separadamente. | Uma intenção anterior pode prevalecer na atribuição do cadastro; não tratar toda visita como aquisição ChatGPT. |

**FATO CONFIRMADO — conta de referência:** `lib/marketingPrice.ts:86,89–101` define 60 segundos e usa créditos canônicos para contar filmes inteiros. `costPerFilmUsd`, em `:254–257`, divide a mensalidade pelo número inteiro de filmes; `formatUsd`, em `:111–112`, apresenta centavos. Esta é alocação da mensalidade, não tarifa avulsa por geração nem o valor proporcional de créditos de `planCreditSpendUsd`.

**QUESTÃO PENDENTE / DESCONHECIDO:** pessoas externas expostas, visitas atribuídas, escolhas de plano, pagamentos e receita da variante. A exposição só começa após SHA e HTTP de produção confirmados. A revisão de seis horas conta a partir dessa exposição. Anônimos não vinculáveis permanecem separados; contas internas não podem entrar na coorte. Ausência de consulta não equivale a zero.

**EVIDÊNCIA OPERACIONAL — coordenação recebida em 10/09/2026:** o Board reservou `C:/kineo-wt/board-integracao-20260911`, branch `codex/board-integracao-20260911`, base `7827f2e0`, para integrar exclusivamente o pacote fixo `45a6cac9`, kit aprovado e transporte seguro. A V1 é delta separado. Citações não escreve `entrega-atual` enquanto aguarda o desfecho do executor único.
