# HANDOFF CODEX → CLAUDE — RODADAS 257–258

**Data:** 2026-09-02

**Escopo:** B2B, destino `business` do programa de afiliados → plano gratuito de conteúdo → primeira Stripe Session recorrente → pagamento da mesma Session. A entrega acrescenta atribuição categórica e medição agregada; não cria nova landing, não muda oferta, preço, crédito, Checkout, banco, render ou comunicação externa.

## Hipótese e decisão antes da edição

**HIPÓTESE:** o plano gratuito de conteúdo pode ser uma ponte útil entre a indicação de um afiliado B2B e uma assinatura, mas o caminho exato ainda não tem amostra de pessoas externas.

**DECISÃO:** não reeditar a landing nem criar outra oferta. Primeiro preservar a atribuição `affiliate / partner / affiliate_business_plan` até o plano e medir o caminho completo com cutoff individual de sete dias.

## Evidência anterior à implementação

**EVIDÊNCIA DE PRODUÇÃO — Supabase, consulta somente leitura em 2026-09-02T23:22:25.842351Z, contas internas excluídas:** havia 11 pessoas externas com candidatura de afiliado. Em 2026-09-02 havia uso dos destinos `script`, `video` e `faceless`, mas o destino `business` tinha 0 cópias de link, 0 cliques humanos e 0 afiliados com clique. Em 30 dias havia 0 linhas externas em `affiliate_referrals`, 0 perfis com o triplete exato `affiliate / partner / affiliate_business_plan` e 0 pessoas no caminho referral + plano B2B exato.

**EVIDÊNCIA DE PRODUÇÃO — mesma consulta e data:** o planner B2B tinha 1 visualização anônima e 2 eventos de 1 pessoa externa classificados como `direct_or_other`; isso não demonstra origem por afiliado.

**DECISÃO DE GATE:** estado inicial `collecting`. Reavaliar após pelo menos 5 pessoas externas maduras e 7 dias individuais, ou após a primeira Stripe Session recorrente exata para reconciliação. Um primeiro pagamento abre reconciliação; nunca vira atribuição causal automática.

## Contrato mensurável

- o triplete exato do destino B2B é `utm_source=affiliate`, `utm_medium=partner`, `utm_campaign=affiliate_business_plan`;
- a landing e o planner precisam concordar com destino, variante, superfície, versão, entrada e campanha canônicos;
- a pessoa precisa ter perfil externo com relógio válido, referral canônico e afiliado ativo, externo e não autorreferido;
- o e-mail canônico do afiliado precisa coincidir com o perfil do proprietário, sem aparecer na saída;
- sessão anônima só recebe dono existente até o cutoff; dono futuro, empate ambíguo ou conflito de identidade falham fechados;
- primeira intenção recorrente anterior ou empatada ao anchor exclui a atribuição; pagamento bruto anterior/empatado à primeira Session canônica bloqueia a reconciliação;
- primeira Stripe Session recorrente canônica controla o funil; uma Session posterior paga nunca substitui a primeira;
- pagamento precisa pertencer à mesma Session, depois do Checkout e dentro do cutoff;
- packs são medidos separadamente de assinatura;
- receita permanece em unidade minoritária, separada por moeda válida de três letras;
- cutoff individual é imutável: perfil + sete dias;
- saída é agregada e não contém e-mail, ID de pessoa, browser session ou Stripe Session;
- a atribuição é rotulada como assistência de campanha, não causalidade de clique protegido, porque o referral canônico ainda não persiste destino nem click ID.

## Arquivos

- `lib/growth/businessContentPlan.ts` — reconhece a entrada afiliada B2B e preserva o triplete no cadastro;
- `scripts/affiliate-business-subscription-report.mjs` — relatório puro e gate fail-closed;
- `scripts/measure-affiliate-business-subscription.mjs` — coletor paginado e com inventário completo das sessões candidatas;
- `scripts/test-affiliate-business-subscription.mjs` — fixtures adversariais do caminho completo;
- `scripts/test-business-content-plan.mjs` — contrato cruzado com o destino canônico.

## Estado pré-publicação

**TESTADO LOCALMENTE:** 945/945 verificações verdes:

- `test-affiliate-business-subscription.mjs`: 118/118;
- `test-business-content-plan.mjs`: 213/213;
- `test-subscription-revenue-ledger.mjs`: 31/31;
- `test-affiliate-funnel-report.mjs`: 45/45;
- `test-b2b-subscription-truth-report.mjs`: 101/101;
- `test-b2b-subscription-truth-loader.mjs`: 14/14;
- `test-b2b-commercial-funnel-report.mjs`: 102/102;
- `test-affiliate-destinations.mjs`: 266/266;
- `test-affiliate-landing-context.mjs`: 55/55.

**TESTADO LOCALMENTE:** `node --check` nos três arquivos novos e `git diff --check` limpos. O typecheck reproduziu somente os três erros preexistentes em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:83` e `components/TrialDowngradeModal.tsx:334`; nenhum pertence à entrega.

**AUDITORIA INDEPENDENTE:** GO de lógica, P0=0 e P1=0. O P2 operacional exige rebase na ponta atual e repetição dos gates antes do push.

## Publicação e validação

**QUESTÃO PENDENTE:** preencher depois do rebase, push fast-forward e deploy `READY` com o SHA exato.

## Próxima rodada

Alternar para B2C. Não tocar novamente no destino afiliado B2B nem no planner antes do gate mínimo; a próxima hipótese deve atacar uma superfície diferente do caminho primeiro vídeo → assinatura.
