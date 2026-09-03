# HANDOFF CODEX → CLAUDE — ROUNDS 271–272

**Data:** 03/09/2026
**Worktree:** `codex-b2c-round-271-272`
**Base:** `5271e0e95f67d64578267a579352cb04cd9d4bae`
**Estado:** **IMPLEMENTADO LOCALMENTE · NÃO PUBLICADO**

## 1. Sinal de negócio reconciliado

**EVIDÊNCIA DE PRODUÇÃO — Supabase, SELECT somente leitura, 03/09/2026 04:13 UTC:** na faixa equivalente de seis horas, comparada ao mesmo horário do dia anterior, sessões de landing caíram de 102 para 39, sessões atribuídas a ChatGPT de 16 para 5, novos perfis externos de 16 para 7 e pessoas externas com Checkout recorrente de 4 para 2. Pessoas externas com vídeo concluído subiram de 5 para 7.

**EVIDÊNCIA DE PRODUÇÃO — mesma fonte e data:** nas 24 horas móveis, sessões de landing subiram de 256 para 309, novos perfis externos de 32 para 47, pessoas externas com vídeo concluído de 18 para 37, pessoas externas com Checkout recorrente de 5 para 9 e pagamentos exatos de assinatura de 0 para 1. Sessões atribuídas a ChatGPT caíram de 48 para 35.

**CONCLUSÃO:** a queda recente informada pelo fundador é real na janela horária comparável, especialmente no canal ChatGPT e no Checkout. Ela ainda não é uma regressão de 24 horas do funil inteiro.

**QUESTÃO PENDENTE:** não existe evidência causal que ligue a queda a uma mudança específica. O declínio horário começou antes dos commits Growth mais recentes, e `9cdc31d2` alterou somente o CTA do cabeçalho da superfície de agência; não tocou home, landing B2C nem Checkout.

## 2. Regra operacional adicionada ao core de Growth

**DECISÃO APROVADA PELO FUNDADOR:** assinatura e receita real são o placar. Tráfego, cadastro, vídeo, clique e Checkout são estágios, não vitória financeira.

**DECISÃO APROVADA PELO FUNDADOR:** observação deve terminar em decisão executável. Repetir relatório, landing, CTA ou hipótese já instrumentada não conta como ação nova. Se uma superfície ainda aguarda amostra, ela congela e a próxima rodada ataca outro estágio do funil.

**IMPLEMENTADO LOCALMENTE:** essas regras foram registradas no topo de `docs/workstreams/GROWTH.md`, junto ao foco cinquenta por cento B2C e cinquenta por cento B2B.

## 3. Ação nova — prompt útil sem perder a volta para a Kineo

**HIPÓTESE:** a landing `/chatgpt-to-youtube-shorts` ensina um prompt útil, mas exige seleção manual de um bloco longo e não oferece um caminho explícito de volta ao handoff de roteiro. Reduzir essa fricção pode aumentar envios de roteiro sem criar outra landing ou outro desconto.

**IMPLEMENTADO LOCALMENTE:** o prompt ganhou cópia por um clique. Após cópia confirmada, a pessoa pode abrir ChatGPT em nova aba e voltar ao formulário existente da Kineo. A aba da Kineo permanece aberta.

**CORREÇÃO DE AUDITORIA:** a primeira versão anexava um URL à instrução do modelo. Três revisores apontaram que essa linha poderia entrar no modo `verbatim`, ser narrada e virar legenda. A versão foi barrada antes do push. A versão atual copia exatamente o prompt visível, sem URL, propaganda ou texto adicional.

**TELEMETRIA:** `chatgpt_prompt_loop_viewed`, `chatgpt_prompt_loop_copied` e `chatgpt_prompt_loop_manual_copy_opened`, com payload fechado e sem prompt, tópico, PII ou UTM livre.

**CONTRATO DE CONTAGEM:** visualização, cópia e handoff anônimos são sessões, nunca pessoas. Handoff exato significa `organic_topic_submitted` posterior a `chatgpt_prompt_loop_copied` na mesma sessão Kineo. Só depois de uma sessão resolver para exatamente um usuário externo ela pode alimentar contagem de pessoas; pagamento e receita exigem a mesma Stripe Session canônica.

**GATE:** coletar por sete dias individuais ou até pagamento terminal, com pelo menos 20 sessões de visualização humana, 5 sessões de cópia e 5 handoffs ordenados na mesma sessão. Cross-tab, retorno posterior, sessão anônima, dono múltiplo e evento ambíguo ficam como desconhecidos.

**TESTADO LOCALMENTE:** `test-chatgpt-prompt-loop.mjs` 76/76; `test-chatgpt-script-handoff.mjs` 80/80; `diff --check` limpo. Typecheck preserva somente os três erros do baseline: duas versões Stripe e o contrato assíncrono de `TrialDowngradeModal`.

**BLOQUEADO PARA PUSH:** a comparação visual antes/depois está em `docs/previews/CHATGPT-PROMPT-LOOP-2026-09-03.html`, mas a conexão de automação com o Chrome do fundador não iniciou. Como a regra visual do repositório exige inspeção real, não houve commit, push ou deploy.

## 4. Não duplicar

- B2B agência permanece congelado até o gate registrado em `docs/HANDOFF-CODEX-CLAUDE-2026-09-03-ROUNDS-269-270.md`.
- Não tocar em render, cenas, voz, legendas, créditos, preço, Checkout ou oferta.
- Não declarar conversão do novo loop antes de existir o relatório reconciliador fail-closed.
- Próxima ação deve atacar outro estágio livre do funil; não reeditar esta landing enquanto coleta amostra.
