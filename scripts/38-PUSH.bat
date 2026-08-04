@echo off
REM 38-PUSH - 04/08 sprint 19h (POS-PUSH)
REM
REM   1 commit, SO DOCUMENTACAO. Sem pressa - pode ir junto com o proximo
REM   push de codigo.
REM
REM   Voce ja pushou o KINEO-OBJECTION-HANDLER durante a sprint (6ea2180,
REM   deploy READY 22:28Z). Este commit so atualiza os docs para as proximas
REM   sprints nao te pedirem um push que ja foi feito:
REM     - docs/GATES-ABERTOS.md: gate A marcado como FECHADO
REM     - docs/SPRINT-2026-08-04.md: secao 9 (o push saiu antes do fim)
REM
REM   O QUE CONTINUA NA SUA MAO (nao entra em push nenhum):
REM     - 2 rascunhos de venda no Gmail (Waqas / pritikathar) - so falta Send
REM     - os 11 restantes do COMEBACK50, a um &confirm=SEND
REM
REM   Nao toca em codigo. tsc inalterado (EXITCODE=0).
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
git log --oneline -7 >> "%LOG%" 2>&1
git reset --mixed >> "%LOG%" 2>&1
echo === PUSH === >> "%LOG%" 2>&1
git push origin main >> "%LOG%" 2>&1
echo PUSH_EXIT=%ERRORLEVEL% >> "%LOG%" 2>&1
git ls-remote origin main >> "%LOG%" 2>&1
type "%LOG%"
echo.
echo Terminado.
pause
