# Handoff Codex ↔ Claude — 2026-08-27

- **Data do snapshot:** 2026-08-27, America/Sao_Paulo
- **Base remota confirmada depois da entrega mais recente:** `06751c15bdbe05c4bb87d5188fbbc5bde52321bf`
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

### 2.16 Quick-start por tipo de entrada para o tráfego do ChatGPT

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `712ef3b00115f195359aa18c13778469593f79e4`.

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, janela de 30 dias lida em 28/08/2026, contas internas excluídas):** 194 cadastros foram atribuídos ao ChatGPT; 112 dessas pessoas têm ao menos um vídeo `completed` na tabela `videos`; 25 pessoas emitiram `checkout_started` e uma emitiu `payment_success`. O evento de pagamento não foi rebatizado como assinatura.
- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, mesma janela e coorte):** 190 pessoas chegaram ao criador, 167 iniciaram geração, 106 emitiram conclusão e 40 emitiram falha. A tabela `videos` e o evento de conclusão são réguas diferentes e permanecem separados.
- A faixa ChatGPT anterior foi vista por 54 atores desde 22/08, mas só informava créditos e preço. Agora pergunta “What did ChatGPT give you?” e oferece dois caminhos allow-listed: roteiro pronto → `verbatim/35s`; ideia → `ai/45s` (`lib/growth/chatgptQuickstart.ts:1-23`; `components/ChatGptWelcomeBanner.tsx:107-139`).
- A aquisição first-touch não é sobrescrita por uma nova UTM. Nenhum prompt ou roteiro entra na telemetria; somente a escolha allow-listed, a variante e o destino são gravados (`components/ChatGptWelcomeBanner.tsx:117-123`).
- A impressão da variante é deduplicada por sessão. O dismiss continua reversível na sessão e agora também carrega a variante (`components/ChatGptWelcomeBanner.tsx:73-80,141-146`).
- O funil causal exige o mesmo ator e ordem cronológica em `view → choice → generation start → completed video → checkout → payment`; geração ou compra antiga não recebe crédito (`lib/admin/chatgptQuickstartFunnel.ts:52-132`).
- O admin diferencia falta de dados de zero e mostra roteiro versus ideia separadamente (`app/api/admin/funnel/route.ts:621-642,1176-1182`; `app/(dashboard)/admin/funnel/FunnelClient.tsx:602-614`).
- Testes: `test-chatgpt-quickstart.mjs` `48/48`; regressões relacionadas `249/249`; TypeScript com somente os quatro erros de baseline; whitespace limpo.
- Preview visual obrigatório: `docs/previews/CHATGPT-QUICKSTART-2026-08-28.html`, inspecionado em desktop e mobile.
- **EVIDÊNCIA DE PRODUÇÃO (28/08/2026):** deploy `dpl_2HP5zyWrD6wv1VwQu5T5Dy24uqxg` em estado `READY`, aliasado em `www.usekineo.com`. GETs sem JavaScript confirmaram que os dois destinos preservam modo, duração e escolha através do redirect para signup; `/api/admin/funnel` respondeu 403 sem sessão. Zero erro/fatal no runtime do deploy nos 15 minutos consultados.
- **QUESTÃO PENDENTE / DESCONHECIDO:** nenhum ator externo de `chatgpt_quickstart_v1` foi observado ainda. Não comparar a nova variante com os 194 cadastros históricos até existir amostra pós-deploy.

### 2.17 Porta de brief para volume B2B recorrente

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `38ccd95ee6eb5db899c0c34df5026acddadf2c80`.

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT agregado, 28/08/2026, contas internas excluídas):** antes da variante, não havia ator identificável nem linha de evento em `agency_bulk_page_viewed`, `agency_margin_calculator_viewed`, `agency_margin_pack_selected`, `agency_bulk_pack_clicked`, `bulk_checkout_started` ou `bulk_purchase_completed` desde 27/08. A tabela `leads` tinha zero linha. O problema observado continuava anterior ao checkout.
- A página `/ai-shorts-for-agencies` preserva os quatro packs self-service e agora oferece uma segunda porta, depois dos packs, para quem planeja 10–19, 20–49, 50–99 ou 100+ Shorts por mês (`app/ai-shorts-for-agencies/AgencyBriefClient.tsx`; `lib/growth/b2bLead.ts`).
- O formulário coleta somente faixa de volume allow-listed e e-mail. Não coleta briefing livre, empresa, prompt ou roteiro; a telemetria nunca recebe o e-mail. A impressão exige 50% de visibilidade e é deduplicada por sessão.
- A rota órfã `/api/lead-capture` passou a distinguir o novo `agency_brief` do lead magnet B2C. A classificação B2B é fixada pelo servidor, o corpo é limitado a 4 KB, há honeypot, validação determinística e falha de banco responde 503. Brief B2B nunca dispara o e-mail automático de ideias virais (`app/api/lead-capture/route.ts`).
- **EVIDÊNCIA DE PRODUÇÃO (Supabase, 28/08/2026):** `public.leads` tem RLS ativo, zero policy, índice único por `lower(email)` e acesso de service role; grants de anon/authenticated existem no catálogo, mas sem policy o RLS bloqueia acesso pela Data API. A rota de servidor usa service role, nunca o cliente.
- O admin protegido agora mostra visualizações do brief por ator e o inbox canônico por e-mail único, faixa e data. Contato continua manual e a própria UI exige aprovação do fundador antes de qualquer mensagem (`app/api/admin/funnel/route.ts`; `app/(dashboard)/admin/funnel/FunnelClient.tsx`).
- Testes: brief B2B `61/61`; página B2B `30/30`; calculadora `46/46`; distribuição `31/31`; contrato comercial `305/305`; TypeScript com somente os quatro erros de baseline; whitespace limpo.
- Preview visual obrigatório: `docs/previews/B2B-LEAD-INTAKE-2026-08-28.html`, inspecionado em desktop e em viewport real de 390 px. O primeiro preview mobile apertava o quadro desktop; o artefato foi corrigido e revalidado antes do push.
- **EVIDÊNCIA DE PRODUÇÃO (28/08/2026):** deploy `dpl_7CR6kJdjkCv1ea5CE5ToG8nEquGQ` em estado `READY`, aliasado em `www.usekineo.com`. A página e o formulário renderizaram em desktop e mobile. O smoke POST com honeypot respondeu HTTP 200 antes do banco. Zero erro runtime/fatal foi encontrado no deploy.
- A validação visual com JavaScript emitiu quatro eventos anônimos sintéticos na mesma sessão (`landing_session_started`, `agency_bulk_page_viewed`, `agency_margin_calculator_viewed` e `b2b_brief_viewed`). O primeiro cleanup removeu o brief; a auditoria seguinte identificou e removeu os três resíduos por UUID, sessão, horário e nome. A verificação final retornou `old_synthetic_session_rows=0`. Nenhum lead ou dado de cliente foi tocado.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe visitante humano observado na oferta B2B ou no brief. A nova porta impede que uma empresa interessada seja forçada direto ao checkout, mas não prova demanda. O próximo sprint deve aumentar distribuição qualificada ou preparar um lote de prospecção para aprovação, não mudar novamente o formulário sem amostra.

### 2.18 Roteador pré-cadastro para ideia versus roteiro pronto

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `8837edeb0aeddb04331186702f524f0f2090cae0`.

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, janela de 7 dias lida em 28/08/2026, contas internas excluídas):** ChatGPT atribuiu 52 cadastros, 30 pessoas com vídeo concluído, 5 pessoas que abriram checkout e 1 pessoa com sinal `paid-like`. Esse último número é um proxy composto de plano, assinatura ou evento no perfil; não é validação de assinatura ativa no Stripe. Na mesma régua, TAAFT atribuiu 36 cadastros, 14 pessoas com vídeo concluído, 3 pessoas que chegaram a alguma superfície de checkout, 2 com `checkout_started` e nenhuma com sinal `paid-like`.
- **EVIDÊNCIA DE PRODUÇÃO (mesma consulta e data):** `push58_text_to_video_shorts` é a campanha ChatGPT nomeada mais forte observada: 13 pessoas cadastradas, 9 com vídeo concluído, 3 que abriram checkout e nenhuma com sinal `paid-like`.
- A página dizia aceitar “topic, prompt, or full script”, mas não enviava `script_mode`; portanto, os três tipos seguiam o default `ai` do contrato existente (`app/text-to-video-shorts/page.tsx`; `lib/creationHandoff.ts`).
- O formulário agora pergunta explicitamente o ponto de partida antes do cadastro. Ideia ou tópico preserva o comportamento histórico `ai/45s`; roteiro pronto usa o contrato já existente `verbatim/35s`. Os dois caminhos preservam prompt, intenção, campanha, modo e duração até o criador (`app/text-to-video-shorts/TextToVideoIntentForm.tsx`; `lib/growth/textToVideoIntent.ts`).
- A telemetria existente `organic_topic_submitted` recebe somente modo, duração e variante allow-listed. Prompt e roteiro não são enviados para analytics (`app/youtube-shorts-from-topic/TopicGeneratorForm.tsx`).
- Testes: roteador `36/36`; handoff ChatGPT `69/69`; quick-start `48/48`; distribuição B2B `31/31`; total relacionado `184/184`. Whitespace limpo e checklist React aplicado.
- **TESTADO LOCALMENTE:** o TypeScript da ponta atual tem cinco erros preexistentes, nenhum nos arquivos desta entrega. O quinto está em `app/api/analyze-idea/route.ts`, introduzido anteriormente pelo commit `351d4be`; os outros quatro são o baseline já registrado.
- Preview visual obrigatório: `docs/previews/TEXT-TO-VIDEO-INTENT-ROUTER-2026-08-28.html`, inspecionado em desktop e mobile. O formulário real também foi inspecionado em produção nos dois viewports.
- **EVIDÊNCIA DE PRODUÇÃO (28/08/2026):** deploy `dpl_FBma6kj9Qj2R2ZZUHkLWMGL6d34f` em estado `READY`. O smoke em `www.usekineo.com/text-to-video-shorts` confirmou o default `ai/45s` e a troca explícita para `verbatim/35s`; não submeteu formulário, não criou cadastro e não iniciou render. Analytics e Vercel Insights foram bloqueados no navegador de teste. A consulta final retornou zero linha da sessão sintética e zero submissão da nova variante. Nenhum erro runtime foi encontrado em `/text-to-video-shorts` ou `/signup` na janela consultada.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe submissão humana observada da variante `text_to_video_intent_v1_2026_08_28`. Não alterar novamente o formulário antes de obter amostra; a próxima rodada deve ampliar distribuição qualificada e observar a passagem `modo → cadastro → vídeo → checkout`.

### 2.19 Roteador de criação para motores de resposta

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `f8514666da27a27a93f6ccb44b218d9bbbe440d0`.

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, janela de 15 a 28/08/2026, contas internas excluídas):** o estudo `/state-of-ai-shorts-2026` registrou 105 atores únicos na página, 12 pessoas no starter, 8 cadastros atribuídos à campanha `starter_state_of_ai_shorts`, 5 pessoas com vídeo concluído, 1 pessoa no checkout e 0 pessoa com sinal `paid-like`. Eventos espelhados de clique não foram contados como pessoas adicionais.
- A infraestrutura AEO já tinha regras explícitas para GPTBot/OAI-SearchBot em `robots`, `/llms.txt`, `/api/facts` e submissão por IndexNow; ela não foi reconstruída. O fato ausente era a escolha exata entre ideia e roteiro pronto.
- `lib/growth/answerEngineCreationRouter.ts` deriva a decisão da mesma configuração executável usada pela interface. `/api/facts` expõe `creationRouter` em JSON e `/llms.txt` publica: ideia → `ai/45s`; roteiro terminado → `verbatim/35s`; ambos apontam para a âncora específica da página e preservam a campanha `push58_text_to_video_shorts`.
- Testes: roteador `47/47`; handoff ChatGPT `69/69`; quick-start `48/48`; distribuição B2B `31/31`; total relacionado `195/195`. Whitespace limpo.
- **TESTADO LOCALMENTE:** o TypeScript continua com os mesmos cinco erros preexistentes, nenhum nos arquivos desta entrega.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy `dpl_8qySJsSh9jDTu763ygnNcX28pZZW` em estado `READY`. `https://www.usekineo.com/llms.txt` e `https://www.usekineo.com/api/facts` responderam HTTP 200 com modos, durações, URL e campanha correspondentes. Nenhum erro runtime dessas rotas apareceu na janela de 20 minutos consultada.
- **EVIDÊNCIA DE DISTRIBUIÇÃO (28/08/2026 04:18:44 UTC):** o IndexNow aceitou 171 URLs canônicas do sitemap, HTTP 200. A página `/text-to-video-shorts` e `/facts` foram reenviadas; `/llms.txt` e `/api/facts` não fazem parte do sitemap e não devem ser contadas nessa submissão.
- A mudança visual que moveria o starter do estudo foi descartada integralmente: a política de segurança do navegador bloqueou o preview local e o gate visual do `AGENTS.md` não pôde ser satisfeito. O arquivo da página voltou byte a byte ao `HEAD`; nenhuma alteração visual foi publicada.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não há evidência de recrawl, recomendação adicional do ChatGPT ou impacto em cadastro/assinatura. HTTP 200 prova distribuição técnica, não receita. A próxima rodada deve observar submissões humanas e origem ChatGPT sem alterar novamente o contrato antes de obter amostra.

### 2.20 Starter do estudo no primeiro ponto de decisão

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `06751c15bdbe05c4bb87d5188fbbc5bde52321bf`.

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, janela de 15 a 28/08/2026, contas internas excluídas):** `/state-of-ai-shorts-2026` registrou 105 atores únicos na página, 12 pessoas no starter, 8 cadastros atribuídos a `starter_state_of_ai_shorts`, 5 pessoas com vídeo concluído, 1 pessoa no checkout e 0 pessoa com sinal `paid-like`. O starter já produzia passagem ao produto, mas aparecia depois de todo o corpo do estudo.
- O mesmo `TopicGeneratorForm`, com a mesma campanha, origem, exemplos e destino, passou a renderizar imediatamente depois dos quatro `Key findings` e antes de `How long an AI Short actually takes`. Não existe segundo CTA concorrente. `placement=after_key_findings` e a variante `state_study_starter_after_findings_2026_08_28` separam a nova posição na telemetria sem quebrar a série histórica.
- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, janela de 21 a 28/08/2026, contas internas excluídas):** o canal de afiliados tinha 11 afiliados externos, apenas 3 visitas cruas de 2 afiliados em 3 dias, 0 referral e 0 perfil cadastrado com `signup_utm_source=affiliate` ou `signup_utm_medium=partner`. Não há cadastro perdido que prove bug de atribuição; o gargalo observado é distribuição. Nenhum código de afiliado foi alterado nesta entrega.
- Teste determinístico `scripts/test-state-study-starter-position.mjs`: `21/21`. Whitespace limpo. O TypeScript continua com os mesmos cinco erros preexistentes, nenhum nos arquivos desta entrega.
- Preview obrigatório: `docs/previews/STATE-STUDY-STARTER-POSITION-2026-08-28.html`, com pares antes/depois em desktop e mobile. A limitação registrada no item 2.19 foi superada sem contorno local: o SHA foi publicado primeiro no preview remoto `dpl_26vsusUa1PMkWvBoTEFEzyWjcJgN` e inspecionado visualmente nos dois viewports antes da promoção para `main`.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy `dpl_HA9yfAiUpZv4WZXAU8LyBFbbkCV5` em estado `READY`, aliasado em `www.usekineo.com`. A página respondeu com exatamente um `#study-start-a-short` e a ordem de títulos `Key findings → Test the data yourself — free → How long an AI Short actually takes`. Nenhum formulário foi submetido na validação e nenhum erro runtime da rota apareceu na janela consultada.
- **QUESTÃO PENDENTE / DESCONHECIDO:** a mudança de posição ainda não tem amostra humana. Comparar pessoas — não eventos espelhados — por variante e seguir até cadastro, vídeo e checkout antes de mudar novamente o estudo.

### 2.21 Construtor de ângulo original na objeção de monetização

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `d86901dc7d1e35752a8b691462cf42dc6ac3b604`.

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, janela de 15 a 28/08/2026, contas internas excluídas):** `/can-you-monetize-ai-videos` registrou 32 atores únicos em `landing_session_started`, 0 pessoa em intenção orgânica na própria página e 0 cadastro com `signup_utm_source=monetize-policy`. A página era a maior URL orgânica específica ainda sem ação observada fora das superfícies genéricas `/`, `/signup` e `/studio`.
- **FATO CONFIRMADO:** a única porta comercial ficava depois do artigo e era um `<a>` cru para outra página SEO, `/free-ai-shorts-generator`; não emitia `organic_cta_clicked`, não carregava um trabalho iniciado e criava outro passo antes do produto (`app/can-you-monetize-ai-videos/page.tsx`).
- A página agora transforma o checklist de política em uma ferramenta: a pessoa escreve o tema e escolhe entre quatro valores ao espectador — explicar a surpresa, mito versus fato, história com payoff ou breakdown prático. `lib/growth/originalityRecipe.ts` monta uma instrução de 45 segundos com ângulo distinto, detalhes concretos e proibição explícita de prometer monetização.
- O formulário carrega a receita para o fluxo Fast por `/signup`, preserva campanha e duração, e mede `monetization_originality_recipe_submitted`, `organic_topic_submitted` e o espelho deduplicável `organic_cta_clicked`. Nenhum tema ou prompt é enviado para analytics. O CTA inferior virou handoff interno medido por `organic_handoff_opened`, em vez de mandar a pessoa para outra página SEO (`app/can-you-monetize-ai-videos/OriginalityRecipeBuilder.tsx`; `components/OrganicCtaLink.tsx`).
- Teste determinístico `scripts/test-monetization-originality-builder.mjs`: `30/30`. Whitespace limpo. O TypeScript continua com os mesmos cinco erros preexistentes, nenhum nos arquivos desta entrega.
- Preview obrigatório: `docs/previews/MONETIZATION-ORIGINALITY-BUILDER-2026-08-28.html`. O SHA foi publicado primeiro no preview remoto `dpl_FJhhcEBnkkEyWsjm13DsaYXvWAVE`. A primeira inspeção desktop encontrou a grade 3+1; ela foi corrigida antes de `main`. A versão final passou em desktop 1440×1000 e mobile 390×844, com grade 2×2 e uma coluna, respectivamente.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy `dpl_12cmXinHtBJccybtUEaEwXQYoWgb` em estado `READY`, aliasado em `www.usekineo.com`. O smoke confirmou uma única ferramenta, ausência do destino SEO antigo, handoff interno e aviso de não garantia. Nenhum formulário foi submetido e nenhum erro runtime da rota apareceu na janela de 20 minutos consultada.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe submissão humana da campanha `starter_monetization_originality_2026_08_28`. Não alterar novamente essa página antes de observar pessoas em receita → cadastro → vídeo → checkout.

### 2.22 Verdade comercial do PayPal na recuperação de checkout

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `a9e3a5e22d20f909be3a606b1275584d25885236`.

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, janela de 21 a 28/08/2026, contas internas excluídas):** TAAFT atribuiu 37 cadastros, 14 pessoas com vídeo concluído, 11 pessoas em `pricing_view`, 2 pessoas em `checkout_started` e 0 pessoa com sinal de pagamento. `pricing_view` e `checkout_started` são estágios diferentes; as 11 pessoas não foram chamadas de checkout.
- **EVIDÊNCIA DE PRODUÇÃO (Stripe, SELECT agregado lido em 28/08/2026):** os dois checkouts TAAFT iniciados e não pagos eram um Creator mensal de US$15 com país de IP Paquistão e um Studio mensal de US$29 com país de IP Brasil; ambos estavam expirados e elegíveis para recuperação. Nenhum identificador pessoal foi copiado para este handoff.
- **FATO CONFIRMADO:** o cron de recuperação já enviava `/api/paypal/checkout?tier=...`, mas `lib/paypal.ts` mantinha preços US$9,90/24,90/37,90, grants 25/150/200 e pack de 10 créditos, enquanto a fonte canônica `lib/checkoutPricing.ts` define US$7/15/29, grants 40/90/180 e pack de 30 créditos por US$4,90. O rail vivo podia criar uma oferta diferente da anunciada.
- `lib/paypalCatalog.ts` agora deriva preço mensal, anual, grants e pack exclusivamente de `lib/checkoutPricing.ts`. `lib/paypal.ts` deixou de manter tabela comercial paralela.
- Planos PayPal são objetos comerciais imutáveis. A chave passou a incluir preço e grant (`plan_{tier}_{billing}_usd{minor}_c{credits}_v2`), impedindo que os IDs antigos sejam reutilizados. O lookup do webhook continua reconhecendo planos novos e legados já emitidos.
- Os botões públicos continuam deliberadamente desligados (`PAYPAL_ENABLED = false`). Esta entrega corrige o caminho de recuperação existente; não declara o PayPal pronto para exposição geral.
- Testes: contrato PayPal `55/55`, incluindo OAuth/fetch mockado, criação única do plano canônico, cache, preço enviado e lookup novo/legado; contrato comercial `305/305`; whitespace limpo. O TypeScript continua com os mesmos cinco erros preexistentes, nenhum nos três arquivos desta entrega.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy `dpl_E6t8T5iu21umBbNemyPx7wYYKukX` em estado `READY`, aliasado em `www.usekineo.com`. Um GET anônimo em `/api/paypal/checkout?tier=starter` terminou em `/signup`, provando que a rota carregou e o gate de autenticação barrou antes do provedor. `paypal_events` permaneceu em 0 e não houve erro runtime nas rotas `/api/paypal/checkout`, `/api/paypal/webhook` e `/api/paypal/return` nos 30 minutos consultados.
- **QUESTÃO PENDENTE / DESCONHECIDO:** nenhum pagamento PayPal real foi executado. Antes de ligar os botões públicos, fazer um canário pago controlado e verificar criação/aprovação, webhook, grant exato e cancelamento/estorno. Não chamar esta integração de `VALIDADA EM PRODUÇÃO` ponta a ponta até essa prova.

### 2.23 Retomada do checkout PayPal depois do login

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `f579851f9dd5f50b96c96aa54df3825c22a72bdc`.

- **FATO CONFIRMADO:** `/api/paypal/checkout` autenticava antes de guardar o pedido. Um destinatário deslogado do e-mail de recuperação era enviado para `/signup?redirect=/pricing`; tier, periodicidade e a própria ação de checkout eram descartados (`app/api/paypal/checkout/route.ts`, estado anterior ao commit).
- O novo resolvedor aceita somente `starter|basic|pro`, `monthly|annual` e o First Pack. Ele monta um retorno interno canônico e remove qualquer query estranha antes de atravessar autenticação (`lib/paypalCheckoutIntent.ts`).
- Comprador deslogado agora entra em `/login?reason=checkout&redirect=<checkout PayPal exato>`. O login por senha, Google OAuth, Apple e o middleware já compartilham esse contrato same-origin; nenhuma nova autenticação foi criada.
- O retorno recebe `resumed=1`. Se a sessão ainda não puder ser confirmada, a rota termina em `/pricing` com erro visível, em vez de alternar login e checkout indefinidamente.
- O comentário do cron foi corrigido para descrever o caminho executado. O e-mail, destinatários, frequência e texto comercial não mudaram; nenhum e-mail foi enviado nesta sprint.
- Testes: contrato PayPal `71/71`, agora executando a própria rota com Supabase e provedor mockados. Cobre Creator mensal, Studio anual, pack, tier inválido, remoção de query arbitrária, loop retomado e zero chamada ao provedor nos caminhos anônimos. Contrato comercial `305/305`; whitespace limpo. TypeScript com os mesmos cinco erros preexistentes, nenhum nesta entrega.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy `dpl_BC5p9s5ahWvRSnNS75EbTit5aHUS` em estado `READY`. GET anônimo em `?tier=basic` respondeu 307 para `/login?reason=checkout&redirect=%2Fapi%2Fpaypal%2Fcheckout%3Ftier%3Dbasic%26billing%3Dmonthly%26resumed%3D1`. O mesmo GET com `resumed=1` respondeu 307 para `/pricing?checkout_error=...`, provando o término do loop. `paypal_events` permaneceu em 0 e não houve erro runtime em checkout/login/pricing nos 20 minutos consultados.
- **QUESTÃO PENDENTE / DESCONHECIDO:** o retorno autenticado até a tela de aprovação do PayPal ainda exige o canário pago controlado já registrado no item 2.22. O smoke desta entrega deliberadamente parou antes de autenticar e antes do provedor.

### 2.24 Checkout Stripe salvo dentro da página de preços

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `1fafdbf3976bb70a804acdaee00462b2a5e6b514`.

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, janela de 30 dias lida em 28/08/2026, contas internas excluídas):** 79 pessoas viram o banner flutuante de checkout salvo, 66 o dispensaram e 10 clicaram. Duas pessoas emitiram `payment_success` depois de um clique de retomada; sete pessoas emitiram `payment_success` no total da coorte observada. Visualização, dispensa, clique e pagamento continuam estágios distintos.
- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, janela de 7 dias lida em 28/08/2026, contas internas excluídas):** 11 pessoas viram o banner, 10 dispensaram e 3 clicaram; houve 1 `payment_success` na coorte. O padrão observado justificou trocar o contexto, não alterar preço ou oferta.
- A página `/pricing` agora consulta o checkout pertencente ao comprador e, quando existe candidato recuperável, mostra plano, primeira cobrança, renovação e uma única ação para continuar antes de uma nova escolha (`components/PricingSavedCheckout.tsx:31-113`; `app/pricing/PricingClient.tsx:592`). Os valores vêm da Stripe pela rota existente; o componente não contém preço comercial literal.
- O cookie de dispensa continua bloqueando a superfície global passiva. Somente `surface=pricing`, allow-listed no helper, permite que a escolha reapareça no contexto explícito da página de preços; `?go=1` mantém seu contrato anterior (`lib/checkoutResumeSurface.ts:15-26`; `app/api/stripe/checkout/resume/route.ts:358,426`). Posse da sessão, assinatura ativa e duplicidade de Customer continuam validadas depois desse ponto.
- O banner flutuante fica oculto em `/pricing`, evitando dois pedidos de retomada no mesmo viewport (`components/CheckoutResumeBanner.tsx:19`). O card contextual não tem botão de dispensar nem cria sessão: o clique usa `useCheckoutLaunch`, e a rota decide entre sessão aberta, recovery da Stripe ou retry interno validado.
- A medição nova separa `pricing_saved_checkout_viewed` de `pricing_saved_checkout_clicked`, com tier, periodicidade, moeda e valores; nenhum e-mail, identificador, prompt ou dado livre entra na telemetria (`components/PricingSavedCheckout.tsx:56,106`).
- Teste determinístico `scripts/test-pricing-saved-checkout.mjs`: `25/25`. Cobre política de dispensa, surface allow-listed, valor dinâmico, ausência de preço literal, no-store, abort, launcher protegido, telemetria e caller real. Whitespace limpo e checklist React aplicado.
- **TESTADO LOCALMENTE:** o TypeScript continua com os mesmos cinco erros preexistentes, nenhum nos arquivos desta entrega. O build local compilou a aplicação e parou na coleta de `/api/generate-broll-plan` porque a worktree isolada não contém `OPENAI_API_KEY`; nenhum segredo foi lido ou injetado. O build completo da Vercel terminou verde.
- Preview visual obrigatório: `docs/previews/PRICING-SAVED-CHECKOUT-2026-08-28.html`, com antes/depois desktop e mobile. Foi publicado temporariamente apenas na branch de preview, inspecionado em 1440 px e 390 px, sem overflow horizontal, e a rota pública temporária foi removida antes de `main`.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy `dpl_3cpqA3gy2faVVVLn83SVHDBJMX7s` em estado `READY`, aliasado em `www.usekineo.com`. `/pricing` respondeu com título, planos e checkout normal; o card e o banner global ficaram ausentes para o navegador anônimo. `/api/stripe/checkout/resume?surface=pricing` respondeu HTTP 401, `{"available":false,"reason":"signed_out"}`, com `Cache-Control: private, no-store`. Nenhum erro runtime foi encontrado em `/pricing` ou `/api/stripe/checkout/resume` na janela de 10 minutos consultada.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não houve um comprador humano autenticado com checkout salvo observado no novo card após o deploy. Medir pessoas em `viewed → clicked → checkout_started → payment_success` antes de alterar novamente a superfície. Não atribuir os dois pagamentos históricos a esta variante.

### 2.25 Missão persistente para o primeiro clique do afiliado

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `5c5561b1a6dfea26ad926af6ad2ad0d209232998`.

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT agregado em 28/08/2026 06:01 UTC, contas internas excluídas):** existem 11 afiliados externos ativos. Sete têm zero clique vitalício, quatro têm ao menos um clique, o canal soma 17 visitas cruas e nenhum dos 11 gerou linha em `affiliate_referrals`. Clique cru, pessoa e referral permanecem réguas distintas.
- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT agregado em 28/08/2026 06:02 UTC, mesma coorte):** zero dos 11 afiliados era elegível ao card anterior de `/history`, que exigia simultaneamente plano Starter/Creator/Studio e pelo menos dois vídeos concluídos. Logo, a superfície de ativação existente cobria exatamente 0 dos 7 afiliados sem clique.
- O kit, a atribuição first-touch, o cupom e os três destinos já existiam e não foram duplicados. `lib/affiliateFirstClick.ts` governa o novo estado: somente conta autenticada, afiliado `active`, contagem canônica exatamente igual a zero e link de afiliado validável recebem a oferta. Estado desconhecido falha fechado; o link copiado é reescrito para `https://www.usekineo.com`.
- `components/AffiliateFirstClickNudge.tsx` usa `/api/affiliate/me` e aparece somente em `/studio` e `/history`. Entrega em um clique a legenda já existente do destino recomendado, com link individual e cupom quando disponível; também oferece continuação para a âncora exata do kit. A superfície desaparece depois da primeira visita elegível registrada.
- O painel `/affiliate` passou a manter a missão `0 link visits` em retornos futuros, não só no render imediatamente depois da aplicação. Mostra os três passos `link live → publish ready post → first eligible visit` imediatamente antes do kit já existente (`app/(dashboard)/affiliate/page.tsx`).
- A medição nova separa impressão, cópia e abertura da missão global (`affiliate_first_click_nudge_viewed|copied|opened`) da impressão persistente no painel (`affiliate_first_click_mission_viewed`). Os eventos existentes de cópia e compartilhamento recebem `first_click_mission`; nenhum e-mail, prompt, texto livre ou identificador entra na telemetria.
- Testes: destinos + política + callers `205/205`; ativação anterior `34/34`; whitespace limpo. O TypeScript tem somente os quatro erros preexistentes de Stripe/preço, nenhum nos arquivos desta entrega.
- Preview visual obrigatório: `docs/previews/AFFILIATE-FIRST-CLICK-MISSION-2026-08-28.html`, com os dois pontos tocados em pares antes/depois. O SHA funcional foi construído em preview Vercel e inspecionado em desktop e viewport real de 390 px. A página pública auxiliar foi removida da branch antes da integração em `main`.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy `dpl_GpiQyZja4HMgk8yrikCzwH5f2G7p` em estado `READY`, aliasado em `www.usekineo.com`. `/studio` carregou no host canônico; o navegador anônimo não recebeu a missão. `/api/affiliate/me` respondeu 401 sem sessão e nenhum erro runtime foi encontrado em `/studio` ou `/api/affiliate/me` na janela de 15 minutos consultada.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não houve um afiliado externo zero-clique observado na nova missão depois do deploy. Medir pessoas em `mission/nudge viewed → copied/opened → primeira linha em affiliate_clicks → referral` antes de mudar novamente a interface. O deploy reduz a distância até a distribuição; não prova aquisição nem assinatura.
- **NÃO TOCADO:** render, cena, legenda, motor, preço, oferta, comissão, e-mail, outreach e escrita de banco.

### 2.26 Rota de decisão TikTok versus YouTube até o primeiro vídeo

**FATO CONFIRMADO / IMPLEMENTADO.** Commit funcional `0bc15a9a3c7263e8034dae6e10367889fbbf44e8`.

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, janela de 30 dias lida em 28/08/2026 06:32 UTC):** `/tiktok-vs-youtube-shorts-monetization` teve 16 atores deduplicados por usuário ou sessão e zero ator em qualquer ação registrada na página. Contas internas vinculadas a usuário foram excluídas; sessões anônimas sem usuário não podem ser classificadas por e-mail. A página já tinha um CTA genérico sem instrumentação própria.
- Páginas orgânicas maiores não foram reeditadas: estudo, exemplos, monetização de IA e comparador de custo receberam experiências recentes e ainda não têm amostra pós-deploy suficiente. O cluster `/vs` e `/alternatives` teve tráfego fragmentado por muitas URLs; não justificou uma intervenção transversal nesta rodada.
- `lib/platformDecision.ts` governa nove combinações de objetivo (`reach|revenue|customers`) e conteúdo (`stories|expertise|business`). Cada combinação termina em `TikTok first`, `YouTube Shorts first` ou `Publish to both`, com razão, segundo movimento, duração suportada e conceito inicial editável.
- O card genérico da página virou uma decisão em dois cliques. O CTA leva prompt, `create_intent=fast`, campanha, UTM e duração até `/signup`; nada é gerado antes da pessoa revisar e nenhum fornecedor é chamado (`app/tiktok-vs-youtube-shorts-monetization/PlatformDecisionClient.tsx`; `app/tiktok-vs-youtube-shorts-monetization/page.tsx`).
- A telemetria separa objetivo, rota concluída e clique final (`platform_route_goal_selected`, `platform_route_completed`, `platform_route_cta_clicked`) e espelha somente a intenção final no funil canônico `organic_cta_clicked`. Nenhum tema livre, e-mail ou identificador entra nos metadados.
- Teste executável `scripts/test-platform-decision.mjs`: `60/60`, cobrindo as nove combinações, contrato até signup, campanha, duração, ausência de API e caller real. Whitespace limpo e checklist React aplicado. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos desta entrega.
- Preview visual obrigatório: `docs/previews/PLATFORM-DECISION-ROUTE-2026-08-28.html`, com antes/depois em desktop e mobile. A branch foi construída no deploy `dpl_Bx6X1SKr7bHu8CiQAEgdwdRPgysG` (`READY`); o fluxo real foi exercitado em desktop e 390 px, com as duas recomendações, CTA visível, query completa e zero overflow horizontal.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy `dpl_EimbktFz7hi3duoopjiy1jygY7V3` em estado `READY`, aliasado em `www.usekineo.com`. O host canônico respondeu HTTP 200, continha o novo título e o chunk cliente e não continha o card antigo. Nenhum erro runtime da rota apareceu na janela de 30 minutos consultada. O smoke não submeteu formulário nem iniciou geração.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe ator humano observado na nova rota. Medir pessoas em `goal selected → route completed → CTA → signup → completed video → checkout → payment` antes de alterar novamente a página. Deploy e clique não serão chamados de assinatura.
- **NÃO TOCADO:** render, cena, legenda, motor, preço, oferta, e-mail, outreach, tráfego pago e escrita de banco.

### 2.27 Corrida de perfil no primeiro checkout Stripe

**FATO CONFIRMADO / IMPLEMENTADO.** Commit funcional `b933158c12728d72eabd39c806a137d22e5d9866`.

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, janela de 14 dias lida em 28/08/2026, contas internas excluídas):** 58 pessoas abriram 63 sessões de Checkout Stripe; 57 sessões de assinatura expiraram sem pagamento, envolvendo 53 pessoas, e 3 pessoas concluíram pagamento. Sessão, pessoa e pagamento permanecem réguas distintas.
- **EVIDÊNCIA DE PRODUÇÃO (Supabase + Stripe, SELECT, 28/08/2026):** uma compradora externa teve o perfil criado às 07:38:34 UTC e o callback OAuth concluído; dois segundos depois o checkout falhou no estágio de redirect com `we_could_not_verify_your_account_please_try_agai`. O perfil passou a existir normalmente, mas não houve Customer, Subscription nem pagamento. É uma corrida observada na leitura do perfil recém-criado, não uma hipótese genérica de abandono.
- **EVIDÊNCIA DE PRODUÇÃO (Stripe, SELECT, janela de 14 dias lida em 28/08/2026):** depois de excluir a conta interna, a distribuição da Stripe reproduziu exatamente as 63 sessões e 58 atores observados no banco. A configuração usada tem cartão, Apple Pay e Google Pay habilitados; `payment_method_types=["card"]` inclui wallets e não prova configuração quebrada. A rota já omitia `payment_method_types`, conforme o comportamento dinâmico recomendado pela Stripe.
- **FATO CONFIRMADO:** a rota lia `profiles` uma única vez logo após autenticar e devolvia erro antes das verificações de posse, plano e assinatura. Ela agora executa a mesma consulta com teto fixo de quatro leituras e espera acumulada máxima de 2 segundos somente após falha ou ausência; sucesso continua com uma única leitura e espera zero (`app/api/stripe/checkout/route.ts:860-889`; `lib/stripe/checkoutProfileRead.ts:19-66`).
- Nenhum perfil é criado ou atualizado por esse helper. Se a leitura continuar falhando, o checkout continua bloqueado. As verificações existentes de Customer, PayPal, Stripe Subscription, Plan Fit e duplicidade permanecem depois do mesmo gate.
- A telemetria registra `profile_lookup_attempts` e `profile_lookup_recovered`, sem mensagem livre, para que a próxima recuperação humana seja demonstrável por evento e não inferida (`app/api/stripe/checkout/route.ts:875-877`).
- Testes executáveis: corrida de perfil `25/25`; recuperação de checkout salvo `25/25`; whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos desta entrega.
- Preview Vercel `dpl_C8yQdSDiJfHXLY8fMvEnLsqsFKzK` e produção `dpl_6ZsoGaJZS4e7Nai8THKz7gdMMXpy` terminaram `READY`; o build de produção concluiu em 42 segundos e não houve erro runtime em `/api/stripe/checkout` na janela de 30 minutos consultada.
- **IMPLEMENTADO / TESTADO LOCALMENTE / PUBLICADO EM PRODUÇÃO (28/08/2026):** a recuperação em si ainda não é chamada de `VALIDADA EM PRODUÇÃO`, porque não foi criada outra conta nem iniciado checkout pago para fabricar a condição. A validação fecha quando uma pessoa real emitir `checkout_started` com `profile_lookup_recovered=true`.
- **QUESTÃO PENDENTE / DESCONHECIDO:** o checkout como coorte ainda converte pouco, sobretudo TAAFT: 27 pessoas chegaram ao primeiro checkout atribuído ao canal e 1 pagou. A variante pós-vídeo `single_primary_v1` ainda tinha zero visualização externa na leitura; não alterar preço, oferta ou essa superfície antes de haver amostra humana.
- **NÃO TOCADO:** render, cena, legenda, motor, preço, grant, oferta, e-mail, outreach, tráfego pago e escrita de banco.

### 2.28 Missão de indicação no histórico sem publicar o vídeo

**FATO CONFIRMADO / IMPLEMENTADO.** Commit funcional `268faa76ba9d9cb771882a89a9a64753253f6834`, reaplicado sobre `eab4ae70e28563125e62de2682ebefeeab6ac1ec` antes da publicação.

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, janela de 30 dias lida em 28/08/2026, contas internas excluídas):** 327 pessoas viram alguma superfície de compartilhamento, 35 clicaram e 16 emitiram compartilhamento concluído. No `history_spotlight`, 108 pessoas viram, 4 clicaram e 2 compartilharam; o último clique observado era de 18/08, embora a superfície ainda recebesse visualizações em 27/08. Evento e pessoa permanecem réguas distintas.
- **FATO CONFIRMADO:** a hipótese inicial de melhorar o card público do histórico foi descartada antes do push. `lib/videoShare.ts` mantém `PUBLIC_VIDEO_SHARING_ENABLED = false`; portanto, o ramo `/v/[id]` não era a interface viva e publicar aquela edição teria alterado código morto.
- A interface viva preserva a privacidade e usa somente a URL individual canônica já devolvida por `/api/referral`: `https://www.usekineo.com/?ref=<code>`. O helper aceita exclusivamente HTTPS, host `www.usekineo.com`, caminho raiz, um único parâmetro `ref` igual ao código e nenhum fragmento. `/v/`, id de vídeo e asset não entram no link nem na telemetria (`lib/historyReferralMission.ts`; `app/(dashboard)/history/HistoryClient.tsx`).
- O card só aparece quando código, URL e recompensa dinâmica são válidos. Ele declara a qualificação do primeiro vídeo, que o vídeo continua privado e que nada é enviado até a pessoa escolher o destinatário. Se `/api/referral` falhar, a interface volta ao aviso privado anterior; não mostra recompensa ou botão quebrado. A rota existente pode cunhar `referral_code` na própria linha do perfil quando ele ainda não existe; não houve migration, nova tabela ou escrita em Storage.
- WhatsApp é a ação primária e apenas abre o composer depois de clique humano. Copiar usa clipboard com fallback manual. Nenhuma mensagem foi enviada pelo Codex. Os eventos preservam o funil já consumido pelo admin (`push29_share_delivery`) e acrescentam `variant=history_referral_mission_v1` e `where=history_private_referral`, sem URL, código ou vídeo.
- Teste determinístico `scripts/test-history-referral-mission.mjs`: `55/55`, incluindo contrato do host, rejeição de `/v/`, recompensa dinâmica, privacidade, caller vivo e medição existente. Whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos da entrega.
- Preview visual obrigatório: `docs/previews/HISTORY-REFERRAL-MISSION-2026-08-28.html`, com o aviso privado anterior e a missão nova em desktop/mobile. Preview Vercel `dpl_5GsSdEZYCeNt2MtEHkn7vXa2mbTg` terminou `READY` antes da promoção.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy `dpl_FvYS9N5oQVkuQopwFQbG4hgrUzun` em estado `READY`, aliasado em `www.usekineo.com`. Smoke autenticado na conta do fundador mostrou `Give 30 credits · Get 30 credits`, o limite de privacidade e os dois botões, enquanto cada vídeo continuou marcado como `Private`. Nenhum botão foi clicado, nenhuma mensagem foi enviada e nenhum render foi iniciado.
- **QUESTÃO PENDENTE / DESCONHECIDO:** o console do smoke mostrou React `#425/#422` durante hidratação. A página permaneceu funcional. `formatDate`, `classifyVideoState` e `formatStarted` já calculavam relógio durante render desde commits de maio/julho, mas isso não prova a causa desses dois erros; não atribuir nem ignorar sem reprodução controlada fora desta sprint.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders estão respondendo `402`. Claude conduz esse incidente. Esta entrega não tocou render, Storage, migration ou pipeline e falha fechada se a leitura de referral estiver indisponível.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe pessoa externa pós-deploy no funil `prompt → click → share → referred_by → first video → paid`. Medir pessoas por `variant=history_referral_mission_v1` antes de alterar novamente o card; visualização e abertura do WhatsApp não serão chamadas de referral ou assinatura.
- **NÃO TOCADO:** `/v`, sitemap, visibilidade de vídeo, render, cena, legenda, motor, Storage, preço, grant, oferta, e-mail, outreach e tráfego pago.

### 2.29 Continuação visual para o tráfego que chega do ChatGPT

**FATO CONFIRMADO / IMPLEMENTADO.** Ponta de produção `ad3ec3ecb8e803314a8b98dd247585477e124c54`, integrada por fast-forward sobre o commit `f520690eec03881b50d63ccb45b62ab18e3ca894` do Claude.

- **EVIDÊNCIA DE PRODUÇÃO (admin autenticado `/admin/funnel?days=30`, lido em 28/08/2026; contas internas excluídas pela própria coorte):** a variante `chatgpt_quickstart_v1` tinha 8 pessoas expostas e zero escolha entre roteiro e ideia. O funil de aquisição total da mesma tela tinha 384 cadastros, 143 pessoas com vídeo concluído, 21 com checkout e 3 pagantes; estes números não são atribuídos ao quick-start.
- **HIPÓTESE:** a faixa anterior escondia a decisão principal em 13 px, misturada com créditos e preço, e os caminhos pareciam chips sem explicar o resultado. A amostra de oito pessoas é pequena; a mudança é um teste instrumentado, não prova causal.
- O `chatgpt_quickstart_v2` preserva os mesmos dois destinos allow-listed e a atribuição first-touch: roteiro completo abre `verbatim/35s`; ideia abre `ai/45s`. O card agora nomeia a continuação do trabalho iniciado no ChatGPT, explica o resultado de cada escolha e deixa créditos/preço canônicos como contexto secundário (`lib/growth/chatgptQuickstart.ts`; `components/ChatGptWelcomeBanner.tsx`).
- O admin mostra a variante corrente a partir da mesma constante usada pelo produto. O helper continua causal por ator: impressão → escolha → geração → conclusão → checkout → pagamento; texto de roteiro, prompt e URL não entram na telemetria (`lib/admin/chatgptQuickstartFunnel.ts`; `app/(dashboard)/admin/funnel/FunnelClient.tsx`).
- A inspeção visual remota encontrou e impediu um defeito antes de `main`: o primeiro preview estilizado com `styled-jsx` não alcançava os anchors gerados por `next/link`. A versão final usa CSS Module, e o teste trava essa fronteira. Preview Vercel `dpl_B7qa9FRzbAnEYGB2wfrec43sRdNt` terminou `READY` e passou em desktop e 390×844: CTAs de 64 px, grade 2 colunas/1 coluna e overflow horizontal zero.
- O comparativo obrigatório está em `docs/previews/CHATGPT-QUICKSTART-V2-2026-08-28.html`. A rota auxiliar de preview foi removida antes da promoção; o smoke de produção confirmou 404 canônico e ausência do marcador `PREVIEW ONLY` em `/preview/chatgpt-quickstart`.
- Teste determinístico `scripts/test-chatgpt-quickstart.mjs`: `55/55`; whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos da entrega.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy `dpl_2Zxwku2PtgAHnb75tALBt3Art1Fo` em estado `READY`, aliasado em `www.usekineo.com`. Smoke autenticado em `/studio?utm_source=chatgpt.com` mostrou o heading novo, os dois destinos e overflow zero. Nenhum CTA foi clicado e nenhum render foi iniciado.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders estão respondendo `402`. Claude conduz o incidente. O `402` não será classificado como abandono de Growth; esta entrega não consultou o banco novamente, não tocou Storage e não executou render.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe pessoa externa na variante v2. Comparar pessoas `view → choice → start → completed → checkout → paid` somente após amostra; não chamar impressão, escolha ou geração de assinatura.
- **NÃO TOCADO:** render, cena, legenda, motor, Storage, migration, preço, grant, oferta, e-mail, outreach e tráfego pago.

### 2.30 Continuidade da recomendação nos três destinos de afiliado

**FATO CONFIRMADO / IMPLEMENTADO.** Commit funcional `ccd22f2ca9cc99d24ad16f0aee63fcc5c76c0c54`, publicado diretamente sobre `bfff43f0049395711ab194949be17896f60cd71b`.

- **FATO CONFIRMADO:** `/a/[code]` já preservava first-touch em cookies e redirecionava para três destinos allow-listed com `utm_source=affiliate`, `utm_medium=partner` e a campanha canônica do destino (`app/a/[code]/route.ts:20-43`; `lib/affiliateDestinations.ts:57-63`). As três páginas recebiam esses parâmetros, mas não os usavam na apresentação; depois do redirect a recomendação do parceiro desaparecia.
- `lib/growth/affiliateLandingContext.ts` agora exige a combinação exata `affiliate / partner / affiliate_[destino]`. Campanha trocada, origem orgânica, parâmetros vazios ou outro medium falham fechado e mantêm a página inalterada. Código do afiliado, URL, prompt e texto livre nunca entram no componente ou na telemetria.
- As três páginas allow-listed exibem uma continuação compacta da recomendação e levam ao formulário gratuito já existente: roteiro (`app/free-script-generator/page.tsx:70`; `app/free-script-generator/FreeScriptClient.tsx:161-179`), vídeo (`app/free-ai-shorts-generator/page.tsx:92-122`) e faceless (`app/faceless-video-generator/page.tsx:84-151`). Não foi criado desconto, preço, crédito, trial ou promessa comercial nova.
- A medição separa pessoas expostas e cliques voluntários em `affiliate_landing_context_viewed|clicked`, com `variant=affiliate_landing_context_v1` e `destination=script|video|faceless` (`components/AffiliateLandingContext.tsx:16-50`). A impressão é deduplicada por sessão e destino; falha de analytics nunca bloqueia a faixa ou a navegação.
- O comparativo obrigatório está em `docs/previews/AFFILIATE-LANDING-CONTEXT-V1-2026-08-28.html`. A captura local headless validou desktop e 390 px; o CTA móvel vira uma linha própria e o layout teve overflow horizontal zero.
- Teste determinístico `scripts/test-affiliate-landing-context.mjs`: `43/43`, incluindo correspondência estrita das três campanhas, rejeição de tráfego orgânico/campanha cruzada, ausência de promessa de trial e callers reais. Whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos da entrega.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy `dpl_GkP83WEop55G7536US254QY3u4sz` em estado `READY`, SHA `ccd22f2ca9cc99d24ad16f0aee63fcc5c76c0c54`, aliasado em `www.usekineo.com`. Smoke no Chrome autenticado do fundador confirmou a faixa nas três combinações canônicas, cada anchor apontando para um formulário existente, overflow zero e console sem erro. A URL orgânica de `/free-ai-shorts-generator` mostrou zero faixa. Nenhum CTA foi clicado e nenhum render foi iniciado; eventos do smoke pertencem à conta interna e devem continuar excluídos das coortes externas.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders estão respondendo `402`. Claude conduz esse incidente. O `402` não será classificado como abandono de Growth; esta entrega não consultou o banco, não tocou Storage, migration ou pipeline e não iniciou render.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não há pessoa externa observada na variante. Medir pessoas `affiliate_click → landing_context_viewed → landing_context_clicked → signup → completed → paid` apenas depois de amostra externa; visita crua, impressão, clique, cadastro e assinatura continuam estágios distintos.
- **NÃO TOCADO:** `/a/[code]`, cookie de atribuição, tabelas de afiliado, Supabase, render, cena, legenda, motor, Storage, migration, preço, grant, oferta, e-mail, outreach e tráfego pago.

### 2.31 Widget diário com atribuição do afiliado

**FATO CONFIRMADO / IMPLEMENTADO / VALIDADO EM PRODUÇÃO (28/08/2026).** Commit `b344fb0ec4edac0f2f0168abb72d26c5398bef2f`, publicado diretamente sobre `9592fbbd1a5f0e7ee8ec0e5953c752af75bed427`.

- **FATO CONFIRMADO:** o painel já entregava link, legenda e roteiro falado, enquanto o widget público diário existia apenas com aquisição genérica (`app/(dashboard)/affiliate/page.tsx:379-626`; `app/widget/embed/page.tsx:119-139`). A lacuna era um ativo durável que um afiliado pudesse instalar uma vez em blog/site e manter a própria atribuição.
- Afiliados ativos agora recebem no painel um iframe pronto, preview e botão de cópia. O snippet deriva somente do link owner-only já devolvido por `/api/affiliate/me`, canoniza para `www.usekineo.com` e carrega apenas o código público de oito caracteres (`app/(dashboard)/affiliate/page.tsx:379-405,630-685`; `lib/growth/affiliateWidget.ts:6-27`).
- O clique `Powered by Kineo` do iframe atribuído entra no handler existente `/a/CODE?to=script`; portanto, reaproveita a validação de afiliado ativo, prova de clique e first-touch de 90 dias. Código inválido volta ao CTA genérico com `utm_source=widget`, sem aceitar URL ou redirect arbitrário (`app/widget/embed/page.tsx:69-80,128`; `lib/growth/affiliateWidget.ts:29-33`; `app/a/[code]/route.ts:20-43`).
- A normalização do código foi separada em módulo puro para o painel cliente não importar indiretamente o módulo servidor/Supabase. O export antigo foi preservado, sem mudar o contrato dos callers (`lib/affiliateCode.ts:1-4`; `lib/affiliateAttribution.ts:1-4`).
- O clique não foi simulado. A cópia do iframe reutiliza `affiliate_campaign_asset_copied` com `asset=widget`, sem código, URL, e-mail ou texto livre na telemetria (`app/(dashboard)/affiliate/page.tsx:398-411,674-681`).
- Comparação visual obrigatória: `docs/previews/AFFILIATE-ATTRIBUTED-WIDGET-2026-08-28.html` e `.svg`, com antes/depois em desktop e mobile. O preview registra a evidência datada que governou a ação: 11 afiliados externos ativos, 7 com zero visita lifetime e 0 referrals na última leitura anterior ao incidente.
- **TESTADO LOCALMENTE:** `scripts/test-affiliate-destinations.mjs` passou `230/230`, cobrindo host malicioso, caminho extra, `javascript:`, código inválido, fallback genérico, dimensões do iframe, CTA allow-listed, caller real e preview. Whitespace limpo. TypeScript manteve somente os quatro erros preexistentes, nenhum nos arquivos desta entrega.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy `dpl_BXtp9MwQ1enmamzeWdMyy1kBsKXF` em estado `READY`, SHA `b344fb0ec4edac0f2f0168abb72d26c5398bef2f`, aliasado em `www.usekineo.com`. Smoke read-only em `/widget/embed?affiliate=ABCD2345` confirmou título, conteúdo, overflow horizontal zero e CTA exato `https://www.usekineo.com/a/ABCD2345?to=script`; com `affiliate=INVALID`, confirmou fallback genérico com UTMs e console sem erro. Nenhum CTA foi clicado.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase está no limite contratado de gigabytes e alguns renders retornam `402`. Por isso o painel autenticado não foi aberto no smoke, nenhuma consulta foi feita e nenhuma linha foi criada. Esta entrega adiciona zero leitura/escrita de Supabase no carregamento do iframe ou na geração do snippet; a rota de atribuição existente só é chamada se um leitor clicar.
- **QUESTÃO PENDENTE / DESCONHECIDO:** entrega técnica não prova adoção. Medir pessoas externas que copiam `asset=widget` e depois geram visitas/signups/pagamentos somente após o incidente de capacidade e com amostra real; não inferir receita a partir de embed copiado.
- **NÃO TOCADO:** Supabase, Storage, migration, render, cena, legenda, motor, preço, grant, oferta, desconto, e-mail, outreach, tráfego pago e vídeos da home.

### 2.32 Comentário ou FAQ vira roteiro de resposta antes do cadastro

**FATO CONFIRMADO / IMPLEMENTADO / VALIDADO EM PRODUÇÃO (28/08/2026).** Commit `c54ff7a5117b52632501b0198aa6ce969fdc300b`.

- **FATO CONFIRMADO:** onboarding por objetivo, continuação de série, programa de afiliados e oferta B2B por volume já existiam e não foram reconstruídos. A lacuna escolhida foi outra matéria-prima de aquisição: o gerador público de roteiro aceitava somente um tema genérico; comentário de audiência, FAQ de cliente e objeção comercial não tinham uma entrada própria (`app/api/demo-script/route.ts`; `app/comment-to-video/page.tsx`).
- **EVIDÊNCIA DE MERCADO (páginas oficiais da Creatify lidas em 28/08/2026):** o concorrente separa entradas por URL, roteiro e asset visual em superfícies próprias (`https://creatify.ai/features/url-to-video`; `https://creatify.ai/features/ai-video-generator`). **HIPÓTESE:** uma porta que começa no sinal que o visitante já possui reduz a tradução mental exigida por um prompt genérico; isso ainda não prova aquisição ou assinatura.
- `/comment-to-video` entrega sem conta um roteiro de resposta com `HOOK`, três fatos e `PAYOFF`. O comentário entra como conteúdo não confiável; o sistema proíbe obedecer a instruções dentro dele e proíbe inventar preço, estatística, garantia, depoimento, resultado ou fato de produto. Informação ausente vira `[placeholder]` editável (`app/api/demo-script/route.ts`; `lib/demoFallback.ts`).
- O CTA preserva exatamente o roteiro por `/signup` até `/generate`, com `utm_source=comment_tool`, `utm_medium=organic`, `utm_campaign=comment_to_short`, `autoanalyze=1` e campanha de intenção. O caminho B2B secundário usa a allow-list existente e aponta para os pacotes avulsos de volume (`lib/growth/commentToVideo.ts`; `lib/agencyDistribution.ts`; `app/comment-to-video/CommentToVideoClient.tsx`). Nenhum preço, desconto, grant ou promessa comercial foi criado.
- A nova superfície entrou no sitemap, footer, `/facts`, `/api/facts` e `/llms.txt`; todas declaram que o resultado gratuito é texto, não vídeo concluído (`app/sitemap.ts`; `components/Footer.tsx`; `lib/kineoFacts.ts`; `app/llms.txt/route.ts`).
- Comparação visual obrigatória: `docs/previews/COMMENT-TO-VIDEO-2026-08-28.html`, com antes/depois em desktop e mobile. Checklist React aplicado: estado derivado mínimo, ações com `type=button`, label associado, erro com `role=alert`, resultado anunciado e nenhum efeito de rede em render.
- **TESTADO LOCALMENTE:** `scripts/test-comment-to-video.mjs` passou `57/57`; `scripts/test-b2b-distribution.mjs` passou `35/35`; whitespace limpo. TypeScript manteve somente os quatro erros preexistentes, nenhum nos arquivos desta entrega.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy `dpl_CtsHq9M8b5pZB33MiAhiNrn6fmbM` em estado `READY`, aliasado em `www.usekineo.com`. O smoke público abriu o título e formulário corretos, gerou uma resposta real para uma objeção de preço com os cinco marcadores, preservou placeholders em vez de inventar fatos, expôs o CTA com roteiro + campanha e o caminho B2B allow-listed. Em 390×844, `scrollWidth=innerWidth=390`; console vazio. O CTA de signup não foi clicado.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders estão respondendo `402`. Claude conduz o incidente. Esta entrega não importa cliente Supabase, não emite evento novo, não consulta banco, não toca Storage e não inicia render; o único smoke vivo chamou o escritor público de texto.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe pessoa externa observada em `comment_tool → signup → completed → checkout → paid`. Medir pessoas somente depois do incidente de capacidade e com amostra real; geração de texto, CTA exposto e cadastro não serão chamados de assinatura.
- **NÃO TOCADO:** Supabase, Storage, migration, render, cena, legenda, motor, preço, grant, oferta, e-mail, outreach, tráfego pago e páginas autenticadas.

### 2.33 Fatos de produto viram anúncio faceless antes do cadastro

**FATO CONFIRMADO / IMPLEMENTADO / VALIDADO EM PRODUÇÃO (28/08/2026).** Commit funcional `2b9e0d6e7eaa55abad1630a85fdd5fe18c729d21`; contrato de duração corrigido no forward-fix `93c7afb4e30bb84926e9bd9cb82bac3a1e86ce07`.

- **EVIDÊNCIA DE MERCADO (páginas oficiais da Creatify lidas em 28/08/2026):** o concorrente oferece entradas próprias para produto, URL e asset visual (`https://creatify.ai/features`; `https://docs.creatify.ai/use-case/url-to-video`). **HIPÓTESE:** começar pelos fatos que uma empresa já possui reduz a tradução mental de um prompt genérico; esta entrega não implementa scraping de URL e ainda não prova aquisição ou assinatura.
- **FATO CONFIRMADO:** Kineo anunciava UGC Product Ads na home e tinha `/api/ad-script` atrás de autenticação, mas não possuía ferramenta pública específica de produto. `/product-to-video-script` agora aceita fatos verificados e audiência opcional sem cadastro, devolve `HOOK / PROBLEM / PRODUCT / PROOF / CTA` e declara que o resultado é texto, não vídeo (`app/product-to-video-script/page.tsx:5`; `app/product-to-video-script/ProductToVideoClient.tsx:49-87`).
- O escritor trata fatos e audiência como conteúdo não confiável, proíbe preço, desconto, deadline, estatística, certificação, depoimento, garantia, comparação ou feature inventada e mantém prova ausente como placeholder (`app/api/demo-script/route.ts:62-77,100-107`). O servidor exige cinco rótulos exatos e 70–90 palavras; resposta curta ou malformada cai em fallback de uma única chamada, também dentro do contrato (`lib/growth/productToVideo.ts:5-18`; `app/api/demo-script/route.ts:161`).
- O CTA preserva o texto por `/signup` até `/generate` com `utm_source=product_tool`, `utm_medium=organic`, `utm_campaign=product_to_short`, `script_mode=verbatim`, `duration=35`, `autoanalyze=1` e campanha de intenção. O caminho secundário B2B reutiliza os pacotes avulsos existentes (`lib/growth/productToVideo.ts:56-83`; `app/product-to-video-script/ProductToVideoClient.tsx:196`). Nenhum CTA de signup foi clicado no smoke.
- A superfície entrou no sitemap, footer, `/facts`, `/api/facts` e `/llms.txt` (`app/sitemap.ts:64`; `components/Footer.tsx:142`; `lib/kineoFacts.ts:677`). Não foi criada promessa de scraping: a página instrui a colar fatos ou texto da página de produto.
- O primeiro canário de produção detectou 56 palavras sob uma promessa de 35 segundos. A classificação foi suspensa, o contrato foi tornado executável e o mesmo caso foi repetido depois do forward-fix. Isso evita chamar estrutura correta de duração correta sem medir.
- **TESTADO LOCALMENTE:** produto `74/74`; comentário `57/57`; distribuição B2B `39/39`; whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos desta entrega. Comparação visual obrigatória: `docs/previews/PRODUCT-TO-VIDEO-SCRIPT-2026-08-28.html`, com antes/depois desktop e mobile; checklist React aplicado.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy final `dpl_pxydL5AoaooFhqZjM6g6Jf95GVbV` em estado `READY`, SHA `93c7afb4e30bb84926e9bd9cb82bac3a1e86ce07`, aliasado em `www.usekineo.com`. O canário público gerou 83 palavras, cinco blocos, placeholder de prova, UTM e handoff completos. Em 390×844, `scrollWidth=innerWidth=390`; console vazio. Nenhum cadastro ou render foi iniciado.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`. Claude conduz o incidente. O `402` não será classificado como abandono de Growth; esta entrega não consultou banco, não importou cliente Supabase, não tocou Storage e não abriu página autenticada.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe pessoa externa observada em `product_tool → signup → completed → checkout → paid`. Indexação, roteiro gerado, CTA exposto e cadastro não serão chamados de assinatura. Medir pessoas somente depois do incidente de capacidade e com amostra externa.
- **NÃO TOCADO:** home, Avatar Studio, `/api/ad-script`, Supabase, Storage, migration, render, cena, legenda, motor, preço, grant, oferta, e-mail, outreach e tráfego pago.

### 2.34 Plano semanal B2B antes do cadastro

**FATO CONFIRMADO / IMPLEMENTADO / VALIDADO EM PRODUÇÃO (28/08/2026).** Commit funcional `2ad186832fe77f239e9f95b1f25323d873a0604f`; forward-fix do canário `e685e14c36512488cc3b2733766256bc0a4f8f49`.

- **EVIDÊNCIA DE MERCADO (páginas oficiais lidas em 28/08/2026):** Quso posiciona seu planner em calendário visual, agendamento e publicação (`https://quso.ai/products/ai-content-planner`); HeyGen apresenta produção recorrente para lançamentos, social, anúncios, histórias de clientes e tutoriais (`https://www.heygen.com/en-gb/business/marketing`); Creatify apresenta vídeo de produto como uma entrada comercial própria (`https://creatify.ai/use-cases/product-videos`). **HIPÓTESE:** um plano gratuito transforma a intenção B2B ainda abstrata em uma fila concreta antes de mostrar preço; publicação técnica ainda não prova aquisição ou assinatura.
- **FATO CONFIRMADO:** Kineo já tinha `Weekly Content Plan` autenticado, restrito a quatro nichos faceless, e geração de próximas ideias após vídeo. Não havia uma porta pública que recebesse oferta, audiência, objetivo e cadência de uma empresa e devolvesse um plano semanal (`app/(dashboard)/channel/ChannelBuilderClient.tsx`; `app/api/next-shorts/route.ts`; `lib/growth/businessContentPlan.ts:54`).
- `/business-video-content-plan` gera localmente 3, 5 ou 7 ângulos por semana para quatro objetivos comerciais. Cada ideia carrega hook, brief e limite de evidência; a página declara que não pesquisa alegações, agenda, publica ou garante leads (`app/business-video-content-plan/BusinessContentPlanClient.tsx:64`; `app/business-video-content-plan/page.tsx:5`). Nenhuma API, analytics, fornecedor ou render é chamado para montar o plano.
- O primeiro CTA preserva a ideia de segunda-feira por `/signup` até `/generate`, com `duration=35`, `autoanalyze=1`, campanha `weekly_business_video_plan` e sem `create_intent`; portanto, nada renderiza automaticamente (`lib/growth/businessContentPlan.ts:124-154`). O segundo CTA leva ao pack avulso que cobre a meta de quatro semanas por uma entrada allow-listed `content_plan` (`lib/agencyDistribution.ts:7`; `app/business-video-content-plan/BusinessContentPlanClient.tsx:71-72`).
- A nova porta entrou no hero B2B, sitemap, footer, fatos canônicos e `/llms.txt` (`app/ai-shorts-for-agencies/page.tsx:143-144`; `app/sitemap.ts:65`; `components/Footer.tsx:143`; `lib/kineoFacts.ts:677`; `app/llms.txt/route.ts:214`). Nenhum preço, grant, desconto ou promessa comercial foi inventado.
- O primeiro canário revelou dois hooks com artigo duplicado e que o Footer global ainda carregava o badge de contadores durante o incidente de capacidade. A classificação foi suspensa. O forward-fix reescreveu os hooks e passou `showStats={false}` exclusivamente nesta rota (`lib/growth/businessContentPlan.ts:86-94`; `app/business-video-content-plan/page.tsx:62`). No canário final os cinco hooks saíram gramaticais e o badge ao vivo não existia.
- **TESTADO LOCALMENTE:** plano B2B `145/145`; distribuição B2B `43/43`; produto `74/74`; comentário `57/57`; total de 319 verificações. Whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos desta entrega. Checklist React aplicado. Comparação visual obrigatória: `docs/previews/BUSINESS-VIDEO-CONTENT-PLAN-2026-08-28.html`, com antes/depois desktop e mobile.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy final `dpl_CorqPaQHNFWLr99y17HfQFpKYQnC` em estado `READY`, SHA `e685e14c36512488cc3b2733766256bc0a4f8f49`, aliasado em `www.usekineo.com`. O smoke público escolheu o exemplo SaaS, devolveu cinco ideias de segunda a sexta, CTA com UTM + prompt + limite de evidência, pack `bulk20` e console vazio. Em 390×844, `documentWidth=viewportWidth=390`; heading e CTA visíveis. Nenhum CTA foi clicado, nenhuma página autenticada foi aberta e nenhum render foi iniciado.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; Claude conduz o incidente. O `402` não será classificado como abandono de Growth. Depois do forward-fix, esta rota não monta o badge de estatísticas e o planejador permanece totalmente local.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe pessoa externa observada em `business_planner → signup → completed → checkout → paid`. Plano gerado, CTA exposto, cadastro e vídeo concluído não serão chamados de assinatura. Medir pessoas somente depois do incidente de capacidade e com amostra externa.
- **NÃO TOCADO:** Supabase, Storage, migration, analytics, render, cena, legenda, motor, preço, grant, oferta, e-mail, outreach, tráfego pago e páginas autenticadas.

### 2.35 Escolha do motor atravessa signup até o Studio

**FATO CONFIRMADO / IMPLEMENTADO / TESTADO LOCALMENTE / PUBLICADO EM PRODUÇÃO (28/08/2026).** Commit funcional `6610450608b81b1b8b2580ac22a3287057cc57d4`.

- **FATO CONFIRMADO:** as sete páginas `/ai-video-generator/[engine]` anunciavam “Start free with [motor]”, mas o CTA principal colocava `engine=` como parâmetro solto de `/signup`. `activationRedirectFromSearch` só preserva um `redirect` interno validado ou campos allow-listed de criação; portanto, `engine` era descartado. Visitante novo sem prompt terminava na home e usuário já autenticado no dashboard, sem o motor prometido (`app/ai-video-generator/[engine]/page.tsx`, versão anterior a `6610450`; `app/(auth)/signup/page.tsx:24-25`; `lib/supabase/middleware.ts`).
- `lib/growth/engineLandingIntent.ts:1-57` governa os sete parâmetros reais (`fast`, `seedance`, `kling`, `veo`, `hollywood`, `h3`, `omni`). O CTA agora carrega `redirect=/studio?engine=<motor>&intent_campaign=<campanha>` por `/signup`, com UTM orgânica preservada (`app/ai-video-generator/[engine]/page.tsx:344-345`).
- O Studio já lê e aplica `engine` e `intent_campaign` (`app/(dashboard)/studio/StudioClient.tsx:180-187`). O novo contrato apenas conduz a pessoa ao cockpit com a escolha mantida: não envia prompt, não define `create_intent`, não define `autoanalyze` e não inicia render. O link secundário de quem já possui conta também vai direto ao Studio, sem o hop legado de `/generate` (`app/ai-video-generator/[engine]/page.tsx:561`).
- Hero, CTA final e sticky CTA compartilham o mesmo href corrigido (`app/ai-video-generator/[engine]/page.tsx:393,552,592`). Entrada inválida falha fechada para o motor gratuito `fast` e campanha limitada `seo_engine`; URL externa nunca é aceita.
- **TESTADO LOCALMENTE:** contrato de intenção `109/109`; regressão Arena `81/81`; verdade comercial `305/305`; planner B2B `145/145`; total de 640 verificações. Whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos desta entrega. Comparação visual obrigatória: `docs/previews/ENGINE-LANDING-INTENT-2026-08-28.html`, com antes/depois desktop e mobile.
- **PUBLICADO EM PRODUÇÃO (28/08/2026):** deploy `dpl_hT3NYTLaFSCP5cexb313Jyb8JUjE` em estado `READY`, SHA `6610450608b81b1b8b2580ac22a3287057cc57d4`, aliasado em `www.usekineo.com`.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; Claude conduz o incidente. O Codex não abriu página autenticada, não consultou o Supabase por ferramenta e não iniciou render. A geração estática dessas páginas continua usando `getEngineRenders`, comportamento preexistente não alterado por esta entrega.
- **QUESTÃO PENDENTE / DESCONHECIDO:** a travessia visual real `landing → signup/OAuth → Studio com motor selecionado` não foi executada durante o incidente. O deploy `READY` e o teste determinístico provam o contrato publicado, mas não substituem um smoke pós-auth. Validar uma vez após a capacidade normalizar, sem apertar Generate.
- **QUESTÃO PENDENTE / DESCONHECIDO:** não existe pessoa externa observada pós-deploy. Medir pessoas por campanha `seo_engine_<slug>` em `landing CTA → signup → Studio → completed → checkout → paid`; clique, cadastro, Studio aberto e vídeo concluído não serão chamados de assinatura.
- **NÃO TOCADO:** `GenerateClient`, seletor de motores, custo, grant, preço, Supabase, Storage, migration, render, cena, legenda, fornecedor, e-mail, outreach e tráfego pago.

### 2.36 Cinco CTAs de aquisição passam a pedir a ideia antes do cadastro

**FATO CONFIRMADO / IMPLEMENTADO / TESTADO LOCALMENTE / VALIDADO EM PRODUÇÃO (28/08/2026).** Commit funcional `e5408c93b49ba3701262b95225389f4bcb6cda62`.

- **FATO CONFIRMADO:** cinco CTAs públicos prometiam começar o primeiro vídeo, mas enviavam `/signup?create_intent=fast` sem `prompt`: dois em `/youtube-automation`, dois em `/how-to-start-a-faceless-youtube-channel` e um CTA final em `/vs`. O contrato real descarta `create_intent` quando não existe prompt; depois do cadastro, a intenção não atravessava (`lib/creationHandoff.ts:27-34`, versões das três páginas anteriores a `e5408c9`).
- As duas páginas educativas agora possuem um `TopicGeneratorForm` logo após o hero e os quatro CTAs apenas focam o formulário correspondente (`app/youtube-automation/page.tsx:40,267-284,521-522`; `app/how-to-start-a-faceless-youtube-channel/page.tsx:40,292-309,522-523`). `/vs` já possuía o formulário; seu CTA final agora o focaliza em vez de sair para o cadastro sem ideia (`app/vs/page.tsx:34,331,360-361`).
- O formulário compartilhado exige uma ideia visível e envia no mesmo contrato `prompt`, `create_intent=fast`, campanha e UTM (`app/youtube-shorts-from-topic/TopicGeneratorForm.tsx:98,150,174-176`). Nada começa ao focar o formulário; o próximo passo só ocorre depois do envio explícito da pessoa. Esta entrega não submeteu formulário nem iniciou geração.
- `organic_handoff_opened` separa a abertura do formulário de `organic_cta_clicked`; o envio continua usando os eventos já existentes. O foco atualiza o fragmento da URL e move o teclado para o campo, sem navegação prematura (`components/OrganicCtaLink.tsx:18,44-59`).
- **TESTADO LOCALMENTE:** contrato desta entrega `48/48`; Starter por estado `21/21`; porta ChatGPT `55/55`; intenção de motor `109/109`; total de 233 verificações. Whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos desta entrega. Checklist React aplicado: as páginas continuam Server Components e reutilizam uma única ilha cliente já existente. Comparação visual obrigatória: `docs/previews/SEO-FORM-HANDOFF-2026-08-28.html`, com antes/depois desktop e mobile.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy `dpl_Gp9N7fgR2VWShosB9jXYPAV1WW3Y` em estado `READY`, SHA `e5408c93b49ba3701262b95225389f4bcb6cda62`. GET público com cache-busting retornou `200` nas três páginas, encontrou os IDs `youtube-automation-first-video`, `faceless-channel-first-video` e `vs-hub-generator`, encontrou as duas copies novas e não encontrou `/signup?create_intent=fast` sem prompt. Foi validação estática: nenhum JavaScript foi executado, CTA clicado, formulário enviado, login aberto ou render iniciado.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; Claude conduz o incidente. O Codex não consultou Supabase, Storage ou páginas autenticadas. `402` será classificado como incidente de capacidade, não como abandono desta etapa de Growth.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe pessoa externa observada pós-deploy no caminho `handoff aberto → ideia enviada → signup → completed → checkout → paid`. A medição deve começar somente quando a capacidade normalizar; formulário exposto, ideia enviada, cadastro e vídeo concluído não serão chamados de assinatura.
- **NÃO TOCADO:** Supabase, Storage, migration, autenticação, `GenerateClient`, render, cena, legenda, motor, preço, grant, oferta, e-mail, outreach e tráfego pago.

### 2.37 Contrato único impede criação automática sem ideia

**FATO CONFIRMADO / IMPLEMENTADO / TESTADO LOCALMENTE / VALIDADO EM PRODUÇÃO (28/08/2026).** Commit funcional `2ef36b19b7797326375521c16d4f71311a0b9983`.

- **FATO CONFIRMADO:** o inventário restante encontrou seis CTAs com `create_intent=fast` sem `prompt` e três templates genéricos de alternativas que atravessavam o cadastro sem destino. Os seis comandos automáticos eram descartados pelo contrato real; os outros três terminavam no fallback de autenticação em vez do cockpit prometido (`lib/creationHandoff.ts:27-34`; versões anteriores a `2ef36b1` de `app/faceless-video-generator/page.tsx`, `app/free-ai-shorts-generator/page.tsx`, `app/text-to-video-shorts/page.tsx`, `app/vs/[pair]/page.tsx` e `app/alternatives/[competitor]/page.tsx`).
- `lib/growth/publicCreationIntent.ts:19-62` agora separa os dois estados de domínio. Sem ideia, o CTA carrega uma `redirect` interna para `/studio?engine=fast` e nunca envia `create_intent`; com ideia, `buildPromptedFastSignupHref` exige prompt não vazio e só então envia `create_intent=fast`. Campanha, source e medium aceitam somente tokens limitados; entrada inválida falha fechada.
- Faceless Generator, Free AI Shorts Generator e Text-to-Video mantêm a aparência e mandam o CTA secundário “começar vazio” ao Studio (`app/faceless-video-generator/page.tsx:84,166`; `app/free-ai-shorts-generator/page.tsx:92,137`; `app/text-to-video-shorts/page.tsx:82,136`). O cluster `/vs/[pair]` usa o mesmo contrato (`app/vs/[pair]/page.tsx:68,418`).
- Quso mantém hero, CTA final e sticky CTA no formulário que já existe; as demais alternativas atravessam signup para o Studio com campanha preservada (`app/alternatives/[competitor]/page.tsx:833-836,986,1040`). As 30 páginas `/free-ai-shorts/[niche]`, que eram seguras mas montavam uma base perigosa, agora só conseguem gerar href recebendo a ideia escolhida (`app/free-ai-shorts/[niche]/page.tsx:516-519,541,634,650`).
- **TESTADO LOCALMENTE:** contrato público `60/60`; formulário SEO `48/48`; intenção de motor `109/109`; porta ChatGPT `55/55`; Starter por estado `21/21`; roteador text-to-video `47/47`; total de 340 verificações. Whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos desta entrega. Checklist React aplicado: nenhum hook, fetch, efeito ou Client Component novo. Comparação antes/depois: `docs/previews/PUBLIC-CREATION-INTENT-2026-08-28.html`, desktop e mobile. O arquivo foi aberto no painel do Codex; a captura automatizada do `file://` foi bloqueada pela política do navegador, portanto não é reivindicada.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy `dpl_Fq2pRH3w5j9jG2Z2WFpq1DbrbWvd` em estado `READY`, SHA exato `2ef36b19b7797326375521c16d4f71311a0b9983`, aliasado em `www.usekineo.com`. GET público com cache-busting retornou `200` em sete rotas reais: `/faceless-video-generator`, `/free-ai-shorts-generator`, `/text-to-video-shorts`, `/vs/opus-clip-vs-quso`, `/alternatives/quso`, `/alternatives/opusclip` e `/free-ai-shorts/history`. Os destinos esperados apareceram junto aos CTAs e nenhum comando automático sem prompt apareceu nos trechos verificados. Nenhum CTA ou formulário foi acionado.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o limite de gigabytes do Supabase continua causando alguns `402`; Claude conduz o incidente. O Codex não acessou Supabase, Storage, autenticação ou render nesta entrega. `402` não será contabilizado como abandono deste fluxo.
- **QUESTÃO PENDENTE / DESCONHECIDO:** a travessia pós-auth `CTA vazio → signup → Studio com Fast e campanha` continua sem smoke durante o incidente. O HTML publicado e os testes provam o contrato estático, não a sessão autenticada. Validar depois da normalização, sem clicar em Generate.
- **QUESTÃO PENDENTE / DESCONHECIDO:** não existe pessoa externa observada pós-deploy em `CTA → signup → Studio/form → completed → checkout → paid`. Cadastro, Studio aberto e vídeo concluído não serão chamados de assinatura.
- **NÃO TOCADO:** Supabase, Storage, migration, banco, autenticação, `GenerateClient`, render, cena, legenda, motor de render, preço, grant, oferta, e-mail, outreach e tráfego pago.

### 2.38 Trial desbloqueado deixa de prometer saldo que não existe

**FATO CONFIRMADO / IMPLEMENTADO / TESTADO LOCALMENTE / VALIDADO EM PRODUÇÃO (28/08/2026).** Commit funcional `9a2832fb1c280f90e0ac6dc9cb75f811681a52f3`.

- **EVIDÊNCIA DE PRODUÇÃO (GET público em 28/08/2026, antes desta entrega):** `https://www.usekineo.com/llms.txt` dizia ao mesmo tempo “25 free credits on signup with every engine unlocked” e “Only the Fast engine is available for free”. A primeira frase descrevia acesso temporário do trial; a segunda misturava esse estado com a franquia gratuita recorrente. Um mecanismo de resposta não tinha como resolver a contradição.
- **FATO CONFIRMADO:** a fonte canônica concede 25 créditos no trial (`lib/freeTierOffer.ts:150`) e o catálogo/custo canônico de 60 segundos mostra oito motores (`lib/kineoFacts.ts:273`). O saldo cobre cinco vídeos Kineo 1 ou um Seedance 1.5; Kling 2.5, Veo 3.1, Avatar, MiniMax H3, Omni Flash e Kling 3 ficam desbloqueados, mas o saldo inicial não cobre um vídeo de referência completo nesses motores (`lib/growth/trialAccessFacts.ts:31-56`; `lib/kineoFacts.ts:470-474`). Acesso ao seletor e cobertura do saldo agora são fatos separados.
- `/api/facts` ganhou, de forma aditiva, `trialAccess` e `recurringFreeAccess` (`lib/kineoFacts.ts:886-887`). Cada motor declara custo e quantidade inteira coberta pelo saldo; o objeto legado `freeTier.engine` foi preservado e ganhou `engineCanonicalName: "Kineo 1"` e `engineScope: "recurring_free_access"` para não quebrar consumidores antigos nem continuar ambíguo (`lib/kineoFacts.ts:425-426`).
- `/llms.txt` agora explica três estados sem contradição: todos os motores desbloqueados durante o trial, cobertura real dos 25 créditos e, depois, uma franquia recorrente de um Kineo 1 com marca d'água por janela de 720 horas, sem grant de créditos (`app/llms.txt/route.ts:83-101`). `/facts` responde a mesma pergunta em linguagem humana (`app/facts/page.tsx:325-340`). Nenhum crédito, preço, plano, grant ou regra de acesso foi alterado; a entrega corrige a representação pública da oferta existente.
- **TESTADO LOCALMENTE:** contrato AEO `59/59`; verdade comercial `305/305`; intenção por motor `109/109`; total de 473 verificações. Whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos desta entrega. Checklist React aplicado: `/facts` continua Server Component, sem hook, fetch, efeito ou ilha cliente nova. Comparação visual aberta no painel: `docs/previews/AEO-TRIAL-ACCESS-TRUTH-2026-08-28.html`, com antes/depois desktop e mobile.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** o status público do commit no GitHub retornou `Vercel: success`, target `Ec8Qp4znLdd4hBQWLq4iTkRF7Hkz`. GET com cache-busting retornou `200` em `/llms.txt`, `/api/facts` e `/facts`. A API publicou `credits=25`, `everyEngineUnlocked=true`, oito linhas de cobertura, Kineo 1 `5`, Seedance 1.5 `1`, os seis motores restantes `0`, e franquia recorrente Kineo 1 `1/720h`, `creditsGranted=0`. A pergunta “Can I try every Kineo video engine for free?” e a distinção de saldo aparecem no HTML público.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; fundador e Claude conduzem o incidente. O Codex não consultou Supabase, Storage, autenticação ou render. Esses `402` são incidente de capacidade, não abandono atribuído a esta superfície de Growth.
- **QUESTÃO PENDENTE / DESCONHECIDO:** não existe observação de pessoa externa chegando por uma resposta atualizada de ChatGPT/LLM e convertendo em assinatura. Publicação correta e status 200 não serão chamados de aquisição ou receita.
- **NÃO TOCADO:** Supabase, Storage, migration, banco, autenticação, `GenerateClient`, render, cena, legenda, motor de render, preço, grant, oferta, e-mail, outreach e tráfego pago.

### 2.39 Recrutamento de afiliados troca bravata por comparação oficial

**FATO CONFIRMADO / IMPLEMENTADO / TESTADO LOCALMENTE / VALIDADO EM PRODUÇÃO (28/08/2026).** Commit funcional `9c60fb0a873d93739c6f534ec4cecc7c43e96708`.

- **FATO CONFIRMADO:** a página pública dizia que a maioria dos programas de vídeo pagava 20–30% e que os 40% recorrentes da Kineo eram a maior taxa conhecida (versão anterior a `9c60fb0` de `app/partners/page.tsx:115`). A afirmação não tinha fonte e foi contradita por páginas oficiais atuais.
- **EVIDÊNCIA DE PRODUÇÃO (páginas oficiais externas consultadas em 28/08/2026):** [OpusClip](https://help.opus.pro/docs/article/affiliate-program-faq) publica 25% recorrente durante o primeiro ano; [InVideo](https://invideo.io/make/affiliate-program/) publica 50% no plano mensal e 25% no anual somente no primeiro ciclo; [VEED](https://www.veed.io/affiliate) publica base de 20% recorrente e bônus de desempenho que podem chegar a 50%. **CONTRADIÇÃO:** duas páginas oficiais da Pictory discordavam entre “até 50% recorrente” e “40% uma vez”; Pictory foi excluída da tabela em vez de escolher uma versão conveniente (`lib/growth/affiliateProgramComparison.ts:21-24`).
- A nova fonte datada compara somente estrutura publicada — taxa, duração, ativação e distribuição — e guarda o URL oficial de cada linha (`lib/growth/affiliateProgramComparison.ts:1-68`). Não compara conversão, renda provável, confiabilidade de pagamento ou qualidade do produto.
- O hero remove a alegação “maior taxa” e posiciona o diferencial comprovável da Kineo: 40% recorrente, ativação instantânea e distribuição por link mais cupom falado (`app/partners/page.tsx:120`). A nova tabela aparece em `#ai-video-affiliate-program-comparison`, cada linha abre a fonte oficial, e o CTA tem `placement="comparison"` para medição separada (`app/partners/page.tsx:161-199`). A FAQ visível e o `FAQPage` estruturado respondem a busca “How does Kineo compare with other AI video affiliate programs?” (`app/partners/page.tsx:92`).
- **TESTADO LOCALMENTE:** comparação `51/51`; ativação `34/34`; destinos `230/230`; total de 315 verificações. Whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos desta entrega. `scripts/test-affiliate-attribution.mjs` falha tanto na base anterior quanto nesta ponta antes das asserções, porque seu executor não simula o import já existente `@/lib/affiliateCode`; não foi contado como verde nem alterado nesta entrega.
- **VALIDAÇÃO VISUAL:** `docs/previews/AFFILIATE-PROGRAM-COMPARISON-2026-08-28.html` contém antes/depois desktop e mobile para hero, comparação oficial e resposta de FAQ. Foi servido apenas em localhost, retornou `200`, teve DOM inspecionado e captura integral conferida; o servidor local foi encerrado.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** status público do commit retornou `Vercel: success`, target `HyiPjuY2AtAtjW3y14dethBebvKf`. GET público com cache-busting em `/partners` retornou `200`; encontrou metadata nova, heading da comparação, as quatro linhas/fontes, FAQ e CTA mensurável. Não encontrou as duas alegações antigas sem fonte.
- **QUESTÃO PENDENTE / DESCONHECIDO:** nenhum afiliado externo foi observado entrando ou aplicando depois do deploy. Página publicada, CTA exposto e build verde não serão chamados de recrutamento, clique, referral ou assinatura.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o limite de gigabytes do Supabase continua causando alguns `402`; fundador e Claude conduzem o incidente. Esta entrega é estática e não acessou Supabase, Storage, sessão autenticada ou render.
- **NÃO TOCADO:** pipeline de afiliados financeiro, taxa de 40%, cupom, janela de atribuição, banco, Supabase, Storage, migration, autenticação, `GenerateClient`, render, preço, grant, e-mail, outreach e tráfego pago.

### 2.40 Cancelamento do checkout B2B preserva o pacote escolhido

**FATO CONFIRMADO / IMPLEMENTADO / TESTADO LOCALMENTE / VALIDADO EM PRODUÇÃO (28/08/2026).** Commit funcional `9cc2d1a`.

- **FATO CONFIRMADO:** o login já preservava corretamente `?pack=bulk10|20|30|50`; a hipótese inicial de perda antes da autenticação foi contradita pelo código. O abandono real ocorria depois: o checkout Stripe dos packs avulsos usava `cancel_url=${appUrl}/pricing`, devolvendo um comprador B2B que tinha escolhido volume e compra única para a página genérica de assinaturas (versão anterior a `9cc2d1a` de `app/api/stripe/checkout/route.ts:2593`).
- A rota agora constrói o retorno somente para quatro IDs allow-listed e envia para `/ai-shorts-for-agencies?checkout=cancelled&pack=<id>#agency-pack-heading` (`lib/growth/agencyCheckoutReturn.ts:15-35`; `app/api/stripe/checkout/route.ts:2597`). Nenhum destino externo ou pack arbitrário é aceito.
- A página mostra “nothing was charged”, restaura quantidade e preço do pack canônico e oferece retomar exatamente o mesmo checkout ou continuar comparando (`app/ai-shorts-for-agencies/AgencyPacksClient.tsx:45-129`). A compra continua explicitamente avulsa em USD e não vira assinatura.
- `agency_bulk_checkout_cancelled_return_viewed` e `agency_bulk_checkout_resume_clicked` separam retorno e retomada por pack, quantidade, valor, moeda, superfície e variante (`app/ai-shorts-for-agencies/AgencyPacksClient.tsx:57-65,111-119`). **QUESTÃO PENDENTE / DESCONHECIDO:** os eventos não foram disparados nesta validação por causa do limite atual do Supabase.
- **TESTADO LOCALMENTE:** retorno do checkout `75/75`; página B2B `30/30`; verdade comercial `305/305`; total de 410 verificações. Whitespace limpo. O TypeScript mantém os mesmos quatro erros preexistentes, deslocados em uma linha no checkout pelo novo import; nenhum arquivo desta entrega introduziu erro.
- **VALIDAÇÃO VISUAL:** `docs/previews/AGENCY-CHECKOUT-RETURN-2026-08-28.html` compara antes/depois em desktop e mobile. Foi servido somente em localhost; DOM e captura integral foram conferidos. O antes perde pacote, volume e compra única; o depois preserva o pack de 30 vídeos por US$249 e as duas saídas.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** status público do commit retornou `Vercel: success`, target `J8c965WECzJFaihbg118w9byNd7N`. GET HTTP estático, sem executar JavaScript, em `/ai-shorts-for-agencies?checkout=cancelled&pack=bulk30&growth_canary=9cc2d1a` retornou `200` no domínio canônico e publicou a prateleira com o pack de 30 vídeos.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; fundador e Claude conduzem o incidente. O Codex não abriu checkout real, não executou o Client Component em produção, não consultou Supabase/Storage e não iniciou render. `402` será classificado como incidente de capacidade, não como abandono de Growth.
- **QUESTÃO PENDENTE / DESCONHECIDO:** o retorno visual real `Stripe cancelado → pack restaurado → retomar checkout` ainda precisa de um smoke pós-incidente com sessão externa. Build, testes e HTML publicado provam o contrato; não provam pagamento ou assinatura. Não clicar no CTA enquanto a capacidade não normalizar.
- **NÃO TOCADO:** preço, SKU, amount, metadata, success URL, assinatura, grant, Supabase, Storage, migration, autenticação, `GenerateClient`, render, cena, legenda, motor, e-mail, outreach e tráfego pago.

### 2.41 ChatGPT e TAAFT recebem valor antes de outro pedido de cadastro

**FATO CONFIRMADO / IMPLEMENTADO / TESTADO LOCALMENTE / PUBLICADO EM PRODUÇÃO (28/08/2026).** Commit funcional `08d472595f01ca40f4d1b4acd68e597a8c8f8ad9`.

- **EVIDÊNCIA DE PRODUÇÃO (janela de 7 dias medida em 27/08/2026; contas internas excluídas):** ChatGPT trouxe 52 pessoas cadastradas, 30 com vídeo concluído, 5 com checkout e 1 pagante; TAAFT trouxe 37 cadastradas, 14 com vídeo concluído, 2 com checkout e nenhum pagante. **HIPÓTESE:** preservar o contexto do canal e entregar uma amostra útil antes de outro auth wall reduz a perda entre recomendação, entendimento e teste; publicação técnica ainda não prova essa hipótese.
- **FATO CONFIRMADO:** `HomeTopicForm` já entregava um roteiro anônimo por `/api/demo-script`, mas não possuía importador na versão anterior a `08d4725`. A home havia removido o composer e todos os CTAs genéricos levavam diretamente ao cadastro. O resolver agora reconhece somente os aliases canônicos de ChatGPT e TAAFT; origem desconhecida, direta, interna ou Google falha fechada para a home existente (`lib/growth/homeReferralBridge.ts:33-40`; `app/page.tsx:65`).
- Visitante anônimo desses dois canais continua vendo primeiro a vitrine aprovada de Veo 3.1, Kling 3, MiniMax H3 e Omni Flash, na mesma ordem. Logo abaixo recebe copy específica do canal e pode gerar hook, três fatos e payoff sem cadastro (`app/KineoLanding.tsx:986,1043-1071`). Nenhum vídeo, card, asset ou ordem do showcase foi alterado.
- Os cinco CTAs genéricos `Start free` dessa sessão apontam para `#try-kineo`; acesso direto e os demais canais preservam exatamente os destinos anteriores. Usuário já autenticado nunca recebe a ponte nem a copy pré-cadastro (`app/KineoLanding.tsx:795,933,950,1100,1521,1566`).
- O formulário reutiliza a chamada preexistente a `/api/demo-script`; não importa Supabase, não consulta Storage e não inicia render (`app/HomeTopicForm.tsx:157`). Seus dez eventos existentes agora carregam `acquisition_source` e usam placements próprios de ponte e resultado, permitindo separar ChatGPT de TAAFT sem criar nova operação de banco (`app/HomeTopicForm.tsx:111-116`).
- **TESTADO LOCALMENTE:** ponte `59/59`; preservação da curadoria da home `247/247`; handoff de roteiro ChatGPT `69/69`; quickstart ChatGPT `55/55`; total de 430 verificações. Whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos desta entrega. Checklist React aplicado: seleção por query ocorre no Server Component; o formulário existente continua sendo a única ilha cliente.
- **VALIDAÇÃO VISUAL:** `docs/previews/HOME-REFERRAL-BRIDGE-2026-08-28.html` compara antes/depois em desktop e mobile, mostra a fileira idêntica dos quatro motores e as duas copies de canal. Foi servido somente em localhost, retornou `200`, teve DOM e captura integral conferidos; o servidor local foi encerrado.
- **PUBLICADO EM PRODUÇÃO (28/08/2026):** o status público do commit no GitHub retornou `Vercel: success`, target `8jrfwgzEezdR9vBZGdcxd6GC5kZC`. A home não recebeu GET de canário durante o incidente de capacidade; build verde e testes não serão descritos como travessia real de visitante.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; fundador e Claude conduzem o incidente. O Codex não consultou Supabase, não abriu home em produção, não executou JavaScript público, não iniciou sessão autenticada e não iniciou render. Esses `402` são incidente de capacidade, não abandono de Growth.
- **QUESTÃO PENDENTE / DESCONHECIDO:** nenhuma pessoa externa foi observada na nova sequência `arrival → script requested → script succeeded → signup → completed → checkout → paid`. Deploy, script exposto, CTA exposto e cadastro não serão chamados de aquisição ou assinatura.
- **NÃO TOCADO:** vídeos da home, curadoria, Supabase, Storage, migration, autenticação, `GenerateClient`, render, cena, legenda, motor, preço, grant, oferta, e-mail, outreach e tráfego pago.

### 2.42 O cadastro mostra o roteiro ou a ideia que já atravessava invisível

**FATO CONFIRMADO / IMPLEMENTADO / TESTADO LOCALMENTE / PUBLICADO EM PRODUÇÃO (28/08/2026).** Commit funcional `4a9ae4c758c1035439622ba1f4fa8d503f298d46`.

- **FATO CONFIRMADO:** o handoff de criação já preservava `prompt`, `script_mode`, duração, idioma e destino até `/generate`, mas a versão anterior a `4a9ae4c` mostrava no cadastro somente “Create your AI Short”. A pessoa não recebia prova visual de que seu trabalho tinha sobrevivido ao auth wall (`app/(auth)/signup/page.tsx`; `lib/growth/creationHandoff.ts`).
- O cadastro agora reconhece um handoff válido e mostra “Your script/idea is ready to continue”, três linhas limitadas da criação e a promessa estrita “continue without starting over” (`lib/growth/signupCreationPreview.ts:49-74`; `app/(auth)/signup/page.tsx:198-207,449-498`). A classificação usa `script_mode=verbatim` ou pelo menos dois marcadores estruturais suportados; o conteúdo permanece texto puro escapado pelo React.
- O preview é limitado a três linhas, 120 caracteres por linha e 280 no total. Não existe renderização de HTML do visitante. Checkout retomado continua com prioridade e não recebe essa superfície; redirect interno explícito também falha fechado para evitar prometer um destino diferente (`lib/growth/signupCreationPreview.ts:21-27,49-74`; `app/(auth)/signup/page.tsx:198-207`).
- Depois da confirmação por e-mail, a tela também informa que o roteiro ou ideia continua salvo. O transporte e o redirect preexistentes não mudaram; nenhum evento novo foi criado e nenhum endpoint, banco ou operação de Supabase foi adicionado (`app/(auth)/signup/page.tsx:427-433`).
- **TESTADO LOCALMENTE:** prova do cadastro `44/44`; handoff ChatGPT `69/69`; ponte da home `59/59`; intenção pública `60/60`; total de 232 verificações. Whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos desta entrega.
- **VALIDAÇÃO VISUAL:** `docs/previews/SIGNUP-SAVED-CREATION-2026-08-28.html` compara antes/depois em desktop e mobile, com roteiro no desktop e ideia no mobile. Foi servido somente em localhost, retornou `200`, teve DOM e captura integral conferidos; o servidor local foi encerrado.
- **PUBLICADO EM PRODUÇÃO (28/08/2026):** o status público do commit no GitHub retornou `Vercel: success`, target `46YaWs88WAW5qtLxcfx5FMW9DeUy`. Não houve smoke autenticado, execução de JavaScript em produção nem GET da experiência durante o incidente de capacidade.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; fundador e Claude conduzem o incidente. O Codex não consultou Supabase, Storage, sessão autenticada ou render. Esses `402` são incidente de capacidade, não abandono atribuído a esta superfície de Growth.
- **QUESTÃO PENDENTE / DESCONHECIDO:** nenhuma pessoa externa foi observada atravessando a sequência nova `script/ideia visível no cadastro → signup → generate → completed → checkout → paid`. Build verde e UI publicada não serão chamados de conversão ou assinatura.
- **NÃO TOCADO:** checkout, preço, grant, oferta, Supabase, Storage, migration, autenticação, `GenerateClient`, render, cena, legenda, motor, e-mail, outreach e tráfego pago.

### 2.43 O segundo vídeo vem antes do paywall para quem ainda não provou repetição

**FATO CONFIRMADO / IMPLEMENTADO / TESTADO LOCALMENTE / PUBLICADO EM PRODUÇÃO (28/08/2026).** Commit funcional `ef83db57d98df9dcc3774792d12b04a2ce1a0a09`.

- **EVIDÊNCIA DE PRODUÇÃO (janela de 7 dias medida em 27/08/2026; contas internas excluídas):** 24 pessoas vindas do ChatGPT tinham exatamente um vídeo concluído e 2 chegaram ao checkout; entre 6 pessoas com dois ou mais vídeos, 3 chegaram ao checkout. **HIPÓTESE:** a repetição de valor antes da cobrança aumenta a propensão a considerar assinatura. A amostra é pequena e observacional; não prova causalidade.
- **FATO CONFIRMADO:** na versão anterior a `ef83db5`, uma pessoa gratuita com exatamente um vídeo via Starter como botão principal e a continuação da série como secundária. O código já possuía o handoff de episódio 2 e eventos separados, mas a hierarquia contrariava o sinal observado (`app/(dashboard)/history/HistoryClient.tsx`, versão anterior; `lib/seriesContinuation.ts`).
- A política agora tem três estados executáveis: `episode_primary` para exatamente um vídeo e oferta elegível; `subscription_primary` para dois ou mais vídeos e oferta elegível; `episode_only` para assinantes ou quem não deve receber a oferta (`lib/growth/historyMilestone.ts:1-20`). Contagem inválida ou zero falha fechada sem card.
- No primeiro vídeo, “Build Episode 2” vira a ação azul principal e Starter permanece visível como alternativa, com créditos e preço derivados das fontes canônicas. A partir do segundo vídeo, Starter continua sendo a ação principal e a continuação permanece secundária. Assinantes com catálogo veem “Build Next Episode”, nunca são rebatizados como episódio 2 (`app/(dashboard)/history/HistoryClient.tsx:844-1014`).
- O clique de continuação preserva `series_continue_clicked`; o checkout preserva `history_first_video_offer_clicked` e `history_repeat_offer_clicked`. Nenhum evento, endpoint ou operação de banco foi criado. O handoff abre a revisão em `/generate` e não inicia render sozinho (`lib/seriesContinuation.ts:18-33`).
- **TESTADO LOCALMENTE:** política e caller `44/44`; ativação/recuperação `34/34`; oferta pós-vídeo `45/45`; indicação no histórico `55/55`; verdade comercial `305/305`; total de 483 verificações. Whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos desta entrega.
- **VALIDAÇÃO VISUAL:** `docs/previews/HISTORY-SECOND-VIDEO-MILESTONE-2026-08-28.html` compara antes/depois em desktop e mobile. Foi servido somente em localhost, retornou `200`, teve DOM e captura integral conferidos; a revisão encontrou e corrigiu o rótulo de assinantes com mais de um vídeo antes do commit.
- **PUBLICADO EM PRODUÇÃO (28/08/2026):** o status público do commit no GitHub retornou `Vercel: success`, target `GnKjiZE6dFDiADNv89sSTmnNDVYD`. Não houve smoke autenticado, clique, checkout ou execução de JavaScript em produção durante o incidente de capacidade.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; fundador e Claude conduzem o incidente. O Codex não consultou Supabase, Storage, sessão autenticada ou render. Esses `402` são incidente de capacidade, não abandono atribuído a esta variante.
- **QUESTÃO PENDENTE / DESCONHECIDO:** não existe pessoa externa observada na variante nova. Depois da normalização, comparar atores em `history_first_video_offer_viewed → series_continue_clicked → series_continuation_landed → generate_completed → checkout_started → payment_success`, sem chamar clique, segundo vídeo ou checkout de assinatura.
- **NÃO TOCADO:** preço, grant, SKU, termos, checkout, Supabase, Storage, migration, autenticação, `GenerateClient`, pipeline de render, cena, legenda, motor, e-mail, outreach e tráfego pago.

### 2.44 A home ganha uma saída qualificada para empresas e trabalho de cliente

**FATO CONFIRMADO / IMPLEMENTADO / TESTADO LOCALMENTE / PUBLICADO EM PRODUÇÃO (28/08/2026).** Commit funcional `72aa145af3bdf53549e7dc9cdfe7c8e92ba70408`.

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT agregado lido em 28/08/2026 antes desta variante; contas internas excluídas):** não havia ator identificável nem linha de evento na oferta B2B ou em seu brief desde 27/08. A tabela `leads` tinha zero linha. **HIPÓTESE:** uma rota contextual na home aumenta distribuição qualificada da oferta; publicação técnica ainda não prova demanda.
- **FATO CONFIRMADO:** a home mencionava uso comercial no FAQ, sem link, e alcançava `/ai-shorts-for-agencies` apenas pelo rodapé. A ponte B2B já usada em seis superfícies derivava preço dos packs canônicos, preservava a origem de aquisição e media a entrada real no destino, mas `home` não existia na allowlist (`app/KineoLanding.tsx`; `components/Footer.tsx:90`; `lib/agencyDistribution.ts`, versões anteriores a `72aa145`).
- `home` agora é a sétima entrada allow-listed e resolve exatamente para `/ai-shorts-for-agencies?entry=home#agency-pack-heading`, sem UTM que sobrescreva ChatGPT, TAAFT ou Google (`lib/agencyDistribution.ts:1-30`). A página de destino continua deduplicando a impressão por entrada e só registra `home` quando alguém realmente chega (`app/ai-shorts-for-agencies/AgencyPacksClient.tsx:21-45`).
- A ponte aparece depois de “How it works” e antes da comparação genérica. Ela pergunta se a pessoa cria para a própria empresa ou para clientes, oferece os packs avulsos existentes e mantém visíveis os limites “self-service, one account, no recurring contract” (`app/KineoLanding.tsx`; `components/AgencyVolumeBridge.tsx:13-79`).
- **FATO CONFIRMADO:** a parede aprovada de motores e a fileira multi-engine permanecem acima da nova ponte. Nenhum vídeo, card, asset, ordem ou fonte da vitrine foi alterado. O teste de curadoria cobre 247 invariantes do conjunto aprovado.
- **TESTADO LOCALMENTE:** ponte da home `27/27`; distribuição B2B `47/47`; contrato da página B2B `30/30`; curadoria da home `247/247`; ponte ChatGPT/TAAFT `59/59`; verdade comercial `305/305`; total de 715 verificações. Whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos desta entrega. Checklist React aplicado: home e ponte continuam Server Components estáticos, sem hook, fetch, efeito ou ilha cliente nova.
- **VALIDAÇÃO VISUAL:** `docs/previews/HOME-B2B-BRIDGE-2026-08-28.html` compara antes/depois em desktop e mobile e mostra o ponto exato depois de “How it works”. Foi servido apenas em localhost, teve DOM e captura integral conferidos; o servidor e a aba foram encerrados.
- **PUBLICADO EM PRODUÇÃO (28/08/2026):** o status público do commit no GitHub retornou `Vercel: success`, target `5KYJw4hP6F7RcFmZFjf2xVfvBCEy`. A home não recebeu GET ou smoke durante o incidente de capacidade porque seu Server Component resolve sessão; build verde não será descrito como travessia real de visitante.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; fundador e Claude conduzem o incidente. O Codex não consultou Supabase, Storage, sessão autenticada ou render. Esses `402` são incidente de capacidade, não abandono atribuído a esta ponte.
- **QUESTÃO PENDENTE / DESCONHECIDO:** nenhuma pessoa externa foi observada em `home bridge → agency page → pack selected → checkout → purchase`. Depois da normalização, contar pessoas por `metadata.entry=home`; impressão, clique ou checkout não serão chamados de compra.
- **NÃO TOCADO:** vídeos da home, curadoria, preço, grant, SKU, termos, checkout, Supabase, Storage, migration, autenticação, `GenerateClient`, pipeline de render, cena, legenda, motor, e-mail, outreach e tráfego pago.

### 2.45 O painel do afiliado escolhe uma próxima ação pelo estágio real do funil

**FATO CONFIRMADO / IMPLEMENTADO / TESTADO LOCALMENTE / PUBLICADO EM PRODUÇÃO (28/08/2026).** Commit funcional `4fcd99dcd203d2c04842e12aa36ee76f6eed1f69`.

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT agregado lido em 28/08/2026 06:01 UTC antes do incidente; contas internas excluídas):** 11 afiliados externos ativos; sete tinham zero visita vitalícia, quatro tinham pelo menos uma visita, o canal somava 17 visitas cruas e nenhum afiliado tinha referral. A missão anterior atacava somente os sete sem visita. Os quatro que já haviam distribuído o link voltavam a um kit genérico, sem uma ação específica para conquistar o primeiro cadastro.
- `resolveAffiliateNextMission()` transforma somente os contadores já devolvidos por `/api/affiliate/me` em quatro estágios executáveis: `first_click`, `first_signup`, `first_paid_customer` e `scale` (`lib/growth/affiliateNextMission.ts`). Contador ausente, fracionário ou negativo falha fechado; quando linhas legadas se contradizem, o resultado mais profundo confirmado vence — pagamento > cadastro > visita.
- O card do painel agora entrega uma única ação: zero visita copia o post para o gerador gratuito de roteiro; visita sem cadastro troca a mensagem para valor antes de conta; cadastro sem pagamento troca a prova para o teste completo de vídeo Fast; afiliado com pagante recebe o widget atribuído já existente (`app/(dashboard)/affiliate/page.tsx`). Link, legenda, cupom, três destinos e widget não foram reconstruídos.
- O clique copia o ativo correspondente e sincroniza o seletor do kit com o destino recomendado. `affiliate_next_mission_viewed` mede estágio, ação, destino e os três contadores observados; `affiliate_next_mission_copied` mede o uso voluntário do ativo. Código do afiliado, URL, e-mail, prompt e texto livre não entram nesses eventos.
- **TESTADO LOCALMENTE:** missões `63/63`; destinos e atribuição `230/230`; ativação `34/34`; comparação pública `51/51`; total de 378 verificações. Whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos desta entrega.
- **VALIDAÇÃO VISUAL:** `docs/previews/AFFILIATE-FUNNEL-MISSIONS-2026-08-28.html` compara antes/depois em desktop e mobile e exibe os quatro estágios. Foi servido somente em localhost, retornou `200`, teve DOM, overflow e captura integral conferidos; o servidor e a aba foram encerrados.
- **PUBLICADO EM PRODUÇÃO (28/08/2026):** deploy Vercel `dpl_EiUkyCRKcAb6QTBLmXdBJSMid7eT` em estado `READY`, target `production`, ligado ao SHA funcional exato. `/affiliate` não recebeu GET autenticado ou smoke durante o incidente de capacidade, porque sua carga chama `/api/affiliate/me` e o Supabase.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; fundador e Claude conduzem o incidente. O Codex não consultou Supabase, Storage, sessão autenticada ou render. Esses `402` são incidente de capacidade, não abandono de afiliado.
- **QUESTÃO PENDENTE / DESCONHECIDO:** nenhuma pessoa externa foi observada na nova missão. Depois da normalização, medir atores por estágio em `mission viewed → copied → affiliate_click → affiliate_referral → paid`; publicação, impressão ou cópia não serão chamadas de cadastro, assinatura ou comissão.
- **NÃO TOCADO:** `/api/affiliate/me`, queries, tabelas, ledger, taxa de 40%, cupom, janela de atribuição, preço, grant, checkout, Supabase, Storage, migration, autenticação, `GenerateClient`, pipeline de render, cena, legenda, motor, e-mail, outreach e tráfego pago.

### 2.46 O abandono do Autopilot não troca mais o produto no caminho de volta

**FATO CONFIRMADO / IMPLEMENTADO / TESTADO LOCALMENTE / PUBLICADO EM PRODUÇÃO (28/08/2026).** Commit funcional `1bcab8bbc804ea9dad1fab355464c1340189616c`.

- **FATO CONFIRMADO:** o servidor já preservava `tier=autopilot` no `cancel_url` da assinatura, mas a página de cancelamento aceitava somente `starter | basic | pro`; qualquer quarto valor virava `basic`. Quem fechava o Stripe de US$299 recebia Creator como plano salvo e o botão de retry abria Creator. Separadamente, o piloto avulso de US$99 usava `cancel_url=/pricing`, perdendo SKU, compra única e termos de não renovação (`app/checkout/cancelled/page.tsx`, versão anterior a `1bcab8b`; `app/api/stripe/checkout/route.ts`, versão anterior a `1bcab8b`).
- O novo contrato reconhece somente os dois retornos Autopilot: mensal e piloto. O mensal retoma `/api/stripe/checkout?tier=autopilot`; o piloto retoma `/api/stripe/checkout?pack=autopilot_pilot`; todo valor desconhecido falha fechado para o fluxo self-serve existente (`lib/growth/autopilotCheckoutReturn.ts:1-37`). O checkout do piloto agora usa o builder allow-listed no retorno da Stripe (`app/api/stripe/checkout/route.ts:2443`).
- A tela deriva US$299 e US$99 da fonte canônica, distingue mensal de pagamento único e passa a mesma seleção ao launcher anti-duplo-clique (`app/checkout/cancelled/page.tsx:68-126,214-231`). O piloto nunca herda “cancel anytime” nem garantia de assinatura; mostra pagamento único e ausência de auto-renovação (`app/checkout/cancelled/page.tsx:246`).
- Objeção de preço do mensal oferece o piloto do mesmo produto. Objeção de preço do piloto explica que o próximo degrau barato é self-serve, sem fingir que Creator é o mesmo serviço. Comparação, dúvidas e “just looking” levam à seção pública `#autopilot`; todos os cliques novos são nomeados (`app/checkout/cancelled/page.tsx:307-524`). Nenhum preço, SKU, entitlement, metadata de webhook ou promessa comercial foi alterado.
- **TESTADO LOCALMENTE:** retorno Autopilot `36/36`; saved checkout `25/25`; leitura de perfil `25/25`; retorno B2B `75/75`; total de 161 verificações. Whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos desta entrega.
- **VALIDAÇÃO VISUAL:** `docs/previews/AUTOPILOT-CHECKOUT-RECOVERY-2026-08-28.html` contém antes/depois desktop e mobile para o mensal e o piloto. A política do navegador bloqueou `file://` e o Windows negou o bind local mesmo fora do sandbox; por isso o artefato não foi chamado de inspecionado em navegador nesta rodada.
- **PUBLICADO EM PRODUÇÃO (28/08/2026):** deploy Vercel `dpl_Fdi6jnf3Xqsm1gxPK3npkaJ4rqVZ` em estado `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato. Não houve carregamento do Client Component em produção porque seu `useEffect` grava `checkout_cancelled` no Supabase, e o fundador informou que o banco está no limite contratado.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; fundador e Claude conduzem o incidente. O Codex não consultou Supabase, Storage, sessão autenticada ou render. Esses `402` são incidente de capacidade, não abandono atribuído a esta recuperação.
- **QUESTÃO PENDENTE / DESCONHECIDO:** nenhuma pessoa externa foi observada em `Autopilot checkout → cancel → retorno correto → retry/pilot → pagamento`. Build verde e contrato publicado não serão chamados de recuperação ou assinatura. Depois da normalização, validar com uma sessão externa sem concluir cobrança e contar pessoas, não eventos.
- **NÃO TOCADO:** preço, oferta, grant, SKU, entitlement, webhook, banco, Supabase, Storage, migration, autenticação, `GenerateClient`, pipeline de render, cena, legenda, motor, e-mail, outreach e tráfego pago.

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

- Afiliados, atualização de 28/08/2026 06:01 UTC: 11 externos ativos; 7 com zero clique, 4 com pelo menos um clique, 17 visitas cruas e 0 referral. O novo nudge ataca distribuição dos afiliados existentes; recrutamento de novos parceiros é uma etapa distinta.
- A elegibilidade anterior do card de `/history` cobria 0 dos 11 afiliados externos ativos na leitura de 28/08/2026. Não usar a coorte histórica de cinco pagantes como prova de que os afiliados ativos viam aquele card.
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

**TESTADO LOCALMENTE.** Nenhuma entrega de Growth adicionou erro de TypeScript. A ponta atual tem quatro erros preexistentes:

- `app/api/admin/_shared/mrr.ts(113,41)`
- `app/api/me/subscription/route.ts(71,41)`
- `app/api/stripe/checkout/route.ts(547,76)`
- `app/api/stripe/checkout/route.ts(568,62)`

O quinto erro anteriormente registrado em `app/api/analyze-idea/route.ts` não aparece mais na ponta atual. Esta entrega não alterou esse arquivo e não reivindica a correção.

**FATO CONFIRMADO.** O build de produção ignora erros de tipo e lint; portanto, `npx tsc --noEmit` continua gate manual obrigatório.

## 5. O que não foi tocado

- Nenhum prompt de cena, motor, render, legenda, composição, voiceover ou fallback do gerador.
- Nenhum preço, grant, SKU ou termo canônico foi alterado; o adapter PayPal foi alinhado à oferta já aprovada.
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

- **FATO CONFIRMADO / IMPLEMENTADO:** a tabela comercial paralela do PayPal foi removida no commit `a9e3a5e`; o adapter deriva da fonte canônica e os IDs antigos não são reutilizados. A ativação pública continua pendente de canário pago real.
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
