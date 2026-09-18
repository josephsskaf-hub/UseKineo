# Afiliados — semana de 18 a 25/09/2026

## R1 — contrato antes de editar (18/09, 05:18 UTC)

**PARCIAL / HIPÓTESE:** pessoas externas indicadas que completam cadastro concorrente → perdedor de corrida de inserção é descrito como nova atribuição → preservar dono canônico e classificar vínculo existente → lib/affiliateAttribution.ts e testes offline já preparados por Parcerias → evento existente affiliate_signup_attribution_result → pagamento não muda nesta correção → reproduzir deterministicamente a corrida 23505 antes/depois → parar se exigir mudança em auth/checkout/webhook ou política → dono Afiliados, handoff Parcerias recebido nesta sessão.

**SUGESTÃO / entrega:** reutilizar scripts/test-affiliate-payment-chain.mjs local de Parcerias, confrontando com origin/main 1c24c07b; alterar apenas a classificação reproduzida e adicionar asserção à bateria de atribuição existente. Nenhuma variante comercial nova. Snapshot financeiro preparado em outra worktree permanece proposta não integrada.

**FATO CONFIRMADO:** lib/affiliateCommission.ts:8 contém taxa global 0.3. **CONTRADIÇÃO:** plano semanal em docs/growth/SEMANA-RECEITA-AFILIADOS-2026-09-18.md:35 relata pedido posterior de20% por12meses. Não mudar política; vigência/coortes/base/marco inicial precisam decisão original e preservação de obrigações existentes.

**DEPENDÊNCIA:** checkout/webhook/auth/admin são de Claude. Diagnósticos reproduzidos serão pedidos em PEDIDOS, sem modificar essas superfícies. Prova offline não equivale a assinatura externa, Stripe TEST, deploy ou receita.

**DUPLICADA:** construir outra bateria do zero; existe harness cedido por Parcerias. **BLOQUEADA:** ativação externa sem aceite confirmado, termos reconciliados e autorização concreta de mensagem. Auditoria privada de81itens de15/09 é o ponto de partida; sem reauditoria ampla ou nomes privados neste documento.

## R1 — resultado local (18/09, 05:19 UTC)

**TESTADO LOCALMENTE:** o harness herdado falhou na base1c24c07b: corrida23505 retornou outcome attributed em vez de already_attributed. A correção mínima em lib/affiliateAttribution.ts:177 preserva a indicação canônica e retorna already=true quando não houve inserção confirmada. Regressão adicionada a scripts/test-affiliate-attribution.mjs:235; nenhuma mudança no cálculo, dono, cookies, política ou escrita de pagamento.

**TESTADO LOCALMENTE:** scripts/test-affiliate-payment-chain.mjs foi reaproveitado e ampliado para executar também GET da rota real /a/[code] em banco simulado vazio, passando seus cookies reais de resposta ao finalizador, depois ao bloco de checkout e à função de comissão extraídos do código atual. 30 verificações passaram: link/cookie90dias, cadastro, primeiro toque, concorrência, prioridade custom sobre Rewardful, primeira compra/renovação/replay, moeda BRL separada e compra avulsa distinta de assinante. Não há HTTP real, Stripe SDK, assinatura de webhook, entrega real de eventos ou compra nessa prova. Caminho por cupom não está simulado.

**TESTADO LOCALMENTE:** attribution92/92; ledger83/83; sharing-safety70; five-improvements640; npx tsc --noEmit --incremental false terminou0; git diff --check sem erro. Fonte: comandos executados nesta worktree em18/09/2026, base1c24c07b.

**CONTRADIÇÃO / diagnósticos legados:** test-afiliado-ref-2026-09-08 falha ao exigir texto literal usekineo.com/a/CODE, enquanto o kit usa www.usekineo.com/a/YOURCODE (docs/KIT-AFILIADOS-2026-09-08.md:64). test-affiliate-destinations falha antes da rota ao exigir /affiliate fora das superfícies, enquanto lib/affiliateFirstClick.ts:13 a inclui. Os quatro arquivos estão idênticos à base (git diff --quiet HEAD confirmou0); não foi removida asserção para obter verde. A nova prova executa diretamente a rota real. Bateria ampla/deploy ainda não certificados.

**TESTADO LOCALMENTE / riscos encaminháveis a Claude:** quatro cenários sintéticos reproduziram: renovação troca converted_at; alterar taxa depois de uma compra faz replay conflitar; trocar profile.affiliate_id redireciona comissão de renovação em desacordo com referral canônico; replay de comissão void volta a marcar referral paid. Fontes: app/api/stripe/webhook/route.ts:501,586,615,632; lib/affiliateLedger.ts:139; probes no harness. Não são incidentes produtivos demonstrados. Duas lacunas de cobertura/estrutura adicionais: bloco de checkout não conserva snapshot imutável de dono/política e switch deste webhook não tem case refund/dispute. Ausência desses cases não prova ausência de todos os processos externos de estorno.

**LOCAL / NÃO PUBLICADO:** patch e harness prontos para revisão; nenhuma superfície produtiva mudou nesta rodada. Contrato de snapshot de Parcerias não copiado nem integrado porque não tem chamador aprovado. **QUESTÃO PENDENTE:** a evidência produtiva histórica de10/09 é compra interna anulada, não receita externa; receita atual desta pista não foi consultada. Nenhum novo contato, anúncio, render ou pagamento executado.

**PRÓXIMA AÇÃO:** Claude revisar dependência financeira AF-SEMANA-R1; Board reconciliar vigência dos termos e publicação do patch local com os gates. Após esse marco, usar somente deltas dos aceites para ativação elegível, sem retomar recusas/cooldowns.
