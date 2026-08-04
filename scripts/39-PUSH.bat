@echo off
REM 39-PUSH - 04/08 22:45Z - SO DOCUMENTACAO, sem pressa
REM
REM   1 commit: adendo no docs/SPRINT-2026-08-04.md explicando que uma execucao
REM   agendada rodou em REPLAY (ambiente 8h atrasado) e refez a Ordem I que ja
REM   estava entregue. Sem dano: os 7 arquivos batem byte a byte com o HEAD real
REM   e o commit do replay ja era ancestral de b4aa9cc.
REM
REM   Leva junto a regra nova para as proximas sprints: a primeira query passa a
REM   ser "select now()" no Supabase, comparada com a data do ambiente.
REM
REM   NAO TOCA EM CODIGO. tsc inalterado.
REM
REM   O QUE CONTINUA NA SUA MAO:
REM     - os 11 restantes do COMEBACK50, a um &confirm=SEND
REM     - 2 rascunhos de venda no Gmail (Waqas / pritikathar) - so falta Send
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
echo === REMOTO AGORA === >> "%LOG%" 2>&1
git ls-remote origin main >> "%LOG%" 2>&1
type "%LOG%"
echo.
echo Terminado. Se PUSH_EXIT=0 e o hash bate com o topo do log, SUBIU.
pause
