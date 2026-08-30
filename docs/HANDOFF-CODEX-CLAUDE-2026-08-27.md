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

### 2.47 A oferta B2B avulsa agora existe também para mecanismos de resposta

**FATO CONFIRMADO / IMPLEMENTADO / TESTADO LOCALMENTE / VALIDADO EM PRODUÇÃO (28/08/2026).** Commit funcional `75aae937494ad8c2bb78abb1245a442d78086acc`.

- **FATO CONFIRMADO:** `/ai-shorts-for-agencies` já estava no sitemap, rodapé, home e `llms.txt`, mas o payload canônico de `/api/facts` expunha planos, motores e ferramentas gratuitas sem representar os packs comerciais avulsos. Um agente que consumisse somente o JSON poderia concluir que a Kineo vendia apenas assinaturas (`lib/kineoFacts.ts`, versão anterior a `75aae93`; `app/api/facts/route.ts`).
- `buildBusinessOfferFact()` agora deriva IDs, quantidade de vídeos, créditos, preço total e preço unitário diretamente de `BULK_PACKS`, a mesma fonte usada pelo checkout. O contrato declara compra única em USD, ausência de assinatura e sales call, uso comercial permitido e os três limites honestos: contagem referente ao Kineo 1, self-service sem recursos de equipe/white-label e proibição de revender o acesso à Kineo (`lib/growth/businessOfferFacts.ts:1-63`; `lib/kineoFacts.ts:350-354,856,909`).
- Os links estruturados levam à página pública e ao card exato de cada pack; nenhum crawler recebe `/api/stripe/checkout`, portanto ler o fato não cria sessão Stripe. `llms.txt` deixou de reconstruir a tabela e passou a consumir o mesmo objeto estruturado (`app/llms.txt/route.ts:103-105,229-232`).
- A página humana `/facts` ganhou um fato numerado, uma resposta direta para “Can an agency or business buy Kineo without a subscription?” e a fonte pública da oferta. Preço e quantidade não são strings comerciais paralelas: são montados do contrato compartilhado (`app/facts/page.tsx:129-136,243-251,354-362,410`).
- **TESTADO LOCALMENTE:** oferta AEO B2B `69/69`; página B2B `30/30`; acesso de trial `59/59`; verdade monetária `305/305`; total de 463 verificações. Whitespace limpo. O TypeScript mantém somente os quatro erros preexistentes, nenhum nos arquivos desta entrega.
- **VALIDAÇÃO VISUAL:** `docs/previews/AEO-B2B-OFFER-2026-08-28.html` contém antes/depois em desktop e mobile. A política do Chrome bloqueou `file://`, sem tentativa de contorno. A página HTTPS publicada foi inspecionada no Chrome: a pergunta e a fonte B2B aparecem uma vez; em viewport de 390 px o card mede 346 px e a página tem zero overflow horizontal.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy Vercel `dpl_GtN4Q5DXEgL8R9ihXQqabR58Phjw` em estado `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato. `/api/facts` respondeu `200`/cache `HIT` com os quatro packs `bulk10/bulk20/bulk30/bulk50`, preços `$99.00/$179.00/$249.00/$379.00`, `purchaseType=one_time`, `subscriptionRequired=false`, `salesCallRequired=false` e nenhuma URL de checkout. `/llms.txt` respondeu `200`/cache `HIT` com os mesmos quatro packs e limites.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; fundador e Claude conduzem o incidente. As três superfícies validadas são estáticas e não dependem do Supabase; o Codex não consultou banco, Storage, sessão autenticada ou render.
- **QUESTÃO PENDENTE / DESCONHECIDO:** nenhum mecanismo externo foi observado citando a nova estrutura e nenhuma pessoa foi atribuída a `facts/llms → oferta B2B → checkout → compra`. Descoberta técnica e publicação não serão chamadas de aquisição, venda ou assinatura.
- **NÃO TOCADO:** preço, packs, grant, SKU, checkout, webhook, banco, Supabase, Storage, migration, autenticação, `GenerateClient`, pipeline de render, cena, legenda, motor, e-mail, outreach e tráfego pago.

### 2.48 A página orgânica com mais impressões agora responde à demanda que o Google já mostrou

**FATO CONFIRMADO / IMPLEMENTADO / TESTADO LOCALMENTE / VALIDADO EM PRODUÇÃO (28/08/2026).** Commits funcionais `dfc5e8c`, `0eb7025` e `ae1eacd308475360f2abdd69a93ef5f8c9ce31ba`.

- **EVIDÊNCIA DE PRODUÇÃO (Google Search Console, lida em 28/08/2026; janela 30/07–26/08/2026):** `/best-ai-shorts-generators` teve 301 impressões, 1 clique, CTR de 0,3% e posição média 74,4. A propriedade registrou buscas específicas como `sendshort ai alternative`, `storyshort alternatives` e `shortspilot.ai alternatives`. São impressões e cliques, não pessoas, cadastros ou vendas.
- **FATO CONFIRMADO:** a página anterior listava dez ferramentas e não incluía StoryShort, ShortsPilot ou SendShort no ranking. StoryShort e ShortsPilot também não existiam no objeto que gera as páginas `/alternatives/[competitor]`; SendShort existia com uma descrição desatualizada que tratava a geração faceless como um add-on de tier superior (`app/best-ai-shorts-generators/page.tsx`; `app/alternatives/[competitor]/page.tsx`, versões anteriores a `dfc5e8c`).
- O roundup agora compara 13 ferramentas, atualiza metadata, OpenGraph e ItemList e coloca uma resposta curta por ponto de partida antes do conteúdo longo: somente uma ideia, canal faceless automatizado, vídeo longo/podcast, apresentador ou clipe que precisa de acabamento (`app/best-ai-shorts-generators/page.tsx:29-46,158-190,272,338-378`). A linha vira uma coluna em até 680 px; não há tabela rígida nova no mobile.
- StoryShort e ShortsPilot ganharam páginas estáticas próprias, com comparação honesta que declara quando a concorrente é a melhor escolha. As claims foram conferidas nos sites oficiais dos fornecedores em 28/08/2026; nenhum preço de concorrente foi congelado (`app/alternatives/[competitor]/page.tsx:653-704`). A página SendShort foi atualizada para refletir o produto atual: re-clipping, faceless, avatares, tradução, séries e agendamento (`app/alternatives/[competitor]/page.tsx:626-651`).
- O sitemap já derivava todas as URLs de `COMPETITOR_SLUGS`; os dois registros novos entram automaticamente. `LAST_MODIFIED` avançou somente porque o cluster ganhou duas páginas reais e o roundup mudou materialmente (`app/sitemap.ts:42-44,192-197,243`).
- O primeiro smoke em produção encontrou duas falsidades residuais — “única ferramenta” depois da inclusão de concorrentes equivalentes e “27 comparações” depois de o cluster chegar a 29. O segundo encontrou a data visual “July 2026” no template compartilhado. Os dois forward-fixes removeram as afirmações e adicionaram regressões determinísticas antes da classificação final.
- **TESTADO LOCALMENTE:** contrato de intenção `34/34`; handoff do formulário SEO `48/48`; verdade monetária `305/305`. Whitespace limpo. O TypeScript voltou ao baseline exato de quatro erros preexistentes depois da remoção do `.next` gerado pelo build; nenhum arquivo desta entrega introduziu erro. O build local compilou o código, mas a coleta de rotas parou porque a worktree isolada não recebeu `OPENAI_API_KEY`; nenhuma `.env.local` foi lida ou copiada.
- **VALIDAÇÃO VISUAL:** `docs/previews/roundup-search-intent-2026-08-28.html` contém antes/depois em desktop e mobile de 390 px. A política do Chrome bloqueou `file://`; não houve contorno. A página HTTPS publicada foi inspecionada visualmente em desktop, com hierarquia, contraste e mapa de decisão legíveis. O empilhamento mobile é coberto pelo CSS real e pelo contrato, mas não será chamado de inspeção visual em viewport de 390 px nesta rodada.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy final Vercel `dpl_BopsHTQ58ZKRmeGFoGGtnSeK7kB9` em estado `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA final `ae1eacd`. As três páginas públicas responderam com conteúdo final; o sitemap público contém `/alternatives/storyshort` e `/alternatives/shortspilot`. A Vercel registrou zero erro de runtime nas três rotas nos 15 minutos consultados.
- **EVIDÊNCIA DE PRODUÇÃO (relato do fundador, 28/08/2026; não verificado pelo Codex):** o Supabase está no limite contratado de gigabytes e alguns renders retornam `402`; fundador e Claude conduzem o incidente. Esta entrega é estática, não consultou Supabase, não iniciou sessão autenticada e não tocou no pipeline de vídeo. `402` continua classificado como capacidade, não como abandono de Growth.
- **HIPÓTESE:** cobrir a linguagem exata já observada e responder mais cedo aumenta descoberta e CTR. Publicação e impressão não serão chamadas de aquisição. **QUESTÃO PENDENTE / DESCONHECIDO:** aguardar nova janela do Search Console para comparar impressões, posição e cliques da URL e observar se as duas páginas específicas entram no índice; nenhuma assinatura foi atribuída a esta entrega.
- **NÃO TOCADO:** preço, grant, oferta, checkout, Supabase, Storage, migration, autenticação, `GenerateClient`, render, cena, legenda, motor, e-mail, outreach e tráfego pago.

**AÇÃO EXECUTADA / EVIDÊNCIA DE PRODUÇÃO (Google Search Console, 28/08/2026):** Codex inspecionou as três URLs materialmente alteradas. `/best-ai-shorts-generators` já estava no Google, indexada, em HTTPS e com um breadcrumb válido; a solicitação de nova leitura foi confirmada. `/alternatives/storyshort` e `/alternatives/shortspilot` ainda apareciam como `O URL não está no Google` / `O Google não reconhece o URL`, sem rastreamento anterior ou sitemap de referência detectado; ambas receberam solicitação de indexação e o painel confirmou entrada na fila prioritária. Cada URL foi enviada uma vez; não repetir, porque o próprio painel declara que reenvio não aumenta posição nem prioridade.

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

## 9. Atualização Codex Growth — resposta exata para demanda de exoplaneta (28/08/2026)

**BASE LIDA:** `7c67712d73f2ba3d18398e85cc33132c15767c0a`.

**SHA FUNCIONAL FINAL:** `aa34c69968426bb17732c802fa3d02cbdaa62cec` (inclui `7fcbb050fb46819e3dc505a672210348d7ea8bc8`).

**EVIDÊNCIA DE PRODUÇÃO (Google Search Console, lida em 28/08/2026; janela 30/07–26/08/2026):** a consulta exata `youtube shorts exoplanet life script 40 seconds` teve 44 impressões, zero clique e posição média 5,5. Todas as 44 impressões foram atribuídas a `/scripts/space`. São impressões, não pessoas, cadastros ou vendas.

**IMPLEMENTADO:** `/scripts/space` agora responde antes do CTA com um roteiro editorial de 90 palavras, cerca de 40 segundos, estruturado em `HOOK`, `MICRO REWARD`, `ESCALATION` e `PAYOFF`. O visitante pode copiar o texto ou abrir o rascunho exato no gerador. O handoff carrega quebras de linha, `script_mode=verbatim`, `duration=45` e `autoanalyze=1`; não carrega `create_intent`, portanto não inicia render nem gasta crédito. As afirmações científicas visíveis apontam para duas fontes oficiais da NASA.

**FATO CONFIRMADO / PRIVACIDADE:** o primeiro smoke de produção do commit `7fcbb050` revelou que o lockdown `CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED=false` redirecionava toda `/scripts/[vertical]` para `/scripts`; portanto, o deploy estava verde, mas a resposta não era acessível. O forward-fix `aa34c699` mantém somente `/scripts/space` como resposta editorial estática, sem chamar `getScriptLibrary()`, sem enumerar rows e sem expor links `/v/`. Todas as demais prateleiras continuam fail-closed. O sitemap contém `/scripts/space` e não contém `/scripts/money` enquanto o lockdown estiver ativo.

**VALIDADO EM PRODUÇÃO (28/08/2026):** deploy Vercel `dpl_6as3Y6eZfLR9WBbGevQbJnH6LZL5` READY, production, alias `www.usekineo.com`, SHA `aa34c699`. `/scripts/space` respondeu 200, canonical correto, sem `noindex`, com `CreativeWork`, zero links de vídeo de cliente e todos os elementos visíveis (90 palavras, copiar, CTA e fontes NASA). O sitemap respondeu 200 com a URL estática e sem a prateleira privada de money. O Vercel registrou zero runtime errors para `/scripts/space` nos 15 minutos verificados.

**TESTADO LOCALMENTE:** `test-growth-space-intent` 38/38; `test-seo-form-handoff` 48/48; `test-chatgpt-script-handoff` 69/69; `test-signup-creation-proof` 44/44; `test-text-to-video-intent-router` 47/47; `test-growth-roundup-search-intent` 34/34. `npx tsc --noEmit --pretty false --incremental false` mostrou somente os quatro erros baseline em `mrr.ts`, `me/subscription` e `stripe/checkout` ×2.

**COMPARAÇÃO VISUAL:** `docs/previews/space-intent-2026-08-28.html` contém antes/depois desktop e mobile 390px. A página pública foi inspecionada visualmente em desktop e ficou legível, sem corte. **QUESTÃO PENDENTE / DESCONHECIDO:** o controle de Chrome desta sessão não expôs redimensionamento real para 390px; o contrato móvel está no preview e no layout flexível, mas não foi visualmente inspecionado num viewport real de 390px.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** o Supabase atingiu o limite contratado de gigabytes e alguns renders estão retornando 402. Joseph e Claude estão tratando o incidente de capacidade. Codex não acessou Supabase, Storage, banco, render ou pipeline nesta entrega. Para Growth, 402 deve ser classificado como incidente de capacidade, não como abandono voluntário; não declarar que renders estão perfeitos enquanto isso estiver aberto.

**NÃO TOCADO:** Supabase, Storage, migration, banco, render, motor, legenda, composição, crédito, preço, oferta, `GenerateClient.tsx`, e-mail, outreach ou tráfego pago.

**HIPÓTESE:** uma resposta exata acima da dobra e um handoff que preserva o trabalho podem recuperar parte do CTR perdido e transformar intenção orgânica em cadastro. **QUESTÃO PENDENTE / DESCONHECIDO:** aguardar nova janela do Search Console e medir cliques/cadastros pelo campaign `script_library_space_exoplanet_40s`; publicação não é aquisição e nenhum assinante foi atribuído a esta mudança.

**PRÓXIMO DONO:** Codex continua aquisição/fluxo/assinaturas. Claude continua o incidente 402 e qualidade de render. Antes de qualquer edição concorrente, ambos devem executar `git fetch origin` e partir de `aa34c699` ou da ponta posterior de `origin/main`.

## 10. Distribuição orgânica — recaptura prioritária no Google (28/08/2026)

**EVIDÊNCIA DE PRODUÇÃO (Google Search Console, lida em 28/08/2026; janela 01/07–26/08/2026):** antes de construir outra página, Codex comparou as consultas seguintes. `how much do youtube shorts pay` teve 22 impressões, zero clique e posição média 46,8, atribuído somente a `/how-much-do-youtube-shorts-pay`; `text to video for youtube shorts` teve 12 impressões, zero clique e posição média 69,3, atribuído somente a `/text-to-video-shorts`; `cineo` teve 27 impressões, zero clique e posição média 77,6, atribuído somente a `/pricing`. As páginas de payout e text-to-video já têm, respectivamente, calculadora + gerador de tópico e formulário + prova em vídeo; não foi feita uma reescrita duplicada para buscas ainda nas posições 46–78.

**AÇÃO EXECUTADA / EVIDÊNCIA DE PRODUÇÃO (Search Console, 28/08/2026):** a inspeção de `https://www.usekineo.com/scripts/space` confirmou `O URL está no Google`, `A página está indexada`, HTTPS válido e um breadcrumb válido. Como o conteúdo e a metadata foram materialmente alterados nos commits `7fcbb050`/`aa34c699`, Codex solicitou nova indexação. O painel confirmou `Indexação solicitada` e informou que a URL entrou na fila de rastreamento prioritário.

**LIMITE:** solicitar indexação não muda posição nem prioridade por repetição e não garante clique, cadastro ou venda. Não reenviar a mesma URL; aguardar a nova captura e comparar a consulta exata na próxima janela disponível.

**NÃO TOCADO:** nenhum arquivo de produto, banco, Supabase, render, preço, oferta, e-mail, outreach ou anúncio foi alterado nesta ação. Foi uma ação de distribuição sobre a URL editorial já validada.

## 11. Aquisição orgânica — intenção “free InVideo alternative” (28/08/2026)

**BASE LIDA:** `439afee6080b72ee8c474f56857740f924410b4c`.

**SHA FUNCIONAL:** `10fe9de6651602f8c7749ae500b2049c3a8b392a`.

**EVIDÊNCIA DE PRODUÇÃO (Google Search Console, lida em 28/08/2026; comparação 18–24/08 contra 11–17/08):** `/alternatives/invideo` passou de 6 para 61 impressões, permaneceu com zero clique e ampliou a posição média de 8,3 para 75,5. Na janela mais recente apareceram, entre outras, `invideo ai alternative free` (3 impressões), `invideo alternative free` (3), `invideo alternatives` (2), `alternative of invideo` (1), `invideo ai alternatives` (1) e `invideo ai alternative` (1). São impressões e consultas, não pessoas, cadastros ou assinaturas. **HIPÓTESE:** o Google está expandindo o universo semântico da URL; responder cedo à variante gratuita pode melhorar aderência e CTR, mas a queda de posição impede chamar isso de oportunidade já madura.

**FATO CONFIRMADO:** antes de `10fe9de`, o título, H1, introdução e FAQ respondiam somente “InVideo alternative” e não respondiam “free alternative”. A tabela ainda classificava o InVideo como “Paid plans”, embora o próprio fornecedor ofereça plano gratuito. A página já tinha CTA e comparação honesta, portanto não havia motivo para reconstruí-los (`app/alternatives/[competitor]/page.tsx`, versão anterior a `10fe9de`).

**FATO CONFIRMADO / FONTE PRIMÁRIA (consultada em 28/08/2026):** o help center oficial do InVideo, atualizado em 28/07/2026, declara plano gratuito sem cartão, créditos limitados e reset semanal na segunda-feira às 00:00 UTC. A página visível aponta para esse artigo e para a página oficial de preços; nenhum preço em dólar do concorrente foi congelado no código. Como os limites podem mudar e as superfícies oficiais exibem níveis diferentes de detalhe, a copy manda verificar o preço atual em vez de prometer quantidade fixa.

**IMPLEMENTADO:** metadata, badge e H1 agora respondem explicitamente “Free InVideo AI Alternative for Faceless Shorts”. Um bloco acima da tabela responde a pergunta exata, mostra os dois caminhos gratuitos, declara quando escolher cada produto e liga as fontes oficiais. A tabela reconhece que ambos começam sem cartão e descreve o allowance sem inventar exclusividade (`app/alternatives/[competitor]/page.tsx`).

**FATO CONFIRMADO / VERDADE COMERCIAL:** a oferta Kineo não foi reescrita nem congelada. O bloco usa `getFreeTierOffer()`, `OFFER.copy.sentence`, `TRIAL_GRANT_CREDITS_COPY`, `STARTER_MO` e `STARTER_MONTH`; portanto acompanha a flag e as fontes canônicas do deployment. O InVideo record contém zero preço Kineo literal em dólar.

**FATO CONFIRMADO / MEDIÇÃO:** todos os CTAs da URL usam a campanha exclusiva `growth_invideo_free_intent_20260828`; o CTA do novo bloco adiciona `placement=free_answer`. O destino continua vindo de `buildBlankStudioSignupHref`: abre cadastro e revisão no estúdio Fast em branco. O HTML público contém zero `create_intent`, portanto a página não inicia render nem gasta crédito.

**TESTADO LOCALMENTE:** intenção InVideo `29/29`; roundup `34/34`; handoff de formulário SEO `48/48`; handoff ChatGPT `69/69`; prova pós-signup `44/44`; router text-to-video `47/47`. Whitespace limpo. `npx tsc --noEmit --pretty false` mostrou somente os quatro erros baseline em `mrr.ts`, `me/subscription` e `stripe/checkout` ×2. O build local compilou com sucesso e parou na coleta de `/api/regenerate-scene` porque a worktree isolada não recebeu `OPENAI_API_KEY`; nenhuma `.env.local` foi lida ou copiada.

**VALIDAÇÃO VISUAL:** `docs/previews/invideo-free-intent-2026-08-28.html` contém a seção tocada em pares antes/depois desktop e mobile de 390 px. A rota local respondeu `200`; DOM e captura desktop real foram conferidos, com hierarquia, contraste e dois cards legíveis. O controle do Chrome não expôs redimensionamento real para 390 px; o empilhamento mobile está no preview e no `auto-fit` do produto, mas não será chamado de inspeção visual real em 390 px.

**TRANSPARÊNCIA OPERACIONAL:** a inspeção local executou o JavaScript público da página e os componentes fizeram as chamadas normais `GET /api/stats/public` e `POST /api/events`, ambas `200`; não houve SQL, MCP, consulta direta, Storage, sessão autenticada ou render. Para não repetir tráfego de aplicação durante o incidente de capacidade, a validação pública seguinte foi feita por GET do HTML sem JavaScript.

**VALIDADO EM PRODUÇÃO (28/08/2026):** deploy Vercel `dpl_B5JvTt6Kx3gg5wAzN16nUbHXzgoQ` em estado `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato. O HTML público com cache-buster respondeu `200`/`HIT`, título `Free InVideo AI Alternative for Faceless Shorts — Kineo`, canonical correto, sem `noindex`, com H1, resposta, campanha e fontes novas. O handoff aponta para `/studio?engine=fast` e o HTML contém zero `create_intent`. A Vercel registrou zero erro de runtime em `/alternatives/invideo` nos 15 minutos consultados.

**AÇÃO EXECUTADA / EVIDÊNCIA DE PRODUÇÃO (Google Search Console, 28/08/2026):** a inspeção confirmou `O URL está no Google`, `A página está indexada` e HTTPS válido. Como o conteúdo e a metadata foram materialmente alterados, Codex solicitou nova indexação uma única vez. O painel confirmou `Indexação solicitada` e informou que a URL entrou na fila de rastreamento prioritário; reenviar não aumenta posição nem prioridade, portanto não repetir agora.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. Esses `402` são capacidade, não abandono voluntário atribuído à nova página. Codex não afirma que renders estão perfeitos e não tocou no pipeline.

**QUESTÃO PENDENTE / DESCONHECIDO:** nenhuma pessoa, cadastro ou assinatura foi atribuída à variante. Aguardar nova janela do Search Console e contar pessoas em `campaign=growth_invideo_free_intent_20260828`, separando `placement=hero`, `free_answer` e os CTAs finais. Publicação e impressão não serão chamadas de aquisição.

**NÃO TOCADO:** preço, grant, oferta, SKU, checkout, Supabase, Storage, migration, autenticação, `GenerateClient.tsx`, render, cena, legenda, motor, e-mail, outreach ou tráfego pago.

**PRÓXIMO DONO:** Codex continua aquisição, fluxo e assinaturas a partir da ponta atual de `origin/main`. Claude continua o incidente 402 e qualidade de render. Antes de qualquer edição concorrente, ambos devem executar `git fetch origin`; esta entrega não cria sobreposição com o pipeline de vídeo.

## 12. Aquisição B2B orgânica — porta honesta para real estate (28/08/2026)

**BASE LIDA:** `fe26299f49217152fcbbb8639714da5cbb0bc9b8`.

**SHA FUNCIONAL:** `3bbf8aa68e965be42448c2b765a0d010ca385fd0`.

**FATO CONFIRMADO / PESQUISA DE MERCADO (fontes oficiais lidas em 28/08/2026):** HeyGen mantém uma página vertical de real estate e um playbook recente com market updates, listing spotlights e neighborhood guides; VEED mantém uma página “Real Estate Video Maker”; InVideo publicou um workflow recente de vídeo imobiliário com modelos generativos. Fontes: `https://www.heygen.com/real-estate`, `https://www.heygen.com/tool/real-estate-video-maker`, `https://www.veed.io/create/promo-video/real-estate-video-maker` e `https://invideo.io/blog/how-to-create-real-estate-videos-using-ai/`. Isto prova que concorrentes tratam o vertical como superfície própria; não prova volume de busca, CAC ou conversão da Kineo.

**FATO CONFIRMADO / GAP NO CÓDIGO:** antes de `3bbf8aa`, a Kineo tinha a oferta B2B genérica, o planejador semanal e páginas de produto/comentário, mas nenhuma rota pública ou sitemap para real estate. A busca no diretório `app/` não encontrou página de corretor, realtor ou real estate. A decisão foi criar uma porta estreita compatível com o que o produto entrega, sem copiar as promessas de avatar, upload de fotos ou tour fiel dos concorrentes.

**IMPLEMENTADO:** `/real-estate-video-maker` é um Server Component `force-static` com metadata, canonical, Open Graph, FAQ estruturada e uma resposta direta acima da dobra. A página oferece três trabalhos repetíveis — market update, neighborhood guide e buyer/seller tip — e para cada um declara os dados que o agente deve fornecer e a fronteira factual (`app/real-estate-video-maker/page.tsx`; `lib/growth/realEstateShorts.ts`).

**FATO CONFIRMADO / PROMESSA LIMITADA:** a página diz explicitamente que este workflow não ingere MLS, não preserva geometria de cômodos, não cria walkthrough fiel, não cria digital twin e não verifica estatística, lei ou regulação. Visuais gerados/stock são contexto, nunca prova de propriedade, vista, amenidade, limite ou condição. A Kineo é apresentada para Shorts faceless de fatos e explicações; não para tour de imóvel.

**FATO CONFIRMADO / CONVERSÃO SEGURA:** os dois CTAs usam `buildBlankStudioSignupHref()` com a campanha `growth_real_estate_video_maker_20260828`. O HTML contém zero `create_intent`, portanto abrir ou clicar na página não inicia render automaticamente. A rota B2B usa `agencyPacksHref('real_estate')`; a nova entrada é allow-listed e preserva a origem ChatGPT/Google/TAAFT em vez de sobrescrevê-la com UTM. Nenhum preço é literal na página; o texto gratuito vem de `getFreeTierOffer()` e os packs continuam na fonte existente.

**DISTRIBUIÇÃO:** a URL entrou no sitemap, no rodapé público e na seção B2B de `/llms.txt`, com a mesma fronteira “não é MLS-photo tour / faithful walkthrough / digital twin”. A página não nasce órfã e mecanismos de resposta recebem o trabalho e o limite juntos.

**TESTADO LOCALMENTE:** `test-real-estate-video-maker` 36/36; `test-b2b-distribution` 51/51; whitespace limpo. `npx tsc --noEmit` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo. Checklist React/Next aplicado: rota estática, zero hook, fetch, efeito ou ilha cliente nova.

**COMPARAÇÃO VISUAL:** `docs/previews/real-estate-video-maker-2026-08-28.html` contém antes/depois desktop e mobile 390 px. O preview foi servido em localhost e teve DOM e captura integral conferidos. A rota Next real respondeu `200`; em viewport real de 390 px, `scrollWidth=clientWidth=390`, H1 e resposta direta visíveis, sem overflow horizontal.

**TRANSPARÊNCIA OPERACIONAL:** o smoke visual da rota Next real carregou o layout local e disparou um `POST /api/events` local `200` e um `GET /api/stripe/checkout/resume` local `503`. Codex não leu `.env.local`, não consultou Supabase/MCP/SQL e não sabe se o endpoint local possuía credencial de produção; por isso o possível efeito do único evento fica **QUESTÃO PENDENTE / DESCONHECIDO**. Não houve checkout criado, cobrança ou render. Depois desse achado, a validação de produção foi feita somente por GET do HTML sem JavaScript.

**VALIDADO EM PRODUÇÃO (28/08/2026):** deploy Vercel `dpl_9YpAqcu2tFXgvizc5k2LzYC48H2d` em estado `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato. O HTML público respondeu `200`/cache `PRERENDER`, com title, canonical, H1 e campanha corretos, sem `create_intent` e sem `noindex`. `/llms.txt` e `/sitemap.xml` públicos contêm a URL. A Vercel registrou zero erro de runtime para `/real-estate-video-maker` nos 15 minutos consultados.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. Codex não tocou em Storage, banco, migration, autenticação, pipeline de vídeo ou capacidade. Os `402` continuam classificados como incidente de capacidade, não abandono da nova página.

**QUESTÃO PENDENTE / DESCONHECIDO:** nenhuma pessoa, cadastro, checkout ou assinatura foi atribuída à rota. Depois da normalização da capacidade, medir pessoas em `campaign=growth_real_estate_video_maker_20260828` e a entrada B2B `real_estate`; publicação não será chamada de aquisição até existir ator real.

**TAAFT / DECISÃO DA MESMA RODADA:** o acesso automatizado à ficha pública foi bloqueado pelo próprio site e não houve contorno. O repositório registra que a ficha foi corrigida manualmente em 26/08 e que o pacote pago de US$347 já foi reprovado pelos dados históricos; não houve pagamento, relaunch ou edição duplicada nesta rodada.

**NÃO TOCADO:** Supabase, Storage, migration, banco, render, motor, legenda, composição, crédito, preço, oferta, SKU, checkout, `GenerateClient.tsx`, e-mail, outreach, TAAFT pago ou anúncio.

**PRÓXIMO DONO:** Codex continua aquisição/fluxo/assinaturas a partir da ponta posterior de `origin/main`. Claude continua incidente 402 e qualidade de render. Antes de qualquer edição concorrente, ambos devem executar `git fetch origin`; esta entrega não cria sobreposição com pipeline de vídeo.

## 13. Aquisição orgânica — entidade da marca para a busca “cineo” (28/08/2026)

**BASE LIDA:** `517c8712c31da33a964ab79b90939343c81af908`.

**SHA FUNCIONAL:** `80fbd4123c90d49dc5f3a76e48f39b5cf3b55763`.

**EVIDÊNCIA DE PRODUÇÃO (Google Search Console, lida em 28/08/2026; janela 01/07–26/08/2026):** o domínio teve 37 cliques, 2.216 impressões, CTR de 1,7% e posição média 49. A consulta exata `cineo` teve 27 impressões, zero clique e posição média 77,6. Ao filtrar a aba de páginas, o Google atribuiu todas as 27 impressões somente a `https://www.usekineo.com/pricing`. São impressões, não pessoas, cadastros ou assinaturas.

**FATO CONFIRMADO / CAUSA NO CÓDIGO:** a home declarava `Kineo AI`, `UseKineo`, `Cineo` e `Cineo AI` como aliases da organização, mas o schema global servido em `/pricing` declarava apenas `ShortsForgeAI`. Assim, justamente a URL escolhida pelo Google para `cineo` não recebia esse alias. A identidade agora tem fonte única em `lib/brandIdentity.ts:1-16`; a home importa essa fonte em `app/page.tsx:6,44-53`; e o schema global a usa em `components/StructuredData.tsx:4,62-77`.

**IMPLEMENTADO:** `BRAND_NAME`, `BRAND_URL` e `BRAND_ALIASES` passam a ser compartilhados pelos schemas `Organization`, `WebSite` e `SoftwareApplication`. A lista canônica é `Kineo AI`, `UseKineo`, `Cineo`, `Cineo AI` e `ShortsForgeAI`. A mudança é somente JSON-LD: não exibe a grafia errada na copy, não cria doorway `/cineo`, não altera preço, oferta, checkout ou fluxo autenticado.

**TESTADO LOCALMENTE:** `test-brand-entity-aliases` 15/15; whitespace limpo. `npx tsc --noEmit --pretty false --incremental false` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo.

**VALIDADO EM PRODUÇÃO (28/08/2026):** deploy Vercel `dpl_CEHvB3DhwmFP7gictB2Shm37fQjF` em estado `READY`, target `production`, SHA exato `80fbd412`. Home e `/pricing` responderam `200` com o marcador desse deploy. O HTML público das duas páginas contém `Cineo`, `Cineo AI` e `ShortsForgeAI` nos dados estruturados. Os canonicals são `https://www.usekineo.com` e `https://www.usekineo.com/pricing`. A Vercel registrou zero erro de runtime em `/` e `/pricing` nos 30 minutos verificados.

**AÇÃO NÃO EXECUTADA:** não foi solicitada nova indexação da home ou de `/pricing`. Essa ação deve acontecer apenas uma vez, mediante confirmação do fundador no momento da ação; repeti-la não garante posição, clique ou prioridade.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`. Joseph e Claude conduzem o incidente. Codex não consultou nem escreveu em Supabase, Storage, banco, migration ou sessão autenticada nesta entrega. Enquanto o incidente estiver aberto, `402` deve ser separado das métricas de abandono/conversão e classificado como capacidade indisponível; não declarar que renders estão perfeitos.

**QUESTÃO PENDENTE / DESCONHECIDO:** nenhum clique, cadastro, checkout ou assinante foi atribuído à correção de entidade. Aguardar novo rastreamento do Google e comparar a consulta exata `cineo` na próxima janela. Publicação e impressão não serão chamadas de aquisição.

**NÃO TOCADO:** copy visível, preço, grant, oferta, SKU, checkout, Supabase, Storage, migration, autenticação, `GenerateClient.tsx`, render, cena, legenda, motor, e-mail, outreach, TAAFT ou anúncio.

**PRÓXIMO DONO:** Codex continua aquisição/fluxo/assinaturas a partir de `80fbd412` ou da ponta posterior de `origin/main`. Claude continua o incidente de capacidade do Supabase e qualidade de render. Ambos devem executar `git fetch origin` antes de iniciar uma nova worktree.

## 14. Aquisição orgânica — intenção exata `#viralnow` (28/08/2026)

**BASE LIDA:** `f540ff7e78338a8bbb6ae34959ba600d8cc0bf85`.

**SHA FUNCIONAL:** `2e84934106014e737ffc1e15ab7ae5328a5f7c6f`.

**EVIDÊNCIA DE PRODUÇÃO (Google Search Console, lida em 28/08/2026; janela 01/07–26/08/2026):** a consulta exata `#viralnow` teve 11 impressões, zero clique, CTR de 0% e posição média 14,5. Ao abrir a aba de páginas, todas as 11 impressões estavam atribuídas somente a `https://www.usekineo.com/viral-now`. São impressões, não pessoas, cadastros ou assinaturas.

**FATO CONFIRMADO / GAP:** antes de `2e84934`, o title era `Viral Now: Trending YouTube Shorts Ideas Today | Kineo` e a description dizia que as ideias eram “trending”. O código não detecta tendências ao vivo: `lib/viralTopics.ts:1002-1029` faz um shuffle determinístico de uma biblioteca curada e troca oito entradas a cada bloco UTC de quatro horas. A própria API confirma que não há dependência de persistência (`app/api/viral-now/route.ts:1-14`).

**IMPLEMENTADO:** o title agora responde à grafia exata `#ViralNow` e promete somente o que o código entrega: oito ideias de Shorts para postar hoje. A description chama a fonte de biblioteca curada e a mudança de rotação, não de atualização de tendência. O `ItemList` recebe o mesmo nome, a mesma description e os aliases `Viral Now`/`Viral Now YouTube Shorts ideas` (`app/(dashboard)/viral-now/page.tsx:7-48`).

**ESCOPO:** somente metadata e JSON-LD. H1, cards, CTA, cadastro, handoff da ideia, sessão e UI não mudaram. Não foi adicionado evento, `create_intent`, preço, oferta, checkout ou acesso novo ao Supabase.

**TESTADO LOCALMENTE:** `test-viralnow-search-intent` 14/14; whitespace limpo com `core.whitespace=cr-at-eol`. `npx tsc --noEmit --pretty false --incremental false` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo.

**VALIDADO EM PRODUÇÃO (28/08/2026):** deploy Vercel `dpl_3rzdx8eaATJtuaRk149jhdNwdKvn` em estado `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato. Um GET público sem JavaScript respondeu `200` com o marcador do deploy, title/description novos, canonical `https://www.usekineo.com/viral-now`, sem `noindex`, com nome e aliases novos no schema e zero `create_intent`. A Vercel registrou zero erro de runtime em `/viral-now` nos 15 minutos consultados.

**TRANSPARÊNCIA OPERACIONAL:** o GET público não executou JavaScript, não criou evento, não usou sessão autenticada e não fez SQL/MCP/Storage. A rota existente chama `supabase.auth.getUser()` no servidor para decidir o destino do CTA; portanto, a validação pode ter produzido uma verificação anônima de autenticação já inerente à página. Nenhuma escrita foi adicionada ou solicitada.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`. Joseph e Claude conduzem o incidente. Esses `402` continuam classificados como indisponibilidade de capacidade, não abandono voluntário nem falha atribuída a esta entrega; não declarar que renders estão perfeitos.

**AÇÃO NÃO EXECUTADA:** não foi solicitada nova indexação de `/viral-now`. Fazer no máximo uma solicitação após confirmação do fundador no momento da ação; repetir não garante posição, clique ou prioridade.

**QUESTÃO PENDENTE / DESCONHECIDO:** nenhum clique, cadastro, checkout ou assinante foi atribuído ao novo snippet. Aguardar novo rastreamento e comparar `#viralnow` na próxima janela do Search Console; publicação não será chamada de aquisição.

**NÃO TOCADO:** UI visível, Supabase, Storage, migration, render, motor, cena, legenda, crédito, preço, oferta, SKU, checkout, `GenerateClient.tsx`, e-mail, outreach, TAAFT ou anúncio.

**PRÓXIMO DONO:** Codex continua aquisição/fluxo/assinaturas a partir de `2e84934` ou da ponta posterior de `origin/main`. Claude continua o incidente de capacidade do Supabase e qualidade de render. Ambos devem executar `git fetch origin` antes de iniciar uma nova worktree.

## 15. Fluxo pós-cadastro — home aprovada com próximo passo por objetivo (28/08/2026)

**BASE LIDA:** `f3ffd95e2939811352c09fc630fc1e0a90c358ed`.

**SHA FUNCIONAL:** `7b7ddc4c5ccfa76459099b6dd7f26532cf0656ad`.

**FATO CONFIRMADO / GARGALO:** o fundador aprovou a home como pouso pós-cadastro para que a pessoa veja primeiro os quatro motores. O cadastro sem ideia preserva isso: `activationRedirectFromSearch()` monta `/?welcome=1` (`app/(auth)/signup/page.tsx:23-50`), e o callback respeita o `next` explícito, acrescentando `signup=1` para conta nova (`app/auth/callback/route.ts:48-59`). Antes deste commit, porém, o roteador creator/business/agency existia somente dentro de `/generate` por `NicheOnboarding`; a conta que pousava na home via o showroom e seguia para seções genéricas, sem próximo passo alinhado ao trabalho que queria concluir.

**IMPLEMENTADO:** somente uma sessão autenticada com `?welcome=1` recebe o novo bloco na home (`app/page.tsx:72-116`). A ordem aprovada do hero permanece Veo 3.1 → Kling 3 → MiniMax H3 → Omni Flash e o roteador entra depois de `</header>` (`app/KineoLanding.tsx:1044-1053`). As três escolhas reutilizam a fonte `ONBOARDING_GOALS`, sem bifurcar copy nem seleção de motor: `Grow my channel`, `Promote my business` e `Create for clients` (`lib/growth/onboardingGoals.ts:20-51`; `components/HomeWelcomeGoalRouter.tsx:8-44`).

**FATO CONFIRMADO / CONVERSÃO SEGURA:** cada escolha abre `/studio/create` com uma ideia editável, `autoanalyze=1`, `intent_campaign=growth_home_welcome_goal_router_20260828` e `onboarding_goal=<creator|business|agency>`. Nenhuma URL contém `create_intent`; escolher um objetivo não inicia render nem gasta crédito (`lib/growth/onboardingGoals.ts:64-77`). O roteador é Server Component de zero JavaScript próprio: não usa hook, `fetch`, analytics, nova API ou evento. Isso evita adicionar escrita ao Supabase durante o incidente de capacidade.

**TESTADO LOCALMENTE:** `test-home-welcome-goal-router` 38/38; whitespace limpo. `npx tsc --noEmit --pretty false --incremental false` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/home-welcome-goal-router-2026-08-28.html` contém antes/depois desktop e mobile 390 px. O comparativo foi publicado em deploy preview isolado `dpl_A4mcPro1Wo6kE7sjPCDooMqzEArp`, inspecionado visualmente em 28/08/2026 e nunca enviado para `main`. No desktop, showroom e ordem dos quatro motores permanecem primeiro e o novo bloco tem hierarquia/contraste legíveis; no mobile de 390 px, os três objetivos empilham em uma coluna, sem texto cortado. A página completa apresentou `scrollWidth <= clientWidth`, sem overflow horizontal.

**VALIDADO EM PRODUÇÃO (28/08/2026):** deploy Vercel `dpl_5xUKQkj7vFPmH3g8e3KDkhj6ZcLT` em estado `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato. A Vercel registrou zero erro de runtime em `/` nos 15 minutos consultados.

**QUESTÃO PENDENTE / DESCONHECIDO:** o caminho autenticado real não foi executado em produção nesta rodada. Fazer esse smoke exigiria sessão/Supabase e poderia criar eventos enquanto a capacidade está esgotada; o fundador e Claude conduzem o incidente. A evidência atual prova código, contrato de URL, render visual e deploy, mas a classificação honesta é **IMPLEMENTADO, TESTADO LOCALMENTE E DEPLOY VALIDADO**, não `VALIDADO EM PRODUÇÃO` end-to-end do clique autenticado.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`. Codex não consultou nem escreveu em Supabase, Storage, banco, migration, autenticação ou render nesta entrega. Esses `402` continuam classificados como indisponibilidade de capacidade, não abandono voluntário nem falha atribuída ao roteador; não declarar que renders estão perfeitos.

**QUESTÃO PENDENTE / DESCONHECIDO:** nenhuma pessoa, cadastro, checkout ou assinatura foi atribuída ao roteador. Depois da normalização do Supabase, medir pessoas em `intent_campaign=growth_home_welcome_goal_router_20260828` e separar `onboarding_goal`; publicação e deploy não serão chamados de aquisição.

**NÃO TOCADO:** os quatro vídeos e suas fontes, `GenerateClient.tsx`, Supabase, Storage, migration, banco, render, motor, cena, legenda, crédito, preço, oferta, SKU, checkout, e-mail, outreach, TAAFT ou anúncio.

**PRÓXIMO DONO:** Codex continua aquisição, fluxo e assinaturas a partir de `7b7ddc4` ou da ponta posterior de `origin/main`. Claude continua o incidente de capacidade e o pipeline de render. Ambos devem executar `git fetch origin` antes de qualquer nova worktree; não duplicar este roteador.

## 16. Aquisição ChatGPT/TAAFT — referência real ativa a ponte de valor (28/08/2026)

**BASE LIDA:** `6a7288406178c0ca50a8f4c37684fc76cfbe04e1`.

**SHA FUNCIONAL:** `eb2a9f3210b13a55f05d247171169ce7a1c5d2b6`.

**FATO CONFIRMADO / GARGALO:** a home já tinha uma ponte específica que mantém o showroom aprovado e, logo depois, oferece ao visitante vindo de ChatGPT/TAAFT um teste de roteiro antes do cadastro. O detector, porém, lia somente `utm_source` e o parâmetro legado `ref` (`lib/growth/homeReferralBridge.ts`, versão anterior a `eb2a9f3`). Um clique externo normal que chegasse somente com o cabeçalho HTTP `Referer` não ativava a ponte e recebia a home genérica.

**IMPLEMENTADO:** `app/page.tsx` agora passa `headers().get('referer')` ao resolver da ponte. `homeReferralBridgeSource()` reutiliza `acquisitionSource()`, a política canônica já usada pelo ledger de aquisição: UTM explícito continua vencendo, os hosts próprios continuam filtrados, `chatgpt.com` vira `chatgpt` e `theresanaiforthat.com` vira `taaft`. A URL completa de referência não é armazenada, exibida nem enviada; ela é reduzida em memória ao rótulo canônico antes do render.

**FATO CONFIRMADO / ESCOPO:** esta entrega não altera a aparência, copy ou posição da ponte existente; só fecha o caminho de detecção. Não cria evento, API, `fetch`, cookie, sessão, escrita ou leitura adicional no Supabase. A home já era dinâmica e já lia autenticação; ler o cabeçalho não acrescenta dependência de banco.

**TESTADO LOCALMENTE:** `test-home-referral-bridge` 66/66. Os casos executáveis cobrem referência ChatGPT sem UTM, referência TAAFT sem UTM, UTM não alvo vencendo sobre a referência, self-referral bloqueado e valor malformado fail-closed. Whitespace limpo. `npx tsc --noEmit --pretty false --incremental false` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo.

**VALIDAÇÃO VISUAL:** não houve edição de UI. A ponte continua usando a comparação visual já aprovada em `docs/previews/HOME-REFERRAL-BRIDGE-2026-08-28.html`; nenhum novo before/after foi criado para uma alteração invisível de roteamento.

**DEPLOY VALIDADO (28/08/2026):** deploy Vercel `dpl_Aw55t1ZNBCm7ynjwU1g7gWGuwSek` em estado `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA exato `eb2a9f3`. A Vercel registrou zero erro de runtime em `/` nos 15 minutos consultados.

**QUESTÃO PENDENTE / DESCONHECIDO:** não foi feito GET sintético com `Referer` em produção. A home chama a autenticação já existente e o fundador pediu que Codex não acessasse Supabase durante o incidente de capacidade; a evidência atual prova função executada, caller, build/deploy e ausência de erro, mas não um smoke HTTP ponta a ponta com o cabeçalho real.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`. Joseph e Claude conduzem o incidente. Codex não consultou nem escreveu em Supabase, Storage, banco, migration, autenticação ou render nesta entrega. `402` continua sendo capacidade indisponível, não abandono voluntário.

**QUESTÃO PENDENTE / DESCONHECIDO:** nenhum visitante, cadastro, checkout ou assinante foi atribuído a este forward-fix. Depois da normalização da capacidade, medir pessoas da ponte por `acquisition_source=chatgpt|taaft` e pelos placements existentes; publicação não será chamada de aquisição.

**NÃO TOCADO:** copy visual, quatro vídeos, `GenerateClient.tsx`, Supabase, Storage, migration, banco, render, motor, cena, legenda, crédito, preço, oferta, SKU, checkout, e-mail, outreach, TAAFT pago ou anúncio.

**PRÓXIMO DONO:** Codex continua aquisição, fluxo e assinaturas a partir de `eb2a9f3` ou da ponta posterior de `origin/main`. Claude continua o incidente de capacidade e o pipeline de render. Ambos devem executar `git fetch origin` antes de nova worktree; não reconstruir a ponte ChatGPT/TAAFT.

## 17. Distribuição orgânica — recrawl único da entidade `cineo` (28/08/2026)

**BASE DE CÓDIGO:** `68bbebc626e0a09fa6d5b14352660ccdf2a0a5bc`, igual a `origin/main` no início da ação.

**EVIDÊNCIA DE PRODUÇÃO QUE MOTIVOU A AÇÃO (Google Search Console, lida em 28/08/2026; janela 01/07–26/08/2026):** a consulta exata `cineo` tinha 27 impressões, zero clique e posição média 77,6, todas atribuídas a `https://www.usekineo.com/pricing`. A correção funcional `80fbd412` passou a declarar `Cineo`/`Cineo AI` nos dados estruturados da home e de `/pricing`, mas a seção 13 registrava que o Google ainda não havia recebido pedido de nova leitura. Impressões não são pessoas, cadastros ou assinaturas.

**AÇÃO EXECUTADA / EVIDÊNCIA DE PRODUÇÃO (Google Search Console, 28/08/2026, entre 20:20 e 20:24 BRT):** a inspeção confirmou para `https://www.usekineo.com/` e `https://www.usekineo.com/pricing` os estados `O URL está no Google`, `A página está indexada` e `A página é exibida por HTTPS`. Codex solicitou indexação uma única vez em cada URL. Para ambas, o painel confirmou `Indexação solicitada` e informou: `O URL foi adicionado a uma fila de rastreamento prioritário. Enviar uma página diversas vezes não alterará a posição ou a prioridade dela na fila.`

**ESCOPO E LIMITE DA PROVA:** nenhuma nova URL, sitemap inteiro ou repetição foi submetida. A ação somente pede ao Google que releia o HTML já publicado; não garante data de rastreamento, posição, impressão, clique, cadastro, checkout ou assinatura. Não repetir agora.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. Esta ação não acessou Supabase, Storage, banco, migration, autenticação ou render. Os `402` permanecem classificados como indisponibilidade de capacidade, nunca como abandono voluntário.

**NÃO TOCADO:** código funcional, UI, copy, preço, oferta, grant, checkout, evento, Supabase, Storage, render, motor, cena, legenda, e-mail, outreach, TAAFT ou anúncio.

**QUESTÃO PENDENTE / DESCONHECIDO:** quando o Google fará o novo rastreamento e se a consulta `cineo` ganhará posição ou clique. Medir somente após nova janela do Search Console; recrawl solicitado não será chamado de aquisição.

**PRÓXIMO DONO:** Codex segue aquisição/fluxo/assinaturas a partir da ponta atual de `origin/main`. Claude segue o incidente 402 e qualidade de render. Ambos devem executar `git fetch origin` antes de editar; esta seção é documentação da ação externa e não altera o produto.

## 18. Aquisição orgânica/AI Answers — comparação Synthesia honesta e citável (28/08/2026)

**BASE LIDA:** `9aa747672ac6849a488d34560a037655b99b4ab1`.

**SHA FUNCIONAL:** `772df7461af36a7cf49c89acd18695da79c56f29`.

**EVIDÊNCIA DE PRODUÇÃO (Google Search Console, lida em 28/08/2026; janela 01/07–26/08/2026):** o relatório beta de recursos generativos de IA mostrou 35 impressões no total. `/alternatives/synthesia` recebeu 4 impressões — a maior contagem entre as páginas editoriais do relatório; somente a home, com 16, e `/pricing`, com 6, ficaram acima. São impressões, não pessoas, cliques, cadastros, checkouts ou assinaturas.

**FATO CONFIRMADO / PROBLEMA DE VERDADE COMERCIAL:** antes de `772df74`, `app/alternatives/[competitor]/page.tsx` descrevia a Synthesia como um fluxo que parava no avatar/talking head e dizia que Kineo “finishes the job”. A página oficial `https://www.synthesia.io/features/ai-video-generator`, consultada em 28/08/2026, declara geração completa de vídeo e assets gerados por IA. A mesma página da Kineo prometia `perfect lip-sync` e apresentava equivalência ampla; o contrato real do produto é um apresentador opcional 720p a partir de foto adequada, não uma biblioteca de avatares nem um workspace empresarial de governança.

**IMPLEMENTADO:** a página passa a responder primeiro à decisão de compra: `Kineo is an alternative for the Short — not for the enterprise avatar workspace`. O H1 esclarece que não é substituição direta. A comparação separa o trabalho de creator — um Short faceless 9:16 com roteiro, narração, motor visual e legendas — do trabalho empresarial da Synthesia — avatares, localização multilíngue, revisão em equipe, Brand Kit, SCORM e controles de governança. As afirmações instáveis sobre a concorrente ficam acompanhadas por links para `https://www.synthesia.io/pricing` e `https://www.synthesia.io/features/ai-video-generator`, com data de conferência e aviso de que planos/limites podem mudar. Nenhum preço da Synthesia foi congelado no código.

**FATO CONFIRMADO / OFERTA:** preço e grant da Kineo continuam derivados das fontes canônicas (`STARTER_MO` e `OFFER.copy.sentence`); nenhum preço foi escrito como literal novo. A campanha existente `push22_alternative_synthesia` foi preservada para não fragmentar atribuição. Não foi criado evento, campanha, cookie, API ou acesso novo ao banco.

**TESTADO LOCALMENTE:** `test-synthesia-ai-answer` 33/33 e `test-growth-invideo-free-intent` 29/29; whitespace limpo com `core.whitespace=cr-at-eol`. `npx tsc --noEmit --pretty false --incremental false` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/synthesia-ai-answer-2026-08-28.html` contém antes/depois desktop e mobile. O preview isolado `dpl_9yM99dgGS1P5hcwhZzVpyr3x8bfv` foi inspecionado visualmente em 28/08/2026. No desktop, a resposta curta e os dois critérios de escolha aparecem antes da tabela; no viewport real de 390 × 844, os cards empilham, o texto permanece legível e `scrollWidth = clientWidth = 390`, sem overflow horizontal.

**VALIDADO EM PRODUÇÃO (28/08/2026):** deploy Vercel `dpl_F2WWGo1UTBwk2z6yDStvyrDcTpc8` em estado `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato `772df746`. Um GET público sem JavaScript respondeu `200`, `x-matched-path: /alternatives/synthesia`, title/H1 novos, canonical `https://www.usekineo.com/alternatives/synthesia`, resposta curta e links oficiais presentes. A Vercel registrou zero erro de runtime agrupado para `/alternatives/synthesia` nos 15 minutos consultados.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. Esta entrega e sua validação não acessaram Supabase, Storage, banco, migration, autenticação ou render. O GET foi sem JavaScript e não executou os eventos client-side existentes. `402` permanece capacidade indisponível, não abandono voluntário nem falha atribuída a esta página; não declarar que renders estão perfeitos.

**QUESTÃO PENDENTE / DESCONHECIDO:** nenhum clique, pessoa, cadastro, checkout ou assinatura foi atribuído à comparação nova. A evidência prova uma superfície já exibida em respostas generativas, uma mensagem anterior materialmente imprecisa e a correção publicada; não prova aquisição. Medir a URL na próxima janela do relatório generativo e no funil já existente, sem adicionar telemetria durante o incidente.

**NÃO TOCADO:** Supabase, Storage, migration, autenticação, `GenerateClient.tsx`, render, motor, cena, legenda, crédito, preço, grant, SKU, checkout, e-mail, outreach, TAAFT pago ou anúncio.

**PRÓXIMO DONO:** Codex continua aquisição/fluxo/assinaturas a partir de `772df746` ou da ponta posterior de `origin/main`. Claude continua o incidente de capacidade e qualidade do pipeline. Ambos devem executar `git fetch origin` antes de nova worktree; não reconstruir esta comparação nem voltar à promessa de substituição direta.

## 19. Distribuição orgânica — recrawl único de `#viralnow` (28/08/2026)

**BASE DE CÓDIGO:** `7ca4b6ec4fe6b66db93d44a50723e827008603f7`, igual a `origin/main` no início da ação.

**EVIDÊNCIA DE PRODUÇÃO QUE MOTIVOU A AÇÃO (Google Search Console, lida em 28/08/2026; janela 01/07–26/08/2026):** a consulta exata `#viralnow` tinha 11 impressões, zero clique, CTR de 0% e posição média 14,5, todas atribuídas a `https://www.usekineo.com/viral-now`. A correção funcional `2e849341` passou a responder à grafia exata no title e no schema, mas a seção 14 registrava que o Google ainda não havia recebido pedido de nova leitura. Impressões não são pessoas, cadastros ou assinaturas.

**AÇÃO EXECUTADA / EVIDÊNCIA DE PRODUÇÃO (Google Search Console, 28/08/2026, entre 20:30 e 20:31 BRT):** a inspeção confirmou para `https://www.usekineo.com/viral-now` os estados `O URL está no Google`, `A página está indexada` e `A página é exibida por HTTPS`. Codex solicitou indexação uma única vez. O painel confirmou `Indexação solicitada` e informou que a URL entrou na fila de rastreamento prioritário e que reenviar não altera posição nem prioridade.

**ESCOPO E LIMITE DA PROVA:** nenhuma página nova, nova copy, novo evento ou repetição foi criada. A ação distribui uma mudança já publicada e não garante data de rastreamento, posição, impressão, clique, cadastro, checkout ou assinatura. Não repetir agora.

**ANTI-DUPLICAÇÃO / EVIDÊNCIA DE PRODUÇÃO:** antes da ação, Codex voltou à tabela de consultas e confirmou que a maior oportunidade aparente — `youtube shorts exoplanet life script 40 seconds`, com 44 impressões, zero clique e posição 5,5 — já foi respondida pela entrega da seção 9. Também rejeitou novas edições para `compare kineo` (posição 69,2) e `ai shorts maker free` (posição 97,4): estão longe demais para justificar reconstrução nesta rodada. Os números são da mesma janela 01/07–26/08/2026.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. Esta ação não acessou Supabase, Storage, banco, migration, autenticação ou render. Os `402` continuam classificados como indisponibilidade de capacidade, nunca como abandono voluntário.

**NÃO TOCADO:** código funcional, UI, copy, preço, oferta, grant, checkout, evento, Supabase, Storage, render, motor, cena, legenda, e-mail, outreach, TAAFT ou anúncio.

**QUESTÃO PENDENTE / DESCONHECIDO:** quando o Google fará o novo rastreamento e se `#viralnow` ganhará posição ou clique. Medir somente após nova janela do Search Console; recrawl solicitado não será chamado de aquisição.

**PRÓXIMO DONO:** Codex segue aquisição/fluxo/assinaturas a partir da ponta atual de `origin/main`. Claude segue o incidente 402 e qualidade de render. Ambos devem executar `git fetch origin` antes de editar; esta seção é documentação da ação externa e não altera o produto.

## 20. Distribuição orgânica — recrawl único da comparação Synthesia (28/08/2026)

**BASE DE CÓDIGO:** `7375f4f971ca0021fe8ace4ba7c8af9732fef932`, igual a `origin/main` no início da ação; a mudança funcional da comparação é `772df7461af36a7cf49c89acd18695da79c56f29`.

**EVIDÊNCIA DE PRODUÇÃO QUE MOTIVOU A AÇÃO:** o relatório beta de recursos generativos de IA do Google Search Console, lido em 28/08/2026 para a janela 01/07–26/08/2026, atribuiu 4 das 35 impressões a `/alternatives/synthesia`, maior superfície editorial do relatório. A seção 18 prova que a resposta foi corrigida e publicada; faltava somente pedir ao Google uma releitura do HTML novo. Impressões não são pessoas, cliques, cadastros ou assinaturas.

**AÇÃO EXECUTADA / EVIDÊNCIA DE PRODUÇÃO (Google Search Console, 28/08/2026):** a inspeção confirmou para `https://www.usekineo.com/alternatives/synthesia` os estados `O URL está no Google`, `A página está indexada` e `A página é exibida por HTTPS`. Codex solicitou indexação uma única vez. O painel confirmou `Indexação solicitada` e informou que a URL entrou na fila de rastreamento prioritário e que reenviar não altera posição nem prioridade.

**DECISÃO DE FOCO BASEADA EM EVIDÊNCIA:** antes da ação, Codex voltou ao relatório web de 3 meses. `/free-script-generator` tinha 6 cliques, 64 impressões, CTR de 9,4% e posição média 62; o código já entrega valor sem cadastro e preserva o roteiro até o produto, então não foi alterado. `/alternatives` tinha 1 clique, 74 impressões, CTR de 1,4% e posição 50,1; a consulta `crayo ai alternatives` tinha 10 impressões, zero clique e posição 81,2. Reescrever essas duas superfícies agora seria otimizar páginas longe do resultado e arriscar a melhor porta já medida. Os números são do Search Console, janela 01/07–26/08/2026, lidos em 28/08/2026.

**ESCOPO E LIMITE DA PROVA:** nenhuma segunda solicitação, nova URL, sitemap inteiro, evento, campanha ou edição funcional foi criada. Recrawl solicitado não garante data de rastreamento, posição, impressão, clique, cadastro, checkout ou assinatura e não será chamado de aquisição concluída. Não repetir agora.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. Esta ação não acessou Supabase, Storage, banco, migration, autenticação ou render. Os `402` continuam classificados como indisponibilidade de capacidade, nunca abandono voluntário.

**NÃO TOCADO:** código funcional, UI, copy, preço, oferta, grant, checkout, analytics, Supabase, Storage, render, motor, cena, legenda, e-mail, outreach, TAAFT ou anúncio.

**QUESTÃO PENDENTE / DESCONHECIDO:** quando o Google fará a nova leitura e se a comparação receberá novas impressões, cliques ou pessoas. Medir somente em janela posterior; não repetir a solicitação.

**PRÓXIMO DONO:** Codex continua aquisição/fluxo/assinaturas a partir de `7375f4f` ou da ponta posterior de `origin/main`. Claude continua o incidente 402 e qualidade de render. Ambos devem executar `git fetch origin` antes de editar; a comparação Synthesia e seu recrawl já têm dono e evidência.

## 21. Distribuição ChatGPT/Bing — lote IndexNow mínimo e verdade da Rewardful (28/08/2026)

**BASE DE CÓDIGO:** `4318313d4eecdbbefa2d898d86d4769bf562daa7`, igual a `origin/main` no início da ação.

**FATO CONFIRMADO / PROTOCOLO:** `lib/indexnow.ts:35-49` declara o host canônico `www.usekineo.com`, o endpoint público do IndexNow e a chave publicada na raiz. Em 28/08/2026, um GET sem JavaScript para `https://www.usekineo.com/8ee9f362d6ec4042b723993c3e15936b.txt` respondeu `200` e o conteúdo correspondeu à chave declarada. A documentação oficial `https://www.indexnow.org/documentation` diz que um POST em lote pode conter até 10.000 URLs e que HTTP 200 prova somente que o mecanismo recebeu o conjunto — não que indexou ou ranqueou.

**AÇÃO EXECUTADA / EVIDÊNCIA DE PRODUÇÃO:** em `2026-08-29T00:05:01.6196776Z` (`28/08/2026 21:05:01 BRT`), Codex submeteu somente seis URLs públicas alteradas nesta rodada ao endpoint `https://api.indexnow.org/indexnow`. A resposta foi HTTP `200`: `/scripts/space`, `/alternatives/invideo`, `/real-estate-video-maker`, `/pricing`, `/viral-now` e `/alternatives/synthesia`.

**ESCOPO CONTROLADO:** não foi executado `scripts/submit-indexnow.mjs`, não foi buscado `sitemap.xml` ou `video-sitemap.xml`, e nenhuma rota que enumera vídeos foi chamada. O lote não contém `/v/...`, página autenticada, URL de cliente ou query string. Não reenviar agora; cada URL entrou porque seu HTML público mudou depois do último lote amplo registrado.

**FATO CONFIRMADO / AFILIADOS:** o Gmail contém uma confirmação da Rewardful datada de 28/07/2026 informando cancelamento da assinatura. A documentação oficial da Rewardful (`https://help.rewardful.com/en/articles/11623453-how-to-cancel-your-rewardful-subscription`) afirma que, depois do fim do ciclo, links, integrações e rastreamento de comissão deixam de funcionar. O código ainda carrega `rw.js` e aceita `rewardful_referral` como fallback (`app/layout.tsx:197-218`; `app/api/stripe/checkout/route.ts:1746-1758`), portanto esse fallback não deve ser chamado de operacional sem reativação comprovada.

**FATO CONFIRMADO / LIMITE DO ACHADO:** ColorMango e ToolRiot não dependem desse fallback nas mensagens enviadas. Os e-mails de 03/08/2026 entregaram links do sistema próprio `https://www.usekineo.com/a/<código>`, cuja implementação está em `app/a/[code]/route.ts`. Portanto o cancelamento da Rewardful não prova que o programa próprio está quebrado. Também não há prova de que TopAI.tools tenha promessa de comissão: o Search Console apenas mostrou URLs antigas com `?via=topaitools` e o Gmail mostrou uma confirmação de listing, não um contrato de afiliado.

**DECISÃO OPERACIONAL:** nenhuma nova mensagem foi enviada a creators, diretórios ou empresas enquanto o incidente `402` de capacidade está aberto. ColorMango e ToolRiot já receberam múltiplos contatos em 03, 04, 21 e 24/08; novo follow-up agora seria duplicação, não distribuição. O próximo outreach deve usar somente `/a/<código>` ou `/affiliate`, nunca depender de `?via=` até a Rewardful ser removida, reativada ou migrada com prova.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. A submissão IndexNow e a auditoria de Gmail/código não consultaram Supabase, Storage, banco, migration, autenticação ou render. Os `402` continuam classificados como indisponibilidade de capacidade, nunca abandono voluntário.

**QUESTÃO PENDENTE / DESCONHECIDO:** se ainda existe algum parceiro real divulgando `?via=...` com comissão prometida. Isso exige reconciliar a exportação histórica da Rewardful com a tabela do sistema próprio depois que o incidente de capacidade for encerrado. Não inferir de parâmetros indexados pelo Google.

**NÃO TOCADO:** código funcional, UI, preço, oferta, checkout, Supabase, Storage, migration, render, motor, cena, legenda, e-mail enviado, anúncio ou dados de cliente.

**PRÓXIMO DONO:** Codex continua aquisição/fluxo/assinaturas a partir de `4318313` ou da ponta posterior de `origin/main`. Claude continua o incidente `402`. Depois da normalização, reconciliar legacy Rewardful → sistema próprio é uma tarefa conjunta de Growth/Data, não uma mudança cega no checkout.

## 22. Aquisição orgânica — hub dos sete free tools (28/08/2026)

**BASE DE CÓDIGO:** `2c390623`, igual a `origin/main` no início da worktree isolada `codex/growth-free-tools-hub`.

**FATO CONFIRMADO / PADRÃO COMPETITIVO (consultado em 28/08/2026):** CapCut mantém uma coleção pública de ferramentas em `https://www.capcut.com/tools`; InVideo mantém uma porta pública específica em `https://invideo.io/tools/script-generator/`. O padrão útil observado é agregar intenções pequenas e gratuitas em superfícies públicas que devolvem valor antes da conta — não copiar promessa, preço ou interface do concorrente.

**FATO CONFIRMADO / INVENTÁRIO REAL:** `lib/kineoFacts.ts:718` já declarava sete ferramentas públicas que não exigem conta, e-mail ou cartão e retornam texto ou planejamento: script, hooks, viral score, comentário para vídeo, roteiro de produto, plano de conteúdo empresarial e calculadora de receita de Shorts. Antes deste commit não existia `/tools`; a descoberta dependia de páginas isoladas.

**IMPLEMENTADO:** commit funcional `47b7425d89396d8ae8a96543b7de9b3f385ad5f7` cria `app/tools/page.tsx:150` usando `FREE_TOOL_FACTS` como fonte canônica; destaca o gerador de roteiro como primeira ação e distribui para as outras seis. A página diz explicitamente que as ferramentas gratuitas entregam texto ou planejamento, enquanto o vídeo pronto exige conta; não promete render gratuito. Também adiciona o link `All free tools` ao footer, `/tools` ao sitemap (`app/sitemap.ts:66`) e a coleção ao `llms.txt` (`app/llms.txt/route.ts:331,339-341`). Nenhum preço, grant ou promessa comercial foi duplicado em literal.

**TESTADO LOCALMENTE:** as oito páginas (`/tools` + sete destinos) responderam HTTP 200. O hub apresentou sete cards, canonical `https://www.usekineo.com/tools`, primeiro card `I need the complete script`, links exatos para os sete destinos e zero erro/aviso no console. Em 1440 px e 390 px não houve overflow horizontal; no mobile o grid ficou em uma coluna. `npx tsc --noEmit --pretty false --incremental false` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo. `git diff --check` limpo.

**COMPARAÇÃO VISUAL:** `docs/previews/FREE-TOOLS-HUB-2026-08-29.html` contém o preview autocontido. As evidências renderizadas estão em `docs/previews/FREE-TOOLS-HUB-DESKTOP-2026-08-29.jpg` e `docs/previews/FREE-TOOLS-HUB-MOBILE-2026-08-29.jpg`.

**VALIDADO EM PRODUÇÃO (28/08/2026):** `origin/main` e a worktree apontam para `47b7425d89396d8ae8a96543b7de9b3f385ad5f7`. O deploy Vercel `dpl_72MuHQE3Am3iqA2GnTVezjzMpdxD` chegou a `READY`, target production e alias `www.usekineo.com`. O browser abriu `https://www.usekineo.com/tools` com o title, H1, canonical, sete cards, sete hrefs e footer corretos, sem overflow e sem erro/aviso no console. Leituras HTTP independentes confirmaram `/tools` presente em `sitemap.xml` e `[Free tools](https://www.usekineo.com/tools)` presente em `llms.txt`.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** o Supabase atingiu o limite contratado de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. Esta entrega não consultou nem escreveu Supabase, Storage, Auth, migration, render, crédito ou evento. O `402` permanece classificado como incidente de capacidade e não como abandono voluntário. Não declarar que os renders estão perfeitos.

**DECISÃO OPERACIONAL DE CONTENÇÃO:** nenhuma submissão IndexNow, recrawl, e-mail, outreach, anúncio ou outra injeção de tráfego foi executada para o hub enquanto o incidente de capacidade está aberto. O ativo está público e descobrível pelo sitemap/`llms.txt`, mas distribuição ativa fica condicionada à normalização confirmada pelo dono do incidente.

**QUESTÃO PENDENTE / DESCONHECIDO:** o hub ainda não tem evidência de impressão, clique, pessoa, cadastro, checkout ou assinatura. Publicação e descoberta técnica foram provadas; aquisição só poderá ser atribuída em janela posterior, excluindo contas internas e contando pessoas, não eventos.

**NÃO TOCADO:** Supabase, Storage, Auth, migration, banco, render, motor, cena, legenda, preço, grant, checkout, evento, e-mail, outreach, anúncio ou vídeo de cliente.

**PRÓXIMO DONO:** Claude continua o incidente `402` e qualidade do pipeline. Codex continua aquisição/fluxo/assinaturas sem gerar carga no pipeline até a capacidade voltar. Ambos devem executar `git fetch origin` antes de criar nova worktree; não reconstruir o hub nem duplicar as sete promessas fora de `FREE_TOOL_FACTS`.

## 23. Fluxo orgânico — hub Free tools na navegação pública (28/08/2026)

**BASE DE CÓDIGO:** `83fd82ae37d25848f3df8067b5e78426168b4540`, igual a `origin/main` no início da worktree isolada `codex/growth-tools-nav`.

**FATO CONFIRMADO / GARGALO:** o hub `/tools` da seção 22 já estava no sitemap, `llms.txt` e rodapé, mas não aparecia na navegação principal da home. O visitante que chegava pela principal superfície pública via `Explore`, `Arena`, categorias de criação, `Avatar` e `Pricing`, mas não recebia a porta agregadora das sete ferramentas gratuitas antes do cadastro.

**IMPLEMENTADO:** commit funcional `7a71abdd185c897a38f12e8727b86c35779e1f01` adiciona `Free tools` à navegação pública desktop (`app/KineoLanding.tsx:856`) e ao menu público mobile (`app/KineoLanding.tsx:960`). Como o oitavo destino encostava nos elementos vizinhos em 800–881 px, o menu compacto passa a entrar em até 940 px (`app/KineoLanding.tsx:454`); em 941 px o teste mediu 16,3 px de folga de cada lado, sem colisão. A navegação autenticada `components/MobileNav.tsx` foi inspecionada e deliberadamente não mudou: ela já é uma barra operacional cheia e não é a superfície de aquisição desta entrega.

**TESTADO LOCALMENTE:** exatamente dois links `/tools` foram encontrados na home. O clique real do menu navegou para `http://localhost:3011/tools`, title `Free YouTube Shorts Tools — No Signup or Card | Kineo`, H1 `Do the next useful thing for your Short.` e zero erro de console. Em 1440 × 900 a navegação desktop ficou legível; em 390 × 844 o menu abriu, exibiu `Free tools` na segunda posição e manteve os demais destinos. Em 940 px entrou a navegação compacta; em 941 px o desktop ficou sem colisão. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit --pretty false` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/FREE-TOOLS-NAV-2026-08-29.html` contém antes/depois autocontido. As capturas do produto real estão em `docs/previews/FREE-TOOLS-NAV-DESKTOP-2026-08-29.jpg` e `docs/previews/FREE-TOOLS-NAV-MOBILE-2026-08-29.jpg`.

**DEPLOY VALIDADO (28/08/2026):** deploy Vercel `dpl_7GhAuKqDEMMiwTqwiQP8jAikvJ48` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato `7a71abd`. A Vercel registrou zero erro de runtime agrupado para `/` nos 15 minutos consultados.

**QUESTÃO PENDENTE / DESCONHECIDO:** a home de produção não foi aberta pelo Codex depois do deploy. A rota pública consulta a autenticação existente e o fundador informou que Supabase está no limite de capacidade; para não gerar acesso adicional durante o incidente, a validação de conteúdo ficou no ambiente local e a validação de publicação ficou no deploy. Assim, a classificação honesta é **IMPLEMENTADO, TESTADO LOCALMENTE E DEPLOY VALIDADO**, não clique end-to-end validado em produção.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** Supabase atingiu o limite máximo de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. Codex não consultou nem escreveu em Supabase, Storage, Auth, migration, banco, render, crédito ou evento nesta entrega. `402` continua classificado como indisponibilidade de capacidade, nunca abandono voluntário.

**QUESTÃO PENDENTE / DESCONHECIDO:** nenhum clique, pessoa, cadastro, checkout ou assinatura foi atribuído ao novo link. Depois da normalização da capacidade, medir pessoas que entram por `/tools` e seguem para os destinos/CTAs existentes; publicação não será chamada de aquisição.

**NÃO TOCADO:** cards e vídeos da home, ordem dos motores, `GenerateClient.tsx`, Supabase, Storage, Auth, migration, banco, render, motor, cena, legenda, preço, grant, oferta, checkout, evento, e-mail, outreach, IndexNow, TAAFT ou anúncio.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `7a71abd` ou da ponta posterior de `origin/main`; não reconstruir a navegação do hub. Codex continua aquisição/fluxo/assinaturas sem ampliar tráfego ativo enquanto o incidente `402` estiver aberto.

## 24. Aquisição orgânica — YouTube Shorts Publishing Kit gratuito (28/08/2026)

**BASE DE CÓDIGO:** `21fa1ac8de0f00100047498e1cf03f7d580f2c15`, igual a `origin/main` no início da worktree isolada `codex/growth-publish-kit`.

**FATO CONFIRMADO / PADRÃO COMPETITIVO (consultado em 28/08/2026):** InVideo mantém um hub público em `https://invideo.io/tools/`; OpusClip lista gerador de hashtags para YouTube em `https://www.opus.pro/tools`; CapCut mantém superfícies públicas de geração de títulos e criação de Shorts em `https://www.capcut.com/tools`. O padrão aproveitado foi devolver um artefato útil antes da conta. Não foram copiados interface, promessa, preço ou texto.

**FATO CONFIRMADO / ANTI-DUPLICAÇÃO:** uma busca em `app/`, `components/` e `lib/` não encontrou gerador Kineo de título, descrição, hashtags ou publishing kit. O hub já tinha roteiro, hook, viral score, comentário, produto, plano empresarial e calculadora, mas nenhuma ferramenta para o trabalho imediatamente anterior à publicação. A página `/ai-shorts-without-filming`, que tinha 1 clique, 26 impressões e posição média 9,5 no Search Console na janela lida em 28/08/2026, já continha H1, formulário, prova, FAQ e CTA; ela não foi reescrita sem defeito provado. Impressões e cliques não são pessoas nem assinaturas.

**IMPLEMENTADO:** commit funcional `f1ecc845c7331ea15669de09918e03caba498b4c` publica `/youtube-shorts-title-generator`. O algoritmo local gera 10 títulos em quatro tons, corta cada opção em 72 caracteres, cria descrição editável e até 10 hashtags de tema, nicho e plataforma (`lib/growth/shortsPublishKit.ts:16-166`). O cliente permite escolher título e copiar cada bloco; o tema segue para `/signup` com `create_intent=fast` e campanha `growth_publish_kit_20260828`, sem iniciar render (`app/youtube-shorts-title-generator/PublishKitClient.tsx:12-190`). A página é estática, tem canonical, metadata, `FAQPage` e `WebApplication` (`app/youtube-shorts-title-generator/page.tsx:7-145`).

**FATO CONFIRMADO / DESCOBERTA:** a ferramenta entrou na fonte canônica `FREE_TOOL_FACTS` (`lib/kineoFacts.ts:768-778`), no hub com contagem derivada (`app/tools/page.tsx:12-105`), no footer (`components/Footer.tsx:147`), no sitemap (`app/sitemap.ts:72`) e no `llms.txt` (`app/llms.txt/route.ts:331` e lista gerada). Não existe literal novo de preço, grant ou oferta.

**TESTADO LOCALMENTE:** a função compilada e executada passou nos quatro tons: 10 títulos, 10 únicos, máximo de 72 caracteres, takeaway preservado e no máximo 10 hashtags. No navegador, o exemplo Flight 19 gerou 10 opções, descrição, hashtags, seleção alternativa e CTA com tema/UTMs; `/tools` mostrou 8 ferramentas e o novo card; sitemap e `llms.txt` contêm a URL. Desktop e mobile de 390 px tiveram zero overflow. A busca por `fetch(`, `trackEvent`, `supabase` e `render` nos arquivos executáveis da ferramenta retornou zero ocorrência. `git diff --check` ficou limpo. `npx tsc --noEmit --pretty false` mostrou somente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/YOUTUBE-SHORTS-PUBLISH-KIT-2026-08-28.html` contém o antes/depois autocontido. As capturas do produto real estão em `docs/previews/YOUTUBE-SHORTS-PUBLISH-KIT-DESKTOP-2026-08-28.jpg` e `docs/previews/YOUTUBE-SHORTS-PUBLISH-KIT-MOBILE-2026-08-28.jpg`.

**VALIDADO EM PRODUÇÃO (28/08/2026):** deploy Vercel `dpl_DescUVMz8rGjAPsAPrHNzwx1GW9b` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato. O browser abriu a URL pública com title, H1 e canonical corretos; o exemplo gerou 10 títulos únicos, máximo de 60 caracteres nessa entrada, 8 hashtags e o CTA preservou tema, intenção e campanha. `/tools` mostrou 8 ferramentas e o novo card. A Vercel registrou zero erro de runtime em `/youtube-shorts-title-generator` e `/tools` nos 15 minutos consultados.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** o Supabase atingiu o limite máximo de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. Esta entrega não consultou nem escreveu Supabase, Storage, Auth, migration, banco, evento, crédito ou render. A ferramenta é browser-only. `402` continua classificado como indisponibilidade de capacidade, nunca abandono voluntário; não declarar que renders estão perfeitos.

**DECISÃO OPERACIONAL DE CONTENÇÃO:** nenhuma submissão IndexNow, recrawl, e-mail, outreach, anúncio, TAAFT ou outra ampliação ativa de tráfego foi executada. A URL ficou tecnicamente descobrível pelo sitemap, hub, footer e `llms.txt`; distribuição ativa aguarda normalização confirmada da capacidade.

**QUESTÃO PENDENTE / DESCONHECIDO:** a nova ferramenta ainda não tem evidência de impressão, clique, pessoa, cadastro, checkout ou assinatura. Como nenhum evento foi adicionado durante o incidente, a primeira medição segura será por Search Console e pelas campanhas já transportadas no cadastro após a normalização, sempre contando pessoas e excluindo contas internas. Publicação não será chamada de aquisição.

**NÃO TOCADO:** cards ou vídeos da home, ordem de motores, `GenerateClient.tsx`, Supabase, Storage, Auth, migration, banco, render, motor, cena, legenda, preço, grant, oferta, checkout, e-mail, outreach, IndexNow, TAAFT ou anúncio.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `f1ecc845` ou da ponta posterior de `origin/main`; não reconstruir a ferramenta nem adicionar telemetria enquanto o incidente estiver aberto. Claude continua capacidade/render. Codex continua aquisição/fluxo/assinaturas com ativos estáticos e sem ampliar carga no pipeline.

## 25. Aquisição orgânica — YouTube Shorts Script Timer (28/08/2026)

**BASE DE CÓDIGO:** `4a86e625154b1dadb0d5110336445b82033439c9`, igual a `origin/main` no início da worktree isolada `codex/growth-script-timer`.

**FATO CONFIRMADO / ANTI-DUPLICAÇÃO:** busca em `app/`, `components/` e `lib/` não encontrou página pública Kineo de script timer, words-to-time ou contador de duração falada. A Kineo já tinha gerador de roteiro, gerador de hook e o guard privado de narração, mas nenhum destino público que aplicasse a régua ao roteiro pronto antes da conta.

**FATO CONFIRMADO / PADRÃO COMPETITIVO (consultado em 28/08/2026):** FlowPrompter (`flowprompter.app/tools/video-script-timer`), Playcut (`playcut.ai/tools/video-script-timer`) e Faceless (`faceless.so/tools/script-timer`) mantêm timers públicos baseados em palavras por minuto. O YouTube Help confirma que uploads quadrados ou verticais de até três minutos podem ser classificados como Shorts. A oportunidade escolhida não copia interface ou texto: diferencia a Kineo removendo marcadores e notas de produção antes da conta, pela mesma régua do fluxo verbatim.

**IMPLEMENTADO:** commit funcional `4b06baf951d357ae8c75bc9edbf7ff91f6568f68` publica `/youtube-shorts-script-timer`. `lib/growth/shortsScriptTimer.ts:4-74` usa `parseUserScript`, `narrationFit`, `MIN_COVERAGE` e `WORDS_PER_SECOND` canônicos; os únicos alvos públicos são 35s e 60s. O cliente calcula ao vivo, mostra fala estimada, palavras faladas, piso seguro, cobertura, instruções ignoradas e o texto que conta como narração (`app/youtube-shorts-script-timer/ScriptTimerClient.tsx:33-174`). O CTA transporta roteiro limitado a 1.000 caracteres, `script_mode=verbatim`, duração e campanha `growth_script_timer_20260828` pela infraestrutura existente; não inicia render.

**FATO CONFIRMADO / DESCOBERTA:** a ferramenta entrou em `FREE_TOOL_FACTS` (`lib/kineoFacts.ts:780-789`), no hub como nono card (`app/tools/page.tsx:48-53,84`), no footer (`components/Footer.tsx:148`), no sitemap (`app/sitemap.ts:73`) e, por derivação canônica, no `llms.txt`. A própria página cita a fonte oficial do limite do YouTube (`app/youtube-shorts-script-timer/page.tsx:159`). Não existe literal novo de preço, crédito, grant ou oferta.

**TESTADO LOCALMENTE:** `node scripts/test-shorts-script-timer.mjs` executou 19/19 verificações. A fronteira canônica foi exercitada: 131 palavras → `short`, faltando 1 e cobertura 94,9%; 132 → `on_target`, cobertura 95,7%. HOOK, PAYOFF e `[Pexels: ...]` não contam como fala; entrada só com diretivas vira `no_narration`; roteiro materialmente longo tem estado próprio. Browser confirmou CTA com roteiro, `verbatim`, duração e campanha; `/tools` mostrou 9 cards. Em 1440 × 900 e 390 × 844 não houve overflow horizontal. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit --pretty false --incremental false` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/YOUTUBE-SHORTS-SCRIPT-TIMER-2026-08-28.html` contém o antes/depois autocontido. As capturas do produto real estão em `docs/previews/YOUTUBE-SHORTS-SCRIPT-TIMER-DESKTOP-2026-08-28.png` e `docs/previews/YOUTUBE-SHORTS-SCRIPT-TIMER-MOBILE-2026-08-28.png`.

**VALIDADO EM PRODUÇÃO (28/08/2026):** deploy Vercel `dpl_HXgAAAJ9bkuGV5Cb3VZZR5uvo9v2` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato. Leitura HTTP sem executar JavaScript confirmou status 200, title, H1, canonical, FAQ, `WebApplication`, fonte oficial e copy browser-based. `/tools` contém o novo card; `sitemap.xml` e `llms.txt` contêm a URL e o `llms.txt` declara 9 ferramentas. A Vercel registrou zero erro de runtime agrupado em `/youtube-shorts-script-timer` e `/tools` nos 15 minutos consultados.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** Supabase atingiu o limite máximo de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. `402` permanece classificado como indisponibilidade de capacidade, nunca abandono voluntário; não declarar que renders estão perfeitos.

**CONTRADIÇÃO OPERACIONAL DESCOBERTA:** embora o cálculo e os arquivos executáveis da ferramenta não contenham `fetch`, Supabase, evento, API ou render, o `app/layout.tsx` global monta `SourceCapture` e `CheckoutResumeBanner`, e o footer padrão monta `LiveStatsBadge`. Durante a validação local, o servidor registrou `POST /api/events`, `GET /api/stripe/checkout/resume` e `GET /api/stats/public`. O footer desta nova página passou a usar `showStats={false}`, eliminando a chamada própria do badge, e o servidor local foi encerrado assim que a borda foi identificada. **DESCONHECIDO:** se os `POST /api/events` locais chegaram ao banco de produção; não foi feita consulta Supabase para conferir durante o incidente. Portanto a afirmação correta é “o roteiro não é enviado enquanto a pessoa calcula e não há chamada de IA”, não “a página inteira faz zero chamada”.

**DECISÃO OPERACIONAL DE CONTENÇÃO:** nenhuma submissão IndexNow, recrawl, e-mail, outreach, anúncio, TAAFT ou ampliação ativa de tráfego foi executada. A URL está tecnicamente pública e descobrível pelas superfícies canônicas; distribuição ativa aguarda normalização confirmada da capacidade.

**QUESTÃO PENDENTE / DESCONHECIDO:** a ferramenta ainda não tem evidência de impressão, clique, pessoa, cadastro, checkout ou assinatura. Publicação não será chamada de aquisição. Depois da normalização, medir pessoas que chegam à URL e atravessam a campanha `growth_script_timer_20260828`, excluindo contas internas e sem contar eventos como pessoas.

**NÃO TOCADO:** pipeline de render, motor, cena, legenda, Storage, migration, schema, Auth, preço, grant, oferta, checkout, e-mail, outreach, IndexNow, TAAFT, anúncio ou vídeo de cliente.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `4b06baf` ou da ponta posterior de `origin/main`; não reconstruir o timer. Claude continua capacidade/render. Codex continua aquisição/fluxo/assinaturas, sem amplificar tráfego ativo enquanto a capacidade não for normalizada.

## 26. Fluxo de comparação — escolha pelo trabalho antes da marca (28/08/2026)

**FATO CONFIRMADO / IMPLEMENTADO.** Commit funcional `760e748`.

- O hub `/alternatives` exibia primeiro uma CTA genérica e depois uma grade com 27 marcas. A pessoa precisava conhecer o mercado antes de descobrir qual classe de produto resolvia o trabalho dela (`app/alternatives/page.tsx`, versão anterior a `760e748`).
- A página agora começa a decisão pelo material que a pessoa já tem: ideia/roteiro, vídeo longo, apresentador ou gravação. Só o primeiro estado declara Kineo como melhor encaixe; clipping, avatar e edição de gravação apontam honestamente para as comparações com OpusClip, HeyGen/Synthesia e Descript (`lib/growth/alternativeJobChooser.ts`; `app/alternatives/page.tsx`).
- As categorias concorrentes foram verificadas em 28/08/2026 nas páginas oficiais: OpusClip descreve vídeo longo → clips; HeyGen descreve avatar/presenter; Synthesia descreve treinamento com avatar; Descript descreve gravação, transcrição e edição por texto. Cada card expõe a fonte oficial, não uma alegação sem prova.
- O CTA Kineo do hero, do card de encaixe e do fechamento agora usa o contrato bounded `buildBlankStudioSignupHref`. Ele preserva `utm_source=alternatives`, `utm_medium=organic`, campanha `alternatives_job_chooser_20260828` e `redirect=/studio?engine=fast...`; não envia `create_intent` sem uma ideia real (`lib/growth/alternativeJobChooser.ts`; `lib/growth/publicCreationIntent.ts`).
- O seletor é server-rendered e estático. Ele não adiciona `fetch`, chamada de IA, chamada de render, leitura/escrita no Supabase ou evento de analytics próprio. Os links Kineo mantêm o `OrganicCtaLink` já existente; nenhum tráfego foi disparado.
- **TESTADO LOCALMENTE:** `node scripts/test-alternatives-job-chooser.mjs` → `24/24`; TypeScript → somente os quatro erros de baseline; `git diff --check` limpo.
- Previews obrigatórios: `docs/previews/ALTERNATIVES-JOB-CHOOSER-2026-08-28.html`, `docs/previews/ALTERNATIVES-JOB-CHOOSER-2026-08-28.png` e `docs/previews/ALTERNATIVES-JOB-CHOOSER-MOBILE-2026-08-28.png`.
- **VALIDADO EM PRODUÇÃO (28/08/2026):** deploy Vercel `dpl_4HAyWR7gx4mSUGNP5mMqZ3iscfy6` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA `0bfbe8fd59934a2d3cdc4247ea218bc4215b0dd1`. Leitura HTTP sem executar JavaScript respondeu 200/`PRERENDER` e confirmou H1 do seletor, quatro estados de trabalho, fontes oficiais e o CTA com `redirect=/studio?engine=fast`, campanha preservada e zero `create_intent`. A Vercel registrou zero erro de runtime em `/alternatives` nos 15 minutos consultados.
- **DECISÃO APROVADA / BLOQUEIO OPERACIONAL:** o incidente de capacidade reportado pelo fundador em 28/08/2026 continua governando a distribuição. Não houve IndexNow, recrawl, outreach, mídia paga, relançamento em diretório ou outra amplificação.

## 27. Fluxo orgânico — intenção de produto preservada depois do cadastro (28/08/2026)

**BASE DE CÓDIGO:** `4bcf11e5eda8651abce57ac2caea2a731da4606c`, igual a `origin/main` no início da worktree isolada `codex/growth-product-intent`.

**FATO CONFIRMADO / GARGALO:** cinco páginas públicas de alta intenção enviavam seus CTAs para um cadastro genérico e, sem `redirect` explícito, o fluxo autenticado pousava na home/painel: `/ai-image-generator`, `/ai-voice-generator`, `/ai-video-generator`, `/ai-video-upscaler` e `/ai-video-with-talking-characters`. O produto prometido na página não sobrevivia à autenticação. A página de talking characters ainda dizia `Make one free`, embora o grant informado pelo produto seja 25 créditos e o custo canônico de MiniMax H3 por 60 segundos seja 45 créditos.

**IMPLEMENTADO:** commit funcional `0c80293` cria um mapa fechado de destinos em `lib/growth/productSurfaceIntent.ts`. Imagens seguem para `/images`; vozes para `/audio`; o hub de motores para `/studio?engine=fast`; upscaler para `/studio?engine=seedance`; talking characters para `/studio?engine=h3`. O helper preserva `utm_source`, `utm_medium=organic`, `utm_campaign` e `intent_campaign` dentro de tokens limitados, transporta o destino pelo `redirect` interno já validado em `lib/authRedirect.ts` e nunca aceita URL arbitrária nem envia `create_intent` sem trabalho da pessoa.

**FATO CONFIRMADO / VERDADE COMERCIAL:** `app/ai-video-with-talking-characters/page.tsx` agora deriva os custos de H3 e Kling 3 de `creditCostForDuration`, remove a promessa impossível de render gratuito e informa antes do cadastro que 25 créditos de trial não cobrem sozinhos um H3 de 60 segundos/45 créditos. Os CTAs abrem MiniMax H3 selecionado e a copy informa que o Studio exibe o custo antes da submissão. Nenhum preço, grant, SKU ou regra de cobrança foi alterado.

**TESTADO LOCALMENTE:** `node scripts/test-product-surface-intent.mjs` executou 48/48 verificações: os cinco destinos exatos, UTMs/campanhas, ausência de `create_intent`, uso do helper nas cinco páginas, remoção de `Make one free`, divulgação do gap 25→45 e custos derivados da fonte canônica. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit --pretty false --incremental --tsBuildInfoFile .tsbuildinfo-product-intent` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo e o artefato temporário foi removido.

**COMPARAÇÃO VISUAL:** `docs/previews/PRODUCT-SURFACE-INTENT-2026-08-28.html` contém antes/depois desktop e mobile. As capturas aprovadas estão em `docs/previews/PRODUCT-SURFACE-INTENT-DESKTOP-2026-08-28.png` e `docs/previews/PRODUCT-SURFACE-INTENT-MOBILE-2026-08-28.png`.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** Supabase atingiu o limite máximo de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. Esta entrega não consultou nem escreveu Supabase, Storage, Auth, migration, banco, evento, crédito ou render. `402` permanece classificado como indisponibilidade de capacidade, nunca abandono voluntário; não declarar que renders estão perfeitos.

**DECISÃO OPERACIONAL DE CONTENÇÃO:** nenhuma submissão IndexNow, recrawl, e-mail, outreach, anúncio, TAAFT ou ampliação ativa de tráfego foi executada. A mudança reduz perda de intenção no tráfego que já existe; distribuição ativa aguarda normalização confirmada da capacidade.

**VALIDADO EM PRODUÇÃO (28/08/2026):** deploy Vercel `dpl_5ZDb2M8J5GEmhcoPdcmQaXakCa3W` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA final `8b0c20bb388ca9cc7d2efda50bcd2123acf73761` e contendo o commit funcional `0c80293`. Leituras HTTP pela Vercel, sem executar JavaScript, responderam 200 nas cinco rotas e confirmaram os destinos serializados: imagens → `/images`, vozes → `/audio`, hub → Fast, upscaler → Seedance e talking characters → H3. A última rota também confirmou `Open MiniMax H3`, 25 créditos de trial, custo de 45 créditos, ausência de `Make one free` e cache `HIT`; as demais responderam `HIT` ou `PRERENDER`. A Vercel registrou zero erro de runtime agrupado nas cinco rotas nos 15 minutos consultados.

**QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe evidência de pessoa, cadastro, checkout ou assinatura adicional causada pela correção. Depois da normalização da capacidade, medir pessoas por campanha e destino preservado, excluindo contas internas e sem contar eventos como pessoas.

**NÃO TOCADO:** cards ou vídeos da home, pipeline de render, motor, cena, legenda, Supabase, Storage, Auth, migration, banco, preço, grant, oferta, SKU, checkout, e-mail, outreach, IndexNow, TAAFT ou anúncio.

**PRÓXIMO DONO:** Claude continua capacidade/render e deve executar `git fetch origin` antes de criar worktree. Codex continua aquisição/fluxo/assinaturas sem amplificar tráfego ativo enquanto a capacidade não for normalizada; não reconstruir estes cinco handoffs nem reintroduzir `Make one free` no H3.

## 28. Fluxo de cadastro — comprovante visual do produto escolhido (28/08/2026)

**BASE DE CÓDIGO:** `f74314187a78257224020820579a59e367d65d71`, igual a `origin/main` no início da worktree isolada `codex/growth-signup-destination-proof`.

**FATO CONFIRMADO / GARGALO:** a seção 27 fez o destino técnico sobreviver ao cadastro, mas `app/(auth)/signup/page.tsx` suprimia qualquer preview quando havia um `redirect` interno explícito. Assim, quem clicava em AI Images, AI Voice, Fast, Seedance ou MiniMax H3 via novamente o título genérico `Create your AI Short` sem confirmação de que a escolha estava salva. Checkout precisa dessa supressão; os cinco handoffs de produto não.

**IMPLEMENTADO:** commit funcional `a2c59c7e94ef7126a8dd368fd622b0f6bdf6cc88` cria `lib/growth/signupProductDestinationPreview.ts` e liga o contrato à tela real de cadastro. O preview reconhece somente os cinco destinos da fonte `PRODUCT_SURFACE_DESTINATIONS`, depois de `normalizeInternalRedirect`; checkout, afiliado, URL externa, motor desconhecido e parâmetro extra continuam genéricos. Para os cinco casos, o H1 e um card antes dos métodos de autenticação nomeiam a ferramenta/motor, explicam o pouso pós-login e afirmam que nada começa automaticamente. A confirmação por e-mail repete o destino salvo.

**FATO CONFIRMADO / PRIORIDADES PRESERVADAS:** `reason=checkout` continua com precedência absoluta e nunca recebe o card de produto. O preview existente de ideia/roteiro permanece vivo para handoffs sem redirect. O card renderiza somente strings fixas do código, sem HTML do visitante, URL crua ou promessa financeira nova.

**TESTADO LOCALMENTE:** `node scripts/test-signup-product-destination.mjs` executou 60/60 verificações; `node scripts/test-product-surface-intent.mjs` manteve 48/48. A suite cobre os cinco rótulos/destinos, ausência de início automático, 14 rejeições fail-closed, precedência do checkout, posição antes do Google, confirmação por e-mail e ausência de Supabase/fetch/API no helper. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit --pretty false --incremental --tsBuildInfoFile .tsbuildinfo-signup-destination` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo e o artefato temporário foi removido.

**COMPARAÇÃO VISUAL:** `docs/previews/SIGNUP-PRODUCT-DESTINATION-2026-08-28.html` contém antes/depois desktop e mobile. As capturas aprovadas estão em `docs/previews/SIGNUP-PRODUCT-DESTINATION-DESKTOP-2026-08-28.png` e `docs/previews/SIGNUP-PRODUCT-DESTINATION-MOBILE-2026-08-28.png`.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** Supabase atingiu o limite máximo de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. O teste e o preview são locais/estáticos. Codex não chamou Supabase, Storage, backend de Auth, migration, banco, evento, crédito ou render. `402` permanece indisponibilidade de capacidade, nunca abandono voluntário; não declarar que renders estão perfeitos.

**DECISÃO OPERACIONAL DE CONTENÇÃO:** nenhuma submissão IndexNow, recrawl, e-mail, outreach, anúncio, TAAFT ou ampliação ativa de tráfego foi executada. A entrega melhora somente o tráfego existente.

**DEPLOY VALIDADO (28/08/2026):** deploy Vercel `dpl_DJCK7rV7iwHU9Kp2AXrDe2SXqdEJ` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA final `7d81624cbb085e6a266c1774b399701733975956` e contendo o commit funcional `a2c59c7`. Leitura HTTP sem JavaScript da URL de signup H3 respondeu 200, `x-matched-path: /signup`, cache `HIT` e assets do deploy correto. Como a página lê a query depois da hidratação, o HTML inicial permanece genérico por desenho; o chunk publicado `app/(auth)/signup/page-792b57654b13100f.js` respondeu 200 e contém os contratos H3, Image, Voice, `Nothing starts automatically`, precedência do checkout e leitura de redirect. A Vercel registrou zero erro de runtime agrupado em `/signup` nos 15 minutos consultados. Isto prova publicação do código e ausência de erro de runtime observado, não clique end-to-end autenticado.

**QUESTÃO PENDENTE / DESCONHECIDO:** o browser real de produção não foi usado para atravessar o cadastro porque isso executaria Auth/eventos durante o incidente. Até esse smoke seguro, a classificação correta é implementado e testado localmente, não conversão validada. Também não existe evidência de pessoa, cadastro, checkout ou assinatura adicional causada pelo card.

**NÃO TOCADO:** backend de Auth, checkout, preço, grant, oferta, SKU, cards/vídeos da home, pipeline de render, motor, cena, legenda, Supabase, Storage, migration, banco, e-mail, outreach, IndexNow, TAAFT ou anúncio.

**PRÓXIMO DONO:** Claude continua capacidade/render e deve executar `git fetch origin` antes de nova worktree. Codex continua aquisição/fluxo/assinaturas. Não transformar redirect arbitrário em copy de produto e não remover a precedência do checkout.

## 29. Fluxo de cadastro — confirmação para todos os motores públicos (28/08/2026)

**BASE DE CÓDIGO:** `99c4fd93d396bb09d9d77bde46a010ee4794e3bf`, igual a `origin/main` no início da worktree isolada `codex/growth-engine-signup-proof`.

**FATO CONFIRMADO / GARGALO:** as páginas públicas de motor suportam sete destinos canônicos em `lib/growth/engineLandingIntent.ts`, mas o comprovante visual criado na seção 28 reconhecia somente Fast, Seedance e MiniMax H3. Quem escolhia Kling 2.5, Veo 3.1, Kling 3 ou Omni Flash chegava ao cadastro genérico, embora o redirect técnico preservasse corretamente o motor. Era uma quebra de continuidade na etapa anterior à conta, não um defeito de render.

**IMPLEMENTADO:** `ENGINE_LANDING_LABELS` passa a morar junto do enum canônico dos sete motores em `lib/growth/engineLandingIntent.ts`. `lib/growth/signupProductDestinationPreview.ts` usa essa mesma fonte para nomear Kineo 1, Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3 e Omni Flash no cadastro. O card informa que o custo aparecerá antes da submissão e que nada começa automaticamente. Imagem e voz continuam reconhecidas pela fonte `PRODUCT_SURFACE_DESTINATIONS`; checkout continua com precedência na tela real.

**FATO CONFIRMADO / FAIL-CLOSED:** o parser aceita somente redirects internos normalizados. Em `/studio`, aceita apenas uma ocorrência de `engine` e a campanha opcional; motor desconhecido, parâmetro extra ou engine duplicado voltam ao cadastro genérico. Nas demais ferramentas, somente a campanha opcional é aceita. Nenhum texto, URL ou rótulo fornecido pelo visitante é renderizado no comprovante.

**TESTADO LOCALMENTE:** `node scripts/test-signup-product-destination.mjs` executou 109/109 verificações e percorreu o href real de cada uma das sete landing pages até o preview do cadastro, comparando o rótulo com o nome público do motor. `node scripts/test-product-surface-intent.mjs` manteve 48/48. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit --pretty false --incremental --tsBuildInfoFile .tsbuildinfo-engine-signup-proof` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo e o artefato temporário foi removido.

**COMPARAÇÃO VISUAL:** `docs/previews/SIGNUP-ALL-ENGINES-2026-08-28.html` contém antes/depois desktop e o estado mobile. As capturas aprovadas estão em `docs/previews/SIGNUP-ALL-ENGINES-DESKTOP-2026-08-28.png` e `docs/previews/SIGNUP-ALL-ENGINES-MOBILE-2026-08-28.png`.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026):** Supabase atingiu o limite máximo de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. Esta entrega não consultou nem escreveu Supabase, Storage, Auth, migration, banco, evento, crédito ou render. `402` permanece indisponibilidade de capacidade, nunca abandono voluntário; não declarar que renders estão perfeitos.

**DECISÃO OPERACIONAL DE CONTENÇÃO:** nenhuma submissão IndexNow, recrawl, e-mail, outreach, anúncio, TAAFT ou ampliação ativa de tráfego foi executada. A entrega reduz perda de intenção no tráfego existente.

**VALIDADO EM PRODUÇÃO (28/08/2026):** deploy Vercel `dpl_DqnHB6X5Uv4mXYZksCcqpqNAF3Zw` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional `d2dff9dc769eae1e14c30ee49259036637568528`. Leitura HTTP sem executar JavaScript da URL de signup com Veo 3.1 respondeu 200, `x-matched-path: /signup`, cache `HIT` e asset do deploy exato. O chunk publicado de signup respondeu 200 e contém os sete rótulos canônicos, `Nothing starts automatically` e a precedência de checkout. A Vercel registrou zero erro de runtime agrupado em `/signup` nos 15 minutos consultados. Isto prova publicação do código e ausência de erro observado, não um cadastro autenticado end-to-end.

**QUESTÃO PENDENTE / DESCONHECIDO:** não existe evidência de pessoa, cadastro, checkout ou assinatura adicional causada por esta ampliação. Um smoke autenticado continua adiado enquanto o incidente de capacidade estiver aberto.

**NÃO TOCADO:** backend de Auth, checkout, preço, grant, oferta, SKU, cards/vídeos da home, pipeline de render, motor, cena, legenda, Supabase, Storage, migration, banco, e-mail, outreach, IndexNow, TAAFT ou anúncio.

**PRÓXIMO DONO:** Claude continua capacidade/render. Depois do push, deve executar `git fetch origin` antes de nova worktree e não reconstruir este contrato. Codex continua aquisição/fluxo/assinaturas.

## 30. Fluxo B2B — briefing real de anúncio para negócio local (29/08/2026)

**BASE DE CÓDIGO:** `78ad68ae9b106dec93451c0c58be74401ab9ff61`, igual a `origin/main` no início da worktree isolada `codex/growth-local-business-brief`.

**EVIDÊNCIA DE PRODUÇÃO (fonte: `docs/SPRINT-2026-08-17-10H.md:190-199`, consulta registrada em 17/08/2026):** a coorte de negócio local/serviço tinha 27 pessoas, 22,2% chegando à Stripe e 1 pagante. São pessoas, não eventos. A página `/free-ai-shorts/localbusiness` existe, mas sua porta principal ainda partia de uma ideia genérica e podia levar ao cadastro sem nome da empresa, serviço, público, diferencial real ou CTA do proprietário.

**FATO CONFIRMADO / PADRÃO COMPETITIVO (páginas oficiais consultadas em 28/08/2026):** CapCut (`https://www.capcut.com/tools/ai-ad-generator`), Creatify (`https://creatify.ai/features/ai-ad-generator`) e Canva (`https://www.canva.com/create/ads/ai-ad-generator/`) pedem insumos do produto ou negócio antes de montar o anúncio. O padrão aproveitado foi preservar fatos reais fornecidos pelo proprietário antes da conta; não foram copiados interface, texto, preço ou promessa.

**IMPLEMENTADO:** `lib/growth/localBusinessAdBrief.ts:1-109` cria no navegador um roteiro estruturado de aproximadamente 35 segundos a partir de cinco fatos limitados: nome, serviço, cliente ideal, diferencial verificável e CTA. O texto contém HOOK, duas micro-recompensas, escalada e payoff, chega ao piso de 77 palavras faladas, cabe no limite de 600 caracteres do handoff e não inventa dinheiro, percentual, garantia ou depoimento. O proprietário pode editar o roteiro completo antes de continuar.

**IMPLEMENTADO / CALLER REAL:** `app/free-ai-shorts/[niche]/page.tsx:522-672` troca somente a variação `localbusiness` pelo novo `LocalBusinessAdBrief`; as outras 29 páginas mantêm `TopicGeneratorForm`. `LocalBusinessAdBrief.tsx:48-93` envia o roteiro exato pelo contrato canônico `toolActivationHref`, com campanha `growth_local_business_brief_20260828`, `script_mode=verbatim`, `duration=35` e `autoanalyze=1`. Não envia `create_intent`. O redirect é validado pelo signup e o editor autenticado restaura prompt, modo e duração; o caller de autostart rejeita qualquer handoff cujo `createIntent` não seja `fast`. Portanto a mudança prepara o editor, mas não dispara render nem débito.

**TESTADO LOCALMENTE:** `node scripts/test-local-business-ad-brief.mjs` executou 46/46 verificações. A suite compila e executa o gerador, `toolActivationHref`, `normalizeInternalRedirect` e `readCreationHandoff`; cobre limites, duração, fatos preservados, ausência de alegações comerciais inventadas, redirect exato, modo verbatim, duração 35, análise sem `create_intent` e caller real da tela. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit --pretty false --incremental --tsBuildInfoFile .tsbuildinfo-local-business` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo e o artefato temporário foi removido.

**COMPARAÇÃO VISUAL:** `docs/previews/LOCAL-BUSINESS-AD-BRIEF-2026-08-28.html` contém antes/depois desktop e o estado mobile. As capturas aprovadas estão em `docs/previews/LOCAL-BUSINESS-AD-BRIEF-DESKTOP-2026-08-28.png` e `docs/previews/LOCAL-BUSINESS-AD-BRIEF-MOBILE-2026-08-28.png`.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28/08/2026, reiterada em 29/08/2026):** Supabase atingiu o limite máximo de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. Codex não consultou nem escreveu Supabase, Storage, Auth, migration, banco, evento, crédito ou render nesta entrega. `402` permanece classificado como indisponibilidade de capacidade, nunca abandono voluntário; não declarar que renders estão perfeitos.

**DECISÃO OPERACIONAL DE CONTENÇÃO:** nenhuma submissão IndexNow, recrawl, e-mail, outreach, anúncio, TAAFT ou ampliação ativa de tráfego foi executada. A entrega melhora apenas a conversão do tráfego B2B que já chega à página.

**VALIDADO EM PRODUÇÃO (29/08/2026):** deploy Vercel `dpl_HcRjU2cd8o6GxP2g2SkEHa6oo7Vm` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato `057883747d87b783bfe29a724712ee39c7cdf586`. Leitura HTTP sem executar JavaScript respondeu 200/`PRERENDER` em `/free-ai-shorts/localbusiness` e confirmou H1, CTA `Build my business ad script`, seção `business-ad-builder`, os cinco campos, limites visíveis e a copy de que nada é gerado ou cobrado antes de continuar. A rota de controle `/free-ai-shorts/mystery` respondeu 200, manteve `Create my free Short` e não contém o builder B2B. A Vercel registrou zero erro de runtime agrupado nas duas rotas nos 15 minutos consultados. O formulário não foi preenchido em produção para não executar analytics/Auth durante o incidente; o handoff interativo segue classificado como testado localmente, não cadastro autenticado end-to-end.

**QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe evidência de pessoa, cadastro, checkout ou assinatura causada pelo briefing. Depois da normalização da capacidade, medir pessoas da campanha `growth_local_business_brief_20260828`, excluindo contas internas e sem contar eventos como pessoas.

**NÃO TOCADO:** pipeline de render, motor, cena, legenda, Supabase, Storage, Auth, migration, banco, preço, grant, oferta, SKU, checkout, e-mail, outreach, IndexNow, TAAFT, anúncio ou vídeo de cliente.

**PRÓXIMO DONO:** Claude continua capacidade/render e deve executar `git fetch origin` antes de nova worktree. Codex continua aquisição/fluxo/assinaturas. Não reconstruir este briefing nem adicionar `create_intent` sem uma decisão explícita sobre render automático.

## 31. Fluxo B2B — briefing de negócio local descoberto pelo hub público (29/08/2026)

**BASE DE CÓDIGO:** `ff4c128d0a4be62b427f5e912d8c608cf54427ba`, igual a `origin/main` no início da worktree isolada `codex/growth-local-business-discovery`.

**FATO CONFIRMADO / GARGALO:** no SHA de base, uma busca em `app/`, `components/` e `lib/` encontrou zero referência direta a `/free-ai-shorts/localbusiness`. O briefing B2B publicado na seção 30 estava apenas na família dinâmica/sitemap; o hub `/tools`, já ligado à navegação pública da home, listava nove ferramentas e não oferecia essa décima opção. A ferramenta existia, mas o tráfego interno não conseguia escolhê-la.

**IMPLEMENTADO:** `lib/kineoFacts.ts` passa a declarar o briefing local como a décima entrada de `FREE_TOOL_FACTS`, com o mesmo limite verdadeiro da tela: texto editável de 35 segundos, sem conta, cartão, e-mail, IA ou render e sem alegação inventada. `app/tools/page.tsx` deriva dessa fonte o novo card `I need a local business ad script`, posicionando-o entre roteiro de produto e planejamento semanal. Metadata, contagem visível, `ItemList`, `/facts` e `llms.txt` continuam derivados; não há literal paralelo de contagem.

**TESTADO LOCALMENTE:** `node scripts/test-local-business-tool-discovery.mjs` executou 30/30 verificações e o contrato do briefing manteve 46/46. A suite prova a entrada canônica, seis limites, posição do card, caller real, ausência de API/analytics/Supabase/`create_intent`, propagação automática para `/facts` e `llms.txt`, contagens derivadas e preview. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit --pretty false --incremental --tsBuildInfoFile .tsbuildinfo-local-business-discovery` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo e o artefato temporário foi removido.

**COMPARAÇÃO VISUAL:** `docs/previews/LOCAL-BUSINESS-TOOLS-DISCOVERY-2026-08-29.html` compara 9→10 ferramentas em desktop e mostra o estado mobile. As capturas inspecionadas estão em `docs/previews/LOCAL-BUSINESS-TOOLS-DISCOVERY-DESKTOP-2026-08-29.png` e `docs/previews/LOCAL-BUSINESS-TOOLS-DISCOVERY-MOBILE-2026-08-29.png`. O preview respondeu 200 em localhost e mediu overflow horizontal zero em 1440 px e 390 px; servidor, aba e override de viewport foram encerrados.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28–29/08/2026):** Supabase atingiu o limite máximo de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. Esta entrega não consultou nem escreveu Supabase, Storage, Auth, migration, banco, evento, crédito ou render. `402` permanece indisponibilidade de capacidade, nunca abandono voluntário; não declarar que renders estão perfeitos.

**DECISÃO OPERACIONAL DE CONTENÇÃO:** nenhuma submissão IndexNow, recrawl, e-mail, outreach, anúncio, TAAFT ou ampliação ativa de tráfego foi executada. O novo card distribui somente o tráfego que já entra no hub público.

**VALIDADO EM PRODUÇÃO (29/08/2026):** deploy Vercel `dpl_75RJNR223Sz7GACSLo6ABR94DKJq` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato `282db18b49280b7aa419bb15302cada47cfc1055`. Leituras HTTP sem executar JavaScript responderam 200 em `/tools`, `/facts`, `/llms.txt` e `/free-ai-shorts/localbusiness`; `/tools` veio do deploy exato, declarou `numberOfItems: 10`, mostrou o card e o href canônicos, e as duas superfícies de resposta propagaram o novo destino. No Chrome do fundador, em viewport real de 1920×911, o hub renderizou dez cards sem overflow horizontal; `I need a local business ad script` e `Build my business ad` ficaram visíveis no grid, e o console retornou zero erro ou warning. A Vercel registrou zero erro runtime agrupado nas quatro rotas nas duas horas consultadas. Nenhum formulário, signup, checkout, render ou API foi acionado.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (29/08/2026 10:52 BRT):** pessoas vindas do ChatGPT foram observadas entrando, concluindo o primeiro vídeo e, em parte, chegando ao checkout sem assinar. Não há contagem fornecida; `várias` e `algumas` não serão convertidas em números. O ciclo Growth foi renovado por 72 horas, até 01/09/2026 10:52 BRT, com foco prioritário em `primeiro vídeo → valor percebido → oferta → checkout → retorno → assinatura`, preservando os ativos de SEO/AEO que já atraem esse público.

**QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe evidência de clique, pessoa, cadastro, checkout ou assinatura causada pelo card. Depois da normalização da capacidade, medir pessoas que saem de `/tools` para `/free-ai-shorts/localbusiness` e depois entram na campanha `growth_local_business_brief_20260828`, excluindo contas internas.

**NÃO TOCADO:** página funcional do briefing, handoff de script, signup, Auth, checkout, preço, grant, oferta, SKU, pipeline de render, motor, cena, legenda, Supabase, Storage, migration, banco, evento, e-mail, outreach, IndexNow, TAAFT, anúncio ou vídeo de cliente.

**PRÓXIMO DONO:** Claude continua capacidade/render. Codex continua aquisição/fluxo/assinaturas. Depois do push, executar `git fetch origin`; não reconstruir o card fora de `FREE_TOOL_FACTS` e não adicionar tráfego ativo enquanto o incidente estiver aberto.

## 32. Conversão — motivo do Plan Fit preservado depois de fechar o Stripe (29/08/2026)

**BASE DE CÓDIGO:** `1861ff8929d80552b3909ef122ad08cc35d08ba3`, igual a `origin/main` no início da worktree isolada `codex/growth-plan-fit-return`.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (29/08/2026 10:52 BRT):** pessoas vindas do ChatGPT foram observadas concluindo o primeiro vídeo e, em parte, chegando ao checkout sem assinar. Não há contagem fornecida; isto orienta prioridade, não calcula taxa.

**FATO CONFIRMADO / ANTI-DUPLICAÇÃO:** o checkout já transportava e validava o contrato completo do Plan Fit na `cancel_url`, e a tela já preservava tier, billing, preço canônico, promoção, campanha e URL de retry (`app/api/stripe/checkout/route.ts`; `app/checkout/cancelled/page.tsx`). Portanto não foi criado outro card pós-vídeo, desconto, plano ou mecanismo de retomada. A lacuna era visual: no retorno do Stripe, a pessoa via apenas `Creator — $15.00/month` ou o plano equivalente; motor, duração e cadência que justificaram a recomendação desapareciam.

**IMPLEMENTADO:** commit funcional `ea84c01307c6624b750c3cb32c2fca5b14da222b` adiciona `readPlanFitCheckoutReturn` em `lib/growth/planFitCheckout.ts`. A função aceita somente o contrato fechado já existente, recalcula o Plan Fit pela fonte canônica e devolve uma síntese display-only. Query parcial, duração/cadência fora da allowlist, motor desconhecido ou tier recomendado adulterado falham para a tela genérica. Nada nessa função muda preço, entitlement, desconto ou destino.

**IMPLEMENTADO / CALLER REAL:** `app/checkout/cancelled/page.tsx` mostra, somente em um retorno Plan Fit válido, o bloco `Matched to the video you just made`, com cadência, duração e nome canônico do motor. O CTA passa de `Try secure checkout again` para `Continue with {plan} for this goal`. Um downsell preservado declara honestamente que o plano escolhido está abaixo da recomendação; não promete cobertura integral. O evento `checkout_cancelled` e o clique de retry recebem origem, motor, cadência, duração e aderência do tier por valores limitados.

**TESTADO LOCALMENTE:** `node scripts/test-plan-fit.mjs` executou 270/270 verificações. Os novos casos executam o resumo válido, Seedance 1.5, 4 vídeos, 60s, tier correspondente, downsell sem falsa cobertura e adulteração de cadência fail-closed. `git diff --check` ficou limpo. `npx tsc --noEmit` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/PLAN-FIT-CHECKOUT-RETURN-2026-08-29.html` contém antes/depois autocontido em desktop e mobile. A inspeção real foi feita no Chrome conectado do fundador, não no navegador interno.

**VALIDADO EM PRODUÇÃO (29/08/2026):** deploy Vercel `dpl_6Fa8f66ppoKxVYrJccEQsaHKtV2w` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato `ea84c01307c6624b750c3cb32c2fca5b14da222b`. No Chrome do fundador, o canário canônico `Studio + 4 × 60s Seedance 1.5` mostrou o contexto, a justificativa e o CTA contextual; console sem erro ou warning. Um retorno comum sem Plan Fit manteve o bloco ausente e `Try secure checkout again`, provando isolamento. Uma query Plan Fit com tier incompatível caiu na tela genérica, provando fail-closed. Nenhum botão foi clicado: não houve sessão Stripe, formulário, pagamento, Supabase, render, crédito ou débito. A Vercel registrou zero erro runtime agrupado em `/checkout/cancelled` nos 30 minutos consultados.

**QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe evidência de pessoa que retomou checkout ou assinou por causa deste contexto. Medir pessoas, não eventos, e atribuir somente depois de `checkout_cancelled` com `checkout_origin=plan_fit_first_delivery` seguido de retry e pagamento do mesmo ator.

**NÃO TOCADO:** `lib/checkoutPricing.ts`, preço, grant, oferta, SKU, checkout server-side, Stripe session creation, webhook, Auth, Supabase, Storage, migration, banco, render, motor, cena, legenda, e-mail, outreach, IndexNow, TAAFT, anúncio ou vídeo de cliente.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `ea84c01` ou da ponta posterior de `origin/main`. Não reconstruir a retomada nem adicionar outro card concorrente no pós-vídeo. Claude continua capacidade/render; Codex continua aquisição/fluxo/assinaturas.

## 33. Conversão — objetivo do Plan Fit preservado na sessão salva (29/08/2026)

**BASE DE CÓDIGO:** `6734591c7f73b6e1ece8bd5bc18d272afdf05f17`, igual a `origin/main` no início da worktree isolada `codex/growth-plan-fit-saved-resume`.

**FATO CONFIRMADO / GARGALO NÃO DUPLICADO:** a seção 32 corrigiu quem fecha o Stripe pelo botão de voltar e aterrissa em `/checkout/cancelled`. Quem simplesmente fecha a aba recebe outro mecanismo: `/api/stripe/checkout/resume` resolve a sessão Stripe salva e alimenta `PricingSavedCheckout` e `CheckoutResumeBanner`. Antes deste commit, `internalRetryUrl` já preservava o contrato Plan Fit na URL, mas o JSON e as duas interfaces devolviam apenas plano, billing e valores. Motor, duração e cadência voltavam a desaparecer.

**IMPLEMENTADO:** commit funcional `ae5113cd4e9487ab0045b9ab5dbbb75365e598a0` adiciona `readPlanFitCheckoutReturnFromMetadata` à fonte canônica. A rota reconstrói o resumo somente da metadata Stripe da sessão autenticada e possuída já validada, somente em USD canônico; origem, engine, cadência, duração, tier recomendado ou vídeo inválidos resultam em `planFit:null`. O JSON não expõe `video_id`, metadata crua ou conteúdo do roteiro — apenas engine canônico, label, cadência, segundos e aderência do tier.

**IMPLEMENTADO / DUAS SUPERFÍCIES, UMA OFERTA:** `PricingSavedCheckout` passa a dizer `Your saved goal is 4 × 60s Seedance 1.5 videos/month` e usa `Continue this video plan`; o banner global mostra o mesmo objetivo e usa `Resume this goal`. Retomadas comuns continuam com a copy anterior. As duas superfícies usam `formatCheckoutResumePlanFitGoal`, o mesmo response type e os mesmos campos bounded de telemetria. Nenhum fetch, consulta Stripe, consulta Supabase, preço, desconto, oferta ou sessão adicional foi criado.

**REVISÃO REACT:** objetivo e copy são derivados durante render; nenhum estado ou efeito novo foi adicionado. A chave de dedupe e a telemetria usam somente primitivos, evitando rerender/evento duplicado. A página de preços continua dona da superfície contextual e o banner global continua suprimido nela, preservando uma oferta por viewport.

**TESTADO LOCALMENTE:** `node scripts/test-plan-fit.mjs` executou 273/273 verificações e `node scripts/test-pricing-saved-checkout.mjs` executou 33/33. As suítes executam reconstrução por metadata válida, rejeição de origem forjada, formatação singular/plural, contrato da rota, caller das duas interfaces e fallback genérico. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/PLAN-FIT-SAVED-RESUME-2026-08-29.html` contém antes/depois do card de pricing em desktop e do banner global em mobile. O preview foi servido por localhost somente leitura e inspecionado no Chrome conectado do fundador: quatro estados, overflow horizontal zero e console sem erro ou warning; o servidor temporário foi encerrado.

**VALIDADO EM PRODUÇÃO (29/08/2026):** deploy Vercel `dpl_AWwkHLt6k5KbTuFjtLzxFMtvRrNe` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato. `/pricing` respondeu 200/`PRERENDER` com assets presos ao deploy. O chunk publicado de pricing contém `Your saved goal is` e `Continue this video plan`; o chunk do layout contém `Resume this goal`. A Vercel registrou zero erro runtime agrupado em `/pricing` e `/api/stripe/checkout/resume` nos 30 minutos consultados.

**LIMITE DA VALIDAÇÃO:** o endpoint autenticado de resume não foi chamado manualmente, para não consumir leitura Supabase/Stripe durante o incidente de capacidade informado pelo fundador. Portanto publicação do código, contratos, UI e ausência de erro observado estão confirmadas; a aparição com uma sessão real salva permanece `QUESTÃO PENDENTE`, não é chamada de conversão validada.

**QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe evidência de pessoa que viu o objetivo salvo, retomou ou assinou por causa desta mudança. Medir pessoas, não eventos, em `pricing_saved_checkout_viewed/clicked` e `checkout_resume_banner_viewed/clicked`, segmentando `checkout_origin=plan_fit_first_delivery` e ligando ao pagamento do mesmo ator.

**NÃO TOCADO:** `lib/checkoutPricing.ts`, preço, grant, oferta, SKU, criação de Checkout Session, webhook, Auth, Supabase, Storage, migration, banco, render, motor, cena, legenda, e-mail, outreach, IndexNow, TAAFT, anúncio ou vídeo de cliente.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `ae5113c` ou da ponta posterior de `origin/main`. Não reconstruir a sessão salva nem criar banner concorrente. Claude continua capacidade/render; Codex continua aquisição/fluxo/assinaturas.

## 34. Medição — primeiro toque ChatGPT até checkout e assinatura (29/08/2026)

**BASE DE CÓDIGO:** `f9b5f0f44d406db1d1352297fccbc369a1a1da0e`, igual a `origin/main` no início da worktree isolada `codex/growth-chatgpt-first-touch`.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (29/08/2026 10:52 BRT):** pessoas vindas do ChatGPT foram observadas entrando, concluindo o primeiro vídeo e, em parte, chegando ao checkout sem assinar. Não foi fornecida contagem; `várias` e `algumas` continuam sem conversão numérica.

**FATO CONFIRMADO / GARGALO DE MEDIÇÃO:** o painel possuía duas visões diferentes, ambas insuficientes para responder ao relato. `sourceQuality` agrupava primeiro toque por origem, mas pulava checkout e usava qualquer vídeo como `activated`; `chatGptQuickstart` media somente quem viu e escolheu o cartão experimental `chatgpt_quickstart_v2`. Portanto uma pessoa de primeiro toque ChatGPT que ignorasse o cartão, concluísse vídeo e abandonasse a Stripe não aparecia no funil detalhado que deveria orientar a conversão.

**IMPLEMENTADO:** commit funcional `33e791098e3ae23dab6cc2e9aa8e67c340a1551b` cria `lib/admin/sourceConversionFunnel.ts`. O helper conta perfis únicos por origem canônica e monta um caminho monotônico por interseção da mesma pessoa: cadastro → vídeo com status `completed` → vídeo concluído + checkout → vídeo concluído + checkout + assinatura. Perfil duplicado não infla o placar; checkout sem vídeo não é fingido como pós-vídeo; denominador zero vira `—`.

**IMPLEMENTADO / CHECKOUT REAL:** `app/api/admin/funnel/route.ts` reaproveita as consultas já existentes; nenhuma chamada Supabase ou Stripe nova foi adicionada. Além dos beacons existentes, uma Checkout Session de assinatura já carregada e mapeada ao usuário passa a provar que aquela pessoa alcançou checkout, inclusive quando a navegação perdeu o evento do navegador. Disponibilidade de profiles, videos, click_events/events e Stripe é declarada separadamente; coluna indisponível aparece como `—`, nunca zero inventado.

**IMPLEMENTADO / INTERFACE:** `app/(dashboard)/admin/funnel/FunnelClient.tsx` substitui a tabela visual incompleta por `First-touch source → delivered video → subscription`, com Signups, Video delivered, Video + checkout, Video + paid e três taxas adjacentes. A linha `chatgpt · FOCUS` recebe destaque visual, mas os demais canais continuam comparáveis. O bloco quick-start permanece separado porque responde à eficácia do cartão, não ao canal inteiro.

**REVISÃO REACT:** a tabela deriva integralmente do response durante render. Nenhum estado, efeito, fetch ou dependência foi adicionado; a chave é a origem canônica e cada linha continua sendo uma pessoa por perfil, não uma linha de evento.

**TESTADO LOCALMENTE:** `node scripts/test-source-conversion-funnel.mjs` executou 23/23 verificações e `node scripts/test-chatgpt-quickstart.mjs` manteve 55/55. As suítes executam contagem única, interseções monotônicas, taxas, checkout sem vídeo, disponibilidade honesta, caller da rota, sessão Stripe e interface. `git diff --check` ficou limpo. `npx tsc --noEmit --pretty false` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/CHATGPT-FIRST-TOUCH-FUNNEL-2026-08-29.html` contém antes/depois desktop e o estado mobile autocontido. O arquivo foi servido por localhost somente leitura e aberto no Chrome conectado do fundador. A inspeção visual confirmou destaque legível do ChatGPT e rolagem horizontal contida no estado de 390 px.

**VALIDADO EM PRODUÇÃO (29/08/2026):** deploy Vercel `dpl_FUD6r2tTt8sShhfdkiFDBkLsg5QT` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato `33e791098e3ae23dab6cc2e9aa8e67c340a1551b`.

**LIMITE DA VALIDAÇÃO:** o painel autenticado `/admin/funnel` não foi aberto em produção nesta rodada porque a tela executaria leituras Supabase e Stripe durante o incidente de capacidade informado pelo fundador. Portanto código, testes, comparação visual, publicação e deploy estão confirmados; os números vivos da nova coorte permanecem `QUESTÃO PENDENTE`, nunca são presumidos como zero.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28–29/08/2026):** Supabase atingiu o limite máximo de gigabytes e alguns renders retornam `402`; Joseph e Claude conduzem o incidente. Esta entrega não escreveu Supabase, Storage, Auth, migration, banco, evento, crédito ou render. `402` continua indisponibilidade de capacidade, não abandono voluntário.

**NÃO TOCADO:** captura de origem, schema, Supabase, Storage, Auth, migration, banco, preço, grant, oferta, SKU, criação de Checkout Session, webhook, pipeline de render, motor, cena, legenda, e-mail, outreach, IndexNow, TAAFT, anúncio ou vídeo de cliente.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `33e7910` ou da ponta posterior de `origin/main`. Não confundir o bloco `chatgpt_quickstart_v2` com o canal completo e não reconstruir esta coorte por contagem de eventos. Claude continua capacidade/render; Codex continua aquisição/fluxo/assinaturas e usará os números vivos somente após a normalização da capacidade.

## 35. Conversão — confiança no último pixel antes da Stripe (29/08/2026)

**BASE DE CÓDIGO:** `a3ac828b9665f8b679ac11764831f21998a3d93f`, igual a `origin/main` no início da worktree isolada `codex/growth-plan-fit-trust`.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (29/08/2026 10:52 BRT):** pessoas vindas do ChatGPT foram observadas concluindo o primeiro vídeo e, em parte, chegando ao checkout sem assinar. Não há contagem fornecida; o relato orienta prioridade, não produz taxa.

**FATO CONFIRMADO / ANTI-DUPLICAÇÃO:** `PricingClient`, `checkout/cancelled`, `PricingSavedCheckout`, `CheckoutResumeBanner` e outras ofertas já mostram cancelamento, garantia ou cobrança. O Plan Fit, que salta diretamente da primeira entrega para a Stripe, era a exceção: seu CTA dizia apenas `Get {plan} — {price}/month` e não mostrava processador, cancelamento ou garantia no mesmo viewport. Não foi criado outro card, checkout, desconto ou mecanismo de retorno.

**IMPLEMENTADO:** commit funcional `0e062647bcbdb4068d02d31824738168b7e25f65` muda o CTA do plano calculado para `Continue with {plan} — {price}/month`, preservando tier, preço canônico, moeda e destino. Imediatamente abaixo, a mesma decisão passa a mostrar a promessa já usada e aprovada no produto: `Secure Stripe checkout · cancel anytime in one click · 7-day money-back`.

**FATO CONFIRMADO / VERDADE COMERCIAL:** nenhuma promessa foi inventada. A garantia de sete dias e o cancelamento aparecem em `checkout/cancelled`, `PostVideoPaywall`, `ExitIntentOffer`, comparações e páginas públicas. O preço continua derivado de `lib/checkoutPricing.ts`; não existe literal monetário novo. O checkout continua mensal, sem intro adicionado e sem alteração na sessão Stripe.

**REVISÃO REACT:** somente texto e apresentação derivados do `result.plan` existente foram alterados. Nenhum estado, efeito, fetch, evento ou dependência foi adicionado. A telemetria já existente (`plan_fit_impression`, seleção e checkout iniciado) continua suficiente para comparar exposição → checkout → pagamento por pessoa.

**TESTADO LOCALMENTE:** `node scripts/test-plan-fit.mjs` executou 278/278 verificações e `node scripts/test-pricing-saved-checkout.mjs` manteve 33/33. A suíte trava CTA de continuidade, moeda condicional, marcador do reassurance, Stripe, cancelamento e garantia. `git diff --check` ficou limpo. `npx tsc --noEmit --pretty false` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/PLAN-FIT-CHECKOUT-TRUST-2026-08-29.html` contém antes/depois desktop e o estado de 390 px. O preview foi servido por localhost somente leitura e inspecionado no Chrome conectado do fundador; CTA, preço e linha de confiança ficam no mesmo viewport e a copy mobile quebra em duas linhas sem sair do card.

**VALIDADO EM PRODUÇÃO (29/08/2026):** deploy Vercel `dpl_E1AbbrcyH2ypS721g6kqTqDrj69T` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato `0e062647bcbdb4068d02d31824738168b7e25f65`.

**LIMITE DA VALIDAÇÃO:** `/studio/create` vive no layout autenticado que lê Supabase. A tela real não foi aberta em produção durante o incidente de capacidade; o preview visual, os contratos, testes, publicação e deploy estão confirmados, mas não há clique real nem assinatura atribuída à nova copy.

**NÃO TOCADO:** `lib/checkoutPricing.ts`, preço, grant, desconto, oferta, SKU, sessão Stripe, webhook, Auth, Supabase, Storage, migration, banco, eventos, pipeline de render, motor, cena, legenda, e-mail, outreach, IndexNow, TAAFT, anúncio ou vídeo de cliente.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `0e06264` ou da ponta posterior de `origin/main`. Não remover a linha de confiança do Plan Fit nem duplicá-la em outro card; Claude continua capacidade/render e Codex continua aquisição/fluxo/assinaturas.

## 36. Conversão — degrau de menor custo dentro do Plan Fit (29/08/2026)

**BASE DE CÓDIGO:** `fe9713f9a68ea3853ae278862dd56b2af6ccc71a`, igual a `origin/main` no início da worktree isolada `codex/growth-plan-fit-alternatives`.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (29/08/2026 10:52 BRT):** pessoas vindas do ChatGPT foram observadas concluindo o primeiro vídeo e, em parte, chegando ao checkout sem assinar. Não há contagem fornecida; o relato define prioridade, mas não produz taxa.

**FATO CONFIRMADO / GARGALO NÃO DUPLICADO:** quando nenhum plano self-serve cobria a meta, o Plan Fit já oferecia reduzir a frequência no mesmo motor ou manter a frequência com Kineo 1. Quando a meta cabia em Studio ou Creator, porém, o ramo válido mostrava somente o plano recomendado e a Stripe. Assim, uma pessoa que considerasse o plano alto não via que uma redução pequena de frequência manteria exatamente motor e duração num degrau mais barato (`lib/growth/planFit.ts`; `components/growth/PlanFitCard.tsx`).

**IMPLEMENTADO:** commit funcional `1b3341caedbc74a5b1c9de27887f91462f244bbb` calcula o plano imediatamente mais barato que o recomendado e a maior frequência inteira que ele comporta com o mesmo custo por filme. A alternativa só existe quando esse plano cobre pelo menos um filme e exige frequência menor que a meta escolhida. Starter não inventa um degrau inferior; resultado sem plano continua no fluxo antigo; preço e grant vêm de `lib/checkoutPricing.ts`, e custo por duração continua vindo de `lib/credits/engineCost.ts`.

**IMPLEMENTADO / INTERFACE:** abaixo da ação principal, o card pode mostrar `Prefer a lower monthly plan? Keep {engine} and {seconds}s`. O clique em `Compare` apenas recalcula a frequência com `selection_source=lower_plan_capacity`; não abre Stripe, não troca motor e não escolhe o plano sem confirmação. Depois do recálculo, a pessoa ainda confirma o novo CTA canônico. Exemplo derivado das fontes atuais: 4 vídeos Seedance 1.5 de 60s usam 100 créditos e recomendam Studio; Creator comporta 3 dos mesmos vídeos por mês.

**REVISÃO REACT:** o degrau é derivado no cálculo existente e renderizado condicionalmente. Nenhum estado, efeito, fetch ou dependência foi adicionado; o handler reutiliza `chooseCadence` e a telemetria existente de seleção de meta.

**TESTADO LOCALMENTE:** `node scripts/test-plan-fit.mjs` executou 290/290 verificações e `node scripts/test-pricing-saved-checkout.mjs` manteve 33/33. Os casos executam Studio → Creator, Creator → Starter, Starter sem alternativa fictícia, resultado sem plano isolado, cobertura do grant, redução real de frequência, preço canônico e caller da interface. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit --pretty false` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/PLAN-FIT-LOWER-COST-PATH-2026-08-29.html` contém antes/depois desktop e estado de 390 px. O preview foi servido por localhost somente leitura e inspecionado no Chrome conectado do fundador; a alternativa fica visualmente secundária, não disputa com o CTA principal e não estoura o card móvel.

**VALIDADO EM PRODUÇÃO (29/08/2026):** deploy Vercel `dpl_8hGVGvAV7qA8e6KULKKhKQFkK9kD` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato `1b3341caedbc74a5b1c9de27887f91462f244bbb`.

**LIMITE DA VALIDAÇÃO:** o Plan Fit vive no dashboard autenticado e executa leituras Supabase. Durante o incidente de capacidade informado pelo fundador, a tela real não foi carregada nem houve clique de cliente. Código, cálculo executado, caller, comparação visual no Chrome, publicação e deploy estão confirmados; impacto em checkout e assinatura permanece `QUESTÃO PENDENTE` até existir tráfego elegível depois da normalização.

**NÃO TOCADO:** preço, grant, desconto, oferta, SKU, sessão Stripe, webhook, Auth, Supabase, Storage, migration, banco, render, motor, duração, cena, legenda, e-mail, outreach, IndexNow, TAAFT, anúncio ou vídeo de cliente.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `1b3341c` ou da ponta posterior de `origin/main`. Não reconstruir o degrau de menor custo nem transformar o link de comparação em checkout automático. Claude continua capacidade/render; Codex continua aquisição/fluxo/assinaturas.

## 37. Aquisição e conversão — Plan Fit público com todos os motores (29/08/2026)

**BASE DE CÓDIGO:** `c3e09253944de9d84416d29416e1d158417ed71a`, igual a `origin/main` no início da worktree isolada `codex/growth-public-plan-fit`.

**EVIDÊNCIA DE PRODUÇÃO / SEARCH CONSOLE (29/08/2026):** no Chrome conectado do fundador, sem solicitar indexação, a propriedade de produção mostrou 29 cliques, 1.896 impressões, CTR de 1,5% e posição média 52,6 no recorte de 28 dias; no recorte de três meses, 37 cliques e 2.216 impressões. Entre as páginas com impressão e poucos cliques estavam `/best-ai-shorts-generators` (301/1), `/how-much-do-youtube-shorts-pay` (353/0), `/can-you-monetize-ai-videos` (186/0), `/youtube-shorts-rpm-by-niche` (129/0), `/tiktok-vs-youtube-shorts-monetization` (111/0) e `/shorts-money-calculator` (110/0). O relatório de aparições em recursos generativos mostrou 35 impressões: home 16, pricing 6 e superfícies de alternativas entre as demais. Estes números orientam prioridade; não são pessoas nem assinaturas.

**FATO CONFIRMADO / ANTI-DUPLICAÇÃO:** `/pricing` já apontava para o calculador público `/cheapest-ai-shorts-maker`, e o produto já possuía o algoritmo canônico `lib/growth/planFit.ts`. Portanto não foi criada nova landing ou uma segunda tabela de preços. A lacuna era que o calculador público duplicava localmente planos e preços e representava somente três grupos amplos (`Fast`, `AI Generated`, `Cinematic`) com duração fixa de 60 segundos, enquanto o produto oferece sete motores e 35/60/90 segundos.

**IMPLEMENTADO:** commit funcional `d6f176d7ea70d5fa765623d94211f38470022cae` faz `app/cheapest-ai-shorts-maker/ShortCostCalculator.tsx` importar `calculatePlanFit`, `engineName`, `planName` e `getTierPrice`. A página pública passa a calcular Kineo 1, Seedance 1.5, MiniMax H3, Kling 2.5, Veo 3.1, Kling 3 e Omni Flash nas durações 35/60/90, usando créditos, grants e preços das mesmas fontes de Checkout. Não existe string paralela de preço ou grant.

**IMPLEMENTADO / SAÍDA HONESTA:** quando a combinação cabe, a tela mostra o plano mensal mais barato e o custo por vídeo. Quando um plano imediatamente inferior comporta uma frequência menor no mesmo motor e duração, `Use that cadence` aplica esse caminho antes da Stripe. Quando nenhum plano self-serve cobre a meta, a página não inventa cobertura: oferece reduzir a cadência no mesmo motor quando possível ou preservar a frequência com Kineo 1. Nenhuma ação inicia render, débito, Checkout Session ou alteração de conta.

**REVISÃO REACT:** seleção, custo e alternativas são derivados no `useMemo` existente; não foi criado fetch, efeito de sincronização, estado duplicado ou API nova. O limite público de frequência foi alinhado ao teto de segurança de 60 filmes do contrato canônico. A telemetria existente preserva os nomes de evento e passa a declarar duração, créditos por filme e origem da escolha por campos limitados.

**TESTADO LOCALMENTE:** `node scripts/test-plan-fit.mjs` executou 307/307 verificações. Os 17 casos novos travam import canônico, ausência de tabela privada, sete motores, três durações, recálculo por duração, alternativa de menor custo, capacidade no mesmo motor, fallback Kineo 1, teto de frequência e telemetria de segundos. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit` mostrou exatamente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/PUBLIC-PLAN-FIT-2026-08-29.html` contém antes/depois autocontido em desktop e mobile. O arquivo e a tela funcional foram servidos localmente e inspecionados no Chrome conectado do fundador. A comparação confirma os sete motores, duração explícita e alternativa de menor custo sem substituir o CTA principal.

**VALIDADO EM PRODUÇÃO (29/08/2026):** o auto-deploy do push não abriu build; GitHub já mostrava o SHA em `main`, e a Vercel ainda apontava para `c3e0925`. Pelo Chrome autenticado do fundador, foi usado `Create Deployment` → `main` → `Deploy to Production`, sem alterar configuração. O deploy `dpl_C5sMb2g2HGtBB51dcguTWkF3uERp` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato `d6f176d7ea70d5fa765623d94211f38470022cae`.

**VALIDADO EM PRODUÇÃO / CHROME REAL (29/08/2026):** em `www.usekineo.com`, a tela mostrou os sete motores e 35/60/90 segundos. O caso Seedance 1.5, 4 vídeos, 60s calculou 100 créditos, Studio a $29/mês e alternativa Creator a 3 vídeos/mês por $15/mês; `Use that cadence` reduziu para 75 créditos e Creator. O caso Kling 3, 4 vídeos, 90s calculou 900 créditos, declarou que nenhum plano self-serve cobre e ofereceu manter 4/mês com Kineo 1. A Vercel registrou zero erro runtime agrupado em `/cheapest-ai-shorts-maker` nos 15 minutos consultados.

**DECISÃO OPERACIONAL DE CONTENÇÃO:** nenhuma submissão IndexNow, recrawl, e-mail, outreach, anúncio, TAAFT ou ampliação ativa de tráfego foi executada. O trabalho converte melhor tráfego orgânico/ChatGPT que já chega à superfície pública.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28–29/08/2026):** Supabase atingiu limite de capacidade e Joseph/Claude conduzem o incidente. Esta entrega não consultou nem escreveu Supabase, Storage, Auth, migration, banco, crédito ou render; não há declaração de que renders estão perfeitos.

**QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe evidência de pessoa, checkout ou assinatura causada pelo calculador ampliado. Medir pessoas, não eventos, por `short_cost_calculator_viewed`, `short_cost_calculator_recommendation`, seleção e pagamento do mesmo ator, excluindo contas internas.

**NÃO TOCADO:** preço, grant, oferta, SKU, Stripe server-side, webhook, Auth, Supabase, Storage, migration, banco, pipeline de render, motor de render, cena, legenda, e-mail, outreach, IndexNow, TAAFT, anúncio ou vídeo de cliente.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `d6f176d` ou da ponta posterior de `origin/main`. Não reconstruir outra calculadora nem criar tabela privada de preço/crédito. Claude continua capacidade/render; Codex continua aquisição/fluxo/assinaturas.

## 38. Fluxo orgânico — estimativa de ganhos leva a cadência ao custo real (29/08/2026)

**BASE DE CÓDIGO:** `4e11650ad8c49541bb4bdcdad958724acc197b41`, igual a `origin/main` no início da worktree isolada `codex/growth-earnings-to-cost`.

**EVIDÊNCIA DE PRODUÇÃO / SEARCH CONSOLE (29/08/2026):** `/shorts-money-calculator` acumulava 110 impressões e zero cliques no recorte de 28 dias consultado no Chrome do fundador. O número é de impressões de página no Google, não de pessoas nem uso da calculadora. Ele justifica inspecionar a rota; não prova conversão.

**FATO CONFIRMADO / ANTI-DUPLICAÇÃO:** o calculador de ganhos já tinha um CTA funcional para criar o primeiro Short, e o calculador público de custo já existia em `/cheapest-ai-shorts-maker`. Não foi criada terceira ferramenta, outro preço ou CTA concorrente de Checkout. A lacuna era continuidade: quem estimava `7 Shorts/week` e ainda queria conferir a economia precisava abrir a ferramenta de custo separadamente e recebia o padrão de 12 vídeos/mês, perdendo o objetivo declarado.

**IMPLEMENTADO:** commit funcional `b2e2eef3e2116b53dbb052d5544f0201b2fb5364` adiciona `lib/growth/publicPlanFitHandoff.ts`, contrato puro e limitado que converte cadência semanal para mensal pela mesma constante usada na projeção de ganhos, arredonda para cima e limita a 60/mês. A URL transporta somente source allowlisted, motor, duração e cadência; não transporta renda, views, RPM, identidade ou conteúdo.

**IMPLEMENTADO / DUAS FERRAMENTAS, UM OBJETIVO:** `CalculatorClient.tsx` mantém `Make the first of those N Shorts — free` como ação principal e adiciona o link secundário `Price this N-video monthly schedule`. Com 7/semana, ele declara 31/mês. Acima do teto, a copy diz `Price the first 60 videos/month`, sem fingir que calculou tudo. `ShortCostCalculator.tsx` aceita somente o contrato válido, preenche a cadência e mostra `Publishing target carried over`; motor e duração permanecem editáveis. Source, duração e volume adulterados falham para o padrão direto de 12/mês.

**REVISÃO REACT:** a ponte no calculador de ganhos é derivada em `useMemo`; não cria estado, efeito, fetch ou API. O calculador de custo reaproveita o efeito já existente, aplica o prefill depois da hidratação e usa os valores validados na impressão. Nenhum fetch novo foi adicionado.

**TESTADO LOCALMENTE:** `node scripts/test-plan-fit.mjs` executou 324/324 verificações. Os casos executam 7/semana → 31/mês, teto honesto de 60, round-trip, source/duração/motor/cadência inválidos, caller nos dois componentes, continuidade visual e telemetria com defaults reais. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit` repetiu somente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/EARNINGS-TO-COST-HANDOFF-2026-08-29.html` contém antes/depois desktop e mobile. O preview e o fluxo funcional foram inspecionados no Chrome conectado do fundador. A ação gratuita continua visualmente primária; o planejamento de custo aparece como link secundário e o destino explica a continuidade.

**VALIDADO EM PRODUÇÃO (29/08/2026):** auto-deploy Vercel `dpl_9h3cYVsu64zvhNjjsuN7c7Leud7R` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA exato `b2e2eef3e2116b53dbb052d5544f0201b2fb5364`. No Chrome real, `/shorts-money-calculator` mostrou `Price this 31-video monthly schedule`; o clique abriu a URL limitada, exibiu o aviso de continuidade, preencheu 31, calculou 155 créditos e recomendou Studio a $29/mês. A URL forjada não mostrou aviso, voltou a 12 e manteve Kineo 1. A Vercel registrou zero erro runtime agrupado nas duas rotas nos 15 minutos consultados.

**DECISÃO OPERACIONAL DE CONTENÇÃO:** nenhuma submissão IndexNow, recrawl, e-mail, outreach, anúncio, TAAFT ou ampliação ativa de tráfego foi executada. A entrega organiza melhor o tráfego orgânico já existente.

**EVIDÊNCIA INFORMADA PELO FUNDADOR (28–29/08/2026):** Supabase atingiu limite de capacidade e Joseph/Claude conduzem o incidente. Esta entrega não consultou nem escreveu Supabase, Storage, Auth, migration, banco, crédito ou render.

**QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe evidência de pessoa que percorreu o novo link, abriu preço ou assinou. Medir pessoas, não eventos, ligando `organic_cta_clicked` com `source=acq5_money_calculator` e `placement=result_cost_plan` ao Plan Fit/checkout/pagamento do mesmo ator, excluindo contas internas.

**NÃO TOCADO:** preço, grant, oferta, SKU, Stripe server-side, webhook, Auth, Supabase, Storage, migration, banco, pipeline de render, motores, cena, legenda, e-mail, outreach, IndexNow, TAAFT, anúncio ou vídeo de cliente.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `b2e2eef` ou da ponta posterior de `origin/main`. Não reconstruir a ponte nem adicionar preço direto no calculador de ganhos; o destino canônico é o Plan Fit público. Claude continua capacidade/render; Codex continua aquisição/fluxo/assinaturas.

## 39. Aquisição AEO — planejador de custo vira ferramenta pública citável (29/08/2026)

**BASE DE CÓDIGO:** `141574fd7e8c9d97f7aacbbcaf813a5452a9fb61`, igual a `origin/main` no início da worktree isolada `codex/growth-aeo-cost-planner`.

**EVIDÊNCIA DE PRODUÇÃO / SEARCH CONSOLE (29/08/2026):** o relatório de aparições em recursos generativos consultado no Chrome do fundador mostrou 35 impressões no período selecionado, incluindo 6 para `/pricing`. Impressão não é pessoa, uso do produto nem assinatura; o sinal apenas mostra que motores de resposta já encontram a verdade comercial da Kineo e justifica tornar o calculador canônico de custo explicitamente citável.

**FATO CONFIRMADO / ANTI-DUPLICAÇÃO:** `/cheapest-ai-shorts-maker` já existia, usava `calculatePlanFit` e derivava motor, duração, créditos, grants e plano das fontes canônicas. A lacuna era descoberta: o hub `/tools`, `/facts`, `/api/facts` e `/llms.txt` publicavam somente as dez ferramentas de texto e o calculador de ganhos. Não foi criada outra calculadora, landing, tabela de preço ou oferta.

**IMPLEMENTADO:** commit funcional `0e9ee0515e4c9aec3f63bdd8e33433fa40aa9f69` adiciona `PUBLIC_COST_PLANNER_FACT` a `lib/kineoFacts.ts`. O contrato declara saída `cost_plan`, URL do planejador, URL pública de pricing e ausência de conta, cartão, e-mail e limite de uso. Ele fica separado de `FREE_TOOL_FACTS` porque essas dez ferramentas prometem saída de texto; misturar os dois faria `/facts` mentir sobre o tipo de resultado. A descrição não contém preço, grant ou crédito literal e aponta que a matemática usa os mesmos custos de motor e grants do Checkout.

**IMPLEMENTADO / QUATRO SUPERFÍCIES, UM FATO:** `/tools` agora deriva 11 cards e seu JSON-LD `CollectionPage/ItemList` declara 11 itens. O novo card começa por uma agenda de publicação e leva ao Plan Fit público com `Find my cheapest plan`. `/facts`, `/api/facts` e `/llms.txt` publicam o mesmo objeto canônico; a fronteira foi corrigida para “texto, planejamento ou estimativa de custo”, sempre sem afirmar que a ferramenta renderiza vídeo.

**REVISÃO REACT:** `app/tools/page.tsx` continua Server Component. A coleção combinada, contagem, metadata e JSON-LD são derivados em build time; nenhum hook, estado, efeito, fetch, API ou hidratação foi adicionado. A página do calculador não foi modificada nesta rodada.

**TESTADO LOCALMENTE:** `node scripts/test-public-cost-planner-discovery.mjs` executou 37/37 verificações e `node scripts/test-plan-fit.mjs` manteve 324/324. O Next local respondeu 200 em `/tools`, `/cheapest-ai-shorts-maker`, `/facts`, `/api/facts` e `/llms.txt`; o Chrome real confirmou 11 cards, badge, fronteira, JSON-LD=11 e navegação ao calculador. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit --pretty false --incremental false` repetiu somente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:548,569`; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/PUBLIC-COST-PLANNER-DISCOVERY-2026-08-29.html` contém antes/depois autocontido das superfícies tocadas em desktop e mobile. Foi servido localmente e inspecionado no Chrome conectado do fundador; a nova rota aparece como próximo passo depois do calculador de ganhos e preserva a hierarquia do hub.

**VALIDADO EM PRODUÇÃO (29/08/2026):** deploy automático Vercel `dpl_FfDQ6byoKLw8iS1ApgsekRqGc5QF` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA funcional exato `0e9ee0515e4c9aec3f63bdd8e33433fa40aa9f69`. No Chrome do fundador, `/tools` mostrou 11 cards, `CollectionPage.mainEntity.numberOfItems=11`, copy de fronteira correta e link canônico; o clique abriu `/cheapest-ai-shorts-maker`, que carregou o Plan Fit com agenda padrão e a ressalva de confirmação no Checkout. `/facts` exibiu o fato, a ausência de conta/cartão/e-mail e o pricing canônico. Como a extensão do Chrome bloqueia diretamente `.txt` e `/api/*`, `/llms.txt` e `/api/facts` foram conferidos por HTTP público: status 200, `costPlanner.output=cost_plan`, URLs canônicas e contagem de 11 no índice. A Vercel registrou zero erro runtime agrupado nas cinco rotas nos 30 minutos consultados.

**DECISÃO OPERACIONAL DE CONTENÇÃO:** nenhuma submissão IndexNow, recrawl, e-mail, outreach, anúncio, TAAFT ou ampliação ativa de tráfego foi executada. A entrega aumenta a clareza para ChatGPT/crawlers e a continuidade do tráfego que já chega.

**QUESTÃO PENDENTE / DESCONHECIDO:** ainda não existe evidência de pessoa, checkout ou assinatura causada pelo 11º card ou pela nova citação AEO. Medir pessoas, não eventos, ligando entrada em `/tools`, clique para `/cheapest-ai-shorts-maker`, recomendação, checkout e pagamento do mesmo ator, excluindo contas internas.

**NÃO TOCADO:** `lib/checkoutPricing.ts`, preço, grant, desconto, oferta, SKU, Stripe server-side, webhook, Auth, schema Supabase, migration, Storage, pipeline de render, motor, cena, legenda, e-mail, outreach, IndexNow, TAAFT, anúncio ou vídeo de cliente. A validação no navegador emitiu apenas a telemetria normal já existente das páginas; nenhum evento ou schema foi alterado.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `0e9ee05` ou da ponta posterior de `origin/main`. Não adicionar o planejador a `FREE_TOOL_FACTS` nem criar uma segunda tabela de preço; o contrato próprio `PUBLIC_COST_PLANNER_FACT` existe para preservar a diferença entre texto e `cost_plan`. Claude continua capacidade/render; Codex continua aquisição/fluxo/assinaturas.

## 40. Aquisição SEO/AEO — Shorts Pay com autoridade oficial e atualização 2027 (29/08/2026)

**BASE DE CÓDIGO:** f741cd476d7b561b6b22a149f27e02e9d4966591, igual a origin/main no início da worktree isolada codex/growth-shorts-pay-authority.

**EVIDÊNCIA DE PRODUÇÃO / SEARCH CONSOLE (29/08/2026):** no relatório de três meses aberto no Chrome conectado do fundador, a consulta exata “how much do youtube shorts pay” acumulava 22 impressões, zero clique, CTR 0% e posição média 46,8; a única página associada era /how-much-do-youtube-shorts-pay. Impressão não é pessoa nem sessão. O dado orienta prioridade de ranking; não prova conversão.

**EVIDÊNCIA DE PRODUÇÃO / SERP OBSERVADA (29/08/2026):** a busca ao vivo no Google, feita no Chrome do fundador em São Paulo, mostrou AI Overview e resultados que combinavam resposta direta, fonte primária, atualização recente e exemplos ou calculadoras. A Kineo não apareceu na primeira página observada. Esta observação é localizada e pode variar por usuário e região; não é posição universal.

**FATO CONFIRMADO / ANTI-DUPLICAÇÃO:** a página já possuía resposta direta, tabela, o mesmo CalculatorClient da ferramenta pública e o mesmo TopicGeneratorForm do starter (app/how-much-do-youtube-shorts-pay/page.tsx:550,669). Não foi criado outro CTA, calculador, funil, preço ou oferta. O gap era autoridade e atualidade: a superfície dizia “updated July 2026”, não citava fonte primária e não incorporava a mudança oficial do YPP anunciada para fevereiro de 2027.

**FATO CONFIRMADO / FONTES PRIMÁRIAS (consulta em 29/08/2026):** YouTube Help confirma que a receita do Shorts Feed entra em um Creator Pool e que o criador mantém 45% do valor alocado; confirma também a regra vigente de 1.000 inscritos mais 10 milhões de Shorts qualificados em 90 dias ou 4.000 horas long-form em 12 meses. A atualização oficial passa a valer em 01/02/2027: novos criadores precisarão de 1.000 inscritos mais 20 milhões de Shorts qualificados em 90 dias ou 8.000 horas long-form em 365 dias; o status de membros atuais não é removido pela nova regra de entrada, e a remuneração mensal do Creator Pool exigirá manter 10 milhões de Shorts qualificados nos 90 dias anteriores.

**IMPLEMENTADO:** commit funcional 480dbeb7f95b3b81f05bbcee89e598db8058d553 atualiza a data visível, separa Official, Estimated e Already announced, liga três páginas oficiais do YouTube e distingue regra atual da regra de 2027 (app/how-much-do-youtube-shorts-pay/page.tsx:61-67,303-333,393-451,721-745). O intervalo de RPM continua explicitamente estimado; nenhum número foi promovido a taxa oficial.

**IMPLEMENTADO / DADOS ESTRUTURADOS:** a página publica Article JSON-LD com datePublished, dateModified, autor/publisher Kineo, canonical e assuntos (app/how-much-do-youtube-shorts-pay/page.tsx:196-220,239-243). FAQ visível e FAQPage continuam derivados da mesma coleção; metadata declara a atualização 2027 sem retirar as intenções de 1K e 1M views.

**TESTADO LOCALMENTE:** node scripts/test-shorts-pay-authority.mjs executou 40/40 verificações. A suíte trava fontes oficiais, datas, regras atual/futura, Article JSON-LD, distinção oficial/estimativa e preservação de calculadora, starter e CTA. O whitespace ficou limpo. npx tsc --noEmit repetiu somente os quatro erros baseline em app/api/admin/_shared/mrr.ts:113, app/api/me/subscription/route.ts:71 e app/api/stripe/checkout/route.ts:548,569; nenhum erro novo.

**COMPARAÇÃO VISUAL:** docs/previews/SHORTS-PAY-AUTHORITY-2026-08-29.html contém antes/depois desktop, mobile de 375 px e a separação presente/futuro. O preview e a página Next real foram servidos localmente e inspecionados no Chrome conectado do fundador; hierarquia, quebras e fontes ficaram legíveis.

**VALIDADO EM PRODUÇÃO (29/08/2026):** deploy automático Vercel dpl_6r9CXt2JqFFi9BTkrKFa8noKqVuf chegou a READY, target production, aliases incluindo www.usekineo.com, ligado ao SHA exato 480dbeb7f95b3b81f05bbcee89e598db8058d553. No Chrome do fundador, a URL canônica exibiu o bloco verificado, regra de 2027, calculadora, starter e fontes. O documento publicou Article com dateModified=2026-08-29 e canonical correto. A Vercel registrou zero erro runtime agrupado na rota nos 15 minutos consultados.

**DECISÃO OPERACIONAL DE CONTENÇÃO:** nenhuma submissão IndexNow, solicitação de recrawl, e-mail, outreach, anúncio, TAAFT ou ampliação ativa de tráfego foi executada. O trabalho melhora a resposta para Google/ChatGPT e a confiança do tráfego que já chega, sem pressionar o incidente de capacidade.

**QUESTÃO PENDENTE / DESCONHECIDO:** não existe ainda evidência de clique, pessoa, checkout ou assinatura causada por esta atualização. Search Console pode levar dias para refletir reprocessamento. Medir a consulta e a página em janelas comparáveis e ligar entrada → uso da calculadora/starter → vídeo → checkout → pagamento do mesmo ator, excluindo contas internas.

**NÃO TOCADO:** lib/checkoutPricing.ts, preço, grant, desconto, oferta, SKU, Stripe, Auth, Supabase, Storage, migration, banco, pipeline de render, motor, cena, legenda, e-mail, outreach, IndexNow, TAAFT, anúncio ou vídeo de cliente.

**PRÓXIMO DONO:** Claude deve executar git fetch origin e partir de 480dbeb ou da ponta posterior de origin/main. Não remover as fontes primárias nem substituir o intervalo estimado por uma suposta taxa oficial do YouTube. Claude continua capacidade/render; Codex continua aquisição/fluxo/assinaturas.

## 41. Decisão do trial — manter 25 créditos e medir premium-first (29/08/2026)

**EVIDÊNCIA DE PRODUÇÃO / COORTES MADURAS (consulta em 29/08/2026):** grants de 25 créditos tiveram 42 pessoas maduras, 17 ativadas, 5 no checkout e 1 paga; 40 créditos tiveram 277, 161, 45 e 2; 50 créditos tiveram 124, 70, 15 e 0; 80 créditos tiveram 27, 16, 5 e 0. Entre 470 trials maduros, 22 zeraram (6 checkout, 1 paga), 257 gastaram parcialmente (46, 2) e 191 não gastaram (18, 0). São pessoas externas, com contas internas excluídas. A relação é direcional e confundida por período/política; não prova que zerar saldo causa compra.

**EVIDÊNCIA DE PRODUÇÃO / ÚLTIMOS 20 EXTERNOS (consulta em 29/08/2026):** 20 cadastros, 11 vídeos concluídos, 9 sem vídeo, 8 primeiros vídeos Fast, 3 premium, 4 pessoas no checkout e 0 pagas. Quinze ainda tinham saldo igual ou superior a 20. O maior volume perdido continua antes da primeira entrega; crédito adicional não ativa quem nunca clicou.

**DECISÃO OPERACIONAL:** manter 25 créditos. Não aumentar, reduzir, retirar Kineo 1 nem adicionar expiração de 24–48h enquanto a política premium-first recém-publicada ainda não formou coorte. Seedance continua recomendado quando elegível; Kineo 1 continua disponível como alternativa. A métrica principal é pagamento por 100 cadastros externos; cortes obrigatórios: primeiro motor, entrega, saldo, oferta, checkout e pagamento por pessoa.

**CONTENÇÃO DE REATIVAÇÃO:** COMEBACK50 pode seguir apenas para os 40 abandonadores de checkout, com dedupe, exclusões e sem empilhamento. Não conceder +25 automaticamente a toda a base de 204 zerados com vídeo. Se a concessão já saiu, isolar a coorte e não reenviar; se não saiu, preferir benefício resgatável, individual e curto. Para quem nunca gastou, enviar ativação para primeira criação, não mais saldo.

**NÃO TOCADO:** preço, grant, expiração, engine entitlement, código, Stripe, Supabase schema, render, e-mail da onda Claude ou lista de destinatários.

## 42. Aquisição B2B — três parceiros complementares contatados (29/08/2026)

**FATO CONFIRMADO / ANTI-DUPLICAÇÃO:** a busca no Gmail não encontrou conversa anterior com Shortimize, Creator Hooks ou Viral Ideas. As páginas oficiais confirmaram contatos públicos e encaixe complementar: pesquisa/analytics antes da produção ou overflow de agência. Não foi repetido contato com Fyre Interactive, NexLev, VidPros, Feedbird, 1of10, Subscribr, YT Growth, Gundrux, Faceless University, So geht YouTube ou One Frame Media.

**EXECUTADO / COMUNICAÇÃO EXTERNA AUTORIZADA:** três mensagens personalizadas foram enviadas por `joseph@usekineo.com`:

- Shortimize — `support@shortimize.com` — assunto `Shortimize finds the winning Short — Kineo can produce the next one` — Gmail `1a0503d76491ba2a` — UTM `shortimize_partner / founder_outreach / b2b_loop_20260829`.
- Creator Hooks — `support@creatorhooks.com` — assunto `From a Creator Hooks idea to a finished Short` — Gmail `1a0503d676776be0` — UTM `creatorhooks_partner / founder_outreach / b2b_loop_20260829`.
- Viral Ideas — `info@viralideamarketing.com` — assunto `A production overflow test for one short-form brief` — Gmail `1a0503d875c25bc3` — UTM `viralideas_partner / founder_outreach / b2b_overflow_20260829`.

**EVIDÊNCIA DE PRODUÇÃO / AFILIADOS (consulta em 29/08/2026):** ColorMango tinha 4 cliques/4 hashes únicos, ToolRiot 0 e os outros afiliados 14 eventos/6 hashes únicos; todos tinham 0 cadastro referido, 0 conversão e 0 comissão. Portanto a lista existente ainda não produziu pessoa ou pagamento referido. Não confundir clique com aquisição.

**PRÓXIMA REGRA:** aguardar resposta ou bounce antes de follow-up; não duplicar esses três envios. Priorizar novos parceiros complementares em vez de aumentar a cadência sobre a lista inativa.

## 43. Conversão pós-vídeo — Plan Fit no primeiro slot comercial (29/08/2026)

**BASE DE CÓDIGO:** `e86710c86b5474a74ee362c46bfd9d313ff8c21c`, igual ao remoto confirmado diretamente no início da worktree isolada `codex/planfit-first-slot`.

**EVIDÊNCIA DE PRODUÇÃO / PRIMEIRA COORTE PREMIUM-FIRST (29/08/2026):** depois do deploy `e86710c`, houve 1 cadastro externo, origem TAAFT. A pessoa clicou no onboarding, iniciou Seedance, superou uma primeira tentativa curta, concluiu o filme às 01:15:40 UTC e gerou `video_ready_viewed` às 01:15:57 UTC. Não houve `trial_post_video_offer_viewed`, `plan_fit_impression`, checkout ou pagamento. O vídeo foi entregue; isto corrige a leitura inicial de falha terminal.

**FATO CONFIRMADO / CAUSA DE INTERFACE:** `planFitOwnsRecurringSlot` suprime corretamente a oferta recorrente do trial e o upsell genérico. Porém o único `<PlanFitCard>` estava depois de compartilhamento, próximo episódio, YouTube, avaliação, próximos passos e `NextShortsSection` em `app/(dashboard)/generate/GenerateClient.tsx`. O componente só registra impressão quando 35% entra no viewport. Assim, o produto podia entregar valor, remover as outras ofertas e deixar a única resposta comercial várias ações abaixo da dobra.

**IMPLEMENTADO:** commit `e41256f88c714779161774612bad825c0ce49b4b` move o mesmo `PlanFitCard` para imediatamente depois do player e do download, antes das ações secundárias. Elegibilidade, cálculo, moeda canônica, telemetria, verificação de primeira entrega e checkout protegido permaneceram idênticos. O link `Not now` continua preservando o restante da tela. Nenhum preço, grant, trial ou oferta foi alterado.

**TESTADO LOCALMENTE:** `node scripts/test-plan-fit.mjs` executou 326/326 verificações; `node scripts/test-trial-post-video-primary.mjs`, 45/45. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit` repetiu somente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:550,571`; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/PLAN-FIT-FIRST-SLOT-2026-08-29.html` contém antes/depois desktop e mobile. Foi servido localmente e inspecionado no Chrome conectado do fundador. A comparação confirma: download primeiro; Plan Fit logo abaixo; ações de share/retenção depois; sem duas ofertas recorrentes simultâneas.

**VALIDADO EM PRODUÇÃO (29/08/2026 BRT):** deploy Vercel `dpl_2VWQ3E73atRETtnXiB6fVfzpoFqt` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, ligado ao SHA exato `e41256f88c714779161774612bad825c0ce49b4b`. A página autenticada `/studio/create` carregou no Chrome real. A Vercel encontrou zero erro runtime nos 10 minutos consultados.

**BASELINE PÓS-DEPLOY:** entre 01:34:14 UTC e 01:35:28 UTC ainda havia 0 novo cadastro externo, 0 entrega, 0 impressão Plan Fit, 0 checkout e 0 pagamento. Impacto de conversão permanece `QUESTÃO PENDENTE` até a próxima primeira entrega externa; ausência de tráfego nesse minuto não é reprovação.

**NÃO TOCADO:** `components/growth/PlanFitCard.tsx`, cálculo, preço, grant, desconto, Stripe server-side, webhook, Auth, migration, Storage, render, motor, cena, legenda, e-mail, outreach ou vídeo de cliente.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `e41256f` ou da ponta posterior de `origin/main`. Não mover o Plan Fit de volta para depois de `NextShorts` e não reintroduzir outra oferta recorrente no primeiro slot. Claude continua capacidade/render; Codex continua aquisição/fluxo/assinaturas.

## 44. Aquisição por parceiros — atribuição afiliada fecha no cadastro (29/08/2026)

**EVIDÊNCIA DE PRODUÇÃO / ESTOQUE HISTÓRICO (consulta em 29/08/2026):** `affiliate_clicks` tinha 18 linhas para quatro afiliados externos e `affiliate_referrals` tinha zero pessoa. Cinco das 18 linhas declaravam user agents de bot/crawler; os demais cliques não podem ser promovidos a pessoas sem identidade comum. Seis perfis externos nasceram até 15 minutos depois de algum clique, mas traziam fontes TAAFT, ChatGPT, indicação Kineo ou vazias; proximidade temporal não prova atribuição e não foi contada como conversão afiliada.

**FATO CONFIRMADO / CAUSA DE FLUXO:** `AffiliateAutoTrigger` estava montado somente em `app/(dashboard)/layout.tsx`. O cadastro por e-mail já aguardava `/api/auth/activation-completed` e então podia navegar para a home pública; OAuth/confirmação também podiam terminar na home por `app/auth/callback/route.ts`. Portanto uma conta válida podia existir sem aparecer no painel do parceiro até entrar mais tarde no dashboard ou abrir checkout. A prova financeira permanecia em cookie por 90 dias e o checkout tinha fallback, então isto era atraso estrutural de reconhecimento, não prova de perda definitiva de comissão.

**IMPLEMENTADO:** commit funcional `076ca7bb9cddc8d5fabbe79c57265db8d712d27a` adiciona `lib/affiliateSignupFinalization.ts` e chama a mesma primitiva protegida `attributeAffiliateForUser` nos dois pontos autoritativos de criação: callback OAuth/confirmação e ativação aguardada do cadastro por e-mail. A prova continua exigindo click UUID server-owned, conta criada depois do clique, afiliado ativo e first-touch único. O trigger do dashboard e o fallback pré-Stripe permanecem como retries.

**IMPLEMENTADO / FALHA SEGURA:** sucesso e rejeições terminais limpam código, prova e hint; falhas transitórias preservam os cookies para retry. Cadastro sem cookie faz zero consulta e zero evento. A telemetria nova `affiliate_signup_attribution_result` grava apenas `source`, outcome limitado e estado idempotente; não grava código do afiliado, click UUID, e-mail, prompt ou segredo.

**TESTADO LOCALMENTE:** `node scripts/test-affiliate-attribution.mjs` executou 91/91 verificações; `node scripts/test-affiliate-destinations.mjs`, 230/230; `node scripts/test-trial-grant-orfao.mjs`, 14/14. As provas cobrem no-cookie, atribuição nova, first-touch existente, proof inválido, falha transitória, privacidade da telemetria, ordem trial → atribuição → redirect e o caminho direto por e-mail. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit` repetiu somente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:550,571`; nenhum erro novo.

**VALIDADO EM PRODUÇÃO (29/08/2026 BRT):** push remoto confirmado diretamente em `076ca7bb9cddc8d5fabbe79c57265db8d712d27a`. Deploy Vercel `dpl_GedMFcgsoZTR3iSpayor1RFVhjhQ` chegou a `READY`, target `production`, aliases incluindo `www.usekineo.com`, no SHA exato. O Chrome conectado do fundador carregou a produção e a sessão autenticada navegou normalmente para `/studio`. A Vercel encontrou zero erro runtime nas rotas `/auth/callback` e `/api/auth/activation-completed` nos 10 minutos consultados.

**BASELINE PÓS-DEPLOY:** desde 01:57:51 UTC até a consulta imediata havia zero novo clique afiliado, zero signup concluído, zero resultado de atribuição e zero referral. Isto confirma ausência de tráfego elegível na janela, não sucesso comercial. A primeira validação causal exige um novo visitante seguir um link com prova, criar conta no mesmo navegador e produzir exatamente um referral/um evento.

**SEM COMPARAÇÃO VISUAL:** não houve mudança de interface, copy ou layout; a entrega é exclusivamente server-side no momento do cadastro.

**NÃO TOCADO:** preço, grant, expiração, oferta, Stripe Session, webhook, comissão, schema, migration, Storage, render, motor, cena, legenda, e-mail, outreach, vídeo de cliente ou dados existentes.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `076ca7b` ou da ponta posterior de `origin/main`. Não remover os retries do dashboard/checkout nem afrouxar a prova server-owned. Claude continua capacidade/render; Codex continua aquisição/fluxo/assinaturas.

## 45. Coordenação comercial — trial congelado e segunda onda B2B (29/08/2026)

**FATO CONFIRMADO / ANTI-DUPLICAÇÃO DO TRIAL:** a proposta de tornar Seedance o padrão do trial já estava implementada em `app/(dashboard)/generate/GenerateClient.tsx`: trial elegível e sem escolha explícita abre `cinematic_ai/seedance`; entradas com `engine=` explícito, `create_intent=fast` e Viral Now preservam Fast. Também já estavam em produção os dois caminhos de `lib/growth/trialBalanceBridge.ts`: 25 créditos intactos preparam um Seedance de 60s, e o saldo pós-Fast de 20–21 créditos prepara um Seedance de 35s. Não foi escrita uma terceira implementação.

**EVIDÊNCIA DE PRODUÇÃO / COORTE IMATURA (consulta em 30/08/2026 UTC):** depois de 22:50 UTC de 29/08, apenas uma pessoa externa em trial gerou `trial_active_banner_shown`; ela tinha uso zero. Não houve `trial_first_delivery_clicked`, `trial_balance_bridge_viewed` ou `trial_balance_bridge_clicked` nessa janela. Uma exposição não prova sucesso nem fracasso.

**DECISÃO OPERACIONAL:** manter o grant em 25 créditos e preservar o experimento de prazo existente por 72 horas, sem aumentar, reduzir ou trocar por 24–48h durante a formação da nova coorte. O resultado comercial deve ser lido por pessoa externa na sequência cadastro → primeira entrega/motor → ponte → checkout → pagamento em até 72 horas. Não conceder +25 automaticamente aos 204 usuários zerados com vídeo; se alguma concessão já saiu, não retirar e isolar a coorte. Para os 40 abandonadores de checkout, preservar controle sem desconto se o disparo ainda não tiver ocorrido.

**FATO CONFIRMADO / PESQUISA DE PARCEIROS:** as páginas oficiais confirmaram encaixes complementares e contatos públicos: Content Beta produz short-form para B2B SaaS e AI; inBeat combina UGC, criadores e performance; Blend Collective oferece produção white-label e repurposing para agências. A busca no Gmail por nomes, domínios, remetentes e destinatários encontrou zero conversa anterior com os três.

**EXECUTADO / COMUNICAÇÃO EXTERNA AUTORIZADA:** três mensagens diferentes foram enviadas por `joseph@usekineo.com` e reconfirmadas na pasta Sent:

- Content Beta — `info@contentbeta.com` — assunto `An AI-faceless overflow lane for Content Beta briefs` — Gmail `1a0507378136b69d` — UTM `contentbeta_partner / founder_outreach / b2b_ai_overflow_20260830`.
- inBeat — `hello@inbeat.agency` — assunto `A faceless test lane beside inBeat’s creator ads` — Gmail `1a05073a54a9d934` — UTM `inbeat_partner / founder_outreach / b2b_creative_test_20260830`.
- Blend Collective — `info@blendcollective.eu` — assunto `White-label faceless Shorts for briefs without footage` — Gmail `1a05073d5b64beb1` — UTM `blendcollective_partner / founder_outreach / b2b_whitelabel_overflow_20260830`.

**LIMITES DA PROMESSA:** os e-mails propõem um exemplo em um brief adequado, não volume, SLA, desconto, comissão, white-label contratual ou resultado de campanha. Content Beta recebeu proposta de overflow sem footage; inBeat, uma faixa faceless complementar aos criadores; Blend, overflow white-label para brief sem gravação. Não foi usado blast nem template idêntico.

**PRÓXIMA REGRA:** não fazer follow-up antes de resposta ou bounce e não repetir estes três contatos. Qualquer reply deve ser tratado como lead humano distinto; abertura não é lead, UTM não é pessoa e resposta positiva ainda não é assinatura. Claude não deve alterar grant, prazo ou premium-first enquanto esta coorte de 72 horas está formando; Codex mede conversão e continua aquisição B2B.

## 46. Aquisição paga — TAAFT sem novo orçamento por enquanto (30/08/2026)

**EVIDÊNCIA DE PRODUÇÃO / CONCLUSÃO PRIVADA:** a auditoria financeira e de coorte foi feita fora deste repositório público. A listagem TAAFT produz descoberta, cadastro, vídeo e checkout, mas ainda não demonstrou assinatura atribuível suficiente para justificar um segundo relançamento ou PPC. Os números internos e identificadores de e-mail não são publicados aqui.

**FATO CONFIRMADO / SUPERFÍCIE PÚBLICA:** a listagem observada ainda descrevia uma versão antiga da Kineo e menos motores do que o catálogo atual.

**DECISÃO OPERACIONAL:** não comprar outro relançamento e não iniciar PPC agora. Antes de qualquer teste pago futuro, exigir listagem atualizada, UTMs próprias, orçamento limitado e leitura por pessoa de signup → vídeo → checkout → pagamento.

**EXECUTADO / COMUNICAÇÃO EXTERNA AUTORIZADA:** foi enviada uma resposta ao contato comercial da TAAFT pedindo atualização da listagem e confirmação de UTMs customizadas. Nenhum número interno de funil foi compartilhado. Aguardar resposta; não duplicar contato.

## 47. Aquisição ChatGPT — Kineo 1 carrega uma ideia concreta (30/08/2026)

**BASE DE CÓDIGO:** `f775ef276187b0aa18de23e1d5c8bd5577c79038`, remoto confirmado diretamente no início da worktree isolada `codex/kineo1-topic-starter`.

**EVIDÊNCIA DE PRODUÇÃO / CONCLUSÃO PRIVADA:** no recorte auditado, a campanha da página Kineo 1 ativou proporcionalmente menos pessoas do que as páginas orgânicas que pedem uma ideia antes do cadastro. Os números por campanha permanecem fora deste repositório público. A diferença sustenta uma hipótese de ativação; não prova causalidade de assinatura.

**FATO CONFIRMADO / CAUSA DE FLUXO:** `app/ai-video-generator/[engine]/page.tsx` enviava hero, CTA final e sticky do Kineo 1 ao signup sem prompt. As páginas de maior ativação reutilizam `TopicGeneratorForm`, que transporta prompt, campanha e intenção de criação. O contrato `create_intent=fast` corresponde exatamente a Kineo 1; aplicar o mesmo autostart a páginas premium poderia trocar o motor prometido, por isso a mudança é exclusiva do Fast.

**IMPLEMENTADO:** commit funcional `3a0f4f4b646bd7861a0b897dd2e7986adf1017dc` faz os três CTAs do Kineo 1 apontarem para o starter na própria página. A pessoa digita ou escolhe uma ideia, e o componente compartilhado leva a ideia e a campanha pelo cadastro até a criação automática no Kineo 1. O smoke encontrou uma borda de sessão já autenticada que pulava o signup e perdia o handoff; o commit `b0b2a774735bc5666db7f5ac041c87f028dded79` adiciona um redirect interno limitado que preserva prompt, Fast e campanha sem mudar os demais callers. Seedance, Kling, Veo, H3, Omni e Hollywood preservam o caminho anterior; preço, grant e custo de motor não mudaram.

**TESTADO LOCALMENTE:** `test-engine-landing-intent.mjs` passou 121/121; `test-public-creation-intent.mjs`, 64/64; `test-organic-premium-first.mjs`, 24/24. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit` repetiu somente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:550,571`; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/KINEO1-TOPIC-STARTER-2026-08-30.html` contém antes/depois desktop e mobile. O Chrome recusou arquivo local por política de URL; não houve tentativa de contorno.

**VALIDADO EM PRODUÇÃO (30/08/2026 UTC):** deploy Vercel `dpl_DYYGP3RFjiwP174pLY1JhszuLf2x` chegou a `READY`, target production, aliases incluindo `www.usekineo.com`, ligado ao SHA `b0b2a774735bc5666db7f5ac041c87f028dded79`. No Chrome autenticado do fundador, a página exibiu o starter; o envio digitado e o exemplo de um clique chegaram a `/studio/create` com o prompt, `intent_campaign=seo_engine_kineo-1` e Fast selecionado. A conta paga não iniciou render automaticamente. A Vercel encontrou zero erro runtime nas rotas consultadas nos 15 minutos.

**QUESTÃO PENDENTE / DESCONHECIDO:** impacto comercial exige nova pessoa externa seguir starter → signup → primeira entrega → ponte de saldo → checkout → pagamento. Não comparar eventos brutos nem promover uma sessão a pessoa.

**NÃO TOCADO:** preço, grant de 25, expiração, checkout, Stripe, Auth server-side, Supabase schema, migration, Storage, render, motor, cena, legenda, e-mail da onda Claude ou vídeo de cliente.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `b0b2a77` ou da ponta posterior de `origin/main`. Não duplicar o starter no Kineo 1, não aplicá-lo automaticamente aos motores premium e não mexer no grant enquanto a coorte de 72 horas está formando.

## 48. Aquisição B2B — pacote de marketplace pronto e card exclusivo (30/08/2026)

**FATO CONFIRMADO / ANTI-DUPLICAÇÃO:** `docs/ROADMAP.md` já aprovava o EXP-G2 em marketplaces, e a oferta self-service B2B já estava implementada em `/ai-shorts-for-agencies`, derivada de `BULK_PACKS`. Nenhuma segunda oferta foi criada.

**FATO CONFIRMADO / CORREÇÃO DE DIAGNÓSTICO:** `/og-card.png` já existia como rota dinâmica em `app/og-card.png/route.tsx`; por precedência de rota, ela vence qualquer arquivo homônimo em `public/`. O primeiro commit adicionou assets mortos e não alterou a produção. O smoke no Chrome revelou o card geral antigo e impediu a classificação incorreta. O forward-fix preserva esse card geral e dá à página B2B uma URL exclusiva.

**IMPLEMENTADO:** `public/og-agency-card.svg` é a fonte determinística, e `public/og-agency-card.png` é a exportação 1200×630. A metadata de `/ai-shorts-for-agencies` usa apenas essa URL; o restante do produto continua em `/og-card.png`. O texto é exato, sem lettering gerado: Kineo, 10–30 AI Shorts for your business, TikTok/Reels/YouTube Shorts e script/voice/visuals/captions. `docs/previews/OG-CARD-FIVERR-2026-08-30.html` compara o card geral anterior, o B2B novo e o corte seguro do marketplace.

**TESTADO LOCALMENTE:** `node scripts/test-b2b-bulk-page.mjs` passou 32/32, incluindo a URL B2B exclusiva e a ausência do fallback genérico na metadata da página. O PNG mede exatamente 1200×630; SVG e preview foram inspecionados visualmente no Chrome. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit` repetiu somente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:550,571`; nenhum erro novo.

**VALIDADO EM PRODUÇÃO (30/08/2026 BRT):** o forward-fix `e54939ca9f80c92cb7308ee00019d332c92f5c1e` chegou a `READY` no deploy Vercel `dpl_8hGQaiKHDds1v11cn49NSF1gygZc`, aliases incluindo `www.usekineo.com`. No Chrome do fundador, `/og-agency-card.png` respondeu 1200×630 com a arte B2B; `/og-card.png` permaneceu 1200×630 com a arte geral. A página `/ai-shorts-for-agencies` publicou `og:image` e `twitter:image` exatamente na URL exclusiva. A Vercel encontrou zero erro runtime na rota B2B nos 15 minutos consultados.

**PACOTE COMERCIAL PRONTO:** `docs/FIVERR-LISTING-2026-08-30.md` contém título, categoria, tags, descrição, divulgação explícita de IA, requisitos, FAQ e três pacotes já aprovados: 10/$99, 20/$179 e 30/$249. A promessa não inclui ator humano, source-footage editing, white-label software, portal de aprovação ou revisões ilimitadas. Pagamento e comunicação permanecem dentro do marketplace.

**QUESTÃO PENDENTE / AÇÃO HUMANA:** a plataforma exigiu sua própria verificação humana antes da criação da listagem. Não houve tentativa de contorno. Depois que o fundador concluir essa etapa na interface, o pacote está pronto para preenchimento e publicação.

**MÉTRICA:** pedido pago no marketplace em 30 dias. Impressão, clique, mensagem de vendedor e spam não são venda. Registrar URL pública e timestamp UTC quando a listagem sair.

**NÃO TOCADO:** preço, grant, trial, expiração, Stripe, Supabase, render, motor, cena, legenda, vídeo de cliente ou e-mail da onda Claude.

## 49. Conversão do trial — decisão mantida e fallback nativo alinhado (30/08/2026)

**EVIDÊNCIA DE PRODUÇÃO / DECISÃO OPERACIONAL:** o recorte compartilhado pelo fundador separou três problemas: parte das pessoas não inicia vídeo; Seedance consome o trial no primeiro filme; Kineo 1 deixa 20–21 créditos. A coorte ainda está formando e já existe ponte pós-Fast. Portanto o grant permanece em 25 créditos; não aumentar, reduzir nem encurtar a validade durante esta leitura.

**FATO CONFIRMADO / ANTI-DUPLICAÇÃO:** o default autenticado do Studio já escolhia Seedance para trial ativo com saldo suficiente, e `lib/growth/trialBalanceBridge.ts` já preparava um Seedance de 35s para o saldo pós-Fast. O formulário `HomeTopicForm` é montado somente dentro de `referralBridge`, que exige visitante deslogado; portanto a prop `isSignedIn=true` não é alcançada pelo caller atual. A submissão normal com JavaScript já construía `create_intent=trial_best`. O literal `fast` restante governava apenas o fallback nativo sem JavaScript.

**IMPLEMENTADO / ESCOPO HONESTO:** o fallback nativo do formulário de referência passa a enviar `create_intent=trial_best`, alinhado ao caminho JavaScript já existente. A política `resolveActivationRenderEngine` continua sendo a autoridade: Seedance somente para trial confirmado pelo servidor e saldo suficiente; Fast para estado inelegível ou incerto. Isto é progressive enhancement de borda, não a causa dos sete primeiros vídeos Fast observados e não deve ser promovido como principal ganho de conversão.

**TESTADO LOCALMENTE:** `node scripts/test-trial-best-activation.mjs` passou 27/27; `node scripts/test-home-referral-bridge.mjs`, 66/66; `node scripts/test-public-creation-intent.mjs`, 64/64. O teste novo exige que a home peça o rail protegido e rejeita a volta do literal Fast. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit` repetiu somente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:550,571`; nenhum erro novo.

**VALIDADO EM PRODUÇÃO (30/08/2026 BRT):** deploy Vercel `dpl_CPFSVyR6p7bMd32Rrt4ZtqnFxJkL` chegou a `READY` no SHA `430f5104a548727c246a0a67c356b9edaab7c696`, aliases incluindo `www.usekineo.com`. O smoke autenticado mostrou corretamente que o formulário não existe nessa condição, o que derrubou a primeira interpretação e limitou a classificação ao fallback deslogado.

**SEM COMPARAÇÃO VISUAL:** a interface, a copy e o layout não mudaram. A entrega altera somente o valor oculto do contrato de criação e mantém o mesmo botão, formulário e destino.

**NÃO TOCADO:** grant, prazo do trial, preço, oferta pública, Stripe, Supabase, render, motor, cena, legenda, e-mail da onda Claude ou vídeos existentes.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir deste commit ou da ponta posterior de `origin/main`. Não adicionar outro default Seedance, não remover a ponte de 35s e não alterar o grant durante a coorte atual. Codex continua aquisição/fluxo/assinaturas.

## 50. Conversão pós-Fast — ponte gratuita ganha precedência sobre Plan Fit (30/08/2026)

**EVIDÊNCIA DE PRODUÇÃO / CONCLUSÃO PRIVADA:** uma auditoria por pessoa, com contas internas excluídas, encontrou usuários com primeira entrega Fast e saldo compatível com a ponte, mas nenhuma impressão da superfície. Os números e identificadores da coorte permanecem fora deste repositório público.

**FATO CONFIRMADO / CAUSA DE FLUXO:** `planFitOfferCandidate` era calculado antes da decisão `trialBalanceBridge`. Para uma primeira entrega Fast, o Plan Fit reservava `planFitOwnsRecurringSlot`, fazia `showTrialPostVideoOffer` ficar falso e impedia o JSX da ponte de existir. Assim, a oferta mensal podia suprimir a próxima experiência gratuita já financiada pelo saldo do trial. Se o Plan Fit também não entrasse no viewport, a tela terminava sem qualquer ação comercial medida.

**IMPLEMENTADO:** `decideTrialBalanceBridge` agora roda imediatamente após a fase pós-vídeo canônica. Quando a ponte é elegível, `planFitOfferCandidate` fica falso, o slot do trial permanece disponível e o card de Seedance de 35s é a única ação pós-entrega. Plan Fit continua intacto para todas as coortes em que a ponte não se aplica. O CTA apenas prepara Studio com motor e duração; não chama fornecedor, não analisa, não gera, não reserva nem gasta crédito.

**TESTADO LOCALMENTE:** `node scripts/test-trial-balance-bridge.mjs` passou 144/144; `node scripts/test-plan-fit.mjs`, 327/327; `node scripts/test-trial-post-video-primary.mjs`, 45/45. As novas asserções exigem que a ponte seja resolvida antes do candidato Plan Fit e que Plan Fit recue quando o próximo passo já está pago. `npx tsc --noEmit` repetiu somente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:550,571`; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/TRIAL-BRIDGE-FIRST-SLOT-2026-08-30.html` mostra antes/depois desktop e o estado mobile. Foi servido localmente e inspecionado no Chrome conectado do fundador. Antes: calculadora de assinatura ocupa o primeiro slot mesmo com saldo de trial. Depois: o Seedance já financiado lidera, sem cartão e sem disparo automático.

**VALIDADO EM PRODUÇÃO (30/08/2026 BRT):** commit `10efc06fad93e9af7955ff2ea84ac26bb23c6d8a` chegou a `READY` no deploy Vercel `dpl_C2tASLXDsqERLBfznvuy9gckD7rN`, aliases incluindo `www.usekineo.com`. O Studio abriu no Chrome conectado e a Vercel encontrou zero erro runtime em `/studio` e `/studio/create` nos 15 minutos consultados. Não houve render, reserva ou débito no smoke. A validação causal da nova precedência depende da próxima primeira entrega Fast de um trial externo elegível.

**NÃO TOCADO:** grant, prazo do trial, preço, Stripe, Supabase schema/dados, Plan Fit matemático, render, motor, cena, legenda, e-mail da onda Claude ou vídeos existentes.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` antes de continuar. Não reintroduzir Plan Fit à frente da ponte, não duplicar o card e não contar impressão como conversão; a primeira prova causal é pessoa elegível ver → clicar → concluir Seedance → iniciar checkout → pagar.

## 51. Ativação do trial — primeira missão premium já chega preenchida (30/08/2026)

**EVIDÊNCIA DE PRODUÇÃO / CONCLUSÃO PRIVADA:** a leitura por pessoa separou três coortes que não devem ser misturadas: quem ainda não iniciou vídeo, quem começou pelo Fast e manteve saldo e quem começou por premium. O recorte não demonstrou que zerar o saldo no premium produz pagamento, nem que mudar de três para sete dias melhora assinatura. Os números e identificadores permanecem fora deste repositório público.

**DECISÃO OPERACIONAL:** manter o grant de 25 créditos e a validade atual. Não aumentar, reduzir, bloquear o Fast ou impor expiração de 24–48 horas enquanto a coorte premium-first e a ponte pós-Fast ainda estão formando. Desconto também não deve ser tratado isoladamente como solução do checkout.

**FATO CONFIRMADO / CAUSA DE ATIVAÇÃO:** `components/TrialActiveBanner.tsx` anunciava “Make my included Seedance film”, selecionava Seedance e 60s, mas navegava ao Studio sem `prompt`. A pessoa chegava a um campo de ideia vazio e precisava reconstruir a decisão que o CTA dizia ter resolvido. Este é um defeito de ativação antes do vídeo; não é falha do render nem prova de causa do abandono de checkout.

**IMPLEMENTADO:** `lib/growth/onboardingGoals.ts` ganhou um construtor reutilizável de URL do Studio. O primeiro CTA premium do trial agora abre `/studio` com Seedance, 60s, a pauta canônica editável `The disappearance nobody solved in 70 years`, `onboarding_goal=creator` e campanha isolada `trial_first_seedance_60s_v1`. Não envia `autoanalyze`, `create_intent`, request de fornecedor, reserva ou débito. A pessoa vê e pode editar tudo antes de clicar em gerar. A escada pós-Fast permanece inalterada.

**TESTADO LOCALMENTE:** `node scripts/test-trial-balance-bridge.mjs` passou 156/156; `test-home-welcome-goal-router.mjs`, 52/52; `test-onboarding-goal-router.mjs`, 74/74 — 282 verificações determinísticas. `npx tsc --noEmit` repetiu somente os quatro erros baseline em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:71` e `app/api/stripe/checkout/route.ts:550,571`; nenhum erro novo. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo.

**COMPARAÇÃO VISUAL:** `docs/previews/TRIAL-FIRST-DELIVERY-PREFILL-2026-08-30.html` mostra antes/depois desktop e depois mobile. Antes, o CTA terminava no campo vazio; depois, o cockpit abre com a missão pronta e editável.

**VALIDADO EM PRODUÇÃO (30/08/2026 BRT):** o commit funcional `ac59bca17aa71d1069237c4f1a624161148cbd6a` chegou a `READY` no deploy Vercel `dpl_BQDqWH1FvoYyADL7uAr7PBKxDLiE`, target production. No Chrome autenticado do fundador, `/studio` abriu com Seedance 1.5, 60s e a pauta canônica preenchida. Nenhum botão de geração foi clicado, portanto não houve render nem gasto. A Vercel encontrou zero erro runtime em `/studio` nos 30 minutos consultados.

**QUESTÃO PENDENTE / DESCONHECIDO:** impacto comercial exige medir novas pessoas por `intent_campaign=trial_first_seedance_60s_v1` até primeira entrega, checkout e pagamento. Não interpretar saldo zero, clique, render ou checkout como assinatura.

**NÃO TOCADO:** preço, grant, validade, Stripe, Supabase, render, cena, legenda, e-mails da onda Claude ou vídeos existentes.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `ac59bca1` ou da ponta posterior de `origin/main`. Não duplicar o prefill, não adicionar auto-start e não mudar o grant durante a leitura desta coorte. Claude continua com a onda já em execução; Codex continua aquisição, fluxo e assinatura.

## 52. Conversão final — checkout recorrente deixa de morrer em duas horas (30/08/2026)

**EVIDÊNCIA DE PRODUÇÃO / CONCLUSÃO PRIVADA:** a auditoria ao vivo do Stripe mostrou compradores externos recentes atingindo exatamente o `expires_at` de aproximadamente duas horas configurado pela própria Kineo. Isso significa que “expired” não era uma duração escolhida pela Stripe nem prova de objeção imediata: era a aplicação fechando a página de pagamento. A recuperação por e-mail já produziu algum pagamento posterior e, portanto, foi preservada; os números por pessoa permanecem fora deste repositório público.

**FATO CONFIRMADO / CAUSA DE FLUXO:** `app/api/stripe/checkout/route.ts` substituía o prazo padrão por `checkoutWindow * 300 + 2 * 60 * 60`. Ao mesmo tempo, o produto armazenava o checkout para retomada e mostrava uma superfície de “saved checkout”. Depois de duas horas, essa retomada não podia mais abrir a sessão original.

**IMPLEMENTADO:** o checkout recorrente permanece aberto entre 23h55m e 24h, limite aceito pela Stripe. `lib/growth/checkoutSessionWindow.ts` é a fonte única da janela. Sessão, assinatura, `checkout_started` e `payment_success` carregam `checkout_session_window_hours=24` e `checkout_session_window_version=recurring_checkout_24h_v1`. `expires_at` e a versão participam da assinatura de idempotência; payload e namespace avançaram para impedir que uma sessão antiga de duas horas seja reutilizada depois do deploy.

**RECUPERAÇÃO PRESERVADA:** `send-recovery` continua lendo `checkout_abandoned` e mantém o dedupe vitalício existente. O trade-off é explícito: o e-mail sai depois que a sessão realmente expira, enquanto o comprador ganha uma noite inteira para voltar pelo checkout salvo. Nenhum e-mail da onda Claude foi alterado ou duplicado.

**TESTADO LOCALMENTE:** oito suítes somaram 303 verificações verdes: checkout-window 25/25, value-context 59/59, saved-checkout 40/40, visual-proof 17/17, profile-read 25/25, cancelled-first-delivery 26/26, Autopilot return 36/36 e agency return 75/75. `npx tsc --noEmit` repetiu somente os quatro erros baseline; nenhum erro novo. Whitespace limpo.

**VALIDADO EM PRODUÇÃO (30/08/2026 BRT):** commit `be00a86abe934ed35ab07d9bb3552dc86a92f213`, deploy Vercel `dpl_BAemXwJhBvhM7XUsCwJ317peke1C` em `READY`, aliases incluindo `www.usekineo.com`. Um checkout interno real foi criado sem pagamento: `status=open`, `payment_status=unpaid`, duração de 86.105 segundos (23h55m05s), metadata `24 / recurring_checkout_24h_v1`. O Chrome exibiu o checkout hospedado com valor e descrição corretos; saiu sem pagar. Zero erro runtime em `/api/stripe/checkout` e `/api/stripe/webhook` nos 30 minutos consultados.

**SEM COMPARAÇÃO VISUAL:** copy, preço, layout e métodos de pagamento não mudaram. A entrega altera apenas o tempo durante o qual a mesma sessão continua utilizável.

**NÃO TOCADO:** preço, grant, validade do trial, Stripe Tax, método de pagamento, render, cena, legenda, Supabase schema/dados, campanhas ou e-mails Claude.

**MÉTRICA:** contar pessoas externas por `checkout_session_window_version`: checkout aberto → retomado → pagamento. Não comparar a nova coorte a eventos brutos históricos; o primeiro sinal operacional é uma sessão `recurring_checkout_24h_v1` ainda aberta depois de duas horas.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `be00a86` ou da ponta posterior. Não reintroduzir o `expires_at` de duas horas e não criar uma segunda automação de resgate. Codex mede a nova janela e continua aquisição/fluxo/assinatura.

## 53. Aquisição orgânica — Faceless Directory submetido por fallback auditável (30/08/2026)

**FATO CONFIRMADO / ENCAIXE:** `https://faceless.directory/submit` oferece listagem gratuita, revisão anunciada em 48 horas e audiência explicitamente formada por criadores faceless. A categoria `Video` e a página `/ai-faceless-video-generator` correspondem ao produto sem inventar nova oferta.

**EXECUTADO / FALHA EXTERNA HONESTA:** o formulário foi preenchido no Chrome com UseKineo, categoria Video, descrição curta e URL com `utm_source=faceless_directory`, `utm_medium=directory`, `utm_campaign=faceless_directory_listing_20260830`. Depois do submit, a página respondeu `Something went wrong. Try again.`; portanto o formulário não foi classificado como enviado e não foi repetido.

**ANTI-DUPLICAÇÃO:** a busca no Gmail por domínio, remetente e destinatário retornou zero conversa anterior. O contato oficial publicado pelo diretório, `hello@faceless.directory`, recebeu uma única mensagem com os mesmos dados e explicação do erro do formulário. Gmail confirmou a mensagem na pasta Sent, id `1a050e56815694cc`, assunto `UseKineo submission — faceless AI video tool for review`.

**PROMESSA LIMITADA:** a mensagem pede apenas revisão editorial da listagem gratuita. Menciona o programa opcional de 40% recorrente já implementado, sem comissão nova, pagamento, exclusividade, patrocínio, posição garantida ou prazo prometido. Não houve blast.

**ESTADO:** aguardando revisão/resposta. Não chamar de listagem publicada, visita, cadastro ou assinatura. Não reenviar o formulário e não fazer follow-up antes de resposta, bounce ou o prazo editorial anunciado.

**MÉTRICA:** URL pública aceita e, depois, pessoas externas por UTM em visita → signup → vídeo → checkout → pagamento. Impressão e clique cru não são pessoa nem receita.

**PRÓXIMO DONO:** Claude não deve duplicar o contato com Faceless Directory. Codex monitora resposta e atribuição; qualquer pedido pago ou patrocínio volta como decisão separada.

## 54. Trial — saldo zero não é assinatura; 25 créditos permanecem (30/08/2026)

**EVIDÊNCIA DE PRODUÇÃO / CONCLUSÃO PRIVADA (Supabase, SELECT agregado em 30/08/2026 BRT, contas internas excluídas):** a coorte madura por primeiro motor não mostrou vantagem de pagamento para `cinematic_ai`; os sinais de pagamento observados estavam no grupo cujo primeiro vídeo foi Fast. Na coorte recente, tanto Fast quanto premium produziram checkout e nenhum dos dois produziu pagamento até a leitura. Os números exatos e identificadores permanecem fora deste repositório público. A associação é observacional e confundida por data/política, mas contradiz a afirmação causal de que zerar no primeiro Seedance já é um caminho comprovado para compra.

**FATO CONFIRMADO / RAIL JÁ PUBLICADO:** `trial_first_seedance_60s_v1` já preenche a primeira missão premium; `trial_balance_seedance_35s_v2` já transforma o saldo pós-Fast em uma segunda experiência Seedance sem cartão. A ponte ganhou precedência sobre Plan Fit no commit `10efc06f`; a missão preenchida chegou no commit `ac59bca1`. Na leitura feita logo após esses deploys ainda não havia pessoa externa observada no evento de visualização da ponte; isso é ausência de amostra pós-deploy, não prova de falha da superfície.

**EVIDÊNCIA EXTERNA (fontes oficiais consultadas em 30/08/2026):** InVideo mantém quota gratuita limitada com reset semanal; OpusClip publica créditos gratuitos que não acumulam; VEED permite testar modelos com quota limitada e mostra custo antes da geração. O padrão competitivo útil é limite transparente e próxima ação clara, não obrigar um motor único nem confundir saldo consumido com conversão.

**DECISÃO OPERACIONAL:** manter grant de 25 créditos, validade atual e escolha de motor. Não aumentar, reduzir, retirar Fast, impor expiração de 24–48 horas ou forçar Seedance. A mudança de maior valor já está publicada: Seedance recomendado e preenchido para a primeira missão, com ponte de 35s para quem começou em Fast. A próxima decisão só ocorre quando houver coorte nova suficiente em `primeiro motor → entrega → saldo → ponte → checkout → pagamento`, por pessoa.

**CONTENÇÃO / ANTI-DUPLICAÇÃO:** não duplicar COMEBACK50 para os abandonadores e não reenviar a onda de créditos conduzida pelo Claude. Se o benefício já foi concedido, isolar essa coorte; saldo promocional adicional não pode ser usado como evidência sobre o grant normal de 25.

**VALIDAÇÃO ADJACENTE:** o checkout recorrente de 24 horas está em produção e validado no commit `be00a86a`; o deploy documental mais recente no SHA `516ce6fe` está `READY`. A próxima coorte mede simultaneamente a missão premium recém-publicada e a janela de checkout corrigida, sem introduzir terceira variável.

**NÃO TOCADO:** preço, grant, prazo, entitlement, crédito, render, motor, Stripe write, Supabase schema/dados, e-mails Claude ou lista de destinatários.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir da ponta posterior a esta sincronização. Não mudar o trial nem criar outro rail antes da primeira leitura pós-deploy. Codex mede a coorte e continua aquisição, fluxo e assinatura.

## 55. Aquisição editorial — três parceiros faceless contatados (30/08/2026)

**FATO CONFIRMADO / ENCAIXE PÚBLICO:** o guia do OverseerOS para canais faceless declara que a plataforma cobre pesquisa, planejamento, roteiro, thumbnail e voiceover, mas não gera nem edita o vídeo final. O mesmo artigo aceita parcerias editoriais e o contato oficial aparece em `support@overseeros.com`. A Kineo ocupa exatamente a etapa seguinte, sem competir pelo planejamento.

**FATO CONFIRMADO / ENCAIXE PÚBLICO:** o DepthHQ publica um playbook de automação faceless e vende sistemas com a promessa “receipts over hype”. A página oficial de contato publica `support@depthhq.com`. A abordagem propôs um teste verificável de um brief real até um Short final, sem promessa de resultado comercial.

**FATO CONFIRMADO / ENCAIXE PÚBLICO:** HowToAI publica um curso de uma hora sobre criação de canal faceless e divulga `partnerships@howtoai.pro` para parcerias e negócios. A proposta usa um brief do próprio curso como prova e menciona somente o programa de afiliados já existente, condicionado à qualidade do teste.

**ANTI-DUPLICAÇÃO:** buscas no Gmail pelos três domínios e endereços retornaram zero mensagem anterior antes dos envios. Writenexa foi descartado nesta rodada: o artigo editorial tem encaixe, mas não foi localizado um canal oficial verificável; nenhum endereço foi inferido ou adivinhado.

**EXECUTADO / COMUNICAÇÃO EXTERNA AUTORIZADA:** duas mensagens individuais foram enviadas por `joseph@usekineo.com`:

- OverseerOS — `support@overseeros.com` — assunto `OverseerOS plans the video — Kineo can finish the Short` — Gmail `1a050f20336ae4ac` — UTM `overseeros / partner_outreach / faceless_stack_20260830`.
- DepthHQ — `support@depthhq.com` — assunto `One real brief, one finished faceless Short` — Gmail `1a050f1f47cf432c` — UTM `depthhq / partner_outreach / faceless_workflow_20260830`.
- HowToAI — `partnerships@howtoai.pro` — assunto `One finished Short for your faceless YouTube workflow` — Gmail `1a050f4b085a37ca` — UTM `howtoai / creator_partnership / faceless_course_20260830`.

**PROMESSA LIMITADA:** cada mensagem tem uma única ação: testar um brief ou roteiro real. Não houve blast, integração prometida, pagamento, patrocínio, posição editorial garantida, exclusividade, desconto novo ou mudança no programa de afiliados.

**ESTADO:** enviados; aguardando resposta ou bounce. Não chamar de parceria, publicação, visita, cadastro ou assinatura. Não enviar follow-up antes de resposta ou janela editorial razoável.

**MÉTRICA:** resposta humana → teste iniciado → visitante identificado por UTM → cadastro → vídeo concluído → checkout → pagamento, sempre por pessoa. Abertura e envio não são aquisição.

**NÃO TOCADO:** preço, grant, trial, checkout, Stripe, Supabase, render, motor, cena, legenda, e-mails da onda Claude ou contatos já abordados.

**PRÓXIMO DONO:** Claude não deve contatar OverseerOS, DepthHQ ou HowToAI novamente. Codex monitora resposta e atribuição; qualquer pedido pago, integração ou patrocínio volta como decisão separada.

## 56. Ativação ChatGPT — colar uma vez antes do Studio (30/08/2026)

**EVIDÊNCIA DE PRODUÇÃO / CONCLUSÃO PRIVADA:** uma leitura agregada por pessoa, com contas internas excluídas, mostrou queda relevante depois da escolha do modo no quick-start e antes do início da geração. Os números e identificadores permanecem fora deste repositório público. Nenhum conteúdo de cliente foi lido ou gravado.

**FATO CONFIRMADO / CAUSA DE FLUXO:** `components/ChatGptWelcomeBanner.tsx` transformava a escolha em navegação imediata. O Studio então focava outro campo vazio e pedia novamente o roteiro ou a ideia. A pessoa precisava decidir numa tela e fornecer o conteúdo em outra, embora a copy prometesse continuidade sem refazer setup.

**IMPLEMENTADO:** a variante `chatgpt_quickstart_v4` mantém a pergunta no card, abre o campo correspondente e só permite continuar depois de texto não vazio. `buildChatGptQuickstartHref` normaliza, limita a 1.000 caracteres, codifica o conteúdo e usa o mesmo contrato `/studio` já existente. Ideia continua em `ai/60s/Seedance`; roteiro pronto continua em `verbatim/35s/Seedance`. O Studio recebe o texto preenchido e editável antes de qualquer ação de geração.

**PRIVACIDADE E MEDIÇÃO:** `chatgpt_quickstart_input_opened` grava somente variante e tipo allow-listed. `chatgpt_quickstart_selected` continua sendo o evento de saída e ganha apenas `input_length`; prompt e roteiro nunca entram na telemetria. A variante avançou de v3 para v4 para impedir mistura de coortes. O first-touch ChatGPT permanece intacto; nenhuma UTM nova é criada.

**TESTADO LOCALMENTE:** `node scripts/test-chatgpt-quickstart.mjs` passou 86/86. O teste executa normalização, limite, encoding, vazio fail-closed, dois modos, funil causal e âncoras do caller real. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit` repetiu somente os quatro erros baseline preexistentes; nenhum erro novo.

**COMPARAÇÃO VISUAL:** `docs/previews/CHATGPT-INLINE-PASTE-2026-08-30.html` mostra antes/depois desktop e o estado mobile de 390 px. Foi servido localmente e inspecionado no Chrome conectado do fundador. O card mantém as duas escolhas, revela um único editor e um único CTA; no mobile, campo e botão empilham sem corte.

**SMOKE PRÉ-VALIDAÇÃO / FORWARD-FIX:** o primeiro smoke real confirmou que o texto chegava preenchido ao Studio, mas encontrou `intent_campaign=chatgpt_quickstart_v3` chumbado nas duas URLs enquanto os eventos já usavam v4. A campanha passou a derivar de `CHATGPT_QUICKSTART_VARIANT`, e o teste agora falha se URL e evento divergirem. Nenhum render foi iniciado.

**VALIDADO EM PRODUÇÃO (30/08/2026 BRT):** o forward-fix `2c19d6f4b6216c13e4fae510a7aa668af05aa5df` chegou a `READY` no deploy Vercel `dpl_8GMzWF7tQySZHstBvL5GvA22TNPa`, target production e aliases incluindo `www.usekineo.com`. No Chrome autenticado do fundador, o caminho roteiro pronto abriu o editor inline, aceitou conteúdo, navegou com `verbatim/35s/Seedance`, publicou `intent_campaign=chatgpt_quickstart_v4` e mostrou o texto preenchido no Studio. O Supabase registrou `shown → input_opened → selected → studio_ready`, todos em v4 e sem prompt/roteiro na metadata. A Vercel encontrou zero erro runtime nos 15 minutos consultados. Nenhum render, reserva ou débito foi iniciado.

**NÃO TOCADO:** grant de 25, validade do trial, preço, oferta, checkout, Stripe, Supabase schema/dados, render, motor, cena, legenda, e-mails da onda Claude, contatos ou vídeos existentes.

**MÉTRICA:** por pessoa externa e variante: `view → input_opened → selected → studio_ready → generation_started → completed → checkout → payment`. Clique na opção não é seleção concluída; texto digitado não é telemetria; checkout não é assinatura.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` depois do push e não duplicar o input inline, mudar o grant ou alterar a onda de e-mails. Codex mede a coorte v4 e continua aquisição, fluxo e assinatura.

## 57. Verdade comercial — documento canônico volta a acompanhar Checkout (30/08/2026)

**CONTRADIÇÃO CONFIRMADA:** `docs/PRODUCT_AND_OFFER.md` ainda publicava a tabela de 27/07 — Starter $9.90/25, Creator $24.90/150, Studio $37.90/200, três moedas e descontos de primeiro mês — enquanto `lib/checkoutPricing.ts` e a cobrança live já operavam a V6 global em USD. O código era a autoridade e o documento estava errado; isto bloqueou uma submissão editorial que exigia preço verificável.

**IMPLEMENTADO / SEM REPRICE:** o documento agora registra exatamente Starter $7/40, Creator $15/90, Studio $29/180, Autopilot $299/400, anuais $70/$150/$290, ausência de intro ativa, trial de 25 créditos, acesso gratuito recorrente separado, packs e quatro top-ups com seus grants reais. A moeda documentada passou a USD-only. Nenhum valor em código, Stripe, UI, grant, desconto ou checkout foi alterado.

**TESTE CORRIGIDO COM CAUSA:** `scripts/test-money-truth-contract.mjs` inicialmente falhou em três âncoras que ainda procuravam chamadas diretas de `creditsPerReferenceVideo` na calculadora pública. O caller real já usava `calculatePlanFit` para engine + duração + volume. As âncoras migraram para esse contrato executado, `PUBLIC_ENGINES`, `PUBLIC_DURATIONS` e `oneFilm.filmCredits`; não houve mudança para esconder falha econômica.

**TESTADO LOCALMENTE:** `node scripts/test-money-truth-contract.mjs` passou 306/306, incluindo `checkPricingInvariants()`, inventário de superfícies, ausência de literais comerciais antigos e a calculadora ligada ao Plan Fit. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo. `npx tsc --noEmit` repetiu somente os quatro erros baseline preexistentes; nenhum erro novo.

**NÃO TOCADO:** preço público, grant, prazo, cupom, Stripe, Supabase, render, motor, cena, legenda, e-mails Claude, contatos ou dados de cliente.

**PRÓXIMO DONO:** Claude deve tratar `lib/checkoutPricing.ts` como fonte e `docs/PRODUCT_AND_OFFER.md` como espelho atualizado. Não restaurar a tabela de julho nem usar comentários históricos como preço atual. Codex usa esta verdade para distribuição externa e aquisição.

## 58. Trial preservado + submissão AllThingsAI (30/08/2026)

**DECISÃO OPERACIONAL:** manter 25 créditos, a validade atual e a escolha de motor. Não aumentar, reduzir, retirar Fast, impor expiração de 24–48 horas ou forçar Seedance enquanto a coorte recém-publicada ainda está imatura. O produto já oferece a sequência correta: missão Seedance de 60s para saldo intacto e ponte Seedance de 35s para o saldo pós-Fast de 20–21 créditos. Mudar grant ou prazo agora misturaria variáveis e impediria saber qual delas converteu.

**EVIDÊNCIA DE PRODUÇÃO / CONCLUSÃO PRIVADA:** uma consulta agregada em modo somente leitura, com contas internas excluídas, encontrou o primeiro uso externo dos novos rails. O volume ainda é insuficiente para classificar conversão ou falha. Nenhum identificador, e-mail, roteiro, prompt ou número interno da coorte é publicado neste repositório.

**EVIDÊNCIA EXTERNA (fontes oficiais consultadas em 30/08/2026):** Runway oferece um depósito gratuito único que não expira; HeyGen oferece uma quota mensal gratuita; OpusClip usa watermark e limite de exportação como fronteira de upgrade. O padrão relevante é entregar uma experiência demonstrável e reservar a saída limpa/continuidade para o pago, não fabricar urgência antes de haver coorte. A Kineo já segue esse desenho com trial watermarked e export limpo em plano pago.

**EXECUTADO / AQUISIÇÃO EDITORIAL AUTORIZADA:** depois de busca anti-duplicação retornar zero conversa anterior, foi enviada uma única submissão para o diretório gratuito AllThingsAI no contato oficial publicado. A mensagem usa a verdade canônica: 25 créditos sem cartão, todos os motores disponíveis no trial, watermark no trial e planos a partir de $7/mês. UTM: `allthingsai / directory / allthingsai_listing_20260830`.

**ESTADO HONESTO:** mensagem confirmada em Sent; listagem ainda não publicada. Não repetir o contato nem chamar envio de visita, cadastro ou assinatura. Métrica: URL pública aceita e, depois, pessoas por UTM em visita → signup → vídeo → checkout → pagamento.

**VALIDAÇÃO ADJACENTE:** o SHA documental `18a960b97642277ced7eb1c479c59613c189e665` está `READY` no deploy Vercel `dpl_5hke6JuW8hNfdE5vQP1XWBJQg2cv`, target production. Nenhum preço, crédito, entitlement, Stripe, Supabase schema/dado, render, motor, cena, legenda ou e-mail da onda Claude foi alterado.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin`, não duplicar AllThingsAI nem as ondas COMEBACK50/+25 e não mudar grant/prazo durante a formação desta coorte. Codex continua distribuição, ativação e conversão e mede os dois rails por pessoa.

## 59. Aquisição orgânica — ToolScout submetido; AIxploria descartado (30/08/2026)

**WAIT VERIFICADO / CONCLUSÃO PRIVADA:** as coortes externas do quick-start v4 e do checkout recorrente de 24 horas ainda não têm volume suficiente para justificar outra mudança de produto. A leitura foi feita por pessoa, com contas internas excluídas, e não publicou números ou identificadores neste repositório. Codex preserva os rails atuais enquanto continua distribuição.

**FATO CONFIRMADO / AIxploria:** a superfície oficial oferece hoje apenas listagens pagas, começando em $79, e declara que os links externos são `nofollow`. Nenhuma compra, cadastro ou submissão foi feita. O canal foi descartado nesta rodada por não atender ao critério orgânico mensurável.

**EXECUTADO / TOOLSCOUT:** a página oficial confirmou listagem padrão gratuita, revisão humana e categoria `Video Generation`. A submissão UseKineo foi enviada pelo Chrome do fundador e o painel retornou `Submission received` + `In review`, placement `Free`. A ficha publica a URL direta com UTM `toolscout / directory / toolscout_listing_20260830`, descrição curta, página canônica de preços e os rótulos `Freemium`, `Free Trial` e `Paid`.

**VERDADE COMERCIAL:** a descrição informa ideia ou roteiro → Short vertical com visuais, voz, legendas e música; 25 créditos de trial sem cartão; vídeos do trial com watermark; planos a partir de $7/mês. Não promete ranking, aprovação, backlink dofollow, prazo garantido, desconto, afiliado ou resultado de aquisição.

**ESTADO HONESTO:** submetido e em revisão; ainda não é listagem publicada, visita, cadastro ou assinatura. Não reenviar, não comprar Boost/Featured e não fazer contato paralelo enquanto a revisão estiver aberta. Métrica: aprovação + URL pública e, depois, pessoas externas pela UTM em visita → signup → vídeo → checkout → pagamento.

**NÃO TOCADO:** código, UI, preço, grant, trial, checkout, Stripe, Supabase schema/dados, render, motor, cena, legenda, e-mails Claude ou vídeos existentes.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e não duplicar ToolScout, AllThingsAI nem as ondas de recuperação. Codex acompanha a revisão e continua aquisição/conversão; Claude continua qualidade/render.

## 60. Aquisição orgânica — SaaSHub submetido gratuitamente (30/08/2026)

**EXECUTADO / CHROME DO FUNDADOR:** a submissão gratuita da UseKineo foi concluída no formulário oficial do SaaSHub. A página final confirmou `UseKineo was submitted successfully` e informou que a ficha aparecerá online somente depois da aprovação. Nenhum pagamento, Priority+, Featured ou compromisso recorrente foi contratado.

**FALHA DE CRAWLER CONTORNADA SEM PROMESSA:** o SaaSHub não conseguiu abrir automaticamente a landing page, mas reconheceu a URL canônica e liberou o cadastro manual completo. O formulário foi preenchido com nome, descrição pública, contato do domínio e UTM `saashub / directory / saashub_listing_20260830`; a falha do crawler não foi tratada como aprovação nem como publicação.

**POSICIONAMENTO:** categorias iniciais `AI Video Generator`, `Text To Video` e `Short Videos`; concorrentes declarados `InVideo.io`, `Pictory` e `HeyGen`. Na etapa de distribuição interna do diretório, foram selecionadas as categorias `AI`, `AI Videos` e `Video Generation`, e o SaaSHub confirmou a associação da UseKineo como alternativa a `VEED`, `Synthesia.io` e `Mivid AI`.

**ESTADO HONESTO:** submissão recebida e pendente de aprovação; ainda não é URL pública, backlink, visita, cadastro ou assinatura. Não reenviar e não comprar prioridade. Métrica: aprovação + URL pública e, depois, pessoas externas pela UTM em visita → signup → vídeo → checkout → pagamento.

**NÃO TOCADO:** código, UI, preço, grant, validade do trial, checkout, Stripe, Supabase schema/dados, render, motor, cena, legenda, e-mails Claude ou vídeos existentes.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` depois do próximo SHA, não duplicar SaaSHub, ToolScout, AllThingsAI nem as ondas COMEBACK50/+25. Codex acompanha aprovações, atribuição e a coorte atual sem mudar grant ou prazo prematuramente.

## 61. Aquisição SEO — roundup alinhado à consulta que o Google já entrega (30/08/2026)

**EVIDÊNCIA DE PRODUÇÃO / CONCLUSÃO PRIVADA:** o Search Console, na janela de 28 dias e propriedade canônica `usekineo.com`, mostrou que `/best-ai-shorts-generators` já recebe demanda de investigação comercial, mas quase não recebe cliques e ainda aparece longe da primeira página. A consulta mais recorrente usa a formulação “best AI tools for YouTube Shorts”; os números exatos ficam fora deste repositório público.

**FATO CONFIRMADO / DESALINHAMENTO:** a URL respondia com “AI YouTube Shorts generators” no title e H1. O conteúdo era relevante, mas a frase principal não espelhava a linguagem que o próprio Google já associa à página.

**IMPLEMENTADO:** title, description, Open Graph, Twitter, H1, FAQ, breadcrumb, ItemList e título do ranking passaram a compartilhar a formulação canônica “Best AI Tools for YouTube Shorts”. `SEARCH_TITLE`, `PAGE_HEADING` e `SEARCH_DESCRIPTION` evitam nova divergência. A descrição preserva a comparação honesta por ponto de partida: ideia, roteiro, vídeo longo, avatar ou clipe pronto. A data editorial avançou para 30/08/2026.

**COMPARAÇÃO VISUAL:** `docs/previews/SEO-SNIPPET-BEST-AI-SHORTS-2026-08-30.html` mostra o snippet e o H1 antes/depois em desktop e empilha os dois estados no mobile. Layout, ordem do ranking, oferta, preço e CTA funcional não mudaram.

**FORWARD-FIX OPERACIONAL:** o SHA `af8b4301` adicionou `node_modules` ao Git como symlink absoluto para `/sessions/peaceful-jolly-bohr/mnt/Usekineo/node_modules`. Em checkout Windows ele vira um arquivo quebrado e já abortou um rebase limpo. Esta entrega remove somente esse link rastreado; `.gitignore` já ignora `node_modules/`. Nenhuma dependência real da máquina do fundador foi apagada.

**TESTADO LOCALMENTE:** title com 53 caracteres, description com 151; metadata, H1, FAQ, breadcrumb e ItemList usam a mesma intenção. `npx tsc --noEmit` equivalente, executado com o TypeScript já instalado, repetiu somente os quatro erros baseline preexistentes em `mrr.ts`, `me/subscription` e `stripe/checkout`; nenhum erro novo. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo.

**VALIDADO EM PRODUÇÃO (30/08/2026 BRT):** o commit funcional `94bbf6cd245d650274be438a58313369c5d6573f` chegou a `READY` no deploy Vercel `dpl_5KWzVXBFe6DkmMeuc7U7QB8wPn88`, target production e aliases incluindo `www.usekineo.com`. No Chrome autenticado do fundador, title, description, canonical, H1 e ItemList retornaram a formulação nova e coerente; a página renderizou sem regressão visual. A Vercel encontrou zero erro runtime nessa rota nos 30 minutos consultados.

**DISTRIBUIÇÃO SEM ESTADO FALSO:** o TryLaunch ficou como rascunho no passo obrigatório de mídia; o Chrome conectado não autorizou o upload programático dos assets locais. Não houve submit, compra ou listagem. O AlternativeTo também não recebeu cadastro: Google signup estava desabilitado e a sessão GitHub do fundador não estava autenticada; nenhuma credencial foi criada ou inferida. Claude não deve chamar nenhum dos dois de publicado nem duplicar tentativa sem sessão adequada.

**NÃO TOCADO:** grant de 25, validade do trial, preço, checkout, Stripe, Supabase schema/dados, render, motor, cena, legenda, e-mails da onda Claude ou rankings de concorrentes.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` depois do próximo SHA e partir da ponta posterior. Não reverter a formulação observada no Search Console e não duplicar ToolScout, SaaSHub, AllThingsAI ou Faceless Directory. Codex acompanha indexação, CTR por pessoa/consulta quando a janela amadurecer e continua aquisição/fluxo/assinatura.

## 62. Plan Fit — decisão comprável na primeira visualização (30/08/2026)

**EVIDÊNCIA DE PRODUÇÃO / CONCLUSÃO PRIVADA:** uma consulta somente leitura, deduplicada por pessoa externa, isolou a pergunta de cadência mensal como o ponto de abandono do Plan Fit: a superfície foi exposta, mas a etapa seguinte não avançou. Quantidades, identificadores e detalhes da coorte permanecem fora deste repositório público.

**FATO CONFIRMADO / CAUSA:** `components/growth/PlanFitCard.tsx` iniciava `monthlyFilms` como `null`. A recomendação, o preço canônico e o botão de checkout só eram renderizados depois de a pessoa escolher 1, 4, 8 ou 12 vídeos por mês. O produto pedia uma decisão de planejamento antes de mostrar qualquer decisão comprável.

**IMPLEMENTADO:** o Plan Fit agora começa com a menor cadência honesta, 1 vídeo por mês, derivada de `MONTHLY_CADENCES`. A recomendação canônica e o CTA ficam prontos na primeira visualização; 4/8/12 continuam disponíveis como ajustes. O download permanece antes do card. Nenhum preço foi literalizado no componente, e todas as contas continuam vindo de `calculatePlanFit` e `lib/checkoutPricing.ts`.

**MEDIÇÃO:** a versão `plan_fit_ready_1_video_v2` entra em todas as ações do card. A impressão declara que a decisão estava pronta, a cadência padrão, os créditos calculados e o tier canônico recomendado. Nenhum conteúdo de vídeo ou cliente entra na telemetria.

**COMPARAÇÃO VISUAL:** `docs/previews/PLAN-FIT-READY-DECISION-2026-08-30.html` contém pares antes/depois em desktop e mobile de 390 px. O Chrome conectado recusou a URL local por política de segurança; não houve contorno. A estrutura do preview é coberta pelos testes, mas esta entrega não reivindica smoke visual autenticado de uma nova primeira entrega.

**TESTADO LOCALMENTE:** `node scripts/test-plan-fit.mjs` passou 348/348; `test-trial-balance-bridge` passou 168/168; `test-trial-best-activation` passou 27/27. O typecheck repetiu somente os quatro erros baseline preexistentes; nenhum erro novo. Uma asserção antiga foi reescrita porque embutia LF e falhava no checkout CRLF do Windows; a nova regex verifica a mesma guarda executável sem depender do fim de linha.

**PUBLICADO EM PRODUÇÃO (30/08/2026 BRT):** o commit funcional `22d8c781b97185d7b49035c7f1c9d2bfc6b759df` chegou a `READY` no deploy Vercel `dpl_F4dMDFe4UrR6WCnNf1a1Q7CUVpUH`, target production e alias `www.usekineo.com`. A Vercel encontrou zero erro runtime em `/generate` e `/studio/create` na janela consultada.

**NÃO TOCADO:** grant ou validade do trial, preço, oferta comercial, Stripe, Supabase schema/dados, render, motor, cena, legenda, e-mails do Claude, contatos externos ou vídeos existentes.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin`, não restaurar o estado `monthlyFilms=null` e não duplicar esta mudança. Codex mede a coorte `plan_fit_ready_1_video_v2` por pessoa em impressão → ajuste opcional → checkout → pagamento e continua aquisição, fluxo e assinatura.

## 63. ChatGPT quick-start v5 — campo antes da classificação (30/08/2026)

**EVIDÊNCIA DE PRODUÇÃO / CONCLUSÃO PRIVADA:** uma consulta somente leitura e por pessoa mostrou abandono entre a impressão do quick-start e o envio para o Studio. Entre as seleções concluídas da versão anterior, roteiro completo foi o caminho observado; a alternativa de “só ideia” não teve adoção na coorte. Quantidades e identificadores permanecem fora deste repositório público.

**FATO CONFIRMADO / CAUSA:** `components/ChatGptWelcomeBanner.tsx` escondia o campo de texto até a pessoa classificar a resposta do ChatGPT como roteiro ou ideia. Era uma decisão adicional antes do primeiro ato produtivo.

**IMPLEMENTADO:** `chatgpt_quickstart_v5` mostra o campo “Paste the answer from ChatGPT” imediatamente. “Use this script” é a ação principal; “I only have an idea — write the script” preserva a autoria por IA como alternativa. Conteúdo vazio não navega. O texto continua editável no Studio, e nenhum clique no card gera vídeo, chama fornecedor ou debita crédito.

**MEDIÇÃO:** a impressão, foco inicial deduplicado, escolha final, handoff pronto no Studio, início, conclusão, checkout e pagamento continuam causalmente versionados. A telemetria grava somente tipo escolhido e comprimento; nunca roteiro, ideia ou prompt.

**COMPARAÇÃO VISUAL:** `docs/previews/CHATGPT-QUICKSTART-V5-2026-08-30.html` contém antes/depois em desktop e mobile de 390 px.

**TESTADO LOCALMENTE:** `test-chatgpt-quickstart` passou 88/88 e `test-trial-balance-bridge` passou 168/168. O typecheck repetiu somente os quatro erros baseline preexistentes em `mrr.ts`, `me/subscription` e `stripe/checkout`; nenhum erro novo desta entrega. A revisão Next.js confirmou Client Component síncrono, browser APIs somente depois da montagem e props locais serializáveis.

**VALIDADO EM PRODUÇÃO (30/08/2026 BRT):** o commit `f4414dcdfb0ef68e3224ac0f1605744ba0433838` chegou a `READY` no deploy Vercel `dpl_8jZTgqBC9HYwfxPGQ8RGc2KLSkEV`, target production e alias `www.usekineo.com`. No Chrome autenticado do fundador, a faixa v5 apareceu com textarea visível; ambos os botões estavam inicialmente desabilitados e habilitaram após texto de smoke. Nenhum deles foi clicado, portanto não houve geração nem débito. A Vercel reportou zero erro runtime nas rotas consultadas.

**QUESTÃO PENDENTE / HONESTIDADE DO SMOKE:** o console do `/studio/create` emitiu React 425/422, recuperação de hidratação. `/pricing` no mesmo Chrome não reproduziu. O quick-start retorna `null` no servidor e no primeiro render cliente, então a inspeção de código não atribui o erro a esta mudança; isso ainda não é prova de ausência de relação. Claude não deve registrar “zero erro de browser” para essa rota sem isolar a origem.

**NÃO TOCADO:** grant ou validade do trial, preço, oferta comercial, checkout/Stripe, Supabase schema/dados, render, motor, cena, legenda, e-mails do Claude, contatos externos ou vídeos existentes.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin`, não restaurar o gate de classificação antes do campo e não duplicar esta mudança. Codex mede `chatgpt_quickstart_v5` por pessoa em impressão → foco → escolha → Studio pronto → vídeo → checkout → pagamento e continua aquisição, fluxo e assinatura.

## 64. Checkout cancelado — compromisso menor antes do retry (30/08/2026)

**EVIDÊNCIA DE PRODUÇÃO / CONCLUSÃO PRIVADA:** a reconstrução deduplicada por pessoa externa confirmou abandono depois da criação da sessão e retorno rápido à página cancelada, sem evidência de falha técnica ou cartão recusado. Quantidades, identificadores e sequências individuais permanecem fora deste repositório público.

**FATO CONFIRMADO / CAUSA:** `app/checkout/cancelled/page.tsx` preservava corretamente a seleção, mas mostrava como ação principal repetir o mesmo plano. O degrau recorrente menor já existia na fonte canônica e no tratador de objeção “Too expensive”, porém só aparecia depois de uma pergunta opcional.

**IMPLEMENTADO:** em cancelamentos self-serve de Creator e Studio, o primeiro card agora oferece respectivamente Starter e Creator como início menor, com preço derivado de `lib/checkoutPricing.ts`. O plano original permanece logo abaixo como ação secundária. Trial com primeira entrega pendente e todos os retornos Autopilot conservam seus caminhos anteriores e têm precedência sobre a nova recuperação.

**MEDIÇÃO:** `checkout_downshift_offer_viewed` mede exposição; `checkout_downshift_offer_clicked` mede escolha e declara `placement=primary|objection`. A série anterior `checkout_downgrade_offer_clicked` continua sendo emitida para compatibilidade. Nenhum roteiro, prompt ou identificador de cliente entra nesses eventos.

**COMPARAÇÃO VISUAL:** `docs/previews/CHECKOUT-STARTER-RECOVERY-2026-08-30.html` contém antes/depois em desktop e mobile. O preview e a página real de produção foram inspecionados no Chrome conectado do fundador.

**TESTADO LOCALMENTE:** `node scripts/test-checkout-cancel-deliver-first.mjs` passou 38/38. O typecheck repetiu somente os quatro erros baseline preexistentes; nenhum erro novo. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo.

**VALIDADO EM PRODUÇÃO (30/08/2026 BRT):** o commit funcional `36c45b2ce5e42a2655d34658fe890e437c85aacf` chegou a `READY` no deploy Vercel `dpl_Efc2ukVy1gZaKapaqHS7aqaLnAXo`, target production e alias `www.usekineo.com`. No Chrome autenticado do fundador, Creator mostrou Starter como ação principal e Creator preservado como secundária; Studio mostrou Creator como principal e Studio preservado. Nenhum botão de checkout foi acionado. Console do browser e scan de erros runtime do deployment ficaram limpos.

**DECISÃO DO TRIAL PRESERVADA:** manter 25 créditos e a validade atual enquanto a coorte amadurece. A ponte pós-Fast já existe em `lib/growth/trialBalanceBridge.ts` e usa Seedance de 35s dentro do saldo remanescente; não criar complemento de crédito, outro rail ou premium-first duplicado. A página `/scripts/space` também já recebeu a otimização da consulta de exoplaneta e deve ser monitorada, não reescrita novamente nesta janela.

**NÃO TOCADO:** preço, grant, validade, entitlement, Stripe server, Supabase schema/dados, render, motor, cena, legenda, e-mails COMEBACK50/+25 do Claude, contatos externos ou vídeos existentes.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `36c45b2c` ou posterior. Não duplicar o downshift, a ponte Seedance pós-Fast, a missão premium, o quick-start v5, o Plan Fit v2 nem a otimização de `/scripts/space`. Codex mede exposição → clique do degrau → checkout → pagamento por pessoa externa e continua aquisição/fluxo/assinatura.

## 65. Lembrete de checkout — retomada exata ou planos menores (30/08/2026)

**EVIDÊNCIA DE PRODUÇÃO / CONCLUSÃO PRIVADA:** a leitura deduplicada por pessoa externa mostrou que a maioria de quem vê o lembrete global do checkout o fecha, enquanto poucos retomam a mesma sessão. A superfície de preços também recebe pouca progressão para checkout. Quantidades e identificadores ficam fora deste repositório público.

**FATO CONFIRMADO / CAUSA:** `components/CheckoutResumeBanner.tsx` oferecia somente a retomada exata da sessão salva e o botão de fechar. Para uma pessoa que abandonou por compromisso ou percepção de preço, o lembrete repetia a mesma decisão sem apresentar uma alternativa segura.

**IMPLEMENTADO:** a retomada exata continua como ação principal. A nova ação secundária “See smaller plans” navega internamente para `/pricing?intent_campaign=checkout_resume_smaller_v1#plans`, e o grid real de planos em `app/pricing/PricingClient.tsx` recebeu a âncora `#plans`. A ação não cria Checkout Session, não escolhe plano, não altera preço e não toca no servidor Stripe.

**MEDIÇÃO:** a versão `resume_smaller_choice_v1` acompanha as ações existentes do banner. O novo evento `checkout_resume_smaller_plan_clicked` registra somente o destino `pricing_plans` e os metadados limitados que o banner já emitia; não inclui roteiro, prompt ou dado livre do cliente.

**COMPARAÇÃO VISUAL:** `docs/previews/CHECKOUT-RESUME-CHOICE-2026-08-30.html` contém antes/depois em desktop e mobile. O preview foi inspecionado no Chrome conectado do fundador.

**TESTADO LOCALMENTE:** `node scripts/test-pricing-saved-checkout.mjs` passou 47/47 e `node scripts/test-checkout-session-window.mjs` passou 25/25. O typecheck repetiu somente os quatro erros baseline preexistentes em `mrr.ts`, `me/subscription` e `stripe/checkout`; nenhum erro novo. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo.

**VALIDADO EM PRODUÇÃO (30/08/2026 BRT):** o commit funcional `ffc4f9d3c8541f8261a8ae4a390170ffe5739298` chegou a `READY` no deploy Vercel `dpl_EPK9fXAWHVbLV1kAsBMJhMPK4hgs`, target production e alias `www.usekineo.com`. No Chrome autenticado do fundador, a URL com `#plans` posicionou o grid real e mostrou Starter sem erro de console. A Vercel não apresentou erro runtime na janela consultada.

**QUESTÃO PENDENTE / HONESTIDADE DO SMOKE:** a conta do fundador não tinha um checkout salvo elegível no momento do teste, portanto o banner stateful não apareceu em produção. Nenhum checkout artificial foi criado para forçar o estado. O contrato do banner está coberto pelos testes e o destino foi validado, mas esta entrega não reivindica clique stateful real até a primeira exposição externa.

**DECISÃO DO TRIAL PRESERVADA:** manter 25 créditos e a validade atual enquanto a coorte amadurece. Esta ação trabalha o vazamento final sem aumentar, reduzir ou expirar o grant e sem duplicar a ponte premium ou as ondas COMEBACK50/+25 do Claude.

**NÃO TOCADO:** preço, grant, validade, entitlement, Stripe server, Supabase schema/dados, render, motor, cena, legenda, e-mails do Claude, contatos externos ou vídeos existentes.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `ffc4f9d3` ou posterior. Não duplicar este segundo caminho do lembrete nem o downshift da página cancelada. Codex mede `resume_smaller_choice_v1` por pessoa em impressão → retomada exata ou planos menores → checkout → pagamento.

## 66. Trial ativo — outra vitória antes do checkout (30/08/2026)

**EVIDÊNCIA DE PRODUÇÃO / CONCLUSÃO PRIVADA:** a coorte Stripe de 30 dias, deduplicada por pessoa externa e reconciliada com vídeos concluídos, separou compradores de abandonos pela repetição de valor antes do checkout. Os abandonos concentraram-se após uma única entrega e antes de criar tentativa de pagamento; compradores acumulavam mais entregas antes de pagar. Quantidades e identificadores permanecem fora deste repositório público.

**DECISÃO PRESERVADA:** o trial continua com 25 créditos e a validade vigente. Não aumentamos, reduzimos, expiramos nem bloqueamos o Fast. O bridge Seedance pós-Fast continua com precedência. Quando esse bridge não se aplica e o saldo ativo ainda paga uma duração Fast suportada, a assinatura deixa de ser a ação principal e o episódio seguinte já escrito ocupa o slot.

**FATO CONFIRMADO / CAUSA:** `GenerateClient.tsx` já escrevia o episódio 2 e já conhecia o saldo, mas `showTrialPostVideoOffer` escondia a continuação para mostrar assinatura durante o trial. Depois de uma entrega premium curta, por exemplo, a pessoa podia ter saldo suficiente para Fast e ainda receber o paywall primeiro.

**IMPLEMENTADO:** `lib/growth/trialRepeatBeforeCheckout.ts` escolhe a maior duração Fast suportada, nunca maior que a duração revisada, que o saldo atual cobre. O clique seleciona Fast e a duração derivada, carrega o roteiro editável e chama somente a análise existente. Nada é gerado ou debitado até a pessoa revisar e pressionar Generate. O link secundário “See paid plans” continua disponível e navega para o grid real sem criar Checkout Session.

**MEDIÇÃO:** `trial_repeat_episode_viewed` conta somente viewport real; `trial_repeat_episode_clicked` mede a continuação; `trial_repeat_subscription_clicked` mede a escolha secundária. A versão é `trial_repeat_before_checkout_v1`. Os eventos carregam somente saldo/custo/duração/motor e contexto categórico, nunca roteiro, prompt ou texto livre.

**COMPARAÇÃO VISUAL:** `docs/previews/TRIAL-REPEAT-BEFORE-CHECKOUT-2026-08-30.html` contém antes/depois em desktop e mobile. Os dois pares foram inspecionados no Chrome conectado do fundador.

**TESTADO LOCALMENTE:** 652 verificações passaram: trial-repeat 47/47, trial post-video 45/45, balance bridge 168/168, Plan Fit 348/348 e history milestone 44/44. O typecheck repetiu somente os quatro erros baseline preexistentes; nenhum erro novo. `git -c core.whitespace=cr-at-eol diff --check` ficou limpo.

**VALIDADO EM PRODUÇÃO (30/08/2026 BRT):** o commit funcional `3bc197bc582b5d1fe7cccc6d9d41a62a0b5652a6` chegou a `READY` no deploy Vercel `dpl_2Jkjn2hhmFo7zwRFXtrA7JUgLWag`, target production e alias `www.usekineo.com`. O Studio autenticado carregou no Chrome sem erro de console.

**QUESTÃO PENDENTE / HONESTIDADE DO SMOKE:** a conta do fundador é paga e não pode produzir legitimamente o estado de trial ativo com saldo remanescente. Nenhum grant, vídeo ou checkout artificial foi criado para forçar o card. A política, o caller, a hierarquia visual e a ausência de render/débito no handoff estão cobertos pelos testes; a primeira exposição externa ainda precisa ser observada antes de declarar conversão.

**NÃO TOCADO:** preço, grant, validade, entitlement, Stripe server, Supabase schema/dados, render, motor, cena, legenda, e-mails COMEBACK50/+25 do Claude, contatos externos ou vídeos existentes.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `3bc197bc` ou posterior. Não duplicar premium-first, o bridge Seedance nem esta repetição Fast. Medir por pessoa `trial_repeat_episode_viewed → trial_repeat_episode_clicked → video_generation_completed → checkout_started → payment_success`; comparar com a série de assinatura anterior somente depois de exposição suficiente.

## 67. Trial premium sampler — qualidade primeiro, repetição antes da parede (30/08/2026)

**EVIDÊNCIA DE PRODUÇÃO / CONCLUSÃO PRIVADA:** a coorte externa fresca mostrou ativação quase completa até o início da geração; o gargalo atual já não é a pessoa apertar o primeiro botão, e sim repetir depois da primeira entrega. Dentro da mesma janela, a primeira experiência Seedance de 60 segundos que consome os 25 créditos não produziu repetição observada, enquanto entregas Seedance mais curtas produziram. A coorte Stripe de 30 dias já apontava a mesma direção: compradores acumulavam mais entregas antes do checkout do que abandonos. Contagens e identificadores permanecem fora deste repositório público.

**DECISÃO EXPERIMENTAL:** manter exatamente 25 créditos, validade vigente, preço, watermark e todos os motores. Não aumentar, reduzir, expirar, conceder bônus ou bloquear Fast. A opção manual de Seedance 60s continua disponível no Studio; mudou somente o caminho recomendado para um trial intacto.

**IMPLEMENTADO:** `TRIAL_FIRST_DELIVERY_VERSION` agora é `trial_first_seedance_35s_v2`. A primeira missão recomendada prepara Seedance de 35s por 15 créditos e declara o saldo esperado de 10 créditos, suficiente para dois episódios Fast de 60s a 5 créditos cada. O CTA abre o brief editável no Studio; análise, fornecedor, render e débito continuam proibidos até revisão e clique explícito em Generate.

**JORNADA INTEGRADA:** depois do Seedance de 35s, a política já publicada `trial_repeat_before_checkout_v1` oferece o primeiro Fast de 60s; com 5 créditos restantes, oferece o segundo; somente depois da repetição o saldo chega à parede honesta. O bridge pós-Fast para Seedance mantém precedência nos casos em que ele é elegível. Não existe segundo escritor, grant paralelo ou novo endpoint.

**RETOMADA COERENTE:** a página de checkout cancelado usa o mesmo contrato de 35s e explica que o episódio premium usa parte do trial e preserva o restante para mais vídeos. Preço e oferta comercial não foram alterados.

**COMPARAÇÃO VISUAL:** `docs/previews/TRIAL-PREMIUM-SAMPLER-2026-08-30.html` contém antes/depois em desktop e mobile, inspecionados no Chrome conectado do fundador. O estado anterior mostra 25 → Seedance 60s → saldo zero; o novo mostra 25 → Seedance 35s + dois Fast 60s.

**TESTADO LOCALMENTE:** 759 verificações do funil passaram: balance bridge/jornada integrada 189/189, checkout cancelado 39/39, repeat-before-checkout 47/47, pós-vídeo 45/45, Plan Fit 348/348, history milestone 44/44 e checkout salvo 47/47. Uma asserção antiga foi normalizada para CRLF porque verificava fim de linha, não comportamento. O typecheck repetiu somente os quatro erros baseline preexistentes; nenhum erro novo. O gate de whitespace ficou limpo.

**VALIDADO EM PRODUÇÃO (30/08/2026 BRT):** o commit funcional `383d744d48a8c81dec646e4cffcd87ce39c33349` chegou a `READY` no deploy Vercel `dpl_8TK6Bt94yxRxM8mt6c7VJ9anPNPC`, target production e alias `www.usekineo.com`. O Studio autenticado carregou no Chrome do fundador sem erro de console e o deployment não apresentou log `error` ou `fatal` na janela consultada.

**QUESTÃO PENDENTE / HONESTIDADE DO SMOKE:** a conta do fundador é paga; nenhum trial, crédito, vídeo ou checkout artificial foi criado para forçar o banner stateful. A matemática 15+5+5, callers, telemetria, ausência de gasto no handoff e interfaces desktop/mobile estão cobertos pelos testes e pelo preview. Conversão só pode ser declarada depois de exposição externa suficiente.

**NÃO TOCADO:** preço, grant, validade, entitlement, Stripe server, Supabase schema/dados, pipeline de render, motor, cena, legenda, e-mails COMEBACK50/+25 já executados pelo Claude, contatos externos ou vídeos existentes.

**PRÓXIMO DONO:** Claude deve executar `git fetch origin` e partir de `383d744d` ou posterior. Não restaurar `trial_first_seedance_60s_v1`, não duplicar o rail Fast nem alterar grant/prazo durante esta coorte. Medir por pessoa `trial_first_delivery_clicked → trial_first_delivery_generate_committed → video_generation_completed → trial_repeat_episode_viewed → trial_repeat_episode_clicked → segundo/terceiro vídeo → checkout_started → payment_success`.
