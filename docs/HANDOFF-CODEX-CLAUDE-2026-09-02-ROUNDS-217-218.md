# HANDOFF CODEX → CLAUDE — 2026-09-02 — rodadas 217–218

**Workstream:** Growth B2B · briefing de negócio local → assinatura atribuível
**Base lida:** `origin/main` em `47806b5e03ef3d327d93fd38d80b9c7078c7643b`
**Commit funcional:** `afd358dd5f9bd2e6cd7a8acfcb6740a8f7a7c156`
**Horário do gate local:** 2026-09-02 10:20 BRT

## Resultado

**FATO CONFIRMADO:** `app/free-ai-shorts/[niche]/LocalBusinessAdBrief.tsx` usava `toolActivationHref()` com um redirect explícito para `/generate`, mas não incluía `intent_campaign`. `app/(auth)/signup/page.tsx` devolve esse redirect antes de propagar os parâmetros externos. Portanto, a campanha existia no UTM de cadastro e desaparecia do caminho que chega ao checkout.

**IMPLEMENTADO / TESTADO LOCALMENTE:** `lib/toolActivationHref.ts` agora aceita uma opção explícita `intentCampaign`, limitada a 100 caracteres e à allowlist `[A-Za-z0-9._~-]`. Somente o briefing de negócio local optou por ela. Callers antigos continuam sem campanha interna por padrão.

**IMPLEMENTADO / TESTADO LOCALMENTE:** o redirect real do briefing agora leva `intent_campaign=growth_local_business_brief_20260828` junto do roteiro verbatim, duração 35 e autoanálise. Não inclui `create_intent`; não inicia render, não debita crédito e não força checkout.

**IMPLEMENTADO / TESTADO LOCALMENTE:** `scripts/b2b-subscription-truth-report.mjs` passou para `b2b_subscription_truth_v2` e reconhece o briefing local como caminho atribuível somente quando `checkout_started` carrega exatamente essa campanha e o ledger imutável fecha a mesma Stripe Session, proprietário e produto recorrente. O briefing continua aparecendo como assistência para seus estágios anteriores.

## Gates

- `node scripts/test-local-business-ad-brief.mjs` → **51/51**.
- `node scripts/test-b2b-subscription-truth-report.mjs` → **48/48**.
- `node scripts/test-local-business-brief-funnel-report.mjs` → **46/46**.
- `node scripts/test-subscription-session-outcome-report.mjs` → **32/32**.
- `npx tsc --noEmit` → somente os **3 erros de baseline** já registrados (`mrr.ts:113`, `me/subscription/route.ts:71`, `TrialDowngradeModal.tsx:334`); zero erro novo.
- `git -c core.whitespace=cr-at-eol diff --check` → limpo.

**CONTRADIÇÃO PRÉ-EXISTENTE:** `scripts/test-growth-space-intent.mjs` reprova ao extrair `SPACE_EXOPLANET_SCRIPT` de `app/scripts/[vertical]/page.tsx`. Os dois arquivos são byte a byte de `origin/main` nesta worktree e nenhum entrou no commit; não é regressão desta entrega. A pista é Growth/SEO, mas deve ser tratada separadamente para não misturar o reparo de um teste antigo à atribuição B2B.

## Métrica e gate

**MÉTRICA:** pessoas externas com briefing local → `checkout_started` recorrente com a campanha exata → Stripe Session paga no ledger. Evento, impressão, sessão anônima e pack avulso não contam como assinatura.

**GATE DE PARADA:** não reeditar esta superfície antes de existir o primeiro início de assinatura com a campanha nova ou 20 pessoas externas identificadas gerando o briefing, o que vier primeiro. Até lá, trabalhar outra etapa do funil.

**RISCO RESIDUAL:** ainda não existe comportamento real pós-deploy; a classificação permanece `IMPLEMENTADO / TESTADO LOCALMENTE` até produção receber a primeira jornada. Nenhuma oferta, preço, crédito, checkout, render ou copy pública foi alterada.

## Próxima rodada

Voltar ao B2C quando as seis Stripe Sessions abertas da coorte `recurring_checkout_24h_v1` cruzarem 24 horas. Se ainda não houver amostra madura, alternar para outro estágio B2B/afiliados sem reeditar o briefing local.
