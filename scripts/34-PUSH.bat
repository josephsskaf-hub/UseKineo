@echo off
REM 34-PUSH - 04/08 sprint 13h - O FIX QUE SALVA A CAMPANHA COMEBACK50
REM
REM   POR QUE ESTE E URGENTE: o 33-PUSH nao foi rodado. Producao ainda serve 0c988b4,
REM   entao /api/admin/send-comeback50 responde 404 e a ordem "sprint das 10h dispara os
REM   e-mails" era impossivel sem este clique.
REM
REM   (topo)   PROMO BEATS INTRO -> app/api/stripe/checkout/route.ts
REM              O /pricing anexa intro=1 SOZINHO em todo clique monthly starter/creator.
REM              O checkout aplicava o intro primeiro e PULAVA o bloco do ?promo= com um
REM              console.warn. As 19 pessoas do COMEBACK50 leriam "50%% off por 3 meses"
REM              e pagariam um mes com desconto menor - sem nenhum erro aparecer.
REM              Agora o promo so perde se nao existir/nao estiver ativo na Stripe.
REM
REM            PH BANNER -> components/PhWelcomeBanner.tsx (linha do cupom PRODUCTHUNT,
REM              redigida para nao mentir caso o promotion code nao exista)
REM
REM   (abaixo) COMEBACK50 -> app/api/admin/send-comeback50 + prova social do /pricing
REM              (commits da sprint 11h, que ainda nao subiram)
REM
REM   + docs/SPRINT-2026-08-04.md, GATES-ABERTOS, IDEIAS-EXECUTADAS
REM
REM NAO TOCA EM RENDER: nada de lib/compose.ts. O freeze do dia de lancamento segue intacto.
REM
REM DEPOIS DO DEPLOY: os 8 rascunhos COMEBACK50 + o do ToolRiot estao no seu Gmail,
REM esperando Send. Os 8 ja estao marcados com comeback50_emailed=true, entao a rota
REM automatica nao duplica - ela vai para os 11 restantes.
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
