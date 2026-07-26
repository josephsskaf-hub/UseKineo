@echo off
cd /d "%~dp0"
echo ===== KINEO PUSH 97 (FUNIL DE CHECKOUT + INDEXACAO DE 422 VIDEOS + MATRIZ /vs/) ===== > push_97_log.txt
git config user.email "josephsskaf@gmail.com" >> push_97_log.txt 2>&1
git config user.name "Joseph Skaf" >> push_97_log.txt 2>&1

echo [remove modal orfao: AvatarPaywallModal tinha ZERO importadores e todos os botoes apontavam pra ?pack=avatar* que o servidor responde 410] >> push_97_log.txt
git rm -q --ignore-unmatch components/AvatarPaywallModal.tsx >> push_97_log.txt 2>&1
if exist "components\AvatarPaywallModal.tsx" del /q "components\AvatarPaywallModal.tsx"

git add -A >> push_97_log.txt 2>&1
echo [staged] >> push_97_log.txt
git diff --cached --name-status >> push_97_log.txt 2>&1
echo [commit] >> push_97_log.txt
git commit -m "PUSH #97 CHECKOUT + INDEXACAO: prefetch de navegador e scanner de link estavam CRIANDO sessoes do Stripe sem ninguem clicar (os 39 checkout_auth_required tinham user_id NULL, session_id NULL e chegavam 2-8ms de diferenca, um por tier - nao era gente, era robo), agora /api/stripe/checkout responde 204 ANTES de qualquer chamada ao Supabase ou Stripe quando o header anuncia Sec-Purpose/Purpose/X-Purpose/X-Moz/Next-Router-Prefetch, lib/checkoutTelemetry.ts novo com trava sincrona por ref que sobrevive a remontagem (producao mostrou 1 usuario gerando 7 sessions em 2.8s), estado pending, erro inline em ingles, watchdog de 15s e release no pageshow do bfcache, 14 pontos de checkout desprotegidos convertidos (8 no GenerateClient, 2 no ExitIntentOffer, HistoryClient, MyVideosClient, LowCreditsUpsell, Offer290Banner) somando 17 botoes, chave de idempotencia nas 3 SKUs avulsas que nao tinham NENHUMA (pacote starter, oferta 2.90 e recarga), checkout_failed declarado desde 15/07 e nunca emitido agora dispara em todo early return, 3 emails de recuperacao pararam de embutir link direto do checkout (scanner corporativo seguia e mintava session) e apontam pro /pricing, bug latente: upgradeLoading virava true e nunca voltava, deixando o modal travado em reticencias pra sempre depois de uma falha, UpgradeModal parou de anunciar 11.90 e le o preco real de lib/checkoutPricing (9.90). INDEXACAO: 564 videos publicos existiam em /v/[id] desde o PUSH #459 mas a rota era force-dynamic e nao estava em NENHUM sitemap - o Google nunca soube que existiam; agora revalidate 3600, h1 real, transcricao limpa em prosa, JSON-LD VideoObject + BreadcrumbList e 6 links internos, com portao rigido de qualidade (completed + URL tocavel + titulo 20+ chars + transcricao 240+ chars e 45+ palavras + fingerprint anti-duplicata) que aprova 422 dos 564 - os 142 reprovados renderizam pro dono com noindex, porque a politica de scaled content abuse do Google de 15/05 vale independente de como o conteudo foi criado; video-sitemap.xml reescrito com 426 URLs e thumbnail_loc obrigatorio, com fallback pros 4 exemplos se o Supabase cair. AQUISICAO: 12 paginas de comparacao em /vs/ + hub, com lib/comparisons.ts como unica fonte de verdade dos fatos dos concorrentes, 12 aliases de ordem invertida com 308 real no next.config.js (redirect() NAO funciona em pagina prerenderizada no Next 14.2.5 - o export escreve 307 sem header Location), sitemap 93 -> 106 URLs. tsc 27/27 identico a baseline, build exit 0." >> push_97_log.txt 2>&1
echo [push] >> push_97_log.txt
git push origin main >> push_97_log.txt 2>&1
git status --short --branch >> push_97_log.txt 2>&1
echo ===== FIM ===== >> push_97_log.txt
type push_97_log.txt
echo.
echo ====== Terminou. Pode fechar. ======
pause
