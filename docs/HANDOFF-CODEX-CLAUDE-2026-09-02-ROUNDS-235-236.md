# HANDOFF CODEX → CLAUDE — RODADAS 235–236

**Data:** 2026-09-02
**Workstream:** Growth / B2B
**Escopo:** verdade de medição entre proposta comercial copiada e assinatura recorrente; nenhuma alteração visual, de oferta, preço, crédito, Checkout, banco ou render.

## Resultado

**IMPLEMENTADO E TESTADO LOCALMENTE:** o relatório B2B passa a medir, de forma fail-closed, a sequência proposta comercial copiada → Checkout recorrente posterior → pagamento exato da mesma Stripe Session.

**FATO CONFIRMADO:** o produto emite agency_margin_proposal_copied com version=agency_margin_proposal_v1, definida em lib/growth/agencyProposal.ts e usada por app/ai-shorts-for-agencies/AgencyMarginCalculator.tsx. O relatório exigia incorretamente agency_margin_v1_2026_08_27, versão dos eventos de visualização e escolha de pack. O teste repetia a constante errada do próprio relatório e por isso não testava o contrato real.

**FATO CONFIRMADO:** a versão agora é separada por evento. O teste lê a constante do emissor real. Versão ausente, antiga ou desconhecida é excluída da coorte e aparece em invalidProposalVersion.

## Regra financeira e de identidade

**FATO CONFIRMADO:** assistedRecurringSubscription é associação temporal, nunca atribuição causal. Para entrar, a jornada precisa:

1. ter proposta copiada pela mesma pessoa externa identificada;
2. ter Checkout recorrente válido posterior, sem SKU avulso;
3. ocorrer em até sete dias;
4. resolver no ledger canônico como unpaid ou paid, sem conflito;
5. usar a mesma Stripe Session e o mesmo proprietário externo.

**FATO CONFIRMADO:** cópia anônima continua visível em proposalCopied.anonymousSessions, mas nunca é promovida a pessoa, Checkout ou receita. O runner busca eventos allowlisted, não todos os eventos da sessão; portanto ausência de outro dono no subconjunto não provaria unicidade.

Packs avulsos, piloto Autopilot, Checkout anterior à proposta, proposta fora de sete dias, conta interna, pagamento inválido, conflito de identidade/produto/timeline e Session sem vínculo falham fechados.

## Evidência e gate

**EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-02 14:36 BRT:** nos 30 dias anteriores à consulta, agency_margin_proposal_copied tinha zero linhas em qualquer versão. O zero anterior do relatório não podia provar isso por causa da versão errada; a consulta direta provou. Não há assinatura B2B a atribuir ou superfície a reeditar.

**DECISÃO:** preservar a experiência atual. O gate permanece collecting até cinco pessoas externas identificadas copiarem proposta ou aparecer a primeira Stripe Session recorrente exata posterior à proposta. Sessões anônimas nunca satisfazem o gate de pessoas. Pagamento abre reconciliação financeira, não prova causalidade.

## Auditoria e testes

- Auditoria adversarial executada antes da publicação.
- Achados corrigidos: ledger em conflito abrindo gate; sessões anônimas somadas como pessoas; sessão compartilhada falsamente considerada unívoca; limitação do runner que tornava qualquer vínculo anônimo não demonstrável.
- test-b2b-subscription-truth-report.mjs: **78/78**.
- test-subscription-revenue-ledger.mjs: **31/31**.
- test-b2b-commercial-funnel-report.mjs: **98/98**.
- Total relacionado: **207/207**.
- git diff --check: limpo.
- Typecheck: somente os três erros preexistentes em app/api/admin/_shared/mrr.ts:113, app/api/me/subscription/route.ts:83 e components/TrialDowngradeModal.tsx:334.

## Decisão comercial preservada

**DECISÃO APROVADA:** UseKineo comunica e vende em USD. Este trabalho não altera moeda, preço, SKU, oferta nem Checkout.

## Próxima hipótese não duplicada

**SUGESTÃO:** usar a força do canal ChatGPT para explicar, sem promessa nova, que os planos mensais self-service também servem a um único operador produzindo conteúdo comercial recorrente. Antes de qualquer mudança AEO, definir campanha exata, métrica por pessoa e pagamento, e confirmar que a mensagem não confunde os packs avulsos com planos de equipe.

## Estado Git

- Base inicial: b41b7673a5229f389655c1dee2fde7069ef7a060.
- Branch: codex/b2b-proposal-assist-truth-v1.
- Publicação: pendente dos gates finais desta rodada.
