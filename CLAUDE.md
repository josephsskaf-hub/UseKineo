# CLAUDE.md — Regras Permanentes para todas as sessões
# ⚡⚡ SYNC 17/08 (sessão CEO — domingo de 8 produtos) — LER ANTES DE QUALQUER COISA:
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
# - PENDÊNCIAS: gate de storage (V2) · assinantes antigos $24.90 recebem 140cr
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
