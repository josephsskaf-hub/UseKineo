@echo off
REM 31-PUSH - 03/08 noite - 3 BLOCOS DE AQUISICAO + ADMIN CEO DE VOLTA
REM
REM   f34b0ef  WALL OF PROOF  -> /wall com os Shorts publicados pelos usuarios
REM   f1f9733  SCRIPT LIBRARY -> /scripts + 18 prateleiras; 572 paginas orfas ligadas
REM   cdfcf90  AEO            -> 12 para 46 paginas /vs (34 novas)
REM   6875261  SITEMAP        -> /wall + /scripts + prateleiras
REM   b6f2811  ADMIN          -> CEO volta como /admin, MRR corrigido 14,80 -> 44,70,
REM                             funil 7d com taxa por degrau, /admin/paying, /admin/leads
REM
REM DEPOIS DO DEPLOY (~2 min): abra /admin (CEO), /admin/paying, /wall e /scripts.
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
git log --oneline -6 >> "%LOG%" 2>&1
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
