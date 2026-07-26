@echo off
cd /d "%~dp0"
echo ===== KINEO PUSH 95 (FLUXO: medicao restaurada + programa de afiliados visivel) ===== > push_95_log.txt
git config user.email "josephsskaf@gmail.com" >> push_95_log.txt 2>&1
git config user.name "Joseph Skaf" >> push_95_log.txt 2>&1

git add -A >> push_95_log.txt 2>&1
echo [staged] >> push_95_log.txt
git diff --cached --name-status >> push_95_log.txt 2>&1
echo [commit] >> push_95_log.txt
git commit -m "PUSH #95 FLUXO: restaura o evento homepage_view que morreu em 30/06 quando KineoLanding substituiu HomePageClient (o funil do admin mostrava 0 no topo ha 4 semanas e o site ficou sem NENHUM numero de visita), novo LandingViewTracker client component com dedupe por aba + referrer_host + variant pra sobreviver a proxima troca de landing, e o programa de afiliados (40%% recorrente, 90 dias) finalmente ganha link interno: NavItem na Sidebar, aba no MobileNav e link no Footer - o dashboard existia 100%% pronto com ZERO links apontando pra ele" >> push_95_log.txt 2>&1
echo [push] >> push_95_log.txt
git push origin main >> push_95_log.txt 2>&1
git status --short --branch >> push_95_log.txt 2>&1
echo ===== FIM ===== >> push_95_log.txt
type push_95_log.txt
echo.
echo ====== Terminou. Pode fechar. ======
pause
