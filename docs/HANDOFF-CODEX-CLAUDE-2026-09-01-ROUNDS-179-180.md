# HANDOFF CODEX → CLAUDE — RODADAS 179–180

**Data da medição:** 2026-09-01/02 · **workstream:** Growth B2B + integridade de afiliados · **base:** `575424c54811385144e296893c56e6d151b4fe33`

## Decisão do fundador

**DECISÃO APROVADA:** Kineo cobra e comunica preços somente em USD. A confiança no último segundo vem da consistência entre a promessa no site e a moeda exibida no checkout. Não localizar moeda, não alterar preço e não sugerir cobrança local.

## Resultado desta rodada

**EVIDÊNCIA DE PRODUÇÃO — SELECT em 2026-09-02 02:14–02:15 UTC, contas internas excluídas:**

- o formulário de briefing B2B teve 4 sessões anônimas externas com `b2b_brief_viewed` em 7 dias e zero `b2b_brief_submitted`/`b2b_brief_failed`;
- `leads.source = 'b2b_agency_intake'`: zero leads externos em 7/14/30 dias e zero no total;
- o planejador gratuito teve 1 sessão anônima externa em `business_content_plan_viewed` e zero geração, cópia, ativação ou clique em pacote;
- o caminho empresarial de alternativa teve 1 pessoa autenticada externa em `enterprise_alternative_business_path_viewed` e nenhum avanço medido;
- `profiles.affiliate_id`: zero pessoas externas;
- `affiliate_commissions`: zero linhas, zero moedas e zero comissão sem referral;
- zero afiliados com earnings positivos e zero referral pago.

Eventos, sessões e pessoas foram mantidos separados. Sessão anônima não foi chamada de pessoa.

## Auditoria de código

**FATO CONFIRMADO:** `/api/lead-capture` atualiza `source` e `magnet` quando um e-mail antigo volta com intenção B2B, mas preserva o `created_at` antigo (`app/api/lead-capture/route.ts:162-169`). O inbox administrativo filtra e ordena leads B2B por `created_at` (`app/api/admin/funnel/route.ts:482-499`). Um lead antigo reclassificado poderia ficar enterrado, mas não há vítima externa registrada hoje.

**FATO CONFIRMADO:** o checkout mantém fallback legado para `profiles.affiliate_id` (`app/api/stripe/checkout/route.ts:274-298`) e o webhook aceita comissão com `referral_id = null` (`app/api/stripe/webhook/route.ts:373-391`). O ledger só marca referral como pago quando o id existe (`lib/affiliateLedger.ts:129-134`). A incoerência é possível em código, mas produção tem zero ocorrência.

**FATO CONFIRMADO:** o ledger preserva `currency`, porém API/UI de afiliado agregam comissão sem separar moeda (`app/api/affiliate/me/route.ts:223-240`; `app/(dashboard)/affiliate/page.tsx:809-816`). Como o checkout canônico atual é USD-only e não existe comissão registrada, o risco é histórico/latente, não um incidente vivo.

## Decisão de produto e gate

**NO-GO:** nenhuma mudança de UI, checkout, afiliados ou banco nesta rodada. Alterar uma superfície com 1–4 sessões e zero avanço seria otimização sem amostra.

**GATE B2B:** preservar a variante até uma destas condições:

1. 20 sessões externas por superfície; ou
2. primeiro `business_content_plan_generated`, `b2b_brief_submitted`, clique de pacote, checkout bulk ou pagamento B2B.

**GATE DE INTEGRIDADE:** se surgir ao menos 1 pessoa com `profiles.affiliate_id` sem referral correspondente, ou 1 comissão com `referral_id IS NULL`, corrigir ownership no backend antes de payout. Se aparecer moeda diferente de USD, apresentar totais por moeda sem conversão implícita.

**Próxima rodada recomendada:** voltar ao B2C enquanto a amostra B2B acumula. Não reeditar o modal pós-trial até 20 pessoas em `trial_downgrade_offer_viewed` ou ação/pagamento anterior ao gate.

## Escopo e segurança

- somente leitura em código e banco;
- nenhuma escrita em banco;
- nenhuma comunicação externa;
- nenhum render, preço, crédito, SKU, checkout ou moeda alterados;
- nenhum código de produto alterado nesta rodada.
