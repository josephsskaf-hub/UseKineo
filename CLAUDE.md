# CLAUDE.md — Regras Permanentes para todas as sessões
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
