# [Citações] Primeira revisão comercial das variantes

**EVIDÊNCIA OPERACIONAL — retomada em 11/09/2026 10h38 BRT:** as primeiras janelas de seis horas já venceram. A revisão é executada nesta retomada; não foi registrada como se tivesse ocorrido durante os disparos anteriores. As duas variantes permanecem preservadas. Nenhuma nona página, terceira variante, nova medição ChatGPT ou ação de aquisição foi executada.

| Variante | Campanha | Início observado BRT | Fim exclusivo da primeira janela BRT |
|---|---|---|---|
| Custo V1 | `citacoes_cost_decision_v1` | 11/09 00:14:22.326 | 11/09 06:14:22.326 |
| Comparação V2 | `citacoes_comparison_decision_v2` | 11/09 01:27:54.8791873 | 11/09 07:27:54.8791873 |

**EVIDÊNCIA DE PRODUÇÃO:** os horários iniciais são observações HTTP positivas, não instantes exatos de rollout. Nesta retomada, dois GETs em 11/09 10:39:45 BRT confirmaram resposta 200, canonical, campanha, CTA de planos e trial de trinta créditos sem cartão em ambas as páginas. [Registro](HTTP.json). As requisições identificaram o verificador no User-Agent e não executaram JavaScript, cadastro, checkout, render ou pagamento. HTTP não é pessoa nem conversão.

**FATO CONFIRMADO / IMPLEMENTADO — leitura em 11/09; mesmos arquivos na main `f6e4e3e`:** há transporte de campanha até o evento de pagamento confirmado. O limite do relatório inicial era a ausência de verificação desse caminho, não sua inexistência.

| Etapa | Campo para selecionar a campanha | Evidência no código |
|---|---|---|
| Clique no CTA de planos | `events.name=organic_cta_clicked`, `metadata.source` | `components/OrganicCtaLink.tsx:45` |
| Visita a planos | `events.name=pricing_view`, `metadata.source` | `app/pricing/PricingClient.tsx:455` |
| Escolha de plano | `starter/basic/pro/autopilot_checkout_clicked`, `metadata.intent_campaign` | `app/pricing/PricingClient.tsx:612` |
| Checkout criado | `checkout_started`, `metadata.intent_campaign`; vínculo por `user_id` e `metadata.stripe_session_id` | `app/api/stripe/checkout/route.ts:2386` |
| Pagamento confirmado | `payment_success`, `metadata.source=stripe_webhook`, `metadata.intent_campaign`; pessoa e sessão Stripe | `app/api/stripe/webhook/route.ts:661`, `:708` |

**FATO CONFIRMADO:** o webhook só registra esse pagamento quando `session.payment_status` é `paid`; usa ID determinístico e busca prévia por sessão Stripe para deduplicar. Preserva `checkout_mode`, plano, billing, pack, sinal histórico de trial pago, valor e moeda (`app/api/stripe/webhook/route.ts:661–744`). Isso permite consulta por campanha, mas não prova ingestão real nem classifica sozinho primeira assinatura, renovação e estorno. Uma sessão de pagamento não deve ser somada novamente como invoice.

**FATO CONFIRMADO / LIMITES DO DENOMINADOR:** `landing_session_started` é uma entrada por aba, sem impressão específica do bloco (`components/SourceCapture.tsx:71`). O evento genérico `checkout_cta_clicked` não recebe campanha deste caller (`app/pricing/PricingClient.tsx:601`). CTAs grátis preservam as campanhas anteriores `citacoes_01_cost/invideo` (`components/CitationAnswerPage.tsx:36`). Assinantes existentes seguem troca de plano sem campanha nesse fluxo (`app/pricing/PricingClient.tsx:344`). Primeiro toque do cadastro pode divergir da campanha da compra (`lib/analytics.ts:402`). Não preencher essas lacunas com suposições.

**MÉTODO / SUGESTÃO:** contar pessoas externas distintas apenas quando vinculadas à autenticação do servidor; excluir contas internas com a fonte atual `lib/internalAccounts.ts:51`. Sessões anônimas não vinculáveis ficam separadas e IP não vira pessoa. Deduplicar pagamento pela sessão Stripe, separar modalidades e moedas, não declarar receita líquida sem estornos e não atribuir causalidade à campanha. Aplicar intervalos fechados no início e abertos no fim; qualquer extensão posterior às primeiras seis horas recebe janela própria.

**QUESTÃO PENDENTE / REVISÃO INCONCLUSIVA — resposta do Board recebida nesta retomada, registrada às 10h43 BRT:** foram solicitados os agregados das duas janelas e, se já disponível, cadastros com `profiles.utm_source=chatgpt` por dia BRT desde 08/09, mantendo hoje parcial separado. O Board informou não dispor de agregado canônico validado dessas campanhas para fornecer e orientou preservar V1/V2, sem inferir receita nem duplicar auditoria. A resposta não concede autorização nova de banco ou envio. Pessoas, pagamentos, cadastros atuais e efeito comercial permanecem desconhecidos; não preencher com zero. Nenhum SQL foi executado nesta revisão.

**DECISÃO OPERACIONAL:** conservar as duas variantes sem amostra e não criar uma terceira. As próximas janelas de seis horas terminam em 11/09 12:14:22.326 BRT (V1) e 13:27:54.8791873 BRT (V2). Uma nova revisão sem mudança de dado/acesso não exige repetir o pedido nem notificar novamente o mesmo limite. A bateria comparável ChatGPT permanece às 20h; o término da janela continua às 23h30 BRT. A informação de créditos renovados não foi tratada como receita Kineo nem como renovação desse prazo.

**EVIDÊNCIA DOCUMENTAL / CONTEXTO:** o Board registra um incidente de resposta da Fal em `docs/AUDITORIA-MOTORES-E-RENDER-2026-09-11.md`, publicado em `f6e4e3e`. Esse contexto pode afetar a interpretação da conversão. Não prova falha em todos os motores/usuários nem que uma das variantes causou perda. O incidente e o pipeline permanecem com o Board.
