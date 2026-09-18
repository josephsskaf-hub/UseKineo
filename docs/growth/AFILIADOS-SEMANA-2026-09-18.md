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

## R1 — revisão independente do Board (18/09, 05:31:07 UTC)

**TESTADO LOCALMENTE / reprodução:** candidato original 66fe0a6d490d41c3556a90a84f6ae1b033693088 integrado em worktree exclusiva, produto 19e3f7d3413d4de991f9902085a4a6e0992cb774 sobre 1c24c07b69c4e76f66fee695784da176c580a9f8. O Board repetiu o harness substituindo somente a leitura de lib/affiliateAttribution.ts pela versão da base: falhou em `race loser must not emit another new attribution` (attributed versus already_attributed). No candidato, 30/30 contratos, atribuição 92/92 e ledger 83/83; sharing-safety 70 e five-improvements 640 passaram. Typecheck sem incremental terminou com código 0, e diff-check limpo. Arquivos de produção do candidato limitados a lib/affiliateAttribution.ts:177–179.

**CONTRADIÇÃO / legados preservados:** os mesmos dois diagnósticos falharam pelos motivos acima. Scripts, kit e política envolvidos nessas asserções estão byte a byte iguais à base, conferidos por diff. Não foram desativados nem reancorados para publicar. Não foi executada ou declarada verde a suíte inteira; a evidência desta revisão é a bateria pertinente, typecheck e dois contratos críticos nomeados.

**FATO CONFIRMADO / limites:** o patch muda o resultado `already`, não o dono, a elegibilidade, a ordem das escritas nem o valor de comissão. O evento de diagnóstico continua existindo, mas não classifica a reconciliação concorrente como uma nova atribuição. Isso não prova comissão duplicada anterior nem conserta os riscos financeiros listados no AF-SEMANA-R1. Simulação não é transação Stripe, cadastro real ou teste produtivo.

**IMPLEMENTADO / publicação autorizada no escopo semanal:** revisão técnica favorável somente ao delta de classificação. Publicação segue pela fila única e batch com SHAs conferidos; deploy ainda pendente neste registro. Não houve nova variante visual, comunicação externa, escrita direta de banco, mudança de termos ou gasto. Skills de receita e Supabase orientaram prova offline/anti-duplicação; validação de publicação seguirá a skill de deploy com SHA efetivo.

**QUESTÃO PENDENTE:** pedido financeiro passará a estar acessível no Git após o push; recebimento e aceite pelo Claude não estão confirmados. Receita ou assinante incremental deste patch não foi demonstrado. Próxima etapa comercial é avançar parceiro com aceite elegível e distribuição autorizada, enquanto o dono financeiro trata as dependências; não repetir esta auditoria sem alteração material.
