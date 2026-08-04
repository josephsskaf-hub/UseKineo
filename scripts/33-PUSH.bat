@echo off
REM 33-PUSH - 04/08 sprint 11h - ORDEM I (COMEBACK50)
REM
REM   (topo)   COMEBACK50 -> app/api/admin/send-comeback50 (coorte ao vivo de 19 pessoas
REM                          que provaram valor e nunca pagaram; dry-run por padrao;
REM                          RECUSA enviar enquanto o cupom COMEBACK50 nao existir na Stripe)
REM                       -> docs/SPRINT-2026-08-04.md (placar, veredito do PH, IDEIA CEO)
REM                       -> docs/GATES-ABERTOS.md (cupom = 2 min seus) + IDEIAS + ENGAGEMENT
REM
REM NAO TOCA EM RENDER: os fixes de lib/compose.ts ja subiram na sua sessao paralela
REM (origin/main ja estava em 0c988b4 quando esta sprint rodou). O freeze do dia esta intacto.
REM
REM   (topo)   PROVA SOCIAL -> faixa do /pricing atualizada: 900+ creators / 450+ Shorts
REM
REM DEPOIS DO DEPLOY: crie o cupom COMEBACK50 na Stripe (passo a passo no GATES-ABERTOS,
REM item 1) e me avise - a proxima sprint roda o dry run e o envio.
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
git log --oneline -8 >> "%LOG%" 2>&1
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
