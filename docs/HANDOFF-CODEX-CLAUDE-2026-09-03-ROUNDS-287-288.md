# HANDOFF CODEX → CLAUDE — ROUNDS 287–288

**Data:** 2026-09-03 · **Trilha:** Growth (aquisição → assinatura) · **Estado:** medido em produção; ação operacional pendente

## Feedback do fundador transformado em regra

- **DECISÃO APROVADA (fundador, 2026-09-03):** Growth não conta leitura, relatório ou uma nova variação da mesma superfície como ação. Precisa executar uma mecânica nova, distribuída e mensurável, preservando experimentos ainda em gate.
- **IMPLEMENTADO:** `docs/workstreams/GROWTH.md` agora exige caller/distribuição/denominador humano e uma saída explícita `EXECUTADO`, `NÃO EXECUTAR` ou `PIVOTAR PARA` em toda rodada.

## Reconciliação da queda

**EVIDÊNCIA DE PRODUÇÃO (Supabase `cqqukkvjjrguayiyjvhh`, SELECT somente leitura, 2026-09-03 09:54 BRT):** comparação móvel das 6 horas anteriores contra as mesmas 6 horas do dia anterior, com contas internas excluídas pelo filtro canônico.

| Etapa / fonte | Dia anterior | Atual | Leitura |
|---|---:|---:|---|
| `landing_session_started` — pessoas/sessões externas | 90 | 41 | queda real de aquisição |
| TAAFT | 54 | 18 | 36 das 49 entradas perdidas |
| ChatGPT | 10 | 7 | queda menor; canal preservado |
| direto/desconhecido | 15 | 12 | quase estável |
| cadastros externos | 17 | 10 | caiu com o topo |
| pessoas externas com vídeo concluído | 12 | 8 | caiu com o topo |
| `checkout_attempted` — pessoas externas | 2 | 2 | estável |
| `checkout_started` — pessoas externas | 1 | 2 | não caiu |
| `payment_success` — pessoas externas | 0 | 0 | placar financeiro continua zerado |

**CONCLUSÃO:** o relato do fundador sobre menos entradas está confirmado; a queda de Checkout não aparece nesta janela alinhada. Não há base para rollback de conversão. A perda está majoritariamente concentrada em TAAFT, e assinatura segue sendo o gargalo financeiro.

## Auditoria anti-repetição da próxima ação

- **NÃO EXECUTAR — B2C:** uma nova landing, ferramenta ou card pós-vídeo. As superfícies com tráfego estão congeladas ou pertencem ao fluxo compartilhado com Claude; uma rota nova sem launcher seria invisível.
- **NÃO EXECUTAR — B2B:** novo PDF/CSV/calculadora/landing. Os caminhos ativos já cobrem a jornada e estão em gate; os packs ainda têm contradição quantidade × créditos registrada.
- **PIVOTAR PARA — último metro operacional:** alinhar o Stripe à decisão USD-only desativando Adaptive Pricing em Live Mode; depois auditar Google Pay, Apple Pay e Link, sem habilitar método assíncrono e sem tocar em Stripe Tax.

## Evidência Stripe e bloqueio de autorização

- **EVIDÊNCIA DE PRODUÇÃO (Stripe Live, consulta oficial, 2026-09-03):** as 20 Checkout Sessions mais recentes consultadas eram `mode=subscription`, integração em `currency=usd` e `adaptive_pricing.enabled=true`; foram 12 abertas/não pagas, 1 concluída/paga e 7 expiradas/não pagas. São sessões, não pessoas externas, porque esta leitura não reconciliou a lista interna.
- **CONTRADIÇÃO:** a decisão comercial e o código prometem USD único, mas o setting global ainda apresenta conversão local nas Sessions novas.
- **BLOQUEADO:** a autorização mais recente do fundador para esta frente exclui alteração de Checkout. Nenhuma configuração foi mudada. O próximo passo exige autorização explícita para alterar o Dashboard Stripe.

## Próxima execução proposta

1. Desativar Adaptive Pricing em Live Mode.
2. Criar/observar a primeira Session nova, sem pagamento forçado, e provar `currency=usd` + `adaptive_pricing.enabled=false`.
3. Auditar os métodos dinâmicos; se Google Pay estiver desligado, habilitar Google Pay e confirmar Apple Pay/Link, mantendo métodos assíncronos e Stripe Tax intocados.
4. Medir por pessoas externas distintas e assinaturas reais; sessão, carteira exibida ou clique não contam como receita.

