@echo off
REM 31-PUSH - 03/08 sprint 19h - AUTONOMO (substitui o 30, cabecalho staled)
REM Empurra TUDO que esta ahead (7 commits):
REM   f812f06 FIX admin/users API (paginacao + PAID_PLANS reais)
REM   30cd789 ADMIN HQ: /admin em uma tela
REM   b264669 DOCS: gate Whop fechado - whop.com/kineoclippers no ar
REM   dc010cc DOCS: mandato de criatividade + corolario comunicacao
REM   f34b0ef WALL OF PROOF: /wall (prova social por posted_shorts)
REM   f1f9733 SCRIPT LIBRARY: /scripts + 18 prateleiras + linkagem 572 /v/[id]
REM   cdcf90+ AEO: 46 paginas /vs + llms.txt | 6875261 sitemap
REM   + commit de docs da sprint 19h (Rota C Whop: 3 rascunhos outreach)
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
git log --oneline -9 >> "%LOG%" 2>&1
git reset --mixed >> "%LOG%" 2>&1
echo === PUSH === >> "%LOG%" 2>&1
git push origin main >> "%LOG%" 2>&1
echo PUSH_EXIT=%ERRORLEVEL% >> "%LOG%" 2>&1
type "%LOG%"
pause
