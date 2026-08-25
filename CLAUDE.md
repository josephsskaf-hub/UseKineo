# CLAUDE.md — Regras Permanentes para todas as sessões

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

## ⚠ REGRA FIXA — formato de entrega de script (fundador 24/08)
**O bloco de código contém SÓ o script** — nada de config dentro, senão o
fundador copia as configurações junto para a caixa de texto do Studio.
A config vem FORA do bloco, logo embaixo, em uma linha compacta:
⚙ Config: usekineo.com/studio · motor (custo) · duração · script mode · avisos.

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
