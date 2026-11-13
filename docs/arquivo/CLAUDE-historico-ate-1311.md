# CLAUDE.md — histórico até 13/11/2026

Saiu do CLAUDE.md na faxina de 13/11 (dono: opção A do fluxo de trabalho). Nada foi apagado. Duas partes: a versão que estava na main e a cópia local de C:\kineo.

---

## PARTE 1 — versão da main até 13/11

# CLAUDE.md — Regras Permanentes para todas as sessões

Antes de editar telas ou arquivos compartilhados, rode `git fetch origin` e siga o [quadro de sessões](docs/QUADRO-DE-SESSOES.md) da `origin/main` para consultar o histórico recente, publicar a linha de início, evitar sobreposição e registrar a entrega com o SHA.

# ══════════════════════════════════════════════════════════════════════════
# 💲 PREÇO V8-A (fundador 28/09/2026 noite, "Preço A"): Starter US$12,90 · Creator US$29,90 ·
#   Studio US$54,90 (60/150/300 cr; anual 10×; R$64,90/149,90/274,90); barra de créditos com piso
#   0,189/cr. O congelamento "até 09/10" abaixo ACABOU. Quem já assinava mantém preço e créditos.
#   Doc: docs/DECISAO-PRECOS-V8-2026-09-28.md. Guardião: scripts/test-preco-v8-A-2026-09-28.mjs.
# ══════════════════════════════════════════════════════════════════════════
# 🔁 RESTAURAÇÃO 09/09/2026 (noite) — LER ANTES DE QUALQUER OFERTA/PREÇO
# ══════════════════════════════════════════════════════════════════════════
# · A Versão B (porta de $1, 08/09) e os preços V6/V7 MORRERAM em 09/09 à noite
#   por ordem do fundador ("voltar na minha melhor fase"). Vigente: trial GRÁTIS
#   de 30 créditos (1 Seedance 60 s + 1 Kineo 1 60 s), todo motor aberto, sem
#   cartão; preços V5 $9,90/$19,90/$39,90 com 60/150/300; anual 10×.
#   ⚠ 16/09 (fundador, manhã): TRIAL DE CADASTRO NOVO = 10 CRÉDITOS (2 Kineo 1;
#   Seedance não cabe). Quem já tinha 30 mantém (trialCapFor lê
#   trial_credits_granted). Primeiro-filme-premium (lib/primeiroFilme) PAUSADO.
#   Doc: TRIAL-10-R1 em docs/coordination/motores/CLAUDE.md e PEDIDOS.
# · Interruptores: lib/entryPolicy CARD_ENTRY_ONLY=false · lib/reverseTrial
#   TRIAL_CREDIT_CAP=10 (era 30 até 16/09) · lib/checkoutPricing CARD_TRIAL_LIVE=false ·
#   lib/growth/cleanFilmTrialDoor TRIAL_DOOR_LIVE=false · lib/enginePlanGate
#   ENGINE_GATE_SINCE='2099'. Guardião: scripts/test-restauracao-2026-09-09.mjs.
# · PREÇO E OFERTA CONGELADOS ATÉ 09/10/2026. Nada de $1, intro, pack novo,
#   trial pago. Métrica única: pagantes novos por semana. Doc:
#   docs/DECISAO-RESTAURACAO-2026-09-09.md.
# · MOEDA LOCAL (09/09 noite, docs/DECISAO-MOEDA-LOCAL-2026-09-09.md): a conta
#   Stripe é BRASILEIRA — cartão BR só paga em REAIS; desde 19/08 (USD no mundo
#   todo) NENHUM brasileiro conseguia pagar. Modelo: dólar em todo card; a sessão
#   nasce na moeda do país (lib/settlementCurrency.ts, decidido no servidor:
#   ?currency= da casa → recusa anterior de cartão BR → IP BR → pt-BR → USD).
#   Tabela fixa BRL R$ 49,90/99,90/199,90 (anual 10×), câmbio da casa 5,0 revisto
#   dia 9 de cada mês. CheckoutCurrency segue 'usd' (exibição); NÃO reabrir
#   multi-moeda nas telas. Pix não faz assinatura (só pagamento único).
#   Guardião: scripts/test-moeda-local-2026-09-09.mjs.

# ══════════════════════════════════════════════════════════════════════════
# 🔴 09/09/2026 00:00 UTC — PREÇOS V7 (fundador 08/09 20h): Starter $14/60cr ·
#   Creator $29/150cr · Studio $59/300cr · anual 10×. A porta de $1 diz
#   "depois $29/mês" (literal espelhado em lib/entryPolicy, guardado por
#   scripts/test-preco-v7-2026-09-09.mjs contra a fonte única). Quem já assinava
#   paga o preço antigo e renova com o grant antigo (renewalCreditsFor).
#   Doc: docs/DECISAO-PLANOS-V7-2026-09-09.md. Marco do placar = 09/09 00:00 UTC.
#   ⚠ As linhas abaixo sobre $9/$19/$29 e $7/$15/$29 são HISTÓRIA.
# 🔴 08/09/2026 01:20 — VERSÃO B (ordem do fundador): ACABOU O TRIAL GRÁTIS.
#   Conta nova = 0 créditos + trial_status=card_required. Única entrada: $1 por
#   7 dias no Creator (80cr), depois $15/mês. Sem Kineo 1 grátis. Starter $7 e
#   Studio $29 seguem compra direta. Interruptor: lib/entryPolicy.ts
#   CARD_ENTRY_ONLY. Doc: docs/DECISAO-VERSAO-B-ENTRADA-1-DOLAR-2026-09-08.md
#   ⚠ A tabela "PRICING V5" mais abaixo neste arquivo está MORTA (19/08):
#   preço real = Starter $7/40cr · Creator $15/90cr · Studio $29/180cr.
# ══════════════════════════════════════════════════════════════════════════
# ══════════════════════════════════════════════════════════════════════════
# 🧠 LER PRIMEIRO — docs/MEMORIA-SESSAO-CEO-2026-09-02.md (02/09)
# ══════════════════════════════════════════════════════════════════════════
# · SEM SPRINT AUTOMÁTICA: o fundador desligou as tarefas programadas em 02/09
#   (Fable a 79% do limite, reinicia 07/09). Trabalho é PONTUAL, uma ação por
#   vez. Tarefa mecânica (teste/commit/publicar/painel) roda em Opus/Sonnet;
#   Fable só para análise densa e código difícil.
# · CRÉDITO NÃO É ISCA: winback-25 deu 25cr a 95 pessoas (2.375 créditos) e
#   teve ZERO cliques em 24h. A isca é o FILME PRONTO sobre o tema que a
#   pessoa já fez; o crédito vem no clique, não antes. 264 ainda elegíveis.
# · CHECKOUT DE CONTA SEM VÍDEO = DEFEITO, NÃO DESEJO: 3 dos 4 checkouts de
#   02/09 eram contas com 0 vídeos e modal trial_ended com 1h de vida e 25cr
#   intactos. Contar separado de checkout de quem já entregou vídeo.
# · UMA RÉGUA POR VOZ, NUNCA UMA SÓ: clássico (Seedance 1.5/Kineo 1/Veo/Kling
#   2.5) = tts-1-hd a 3,1 pal/s (35s=100-115 · 60s=175-195 · 90s=265-290);
#   hollywood (Kling 3/H3/Omni/S25) = voz própria a 2,3 pal/s. Padronizar os
#   dois no mesmo número QUEBRA um dos lados.
# · O PRIMEIRO VÍDEO É O PRODUTO: 14d/174 pessoas — os 4 pagantes vieram da
#   PRÓPRIA IDEIA (manual). Auto-start = 40% dos primeiros vídeos e 0 pagantes.
#   Kineo 1 + Seedance 1.5 são os motores de 100% das primeiras impressões.
# · KINEO 1 usa PIXABAY (Pexels desligado no #351). Melhorias de 02/09:
#   letterbox 6%, fade de abertura, grade +1 degrau, penalidade de baixa
#   resolução no ranking, corte até 4,5s. NÃO usar color_filter/playback_rate/
#   vinheta radial sem render de validação — propriedades nunca exercitadas.
# · MOBILE: projeto com pasta local só roda no desktop. Do celular, só via
#   Despacho (Configurações → Cowork), com este PC ligado.
# · O QUE SÓ EXISTE NO CHAT SOME: decisão nova vira arquivo em docs/ no mesmo
#   dia (bug do Cowork em 02/09 matou o shell de uma sessão inteira).

# ⚡⚡ MODELO DE TRABALHO (fundador 25/08 — "gravar isso"):
# O FUNDADOR É CONSELHO, EU SOU O CEO-EXECUTOR. Ele direciona, percebe,
# provoca; eu verifico o que é melhor, executo 100% e entrego PRONTO para
# ele analisar e testar. Autorização permanente para: e-mails (respostas
# sempre em rascunho), banco, código+commit+bat, Chrome dele, renders de
# validação (sempre dry-run $0 ANTES), concessão de créditos prometidos.
# Não perguntar "posso?"; entregar feito com o raciocínio junto e a próxima
# jogada. Exceções que continuam dele: apagar dados permanentemente, dinheiro
# saindo (compras/planos novos), e decisões de preço público.

# ⛔⛔ REGRA FIXA — LINK DE REVIEW É SÓ O TAAFT (descoberto 25/08):
# producthunt.com/products/kineo NÃO É NOSSO — é outro produto homônimo
# (kineo.studio, "article to video", BYOK WaveSpeed). TODA campanha de review
# de 19/08 e 24/08 mandou clientes para lá: as reviews do Rick e do Victor
# foram escritas na página de um CONCORRENTE e não aparecem em lugar nenhum.
# Nós NÃO temos página no Product Hunt. Link certo, único, para qualquer
# pedido de review: https://theresanaiforthat.com/ai/kineo/ (nossa página,
# 5 notas média 3.0, dona = conta do fundador). Victor foi pago (100cr,
# admin_credits_granted 25/08) e avisado do erro com o link certo no
# rascunho. Pendência: listing do TAAFT está DESATUALIZADO (fala trial de
# 40cr e "from $9.90/mo" — hoje é 50cr e $7) — fundador edita no dashboard.

# 🔒 CONCLUSÃO JÁ FECHADA — NÃO REABRIR (fundador 19/08, estudo repetido
# várias vezes): O VAZAMENTO DO CHECKOUT É PREÇO. As pessoas chegam na
# página de pagamento, ACHAM CARO e não compram. NÃO é erro de cartão, NÃO é
# recusa de emissor, NÃO é trilho de pagamento (UPI/Pix/e-mandate do RBI).
# Já foi investigado mais de uma vez e deu a mesma coisa todas as vezes.
#   ⛔ NÃO gastar sessão re-investigando "será que o pagamento está quebrado?"
#   ✅ Toda hipótese de conversão parte de PREÇO/OFERTA/PERCEPÇÃO DE VALOR.
# ⚠ CORRIGIDO EM 07/09: esta cegueira ACABOU. A tabela `events` TEM
# `checkout_payment_failed` (metadata `stripe_checkout_failure_v1`), com
# motivo, bandeira, país, se é renovação e se foi recusa de rede. Não é mais
# verdade que "a verdade sobre recusa só existe no painel da Stripe" — ela
# existe aqui. `metadata.customer_country` continua null e continua não
# provando nada; use `card_country` do evento novo.
# ⛔ MAS: o evento novo NÃO reabre a conclusão de preço acima. A conclusão de
# preço segue FECHADA — ela foi construída sobre 44 pessoas, repetidas vezes.
# ⚠ AJUSTE DE 07/09 04:38 (fechamento do ciclo de aquisição): até 07/09 era
# verdade que o evento só falava de quem JÁ ERA CLIENTE. Não é mais. Em
# 07/09 05:35 UTC entrou a PRIMEIRA recusa de COMPRA INICIAL da história:
# $23,20 (Studio com welcome20), Visa PRÉ-PAGO dos EUA, `card_restricted`,
# `declined_by_network`, risco normal, pessoa vinda do TAAFT. São 3 recusas
# no total (2 renovações + esta). UMA linha não derruba um estudo de 44 —
# não reabra o preço por causa dela — mas NÃO escreva mais que "toda recusa
# é de renovação". Se a coluna `initial` crescer, aí é dado novo.
# ✅ FECHADO EM 07/09 (SHA 8f7c1084 · ciclo de pagamentos #1). A causa NÃO era
# um bug solto: em `mode:'subscription'` a Stripe cria o PaymentIntent a partir
# da FATURA, então `session.metadata` (onde mora o nosso `supabase_user_id`)
# NUNCA chega ao intent; e o único plano B era `profiles.stripe_customer_id`,
# coluna escrita só quando um pagamento DÁ CERTO. Resultado: a casa só sabia
# nomear quem JÁ TINHA PAGADO — e o primeiro comprador recusado, que é o único
# que ainda pode virar assinante, era anônimo por construção.
# Agora existe uma escada de 5 degraus (metadata do intent → assinatura da
# fatura → sessão de checkout → customer_id → e-mail do customer) e o evento
# carrega `identity_source`, `owner_resolved`, `stripe_session_id`, `tier` e
# `ip_country`. ⚠️ `identity_source='customer_email'` é INFERÊNCIA, não fato:
# nenhuma carta sai só com ele. O corte antes/depois é `metadata ?
# 'identity_source'`, NUNCA o relógio. Consultas em
# docs/queries/RECUSA-COM-NOME-2026-09-07.sql; carta em
# /api/admin/send-card-declined (dry-run por padrão, só compra INICIAL).
# Números que sustentam a conclusão (funil 7d, medido 19/08): 247 cadastros →
# 135 fizeram vídeo → 44 chegaram ao checkout → 0 assinaram, e os 44 tentaram
# 2+ VEZES. Quem volta duas vezes quer comprar; travou no valor.
# ⚡⚡ SYNC 17-18/08 (sessão CEO — segunda de 8 produtos) — LER ANTES DE QUALQUER COISA:
# - PRICING V5 (fundador aprovou): Starter $9.90/60cr · Creator $19.90/140cr ·
#   Studio $39.90/320cr · Autopilot $299/400cr. SEM 1º MÊS COM DESCONTO em
#   NENHUM plano (INTRO_PRICES = preço cheio → hasIntroOffer() false; NÃO
#   reintroduzir "first month" em copy). Trial grátis = 50cr. O $4.90 MORREU.
#   Página de preços fala em FILMES ("≈ 7 engine films/mo"), não em créditos.
# - PRODUTOS NOVOS EM PROD: /images (6 motores fal: schnell 1cr/dev 2/seedream 3/
#   grok 3/recraft 4/nanobanana 5 + upscale ESRGAN 1cr) · /audio (TTS: minimax 2cr/1k
#   OBRIGATÓRIO output_format:'url', eleven 2, dia 1, kokoro 1 — param é `prompt`!) ·
#   /library (abas Videos/Images/Audio) · ✨HD Enhance (fal-ai/topaz/upscale/video,
#   Proteus, upscale_factor 1 = tier $0.02/s; fator 2 = $0.08/s NÃO usar; 10cr,
#   Studio ganha 2 grátis/mês via videos.enhanced_at) · /ai-video-upscaler (SEO).
# - STORAGE: tabelas images/audios (RLS select own) + bucket renders (limite
#   ELEVADO a 250MB via SQL) paths images//audio//enhanced/. TODA mídia gerada
#   DEVE persistir no nosso bucket (URL do fal expira!). Enhance tem SELF-HEAL:
#   GET re-copia URLs fal→bucket. Popup da conta = painel 950×430 (medida do
#   fundador) com Library+storage. Limites por plano: free 10/14d, starter
#   100/90d, creator 500/forever, studio ∞ (gate de enforcement ainda NÃO existe).
# - CURADORIA/VITRINE (fundador): NATUREZA — raios/chuva/mar/aventura; FOGO FORA.
#   Maracaibo (4b12925e) slot 1 do Kling 3 + reel de entrada (mulher+tempestade
#   0.2-4.7 e avalanche 16.6-19.9 = 4b12925e-avalanche.mp4). Previews agora
#   crf19-20@1400px CORTADOS DOS MASTERS ENHANCED quando existirem (não mais
#   640px!). components/AuthReel.tsx = reel único de login+signup (avança
#   onEnded, NUNCA timer fixo — clipes têm durações diferentes).
# - LOGIN E SIGNUP = split-screen (vitrine esq., form 440px dir.) — mexeu num,
#   mexe no outro (AuthReel compartilhado).
# - ✅ CONTRATO-HOLLYWOOD EXECUTADO (18/08 manhã, commit c33a737): C1 verbatim
#   = roteiro redistribuído EM CÓDIGO cena a cena (GPT só dirige câmera, nunca
#   escreve fala); C2 piso 95% do alvo + FAILFAST 60→90% + secondsOf/secondsFor
#   honram segundos exatos (o molde 5|10/8/teto-10 encolhia 51s→44.8s!) + teto
#   de apara 60→64s (Rewards exige >60); C3 variedade com dentes (divergência
#   determinística em código, "best effort" morreu); C4 watermark = design do
#   fundador (FORCE_WATERMARK_EMAILS, Push #434 — decisão dele manter/tirar).
#   ⚠ espelhos: secondsOf (app/api/compose/route.ts) ≡ secondsFor (lib/
#   compose.ts) — mexeu num, mexe no outro. FALTA: validação com re-render do
#   Boiling River (fundador roda; aprovado só se ≥61s + narração fiel + zero
#   cena repetida/borrada). QA por pixel (Laplacian/luma) ficou pra V2 —
#   exige ffmpeg no server; claim assinado não guarda prompt p/ re-render.
# - PENDÊNCIAS: [18/08 noite] preço do Kling 3 — filme agora sai 64-73s ≈
#   $11-12 de fal em 150cr (margem 35-45%); fundador decide AMANHÃ entre manter
#   150cr / 180cr / preço-por-segundo no V4 (recomendação da sessão CEO: manter
#   agora, embutir por-segundo no /generate V4 — NÃO mexer antes da decisão) ·
#   gate de storage (V2) · assinantes antigos $24.90 recebem 140cr
#   (decidir grandfather 150) · Starter regional $4.99 (fundador pode querer
#   subir) · pack one-time $2.90/$4.90 do Offer290Banner (decisão pendente) ·
#   score viral aleatório (74 vs 81 mesma prompt) · Channels/série com memória
#   (tese aprovada, não construída) · MiniMax-H3 candidato nº1 a motor novo.
# ⚡ SYNC 15/08 (sessão CEO) — LEIAM ANTES DE MEXER NA HOME/EXAMPLES:
# - HOME VIROU VITRINE DE MOTORES (sem composer! decisão do fundador): 4 cards
#   500x280 full-bleed (Seedance 1.5/Kling 2.5/Veo 3.1/Kling 3) com 4 clipes
#   curados cada, girando sozinhos em crossfade — componente EngineCycleCard
#   (double-buffer, NÃO simplificar) + lib/engineWall.ts (CURATED/PREVIEWS/
#   EXCLUDED são curadoria manual do fundador — NÃO tocar sem ordem dele)
# - Clipes leves em public/previews/{id}.mp4 (8s 640px crop 500:280) e posters
#   em public/posters — regenerar via ffmpeg se trocar curadoria
# - NOMES REAIS dos motores no site: Veo 3.1, Kling 2.5, Kling 3 (ex-Hollywood),
#   Seedance 1.5, Kineo 1 (ex-Fast), Avatar (ex-AI Presenter) — manter em TODOS os pares
# - /examples = grade fixa dos 20 melhores (EXAMPLES_BEST) · Trending na home
#   tem filtro anti-prompt · nav tem dropdowns Image/Video (CSS puro)
# - Página inteira full-width (.wrap sem max-width) · seções compactas (34px)
# - Placar 15/08: 14 eventos checkout (recorde; antes 2-4/dia) — vitrine converte
# - PRÓXIMO: fundador vai refazer /generate com seletor 720/1080p + 15/45/60s +
#   motores novos — LER docs/PLANO-GENERATION-V4.md e docs/PRECOS-MOTORES-V4.md
#   antes de qualquer mudança em generate/engineCost/analyze-idea

# ⚠⚠ REGRA FIXA — SPRINTS ENTREGAM MUDANÇA QUE O FUNDADOR VÊ (fundador 17/08):
# "às vezes vejo o sprint rodando 10x/dia e não vejo mudanças como as de hoje."
# TODA sessão de sprint deve entregar PELO MENOS UMA mudança visível de produto
# no padrão do dia 17/08 — exemplos do que CONTA: produto novo na cara do
# cliente (Images/Audio/Library/Enhance), tela redesenhada (login split-screen,
# mega-menu com ícones sem preço, popup 950×430), vitrine melhor (previews HD,
# curadoria), pricing/copy que vende melhor, feature roubada com critério do
# Higgsfield/InVideo. O que NÃO conta como entrega única: refactor invisível,
# micro-SEO, fix de log, doc — isso é acompanhamento, não prato principal.
# Teste antes de encerrar o sprint: "se o fundador abrir o site agora, ele VÊ
# a diferença e sorri?" Se a resposta for não, o sprint não terminou.
# Receita que funcionou hoje: (1) olhar um concorrente com print/tela real,
# (2) escolher o que é fácil E visível, (3) implementar com selo honesto,
# (4) push no mesmo dia. Ambição na medida: mudanças grandes em stage
# (studio-v4) pra aprovação; polish direto na main.

# ⚡ SYNC 24/08 — DAR CRÉDITO AGORA TEM BOTÃO (#297), E A REGRA QUE VEIO JUNTO:
# ⛔ NUNCA prometer a um cliente algo que o produto não sabe executar sozinho.
# O caso: em 19/08 foram oferecidos 100 créditos por uma review. Rick
# (gapozweb) deixou a ÚNICA review pública que a Kineo tem, cobrou DUAS vezes,
# e em 22/08 mandou um e-mail chamado "Feeling forgotten". A causa não foi
# desleixo — NÃO HAVIA COMO DAR O CRÉDITO: nenhuma rota, nenhum botão em todo
# o /api/admin. "Faço na mão depois" é onde promessa morre.
# ✅ AGORA: /admin/people → botão "+ créditos" na linha da pessoa. Motivo é
#    OBRIGATÓRIO e toda concessão vira evento `admin_credits_granted`
#    (quem/quanto/por quê). Teto 1.000 por vez. Use SEMPRE por aí — não abra
#    o banco à mão, senão o rastro se perde.
# 📊 O painel também passou a medir O QUE FOI ENTREGUE (#295), não só o gasto:
#    coluna "Got back" ao lado de "Spent on". ATENÇÃO ao ponto cego antigo:
#    /animate, /images e /audio NÃO criam linha em `videos` — quem usa esses
#    produtos parecia "gastou 40 e não fez nada" e na verdade RECEBEU (medido:
#    1.801 entregas de animação para 14 pessoas que o painel mostrava como 0).
# 📮 SLA DE RESPOSTA (a lição maior do dia): 5 clientes reais escreveram em
#    30 dias e 4 ficaram SEM RESPOSTA — todos eram respostas a campanhas do
#    próprio fundador. Pedir favor e sumir converte cliente neutro em cliente
#    ressentido. Toda campanha nova exige varrer as respostas em ≤48h.
# 🔍 FUNIL 7d (medido 24/08): 247 cadastros → 115 sem nenhum vídeo, dos quais
#    103 NUNCA gastaram um crédito. O gargalo da ativação não é render
#    quebrado nem preço — é gente que chega e não aperta o botão.

# App versão atual: v3.0 ✅ (Phase 1 B-roll Intelligence COMPLETE)
# v3.0 DONE — Phase 1: B-roll Intelligence System fully connected
# #346: generate-video-fast now reads brollQueries from BrollPlan → exact Pexels queries per scene
# New files: lib/broll/*, app/api/generate-broll-plan, app/api/regenerate-scene, components/video/VisualDirector, components/video/SceneCard

## ✅ Status da v2.5 (confirmado em 27/05/2026)
- AUTO-STRUCTURE: qualquer prompt manual agora passa por /api/generate-script antes de analyze-idea (#310)
- Fast-path ativa 100% das vezes — usuário nunca precisa saber de HOOK/MICRO REWARD (#310)
- Viral Now: 3 cards trending diários em /viral-now + dashboard, 1 click = gera vídeo
- Viral script fast-path: voiceovers parsed EM CÓDIGO — GPT só gera visual layer (#307)
- Marcadores todos em inglês: HOOK, MICRO REWARD, ESCALATION, PAYOFF (#306)
- Dashboard viral cards: cores por vertical (billionaire=amber, mystery=purple, country=blue) (#305)
- Nav: "My Videos" substituído por "🔥 Viral Now" em sidebar, mobile nav, e top menu (#302-303)
- Commits chave desta versão:
  - #319: My Videos v2 — /history page rewritten to query `videos` table; 9:16 video grid cards with click-to-play, download, expandable description; title extracted from HOOK line in topic field
  - #320: My Videos: thumbnail support + HomePageClient footer fix — thumbnail_url as background on play button; dark overlay; play icon z-indexed; fixed footer /my-videos → /history link
  - #310: AUTO-STRUCTURE — /api/generate-script transforma qualquer tópico em script estruturado antes de analyze-idea; fast-path sempre ativa; usuário digita tema livre
  - #309: Fix: restore all truncated route files (cron + viral-now + scenes + analyze-idea)
  - #307: VIRAL FAST-PATH — parseViralScriptSections() em código; voiceovers NUNCA reescritos pelo GPT
  - #306: Marcadores em inglês: MICRO REWARD/ESCALATION/RHYTHM
  - #305: analyze-idea detecta scripts virais → cores por vertical no dashboard
  - #301–303: Viral Now — tabela Supabase, API route, cards no dashboard, nav

## Arquitetura do pipeline de geração (v2.5)
1. Usuário digita qualquer coisa → GenerateClient chama /api/generate-script se não houver marcadores
2. generate-script (GPT-4o-mini, temp 0.7) → script estruturado com HOOK/MICRO REWARD/ESCALATION/PAYOFF
3. Script estruturado → `analyze-idea` → `parseViralScriptSections()` detecta marcadores → voiceovers verbatim → GPT só gera visual_prompt + caption
4. `scenes` → busca B-roll específico no Pexels com os termos derivados do voiceover real
5. Vídeo com conteúdo específico garantido — sem menina aleatória, sem narração genérica

## ⚠️ REGRA CRÍTICA: ao modificar componentes, sempre buscar os pares
- Sidebar.tsx → verificar MobileNav.tsx e HomePageClient.tsx (nav do top menu público)
- Viral Now cards → verificar DashboardClient.tsx E ViralNowClient.tsx (ambos renderizam cards)
- viral-now/route.ts (FALLBACK_TOPICS) → verificar cron/refresh-viral-now/route.ts (TOPIC_POOL)

## ⚠️ REGRA CRÍTICA — InVideo
**SEMPRE usar modo AUTOPILOT. NUNCA usar Agent One Pro.**
- Agent One Pro consome créditos demais e esgota a conta
- Autopilot usa 1–4 créditos por vídeo e gera automaticamente
- Se não tiver opção de Autopilot visível, perguntar ao usuário antes de prosseguir
- Se os créditos estiverem zerados, parar e avisar o usuário imediatamente

## Configuração dos vídeos InVideo
- **Somente 1 legenda/subtitle** por vídeo (não múltiplas)
- **Último segundo do vídeo:** incluir call to action com o site → **shortsforgeai.com**
- Formato: YouTube Shorts (9:16, vertical)
- Duração: ~35 segundos
- Estilo: dark, cinematic, fast-paced
- Idioma: Inglês
- Escolher sempre os temas com maior potencial viral (baseado nos Shorts que já performaram bem)

## ⚠ REGRA FIXA — DURAÇÃO 60s+ (fundador 18/08, TikTok Creator Rewards)
**Todo vídeo da casa (vitrine + canais do fundador) mira 60 segundos ou mais**
— o programa de Rewards do TikTok só monetiza vídeo >1min. Na prática: duração
60s no Studio + script de ~150-165 palavras (narração/2.3wps); o overshoot
TIKTOK-61 do planner já garante que o corte final passa de 60s. Script menor
que isso = pedir pro fundador confirmar antes.

## ⚠ REGRA FIXA — DRY-RUN ANTES DE TODO RENDER PAGO (fundador 24/08)
"Não posso gastar mais 7 dólares a cada teste." Todo script de Kling 3/H3
passa PRIMEIRO pelo validador de $0: POST /api/generate-video-cinematic com
`dry_run:true` + `script_mode:'verbatim'` (só contas do fundador). Devolve o
plano cena a cena (segundos, palavras, texto falado) com veredito PASS/FAIL
(mudo ≤6s e duração ≥95% do alvo) e estorna sozinho. Só se gasta crédito com
PASS na mão. Regra-irmã: ~150-165 palavras para 60s (79-85s de plano é a
faixa dos filmes bons: Mandel 68s, Pompeia 78s, Cyclops 75s).

## ⚠ REGRA FIXA — script SEMPRE vem com título + descrição + usekineo (fundador 25/08)
Toda entrega de script vem SEGUIDA, na mesma resposta, de: título YT, descrição
YT, legenda TikTok e comentário fixado — com **usekineo.com nos lugares
apropriados** (descrição = link + "made with usekineo.com"; fixado = CTA de
funil; TikTok = menção em texto). O vídeo é conteúdo E anúncio: nunca sai
script sem o pacote de publicação que converte espectador em cliente.

## ⚠ REGRA FIXA — formato de entrega de script (fundador 24/08)
**O bloco de código contém SÓ o script** — nada de config dentro, senão o
fundador copia as configurações junto para a caixa de texto do Studio.
A config vem FORA do bloco, logo embaixo, em uma linha compacta:
⚙ Config: usekineo.com/studio · motor (custo) · duração · script mode · avisos.

## ⚠ REGRA FIXA — REMETENTE POR TIPO DE CONVERSA (fundador 29/09; detalhe em docs/DECISIONS.md)
Comercial/parceria NOVA sai de joseph@usekineo.com (From e Reply-To); atendimento
em hello@ / support@usekineo.com; conversa já começada no Gmail pessoal continua
na mesma thread (sem reenviar nem migrar); support@shortsforgeai.com nunca é
remetente comercial novo. Antes de cada rascunho: conferir conta, From, Reply-To,
destinatário e histórico. Sem joseph@usekineo.com disponível = AVISAR o bloqueio,
nunca trocar de remetente em silêncio. Não autoriza envio, alias, SMTP nem
encaminhamento — rascunho sempre; o fundador envia.


## ⚠ REGRA FIXA — respostas de e-mail vão para o RASCUNHO (fundador 24/08)
Toda resposta que eu preparar para um cliente/parceiro vai DIRETO para os
rascunhos do Gmail dele, na thread certa (create_draft com replyToMessageId).
Nunca só mostrar o texto no chat — o fundador revisa e aperta Enviar.

## ⚠ REGRA FIXA — toda entrega vem com a PRÓXIMA JOGADA (fundador 24/08)
"Você precisa ser minhas ideias novas." Toda entrega termina com jogada(s)
de crescimento não-óbvias: o quê, como e por quê, tiradas dos dados do dia.
Exemplos do padrão: pedido de review no pico da alegria (pós-"clips ready"),
relatório de concorrente virando página /vs, prazo de mercado (morte do Sora
24/09) virando pauta de imprensa.

## ⚠ REGRA FIXA — scripts de vídeo (fundador 15/08)
**Sempre que o fundador pedir uma script de vídeo, entregar JUNTO as configurações de geração** — motor, duração, character, "Use my script as is" vs "Let AI structure", e custo em créditos. Nunca mandar script solta.
- Script escrita por mim/por ele → sempre "Use my script as is" (narração verbatim)
- Ideia solta de 1 linha → "Let AI structure my text"

## Workflow de vídeos diários
1. Verificar no YouTube Studio quais Shorts tiveram mais views/engajamento
2. Escolher 5 temas similares aos que viralizaram
3. Criar vídeos no InVideo com **Autopilot** (YouTube Shorts, 9:16, ~35s)
4. Configurar: 1 legenda + shortsforgeai.com no último segundo
5. Usuário baixa e sobe no YouTube

## ⚠⚠ REGRA FIXA — PROVOCAR O FUNDADOR, DOA O QUANTO DOER (fundador 04-05/10)
"Olha, Joseph, isso que você está fazendo não está no caminho certo. Vai nesse caminho que você vai ganhar mais
dinheiro." Origem: na noite de 04/10 descobrimos que os concorrentes (Higgsfield, Kling) faturam milhões com CLIPES de
5–10 s e efeitos de 1 clique, enquanto a Kineo passou semanas no filme narrado de 60 s — e ninguém tinha dito isso a ele.
Em UMA conversa o plano mudou (Clipes = produto 1, filme = produto 2, anual 40%, passe avulso). Daí em diante:
- Em toda análise, trazer SEM ESPERAR PERGUNTA o que o mercado/concorrente faz que nós não fazemos, e confrontar a
  estratégia quando dado de receita ou de concorrente apontar outro caminho.
- TODA discussão termina com um bloco "Não dá / dá melhor": o que não pode ser feito (e por quê), o que pode ser feito
  de um jeito melhor, diferente, ou que ganha mais dinheiro. Vem ANTES das listas ✅ / 📋.
- Dizer na cara quando a ideia do fundador perde dinheiro (ex.: clipe abaixo do custo da fal para igualar o Higgsfield).

## ⚠ REGRA FIXA — pensar junto, não só executar (fundador 16/08)
**Toda entrega vem com o raciocínio estratégico junto** — o "porquê" de produto/marca/receita, não só o "o quê". O fundador quer as sacadas explicitadas pra pensar e progredir junto.

### Log de sacadas (princípios que já viraram decisão)
- **"Studio", não "Generate"**: formulário → sala de direção. Cliente que se sente diretor paga mais. E o nome da página fala a língua do tier premium (Studio) — upsell vira geografia, não venda.
- **Motor = câmera; nós = diretor** (40/60): o modelo terceiro decide ~40% do resultado; prompt de cena, âncoras, seed, negative, voz, legendas e ritmo são nossos. Investir nos 60%.
- **Fixo onde precisa ser instantâneo, IA onde precisa ser fresco, IA pesada só onde gera dinheiro** (arquitetura de custo/latência das sugestões).
- **Piso de qualidade é engenharia, não compra**: DNA cinematográfico, image-first, quality gate com re-render. Nada de infra nova.
- **Selo honesto é ativo de marca**: badge do motor = motor real, sempre. Vitrine mente → produto morre.
- **Mais motores = upside quase puro** (pay-per-use, zero fixo), COM piso de qualidade curado e hierarquia na escolha (senão vira paralisia).
- **Upgrade grátis existe**: fal cobra igual 720/1080 no Veo Fast — sempre checar o schema do fornecedor antes de assumir custo.

## Informações do projeto
- **Marca (UI):** Kineo / Kineo AI — nome exibido no site
- **Produto/domínio (produção):** shortsforgeai.com (NÃO mudou — env, CTA nos vídeos e Stripe ainda usam esse domínio)
- Canal: Money Facts / Finanças em inglês
- App (deploy Vercel): https://shortsforgeai.vercel.app
- **Repo GitHub:** josephsskaf-hub/UseKineo (branch main)
- Pasta local: C:\Users\josep\OneDrive\Área de Trabalho\Usekineo
- Email: josephsskaf@gmail.com
- Push para GitHub: criar .bat e rodar via computer use
- **REGRA FIXA (fundador 15/08): a cada rodada de trabalho pronta pra subir, criar um N-PUSH.bat NOVO** (numero sequencial em scripts/, formato: `@echo off` + `call "%~dp01-PUSH.bat"`, CRLF) e avisar o fundador do numero — assim ele sempre sabe qual e o mais recente

## Rodar localmente (dev)
1. `npm install` (só na primeira vez / quando o package.json mudar)
2. `npm run dev` → http://localhost:3000
3. Requer `.env.local` na raiz com chaves reais (Supabase, Stripe, OpenAI, Pexels,
   Creatomate, Runway, Resend). O `.env.local` NÃO vem no repo — copiar de
   `.env.local.example` e preencher. Sem as chaves a landing carrega, mas
   login/checkout/geração de vídeo não funcionam.


---

## PARTE 2 — cópia local de C:\kineo até 13/11

# CLAUDE.md — Regras Permanentes para todas as sessões

# ══════════════════════════════════════════════════════════════════════════
# 🧠 LER PRIMEIRO — docs/MEMORIA-SESSAO-CEO-2026-09-02.md (02/09)
# ══════════════════════════════════════════════════════════════════════════
# · SEM SPRINT AUTOMÁTICA: o fundador desligou as tarefas programadas em 02/09
#   (Fable a 79% do limite, reinicia 07/09). Trabalho é PONTUAL, uma ação por
#   vez. Tarefa mecânica (teste/commit/publicar/painel) roda em Opus/Sonnet;
#   Fable só para análise densa e código difícil.
# · CRÉDITO NÃO É ISCA: winback-25 deu 25cr a 95 pessoas (2.375 créditos) e
#   teve ZERO cliques em 24h. A isca é o FILME PRONTO sobre o tema que a
#   pessoa já fez; o crédito vem no clique, não antes. 264 ainda elegíveis.
# · CHECKOUT DE CONTA SEM VÍDEO = DEFEITO, NÃO DESEJO: 3 dos 4 checkouts de
#   02/09 eram contas com 0 vídeos e modal trial_ended com 1h de vida e 25cr
#   intactos. Contar separado de checkout de quem já entregou vídeo.
# · UMA RÉGUA POR VOZ, NUNCA UMA SÓ: clássico (Seedance 1.5/Kineo 1/Veo/Kling
#   2.5) = tts-1-hd a 3,1 pal/s (35s=100-115 · 60s=175-195 · 90s=265-290);
#   hollywood (Kling 3/H3/Omni/S25) = voz própria a 2,3 pal/s. Padronizar os
#   dois no mesmo número QUEBRA um dos lados.
# · 35/60/90 É NORTE, NÃO CAMISA DE FORÇA (fundador 02/09, validando o Kineo 1
#   novo: pediu 35s, saiu 39s, nota 9): "não aperte a régua — a flexibilidade é
#   o que faz o vídeo sair com maior payoff, mais completo". PASSAR do alvo é
#   bom; ficar ABAIXO é defeito (história interrompida). A régua serve para o
#   ROTEIRO nascer do tamanho certo, nunca para AMPUTAR o filme no fim.
# · O PRIMEIRO VÍDEO É O PRODUTO: 14d/174 pessoas — os 4 pagantes vieram da
#   PRÓPRIA IDEIA (manual). Auto-start = 40% dos primeiros vídeos e 0 pagantes.
#   Kineo 1 + Seedance 1.5 são os motores de 100% das primeiras impressões.
# · KINEO 1 usa PIXABAY (Pexels desligado no #351). Melhorias de 02/09:
#   letterbox 6%, fade de abertura, grade +1 degrau, penalidade de baixa
#   resolução no ranking, corte até 4,5s. NÃO usar color_filter/playback_rate/
#   vinheta radial sem render de validação — propriedades nunca exercitadas.
# · 📂 PASTA = C:\kineo (mudou em 03/09). O caminho antigo do OneDrive está
#   MORTO — era ele que matava o shell (acento + espaço + lock do OneDrive).
#   Toda sessão nova: confirmar C:\kineo antes de qualquer comando.
# · MOBILE: projeto com pasta local só roda no desktop. Do celular, só via
#   Despacho (Configurações → Cowork), com este PC ligado.
# · O QUE SÓ EXISTE NO CHAT SOME: decisão nova vira arquivo em docs/ no mesmo
#   dia (bug do Cowork em 02/09 matou o shell de uma sessão inteira).

# ══════════════════════════════════════════════════════════════════════════
# 🚚 ENTREGA — REGRA FIXA DESDE 01/09/2026 (LER ANTES DE ENFILEIRAR)
# ══════════════════════════════════════════════════════════════════════════
# · Robô KineoPushAuto DESLIGADO pelo fundador (01/09). Push é MANUAL: ele
#   clica em SUBIR-SITE.bat (raiz) → chama scripts\!RODAR-AGORA.bat v9.
#   TODA sessão, ao deixar entrega pronta, AVISA o fundador: "hora de clicar".
# · NUNCA `git branch -f entrega-atual <hash>` direto. Em 01/09 isso apagou a
#   fila alheia 4 vezes (Claude 2×, sprint 2×). O único jeito é
#   `bash scripts/enfileirar.sh` de dentro da worktree: rebasa POR CIMA do
#   que já está na fila e só então move a branch.
# · Diários (docs/SPRINT-*.md, *DIARIO*, PAUTA-*) fazem merge por UNIÃO
#   (.gitattributes) — nunca mais conflitam; o v9 também resolve sozinho.
# · Conflito REAL (código) = o bat imprime o arquivo e para. Decisão humana.
# · Bats antigos da raiz (53/73-PUSH) foram desarmados (.VELHO-NAO-USE).
#
# ══════════════════════════════════════════════════════════════════════════
# 📍 ESTADO — 01/09/2026 (D-DAY DOS 4 MOTORES) — LER ANTES DO 28/08
# ══════════════════════════════════════════════════════════════════════════
# · 4 MOTORES NO AR: voz MiniMax Speech-2.8 HD (/audio, prompt+output_format
#   url; clone segue 02), música Lyria 3 Pro embutida em todo render
#   (lib/lyriaMusic.ts, Pixabay de rede), Nano Banana Pro (já estava; copy 4K
#   corrigida), Seedance 2.5 = família 's25' na estrada hollywood, 480p +
#   Enhance, 150cr (decisão do fundador "opção esperta", margem ~65%).
# · INTERRUPTOR ÚNICO lib/engineLaunch.ts S25_PUBLIC=false: só contas internas
#   veem o 2.5 (mega-menu, /studio, /generate); true abre pricing, FAQ, schema,
#   calculadora e a página /ai-video-generator/seedance-2-5 de uma vez. Só
#   virar depois do canário aprovado pelo fundador.
# · CANÁRIO S25 de 01/09 21:00: 6 cenas submetidas, 3 ok, 3 FALHARAM com 503
#   da fal (capacidade), too_few 3/6 → não montou, 150cr estornados. Retry
#   02/09 ~9h BRT com o mesmo script (Batalha de Los Angeles 1942, 148 palavras,
#   dry-run PASS 67s). Dívidas: cena falhou → retentar a CENA (hoje mata o
#   filme); tela do /studio morre em 503 (mostrar "motor lento, 15-20 min").
# · NEW só em MiniMax 2.8 HD e Seedance 2.5; Omni virou "#1 RANKED"; banner
#   NEWS do /studio removido. Cards da home intocados (curadoria do fundador).
# · CRONS QUE DORMIAM 30 DIAS (vercel.json sem ?confirm=SEND): send-failure-
#   recovery e send-momentum-nudge — acordados 01/09; teste permanente
#   scripts/test-cron-dryrun-eterno.mjs.
# · WINBACK 01/09: comeback50 7 enviados; send-winback-25 (nova rota admin,
#   dry-run por padrão) 95 pessoas +25cr, 264 elegíveis restantes — disparo
#   é LINK de 1 clique do fundador (classificador bloqueia o Claude):
#   /api/admin/send-winback-25?confirm=SEND&limit=60
# · ADMIN: overview paginado (dizia 3 pagantes/$51; real 7/$109); live
#   'online' só conta evento com session_id (server events não são presença).
# · TAAFT: listing v3.2.0 publicado 01/09 com crédito grátis do Nick;
#   screenshot da listagem ainda antigo ("Five engines").
# · FAL: pré-pago via Pix (fundador sem limite no cartão). Auto top-up gera
#   negativa→fatura→Pix; sugerido $50/$15. Rascunho p/ support@fal.ai pedindo
#   Pix direto. Saldo 01/09 22h: $36,88.
# · CLIENTES: 7 pagantes, MRR ~$109. Emilio (starter) renovou 01/09 — 1º ciclo
#   completo; 40cr e 0 vídeos em 7d → e-mail de uso esta semana.
# · PRÓXIMO: retry S25 + vídeo do dia nas 3 redes ("abre os anexos" = eu abro
#   IG/TikTok/YT até o anexo, fundador solta o arquivo, eu publico) + lotes
#   restantes do winback-25 + e-mail do Emilio.
#
# ══════════════════════════════════════════════════════════════════════════
# 📍 ESTADO DE PRODUÇÃO — 28/08/2026 ~14:20 UTC (LER PRIMEIRO)
# ══════════════════════════════════════════════════════════════════════════
# origin/main = eab4ae70e28563125e62de2682ebefeeab6ac1ec · deploy READY em
# producao (usekineo.com). Sequência do dia sobre a main do Codex (8278828):
#   f99158e painel · a1fed16 trial órfão · eab4ae7 hotfix JWT-skew
#
# ⚡⚡ CONVENÇÃO NOVA DE ENTREGA — scripts\!RODAR-AGORA.bat (pedido do
#   fundador: "tem que ficar no topo da pasta"). O "!" ordena acima de tudo.
#   MOTIVO: os bats 356/357/358/359 chamavam 1-PUSH.bat, que empurra a MAIN
#   LOCAL — parada no 727a869 reprovado. Quatro "pushes" que não subiram nada.
#   O !RODAR-AGORA v2 empurra `git push origin <hash>:main` DIRETO DA RAIZ,
#   pelo hash do commit de integração — worktree criada na sandbox Linux tem
#   ponteiro .git com caminho /sessions/... que o git do Windows NÃO resolve
#   ("not a git repository (NULL)", visto na tela do fundador). Toda entrega
#   nova: cherry-pick sobre origin/main numa worktree, typecheck+testes,
#   reescrever o !RODAR-AGORA com o hash novo. NUNCA voltar ao 1-PUSH.
#   ⚠ AINDA NÃO ENTREGUE: 800ce14 (hover da oferta de boas-vindas, worktree
#   scene-truth, ex-356) — integrar na próxima leva.
#
# 🔴 INCIDENTE JWT-SKEW 28/08 (10:30→~13:50 UTC) — ENCERRADO:
#   PostgREST recusou todo token fresco com PGRST303 "JWT issued at future"
#   (relógio do auth adiantou; infra do Supabase, não nosso código). Derrubou:
#   3 cadastros do ChatGPT (24 falhas compose_not_ok, 0 vídeos), e a conta do
#   FUNDADOR mostrou 0 créditos + "No videos yet" com 327 vídeos intactos —
#   as telas mascaram erro de leitura como vazio. Cura: Restart project no
#   dashboard (feito pelo fundador) + hotfix eab4ae7: lib/jwtSkewFallback.ts,
#   releitura do PRÓPRIO dado via service key (id já verificado no getUser)
#   em compose/footage/credits/videos/plan. Só leitura, nunca escrita; loga
#   warn a cada ativação — warn no log = Supabase doente de novo, Restart.
#   Validado: render do fundador (60s Kineo 1, "5 shocking facts about
#   money") completou em ~6min às 13:59 UTC. Dívida de produto anotada:
#   4 telas esconderam o mesmo erro de 4 jeitos; nenhuma disse "instável,
#   tente de novo".
#
# 💸 SUPABASE: SPEND CAP DESLIGADO (fundador, 28/08) — projeção US$ 30,85/mês
#   (25 do Pro + ~6 de excedente). Ameaça de restrição em 22/09 MORTA. Nada
#   foi apagado. Vilão do estouro: bucket `broll` = 79,9 GB de CACHE Pexels
#   (72 GB só no último mês; 912 de 1.713 clipes usados ≤1x) vs 39,3 GB de
#   vídeos de cliente. Pendente: teto+faxina do broll (broll-gc tem paginação
#   sem ORDER BY que pode APAGAR clipe bom — consertar antes de rodar; só
#   executar apagamento com "vai" explícito do fundador) e, se excedente
#   passar de US$ 30/mês, mover entrega de vídeo para R2/CDN.
#
# 🔧 CONSERTOS DE 27-28/08 EM PRODUÇÃO (não reinvestigar):
#   · TRIAL ÓRFÃO (a1fed16): grant movido p/ app/auth/callback/route.ts — o
#     único ponto servidor que TODA conta nova cruza. Era visita-de-página
#     (/studio/create) + fetch fire-and-forget; quando o pouso pós-login virou
#     a home (25/08), 17%→100% dos cadastros nasciam com 0cr. 4 vítimas
#     reparadas à mão (felix/mjt/lenny22/talsadeh, evento repair:true).
#   · PAINEL /admin (f99158e): RPC admin_live_counters conta no banco (o
#     PostgREST truncava em 1000 SEM ERRO → visitors 7d=24h=435; real era
#     1820/574). internal()/PAID_PLANS locais mortos; fetchAllRows ordena;
#     card CHECKOUT LEAK mede checkout_started real (98 pessoas, não 44;
#     das 36 "abandonaram checkout", 1 clicou de verdade, 16 sem evento).
#   · Stripe sessions com autoPagingEach + conta interna excluída ANTES dos
#     contadores.
#
# 🔭 VIGIAS ATIVOS: kineo-vigia-12h (a cada 2h; checagem zero = cadastro sem
#   crédito; depois despacho vazio/débito sem entrega/preso/causas antigas/
#   pulso; PODE reparar trial órfão sozinho com FNV-1a e avisar) +
#   kineo-vigia-clientes-3h (placar pós-marco) + resumo 21h + vigia motores 9h.
#
# 📌 ACHADOS DA AUDITORIA 28/08 AINDA SEM CONSERTO (ordem recomendada):
#   1. AFILIADOS NUNCA PAGARAM NINGUÉM: 12 ativos, 17 cliques, 0 atribuições,
#      0 comissões. Cookie sf_aff só é lido por rota chamada de dentro do
#      (dashboard); o caminho de compra não passa lá antes do webhook. Codex
#      mexeu em "zero-click affiliates" em 28/08 — conferir se fechou o furo
#      antes de codar por cima.
#   2. AVATAR INVISÍVEL, não quebrado: 0 débitos NA HISTÓRIA; anunciado como
#      1 dos 8 motores mas ausente dos seletores de /studio E /generate.
#      Conserto barato = card no /studio.
#   3. TRUNCAMENTO SISTÊMICO (40+ pontos): /admin/overview (MRR sobre 1000 de
#      1469 perfis), /admin/trial-roi (CAC muda por refresh), funil, e 7
#      campanhas de e-mail com dedupe truncável (reenvio 8× rearmado). Maior
#      alavanca: wrapper com tripwire data.length>=1000.
#   4. COPY QUE MENTE: "12 characters" (servidor dá 3), "priority queue"/
#      "1080p Kling"/"premium voices" (não existem; a 1ª está NO RECIBO da
#      Stripe), "every engine unlocked" com 25cr (Kling 3 custa 150),
#      "forever storage" sem retenção real, clamp silencioso de 15s no free,
#      Kineo 1 "free" no mega-menu (cobra 5 de pago).
#   5. PayPal/MP/Hotmart: idempotência invertida (claim antes do grant, erro
#      engolido) — tabelas hoje VAZIAS, risco armado. Copiar o padrão do
#      webhook Stripe (libera guard + 500 p/ retry) antes do 1º cliente real.
#
# 👤 CONTA DO FUNDADOR: plan=pro, has_paid, ~1.489cr (1.494 − teste de 60s ÷
#   Kineo 1). Joscha (19joschaschuetz96): +100cr de desculpa (6 falhas por
#   despacho vazio 25-26/08, fal_models:[] — nunca foi falta de crédito).
#   5 rascunhos pessoais no Gmail do fundador aguardando envio (Joscha,
#   sm1634671, maahiii1840, adolfo em ES, pedro em PT-BR) — trial de Joscha e
#   Pedro fecha 28/08 ~17h BRT; depois disso, reescrever antes de enviar.

# ══════════════════════════════════════════════════════════════════════════
# 📍 ESTADO DE PRODUÇÃO — 27/08/2026 (histórico)
# ══════════════════════════════════════════════════════════════════════════
# origin/main = debe92b8f6726bb694b7aed0f2fccb5536b933d5
# deploy      = dpl_C4sH2QHn5H57E41AeDXqBz2pa4p4 · READY · production
# Sequência do dia: 40e4381 → 558127f → 5e3a786 → 0d9969c → debe92b8
#
# ✅ MENINO DA BOLHA MORTO EM PRODUÇÃO (debe92b8). O contrato C3 cortava o
#   prompt da cena repetida por CONTAGEM DE PALAVRAS (`.slice(0,14)`). Na cena
#   4 do render 37c8d832 a palavra 14 era `Mouth` — início de "Mouth closed,
#   not speaking" — e a proibição viajou decapitada. O motor leu "boca" como
#   PEDIDO. lib/hollywood/varietyAxis.ts agora PREFIXA o eixo em vez de
#   amputar, corta em fronteira de frase, rejeita corte que termina em
#   proibição quebrada, e protege a cauda onde vivem os 4 sufixos.
#   23 verificações em scripts/test-variety-axis.mjs com o texto REAL.
#
# ✅ EM PRODUÇÃO (baccabf): TOP 5 ITEM 2 (Diretor de Formato) está LIGADO —
#   route.ts:35 importa e :1064 chama decidirFormato(). Misterio/historia/
#   ciencia/noticia nascem documentary_faceless sem a tag [faceless].
#
# 📊 MARCO ZERO DO PLACAR PÓS-CONSERTO — 2026-08-27 18:25:58 UTC (15:25 BRT)
#   Decisão do fundador: "faz de agora pra frente, pra eu saber se depois das
#   coisas que a gente arrumou tá dando certo."
#   TODA medição de eficácia dos consertos usa
#   `created_at > '2026-08-27 18:25:58+00'::timestamptz` — nunca "últimos N
#   dias", que mistura o antes com o depois e não prova nada.
#   O que precisa ser provado: debe92b8 (menino da bolha), ff822bd (contrato
#   de cena em 3 motores), 265ddfc (vitrine "Free"), e a onda #349/#350/#353.
#   Estado no marco: 12 entregas e 0 falhas no dia até 15:25.
#   Vigia automático: tarefa `kineo-vigia-clientes-3h`, a cada 3h.
#   ALERTA PRINCIPAL = reaparecimento de causa antiga (TypeError,
#   compose_not_ok, generate_script_not_ok, openai_quota_dead, full capacity,
#   resolved=false).
#
# ⚠ COBERTURA REAL DO CONTRATO DE CENA (medido 27/08 no render do Veo):
#   o gate roda DENTRO do laço do hollywoodPath, e
#   `hollywoodPath = wantsHollywood || wantsH3 || wantsOmni` (route.ts:1142).
#   Portanto ele cobre 3 dos 8 motores: Kling 3, MiniMax H3 e Omni Flash.
#   VEO, KLING 2.5, SEEDANCE e KINEO 1 PASSAM POR FORA — vão pelo caminho
#   clássico e NÃO têm contrato fala×imagem. Provado em produção: o render
#   705368ff (Veo, 9/9 cenas aceitas) gravou `visual_mode` e `contrato_cena`
#   NULOS no claim. Não assumir que o gate protege o produto inteiro.
#
# ⏭ HISTÓRICO: worktree .claude/worktrees/scene-truth, HEAD
#   ff822bde6b2abc2ba5c805ffd6f86dd1bd95be08, 1 commit sobre baccabf.
#   Bat: scripts\353-PUSH.bat. Diff completo para auditoria em
#   docs/PACOTE-PREPUSH-CONTRATO-CENA-2026-08-27.md. Fecha D1/D2/D3 abaixo:
#   o gate roda em route.ts:3235 ANTES do submitToFal, com hs.voiceover como
#   fala e o prompt COMPLETO; corrige em vez de bloquear (lição do #349); e
#   grava `contrato_cena` + `visual_mode` no claim. 53 verificações, 8 delas
#   lendo route.ts para provar o caller. NÃO SUBIR sem o ok da auditoria.
#
# ⛔ HISTÓRICO — TOP 5 ITEM 1 v1 NÃO ESTAVA FECHADO — retratação
#   minha, 27/08. lib/cinematic/sceneTruth.ts está em produção mas é BIBLIOTECA
#   MORTA: `grep -rn sceneTruth app/ lib/ components/` devolve ZERO callers fora
#   do próprio arquivo. As 24 verificações provam a biblioteca isolada, NÃO que
#   a rota aplique o contrato antes do POST pago. Eu resumi isso ao fundador
#   como "GATE 1 fecha" — o commit era honesto ("ainda nao ligadas"), o meu
#   resumo não foi. Buracos conhecidos, ainda abertos:
#     · montarContrato() grava acaoObrigatoria: null (sceneTruth.ts:206) —
#       a ação obrigatória do contrato nunca é preenchida nem verificada;
#     · verificarContrato() APROVA sujeito fora do LEXICO_VISUAL: quem não
#       está no léxico não tem como reprovar. O léxico cobre 5 entidades.
#   ⚠ O DEFEITO QUE ISSO MATA: `facelessRequested` só era true com a tag
#     `[faceless]` — que nenhum cliente conhece. O padrão de fábrica era
#     APRESENTADOR PARA TODO MUNDO, e router.ts:480 ainda mandava
#     hostFits=true para "documentary/mysteries/history/facts".
#
# 🚫 TOP 5 ITEM 4 (Editor-Crítico por frames do clipe) É INVIÁVEL HOJE:
#   não existe ffmpeg, sharp, canvas nem qualquer extrator de frame no
#   package.json, e nenhuma rota extrai frame de MP4. Só é possível analisar
#   o STILL PRÉ-VÍDEO, não o clipe pronto. Não prometer o que não dá.
#
# 💡 ACHADO DE PRODUTO (27/08): `select count(thumbnail_url) from videos`
#   = 0 de 1129. A coluna é LIDA em 4 telas (/library, /my-videos, /studio,
#   /generate) e NUNCA foi gravada uma vez. Só é preenchida a partir do
#   snapshot do Creatomate, que não vem. Enquanto isso, o pipeline JÁ PAGA
#   ~$0,10 por um still FLUX 9:16 do primeiro quadro (lib/hollywood/anchors.ts)
#   e JOGA FORA. Esse still resolve de graça: thumbnail, og:image do /v/ e o
#   portão de qualidade do item 3.
#
# ⚠ A ÁRVORE PRINCIPAL LOCAL ESTÁ SUJA E OBSOLETA. `main` local aponta para
#   727a869 (#353A.2a v5, REPROVADO pela auditoria e NUNCA pushado), nascido
#   em cima do 62dcce2 que já não é a ponta. NÃO usar para push. Não descartar
#   sem ordem do fundador. Sujeira: ~205 tracked (Linux, autocrlf vazio) /
#   ~55 (Windows, autocrlf=true) + 254 untracked — quase tudo diferença de CRLF.
#
# 🔒 REGRA FIXA — TODO TRABALHO NOVO NASCE EM WORKTREE LIMPA:
#   git fetch origin && (confirmar origin/main) && git worktree add ... --detach
#   Nunca rodar batch antigo. Nunca reaplicar migration já registrada.
#
# ✅ VALIDADO EM PRODUÇÃO EM 26-27/08 (não refazer):
#   · public.events FECHADA: anon/authenticated/PUBLIC sem NENHUM privilégio;
#     service_role só SELECT/INSERT/UPDATE/DELETE; policy `service_insert`
#     REMOVIDA; sobrou só `no_public_read`; RLS ligado. INSERT anônimo testado
#     → permission denied. Migrations: events_lockdown_service_role_only e
#     events_service_role_least_privilege. NÃO reaplicar.
#   · animate_job_settled agora é SERVER-ONLY. O cliente emite
#     `animate_client_poll_observed`. Os dois papéis foram separados; o sweep
#     do Animate continua usando animate_job_settled como fato do servidor.
#   · RENDER PAGO REAL (canário Seedance 35s, 15cr): 4 planejadas / 4 aceitas /
#     0 rejeitadas · http 200 · invariant_ok=true · 4 POSTs · claim settled ·
#     1 débito de 15, refunded_at null · videos.status=completed · MP4 · 43s.
#   · BUG DETERMINÍSTICO CORRIGIDO (5e3a786): "Use my script as is" + prosa SEM
#     marcadores produzia segments=[] → ZERO cenas → 502 de despacho. Agora o
#     servidor divide a prosa em blocos determinísticos sem tocar nas palavras.
#
# 🔍 ONDE ESTÁ A CAUSA DE QUALQUER FALHA (descoberto 26/08, ninguém lia):
#   events.metadata->>'error' de `generation_stage_error` guarda a FRASE EXATA
#   que o servidor devolveu ao cliente. Sempre esteve lá. É a primeira coisa a
#   consultar em qualquer investigação de render.
#   E `cinematic_dispatch_result` (#353A) grava status do fornecedor cena a
#   cena: planned/accepted/rejected/ambiguous, histograma de HTTP, total_posts.
#
# ⏳ EM ABERTO, nesta ordem:
#   1. Observar a próxima rejeição ORGÂNICA da Fal em cinematic_dispatch_result
#      e confirmar se o #353B recupera cenas parciais. Ainda NÃO exercitado
#      (o canário aceitou 4/4).
#   2. P0-C em commit separado: preflight de crédito + reconciliar vídeos
#      entregues com débito zero.
#   3. Só depois: fluxo, aquisição, conversão.
#
# ⚠ OBSERVAÇÕES NÃO BLOQUEANTES (não abrir hotfix impulsivo):
#   · 27/08 00:57 UTC: cinematic_dispatch_result com http 401, 0 POSTs, e
#     `claim_action=unknown` — esse ramo não passa pelo finalizador financeiro.
#     Custo zero, mas o desfecho não fica registrado.
#   · DeprecationWarning de url.parse() em /api/compose. Localizar se é nosso
#     ou de dependência antes de mexer.
#   · A causa das 4 falhas históricas de 19joschaschuetz96 (25-26/08, Seedance,
#     0 cenas aceitas nas 4, crédito devolvido nas 4) é DESCONHECIDA e vai
#     continuar: o #353A subiu 10h depois e os logs da Vercel expiraram.
#     Não inventar encerramento.
# ══════════════════════════════════════════════════════════════════════════

# ⚡⚡ MODELO DE TRABALHO (fundador 25/08 — "gravar isso"):
# O FUNDADOR É CONSELHO, EU SOU O CEO-EXECUTOR. Ele direciona, percebe,
# provoca; eu verifico o que é melhor, executo 100% e entrego PRONTO para
# ele analisar e testar. Autorização permanente para: e-mails (respostas
# sempre em rascunho), banco, código+commit+bat, Chrome dele, renders de
# validação (sempre dry-run $0 ANTES), concessão de créditos prometidos.
# Não perguntar "posso?"; entregar feito com o raciocínio junto e a próxima
# jogada. Exceções que continuam dele: apagar dados permanentemente, dinheiro
# saindo (compras/planos novos), e decisões de preço público.

# ⛔⛔ REGRA FIXA — LINK DE REVIEW É SÓ O TAAFT (descoberto 25/08):
# producthunt.com/products/kineo NÃO É NOSSO — é outro produto homônimo
# (kineo.studio, "article to video", BYOK WaveSpeed). TODA campanha de review
# de 19/08 e 24/08 mandou clientes para lá: as reviews do Rick e do Victor
# foram escritas na página de um CONCORRENTE e não aparecem em lugar nenhum.
# Nós NÃO temos página no Product Hunt. Link certo, único, para qualquer
# pedido de review: https://theresanaiforthat.com/ai/kineo/ (nossa página,
# 5 notas média 3.0, dona = conta do fundador). Victor foi pago (100cr,
# admin_credits_granted 25/08) e avisado do erro com o link certo no
# rascunho. Pendência: listing do TAAFT está DESATUALIZADO (fala trial de
# 40cr e "from $9.90/mo" — hoje é 50cr e $7) — fundador edita no dashboard.

# 🔒 CONCLUSÃO JÁ FECHADA — NÃO REABRIR (fundador 19/08, estudo repetido
# várias vezes): O VAZAMENTO DO CHECKOUT É PREÇO. As pessoas chegam na
# página de pagamento, ACHAM CARO e não compram. NÃO é erro de cartão, NÃO é
# recusa de emissor, NÃO é trilho de pagamento (UPI/Pix/e-mandate do RBI).
# Já foi investigado mais de uma vez e deu a mesma coisa todas as vezes.
#   ⛔ NÃO gastar sessão re-investigando "será que o pagamento está quebrado?"
#   ✅ Toda hipótese de conversão parte de PREÇO/OFERTA/PERCEPÇÃO DE VALOR.
# Cegueira conhecida (não confundir com evidência): a tabela `events` NUNCA
# teve um único `checkout_payment_failed`, e `metadata.customer_country` vem
# null em 100% dos eventos — inclusive nos que PAGARAM. Ou seja, esses dois
# campos NÃO PROVAM NADA em nenhuma direção. Quem tentar concluir a partir
# deles (como eu tentei em 19/08) vai errar. A verdade sobre recusa só existe
# no painel da Stripe.
# Números que sustentam a conclusão (funil 7d, medido 19/08): 247 cadastros →
# 135 fizeram vídeo → 44 chegaram ao checkout → 0 assinaram, e os 44 tentaram
# 2+ VEZES. Quem volta duas vezes quer comprar; travou no valor.
# ⚡⚡ SYNC 17-18/08 (sessão CEO — segunda de 8 produtos) — LER ANTES DE QUALQUER COISA:
# - PRICING V5 (fundador aprovou): Starter $9.90/60cr · Creator $19.90/140cr ·
#   Studio $39.90/320cr · Autopilot $299/400cr. SEM 1º MÊS COM DESCONTO em
#   NENHUM plano (INTRO_PRICES = preço cheio → hasIntroOffer() false; NÃO
#   reintroduzir "first month" em copy). Trial grátis = 50cr. O $4.90 MORREU.
#   Página de preços fala em FILMES ("≈ 7 engine films/mo"), não em créditos.
# - PRODUTOS NOVOS EM PROD: /images (6 motores fal: schnell 1cr/dev 2/seedream 3/
#   grok 3/recraft 4/nanobanana 5 + upscale ESRGAN 1cr) · /audio (TTS: minimax 2cr/1k
#   OBRIGATÓRIO output_format:'url', eleven 2, dia 1, kokoro 1 — param é `prompt`!) ·
#   /library (abas Videos/Images/Audio) · ✨HD Enhance (fal-ai/topaz/upscale/video,
#   Proteus, upscale_factor 1 = tier $0.02/s; fator 2 = $0.08/s NÃO usar; 10cr,
#   Studio ganha 2 grátis/mês via videos.enhanced_at) · /ai-video-upscaler (SEO).
# - STORAGE: tabelas images/audios (RLS select own) + bucket renders (limite
#   ELEVADO a 250MB via SQL) paths images//audio//enhanced/. TODA mídia gerada
#   DEVE persistir no nosso bucket (URL do fal expira!). Enhance tem SELF-HEAL:
#   GET re-copia URLs fal→bucket. Popup da conta = painel 950×430 (medida do
#   fundador) com Library+storage. Limites por plano: free 10/14d, starter
#   100/90d, creator 500/forever, studio ∞ (gate de enforcement ainda NÃO existe).
# - CURADORIA/VITRINE (fundador): NATUREZA — raios/chuva/mar/aventura; FOGO FORA.
#   Maracaibo (4b12925e) slot 1 do Kling 3 + reel de entrada (mulher+tempestade
#   0.2-4.7 e avalanche 16.6-19.9 = 4b12925e-avalanche.mp4). Previews agora
#   crf19-20@1400px CORTADOS DOS MASTERS ENHANCED quando existirem (não mais
#   640px!). components/AuthReel.tsx = reel único de login+signup (avança
#   onEnded, NUNCA timer fixo — clipes têm durações diferentes).
# - LOGIN E SIGNUP = split-screen (vitrine esq., form 440px dir.) — mexeu num,
#   mexe no outro (AuthReel compartilhado).
# - ✅ CONTRATO-HOLLYWOOD EXECUTADO (18/08 manhã, commit c33a737): C1 verbatim
#   = roteiro redistribuído EM CÓDIGO cena a cena (GPT só dirige câmera, nunca
#   escreve fala); C2 piso 95% do alvo + FAILFAST 60→90% + secondsOf/secondsFor
#   honram segundos exatos (o molde 5|10/8/teto-10 encolhia 51s→44.8s!) + teto
#   de apara 60→64s (Rewards exige >60); C3 variedade com dentes (divergência
#   determinística em código, "best effort" morreu); C4 watermark = design do
#   fundador (FORCE_WATERMARK_EMAILS, Push #434 — decisão dele manter/tirar).
#   ⚠ espelhos: secondsOf (app/api/compose/route.ts) ≡ secondsFor (lib/
#   compose.ts) — mexeu num, mexe no outro. FALTA: validação com re-render do
#   Boiling River (fundador roda; aprovado só se ≥61s + narração fiel + zero
#   cena repetida/borrada). QA por pixel (Laplacian/luma) ficou pra V2 —
#   exige ffmpeg no server; claim assinado não guarda prompt p/ re-render.
# - PENDÊNCIAS: [18/08 noite] preço do Kling 3 — filme agora sai 64-73s ≈
#   $11-12 de fal em 150cr (margem 35-45%); fundador decide AMANHÃ entre manter
#   150cr / 180cr / preço-por-segundo no V4 (recomendação da sessão CEO: manter
#   agora, embutir por-segundo no /generate V4 — NÃO mexer antes da decisão) ·
#   gate de storage (V2) · assinantes antigos $24.90 recebem 140cr
#   (decidir grandfather 150) · Starter regional $4.99 (fundador pode querer
#   subir) · pack one-time $2.90/$4.90 do Offer290Banner (decisão pendente) ·
#   score viral aleatório (74 vs 81 mesma prompt) · Channels/série com memória
#   (tese aprovada, não construída) · MiniMax-H3 candidato nº1 a motor novo.
# ⚡ SYNC 15/08 (sessão CEO) — LEIAM ANTES DE MEXER NA HOME/EXAMPLES:
# - HOME VIROU VITRINE DE MOTORES (sem composer! decisão do fundador): 4 cards
#   500x280 full-bleed (Seedance 1.5/Kling 2.5/Veo 3.1/Kling 3) com 4 clipes
#   curados cada, girando sozinhos em crossfade — componente EngineCycleCard
#   (double-buffer, NÃO simplificar) + lib/engineWall.ts (CURATED/PREVIEWS/
#   EXCLUDED são curadoria manual do fundador — NÃO tocar sem ordem dele)
# - Clipes leves em public/previews/{id}.mp4 (8s 640px crop 500:280) e posters
#   em public/posters — regenerar via ffmpeg se trocar curadoria
# - NOMES REAIS dos motores no site: Veo 3.1, Kling 2.5, Kling 3 (ex-Hollywood),
#   Seedance 1.5, Kineo 1 (ex-Fast), Avatar (ex-AI Presenter) — manter em TODOS os pares
# - /examples = grade fixa dos 20 melhores (EXAMPLES_BEST) · Trending na home
#   tem filtro anti-prompt · nav tem dropdowns Image/Video (CSS puro)
# - Página inteira full-width (.wrap sem max-width) · seções compactas (34px)
# - Placar 15/08: 14 eventos checkout (recorde; antes 2-4/dia) — vitrine converte
# - PRÓXIMO: fundador vai refazer /generate com seletor 720/1080p + 15/45/60s +
#   motores novos — LER docs/PLANO-GENERATION-V4.md e docs/PRECOS-MOTORES-V4.md
#   antes de qualquer mudança em generate/engineCost/analyze-idea

# ⚠⚠ REGRA FIXA — SPRINTS ENTREGAM MUDANÇA QUE O FUNDADOR VÊ (fundador 17/08):
# "às vezes vejo o sprint rodando 10x/dia e não vejo mudanças como as de hoje."
# TODA sessão de sprint deve entregar PELO MENOS UMA mudança visível de produto
# no padrão do dia 17/08 — exemplos do que CONTA: produto novo na cara do
# cliente (Images/Audio/Library/Enhance), tela redesenhada (login split-screen,
# mega-menu com ícones sem preço, popup 950×430), vitrine melhor (previews HD,
# curadoria), pricing/copy que vende melhor, feature roubada com critério do
# Higgsfield/InVideo. O que NÃO conta como entrega única: refactor invisível,
# micro-SEO, fix de log, doc — isso é acompanhamento, não prato principal.
# Teste antes de encerrar o sprint: "se o fundador abrir o site agora, ele VÊ
# a diferença e sorri?" Se a resposta for não, o sprint não terminou.
# Receita que funcionou hoje: (1) olhar um concorrente com print/tela real,
# (2) escolher o que é fácil E visível, (3) implementar com selo honesto,
# (4) push no mesmo dia. Ambição na medida: mudanças grandes em stage
# (studio-v4) pra aprovação; polish direto na main.

# ⚡ SYNC 24/08 — DAR CRÉDITO AGORA TEM BOTÃO (#297), E A REGRA QUE VEIO JUNTO:
# ⛔ NUNCA prometer a um cliente algo que o produto não sabe executar sozinho.
# O caso: em 19/08 foram oferecidos 100 créditos por uma review. Rick
# (gapozweb) deixou a ÚNICA review pública que a Kineo tem, cobrou DUAS vezes,
# e em 22/08 mandou um e-mail chamado "Feeling forgotten". A causa não foi
# desleixo — NÃO HAVIA COMO DAR O CRÉDITO: nenhuma rota, nenhum botão em todo
# o /api/admin. "Faço na mão depois" é onde promessa morre.
# ✅ AGORA: /admin/people → botão "+ créditos" na linha da pessoa. Motivo é
#    OBRIGATÓRIO e toda concessão vira evento `admin_credits_granted`
#    (quem/quanto/por quê). Teto 1.000 por vez. Use SEMPRE por aí — não abra
#    o banco à mão, senão o rastro se perde.
# 📊 O painel também passou a medir O QUE FOI ENTREGUE (#295), não só o gasto:
#    coluna "Got back" ao lado de "Spent on". ATENÇÃO ao ponto cego antigo:
#    /animate, /images e /audio NÃO criam linha em `videos` — quem usa esses
#    produtos parecia "gastou 40 e não fez nada" e na verdade RECEBEU (medido:
#    1.801 entregas de animação para 14 pessoas que o painel mostrava como 0).
# 📮 SLA DE RESPOSTA (a lição maior do dia): 5 clientes reais escreveram em
#    30 dias e 4 ficaram SEM RESPOSTA — todos eram respostas a campanhas do
#    próprio fundador. Pedir favor e sumir converte cliente neutro em cliente
#    ressentido. Toda campanha nova exige varrer as respostas em ≤48h.
# 🔍 FUNIL 7d (medido 24/08): 247 cadastros → 115 sem nenhum vídeo, dos quais
#    103 NUNCA gastaram um crédito. O gargalo da ativação não é render
#    quebrado nem preço — é gente que chega e não aperta o botão.

# App versão atual: v3.0 ✅ (Phase 1 B-roll Intelligence COMPLETE)
# v3.0 DONE — Phase 1: B-roll Intelligence System fully connected
# #346: generate-video-fast now reads brollQueries from BrollPlan → exact Pexels queries per scene
# New files: lib/broll/*, app/api/generate-broll-plan, app/api/regenerate-scene, components/video/VisualDirector, components/video/SceneCard

## ✅ Status da v2.5 (confirmado em 27/05/2026)
- AUTO-STRUCTURE: qualquer prompt manual agora passa por /api/generate-script antes de analyze-idea (#310)
- Fast-path ativa 100% das vezes — usuário nunca precisa saber de HOOK/MICRO REWARD (#310)
- Viral Now: 3 cards trending diários em /viral-now + dashboard, 1 click = gera vídeo
- Viral script fast-path: voiceovers parsed EM CÓDIGO — GPT só gera visual layer (#307)
- Marcadores todos em inglês: HOOK, MICRO REWARD, ESCALATION, PAYOFF (#306)
- Dashboard viral cards: cores por vertical (billionaire=amber, mystery=purple, country=blue) (#305)
- Nav: "My Videos" substituído por "🔥 Viral Now" em sidebar, mobile nav, e top menu (#302-303)
- Commits chave desta versão:
  - #319: My Videos v2 — /history page rewritten to query `videos` table; 9:16 video grid cards with click-to-play, download, expandable description; title extracted from HOOK line in topic field
  - #320: My Videos: thumbnail support + HomePageClient footer fix — thumbnail_url as background on play button; dark overlay; play icon z-indexed; fixed footer /my-videos → /history link
  - #310: AUTO-STRUCTURE — /api/generate-script transforma qualquer tópico em script estruturado antes de analyze-idea; fast-path sempre ativa; usuário digita tema livre
  - #309: Fix: restore all truncated route files (cron + viral-now + scenes + analyze-idea)
  - #307: VIRAL FAST-PATH — parseViralScriptSections() em código; voiceovers NUNCA reescritos pelo GPT
  - #306: Marcadores em inglês: MICRO REWARD/ESCALATION/RHYTHM
  - #305: analyze-idea detecta scripts virais → cores por vertical no dashboard
  - #301–303: Viral Now — tabela Supabase, API route, cards no dashboard, nav

## Arquitetura do pipeline de geração (v2.5)
1. Usuário digita qualquer coisa → GenerateClient chama /api/generate-script se não houver marcadores
2. generate-script (GPT-4o-mini, temp 0.7) → script estruturado com HOOK/MICRO REWARD/ESCALATION/PAYOFF
3. Script estruturado → `analyze-idea` → `parseViralScriptSections()` detecta marcadores → voiceovers verbatim → GPT só gera visual_prompt + caption
4. `scenes` → busca B-roll específico no Pexels com os termos derivados do voiceover real
5. Vídeo com conteúdo específico garantido — sem menina aleatória, sem narração genérica

## ⚠️ REGRA CRÍTICA: ao modificar componentes, sempre buscar os pares
- Sidebar.tsx → verificar MobileNav.tsx e HomePageClient.tsx (nav do top menu público)
- Viral Now cards → verificar DashboardClient.tsx E ViralNowClient.tsx (ambos renderizam cards)
- viral-now/route.ts (FALLBACK_TOPICS) → verificar cron/refresh-viral-now/route.ts (TOPIC_POOL)

## ⚠️ REGRA CRÍTICA — InVideo
**SEMPRE usar modo AUTOPILOT. NUNCA usar Agent One Pro.**
- Agent One Pro consome créditos demais e esgota a conta
- Autopilot usa 1–4 créditos por vídeo e gera automaticamente
- Se não tiver opção de Autopilot visível, perguntar ao usuário antes de prosseguir
- Se os créditos estiverem zerados, parar e avisar o usuário imediatamente

## Configuração dos vídeos InVideo
- **Somente 1 legenda/subtitle** por vídeo (não múltiplas)
- **Último segundo do vídeo:** incluir call to action com o site → **shortsforgeai.com**
- Formato: YouTube Shorts (9:16, vertical)
- Duração: ~35 segundos
- Estilo: dark, cinematic, fast-paced
- Idioma: Inglês
- Escolher sempre os temas com maior potencial viral (baseado nos Shorts que já performaram bem)

## ⚠ REGRA FIXA — DURAÇÃO 60s+ (fundador 18/08, TikTok Creator Rewards)
**Todo vídeo da casa (vitrine + canais do fundador) mira 60 segundos ou mais**
— o programa de Rewards do TikTok só monetiza vídeo >1min. Na prática: duração
60s no Studio + script de ~150-165 palavras (narração/2.3wps); o overshoot
TIKTOK-61 do planner já garante que o corte final passa de 60s. Script menor
que isso = pedir pro fundador confirmar antes.

## ⚠ REGRA FIXA — DRY-RUN ANTES DE TODO RENDER PAGO (fundador 24/08)
"Não posso gastar mais 7 dólares a cada teste." Todo script de Kling 3/H3
passa PRIMEIRO pelo validador de $0: POST /api/generate-video-cinematic com
`dry_run:true` + `script_mode:'verbatim'` (só contas do fundador). Devolve o
plano cena a cena (segundos, palavras, texto falado) com veredito PASS/FAIL
(mudo ≤6s e duração ≥95% do alvo) e estorna sozinho. Só se gasta crédito com
PASS na mão. Regra-irmã: ~150-165 palavras para 60s (79-85s de plano é a
faixa dos filmes bons: Mandel 68s, Pompeia 78s, Cyclops 75s).

## ⚠ REGRA FIXA — script SEMPRE vem com título + descrição + usekineo (fundador 25/08)
Toda entrega de script vem SEGUIDA, na mesma resposta, de: título YT, descrição
YT, legenda TikTok e comentário fixado — com **usekineo.com nos lugares
apropriados** (descrição = link + "made with usekineo.com"; fixado = CTA de
funil; TikTok = menção em texto). O vídeo é conteúdo E anúncio: nunca sai
script sem o pacote de publicação que converte espectador em cliente.

## ⚠ REGRA FIXA — MODELO APROVADO do pacote de publicação (fundador 28/08: "grava na memória, desse jeito ficou perfeito")
O formato de referência é o do Lago Natron (28/08). Reproduzir SEMPRE esta estrutura, cada peça no seu bloco de código pra copiar:
  📺 YOUTUBE → Título (curto, "The X That Y") · Descrição (gancho em 2-3 frases
  + parágrafo "🎬 This entire video was made with AI at usekineo.com — you type
  an idea, it directs, narrates and edits a cinematic Short in about 3 minutes.
  Try it free: https://www.usekineo.com" + hashtags) · Comentário fixado
  ("Fun fact: this whole video came from just N words of text..." + usekineo.com free to try)
  🎵 TIKTOK → Legenda (gancho + emoji + fato + "Made with AI in 3 minutes →
  usekineo.com 🎬" + hashtags com #fyp #ai) · Comentário fixado ("Everything
  you just watched was made by AI from one paragraph of text 🤯 usekineo.com — free to try")
  ⏰ Melhor horário de postagem (BRT, mirando pico dos EUA)
  🎯 Próxima jogada de série/crescimento ligada ao vídeo
O ângulo da propaganda é sempre "isso que você viu foi feito por IA a partir de
N palavras" — o vídeo é a demo do produto.

## ⚠ REGRA FIXA — formato de entrega de script (fundador 24/08)
**O bloco de código contém SÓ o script** — nada de config dentro, senão o
fundador copia as configurações junto para a caixa de texto do Studio.
A config vem FORA do bloco, logo embaixo, em uma linha compacta:
⚙ Config: usekineo.com/studio · motor (custo) · duração · script mode · avisos.

## ⚠ REGRA FIXA — respostas de e-mail vão para o RASCUNHO (fundador 24/08)
Toda resposta que eu preparar para um cliente/parceiro vai DIRETO para os
rascunhos do Gmail dele, na thread certa (create_draft com replyToMessageId).
Nunca só mostrar o texto no chat — o fundador revisa e aperta Enviar.

## ⚠ REGRA FIXA — TODA RESPOSTA FECHA COM AS DUAS LISTAS (fundador 27/08)
"Sempre quando você passar um texto pra mim, no final você resume todas as
coisas que eu preciso fazer e um resumo geral do que aconteceu. Tratar isso
como pra sempre."
TODA resposta minha — entrega, script, e-mail, análise, investigação, qualquer
coisa — termina com estes dois blocos, NESTA ORDEM, sem exceção:

  ✅ O QUE VOCÊ PRECISA FAZER
     Só o que depende DELE. Numerado, verbo no início, uma linha cada.
     Nada de "revisar" genérico: dizer o arquivo, o botão, o comando.
     Se não há nada para ele fazer, escrever literalmente "Nada."

  📋 O QUE ACONTECEU
     O resumo geral em linguagem de dono, não de programador: o que mudou,
     o que isso muda para o cliente, o que ficou em aberto. Curto.

Vale inclusive quando a resposta já parece completa — o fundador lê muitas
sessões por dia e precisa achar a ação sem reler o texto todo. O bloco de
ação vem SEMPRE antes do resumo: primeiro o que fazer, depois o contexto.
Isso NÃO substitui a regra da PRÓXIMA JOGADA abaixo — a jogada continua
vindo no corpo da resposta; estes dois blocos são o fecho.

## ⚠ REGRA FIXA — toda entrega vem com a PRÓXIMA JOGADA (fundador 24/08)
"Você precisa ser minhas ideias novas." Toda entrega termina com jogada(s)
de crescimento não-óbvias: o quê, como e por quê, tiradas dos dados do dia.
Exemplos do padrão: pedido de review no pico da alegria (pós-"clips ready"),
relatório de concorrente virando página /vs, prazo de mercado (morte do Sora
24/09) virando pauta de imprensa.

## ⚠ REGRA FIXA — scripts de vídeo (fundador 15/08)
**Sempre que o fundador pedir uma script de vídeo, entregar JUNTO as configurações de geração** — motor, duração, character, "Use my script as is" vs "Let AI structure", e custo em créditos. Nunca mandar script solta.
- Script escrita por mim/por ele → sempre "Use my script as is" (narração verbatim)
- Ideia solta de 1 linha → "Let AI structure my text"

## Workflow de vídeos diários
1. Verificar no YouTube Studio quais Shorts tiveram mais views/engajamento
2. Escolher 5 temas similares aos que viralizaram
3. Criar vídeos no InVideo com **Autopilot** (YouTube Shorts, 9:16, ~35s)
4. Configurar: 1 legenda + shortsforgeai.com no último segundo
5. Usuário baixa e sobe no YouTube

## ⚠ REGRA FIXA — pensar junto, não só executar (fundador 16/08)
**Toda entrega vem com o raciocínio estratégico junto** — o "porquê" de produto/marca/receita, não só o "o quê". O fundador quer as sacadas explicitadas pra pensar e progredir junto.

### Log de sacadas (princípios que já viraram decisão)
- **"Studio", não "Generate"**: formulário → sala de direção. Cliente que se sente diretor paga mais. E o nome da página fala a língua do tier premium (Studio) — upsell vira geografia, não venda.
- **Motor = câmera; nós = diretor** (40/60): o modelo terceiro decide ~40% do resultado; prompt de cena, âncoras, seed, negative, voz, legendas e ritmo são nossos. Investir nos 60%.
- **Fixo onde precisa ser instantâneo, IA onde precisa ser fresco, IA pesada só onde gera dinheiro** (arquitetura de custo/latência das sugestões).
- **Piso de qualidade é engenharia, não compra**: DNA cinematográfico, image-first, quality gate com re-render. Nada de infra nova.
- **Selo honesto é ativo de marca**: badge do motor = motor real, sempre. Vitrine mente → produto morre.
- **Mais motores = upside quase puro** (pay-per-use, zero fixo), COM piso de qualidade curado e hierarquia na escolha (senão vira paralisia).
- **Upgrade grátis existe**: fal cobra igual 720/1080 no Veo Fast — sempre checar o schema do fornecedor antes de assumir custo.

## Informações do projeto
- **Marca (UI):** Kineo / Kineo AI — nome exibido no site
- **Produto/domínio (produção):** shortsforgeai.com (NÃO mudou — env, CTA nos vídeos e Stripe ainda usam esse domínio)
- Canal: Money Facts / Finanças em inglês
- App (deploy Vercel): https://shortsforgeai.vercel.app
- **Repo GitHub:** josephsskaf-hub/UseKineo (branch main)
- **Pasta local: `C:\kineo`** (mudou em 03/09/2026 — o caminho antigo
  `C:\Users\josep\OneDrive\Área de Trabalho\Usekineo` está MORTO e NÃO deve ser
  usado por agente nenhum. OneDrive + acento + espaço quebravam a montagem do
  shell: `.git/index.lock` que não some, `Operation not permitted` no unlink,
  ruído de CRLF em ~200 arquivos. Tudo isso acabou com a mudança. Se alguma
  sessão vier apontada para o caminho antigo, o erro está no documento que a
  mandou, não no shell.)
- Email: josephsskaf@gmail.com
- Push para GitHub: criar .bat e rodar via computer use
- **REGRA FIXA (fundador 15/08): a cada rodada de trabalho pronta pra subir, criar um N-PUSH.bat NOVO** (numero sequencial em scripts/, formato: `@echo off` + `call "%~dp01-PUSH.bat"`, CRLF) e avisar o fundador do numero — assim ele sempre sabe qual e o mais recente

## Rodar localmente (dev)
1. `npm install` (só na primeira vez / quando o package.json mudar)
2. `npm run dev` → http://localhost:3000
3. Requer `.env.local` na raiz com chaves reais (Supabase, Stripe, OpenAI, Pexels,
   Creatomate, Runway, Resend). O `.env.local` NÃO vem no repo — copiar de
   `.env.local.example` e preencher. Sem as chaves a landing carrega, mas
   login/checkout/geração de vídeo não funcionam.
