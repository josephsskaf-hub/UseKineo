# HANDOFF CODEX → CLAUDE — CAIXA ROUND 2

**Data:** 2026-09-03 21:54 BRT  
**Pista:** Growth-B2C / CAIXA  
**Branch:** `codex/caixa-checkout-intent-r2`  
**Base:** `origin/main` em `d6d3ad44`

## FATO CONFIRMADO — o mesmo número escondia causas opostas

`checkout_started` não registrava quantos filmes a pessoa já tinha, se o grant
estava intacto nem se ela havia chegado com roteiro pronto
(`app/api/stripe/checkout/route.ts`, antes desta rodada). Assim, checkout sem
filme era tratado como uma causa quando era apenas um resultado.

## EVIDÊNCIA DE PRODUÇÃO — 2026-09-03, Supabase somente leitura

- Coorte externa, 30 dias, uma pessoa por checkout mais recente: 34 pessoas
  chegaram ao checkout sem filme; 4 tinham sinal explícito de roteiro pronto e
  30 não tinham esse sinal.
- O sinal usa apenas categorias já emitidas (`finished_script` ou
  `script_mode=verbatim`); nenhum roteiro ou prompt foi lido ou gravado.
- Placar do marco `2026-09-03 16:00 UTC`: 15 cadastros, 10 pessoas com filme,
  1 checkout de desejo, 1 checkout sem filme, 0 assinaturas e 0 pessoas com
  falha sem filme.
- Vigia das últimas 2h: 0 pessoas externas com checkout aberto sem pagamento.

## IMPLEMENTADO

- `lib/growth/checkoutIntent.ts`: classificador fechado `desire`,
  `ready_script`, `activation_defect` ou `unknown`.
- `app/api/stripe/checkout/route.ts`: antes de criar a sessão Stripe, registra
  `videos_ok`, `credits_intact`, `had_finished_script` e
  `checkout_intent_class`. Leitura indisponível nunca bloqueia a compra: vira
  `unknown`.
- `scripts/test-checkout-intent.mjs`: 17 verificações executáveis, incluindo
  fail-closed da classificação e ausência de roteiro bruto na telemetria.

## TESTADO LOCALMENTE

- `node scripts/test-checkout-intent.mjs` → 17/17.
- `node node_modules/typescript/bin/tsc --noEmit --pretty false` → exit 0.
- `node scripts/test-guardiao-yaml-2026-09-03.mjs` → 12/12.
- `git -c core.whitespace=cr-at-eol diff --check` → limpo.

## BLOQUEIOS / COORDENAÇÃO

- `GenerateClient.tsx`: tentativa da sala de espera interrompida antes de
  commit/push porque é arquivo compartilhado e está na pista do Claude.
- K1 (`paywall só depois do primeiro filme`): o modal vivo está inline em
  `GenerateClient.tsx`; `components/UpgradeModal.tsx` não tem chamador. Não foi
  alterado. K3 entra primeiro para separar com segurança quem K1 pode atingir.
- Limitação operacional: `apply_patch` não conseguia editar a worktree oculta
  `.codex`; a rodada foi movida para `worktrees/` e o patch permaneceu
  auditável. Isso fez a rodada ultrapassar o teto operacional de 20 minutos.

## COMO MEDIR

Após o deploy, agrupar pessoas externas por `checkout_intent_class` e cruzar
com `checkout_success_viewed`. Não comparar eventos brutos. Gate: nenhuma
classe deve ser usada para mudar UX antes de pelo menos 5 pessoas classificadas
ou 24 horas, o que vier por último.

## PRÓXIMA JOGADA

K2: cumprir o pedido aberto do ChatGPT com uma superfície Growth própria,
prometendo com precisão que o roteiro completo pode ser colado e que diretivas
visuais não serão narradas. Não tocar no parser do Claude.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

O caixa passa a distinguir comprador que já viu valor, comprador com roteiro
pronto e pessoa bloqueada antes do primeiro filme. Isso impede atacar os três
com a mesma tela e medir uma melhora falsa.
