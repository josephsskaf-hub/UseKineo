# HANDOFF CODEX → CLAUDE — 2026-09-02 — rodadas 229–230

**Workstream:** Growth + Data · entrada ChatGPT → primeira entrega → Checkout → assinatura
**Snapshot de produção:** 2026-09-02 12:23 BRT
**Base auditada:** `origin/main` em `c4146953a23e87d02c8a80dd57429e737aa28a50`
**Escopo:** consultas `SELECT` no Supabase de produção, leitor local e testes; nenhuma UI, oferta, preço, crédito, Checkout, render, banco ou comunicação externa alterada

## Resultado executivo

**FATO CONFIRMADO:** `/free-ai-shorts-generator` possui CTAs para o formulário ou cadastro, sem destino direto de Checkout no código auditado.

**EVIDÊNCIA DE PRODUÇÃO / ASSOCIAÇÃO, NÃO CAUSALIDADE:** das três pessoas externas de assinatura já publicadas no diagnóstico pré-vídeo da página, duas Sessions possuem uma ação `trial_active_banner` da mesma pessoa e sessão de navegador nos cinco minutos anteriores; a terceira não possui ação cliente allowlisted e permanece `unattributed`. Essa proximidade não prova que o banner causou o Checkout nem exclui influência anterior da landing. Uma quarta jornada bruta foi um piloto avulso associado a pricing e continua corretamente fora do ledger de assinatura.

**EVIDÊNCIA DE PRODUÇÃO / JANELA HISTÓRICA:** as três Sessions de assinatura pré-vídeo ocorreram antes de `2026-08-29T22:50:00Z`, fronteira em que o banner passou a orientar a primeira entrega antes do Checkout. Com `n=3` histórico e produto posterior diferente, não existe evidência suficiente para atribuir o resultado à landing nem para reeditá-la.

**EVIDÊNCIA DE PRODUÇÃO / GATE LIMPO:** após a fronteira limpa `2026-09-01T17:16:45.551Z`, 40 pessoas externas distintas receberam `trial_active_banner_shown` com `first_delivery_eligible=true` e versão `trial_first_seedance_35s_v2`. Sete clicaram; três chegaram a `trial_first_delivery_generate_committed`; duas concluíram vídeo atribuído à missão; nenhuma das sete chegou a Checkout e nenhuma pagou. Três pessoas da coorte chegaram a Checkout sem clicar a missão. Contagem por pessoa, contas internas excluídas.

**HIPÓTESE:** o vazamento observável da missão está entre o clique no banner e o compromisso no cockpit do Studio: quatro de sete clickers não chegaram ao evento intermediário. Isso não autoriza remover a revisão nem iniciar render automaticamente. O passo pertence ao caminho de produto autenticado e precisa ser auditado pelo Claude antes de qualquer mudança em `StudioClient.tsx`.

## Medição implementada

**IMPLEMENTADO:** `scripts/chatgpt-entry-subscription-report.mjs`, schema `chatgpt_entry_subscription_v2`, agora agrega a origem associada aos Checkouts pré-vídeo sem expor Stripe Session ID. A origem usa somente uma superfície allowlisted gravada no início ou ações allowlisted da mesma pessoa e sessão de navegador nos cinco minutos anteriores ao `checkout_started`. O evento canônico `checkout_cta_clicked` tem precedência sobre duplicatas legadas assíncronas; ausência ou conflito de prova vira `unattributed`.

Categorias estáveis: `trial_active_banner`, `pricing_page`, `checkout_resume`, `post_video`, `other_tracked` e `unattributed`. Cada bucket separa pessoas, Stripe Sessions, pessoas pagas, Sessions pagas e receita reconciliada por moeda. Pessoas são distintas dentro do bucket, mas não aditivas entre origens: uma pessoa com duas Sessions pode aparecer em duas origens. Packs continuam fora por contrato do ledger.

**TESTADO LOCALMENTE:** relatório ChatGPT 50/50; ledger de assinatura 31/31; relatório B2B 58/58; `git -c core.whitespace=cr-at-eol diff --check` limpo. O runner de produção não foi executado localmente porque a worktree não recebe as variáveis de serviço; a coorte real foi reconciliada por `SELECT` via conector Supabase.

## Decisões e gates

**SUGESTÃO:** preservar `/free-ai-shorts-generator` durante este gate; nenhuma nova copy, CTA ou preço deve entrar ali por causa deste diagnóstico. A landing tem 29 pessoas externas atribuídas, 15 com vídeo concluído e nenhum Checkout pós-vídeo na janela publicada às 11:28 BRT. As associações históricas pré-vídeo são pequenas e anteriores ao produto atual; não autorizam uma conclusão causal sobre a landing.

**GATE ATINGIDO / PRÓXIMO DONO:** a missão ultrapassou o gate de dez pessoas elegíveis. Claude deve auditar as quatro jornadas `trial_first_delivery_clicked → sem trial_first_delivery_generate_committed`, distinguindo abandono humano, navegação quebrada e concorrência de superfície. Não iniciar automaticamente análise/render, não gastar crédito e não retirar a revisão para fabricar conversão.

**PRÓXIMA AÇÃO CODEX:** alternar para B2B ou outra superfície Growth livre, sem reeditar TrialActiveBanner, Studio, pricing ou Checkout durante esta investigação. Assinatura real e receita reconciliada continuam sendo o placar; clique, vídeo e Session são etapas.

**NÃO TOCADO:** `app/free-ai-shorts-generator/page.tsx`, `components/TrialActiveBanner.tsx`, `app/(dashboard)/studio/StudioClient.tsx`, `GenerateClient.tsx`, Stripe, Supabase schema/dados, preço, créditos, trial financeiro, render, cenas, voz, legendas, admin, e-mail, outreach ou tráfego ativo.
