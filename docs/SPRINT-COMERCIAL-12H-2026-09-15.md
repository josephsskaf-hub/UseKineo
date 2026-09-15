# Comercial — 15/09/2026 — 01:45–13:45 BRT

## Mandato e fonte

- DECISÃO DO FUNDADOR nesta sessão: iniciar as 12 horas comerciais, sem interrupções intermediárias; correção dos motores continua com Claude. A retirada do H3 foi REVOGADA: permanece disponível.
- CONFIGURADO: heartbeat `kineo-motores-board-claude` foi reaproveitado, com nome Comercial, checkpoints aos minutos 15/45 e término 2026-09-15T16:45Z. Substitui, não renova, a auditoria de motores.
- Plano aprovado original preservado localmente em `C:/kineo-wt/board-motores-auto-0914/docs/SPRINT-COMERCIAL-12H-2026-09-15.md`. Três frentes: intenção recente, clareza da compra existente, distribuição especificamente autorizada. Máximo duas variantes, sem preço novo, compra de teste, render ou contato não autorizado.
- Worktree exclusiva: `C:/kineo-wt/comercial-12h-20260915`, branch `codex/comercial-12h-20260915`, base remota `991b60bef43a0bd84f0d9aa1a859690566cc41a5`. Main local suja preservada.

## Rotação 1 — abertura / checkpoint continua a mesma entrega

### Baseline — não confundir coortes

EVIDÊNCIA DE PRODUÇÃO: SELECT no projeto `cqqukkvjjrguayiyjvhh` em 15/09, início desta rotação. Janela de referência EXATA de 12 horas: 14/09 16:45 UTC inclusive até 15/09 04:45 UTC exclusivo. Exclusões conforme `lib/internalAccounts.ts`; perfis sem e-mail ficam fora da identificação externa.

| Medida independente | Resultado |
| --- | ---: |
| Novos perfis externos | 5 |
| Pessoas externas com vídeo `completed` criado na janela | 5 |
| Pessoas externas com `checkout_started` na janela | 0 |
| Eventos externos `payment_success` / `subscription_invoice_paid` | 0 |

Os cinco cadastros não são necessariamente os mesmos cinco autores de vídeos. Nenhuma taxa de funil deriva dessa tabela. Zero eventos de pagamento não é reconciliação bancária: caixa, estornos e conciliação por processador permanecem DESCONHECIDOS nesta abertura. Janela comercial começa em 04:45Z; não atribuir resultados anteriores a ela.

EVIDÊNCIA DE PRODUÇÃO complementar, janela DIFERENTE de 24h [14/09 04:45Z,15/09 04:45Z): três pessoas externas abriram checkout (dois Starter via `chatgpt_quickstart_v6`, um Creator sem campanha); nenhuma dessas aberturas ocorreu nas últimas 12h. Não há comprador identificado com caixa aberto nas últimas duas horas para assistência imediata. Não enviar contato por inferência.

### Anti-repetição e decisão

- PARCIAL: recuperação já construída em `docs/SPRINT-VENDA-ASSISTIDA-2026-09-07.md`; não refazer cartas. Coorte de hoje e autorização individual ainda não reconciliadas.
- PARCIAL: `C:/kineo-wt/vendas-v7-12h-20260909` contém checkout cancelado não publicado. Preservar; não construir outro.
- PARCIAL / ação escolhida: `/pricing` diz no FAQ que todo plano pago acessa os motores com saldo suficiente, mas a tabela nega H3 e Kling 2.5 ao Starter. Regressão concreta, não outra landing nem preço novo.
- BLOQUEADA para envio: distribuição por parceiros sem destinatário/canal/conteúdo especificamente liberados nesta janela. Não inventar alcance, respostas ou afiliados ativados.

### Contrato antes de edição

Pessoa que compara Starter → tabela contradiz acesso real → corrigir somente as duas células Starter de H3/Kling 2.5 → tabela existente em `/pricing` → eventos existentes `pricing_view` e `checkout_started`, depois primeira assinatura canônica → medir até 20 pessoas externas identificáveis expostas ou fim da janela; amostra insuficiente é inconclusiva → parar por regressão de preço/CTA/acesso → Codex responsável pela superfície comercial, pedido de coordenação antes do patch.

FATO CONFIRMADO na base: `app/pricing/PricingClient.tsx:165` diz acesso mediante saldo; tabela em 1737/1744 tem travessão no Starter. `lib/enginePlanGate.ts:26` mantém gate futuro em 2099, sem restringir contas atuais; não será editado. Preços, créditos, render, checkout e H3 disponível não mudam.

### Próximo checkpoint

Concluir teste de regressão e comparação visual desta mesma correção, conferir fronteiras/fila e publicar somente depois dos gates. Não abrir nova variante por falta de vendas em meia hora. Estado inicial: baseline registrado; nenhuma venda atribuída, nenhuma mensagem enviada, nenhum código publicado nesta rotação ainda.
