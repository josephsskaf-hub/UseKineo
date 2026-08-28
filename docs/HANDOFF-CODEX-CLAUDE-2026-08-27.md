# Handoff Codex ↔ Claude — 2026-08-27

- **Data do snapshot:** 2026-08-27, America/Sao_Paulo
- **Base remota confirmada depois da entrega mais recente:** `57f0f326d08b0ec7b199fbe86bdb68cf9504a629`
- **Workstream Codex:** aquisição, fluxo, conversão, afiliados e vendas B2C/B2B
- **Workstream Claude:** qualidade do gerador, render, cenas, legendas e bugs do pipeline de vídeo
- **Estado do ciclo:** execução renovável de 72 horas, com sprints a cada 30 minutos

## 1. Divisão aprovada pelo fundador

**DECISÃO APROVADA.** O Codex executa Growth e o Claude executa o pipeline de vídeo. Uma frente só entra no território da outra por pedido explícito do fundador ou por bloqueio registrado neste handoff.

- O Codex pode criar worktrees, editar, testar, commitar, publicar e validar entregas de Growth sem nova autorização.
- Nenhuma comunicação externa é enviada sem confirmação do fundador no momento do envio.
- Nenhuma alteração de preço, grant, SKU ou termos é feita silenciosamente.
- Antes de editar, cada executor confirma o SHA real de `origin/main` e trabalha em worktree isolada.
- A árvore principal local está divergente e contém trabalho de terceiros. Ela não deve ser resetada, limpa nem usada para integração.
- O Plan Fit pertence ao Codex. O protótipo paralelo `3173247` não deve ser integrado.

## 2. Entregas de Growth publicadas em 27/08/2026

### 2.0 Estado herdado e preservado nesta sequência

**FATO CONFIRMADO / IMPLEMENTADO.** As entregas anteriores do mesmo dia continuam ancestrais de `origin/main`:

- Privacidade fail-closed: criações de clientes não são enumeradas em `/v/[id]`, sitemap de vídeo, IndexNow, rails ou galerias enquanto não existe escolha durável de visibilidade. Playback e download autenticados do dono continuam.
- Verdade comercial: superfícies principais derivam créditos e custos da fonte canônica, sem alterar preço, grant, SKU ou termos.
- Plan Fit: depois da primeira entrega, a recomendação usa motor, duração e cadência; checkout passa pelo fluxo canônico e revalida elegibilidade antes de impressão e compra.
- Corrida entre abas: nova entrega, foco e `visibilitychange` revalidam o histórico; resposta velha não restaura elegibilidade.
- Gates preservados: privacidade `62/62`, Plan Fit `227/227`, contrato comercial `305/305`, vitrine de crédito `21/21`.
- Previews preservados: `docs/previews/privacy-containment-before-after.html`, `docs/previews/plan-fit-first-delivery-2026-08-27.html` e `docs/previews/money-truth-before-after-2026-08-27.html`.

### 2.1 Oferta única depois do primeiro vídeo

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `a0e11446535386f551464b082307f1cc34ce20bb`.

- O momento pós-primeira entrega deixou de competir com várias ofertas simultâneas.
- A recuperação de assinatura usa uma decisão principal e eventos próprios.
- Testes: `45/45`; contrato comercial: `305/305`.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_Brw8biGsiZviT9vCVg2AXyexeDNX` em estado `READY`.

### 2.2 Arena honesta de motores

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `89be8bb3b330166cfc21d2fe9f2756378bf54575`.

- `/arena` compara os sete motores com amostras já autorizadas e descreve a função de cada um sem declarar vencedor universal.
- A vitrine aprovada pelo fundador na home continua governada por `lib/publicExamples.ts`; a Arena não substitui a curadoria da home.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_HSZ2fMTZ1ryUKWDsG38RMbXAXkdM` em estado `READY`; `/arena` respondeu HTTP 200.

### 2.3 ChatGPT → Short sem perder o roteiro

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `e13810f6667b814510a2a51329674f6cc4fca74d`.

- A página indexável `/chatgpt-to-youtube-shorts` ensina o formato correto e entrega o roteiro ao gerador após autenticação.
- O handoff preserva a intenção por signup/login; não pede que a pessoa reescreva o texto.
- A rota entrou em sitemap, links internos, fatos públicos e medição orgânica.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_CUstB9qgzMkMfzzjeZLuqPfDRfyw` em estado `READY`; a página respondeu HTTP 200.

### 2.4 Integridade do ledger de afiliados

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `beaeb765827b3aed81923e7874830bd655a92656`.

- A comissão passou a ser idempotente por `(provider, external_id)`.
- Repetição de webhook não cria comissão duplicada.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_EHMLRb67obzSAKXpPdjT9fmiojfk` em estado `READY`; banco validado com chave única e zero duplicatas.

### 2.5 Recuperação do primeiro vídeo e ativação de afiliados

**FATO CONFIRMADO / IMPLEMENTADO.** Commits `025d3c7117ef6dd028960f194d8d03cb93959023` e `b8027cde47633d0f759c18cc9f93ce3eec8bf87b`.

- Usuário com vídeo concluído e sem assinatura recebe uma oferta contextual na biblioteca.
- Exatamente um vídeo usa a mensagem de continuidade do primeiro Short; o Starter é a ação principal e o episódio 2 é secundário.
- Assinante ativo com pelo menos dois vídeos recebe o card de afiliado; afiliados pendentes ou suspensos são ocultados.
- Os estados de recuperação e de afiliado são mutuamente exclusivos.
- Eventos: `history_first_video_offer_viewed`, `history_first_video_offer_clicked`, `affiliate_momentum_card_viewed` e `affiliate_momentum_card_clicked` (`app/(dashboard)/history/HistoryClient.tsx:382-396`; `components/AffiliateMomentumCard.tsx:32-71`).
- Testes: `test-affiliate-activation.mjs` `34/34`; contrato comercial `305/305`; TypeScript sem erro novo.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_HdXuvJ6ccfnmtho8egDpYis1JURH` em estado `READY`; `/my-videos` abriu em produção e não houve erro runtime nas rotas observadas.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não houve sessão de uma conta externa elegível depois do deploy para provar impressão e clique reais nessa coorte.

### 2.6 Porta B2B para agências, freelancers e empresas

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `7d68a9d0ab115bc4bcc68726330457ca0a1e5da8`.

- Nova página pública e indexável: `/ai-shorts-for-agencies`.
- A página vende os quatro pacotes já aprovados em `BULK_PACKS`, sem inventar preço no JSX (`lib/checkoutPricing.ts:527-544`; `app/ai-shorts-for-agencies/page.tsx:5-32`).
- O checkout reutiliza o fluxo Stripe vivo `/api/stripe/checkout?pack=...`; compra avulsa em USD, sem assinatura.
- A copy declara que a quantidade nominal é para Fast Mode, que motores premium consomem mais créditos e que não existem team seats, client portal, approval routing, white-label ou editor humano.
- A página não está órfã: há link no footer (`components/Footer.tsx:90`), entrada no sitemap (`app/sitemap.ts:136`) e bloco em `/llms.txt` (`app/llms.txt/route.ts:199`).
- Funil por atores, não eventos: `agency_bulk_page_viewed`, `agency_bulk_pack_clicked`, `bulk_checkout_started` (`app/api/admin/funnel/route.ts:1339-1341`).
- Testes: `test-b2b-bulk-page.mjs` `29/29`; contrato comercial `305/305`; TypeScript com apenas os mesmos quatro erros de baseline; whitespace limpo.
- Preview visual obrigatório: `docs/previews/B2B-BULK-PAGE-2026-08-27.html`, inspecionado em desktop e mobile.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_3ZyRYAHFcvZwX8Q46tcY1x7o7AE2` em estado `READY`; página, sitemap e `/llms.txt` responderam em produção; zero erro de console na página e zero erro runtime nas rotas observadas.
- O checkout não foi clicado em produção para não criar sessão Stripe artificial. A rota, o contrato dos packs e o webhook foram verificados no código e por testes.

### 2.7 Trust Center factual

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `027afdb9889d127a1a9190e3a22f7cb1cabea1cc`.

- Nova página pública e indexável: `/trust`, com operador, domínio canônico, suporte, fronteira de pagamento, privacidade dos vídeos, uso comercial, processadores e caminho de reembolso.
- A página recusa explicitamente prova inventada: não declara SOC 2, ISO 27001, SLA empresarial, número inventado de clientes ou selo de “#1”.
- Stripe hospeda o checkout; a Kineo não recebe nem armazena o número completo do cartão.
- Vídeos de clientes permanecem privados por padrão; exemplos públicos são uma coleção separada aprovada pelo fundador.
- A página não está órfã: entrou no footer, sitemap e `/llms.txt`.
- Funil por atores, não eventos: `trust_page_viewed` e `trust_cta_clicked` (`app/trust/TrustActions.tsx`; `app/api/admin/funnel/route.ts`).
- Testes: `test-trust-center.mjs` `25/25`; contrato comercial `305/305`; TypeScript com apenas os quatro erros de baseline; whitespace limpo.
- Preview visual obrigatório: `docs/previews/TRUST-CENTER-2026-08-27.html`, inspecionado em desktop e mobile.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_AX54AKA1KjoFymjczPSm2jxh8hGg` em estado `READY`; `/trust`, sitemap e `/llms.txt` responderam em produção; zero erro de console e zero erro runtime nas rotas observadas.

### 2.8 Descoberta orgânica

**EVIDÊNCIA DE PRODUÇÃO (27/08/2026, America/Sao_Paulo).** O lote IndexNow foi validado e submetido em `2026-08-28T00:06:33.285Z` (`27/08/2026 21:06:33 BRT`): HTTP 200, 171 URLs canônicas. A contagem anterior, depois da página B2B e antes do Trust Center, era 170.

### 2.9 Vídeo público → remix sem cadastro

**FATO CONFIRMADO / IMPLEMENTADO.** Commits `f13f67bf78dc1e0bd1529d2f696ab02b429e0c7c` e `30b8889e29f79a41519c7823445ed771701368f3`.

- Os CTAs de `/v/[id]` deixaram de pedir cadastro antes de entregar valor e agora levam ao gerador gratuito com o título visível pré-preenchido (`app/v/[id]/page.tsx:174,339,554`; `lib/publicVideoRemix.ts:12`).
- O gerador sanitiza o tópico e o identificador no servidor, não chama a IA automaticamente e preserva o roteiro no handoff existente para signup/Studio (`app/free-script-generator/page.tsx:65-76`; `app/free-script-generator/FreeScriptClient.tsx:78-110,210`).
- O caminho preserva `utm_source=public_video`, `utm_medium=share`, `utm_campaign=public_video_remix` e `source_video_id` sanitizado.
- Eventos próprios: `public_video_remix_arrived`, `public_video_remix_script_generated` e `public_video_remix_signup_clicked`; chegada deduplicada por sessão (`app/free-script-generator/FreeScriptClient.tsx:91-103,135-137,210`).
- O admin mede atores únicos nas etapas landing → CTA → chegada → roteiro → intenção de cadastro → cadastro atribuído; a contagem antiga de landing e CTA também deixou de usar linhas brutas (`app/api/admin/funnel/route.ts:1178-1245`).
- O CTA móvel duplicado foi removido: permanece um único sticky CTA universal.
- Testes: `test-public-video-remix.mjs` `36/36`; contrato comercial `305/305`; TypeScript com apenas os quatro erros de baseline; whitespace limpo.
- Preview visual obrigatório: `docs/previews/PUBLIC-VIDEO-REMIX-2026-08-27.html`, inspecionado em desktop e mobile. A versão anterior mostrava dois CTAs fixos sobrepostos no mobile; a nova mostra um único CTA de remix.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_CnJ4sTCVwf1hEJFa2XbkoF9a7jeP` em estado `READY`, aliasado em `www.usekineo.com`. O URL de remix carregou o gerador com o tópico pré-preenchido e sem geração automática; zero erro runtime em `/v/[id]`, `/free-script-generator` e `/api/admin/funnel` nos 30 minutos observados.
- **QUESTÃO PENDENTE / DESCONHECIDO:** não existe hoje um `/v/[id]` público ativo para smoke de clique ponta a ponta: a biblioteca do fundador informa “Private by default” e “Public watch links are temporarily paused”. O contrato CTA → URL está coberto pelo teste executável; URL → tópico preenchido foi validado ao vivo. Não classificar um clique real como validado até existir uma escolha de visibilidade pública.

### 2.10 Primeiro vídeo orientado pelo objetivo do cliente

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `b1a789b73bca8627ac0a16fce207d96bfbd2fc81`.

- O onboarding deixou de oferecer o mesmo mistério para todos e agora pergunta o objetivo do primeiro vídeo: crescer o canal, promover a empresa ou criar para clientes (`components/NicheOnboarding.tsx`; `lib/growth/onboardingGoals.ts`).
- “Grow my channel” continua selecionado por padrão; portanto, o caminho antigo de um clique permanece disponível.
- Cada objetivo define tópico, hook e CTA próprios, sem alterar motor, preço, crédito, prompt de cena ou pipeline de render.
- O objetivo selecionado atravessa a fronteira assíncrona até o despacho e os estados terminais. Os eventos `viral_onboarding_goal_selected`, `viral_onboarding_primary_clicked`, `cinematic_generation_started`, `cinematic_job_completed` e falhas recebem `variant=goal_router_v1` e `selected_goal` allow-listed.
- O admin mede atores únicos, não linhas: visualização, clique, seleção, despacho e conclusão por objetivo (`app/api/admin/funnel/route.ts`; `app/(dashboard)/admin/funnel/FunnelClient.tsx`).
- **EVIDÊNCIA DE PRODUÇÃO (janela de 30 dias lida em 27/08/2026):** 149 pessoas viram o handoff, 39 clicaram na ação principal, 29 chegaram ao despacho, 12 concluíram e 4 falharam. Esses números motivaram a segmentação; não são atribuídos à variante nova.
- Testes: `test-onboarding-goal-router.mjs` `58/58`; contrato comercial `305/305`; TypeScript com apenas os quatro erros de baseline; whitespace limpo.
- Preview visual obrigatório: `docs/previews/ONBOARDING-GOAL-ROUTER-2026-08-27.html`, inspecionado em desktop e mobile. No mobile, as três opções ficam empilhadas e o CTA permanece visível.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_CNtW9mGRaYdTBx2ud3qAGTRow7N5` em estado `READY`, aliasado em `www.usekineo.com`; `origin/main` e o commit entregue coincidem; zero erro runtime em `/generate`, `/studio/create` e `/api/admin/funnel` nos 30 minutos observados.
- **QUESTÃO PENDENTE / DESCONHECIDO:** o navegador de validação não tinha sessão Kineo e foi corretamente redirecionado para `/signup`; portanto, o clique real no modal logado não deve ser classificado como validado em produção até uma sessão autenticada exercitar o fluxo. O contrato executável cobre seleção → análise → despacho → término sem disparar render no teste.

### 2.11 Kit de campanha por audiência para afiliados

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `3f90bf871eeaa6c5fd013c6050bfb81557040f3a`.

- O painel do afiliado deixou de entregar somente um link genérico. Agora o parceiro escolhe entre três destinos allow-listed: gerador gratuito de roteiro, teste gratuito de AI Shorts ou fluxo faceless (`lib/affiliateDestinations.ts`; `app/(dashboard)/affiliate/page.tsx`).
- Cada destino recebe UTM própria, caption pronta e roteiro falado curto. Quando existe cupom, o código e o desconto real de primeiro mês entram automaticamente nos dois textos.
- O link continua canônico em `www.usekineo.com/a/[code]`, aceita apenas o enum `script | video | faceless` e preserva o mesmo first-touch de 90 dias. Nenhum redirect arbitrário foi introduzido.
- Eventos novos: `affiliate_campaign_selected` e `affiliate_campaign_asset_copied`, ambos com destino allow-listed; cópia de link e compartilhamento também carregam o destino selecionado.
- O admin de afiliados agora separa visitas cruas por destino (`script`, `video`, `faceless`, `legacy`) usando `affiliate_clicks.landing_path`; a UI diz explicitamente “raw link visits”, sem chamar linhas de pessoas (`app/api/admin/affiliates/route.ts`; `app/(dashboard)/admin/affiliates/page.tsx`).
- A página pública `/partners` explica que o programa entrega um kit por audiência, não apenas um link (`app/partners/page.tsx`).
- **EVIDÊNCIA DE PRODUÇÃO (lida em 27/08/2026 antes da variante):** 11 afiliados externos, 17 cliques, 0 signup atribuído. Esses números motivaram a entrega e não devem ser atribuídos ao kit novo.
- Testes: `test-affiliate-destinations.mjs` `177/177`; contrato comercial `305/305`; TypeScript com apenas os quatro erros de baseline; whitespace limpo.
- Preview visual obrigatório: `docs/previews/AFFILIATE-CAMPAIGN-KIT-2026-08-27.html`, inspecionado em desktop e mobile.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_DDpM3VXJSWsUQUaB9n75FTb9kjtd` em estado `READY`, aliasado em `www.usekineo.com`; `/partners` mostrou o kit e `/free-script-generator`, `/free-ai-shorts-generator` e `/faceless-video-generator` carregaram com o conteúdo correto; zero erro runtime nas rotas observadas.
- **QUESTÃO PENDENTE / DESCONHECIDO:** nenhum link financeiro de afiliado real foi clicado no smoke de produção e nenhuma conta alheia foi usada. A rota, os três redirects, a criação de prova, cookies first-touch, dedupe e rejeição de destino inseguro estão cobertos pelo teste executável; o primeiro clique humano de cada variante ainda precisa ser observado no admin.

### 2.12 Distribuição da oferta B2B nas superfícies com tráfego

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `e0111c689b4c3d79254909a44f19adb69bade6b3`.

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT agregado, 27/08/2026, contas internas excluídas):** desde a publicação da página B2B não havia evento `agency_bulk_page_viewed`, `agency_bulk_pack_clicked`, `bulk_checkout_started` nem `bulk_purchase_completed`. O gargalo observado era anterior ao checkout: zero tráfego medido na oferta.
- **EVIDÊNCIA DE PRODUÇÃO (janela de 30 dias lida em 27/08/2026):** `/state-of-ai-shorts-2026` teve 140 atores identificáveis, dos quais 120 atribuídos ao ChatGPT; `/cheapest-ai-shorts-maker` teve 71; `/pricing`, 60. Esses números são por página e não foram somados como pessoas distintas.
- As três páginas agora exibem um `AgencyVolumeBridge` contextual para agências, freelancers e empresas, sem alterar a home (`components/AgencyVolumeBridge.tsx`; páginas citadas acima).
- A ponte usa somente os quatro packs aprovados e deriva o menor preço por vídeo de `BULK_PACKS`; não repete preço literal nem cria oferta nova (`lib/checkoutPricing.ts`; `components/AgencyVolumeBridge.tsx`).
- Links internos usam `?entry=state_report|cost_page|pricing`, e não UTM. Assim a origem original ChatGPT/Google não é sobrescrita (`lib/agencyDistribution.ts`).
- A página B2B lê apenas esse enum allow-listed e grava `entry` em `agency_bulk_page_viewed`; valor arbitrário cai em `direct`. O marcador de sessão é versionado e escopado por entrada (`app/ai-shorts-for-agencies/AgencyPacksClient.tsx`).
- Testes: `test-b2b-distribution.mjs` `31/31`; `test-b2b-bulk-page.mjs` `30/30`; contrato comercial `305/305`; destinos de afiliado `177/177`; TypeScript com apenas os quatro erros de baseline; whitespace limpo.
- O build local compilou o código e parou somente na coleta de uma rota preexistente por ausência de `OPENAI_API_KEY` na worktree isolada; nenhum segredo foi lido ou copiado. O build completo da Vercel ficou verde.
- Preview visual obrigatório: `docs/previews/B2B-DISTRIBUTION-BRIDGES-2026-08-27.html`, inspecionado em desktop e mobile.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_CswEGJAX19noMq2KYw14TfYnkKiv` em estado `READY`, aliasado em `www.usekineo.com`. GETs sem JavaScript confirmaram HTTP 200, ponte e `entry` exato nas três origens e a oferta na página de destino; nenhum evento artificial foi criado durante o smoke.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe visitante humano observado depois desta variante. Medir atores por `metadata.entry` antes de mexer na oferta ou no checkout B2B.

### 2.13 Calculadora de margem para agências e freelancers

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `3d52526785e85e7de0e7d17132d36c324b7aa0ff`.

- **EVIDÊNCIA DE MERCADO (páginas oficiais lidas em 27/08/2026):** a Fiverr informa que o freelancer recebe 80% do pedido; a Upwork cobra 0%–15% por contrato e oferece calculadora de valor líquido; a Tasty Edits publica Shorts verticais a US$80–94 cada. Essas referências motivaram transparência de margem, não uma promessa de preço ou rendimento da Kineo.
- A página `/ai-shorts-for-agencies` agora calcula um cenário com o volume canônico escolhido, o preço que o comprador cobra do próprio cliente e a taxa real do marketplace (`app/ai-shorts-for-agencies/AgencyMarginCalculator.tsx`; `lib/agencyMargin.ts`).
- A conta expõe receita bruta, taxa do marketplace, custo canônico do pack, caixa restante e preço de equilíbrio. O resultado diz explicitamente que exclui trabalho, revisões, reembolsos, impostos, anúncios e custo de aquisição e que não é previsão de ganhos.
- Preço e quantidade dos quatro packs continuam vindo de `BULK_PACKS`; nenhum preço, grant, SKU, termo ou desconto da Kineo mudou (`app/ai-shorts-for-agencies/page.tsx`; `lib/checkoutPricing.ts`).
- O CTA da calculadora leva ao card exato `bulk10|bulk20|bulk30|bulk50`; não abre checkout nem cria sessão Stripe sozinho (`app/ai-shorts-for-agencies/AgencyPacksClient.tsx`).
- Funil novo por atores: `agency_margin_calculator_viewed` e `agency_margin_pack_selected`. O painel agora mostra página B2B → calculadora → pack → sessão Stripe, sempre como pessoas/sessões identificáveis, não linhas brutas (`app/api/admin/funnel/route.ts`; `app/(dashboard)/admin/funnel/FunnelClient.tsx`).
- Testes: `test-b2b-margin-calculator.mjs` `46/46`; oferta B2B `30/30`; distribuição B2B `31/31`; contrato comercial `305/305`; destinos de afiliado `177/177`; TypeScript com somente os quatro erros de baseline; whitespace limpo.
- Preview visual obrigatório: `docs/previews/B2B-MARGIN-CALCULATOR-2026-08-27.html`, inspecionado em desktop e mobile; inclui também a nova seção do admin.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_BSvZ2sw218ZybG8XjsBW8LfqDYsg` em estado `READY`, aliasado em `www.usekineo.com`. GET sem JavaScript respondeu HTTP 200 e confirmou calculadora, ressalva de não-previsão e âncora `pack-bulk30`; nenhum erro runtime foi encontrado na rota nos 30 minutos observados.
- O smoke não clicou no CTA nem executou checkout para não fabricar intenção ou sessão Stripe.
- **QUESTÃO PENDENTE / DESCONHECIDO:** nenhum visitante humano foi observado nessa variante ainda. Medir atores do novo funil antes de mudar a oferta B2B outra vez.

### 2.14 Verdade da conversão da oferta de assinatura pós-vídeo

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `57f0f326d08b0ec7b199fbe86bdb68cf9504a629`.

- O painel antigo chamava de “Post-video” apenas a caixa avulsa de exportação limpa e ignorava os eventos da oferta recorrente do trial. As duas superfícies continuam separadas; nenhuma linha bruta foi rebatizada como pessoa (`app/api/admin/funnel/route.ts`; `app/(dashboard)/admin/funnel/FunnelClient.tsx`).
- O novo funil exige a mesma pessoa e a ordem `trial_post_video_offer_viewed → trial_post_video_offer_clicked → checkout_started → payment_success`. Checkout posterior sem clique aparece como diagnóstico, mas não é atribuído à oferta (`lib/admin/trialPostVideoFunnel.ts`).
- A tabela separa origem pelo resolvedor canônico `acquisitionSource`: ChatGPT, TAAFT e demais origens não são misturadas.
- A variante recém-publicada `offer_layout=single_primary_v1` tem contadores próprios. **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, 27/08/2026):** não havia visualização externa dessa variante desde o deploy; portanto, nenhuma nova mudança de copy ou oferta foi feita sem amostra.
- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, janela de 30 dias lida em 27/08/2026, contas internas excluídas):** 231 pessoas viram a oferta recorrente do trial, 22 clicaram, 22 chegaram ao checkout depois do clique e zero `payment_success` ocorreu depois dessa cadeia. Por origem: ChatGPT 79→5→5→0; TAAFT 90→11→11→0; outras origens 62→6→6→0.
- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, janela de 3 dias lida em 27/08/2026):** nove pessoas viram a oferta e nenhuma clicou; dois usuários ChatGPT chegaram a checkout por outra superfície depois de ver o card, e por isso não foram atribuídos a ele.
- Testes: funil causal `32/32`; regressões de Growth relacionadas `525/525`; TypeScript com somente os quatro erros de baseline; whitespace limpo.
- Preview visual obrigatório: `docs/previews/TRIAL-POSTVIDEO-FUNNEL-2026-08-27.html`, inspecionado em desktop e mobile.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_37NopodYv1qxyPk7ut8GA64YaVwE` em estado `READY`; endpoint sem sessão respondeu HTTP 403, preservando a proteção administrativa; zero erro runtime no projeto nos 15 minutos consultados.
- **QUESTÃO PENDENTE / DESCONHECIDO:** o primeiro ator externo da variante `single_primary_v1` ainda não foi observado. Medir antes de alterar a oferta novamente.

### 2.15 Remix com tema próprio nas páginas permanentes de exemplo

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `c1adaa71d4a5e5568743e0d4ad34720498e7f893`.

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, janela de 30 dias lida em 27/08/2026, contas internas excluídas):** as seis páginas `/examples/[slug]` tiveram 176 atores e 165 atores deram play. Atribuições anteriores `example_watch`/`examples` somaram três cadastros e dois deles concluíram vídeo; esses números são anteriores à variante nova e não provam causalidade dela.
- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, 14 dias lidos em 27/08/2026):** o overlay `push31` teve 12 atores, todos deram play, sete chegaram ao fim e nenhum clicou no CTA. A porta dizia “my topic”, mas o código entregava ao Studio o prompt original do exemplo.
- O fim do vídeo agora aponta para o formulário da própria página, em vez de navegar com o assunto antigo (`app/examples/[slug]/page.tsx:87`; `app/examples/ExampleVideoPlayer.tsx:117`).
- O visitante informa o próprio tema; o helper sanitiza, limita a 140 caracteres e troca somente o assunto, preservando a estrutura de hook e direção visual do exemplo (`lib/growth/exampleRemix.ts:5-39`). O handoff continua usando `/generate`; nenhum render ou geração automática foi introduzido.
- O formulário mede impressão somente quando 50% visível e deduplica por sessão. A submissão grava slug e comprimento, nunca o tema bruto (`app/examples/ExampleRemixForm.tsx:21-62`).
- O admin mede atores identificáveis em `form viewed → topic submitted`; cadastros vêm da UTM persistida no perfil e ativação exige vídeo `completed` (`app/api/admin/funnel/route.ts:1215-1260`; `app/(dashboard)/admin/funnel/FunnelClient.tsx:744`).
- Testes: `test-example-remix.mjs` `54/54`; regressões relacionadas `220/220`; TypeScript com somente os quatro erros de baseline; whitespace limpo.
- Preview visual obrigatório: `docs/previews/EXAMPLE-REMIX-2026-08-27.html`, inspecionado em desktop e mobile.
- **EVIDÊNCIA DE PRODUÇÃO (28/08/2026 UTC / 27/08 BRT):** deploy `dpl_4ZVYskTAoDYeEn2gHfQzSfuGox9G` em estado `READY`, aliasado em `www.usekineo.com`. GET sem JavaScript respondeu HTTP 200, encontrou formulário e âncora novos e confirmou ausência do CTA antigo; nenhum evento artificial foi emitido. Zero erro/fatal no runtime do deploy nos 15 minutos consultados.
- **QUESTÃO PENDENTE / DESCONHECIDO:** nenhum ator externo da campanha `example_remix_v1` foi observado ainda. Medir `View → Topic → Signup → Video` antes de alterar novamente essa superfície.

## 3. Evidência de funil que governa a próxima rodada

**EVIDÊNCIA DE PRODUÇÃO (janela de 7 dias medida em 27/08/2026; contas internas excluídas):**

| Origem | Pessoas cadastradas | Gastaram trial | Concluíram vídeo | Viram oferta | Abriram checkout | Pagaram | Falha de geração |
|---|---:|---:|---:|---:|---:|---:|---:|
| ChatGPT | 52 | 30 | 30 | 19 | 5 | 1 | 7 |
| TAAFT | 37 | 21 | 14 | 13 | 2 | 0 | 9 |

- 24 pessoas vindas do ChatGPT tinham exatamente um vídeo concluído; 13 viram oferta, 8 voltaram à biblioteca e 2 abriram checkout.
- 6 pessoas vindas do ChatGPT tinham dois ou mais vídeos; 3 abriram checkout.
- **Leitura:** ChatGPT já é um canal com intenção comercial; a maior oportunidade observada está entre primeira entrega e repetição/checkout.
- **Limite:** não extrapolar taxas dessas amostras para promessa de vendas.

**EVIDÊNCIA DE PRODUÇÃO (medida em 27/08/2026):**

- Afiliados: 12 totais, 11 externos, 17 cliques, 0 signup atribuído, 0 pagante atribuído e 0 comissão antes da nova ativação.
- Cinco pagantes externos com pelo menos dois vídeos ainda não eram afiliados; são a primeira coorte elegível para o card.
- Os quatro usuários ChatGPT com checkout sem pagamento já haviam recebido recuperação; não duplicar contato.

**EVIDÊNCIA DE PRODUÇÃO (janela de 30 dias lida no admin em 27/08/2026):**

- 999 usuários totais, 387 pessoas com vídeo e 7 assinantes.
- 241 criadores concluíram 402 vídeos.
- 76 pessoas chegaram a páginas de vídeo público e nenhuma pessoa clicou no CTA antigo.
- No handoff do primeiro vídeo: 149 pessoas viram, 39 clicaram na ação principal, 29 despacharam e 12 concluíram.
- Na caixa avulsa de exportação limpa: 220 pessoas viram, 1 clicou em exportação limpa, 2 abriram checkout e nenhuma assinatura foi atribuída nessa janela.
- Na oferta recorrente do trial, medida separadamente e por pessoa: 231 viram, 22 clicaram, 22 chegaram ao checkout depois do clique e nenhuma pagou depois dessa cadeia.
- **Leitura:** o remix sem cadastro ataca um abandono observado diferente de Plan Fit e da oferta pós-vídeo; não repete essas ações.

## 4. Validação técnica consolidada

**TESTADO LOCALMENTE.** Nenhuma entrega de Growth adicionou erro de TypeScript. O baseline continua exatamente em quatro erros preexistentes:

- `app/api/admin/_shared/mrr.ts(113,41)`
- `app/api/me/subscription/route.ts(71,41)`
- `app/api/stripe/checkout/route.ts(545,76)`
- `app/api/stripe/checkout/route.ts(566,62)`

**FATO CONFIRMADO.** O build de produção ignora erros de tipo e lint; portanto, `npx tsc --noEmit` continua gate manual obrigatório.

## 5. O que não foi tocado

- Nenhum prompt de cena, motor, render, legenda, composição, voiceover ou fallback do gerador.
- Nenhum preço, grant, SKU ou termo comercial.
- Nenhum e-mail, DM, outreach ou follow-up foi enviado.
- Nenhum tráfego pago foi ativado.
- Nenhuma alteração foi feita na árvore principal divergente.

## 6. Riscos e pendências

### Claude / pipeline de vídeo

- Continuar qualidade do gerador e bugs do pipeline sobre a ponta atual de `origin/main`.
- Antes de editar `GenerateClient.tsx`, confirmar o SHA remoto e ler este handoff.
- **QUESTÃO PENDENTE / DESCONHECIDO:** `/my-videos` exibiu erros React de hidratação `#425/#418/#423` na sessão do fundador em 27/08. A página renderizou e não há prova anterior ao deploy na mesma sessão; não atribuir causalidade sem reprodução controlada.

### Codex / Growth

- Medir pessoas únicas nos novos eventos, sem transformar ausência inicial em fracasso.
- Executar o ciclo renovável de 72 horas: fortalecer menções/links para as portas B2B e de confiança e preparar listas qualificadas de criadores, agências e empresas.
- Preparar lotes de contato, mas pedir confirmação do fundador no momento do envio.
- Não duplicar recuperação já enviada aos quatro checkouts ChatGPT sem pagamento.

### Decisões comerciais preservadas

- **CONTRADIÇÃO:** `lib/paypal.ts` mantém uma tabela própria antiga enquanto Stripe usa a fonte canônica. É um rail vivo e não deve ser alterado em silêncio.
- **QUESTÃO PENDENTE / DESCONHECIDO:** vendas e conversões das superfícies publicadas ainda precisam de tráfego real; deploy e indexação não são receita.

## 7. Protocolo obrigatório do próximo turno

1. Executar `git fetch origin` e confirmar o SHA real de `refs/heads/main`.
2. Ler `AGENTS.md`, os documentos canônicos de `docs/` e este handoff.
3. Informar base, worktree e arquivos antes da primeira edição.
4. Se `origin/main` avançar, reintegrar sobre a nova ponta; nunca usar a árvore principal divergente.
5. No fim, registrar SHA, arquivos, testes, deploy, evidência de produção, riscos e próximo dono.
6. Entregar ao fundador um bloco `COPY` autocontido para o outro executor.

## 8. Formato mínimo do resumo de volta

```text
BASE LIDA:
SHA ENTREGUE:
ARQUIVOS TOCADOS:
O QUE MUDOU:
TESTES:
DEPLOY:
VALIDADO EM PRODUÇÃO:
NÃO TOCADO:
PENDÊNCIAS / RISCOS:
PRÓXIMO DONO:
```
