# HANDOFF CODEX → CLAUDE — RODADAS 247–248

**Data:** 2026-09-02
**Workstream:** Growth / B2B
**Escopo:** reconciliação somente leitura da primeira proposta comercial copiada com
Checkout recorrente e pagamento; nenhuma alteração de UI, oferta, preço, crédito,
Checkout, banco, comunicação ou render.

## Resultado principal

**EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-02, contas internas
excluídas:** apareceu a primeira jornada externa completa observável da proposta de agência
até uma assinatura recorrente paga.

| Etapa | Horário BRT | Unidade |
|---|---:|---|
| página de packs vista | 16:50–16:51 | 1 pessoa externa |
| pacote selecionado | 16:52:00 | 1 pessoa externa |
| proposta comercial copiada | 17:05:37 | 1 pessoa externa |
| Checkout Pro mensal iniciado | 17:06:18 | 1 Stripe Session, sem pagamento |
| Checkout Starter mensal iniciado | 17:22:10 | 1 Stripe Session distinta |
| pagamento da assinatura Starter | 17:22:43 | 1 pessoa / 1 Stripe Session / US$ 7,00 |

**FATO FINANCEIRO RECONCILIADO:** a pessoa não tinha payment_success de assinatura
anterior à proposta. O pagamento posterior tem checkout_mode=subscription, valor USD 700
minor units e a mesma Stripe Session do segundo Checkout.

**CLASSIFICAÇÃO:** temporal_assist_not_causal_attribution. A ordem é exata; causalidade
não é. Uma pessoa não permite afirmar que copiar proposta ou trocar Pro por Starter causou
a compra.

## Gate existente

**FATO CONFIRMADO:** o gate agency_margin_proposal do relatório
b2b-subscription-truth-report agora possui o primeiro recurring Checkout exato e o primeiro
pagamento exato após uma proposta copiada. Portanto sai de collecting para
ready_for_assist_review pela regra já publicada.

**DECISÃO:** reconciliar o resultado, mas não reeditar a calculadora, proposta, preços,
planos ou Checkout com n=1.

## Contexto B2B observado

**EVIDÊNCIA DE PRODUÇÃO — últimos 7 dias na consulta:**

- agency_volume_bridge_viewed: 13 pessoas externas e 34 sessões anônimas;
- autopilot_break_even_viewed: 13 pessoas externas e 9 sessões anônimas;
- pricing_business_path_viewed: 5 pessoas externas;
- agency_bulk_page_viewed: 2 pessoas externas e 8 sessões anônimas;
- agency_margin_calculator_viewed: 1 pessoa externa e 8 sessões anônimas;
- agency_margin_proposal_copied: 1 pessoa externa;
- b2b_brief_viewed: 5 sessões anônimas.

Esses números descrevem pessoas e sessões observadas, não receita e não causalidade.

## Próxima hipótese não duplicada

**FATO CONFIRMADO / INVENTÁRIO:** a trilha pública b2b_volume_fit_review_v1 possui
view e submit exatos, mas não entra no relatório de assinatura recorrente. O relatório
comercial atual agrega o formulário e mede pagamento de pack; ele não monta
submit → Checkout recorrente → pagamento.

**PRÓXIMA AÇÃO APROVÁVEL SEM UI:** criar medição isolada e somente leitura da sequência:

view exata → submit salvo → primeiro Checkout recorrente da mesma pessoa externa →
payment_success da mesma Stripe Session.

Regras propostas:

- nunca usar email ou created_at da tabela leads para atribuição;
- submit anônimo só pode resolver via inventário completo da browser session com um único
  dono externo e nenhum conflito;
- saída agregada, sem identificadores ou PII;
- pessoas, browser sessions, Stripe Sessions e receita separados;
- temporal assist, nunca atribuição causal;
- gate de 5 submitters externos resolvidos e 7 dias desde o primeiro submit;
- a primeira Session recorrente antecipa diagnóstico; pagamento antecipa apenas
  reconciliação financeira;
- zero outreach automático: o formulário promete revisão humana.

## Coordenação

- O B2B Answer Engine Router permanece em branch separada, tecnicamente aprovado e
  aguardando aprovação visual específica. Não foi misturado nesta rodada.
- Claude pode ler este handoff pelo Git; nenhuma área de produto pós-login foi alterada.
