@echo off
REM 32-PUSH - 04/08 madrugada - TUDO DO 31 + ORDEM 5 (prova social pricing)
REM
REM   f34b0ef  WALL OF PROOF  -> /wall com os Shorts publicados pelos usuarios
REM   f1f9733  SCRIPT LIBRARY -> /scripts + 18 prateleiras; 572 paginas orfas ligadas
REM   cdfcf90  AEO            -> 12 para 46 paginas /vs (34 novas)
REM   6875261  SITEMAP        -> /wall + /scripts + prateleiras
REM   b6f2811  ADMIN          -> CEO volta como /admin, MRR corrigido 14,80 -> 44,70
REM   (novo)   ORDEM 5        -> faixa de prova real no /pricing (890+ creators,
REM                             430+ Shorts, featured TAAFT) + "Join 890+" no upsell
REM                             + preco do upsell derivado de checkoutPricing
REM   (novo)   DOCS           -> sprint 21h (video_ready 1a CONVERSAO: 1/9 em 17min)
REM
REM DEPOIS DO DEPLOY (~2 min): abra /pricing e confira a faixa "890+ creators".
cd /d "%~dp0.."
if errorlevel 1 (
  echo ERRO: nao achei a pasta do repo.
  pause
  exit /b 1
)
set LOG=scripts\push_result.log
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f /q ".git\refs\heads\main.lock"
echo === ANTES === > "%LOG%" 2>&1
git log --oneline -12 >> "%LOG%" 2>&1
git reset --mixed >> "%LOG%" 2>&1
echo === PUSH === >> "%LOG%" 2>&1
git push origin main >> "%LOG%" 2>&1
echo PUSH_EXIT=%ERRORLEVEL% >> "%LOG%" 2>&1
echo === REMOTO AGORA === >> "%LOG%" 2>&1
git ls-remote origin main >> "%LOG%" 2>&1
type "%LOG%"
echo.
echo Terminado. Se PUSH_EXIT=0 e o hash bate com o topo do log, SUBIU.
pause
