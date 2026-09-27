# Sprint 16 h · 27/09/2026 · pista visual (GPT/Codex)

Bloco para colar na sessão do GPT. Gerado pelo painel da sprint (docs/SPRINT-2026-09-27.md).

```
SPRINT 16H · DOM 27/09/2026 · PISTA VISUAL (GPT/Codex) — ALVO: MRR. Cole isto inteiro na sessão.

CONTEXTO EM 5 LINHAS
- Repo C:\kineo, branch codex/sprint16h-0927 (já é a atual). O checkout está sujo com arquivos de outras sessões: NUNCA `git add -A`; adicione só os caminhos do item. Um commit por item, mensagem `sprint16h V<n>: <título>`. Não faça push, não rode .bat, não enfileire — o Claude integra por cherry-pick na worktree limpa e avisa o fundador.
- A OpenAI está sem crédito (incidente ativo): não tente render nem teste ao vivo; seu teste é `npx tsc --noEmit` + os guardiões (`node scripts/test-<nome>.mjs`) dos arquivos que você tocou + o guardião novo de cada item.
- NÃO TOCAR: lib/compose*, lib/hollywood/, lib/cinematic/, lib/broll/, lib/lyriaMusic*, lib/narrationFit*, app/api/analyze-idea/, app/api/generate-script/, app/api/generate-video-*, app/api/stripe/*, lib/checkoutPricing.ts (só ler), lib/growth/planFit*.ts, lib/engineWall.ts e cards da home, app/(dashboard)/generate/GenerateClient.tsx (pista do Claude), lib/freeTierOffer.ts fora das 3 linhas do V1.
- REGRA DE NÚMERO: nenhum preço, crédito, custo de motor, limite ou contagem digitado. Tudo derivado de lib/ (getTierPrice, formatCheckoutMoney, TIER_CREDITS de lib/checkoutPricing.ts:436-438, creditCostForDuration/engineCost, characterLimitFor, trialFilmsForEngine). Guardião trava o literal antigo com readFileSync (sem alias @/, senão não roda).
- Mantenha o fim de linha do arquivo (não converta CRLF/LF), patch cirúrgico nas linhas citadas (ancore pela linha inteira, não por prefixo), zero refactor 'já que estou aqui'. Se a string passa por dicionário de idioma/ft(), mude na FONTE, não no consumidor.

V1 · EXIT-INTENT + COPY DO TRIAL + LLMS.TXT (1,5 h) — primeiro, porque é o que o ChatGPT lê e o ChatGPT é o único canal que paga (3/119).
- components/ExitIntentOffer.tsx:427 — tile ['$1','for 7 days of Creator, no trick'] sai (trial de $1 morto: lib/checkoutPricing.ts:361 CARD_TRIAL_LIVE=false). Substituir por Starter: preço via getTierPrice('starter')+formatCheckoutMoney, créditos via TIER_CREDITS.starter, texto 'Starter · cancel anytime'.
- :419 `enough for ${TRIAL_FILMS} Seedance films` imprime 0. Trocar SÓ este call-site para trialFilmsForEngine('fast') (lib/freeTierOffer.ts:203-210) e a palavra 'Kineo 1'. Não mexer na constante TRIAL_FILMS.
- :435 `<a href="/signup">` → `/signup?utm_source=exit_intent&utm_medium=free_panel&utm_campaign=sprint0927`.
- Variante logado: se há sessão (o componente sabe? senão ler /api/me como os vizinhos), o CTA vira 'Back to Studio' → /studio. 20 sessões logadas viram 'Sign up' desde 09/09.
- lib/freeTierOffer.ts:248 (sentence), :252 (planCardBody 'including Kling 3'), :258 (cmpKineoFree): 'every engine unlocked — Kling 3 included' → '10 free credits = 2 Kineo 1 films; AI engines (Seedance, Veo, Kling) from Starter'. Os números vêm de TRIAL_CREDITS_SHOWN e trialFilmsForEngine, nunca digitados. Propaga por ft() em 57 arquivos.
- app/llms.txt/route.ts:156 lê TRIAL_ACCESS.everyEngineUnlocked — conferir que a linha do trial do llms.txt fica coerente com a copy nova (é o que o ChatGPT cita).
- Guardião novo scripts/test-exit-intent-diz-a-verdade-2026-09-27.mjs: 'for 7 days of Creator' em components/ExitIntentOffer.tsx = 0; 'Kling 3 included' e 'including Kling 3' em lib/freeTierOffer.ts = 0; href do signup contém utm_source=exit_intent. Rodar também scripts/test-llms-commercial-truth.mjs e scripts/test-interface-language.mjs.

V2 · TABELA DO /PRICING + TERMOS (1,5 h)
- app/pricing/PricingClient.tsx:1896-1900 (H3) e :1903-1907 (Kling 2.5): coluna Starter '—' → '1 film' (derivar: TIER_CREDITS.starter >= custo do motor a 60 s ? '1 film' : '—').
- :1903-1907 pro '✅ 1080p' → '✅' (720p nativo em todo plano: app/(dashboard)/studio/StudioClient.tsx:116; masterizado a 1080×1920 para todos, :968).
- :1917-1921 Kling 3 pro '✅ 1/mo' → `${Math.floor(TIER_CREDITS.pro / custoKling3_60s)}/mo` = 2; Creator idem = 1. Use TIER_CREDITS (:436-438), NUNCA a tabela de :455-458 (pro:180, intro).
- :1924-1928 'Saved characters' '1/12/12/12' → characterLimitFor() de lib/characters.ts:36-41 (0/3/3/10); coluna Free mostra o valor do trial (3, app/api/characters/route.ts:53) com a nota 'during trial'.
- :1937-1942 e FAQ :161-163: um só texto para todos os planos, 'Kineo 1 ~3–7 min · AI engines 8–20 min' (StudioClient.tsx:723).
- :1947-1951 'Priority support: Priority' → 'Email support' em todas as colunas.
- :938 '900+ creators · 450+ Shorts rendered' → '2,100+ creators · 1,500+ films' com comentário `// banco 2026-09-27: 2.156 perfis externos, 1.563 vídeos completed externos`.
- app/terms/page.tsx:85-87: remover 'charged immediately at the introductory first-month price shown in checkout' (não existe intro).
- Guardião novo scripts/test-pricing-diz-a-verdade-2026-09-27.mjs travando na tabela: '✅ 1/mo', '1080p', a célula '12' na linha characters, 'Priority', '900+ creators'.

V3 · CTAs DO TRIAL: STARTER PRIMEIRO (1 h) — teste reversível.
- components/TrialActiveBanner.tsx:560-567 (preço) e :755-790 (trackEvent + checkout.launch): botão principal Starter — `checkout.launch('starter', '/api/stripe/checkout?tier=starter&…', { pricing_surface: 'trial_active_banner' })` (launch aceita 'starter', lib/checkoutTelemetry.ts:357); Creator vira link secundário 'need more? Creator · 150 cr' mantendo o launch('basic').
- components/TrialDowngradeModal.tsx:451-455 e :514-545: mesma troca.
- Uma constante `TRIAL_CTA_PRIMARY_TIER: 'starter' | 'basic' = 'starter'` num arquivo pequeno em lib/growth/ que os dois leem — reversão em 1 linha.
- Preço sempre via getTierPrice/formatCheckoutMoney (moeda local: BR vê R$). Os eventos trial_active_banner_cta / trial_downgrade_modal_cta gravam `tier` real do botão clicado.
- NÃO tocar lib/growth/planFit*.ts nem planFitCheckout/planFitCtaExposure.
- Guardião novo: os dois componentes importam TRIAL_CTA_PRIMARY_TIER; grep de `launch('basic'` no botão principal = 0.

V4 · STUDIO ADS: 3 PEDRAS + FAQ (1,5 h)
- app/api/ads/orders/route.ts:45 (GET): juntar videos.thumbnail_url por video_id (ORDER_COLUMNS :21 já traz video_id) e devolver `thumbnail_url` em cada pedido.
- app/(dashboard)/ads/new/AdsWizardClient.tsx:1713: quando o pedido mais novo está delivered/reviewed, abrir na lista 'Your ads' (hoje só abre com !order; hydrate :92/:699-721 sempre reabre o mais novo). Item (:1716-1719): miniatura + negócio · modelo · data COM hora · idioma do brief.
- :1360 `if (busy) return setError('Wait for the current upload to finish.')` → fila (useRef de File[]) que concatena e processa em série; os inputs (:1763, :1783) já zeram e.target.value antes do await — só enfileirar.
- Copy: :3247 '3 to 7 minutes' → '2–3 minutes'; :3005 `about {model.seconds} s` → '35–55 s'.
- app/ads/page.tsx:295-297 FAQ 'Do I need a subscription? No. The pass…' → 'Any paid plan includes Studio Ads (3 credits per ad). The pass is for people without a plan.' É Server Component: se quiser evento de clique, wrapper cliente no padrão de app/ads/AdsPageBanners.tsx:56.
- lib/ads/offer.ts:85 'Square and landscape cuts… are coming next' → só quando adsAutoVisible for falso (1:1/4:5/16:9 já existem em lib/ads/adStyle.ts:60-65).
- lib/ads/offer.ts:80 e AdsWizardClient.tsx:95 (REVIEW_LINE): SÓ mude se o Claude confirmar a decisão do fundador; padrão: 'A human checks your first ad.' sem '24 hours' nem 'corrected version'.
- NÃO tocar: herança de formato nas versões A/B, rótulo 9:16 na biblioteca, miniaturas 0×0 (crossOrigin), 'Braza', leitor de link, DELETE de rascunho — 0 usuários externos ainda.

ENTREGA DE CADA ITEM (mensagem curta para o Claude): SHA do commit, arquivos tocados, saída do tsc, guardiões rodados (nome + PASS), e qualquer linha que você NÃO conseguiu ancorar (não invente linha nova — pergunte).
```
