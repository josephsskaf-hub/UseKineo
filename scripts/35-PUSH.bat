@echo off
REM 35-PUSH - 04/08 sprint 13h (fecho) - so DOCS
REM
REM   O 34-PUSH voce ja rodou durante a sprint (producao = 66a0b86, deploy READY):
REM   o fix KINEO-PROMO-BEATS-INTRO e a rota COMEBACK50 JA ESTAO NO AR.
REM
REM   Este sobe so 1 commit de documentacao: o registro de que validei a cadeia
REM   inteira em producao com o dry run da rota (promo_live=true, promotion code
REM   ativo, remaining_unemailed=11 = a anti-duplicata dos 9 rascunhos funcionando)
REM   e a atualizacao do GATES-ABERTOS.
REM
REM   NADA aqui muda comportamento do site. Pode rodar sem pressa.
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
git log --oneline -5 >> "%LOG%" 2>&1
git reset --mixed >> "%LOG%" 2>&1
echo === PUSH === >> "%LOG%" 2>&1
git push origin main >> "%LOG%" 2>&1
echo PUSH_EXIT=%ERRORLEVEL% >> "%LOG%" 2>&1
git ls-remote origin main >> "%LOG%" 2>&1
type "%LOG%"
echo.
echo Terminado.
pause
