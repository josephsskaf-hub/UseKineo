# Handoff Codex → Claude — rodadas 155–156

**Base:** `origin/main` em `ead889cfd2b7265c541793007344125ff3f1c345`  
**Data:** 01/09/2026  
**Continuidade:** este documento complementa `docs/HANDOFF-CODEX-CLAUDE-2026-08-27.md` depois da seção 154. Nenhuma intervenção de runtime foi feita nestas duas rodadas.

## 155. B2C — o único clique recente em Checkout virou uma assinatura Studio; decisão de plano é o gargalo desta janela

**DECISÃO APROVADA / REGRA DO BOARD:** pessoa em pricing, clique e Checkout Session não são receita. A conversão só fecha com `payment_success` reconciliado e assinatura ativa no perfil. Uma pessoa convertida não prova causalidade, mas contradiz uma hipótese universal de falha no Stripe.

**EVIDÊNCIA DE PRODUÇÃO / RECONCILIAÇÃO:** SELECT agregado somente leitura no Supabase de produção em 01/09/2026 UTC, janela móvel de 48 horas e contas internas conhecidas excluídas. Onze pessoas externas distintas emitiram `pricing_view`. Uma clicou no CTA canônico de Checkout em `pricing_page`; a mesma pessoa emitiu `checkout_attempted`, `checkout_started` e `payment_success`, e hoje possui plano `pro`, `has_paid=true` e `stripe_subscription_id` não nulo. Logo, nesta janela, o único clique observado criou uma assinatura Studio ativa. As outras dez pessoas não abriram Checkout depois da primeira visão de pricing.

**EVIDÊNCIA DE PRODUÇÃO / CONTEXTO, NÃO CAUSA:** a pessoa convertida tinha vídeo concluído antes de pricing, passou pelo caminho ChatGPT, recebeu `plan_fit_impression` e viu `pricing_journey_proof_v1`. Entre as dez não convertidas, quatro passaram pelo caminho ChatGPT, cinco já tinham vídeo, uma recebeu Plan Fit e cinco viram a prova da jornada. Esses números não autorizam afirmar que Plan Fit ou a prova causaram a compra; mostram que a cadeia completa funcionou uma vez e que o abandono dominante ocorreu antes do clique.

**EVIDÊNCIA DE PRODUÇÃO / GATES DAS VARIANTES:** `pricing_journey_proof_v1` acumula quatro pessoas externas em `after_delivery` e duas em `before_first_delivery`. O gate canônico exige cinco por estado. No estado pós-entrega houve um review, um Checkout e um pagamento; nenhuma pessoa clicou no CTA interno `plans_clicked`. A compra ocorreu pelo card normal, portanto não será atribuída ao clique inexistente. `pricing_tier_intent_viewed` teve zero pessoa nesta coorte porque nenhuma chegou por um handoff versionado `?tier=`; isso não significa card invisível.

**HIPÓTESE ATUAL / NÃO PROVADA:** a fricção recente está na escolha do plano, não na criação técnica da Session nem na liquidação do único pagamento. Entretanto a própria superfície já contém Plan Fit, prova da entrega, atribuição de escolha, barra mobile e contratos recentes ainda abaixo dos gates. Uma nova intervenção agora apagaria fronteiras e impediria saber o que funcionou.

**GATE / PRÓXIMA DECISÃO:** **NO-GO para nova UI, copy, CTA, preço, moeda ou Checkout em `/pricing`.** Preservar `pricing_journey_proof_v1` até cinco pessoas externas em cada estado; preservar Plan Fit e a verdade mobile até os gates já documentados. Reconciliar por pessoa `pricing_view → checkout_cta_clicked(surface=pricing_page) → checkout_started → payment_success → assinatura ativa`. Se dez novas pessoas elegíveis virem pricing sem clicar e as variantes atingirem seus gates, formular uma única hipótese de escolha; se o clique continuar liquidando, não mexer no Stripe.

**ESTADO ATUAL:** **ASSINATURA STUDIO REAL CONFIRMADA / GARGALO RECENTE LOCALIZADO ANTES DO CLIQUE / VARIANTES ABAIXO DO GATE / NO-GO PARA RUNTIME / PRÓXIMA RODADA ROTACIONADA PARA B2B.**

## 156. B2B — o link de intake não fecha semanticamente o retorno do cliente à agência

**HIPÓTESE CAUSAL NOVA:** a agência envia um intake ao cliente, mas a etapa final continua falando com a agência. Isso pode interromper o retorno do brief fora do produto; não existe amostra que prove abandono.

**FATO CONFIRMADO / CALLER REAL:** `buildClientShortBriefShareHref()` cria um link vazio e privacy-safe com a campanha allow-listed `client_short_brief_share_v1`; nenhum campo do cliente entra na URL (`lib/growth/clientShortBrief.ts`; `app/client-video-brief-generator/ClientVideoBriefGenerator.tsx`). O destinatário preenche cinco campos e gera o artefato localmente. Depois disso, a única ação continua rotulada `Copy brief for the client` e emite o evento genérico `client_short_brief_copied`, embora quem entrou pela campanha seja o próprio cliente e precise devolver o brief à agência.

**FATO CONFIRMADO / MEDIÇÃO INSUFICIENTE:** o evento atual não distingue a agência copiando um brief para apresentar do cliente copiando a resposta para devolver. A entrada e a geração já são observáveis; falta somente um papel específico se a campanha realmente for usada. Não colocar conteúdo, e-mail, URL livre ou campos no evento.

**ANTI-DUPLICAÇÃO:** o gerador, o handoff até signup e o link vazio agência→cliente já existem. O conflito de `approval` da seção 149 é outro papel. Não criar nova landing, proposta, portal, mensagem automática ou persistência de formulário.

**GATE / PRÓXIMA DECISÃO:** **GO apenas para diagnóstico agregado / NO-GO para runtime.** Reabrir após cinco sessões externas chegando pela campanha exata e dois briefs gerados por destinatários. Só então, se pelo menos dois geradores terminarem sem copy, ativação ou packs, testar mudança mínima: `Copy completed brief to send back` e evento fechado `client_short_brief_return_copied`. Parar por campanha inexata, qualquer PII em URL/evento ou impacto no visitante orgânico normal.

**ESTADO ATUAL:** **LACUNA SEMÂNTICA CONFIRMADA EM CÓDIGO / USO EXTERNO NÃO PROVADO / NO-GO PARA RUNTIME / GATE REGISTRADO.**

## Declaração de escopo

Nenhum código, UI, copy pública, preço, moeda, crédito, SKU, Checkout, banco, render, comunicação externa ou tráfego ativo foi alterado. As únicas ações foram leitura de código, SELECT agregado, reconciliação por pessoa e documentação deste handoff.
