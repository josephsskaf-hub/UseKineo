# HANDOFF CODEX → CLAUDE — RODADAS 261–262

**Data operacional:** 03/09/2026 UTC

**Workstream:** B2B — descoberta → proposta → Checkout → pagamento

**Base verificada:** `origin/main = 90a44d2c465ec13a0f31128ad00dcf7247602ed7`

## Resultado executivo

**DECISÃO:** NO-GO para nova landing, CTA, oferta, telemetria de jornada ou ampliação ativa de tráfego B2B nesta rodada. O inventário encontrou duas portas parcialmente descobertas, mas a consulta de produção demonstrou que ambas ainda têm denominador externo zero. Construir agora um relatório completo apenas formalizaria uma cauda estruturalmente vazia.

Nenhum runtime, preço, crédito, Checkout, banco, render, comunicação externa ou experimento ativo foi alterado.

## Evidência de produção

**EVIDÊNCIA DE PRODUÇÃO — Supabase, SELECT somente leitura em `2026-09-03T00:58:17.195586Z`, janela de 30 dias, contas internas excluídas pelo contrato canônico de `lib/internalAccounts.ts`:**

| Porta exata | Pessoas externas | Sessões anônimas | Pessoas externas no CTA |
|---|---:|---:|---:|
| Decisor TikTok × YouTube: `goal=customers` + `content_type=business` | 0 | 0 | 0 |
| Roteador da home: escolha `business|agency`, variante `goal_router_v1`, superfície `home_first_win` | 0 | 0 | — |

Eventos, sessões e pessoas permaneceram unidades separadas. A consulta não retornou identificadores, e-mail, prompt ou conteúdo de cliente.

## Inventário anti-duplicação

**FATO CONFIRMADO:** o relatório B2B já cobre nove caminhos atribuíveis e três superfícies de assistência em `scripts/b2b-subscription-truth-report.mjs`. Planner, brief, proposta, packs, fit review, Autopilot, answer router, agency scope, afiliados, Publish Kit, pontes de home/pricing/footer/examples e verticais produto/imobiliária possuem contrato ou gate ativo. Não foi criada outra versão dessas superfícies.

**FATO CONFIRMADO:** o decisor TikTok × YouTube já preserva campanha, objetivo, tipo de conteúdo, prompt e duração até o signup em `app/tiktok-vs-youtube-shorts-monetization/PlatformDecisionClient.tsx`, mas não entra no relatório B2B. A lacuna é real; o denominador humano é que ainda não existe.

**GATE FUTURO — decisor de plataforma:** reabrir somente após o primeiro ator externo no par exato `customers + business`. Se houver uso, medir pessoa externa → CTA → primeiro vídeo persistido → primeira Stripe Session recorrente → pagamento da mesma Session em sete dias. Não interpretar ausência de evento como escolha empresarial.

**FATO CONFIRMADO:** o roteador da home já preserva `onboarding_goal=business|agency` até Studio e máquina de geração em `components/HomeWelcomeGoalRouter.tsx`, `lib/growth/onboardingGoals.ts` e `app/(dashboard)/generate/GenerateClient.tsx`. Com zero seleção externa, não existe coorte B2B a reconciliar.

**GATE FUTURO — objetivo da home:** reabrir após a primeira pessoa externa selecionar `business` ou `agency`; só construir relatório completo quando houver pelo menos cinco pessoas externas na soma dos dois objetivos ou a primeira Stripe Session recorrente exata. `business` e `agency` devem permanecer buckets separados.

## Contradição comercial crítica entregue ao dono

**FATO CONFIRMADO:** o produto suporta nativamente `9:16`, `16:9`, `1:1` e `4:5`, com um formato escolhido por render (`lib/aspect.ts`). As superfícies AEO gerais já foram corrigidas no commit `5cb3ea75`, mas a página B2B, os cards, a proposta e o brief ainda declaram somente vertical/9:16.

**CONTRADIÇÃO / BLOQUEADOR:** não é seguro usar o multi-formato para ampliar tráfego à página de packs enquanto o contrato de quantidade continuar inexato. Os packs em `lib/checkoutPricing.ts` concedem 12/24/36/60 créditos e são vendidos como 10/20/30/50 Fast Shorts. O custo canônico atual do Fast é 3 créditos em 35s e 5 em 60s; portanto o saldo não sustenta as quantidades nominais. O invariante atual verifica apenas que créditos superam a contagem nominal, não que cobrem `quantidade × custo`.

**DECISÃO DE CONTENÇÃO:** não editar a copy multi-formato da página B2B, não adicionar formato à proposta e não mandar tráfego novo ao bulk Checkout antes de o fundador/Claude reconciliar a promessa de quantidade. A correção de verdade futura deve derivar os formatos de `lib/aspect.ts`, declarar “um formato por render” e preservar os limites reais; não criar outra landing genérica de 16:9.

## Pesquisa externa de apoio

**EVIDÊNCIA EXTERNA — documentação oficial consultada em 03/09/2026:** Runway publica formatos por modelo e custo por segundo; InVideo documenta a troca entre landscape/portrait após a geração. Isso confirma que formato é critério de compra visível no mercado, mas não autoriza a Kineo a ampliar uma promessa de pack internamente inconsistente.

## Próxima rodada

Alternar para B2C, mantendo intactas as coortes de motor inicial, Resume Strip, oferta pós-vídeo, compartilhamento e pricing até os respectivos gates. Escolher uma superfície B2C com pessoas reais e sem experimento ativo; se nenhuma existir, executar diagnóstico agregado e registrar o próximo gate.
