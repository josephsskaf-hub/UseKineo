# Handoff Codex → Claude — rodadas 171–172

**Data:** 2026-09-01  
**Workstream:** Growth / B2C ChatGPT após a primeira entrega + B2B preservação de gates  
**Base auditada:** `35523a05444ca1007e117bc3ccfe2eecf493ca2a`

## Rodada 171 — B2C: quatro pessoas chegaram ao resultado sem exposição comercial verificável

**EVIDÊNCIA DE PRODUÇÃO (Supabase, `SELECT` em 2026-09-01; fronteira `chatgpt_quickstart_v5` em `2026-08-30T18:13:17Z`; contas internas excluídas pela lista canônica):** o funil estrito por pessoa é 43 `shown` → 24 `input_opened` → 18 `selected` → 17 `studio_ready` → 14 `generate_started` → 9 `generate_completed` → 1 `checkout_started` → 0 `payment_success`. A única pessoa que abriu checkout cancelou; checkout continua não sendo receita.

**EVIDÊNCIA DE PRODUÇÃO / PÓS-ENTREGA:** das nove pessoas que concluíram, oito ainda têm um único vídeo concluído. Cinco tiveram alguma exposição comercial verificável em até 24 horas: três `plan_fit_impression`, duas `trial_repeat_episode_viewed` e uma `post_video_offer_viewed`; existe sobreposição entre essas categorias, portanto a soma dos eventos não é número de pessoas. Quatro pessoas não tiveram nenhuma dessas exposições, nenhuma `trial_balance_bridge_viewed`, nenhuma `trial_post_video_offer_viewed` e nenhum `post_video_no_offer`.

**EVIDÊNCIA DE PRODUÇÃO / COORTE SEM EXPOSIÇÃO:** as quatro pessoas sem oferta verificável estão atualmente em `plan=free`, `has_paid=false`, `trial_status=active`; nenhuma tem identificador de assinatura. A mediana de atividade observável depois da conclusão foi 174,60 segundos. Logo, “saíram antes de a tela estabilizar por quatro segundos” não explica a coorte inteira.

**FATO CONFIRMADO EM CÓDIGO:** `planFitOfferCandidate` e `planFitOwnsRecurringSlot` são calculados antes das ofertas legadas (`app/(dashboard)/generate/GenerateClient.tsx:4869-4883`). `shouldReservePlanFitRecurringSlot` mantém o espaço reservado tanto quando Plan Fit é elegível quanto enquanto a consulta exata de histórico está pendente (`lib/growth/planFit.ts:105-112`). O evento de ausência retorna sem registrar nada quando esse espaço está reservado (`app/(dashboard)/generate/GenerateClient.tsx:5132`).

**FATO CONFIRMADO EM CÓDIGO:** a consulta de `/api/videos` não tem timeout próprio; ela encerra somente por resposta, erro ou abort causado por uma consulta nova/desmontagem (`app/(dashboard)/generate/GenerateClient.tsx:3686-3756`). Depois de elegível, `PlanFitCard` registra `plan_fit_impression` apenas quando 35% do card entra no viewport, e `plan_fit_checkout_cta_viewed` apenas quando o botão fica executável e visível (`components/growth/PlanFitCard.tsx:124-192,194-250`). Não existe hoje um denominador que diga “o card elegível foi montado”.

**HIPÓTESE CAUSAL, AINDA NÃO PROVADA:** as quatro pessoas estão divididas entre dois estados indistinguíveis pela telemetria atual: (a) Plan Fit foi montado abaixo da dobra e nunca entrou 35% no viewport; ou (b) a confirmação de histórico ficou pendente, reservou o espaço e suprimiu tanto Plan Fit quanto a alternativa e o evento `post_video_no_offer`. O push concorrente `35523a05` comprova que uma prateleira irmã colocada depois do player também tinha grande diferença `shown → seen` e adicionou uma barra fixa; isso reforça a hipótese de posição, mas não prova o estado do Plan Fit.

**MUDANÇA MÍNIMA PROPOSTA / SEM PIXEL:** em `components/growth/PlanFitCard.tsx`, emitir uma vez por `exposureKey` o evento técnico `plan_fit_card_rendered`, com `event_unit=eligible_card_mount` e `surface_state=rendered_not_viewed`. O latch só fecha depois de analytics aceitar. Esse evento nunca deve ser chamado de impressão, exposição, pessoa alcançada ou receita. Funil resultante: `card_rendered → plan_fit_impression → plan_fit_checkout_cta_viewed → click → checkout_started → payment_success`.

**GATE:** preservar toda UI atual até dez pessoas externas em `plan_fit_card_rendered` ou vinte conclusões estritas do quickstart, o que vier primeiro. Se `rendered → impression` for o vazamento, corrigir posição sem mudar oferta. Se `completed → rendered` for o vazamento, instrumentar resolução/falha de `/api/videos` antes de tocar em layout. Não empilhar outra barra fixa enquanto a barra de segundo vídeo do `35523a05` estiver sendo medida.

**BLOQUEIO OPERACIONAL DESTA RODADA:** `apply_patch` foi recusado pelo ACL do Windows ao tentar atualizar `PlanFitCard.tsx`; a verificação falhou antes de ler/escrever o arquivo. Nenhum arquivo de runtime ou teste foi alterado e não houve tentativa de contornar o ACL por shell.

## Rodada 172 — B2B: nenhuma frente nova saiu do gate

**EVIDÊNCIA DE PRODUÇÃO (Supabase, `SELECT` em 2026-09-01; contas internas excluídas):** `affiliate_business_recruitment_viewed` continua com uma sessão anônima e zero pessoa identificada; não apareceu clique, aplicação atribuída, cópia de campanha `business`, `bulk_checkout_started` ou `bulk_purchase_completed` nessa variante.

**FATO CONFIRMADO / ANTI-DUPLICAÇÃO:** planner, brief, proposta, packs, pricing bridge, footer, volume bridge, Platform Decision, afiliados business e demais portas B2B já têm experimento abaixo de gate ou contradição explicitamente congelada nos handoffs 151–170. O caminho financeiro vivo continua `AgencyPacksClient → /api/stripe/checkout → webhook`; compra bulk é avulsa e não é MRR.

**NO-GO B2B:** nenhuma landing, CTA, ponte ou personalização nova. A melhor candidata — preservar `customers + business` na decisão TikTok × YouTube — continua sem ator humano pós-deploy. Reabrir somente com dez atores externos completando a decisão e três parando na mesma etapa, ou com divergência factual de caller.

## Estado da rodada

**DECISÃO APROVADA PRESERVADA:** a Kineo lista e cobra em USD mundialmente. A fricção a eliminar é contradição de moeda no último metro, não a existência do dólar. Nenhum preço, crédito, SKU, desconto, checkout, Stripe, render, banco ou comunicação externa foi alterado.

**GIT:** durante a leitura, `origin/main` avançou de `e674a775` para `35523a05`; a worktree isolada e limpa foi atualizada por fast-forward antes de qualquer proposta. Os avisos de limpeza de metadados de worktrees antigas foram somente avisos; nenhum lock ou diretório foi removido.

**PRÓXIMA AÇÃO SEGURA:** implementar somente o denominador técnico do Plan Fit quando houver uma worktree gravável, testar dedupe/semântica e publicar sem mudança visual. Até lá, manter todas as variantes e seus gates.
